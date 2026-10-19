import { call } from './admin';

// Shrinks a phone photo to at most 1600px on the long side (JPEG ~80%) so uploads are fast
// and stay well under the server's request size limit, then uploads it to Vercel Blob.

const MAX_SIDE = 1600;

async function toJpegDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error('Можно загружать только фото (JPEG, PNG, WebP)');
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Не удалось прочитать фото. Попробуйте другой файл.');
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function uploadPhoto(file: File, kind: 'car' | 'part'): Promise<string> {
  const dataUrl = await toJpegDataUrl(file);
  const r = await call<{ url: string }>('/api/upload', { method: 'POST', body: JSON.stringify({ dataUrl, kind }) });
  return r.url;
}
