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

// Photos from Unsplash (free to use, unsplash.com/license); no brands or shop signs in them
const tallPhoto = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=1200&q=70`;
const boxPhoto = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=500&q=70`;

// Made-up sample ads (no real companies) so the places look filled until real advertisers come
const sample = (id: string, title: string, text: string, image: string, gradient = 'from-amber-500/25 via-neutral-900 to-neutral-950'): AdBanner => ({
  id,
  badge: 'Пример рекламы',
  title,
  text,
  cta: 'Разместить свою рекламу',
  href: AD_CONTACT,
  image,
  gradient,
});

export const PARTS_SIDEBAR_ADS: AdBanner[] = [
  sample('ad-sample-engines', 'Контрактные двигатели и КПП', 'Моторы из Японии и Кореи с проверкой и гарантией на запуск. Так здесь будет выглядеть реклама разборки. Формат 300×600.', tallPhoto('1767340078222-98633f3ffd27')),
  {
    id: 'ad-sellers',
    badge: 'KGzone',
    title: 'Продавайте запчасти на KGzone',
    text: 'Размещение бесплатное для частных продавцов, магазинов и разборок. Для компаний — бизнес-кабинет с импортом из Excel.',
    cta: 'Как подключиться',
    href: siteWhatsApp('Здравствуйте! Хочу продавать запчасти на KGzone.') || '/kabinet',
    image: tallPhoto('1615906655593-ad0386982a0f'),
    gradient: 'from-red-600/30 via-neutral-900 to-neutral-950',
  },
];

// Smaller 300×250 slots stacked under the main slider; each one rotates on its own
export const PARTS_SIDEBAR_BOXES: AdBanner[][] = [
  [sample('box-1', 'Фары и оптика', 'Новые и б/у фары, линзы, стёкла. Пример рекламы магазина оптики.', boxPhoto('1556448851-9359658faa54'))],
  [sample('box-2', 'Ремни и ролики ГРМ', 'Комплекты ГРМ в наличии и под заказ. Пример рекламы.', boxPhoto('1486262715619-67b85e0b08d3'))],
  [sample('box-3', 'Тормозные диски и колодки', 'Оригинал и аналоги на японские и корейские авто. Пример рекламы.', boxPhoto('1764869427601-eb699ac80a0c'))],
];

// Tall slot at the bottom of the sidebar; it stays on screen while the catalog scrolls
export const PARTS_SIDEBAR_BOTTOM_ADS: AdBanner[] = [
  sample('ad-bottom-sample', 'Глушители и катализаторы', 'Выхлопные системы, гофры, резонаторы — подбор и установка. Пример рекламы. Формат 300×600.', tallPhoto('1759419282068-eb664e0f0a17')),
];
