import { useEffect, useState } from 'react';
import { call } from './admin';
import { DEFAULT_BANNER, DEFAULT_STO_BANNER, type BannerConfig } from '../data/bannerDefaults';

// Banner slides: saved by the owner on the server, otherwise the sample ads.
// 'parts' = top of the parts catalog, 'sto' = top of the car service page.
export type BannerPlace = 'parts' | 'sto';

const DEFAULTS: Record<BannerPlace, BannerConfig> = { parts: DEFAULT_BANNER, sto: DEFAULT_STO_BANNER };
const cached: Partial<Record<BannerPlace, BannerConfig>> = {};
const loading: Partial<Record<BannerPlace, Promise<BannerConfig>>> = {};
const listeners: Record<BannerPlace, Set<(b: BannerConfig) => void>> = { parts: new Set(), sto: new Set() };
const query = (place: BannerPlace) => (place === 'sto' ? '?place=sto' : '');
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
