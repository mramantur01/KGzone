// Advertising slots. To place an ad, add an entry with an image (recommended 600×1200 px,
// i.e. 300×600 at 2x) and a link; slides without an image use the gradient and text instead.

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

const AD_CONTACT =
  'https://wa.me/996555777999?text=' + encodeURIComponent('Здравствуйте! Хочу разместить рекламу на KGzone.');

export const PARTS_SIDEBAR_ADS: AdBanner[] = [
  {
    id: 'ad-placeholder',
    badge: 'Реклама',
    title: 'Здесь может быть ваша реклама',
    text: 'Баннер увидят тысячи покупателей запчастей и автовладельцев по всему Кыргызстану. Формат 300×600.',
    cta: 'Разместить рекламу',
    href: AD_CONTACT,
    gradient: 'from-amber-500/25 via-neutral-900 to-neutral-950',
  },
  {
    id: 'ad-delivery',
    badge: 'KGzone',
    title: 'Попутные бусики КР',
    text: 'Отправка день-в-день в Ош, Джалал-Абад, Нарын, Талас, Баткен, Каракол.',
    cta: 'Заказать доставку',
    href: 'https://wa.me/996555777999?text=' + encodeURIComponent('Здравствуйте! Нужна доставка запчасти в регион.'),
    gradient: 'from-emerald-600/30 via-neutral-900 to-neutral-950',
  },
  {
    id: 'ad-sellers',
    badge: 'KGzone',
    title: 'Подключи свой контейнер к KGzone',
    text: 'Бесплатное размещение складов автозапчастей: 0% комиссии для ОсОО, ИП и разборов.',
    cta: 'Подключить контейнер',
    href: 'https://wa.me/996555777999?text=' + encodeURIComponent('Здравствуйте! Хочу подключить контейнер к KGzone.'),
    gradient: 'from-red-600/30 via-neutral-900 to-neutral-950',
  },
];
