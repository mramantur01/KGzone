import React, { useEffect, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { getCrosses, looksLikeOem, type CrossesResult } from '../../api/catalog';

// Shown when the search looks like an OEM number: analogues from the catalog (if connected)
// and KGzone listings that carry one of those analogue numbers.
export const CrossesPanel: React.FC<{ query: string; onSearch: (number: string) => void; onOpenPart: (id: string) => void }> = ({ query, onSearch, onOpenPart }) => {
  const [data, setData] = useState<CrossesResult | null>(null);

  useEffect(() => {
    setData(null);
    if (!looksLikeOem(query)) return;
    const t = setTimeout(() => getCrosses(query.trim()).then(setData).catch(() => setData(null)), 500);
    return () => clearTimeout(t);
  }, [query]);

  if (!data || (!data.external.length && !data.viaCrosses.length && !data.externalError)) return null;

  return (
    <div className="mb-4 p-3 rounded-2xl bg-neutral-900 border border-amber-500/30 text-xs space-y-2">
      <div className="flex items-center gap-2 font-bold text-amber-300">
        <Shuffle size={14} />
        <span>Аналоги для <span className="font-mono" data-no-i18n>{data.oem}</span></span>
        {data.catalog && <span className="text-neutral-500 font-normal">по каталогу <span data-no-i18n>{data.catalog}</span></span>}
      </div>
      {data.externalError && <p className="text-neutral-500">{data.externalError}</p>}
      {data.external.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.external.slice(0, 40).map((c, i) => (
            <button key={c.brand + c.number + i} type="button" onClick={() => onSearch(c.number)} className="px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-700 hover:border-amber-500 text-neutral-200 cursor-pointer" title={c.name}>
              <span className="text-neutral-400" data-no-i18n>{c.brand}</span> <span className="font-mono font-bold" data-no-i18n>{c.number}</span>
            </button>
          ))}
        </div>
      )}
      {data.viaCrosses.length > 0 && (
        <div className="space-y-1">
          <div className="text-neutral-400">Есть у продавцов KGzone под номером аналога:</div>
          {data.viaCrosses.map((p) => (
            <button key={p.id} type="button" onClick={() => onOpenPart(p.id)} className="w-full text-left px-2 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 flex justify-between gap-2 cursor-pointer">
              <span className="text-white truncate" data-no-i18n>{p.title} <span className="font-mono text-amber-400">{p.partNumber}</span></span>
              <span className="text-emerald-400 font-bold shrink-0">{p.priceKgs.toLocaleString('ru-RU')} сом</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
