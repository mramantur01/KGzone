import { call } from './admin';

// Shrinks a phone photo to at most 1600px on the long side (WebP, or JPEG ~80%) so uploads are fast
// and stay well under the server's request size limit, then uploads it to Vercel Blob.

const MAX_SIDE = 1600;

// Exported for the "identify a part by photo" button (smaller images are enough there)

export async function toJpegDataUrl(file: File, maxSide = MAX_SIDE, webp = false): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error('Можно загружать только фото (JPEG, PNG, WebP)');
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Не удалось прочитать фото. Попробуйте другой файл.');
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // WebP is about a third smaller than JPEG; browsers that cannot encode it return PNG, then JPEG is used
  if (webp) {
    const w = canvas.toDataURL('image/webp', 0.8);
    if (w.startsWith('data:image/webp')) return w;
  }
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function uploadPhoto(file: File, kind: 'car' | 'part'): Promise<string> {
  const dataUrl = await toJpegDataUrl(file, MAX_SIDE, true);
  const r = await call<{ url: string }>('/api/upload', { method: 'POST', body: JSON.stringify({ dataUrl, kind }) });
  return r.url;
}
