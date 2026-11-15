// Advertising slots. To place an ad, add an entry with an image and a link; slides without an
// image use the gradient and text instead. Image sizes (2x for sharp screens):
//   tall slots (300×600) -> 600×1200 px, box slots (300×250) -> 600×500 px.
// Only advertise services that really exist.

import { siteWhatsApp } from '../config/site';

export interface AdBanner {
  id: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  image?: string;
  gradient: string; // Tailwind gradient classes used when there is no image
  badge?: string;
}

const AD_CONTACT = siteWhatsApp('Здравствуйте! Хочу разместить рекламу на KGzone.') || '/kabinet';

const tallPlaceholder = (id: string, gradient: string): AdBanner => ({
  id,
  badge: 'Реклама',
  title: 'Здесь может быть ваша реклама',
  text: 'Баннер рядом с каталогом автозапчастей KGzone. Формат 300×600.',
  cta: 'Разместить рекламу',
  href: AD_CONTACT,
  gradient,
});

export const PARTS_SIDEBAR_ADS: AdBanner[] = [
  tallPlaceholder('ad-placeholder', 'from-amber-500/25 via-neutral-900 to-neutral-950'),
  {
    id: 'ad-sellers',
    badge: 'KGzone',
    title: 'Продавайте запчасти на KGzone',
    text: 'Размещение бесплатное для частных продавцов, магазинов и разборок. Для компаний — бизнес-кабинет с импортом из Excel.',
    cta: 'Как подключиться',
    href: siteWhatsApp('Здравствуйте! Хочу продавать запчасти на KGzone.') || '/kabinet',
    gradient: 'from-red-600/30 via-neutral-900 to-neutral-950',
  },
];

const boxPlaceholder = (id: string, gradient = 'from-sky-500/20 via-neutral-900 to-neutral-950'): AdBanner => ({
  id,
  badge: 'Реклама',
  title: 'Место для рекламы',
  text: 'Формат 300×250. Ваш баннер рядом с каталогом запчастей.',
  cta: 'Разместить рекламу',
  href: AD_CONTACT,
  gradient,
});

// Smaller 300×250 slots stacked under the main slider; each one rotates on its own
export const PARTS_SIDEBAR_BOXES: AdBanner[][] = [
  [boxPlaceholder('box-1')],
  [boxPlaceholder('box-2', 'from-amber-500/25 via-neutral-900 to-neutral-950')],
  [boxPlaceholder('box-3', 'from-emerald-600/25 via-neutral-900 to-neutral-950')],
];

// Tall slot at the bottom of the sidebar; it stays on screen while the catalog scrolls
export const PARTS_SIDEBAR_BOTTOM_ADS: AdBanner[] = [tallPlaceholder('ad-bottom-placeholder', 'from-red-600/25 via-neutral-900 to-neutral-950')];
