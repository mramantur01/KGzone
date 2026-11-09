import React, { useEffect, useMemo, useState } from 'react';
import { X, Wrench, ChevronRight } from 'lucide-react';
import { useParts } from '../../api/parts';
import type { AutoPartItem } from '../../types/car';
import { partFitsModel } from '../../utils/partMatching';
import { partHaystack, smartMatch } from '../../utils/smartSearch';
import { partPath } from '../../seo/routes';
import { isDemoListing } from '../../utils/demo';
import { NotifyWhenAvailable } from './NotifyWhenAvailable';

// What goes into a routine service (ТО) and how to find it among listings
const KIT: { id: string; label: string; q: string; anyCar?: boolean; optional?: boolean }[] = [
  { id: 'oil-filter', label: 'Масляный фильтр', q: 'масляный фильтр' },
  { id: 'oil', label: 'Моторное масло', q: 'моторное масло', anyCar: true },
  { id: 'air-filter', label: 'Воздушный фильтр', q: 'воздушный фильтр' },
  { id: 'cabin-filter', label: 'Салонный фильтр', q: 'салонный фильтр' },
  { id: 'plugs', label: 'Свечи зажигания', q: 'свечи зажигания' },
  { id: 'pads', label: 'Тормозные колодки', q: 'тормозные колодки', optional: true },
];

const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;

interface Row { id: string; label: string; q: string; offers: AutoPartItem[]; universal: boolean; optional?: boolean }

/** "Набор для ТО": filters, oil and plugs for one car from different sellers, cheapest first, with a total */
export const ServiceKitModal: React.FC<{ brand: string; model: string; onClose: () => void }> = ({ brand, model, onClose }) => {
  const parts = useParts();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows: Row[] = useMemo(() => KIT.map((k) => {
    const matching = parts.filter((p) => (p.stockCount ?? 1) > 0 && smartMatch(partHaystack(p), k.q));
    const fitting = matching.filter((p) => partFitsModel(p, brand, model));
    const offers = (fitting.length || !k.anyCar ? fitting : matching).slice().sort((a, b) => a.priceKgs - b.priceKgs).slice(0, 3);
    return { id: k.id, label: k.label, q: k.q, offers, universal: !fitting.length && offers.length > 0, optional: k.optional };
  }), [parts, brand, model]);

  const [included, setIncluded] = useState<Record<string, boolean>>(() => Object.fromEntries(KIT.map((k) => [k.id, !k.optional])));
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const pick = (r: Row) => r.offers.find((o) => o.id === chosen[r.id]) || r.offers[0];
  const selected = rows.filter((r) => included[r.id] && r.offers.length);
  const total = selected.reduce((s, r) => s + (pick(r)?.priceKgs || 0), 0);
  const sellers = new Set(selected.map((r) => pick(r)?.sellerId || pick(r)?.storeName)).size;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white text-slate-800 w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-black text-base flex items-center gap-2"><Wrench size={17} className="text-[#C8102E]" />Набор для ТО</div>
            <div className="text-xs text-slate-500" data-no-i18n>{brand} {model}</div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer" aria-label="Закрыть"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <p className="text-xs text-slate-500">Мы собрали самые дешёвые предложения разных продавцов. Отметьте, что нужно, и выберите продавца — итог посчитается сам. Перед покупкой уточните у продавца по VIN или номеру детали.</p>
          {rows.map((r) => (
            <div key={r.id} className={`rounded-xl border p-3 ${included[r.id] && r.offers.length ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
              <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                <input type="checkbox" checked={!!included[r.id]} onChange={(e) => setIncluded((v) => ({ ...v, [r.id]: e.target.checked }))} className="accent-[#C8102E] w-4 h-4" />
                <span>{r.label}</span>
                {r.offers.length > 0 && <span className="ml-auto text-xs font-semibold text-slate-500">от {som(r.offers[0].priceKgs)}</span>}
              </label>
              {included[r.id] && (r.offers.length ? (
                <div className="mt-2 space-y-1.5">
                  {r.universal && <p className="text-[11px] text-amber-700">Для этой модели не нашли — показаны подходящие многим машинам. Проверьте допуск у продавца.</p>}
                  {r.offers.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 text-xs">
                      <input type="radio" name={`kit-${r.id}`} checked={pick(r)?.id === o.id} onChange={() => setChosen((v) => ({ ...v, [r.id]: o.id }))} className="accent-[#C8102E]" aria-label="Выбрать" />
                      <a href={partPath(o)} target="_blank" rel="noopener" className="flex-1 min-w-0 flex items-center gap-2 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 no-underline">
                        {o.images?.[0] && <img src={o.images[0]} alt="" loading="lazy" className="w-9 h-9 rounded object-cover shrink-0" />}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-slate-800 truncate">{o.title}</span>
                          <span className="block text-[10px] text-slate-500 truncate">
                            {o.storeName || 'Продавец'}{o.storeLocation ? ` · ${o.storeLocation}` : ''}{isDemoListing(o.id) ? ' · пример' : ''}
                          </span>
                        </span>
                        <span className="font-black text-slate-900 whitespace-nowrap">{som(o.priceKgs)}</span>
                        <ChevronRight size={13} className="text-slate-400 shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-xs text-slate-500">
                  Пока нет на KGzone.
                  <NotifyWhenAvailable q={r.q} brand={brand} model={model} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-slate-900 text-white px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-400">Итого {selected.length} поз. · продавцов: {sellers}</div>
            <div className="text-xl font-black">{som(total)}</div>
          </div>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer">Готово</button>
        </div>
      </div>
    </div>
  );
};
