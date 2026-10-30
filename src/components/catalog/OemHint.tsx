import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { getOemKnowledge, type OemKnowledge } from '../../api/catalog';

// For sellers: when the typed OEM number is already known on KGzone, offer its name,
// analogues and fitting cars so the listing is filled in faster and more accurately.
export const OemHint: React.FC<{ oem: string; onApply: (k: OemKnowledge) => void; dark?: boolean }> = ({ oem, onApply, dark = false }) => {
  const [k, setK] = useState<OemKnowledge | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setK(null);
    setApplied(false);
    const n = oem.replace(/[^A-Za-z0-9]/g, '');
    if (n.length < 5) return;
    const t = setTimeout(() => getOemKnowledge(oem).then(setK).catch(() => setK(null)), 600);
    return () => clearTimeout(t);
  }, [oem]);

  if (!k) return null;
  return (
    <div className={`mt-2 p-2.5 rounded-xl text-[11px] space-y-1 ${dark ? 'bg-amber-950/40 border border-amber-700/50 text-amber-100' : 'bg-amber-50 border border-amber-200 text-amber-900'}`}>
      <div className="flex items-center gap-1.5 font-bold">
        <Lightbulb size={13} />
        <span>Этот номер уже есть на KGzone ({k.listings} объявл.)</span>
      </div>
      {k.names[0] && <div>Название: <span data-no-i18n>{k.names[0].name}</span></div>}
      {k.crosses.length > 0 && <div>Аналоги: <span className="font-mono" data-no-i18n>{k.crosses.slice(0, 8).map((c) => c.number).join(', ')}</span></div>}
      {k.fits.length > 0 && <div>Подходит: <span data-no-i18n>{k.fits.slice(0, 6).map((f) => [f.brand, f.model, f.generation].filter(Boolean).join(' ')).join(', ')}</span></div>}
      <button
        type="button"
        disabled={applied}
        onClick={() => { onApply(k); setApplied(true); }}
        className={`mt-1 px-2.5 py-1 rounded-lg font-bold cursor-pointer disabled:opacity-60 ${dark ? 'bg-amber-500 text-neutral-950' : 'bg-amber-500 text-white'}`}
      >
        {applied ? 'Подставлено — проверьте' : 'Подставить в объявление'}
      </button>
    </div>
  );
};
