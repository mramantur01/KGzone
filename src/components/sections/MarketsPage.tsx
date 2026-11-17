import React, { useMemo, useState } from 'react';
import { MapPin, Store, ExternalLink, Search, Package } from 'lucide-react';
import type { AutoPartItem, Language } from '../../types/car';
import { useParts } from '../../api/parts';
import { openShop } from '../../seo/routes';
import { PartsSliderBanner } from './PartsSliderBanner';

// "Рынки": which sellers stand where (market, row, container) — from what sellers wrote in their listings.
// No invented map: each market opens in 2GIS.

interface SellerSpot { sellerId: string; name: string; spot: string; count: number; city: string }
const MAIN_MARKETS = ['Кудайберген', 'Дордой-Авто'];
const gis = (market: string, city = 'Бишкек') => `https://2gis.kg/search/${encodeURIComponent(`${market} ${city}`)}`;

export const MarketsPage: React.FC<{ language: Language; onOpenParts: () => void }> = ({ language, onOpenParts }) => {
  const isKg = language === 'kg';
  const parts = useParts();
  const [query, setQuery] = useState('');

  const markets = useMemo(() => {
    const byMarket = new Map<string, Map<string, SellerSpot>>();
    for (const p of parts as AutoPartItem[]) {
      if (!p.sellerId || !p.market) continue; // only real sellers
      const m = byMarket.get(p.market) || new Map<string, SellerSpot>();
      const cur = m.get(p.sellerId) || { sellerId: p.sellerId, name: p.storeName || p.companyName || '—', spot: p.containerInfo || p.storeLocation || '', count: 0, city: p.storeCity || '' };
      cur.count++;
      if (!cur.spot && (p.containerInfo || p.storeLocation)) cur.spot = p.containerInfo || p.storeLocation || '';
      m.set(p.sellerId, cur);
      byMarket.set(p.market, m);
    }
    for (const name of MAIN_MARKETS) if (!byMarket.has(name)) byMarket.set(name, new Map());
    return [...byMarket.entries()]
      .map(([name, sellers]) => ({ name, sellers: [...sellers.values()].sort((a, b) => a.spot.localeCompare(b.spot, 'ru', { numeric: true })) }))
      .sort((a, b) => b.sellers.length - a.sellers.length);
  }, [parts]);

  const q = query.trim().toLowerCase();
  const shown = markets
    .map((m) => ({ ...m, sellers: q ? m.sellers.filter((s) => `${s.name} ${s.spot}`.toLowerCase().includes(q)) : m.sellers }))
    .filter((m) => !q || m.sellers.length || m.name.toLowerCase().includes(q));

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-y border-slate-200 mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#C8102E]">{isKg ? 'KGzone • Базарлар' : 'KGzone • Рынки'}</div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{isKg ? 'Базарлар жана сатуучулар' : 'Рынки и продавцы'}</h1>
            <p className="text-xs text-slate-500">{isKg ? 'Ким кайсы катарда жана контейнерде турат — сатуучулардын маалыматы боюнча' : 'Кто в каком ряду и контейнере — по данным самих продавцов'}</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isKg ? 'Дүкөн же контейнер' : 'Магазин или контейнер'} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-sm" />
          </div>
        </div>

        {/* Paid ads for shops and containers on the markets (samples until advertisers come) */}
        <div className="mb-4">
          <PartsSliderBanner language={language} place="markets" />
        </div>

        <div className="space-y-4">
          {shown.map((m) => (
            <section key={m.name} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
                <MapPin size={18} className="text-[#C8102E]" />
                <h2 className="font-black text-slate-900" data-no-i18n>{m.name}</h2>
                <span className="text-xs text-slate-500">{isKg ? `${m.sellers.length} сатуучу` : `${m.sellers.length} продавц.`}</span>
                <a href={gis(m.name)} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-bold text-[#1d6fb8] hover:underline inline-flex items-center gap-1">
                  {isKg ? '2ГИСте ачуу' : 'Открыть в 2ГИС'}<ExternalLink size={12} />
                </a>
              </div>
              {m.sellers.length ? (
                <ul className="divide-y divide-slate-100">
                  {m.sellers.map((s) => (
                    <li key={s.sellerId}>
                      <button type="button" onClick={() => openShop(s.sellerId)} className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 cursor-pointer">
                        <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Store size={16} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold text-sm text-slate-900 truncate" data-no-i18n>{s.name}</span>
                          <span className="block text-xs text-slate-500 truncate" data-no-i18n>{s.spot || (isKg ? 'Орду көрсөтүлгөн эмес' : 'Место не указано')}</span>
                        </span>
                        <span className="text-xs text-slate-600 inline-flex items-center gap-1 whitespace-nowrap"><Package size={12} />{s.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-slate-500">{isKg ? 'Бул базардан сатуучулар азырынча жок. Биринчи болуңуз!' : 'С этого рынка продавцов пока нет. Станьте первым!'}</p>
              )}
            </section>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onOpenParts} className="px-4 py-2 rounded-lg bg-[#C8102E] text-white text-sm font-bold cursor-pointer">{isKg ? 'Тетиктер каталогу' : 'Каталог запчастей'}</button>
          <a href="/prodavcam" className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700">{isKg ? 'Сатуучуларга' : 'Продавцам: разместить товары'}</a>
        </div>
      </div>
    </div>
  );
};
