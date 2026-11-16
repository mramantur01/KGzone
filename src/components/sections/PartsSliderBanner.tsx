import React, { useEffect, useState } from 'react';
import { useBanner, type BannerPlace } from '../../api/banner';
import { SLIDE_GRADIENTS, type SlideIcon } from '../../data/bannerDefaults';
import { Disc3, Droplets } from 'lucide-react';
import { Language } from '../../types/car';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import {
  ChevronLeft,
  ChevronRight,
  Wrench,
  Truck,
  Store,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Video,
  Layers,
  ArrowRight,
  Megaphone,
  ExternalLink,
  Clock,
  MapPin,
  Car,
} from 'lucide-react';

/** One of the three blocks on the first slide */
export interface OfferBlock {
  id: number;
  badge: string;
  badgeColor: string;
  title: React.ReactNode;
  description: string;
  stats: { label: string; val: string }[];
  buttonText?: string;
  buttonAction?: () => void;
  secondaryText?: string;
  secondaryAction?: () => void;
  accentColor: string;
  bgImage: string;
  icon: React.ReactNode;
}

interface PartsSliderBannerProps {
  language: Language;
  /** Which saved slides to show: parts catalog (default) or the car service page */
  place?: BannerPlace;
  /** Own three blocks for the first slide (the service page passes its own) */
  offers?: OfferBlock[];
  onFilterEngines?: () => void;
  onFilterOptics?: () => void;
  onOpenSellerRegistration?: () => void;
  onSelectMarket?: (market: string) => void;
  onFocusVin?: () => void;
  onFocusSearch?: () => void;
}

