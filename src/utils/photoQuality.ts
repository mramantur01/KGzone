// Quick check of a part photo in the browser before upload: too small, too dark, too bright or blurry.
// It only gives advice — the photo is still uploaded.

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
  img.src = url;
});

export interface PhotoCheck { ok: boolean; tips: string[] }

export async function checkPhoto(file: File): Promise<PhotoCheck> {
  try {
    const img = await loadImage(file);
    const tips: string[] = [];
    if (Math.min(img.naturalWidth, img.naturalHeight) < 500) tips.push('маленькое — снимите ближе или с лучшей камерой');
    // Work on a small copy: brightness and sharpness (variance of the Laplacian)
    const W = 320, H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * 320));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { ok: !tips.length, tips };
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const g = new Float32Array(W * H);
    let sum = 0;
    for (let i = 0; i < W * H; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g[i] = v; sum += v; }
    const mean = sum / (W * H);
    if (mean < 55) tips.push('тёмное — переснимите при дневном свете');
    else if (mean > 225) tips.push('пересвечено — уберите вспышку или яркий свет');
    let lsum = 0, lsq = 0, n = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const l = g[i - W] + g[i + W] + g[i - 1] + g[i + 1] - 4 * g[i];
      lsum += l; lsq += l * l; n++;
    }
    const variance = n ? lsq / n - (lsum / n) ** 2 : 0;
    if (variance < 60) tips.push('размытое — держите телефон ровно и наведите фокус на деталь');
    return { ok: !tips.length, tips };
  } catch {
    return { ok: true, tips: [] };
  }
}
