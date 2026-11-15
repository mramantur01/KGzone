// Banner at the top of the parts catalog: slide settings. The owner changes them in the cabinet
// (Инструменты администратора → «Слайды в каталоге»); until then these sample ads are shown.

export type SlideColor = 'amber' | 'sky' | 'emerald' | 'red' | 'violet' | 'slate';
export type SlideIcon = 'tire' | 'oil' | 'wrench' | 'truck' | 'store' | 'megaphone';

export interface BannerSlide {
  id: string;
  enabled: boolean;
  badge: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  /** Advertiser's picture (2400×600 px); without it the colour and icon are used */
  image?: string;
  color: SlideColor;
  icon: SlideIcon;
}

export interface BannerConfig {
  /** Seconds per slide */
  intervalSec: number;
  /** First slide with the three KGzone offers (VIN, number search, sell for free) */
  showOffers: boolean;
  slides: BannerSlide[];
}

// Full class names (Tailwind needs them written out)
export const SLIDE_GRADIENTS: Record<SlideColor, string> = {
  amber: 'from-amber-600/40 via-neutral-900 to-neutral-950',
  sky: 'from-sky-600/35 via-neutral-900 to-neutral-950',
  emerald: 'from-emerald-600/35 via-neutral-900 to-neutral-950',
  red: 'from-red-600/40 via-neutral-900 to-neutral-950',
  violet: 'from-violet-600/35 via-neutral-900 to-neutral-950',
  slate: 'from-slate-500/35 via-neutral-900 to-neutral-950',
};
export const SLIDE_COLOR_NAMES: Record<SlideColor, string> = {
  amber: 'Золотой', sky: 'Синий', emerald: 'Зелёный', red: 'Красный', violet: 'Фиолетовый', slate: 'Серый',
};
export const SLIDE_ICON_NAMES: Record<SlideIcon, string> = {
  tire: 'Колесо', oil: 'Масло', wrench: 'Ключ', truck: 'Грузовик', store: 'Магазин', megaphone: 'Рупор',
};

const sample = (id: string, color: SlideColor, icon: SlideIcon, title: string, text: string): BannerSlide => ({
  id, enabled: true, badge: 'Пример рекламы', title, text, cta: 'Разместить свою рекламу', href: '/prodavcam', color, icon,
});

// Made-up sample ads (no real companies) so the slots look filled until real advertisers come
export const DEFAULT_BANNER: BannerConfig = {
  intervalSec: 3,
  showOffers: true,
  slides: [
    sample('sample-1', 'amber', 'tire', 'Шиномонтаж и хранение шин', 'Сезонная замена резины, балансировка, хранение колёс. Так здесь будет выглядеть реклама шиномонтажа.'),
    sample('sample-2', 'sky', 'oil', 'Масла и фильтры оптом и в розницу', 'Моторные масла, фильтры, свечи и расходники для ТО. Пример рекламы магазина автохимии.'),
    sample('sample-3', 'emerald', 'wrench', 'Автосервис: диагностика и ремонт', 'Компьютерная диагностика, ходовая, замена масла за 30 минут. Пример рекламы СТО.'),
    sample('sample-4', 'red', 'truck', 'Доставка запчастей по Кыргызстану', 'Отправка в Ош, Каракол, Джалал-Абад и другие города. Пример рекламы службы доставки.'),
    sample('sample-5', 'violet', 'store', 'Ваш магазин запчастей — здесь', 'Покажите свой магазин каждому покупателю каталога KGzone. Формат 1200×300.'),
  ],
};
