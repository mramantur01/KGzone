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
  /** Shown only from / until this day (YYYY-MM-DD, Bishkek); empty = always */
  startDate?: string;
  endDate?: string;
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

// Photos from Unsplash (free to use without credit, unsplash.com/license); no brands or shop signs in them
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2000&h=500&q=70`;

const sample = (id: string, color: SlideColor, icon: SlideIcon, title: string, text: string, image?: string): BannerSlide => ({
  id, enabled: true, badge: 'Пример рекламы', title, text, cta: 'Разместить свою рекламу', href: '/reklama', color, icon, image,
});

// Made-up sample ads (no real companies) so the slots look filled until real advertisers come
export const DEFAULT_BANNER: BannerConfig = {
  intervalSec: 3,
  showOffers: true,
  slides: [
    sample('sample-1', 'amber', 'tire', 'Шиномонтаж и хранение шин', 'Сезонная замена резины, балансировка, хранение колёс. Так здесь будет выглядеть реклама шиномонтажа.', photo('1578844251758-2f71da64c96f')),
    sample('sample-2', 'sky', 'oil', 'Масла и фильтры оптом и в розницу', 'Моторные масла, фильтры, свечи и расходники для ТО. Пример рекламы магазина автохимии.', photo('1487754180451-c456f719a1fc')),
    sample('sample-3', 'emerald', 'wrench', 'Автосервис: диагностика и ремонт', 'Компьютерная диагностика, ходовая, замена масла за 30 минут. Пример рекламы СТО.', photo('1625047509248-ec889cbff17f')),
    sample('sample-4', 'red', 'truck', 'Доставка запчастей по Кыргызстану', 'Отправка в Ош, Каракол, Джалал-Абад и другие города. Пример рекламы службы доставки.', photo('1614976523626-d598aafd4fda')),
    sample('sample-5', 'violet', 'store', 'Ваш магазин запчастей — здесь', 'Покажите свой магазин каждому покупателю каталога KGzone. Формат 1200×300.', photo('1767341372150-b9521fec39a3')),
  ],
};

// Same slider on the car service page (/sto): three KGzone blocks, then sample ads of services
export const DEFAULT_STO_BANNER: BannerConfig = {
  intervalSec: 3,
  showOffers: true,
  slides: [
    sample('sto-1', 'amber', 'tire', 'Шиномонтаж без очереди', 'Переобувка, балансировка, ремонт проколов и хранение шин. Пример рекламы шиномонтажа.', photo('1645445522156-9ac06bc7a767')),
    sample('sto-2', 'sky', 'wrench', 'Автомойка и детейлинг', 'Мойка кузова и салона, полировка, керамика. Пример рекламы автомойки.', photo('1633014041037-f5446fb4ce99')),
    sample('sto-3', 'red', 'truck', 'Эвакуатор 24/7 по Бишкеку и области', 'Приедем за 30–40 минут, перевезём машину в сервис. Пример рекламы эвакуатора.', photo('1730514785075-b065c757b653')),
    sample('sto-4', 'emerald', 'wrench', 'Тормоза и ходовая', 'Замена колодок и дисков, амортизаторы, развал-схождение. Пример рекламы СТО.', photo('1760317890314-e964ffd7e6a6')),
    sample('sto-5', 'violet', 'store', 'Ваш автосервис — здесь', 'Покажите свой автосервис каждому, кто ищет ремонт на KGzone. Формат 1200×300.', photo('1767681092416-bccf9410bda4')),
  ],
};
