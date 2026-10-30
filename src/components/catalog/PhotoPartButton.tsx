import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { call } from '../../api/admin';
import { toJpegDataUrl } from '../../api/upload';

export interface PhotoPartResult {
  name: string;
  category: string;
  search: string;
  confidence: 'high' | 'medium' | 'low';
  note: string;
}

// "What part is this?" — the buyer photographs a part, AI names it and fills in the search
export const PhotoPartButton: React.FC<{ onResult: (r: PhotoPartResult) => void; onError: (msg: string) => void }> = ({ onResult, onError }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await toJpegDataUrl(file, 1024);
      const r = await call<PhotoPartResult>('/api/ai/identify-part', { method: 'POST', body: JSON.stringify({ dataUrl }) });
      if (!r.name) onError(r.note || 'На фото не видно автозапчасти');
      else onResult(r);
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        title="Сфотографируйте деталь — сайт подскажет, как она называется"
        className="w-full md:w-auto shrink-0 px-4 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} className="text-amber-400" />}
        <span>{busy ? 'Распознаём...' : 'Деталь по фото'}</span>
      </button>
    </>
  );
};
