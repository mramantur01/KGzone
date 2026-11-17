import { call } from './admin';
import type { BannerConfig, BannerSlide } from '../data/bannerDefaults';
import type { BannerPlace } from './banner';

// Ads without online payment: owner's prices, advertisers' requests, slide dates and counters

/** Price per week / month for every place: partsWeek, partsMonth, carsWeek … (0 = «по договорённости») */
export type AdPrices = Record<`${BannerPlace}${'Week' | 'Month'}`, number> & { note: string };
export type AdPeriod = 'week' | '2weeks' | 'month';
export const AD_PERIOD_LABELS: Record<AdPeriod, string> = { week: '1 неделя', '2weeks': '2 недели', month: '1 месяц' };
export const AD_PLACE_LABELS: Record<BannerPlace, string> = {
  parts: 'Слайдер в каталоге «Автозапчасти»', sto: 'Слайдер на странице «Сервис»', side: 'Место сбоку в каталоге (на компьютере)',
  cars: 'Слайдер на странице «Автомобили»', feed: 'Карточка в ленте запчастей', detail: 'Реклама в окне запчасти', markets: 'Слайдер на странице «Рынки»',
};
export const AD_PLACE_HINTS: Record<BannerPlace, string> = {
  parts: 'Широкий слайд вверху каталога запчастей — первое, что видит покупатель.',
  sto: 'Слайд вверху страницы автосервиса — для СТО, шиномонтажа, мойки, эвакуатора.',
  side: 'Баннер в колонке рядом с запчастями. Виден на компьютере, пока покупатель листает каталог.',
  cars: 'Слайд на странице «Автомобили» — для пригона, тонировки, детейлинга, автоподбора, автосалонов.',
  feed: 'Карточка с фото между запчастями в каталоге — видна и на телефоне, и на компьютере.',
  detail: 'Реклама в окне каждой запчасти, рядом с «Где купить» — для установки, доставки, эвакуатора.',
  markets: 'Слайд на странице «Рынки» — для контейнеров и магазинов на авторынках.',
};
export const AD_PLACES: BannerPlace[] = ['parts', 'feed', 'detail', 'cars', 'sto', 'side', 'markets'];

export interface AdRequest {
  id: string; createdAt: string; status: 'new' | 'paid' | 'rejected' | 'published';
  name: string; phone: string; business: string; place: BannerPlace; period: AdPeriod; startDate: string;
  title: string; text: string; href: string; image?: string; comment: string;
}

export const loadAdPrices = () => call<{ prices: AdPrices }>('/api/ads/prices').then((r) => r.prices);
export const saveAdPrices = (p: AdPrices) => call<{ prices: AdPrices }>('/api/admin/ads/prices', { method: 'PUT', body: JSON.stringify(p) }, true).then((r) => r.prices);
export const sendAdRequest = (r: Partial<AdRequest>) => call('/api/ads/request', { method: 'POST', body: JSON.stringify(r) });
export const listAdRequests = () => call<{ requests: AdRequest[] }>('/api/admin/ads/requests', {}, true).then((r) => r.requests);
export const setAdRequestStatus = (id: string, status: AdRequest['status']) => call(`/api/admin/ads/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, true);
/** base: the slides shown now, so the sample ads stay when nothing was saved yet */
export const publishAdRequest = (id: string, base?: BannerConfig) => call<{ banner: BannerConfig }>(`/api/admin/ads/requests/${encodeURIComponent(id)}/publish`, { method: 'POST', body: JSON.stringify({ base }) }, true);
export const loadBannerStats = (place: BannerPlace) => call<{ stats: Record<string, { views: number; clicks: number }> }>(`/api/admin/banner/stats?place=${place}`, {}, true).then((r) => r.stats);

/** Count a view or a click of an ad slide (views: once per page load per slide) */
const seen = new Set<string>();
export function sendBannerStat(place: BannerPlace, slideId: string, type: 'view' | 'click') {
  const key = `${place}:${slideId}:${type}`;
  if (type === 'view' && seen.has(key)) return;
  seen.add(key);
  fetch('/api/banner/stat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ place, slideId, type }), keepalive: true }).catch(() => undefined);
}

/** Today in Bishkek as YYYY-MM-DD */
export const bishkekToday = () => new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);
/** Is the slide shown today (dates are optional) */
export const slideLiveToday = (s: Pick<BannerSlide, 'startDate' | 'endDate'>, today = bishkekToday()) =>
  (!s.startDate || s.startDate <= today) && (!s.endDate || s.endDate >= today);
export const slideDateState = (s: Pick<BannerSlide, 'startDate' | 'endDate'>, today = bishkekToday()): 'live' | 'future' | 'ended' =>
  s.startDate && s.startDate > today ? 'future' : s.endDate && s.endDate < today ? 'ended' : 'live';
