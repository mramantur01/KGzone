import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  MapPin,
  Car,
} from 'lucide-react';

interface PartsSliderBannerProps {
  language: Language;
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
}) => {
  const isKg = language === 'kg';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<any>(null);

  // Only real features of the site — no invented warranties, delivery promises or audience numbers
  const slides = [
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
      bgImage: '/parts/wm-03.jpg',
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
      bgImage: '/parts/wm-10.jpg',
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
        ? 'Жеке адамдар, дүкөндөр жана разборлор үчүн. Компаниялар үчүн бизнес-кабинет: кызматкерлер, кампалар, Excel’ден импорт.'
        : 'Для частных продавцов, магазинов и разборок. Для компаний — бизнес-кабинет: сотрудники, склады, загрузка товаров из Excel.',
      stats: [
        { label: isKg ? 'Жайгаштыруу' : 'Размещение', val: isKg ? 'акысыз' : 'бесплатно' },
        { label: isKg ? 'Текшерүү' : 'Проверка', val: isKg ? 'модерация' : 'модерация' },
        { label: isKg ? 'Компаниялар' : 'Компаниям', val: isKg ? 'бизнес-кабинет' : 'бизнес-кабинет' },
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

  const totalSlides = slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, totalSlides]);

  const activeSlide = slides[currentSlide];

  return (
    <div
      className="relative rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl mb-8 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Graphic & Kyrgyz National Ornament Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={activeSlide.bgImage}
          alt="slide-bg"
          className="w-full h-full object-cover object-center opacity-25 filter blur-xs transition-all duration-700 scale-105"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${activeSlide.accentColor} opacity-95 transition-all duration-700`} />
      </div>

      {/* Traditional Vector Watermarks */}
      <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-red-500 z-1">
        <TundukIcon size={380} />
      </div>
      <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none text-amber-400 z-1">
        <KochkorMuyuzIcon size={320} />
      </div>

      {/* Kyrgyz Gold Border Ribbon along Top */}
      <div className="relative z-10 h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />

      {/* Main Slide Content */}
      <div className="relative z-10 p-6 sm:p-9 lg:p-10 flex flex-col justify-between min-h-[340px] sm:min-h-[380px]">
        
        {/* Top Row: Badge & Slide Counters */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider backdrop-blur-md ${activeSlide.badgeColor}`}>
            {activeSlide.icon}
            <span>{activeSlide.badge}</span>
          </div>

          {/* Indicators + Play/Pause state */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-neutral-400">
              0{currentSlide + 1} / 0{totalSlides}
            </span>
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentSlide === idx ? 'w-7 bg-amber-400 shadow-sm shadow-amber-400/50' : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                  }`}
                  title={`Слайд ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Title & Description */}
        <div className="max-w-3xl my-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            {activeSlide.title}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl mb-6">
            {activeSlide.description}
          </p>

          {/* Slide Specific Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-lg mb-6">
            {activeSlide.stats.map((st, i) => (
              <div key={i} className="p-2 sm:p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-xs">
                <div className="text-[10px] text-neutral-400 font-medium">{st.label}</div>
                <div className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">{st.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row: Actions & Nav Arrows */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-neutral-800/80">
          <div className="flex items-center gap-3 flex-wrap">
            {activeSlide.buttonAction && (
              <button
                onClick={activeSlide.buttonAction}
                className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition-all cursor-pointer hover:translate-x-0.5"
              >
                <span>{activeSlide.buttonText}</span>
                <ArrowRight size={16} />
              </button>
            )}

            {activeSlide.secondaryAction && (
              <button
                onClick={activeSlide.secondaryAction}
                className="px-4 py-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Store size={15} className="text-amber-400" />
                <span>{activeSlide.secondaryText}</span>
              </button>
            )}
          </div>

          {/* Slider Prev / Next Arrows */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={prevSlide}
              className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Предыдущий слайд"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextSlide}
              className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Следующий слайд"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
