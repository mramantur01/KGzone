import React, { useEffect, useMemo, useState } from 'react';
import { TrendingDown, X } from 'lucide-react';
import { useParts } from '../../api/parts';
import { usePartFavorites } from '../../utils/partFavorites';
import { partPath } from '../../seo/routes';

// Remembers the price of each favorite part; when a seller lowers it, the buyer sees a notice
const KEY = 'kgzone-fav-prices';
const read = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (v: Record<string, number>) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export const PriceDropNotice: React.FC = () => {
  const parts = useParts();
  const favs = usePartFavorites();
  const [seen, setSeen] = useState<Record<string, number>>(read);
  const [hidden, setHidden] = useState(false);

  // New favorites start from today's price; a higher price becomes the new reference
  useEffect(() => {
    if (!parts.length) return;
    const next = { ...seen };
    let changed = false;
    for (const id of favs) {
      const p = parts.find((x) => x.id === id);
      if (!p) continue;
      if (next[id] === undefined || p.priceKgs > next[id]) { next[id] = p.priceKgs; changed = true; }
    }
    for (const id of Object.keys(next)) if (!favs.includes(id)) { delete next[id]; changed = true; }
    if (changed) { setSeen(next); write(next); }
  }, [parts, favs]); // eslint-disable-line react-hooks/exhaustive-deps

  const drops = useMemo(() => favs
    .map((id) => parts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p && seen[p.id] !== undefined && p.priceKgs < seen[p.id]))
    .map((p) => ({ p, was: seen[p.id] })), [parts, favs, seen]);

  if (!drops.length || hidden) return null;
  const ok = () => {
    const next = { ...seen };
    for (const d of drops) next[d.p.id] = d.p.priceKgs;
    setSeen(next); write(next); setHidden(true);
  };
  return (
    <div className="fixed bottom-24 left-3 right-3 sm:right-auto sm:left-5 sm:bottom-5 sm:w-96 z-40 bg-white text-slate-800 rounded-2xl shadow-2xl border border-emerald-200 p-3.5">
      <div className="flex items-start gap-2">
        <TrendingDown size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm">Цена снижена: {drops.length} {drops.length === 1 ? 'товар' : 'товара'} из избранного</div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {drops.slice(0, 3).map(({ p, was }) => (
              <li key={p.id}>
                <a href={partPath(p)} className="font-semibold text-[#1d6fb8] hover:underline" data-no-i18n>{p.title}</a>
                <div><s className="text-slate-400">{was.toLocaleString('ru-RU')}</s> → <b className="text-emerald-700">{p.priceKgs.toLocaleString('ru-RU')} сом</b></div>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={ok} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
      </div>
    </div>
  );
};

/** Loads the catalog only when the buyer has favorite parts */
export const FavoritePriceWatch: React.FC = () => (usePartFavorites().length ? <PriceDropNotice /> : null);
