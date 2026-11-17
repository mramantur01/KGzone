import { useEffect, useState } from 'react';
import { call } from './admin';
import { DEFAULT_BANNER, DEFAULT_STO_BANNER, DEFAULT_CARS_BANNER, DEFAULT_FEED_BANNER, DEFAULT_DETAIL_BANNER, DEFAULT_MARKETS_BANNER, type BannerConfig } from '../data/bannerDefaults';
import { DEFAULT_SIDE_BANNER } from '../data/adBanners';

// Banner slides: saved by the owner on the server, otherwise the sample ads.
// 'parts' = top of the parts catalog, 'sto' = top of the car service page.
// 'cars' = «Автомобили» page, 'feed' = cards in the parts list, 'detail' = part window, 'markets' = «Рынки» page.
export type BannerPlace = 'parts' | 'sto' | 'side' | 'cars' | 'feed' | 'detail' | 'markets';

const DEFAULTS: Record<BannerPlace, BannerConfig> = {
  parts: DEFAULT_BANNER, sto: DEFAULT_STO_BANNER, side: DEFAULT_SIDE_BANNER,
  cars: DEFAULT_CARS_BANNER, feed: DEFAULT_FEED_BANNER, detail: DEFAULT_DETAIL_BANNER, markets: DEFAULT_MARKETS_BANNER,
};
const cached: Partial<Record<BannerPlace, BannerConfig>> = {};
const loading: Partial<Record<BannerPlace, Promise<BannerConfig>>> = {};
const listeners = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, new Set()])) as Record<BannerPlace, Set<(b: BannerConfig) => void>>;
const query = (place: BannerPlace) => (place === 'parts' ? '' : `?place=${place}`);
const publish = (place: BannerPlace, b: BannerConfig) => { cached[place] = b; listeners[place].forEach((l) => l(b)); };

export function loadBanner(force = false, place: BannerPlace = 'parts'): Promise<BannerConfig> {
  const have = cached[place];
  if (have && !force) return Promise.resolve(have);
  if (!loading[place] || force) {
    loading[place] = call<{ banner: BannerConfig | null }>(`/api/banner${query(place)}`)
      .then((r) => r.banner || DEFAULTS[place])
      .catch(() => DEFAULTS[place])
      .then((b) => { publish(place, b); return b; });
  }
  return loading[place]!;
}

export function useBanner(place: BannerPlace = 'parts'): BannerConfig {
  const [b, setB] = useState<BannerConfig>(cached[place] || DEFAULTS[place]);
  useEffect(() => {
    listeners[place].add(setB);
    loadBanner(false, place).then(setB);
    return () => { listeners[place].delete(setB); };
  }, [place]);
  return b;
}

export const defaultBanner = (place: BannerPlace) => DEFAULTS[place];

export const saveBanner = async (b: BannerConfig, place: BannerPlace = 'parts') => {
  const r = await call<{ banner: BannerConfig }>(`/api/admin/banner${query(place)}`, { method: 'PUT', body: JSON.stringify(b) }, true);
  publish(place, r.banner);
  return r.banner;
};
export const resetBanner = async (place: BannerPlace = 'parts') => {
  await call(`/api/admin/banner${query(place)}`, { method: 'PUT', body: JSON.stringify({ reset: true }) }, true);
  publish(place, DEFAULTS[place]);
  return DEFAULTS[place];
};
