import React, { useEffect } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import { useBanner } from '../../api/banner';
import { sendBannerStat, slideLiveToday } from '../../api/ads';
import type { BannerSlide } from '../../data/bannerDefaults';

const isExternal = (href: string) => /^https?:\/\//.test(href);

/** Ads of a place that are on today, in order; `n` picks one in turn */
const useAds = (place: 'feed' | 'detail') => useBanner(place).slides.filter((s) => s.enabled && slideLiveToday(s));

const AdLink: React.FC<{ ad: BannerSlide; place: 'feed' | 'detail'; className: string; children: React.ReactNode }> = ({ ad, place, className, children }) => (
  <a
    href={ad.href}
    target={isExternal(ad.href) ? '_blank' : undefined}
    rel={isExternal(ad.href) ? 'noopener noreferrer sponsored' : undefined}
    onClick={() => sendBannerStat(place, ad.id, 'click')}
    className={className}
  >
    {children}
  </a>
);

/** Card in the parts list (every few parts), marked «Реклама» */
export const FeedAdCard: React.FC<{ n: number; rows?: boolean }> = ({ n, rows = false }) => {
  const ads = useAds('feed');
  const ad = ads.length ? ads[n % ads.length] : null;
  useEffect(() => { if (ad) sendBannerStat('feed', ad.id, 'view'); }, [ad?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ad) return null;
  const mark = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider"><Megaphone size={10} />{ad.badge || 'Реклама'}</span>;
  if (rows) {
    return (
      <AdLink ad={ad} place="feed" className="flex gap-3 p-3 rounded-2xl bg-neutral-900 border border-amber-500/40 hover:border-amber-400 transition-colors">
        {ad.image && <img src={ad.image} alt="" loading="lazy" className="w-32 h-20 sm:w-40 sm:h-24 rounded-xl object-cover shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="mb-1">{mark}</div>
          <div className="font-bold text-sm text-white line-clamp-1" data-no-i18n>{ad.title}</div>
          <div className="text-xs text-neutral-400 line-clamp-2" data-no-i18n>{ad.text}</div>
        </div>
        <span className="self-center shrink-0 px-3 py-2 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black hidden sm:inline-flex items-center gap-1">{ad.cta}<ExternalLink size={12} /></span>
      </AdLink>
    );
  }
  return (
    <AdLink ad={ad} place="feed" className="group flex flex-col rounded-2xl bg-neutral-900 border border-amber-500/40 hover:border-amber-400 overflow-hidden transition-colors">
      <div className="relative aspect-[16/10] bg-neutral-800">
        {ad.image && <img src={ad.image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
        <div className="absolute left-3 top-3">{mark}</div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="font-bold text-sm text-white line-clamp-2 mb-1" data-no-i18n>{ad.title}</div>
        <div className="text-xs text-neutral-400 line-clamp-3 flex-1" data-no-i18n>{ad.text}</div>
        <span className="mt-3 py-2.5 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-neutral-950 text-xs font-black inline-flex items-center justify-center gap-1">{ad.cta}<ExternalLink size={12} /></span>
      </div>
    </AdLink>
  );
};

/** One ad in the part window (under «Где купить и как получить»): installation, delivery, tow truck */
export const DetailAdStrip: React.FC<{ seed: string }> = ({ seed }) => {
  const ads = useAds('detail');
  const n = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  const ad = ads.length ? ads[n % ads.length] : null;
  useEffect(() => { if (ad) sendBannerStat('detail', ad.id, 'view'); }, [ad?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ad) return null;
  return (
    <AdLink ad={ad} place="detail" className="flex gap-3 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-700 hover:border-amber-400 transition-colors">
      {ad.image && <img src={ad.image} alt="" loading="lazy" className="w-24 h-16 rounded-lg object-cover shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">{ad.badge || 'Реклама'}</div>
        <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1" data-no-i18n>{ad.title}</div>
        <div className="text-[11px] text-neutral-400 line-clamp-2" data-no-i18n>{ad.text}</div>
      </div>
    </AdLink>
  );
};

/** Parts with an ad marker after every `every` parts */
export type FeedItem<T> = T | { feedAd: number };
export function withFeedAds<T>(list: T[], every: number): FeedItem<T>[] {
  const out: FeedItem<T>[] = [];
  list.forEach((x, i) => {
    out.push(x);
    if ((i + 1) % every === 0 && i < list.length - 1) out.push({ feedAd: (i + 1) / every - 1 });
  });
  return out;
}
export const isFeedAd = <T,>(x: FeedItem<T>): x is { feedAd: number } => typeof x === 'object' && x !== null && 'feedAd' in (x as object);
