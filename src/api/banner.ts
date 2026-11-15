import { useEffect, useState } from 'react';
import { call } from './admin';
import { DEFAULT_BANNER, type BannerConfig } from '../data/bannerDefaults';

// Slides of the catalog banner: saved by the owner on the server, otherwise the sample ads
let cached: BannerConfig | null = null;
let loading: Promise<BannerConfig> | null = null;
const listeners = new Set<(b: BannerConfig) => void>();

export function loadBanner(force = false): Promise<BannerConfig> {
  if (cached && !force) return Promise.resolve(cached);
  if (!loading || force) {
    loading = call<{ banner: BannerConfig | null }>('/api/banner')
      .then((r) => r.banner || DEFAULT_BANNER)
      .catch(() => DEFAULT_BANNER)
      .then((b) => { cached = b; listeners.forEach((l) => l(b)); return b; });
  }
  return loading;
}

export function useBanner(): BannerConfig {
  const [b, setB] = useState<BannerConfig>(cached || DEFAULT_BANNER);
  useEffect(() => {
    listeners.add(setB);
    loadBanner().then(setB);
    return () => { listeners.delete(setB); };
  }, []);
  return b;
}

export const saveBanner = async (b: BannerConfig) => {
  const r = await call<{ banner: BannerConfig }>('/api/admin/banner', { method: 'PUT', body: JSON.stringify(b) }, true);
  cached = r.banner; listeners.forEach((l) => l(r.banner));
  return r.banner;
};
export const resetBanner = async () => {
  await call('/api/admin/banner', { method: 'PUT', body: JSON.stringify({ reset: true }) }, true);
  cached = DEFAULT_BANNER; listeners.forEach((l) => l(DEFAULT_BANNER));
  return DEFAULT_BANNER;
};
