import React, { useEffect, useState } from 'react';
import { Percent, Star, Trophy, Store, MapPin } from 'lucide-react';
import type { AutoPartItem } from '../../types/car';
import { loadTopSellers, ruPlural, type TopSeller } from '../../api/market';
import { openShop } from '../../seo/routes';
import { VerifiedSellerBadge, OfficialCompanyBadge } from '../common/VerifiedSellerBadge';

const dateRu = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '');

/** "Скидки дня": parts the sellers put on sale (old price shown crossed out) */
export const DealsStrip: React.FC<{ parts: AutoPartItem[]; isKg: boolean; onOpen: (p: AutoPartItem) => void }> = ({ parts, isKg, onOpen }) => {
  const deals = parts
    .filter((p) => p.oldPriceKgs && p.oldPriceKgs > p.priceKgs && p.images?.length && p.stockCount > 0)
    .map((p) => ({ p, pct: Math.round((1 - p.priceKgs / (p.oldPriceKgs || p.priceKgs)) * 100) }))
    .filter((x) => x.pct >= 3)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 12);
  if (!deals.length) return null;
  return (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-white mb-2">
        <span className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center"><Percent size={16} /></span>
        {isKg ? 'Күндүн арзандатуулары' : 'Скидки дня'}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {deals.map(({ p, pct }) => (
          <button key={p.id} type="button" onClick={() => onOpen(p)} className="snap-start shrink-0 w-44 text-left rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500 overflow-hidden cursor-pointer">
            <div className="relative h-28 bg-neutral-800">
              <img src={p.images?.[0] || p.image} alt="" loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-black">−{pct}%</span>
            </div>
            <div className="p-2.5">
              <div className="text-xs font-bold text-white line-clamp-2 min-h-[2rem]" data-no-i18n>{p.title}</div>
              <div className="mt-1 text-sm font-black text-emerald-400">{p.priceKgs.toLocaleString('ru-RU')} сом</div>
              <div className="text-[11px] text-neutral-500 line-through">{(p.oldPriceKgs || 0).toLocaleString('ru-RU')} сом</div>
              {p.saleUntil && <div className="mt-0.5 text-[10px] text-amber-300 font-bold">{isKg ? `${dateRu(p.saleUntil)} чейин` : `до ${dateRu(p.saleUntil)}`}</div>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

/** "Лучшие магазины": by buyers' reviews, then by the number of parts on the site */
export const TopSellersStrip: React.FC<{ isKg: boolean }> = ({ isKg }) => {
  const [sellers, setSellers] = useState<TopSeller[]>([]);
  useEffect(() => { loadTopSellers().then(setSellers).catch(() => setSellers([])); }, []);
  if (!sellers.length) return null;
  return (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-white mb-2">
        <span className="w-7 h-7 rounded-lg bg-amber-400 text-neutral-950 flex items-center justify-center"><Trophy size={16} /></span>
        {isKg ? 'Мыкты дүкөндөр' : 'Лучшие магазины'}
        <span className="text-[11px] font-normal text-neutral-400">{isKg ? 'сатып алуучулардын пикирлери боюнча' : 'по отзывам покупателей'}</span>
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {sellers.map((s, i) => (
          <button key={s.id} type="button" onClick={() => openShop(s.id)} className="snap-start shrink-0 w-56 text-left p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-400 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {s.avatarUrl
                  ? <img src={s.avatarUrl} alt="" loading="lazy" className="w-11 h-11 rounded-full object-cover bg-white" />
                  : <span className="w-11 h-11 rounded-full bg-[#C8102E] text-white flex items-center justify-center"><Store size={20} /></span>}
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm text-white truncate flex items-center gap-1" data-no-i18n>
                  <span className="truncate">{s.name}</span>
                  {s.verified && <VerifiedSellerBadge size={12} />}
                </div>
                {s.official && <OfficialCompanyBadge compact className="mt-0.5" />}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-300">
              {s.rating !== null && <span className="inline-flex items-center gap-0.5 font-bold text-amber-300"><Star size={12} className="fill-amber-300" />{s.rating} <span className="font-normal text-neutral-400">({s.reviewsCount})</span></span>}
              <span>{isKg ? `${s.partsCount} товар` : `${s.partsCount} ${ruPlural(s.partsCount, 'товар', 'товара', 'товаров')}`}</span>
              {(s.market || s.city) && <span className="inline-flex items-center gap-0.5 text-neutral-400" data-no-i18n><MapPin size={11} />{s.market || s.city}</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
