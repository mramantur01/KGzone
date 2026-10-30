// Page addresses (URLs) of the site. The server renders the same addresses for search engines
// (see the SEO section in server.ts) — keep CATEGORY_SLUGS and slugify() in sync with it.

export const SITE_NAME = 'KGzone';

/** Parts category id (as used in PartsSection) -> URL slug */
export const CATEGORY_SLUGS: Record<string, string> = {
  'Двигатель': 'dvigatel',
  'Трансмиссия': 'transmissiya',
  'Подвеска': 'podveska',
  'Тормозная система': 'tormoza',
  'Кузов': 'kuzov',
  'Оптика': 'optika',
  'Электрика': 'elektrika',
  'Система охлаждения': 'ohlazhdenie',
  'Отопление и кондиционер': 'otoplenie-kondicioner',
  'Топливная система': 'toplivnaya-sistema',
  'Масла и фильтры': 'rashodniki-to',
  'Шины и диски': 'kolesa-diski',
  'Салон': 'salon',
  'Выхлопная система': 'vyhlop',
  'Тюнинг': 'tyuning',
};
const SLUG_TO_CATEGORY = Object.fromEntries(Object.entries(CATEGORY_SLUGS).map(([id, slug]) => [slug, id]));

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ң: 'n', ө: 'o', ү: 'u',
};

/** "Фара Camry 70 (оригинал)" -> "fara-camry-70-original" */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Tab id -> path */
export const TAB_PATHS: Record<string, string> = {
  cars: '/',
  parts: '/zapchasti',
  workshop: '/sto',
  promotions: '/akcii',
  faq: '/faq',
  reviews: '/otzyvy',
  news: '/novosti',
  cabinet: '/kabinet',
  terms: '/pravila',
  privacy: '/konfidencialnost',
};

export interface Route {
  tab: string;
  partId?: string;
  carId?: string;
  category?: string; // PartsSection category id
  brandSlug?: string;
}

export function parseRoute(pathname: string): Route {
  const p = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^\/zapchast\/([^/]+)/))) return { tab: 'parts', partId: m[1] };
  if ((m = p.match(/^\/avto\/([^/]+)/))) return { tab: 'cars', carId: m[1] };
  if ((m = p.match(/^\/zapchasti\/marka\/([^/]+)/))) return { tab: 'parts', brandSlug: m[1] };
  if ((m = p.match(/^\/zapchasti\/([^/]+)/))) return { tab: 'parts', category: SLUG_TO_CATEGORY[m[1]] };
  const tab = Object.entries(TAB_PATHS).find(([, path]) => path === p)?.[0];
  return { tab: tab || 'cars' };
}

export const partPath = (p: { id: string; title: string }) => `/zapchast/${encodeURIComponent(p.id)}/${slugify(p.title)}`;
export const carPath = (c: { id: string; title: string }) => `/avto/${encodeURIComponent(c.id)}/${slugify(c.title)}`;
export const categoryPath = (categoryId: string) => (CATEGORY_SLUGS[categoryId] ? `/zapchasti/${CATEGORY_SLUGS[categoryId]}` : '/zapchasti');
export const brandPath = (brand: string) => `/zapchasti/marka/${slugify(brand)}`;

/** Changes the address bar without reloading; skips identical paths */
export function setPath(path: string, replace = false) {
  if (typeof window === 'undefined' || window.location.pathname === path) return;
  window.history[replace ? 'replaceState' : 'pushState']({ kgz: true }, '', path + window.location.search);
}

export function setTitle(title: string) {
  document.title = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
}
