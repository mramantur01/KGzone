// Advertising slots. To place an ad, add an entry with an image and a link; slides without an
// image use the gradient and text instead. Image sizes (2x for sharp screens):
//   tall slots (300×600) -> 600×1200 px, box slots (300×250) -> 600×500 px.

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

const boxPlaceholder = (id: string): AdBanner => ({
  id,
  badge: 'Реклама',
  title: 'Место для рекламы',
  text: 'Формат 300×250. Ваш баннер рядом с каталогом запчастей.',
  cta: 'Разместить рекламу',
  href: AD_CONTACT,
  gradient: 'from-sky-500/20 via-neutral-900 to-neutral-950',
});

// Smaller 300×250 slots stacked under the main slider; each one rotates on its own
export const PARTS_SIDEBAR_BOXES: AdBanner[][] = [
  [
    boxPlaceholder('box-1'),
    {
      id: 'box-carcheck',
      badge: 'KGzone',
      title: 'Проверка CarCheck KG',
      text: 'Штрафы, аресты и залоги по госномеру перед покупкой авто.',
      cta: 'Проверить авто',
      href: 'https://wa.me/996555777999?text=' + encodeURIComponent('Здравствуйте! Хочу проверить авто по CarCheck KG.'),
      gradient: 'from-emerald-600/30 via-neutral-900 to-neutral-950',
    },
  ],
  [
    boxPlaceholder('box-2'),
    {
      id: 'box-service',
      badge: 'KGzone',
      title: 'Автосервис & СТО KGzone',
      text: 'Диагностика, ремонт и 3D развал в Бишкеке и Оше. Гарантия до 12 месяцев.',
      cta: 'Записаться',
      href: 'https://wa.me/996555777999?text=' + encodeURIComponent('Здравствуйте! Хочу записаться на СТО KGzone.'),
      gradient: 'from-amber-500/25 via-neutral-900 to-neutral-950',
    },
  ],
  [boxPlaceholder('box-3')],
];

// Tall slot at the bottom of the sidebar; it stays on screen while the catalog scrolls
export const PARTS_SIDEBAR_BOTTOM_ADS: AdBanner[] = [
  {
    id: 'ad-bottom-placeholder',
    badge: 'Реклама',
    title: 'Здесь может быть ваша реклама',
    text: 'Баннер увидят тысячи покупателей запчастей и автовладельцев по всему Кыргызстану. Формат 300×600.',
    cta: 'Разместить рекламу',
    href: AD_CONTACT,
    gradient: 'from-red-600/25 via-neutral-900 to-neutral-950',
  },
];
