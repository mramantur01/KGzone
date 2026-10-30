import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadPhoto } from '../../api/upload';

const MAX_PHOTOS = 8;

// Adds the seller's own photos to an existing part (e.g. one loaded from a price list without
// photos). On a phone the button opens the camera or the gallery.
export const AddPhotosButton: React.FC<{
  images?: string[];
  onSave: (images: string[]) => Promise<unknown>;
  className?: string;
}> = ({ images = [], onSave, className = '' }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = MAX_PHOTOS - images.length;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, left)) urls.push(await uploadPhoto(f, 'part'));
      await onSave([...images, ...urls]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  if (left <= 0) return null;
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60 ${images.length ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'}`}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        <span>{images.length ? `Ещё фото (${images.length}/${MAX_PHOTOS})` : 'Добавить фото'}</span>
      </button>
      {error && <span className="text-[11px] text-red-600 mt-1">{error}</span>}
    </span>
  );
};