export const PartsSliderBanner: React.FC<PartsSliderBannerProps> = ({
  language,
  onFilterEngines,
  onFilterOptics,
  onOpenSellerRegistration,
  onSelectMarket,
  onFocusVin,
  onFocusSearch,
  place = 'parts',
  offers,
}) => {
  const isKg = language === 'kg';
  // Slides come from the owner's settings (cabinet → «Слайды в каталоге»): first the three offers, then the ads
  const banner = useBanner(place);
  const ads = banner.slides.filter((s) => s.enabled);
  const offset = banner.showOffers ? 1 : 0;
  const total = offset + ads.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (current >= total) setCurrent(0); }, [current, total]);
  useEffect(() => {
    if (paused || total < 2) return;
    const t = window.setInterval(() => setCurrent((c) => (c + 1) % total), Math.max(2, banner.intervalSec) * 1000);
    return () => window.clearInterval(t);
  }, [paused, total, banner.intervalSec]);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ICONS: Record<SlideIcon, React.ElementType> = { tire: Disc3, oil: Droplets, wrench: Wrench, truck: Truck, store: Store, megaphone: Megaphone };
  const go = (d: number) => setCurrent((c) => (c + d + total) % total);

  // Only real features of the site — no invented warranties, delivery promises or audience numbers
  const partsOffers: OfferBlock[] = [
    {
      id: 1,
      badge: isKg ? 'VIN жана кузов номери боюнча тандоо' : 'Подбор по VIN и номеру кузова',
      badgeColor: 'bg-red-950/80 border-red-600 text-red-300',
      title: isKg ? (
        <>Унааңыздын тетиктерин <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">VIN же кузов номери боюнча табыңыз</span></>
      ) : (
        <>Найдите запчасти для своей машины <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">по VIN или номеру кузова</span></>
      ),
      description: isKg
        ? 'VIN же япон унааларынын кузов номерин киргизиңиз (мисалы NZE141-1234567) — сайт марканы, моделди жана муунду өзү тандайт.'
        : 'Введите VIN или номер кузова японской машины (например NZE141-1234567) — сайт сам выберет марку, модель и поколение.',
      stats: [
        { label: isKg ? 'Кузов коддору' : 'Кодов кузова', val: '580+' },
        { label: 'VIN', val: isKg ? 'акысыз' : 'бесплатно' },
        { label: isKg ? 'Маркалар' : 'Марки', val: 'Toyota · Honda · Nissan…' },
      ],
      buttonText: isKg ? 'VIN киргизүү' : 'Ввести VIN',
      buttonAction: onFocusVin,
      secondaryText: isKg ? 'OEM боюнча издөө' : 'Поиск по OEM',
      secondaryAction: onFocusSearch,
      accentColor: 'from-red-950 via-neutral-950 to-neutral-900',
      bgImage: '/parts/wm-03.webp',
      icon: <Wrench className="text-red-400" size={20} />,
    },
    {
      id: 2,
      badge: isKg ? 'OEM жана аналогдор' : 'OEM-номера и аналоги',
      badgeColor: 'bg-emerald-950/80 border-emerald-600 text-emerald-300',
      title: isKg ? (
        <>Номер боюнча издеңиз — <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">аналогдорун да көрсөтөбүз</span></>
      ) : (
        <>Ищите по номеру детали — <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">покажем и аналоги</span></>
      ),
      description: isKg
        ? 'OEM же кросс-номерди жазыңыз: сайт оригиналды жана сатуучулар көрсөткөн аналогдорду табат. Дефис жана боштуктар маанилүү эмес.'
        : 'Введите OEM или кросс-номер: сайт найдёт оригинал и аналоги, которые указали продавцы KGzone. Дефисы и пробелы не важны.',
      stats: [
        { label: isKg ? 'Издөө' : 'Поиск', val: 'OEM / кросс' },
        { label: isKg ? 'Аналогдор' : 'Аналоги', val: isKg ? 'сатуучулардан' : 'от продавцов' },
        { label: isKg ? 'Жок болсо' : 'Нет детали?', val: isKg ? 'өтүнмө' : 'заявка' },
      ],
      buttonText: isKg ? 'Номер боюнча издөө' : 'Искать по номеру',
      buttonAction: onFocusSearch,
      secondaryText: undefined,
      secondaryAction: undefined,
      accentColor: 'from-emerald-950 via-neutral-950 to-neutral-900',
      bgImage: '/parts/wm-10.webp',
      icon: <Layers className="text-emerald-400" size={20} />,
    },
    {
      id: 3,
      badge: isKg ? 'Сатуучуларга • акысыз' : 'Продавцам • бесплатно',
      badgeColor: 'bg-amber-950/80 border-amber-600 text-amber-300',
      title: isKg ? (
        <>Тетиктериңизди KGzone’до <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">акысыз сатыңыз</span></>
      ) : (
        <>Продавайте запчасти на KGzone <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">бесплатно</span></>
      ),
      description: isKg
        ? 'Жеке адамдар, дүкөндөр жана разборлор үчүн. ИП жана ОсОО үчүн кабинетте: кызматкерлер, кампалар, Excel’ден импорт.'
        : 'Для частных продавцов, магазинов и разборок. Для ИП и ОсОО в кабинете — сотрудники, склады, загрузка товаров из Excel.',
      stats: [
        { label: isKg ? 'Жайгаштыруу' : 'Размещение', val: isKg ? 'акысыз' : 'бесплатно' },
        { label: isKg ? 'Жарыялоо' : 'Публикация', val: isKg ? 'сүрөт менен дароо' : 'сразу с фото' },
        { label: isKg ? 'ИП жана ОсОО' : 'ИП и ОсОО', val: isKg ? 'CRM жана кампалар' : 'CRM и склады' },
      ],
      buttonText: isKg ? '+ Тетик сатуу' : '+ Продать запчасть',
      buttonAction: onOpenSellerRegistration,
      secondaryText: undefined,
      secondaryAction: undefined,
      accentColor: 'from-amber-950 via-neutral-950 to-neutral-900',
      bgImage: '/parts/wm-01.jpg',
      icon: <Store className="text-amber-400" size={20} />,
    },
  ];

  const slides = offers || partsOffers;
  if (total === 0) return null;
  // Slider: the first slide shows all three offers side by side, the next slides are ad places
  return (
    <div
      className="kgz-keep-dark relative rounded-2xl overflow-clip border border-neutral-800 shadow-xl mb-6 bg-neutral-950 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Ornament watermarks */}
      <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-red-500">
        <TundukIcon size={340} />
      </div>
      <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none text-amber-400">
        <KochkorMuyuzIcon size={300} />
      </div>
      {/* Kyrgyz gold ribbon along the top */}
      <div className="relative h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />

      {/* All slides share one grid cell, so the banner keeps the height of the tallest slide */}
      <div className="relative grid">
      {banner.showOffers && (
      <div aria-hidden={current !== 0} className={`[grid-area:1/1] transition-opacity duration-500 ${current === 0 ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
        {slides.map((sl) => (
          <div key={sl.id} className="relative overflow-hidden px-4 py-3 sm:p-5 flex flex-col">
            {/* Photo and colour tint of this block */}
            <img src={sl.bgImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xs scale-105" />
            <div className={`absolute inset-0 bg-gradient-to-br ${sl.accentColor} opacity-95`} />
            <div className="relative flex flex-col h-full">
              <div className={`self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${sl.badgeColor}`}>
                {sl.icon}
                <span>{sl.badge}</span>
              </div>
              <h2 className="mt-2 text-lg sm:text-xl font-black text-white tracking-tight leading-tight">{sl.title}</h2>
              <p className="mt-1.5 hidden sm:block text-xs text-neutral-300 leading-snug line-clamp-2">{sl.description}</p>
              <div className="mt-2 hidden sm:flex flex-wrap gap-1.5">
                {sl.stats.map((st, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[10px]">
                    <span className="text-neutral-400">{st.label}: </span>
                    <b className="text-amber-300">{st.val}</b>
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-3 flex flex-wrap gap-2">
                {sl.buttonAction && (
                  <button
                    onClick={sl.buttonAction}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <span>{sl.buttonText}</span>
                    <ArrowRight size={15} />
                  </button>
                )}
                {sl.secondaryAction && (
                  <button
                    onClick={sl.secondaryAction}
                    className="px-3 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white font-semibold text-xs cursor-pointer"
                  >
                    {sl.secondaryText}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
      )}

      {/* Ad places */}
      {ads.map((ad, i) => {
        const shown = current === i + offset;
        const Icon = ICONS[ad.icon] || Megaphone;
        return (
          <a
            key={ad.id}
            href={ad.href}
            target={ad.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer sponsored"
            aria-hidden={!shown}
            tabIndex={shown ? 0 : -1}
            className={`[grid-area:1/1] relative overflow-hidden flex items-center p-5 sm:p-7 transition-opacity duration-500 ${shown ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'} ${ad.image ? '' : `bg-gradient-to-br ${SLIDE_GRADIENTS[ad.color] || SLIDE_GRADIENTS.amber}`}`}
          >
            {ad.image && <img src={ad.image} alt={ad.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
            {ad.image && <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/10" />}
            {!ad.image && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex w-28 h-28 rounded-full bg-white/5 border border-white/10 items-center justify-center">
                <Icon size={48} className="text-amber-400" />
              </div>
            )}
            <div className="relative max-w-xl space-y-2">
              {ad.badge && <span className="inline-block px-2.5 py-1 rounded-md bg-black/50 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-neutral-300">{ad.badge}</span>}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{ad.title}</h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-snug">{ad.text}</p>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold">
                {ad.cta}<ExternalLink size={14} />
              </span>
            </div>
          </a>
        );
      })}
      </div>

      {/* Slide controls */}
      {total > 1 && (
        <div className="absolute z-20 top-4 right-4 flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-neutral-400">{pad(current + 1)} / {pad(total)}</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Слайд ${i + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${current === i ? 'w-6 bg-amber-400' : 'w-2 bg-neutral-600 hover:bg-neutral-400'}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(-1)} aria-label="Предыдущий слайд" className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"><ChevronLeft size={15} /></button>
          <button type="button" onClick={() => go(1)} aria-label="Следующий слайд" className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"><ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  );
};
