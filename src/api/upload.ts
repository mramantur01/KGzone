import { call } from './admin';

// Shrinks a phone photo to at most 1600px on the long side (WebP, or JPEG ~80%) so uploads are fast
// and stay well under the server's request size limit, then uploads it to Vercel Blob.

const MAX_SIDE = 1600;

// Exported for the "identify a part by photo" button (smaller images are enough there)

/** Small semi-transparent «KGzone» mark in the bottom-right corner (other sites cannot just take the photo) */
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.045));
  ctx.save();
  ctx.font = `900 ${size}px system-ui, -apple-system, Segoe UI, Arial, sans-serif`;
  const text = 'KGzone';
  const tw = ctx.measureText(text).width;
  const pad = Math.round(size * 0.45);
  const x = w - tw - pad * 3, y = h - size - pad * 3;
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#000';
  const bw = tw + pad * 2, bh = size + pad * 1.2, r = bh / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + bw, y, x + bw, y + bh, r); ctx.arcTo(x + bw, y + bh, x, y + bh, r); ctx.arcTo(x, y + bh, x, y, r); ctx.arcTo(x, y, x + bw, y, r);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + bh / 2 + 1);
  ctx.restore();
}

export async function toJpegDataUrl(file: File, maxSide = MAX_SIDE, webp = false, watermark = false): Promise<string> {
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
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (watermark) drawWatermark(ctx, canvas.width, canvas.height);
  bitmap.close();
  // WebP is about a third smaller than JPEG; browsers that cannot encode it return PNG, then JPEG is used
  if (webp) {
    const w = canvas.toDataURL('image/webp', 0.8);
    if (w.startsWith('data:image/webp')) return w;
  }
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function uploadPhoto(file: File, kind: 'car' | 'part'): Promise<string> {
  const dataUrl = await toJpegDataUrl(file, MAX_SIDE, true, true);
  const r = await call<{ url: string }>('/api/upload', { method: 'POST', body: JSON.stringify({ dataUrl, kind }) });
  return r.url;
}
