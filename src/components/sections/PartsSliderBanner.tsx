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
}

export const PartsSliderBanner: React.FC<PartsSliderBannerProps> = ({
  language,
  onFilterEngines,
  onFilterOptics,
  onOpenSellerRegistration,
  onSelectMarket,
}) => {
  const isKg = language === 'kg';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<any>(null);

  const slides = [
    {
      id: 1,
      badge: isKg ? 'Кудайберген • Япониядан контракттык' : 'Кудайберген • Акции контейнеров',
      badgeColor: 'bg-red-950/80 border-red-600 text-red-300',
      title: isKg ? (
        <>
          Япониядан келген <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">
            контракттык моторлор жана АКПП
          </span>
        </>
      ) : (
        <>
          Контрактные двигатели и АКПП <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">
            из Японии с гарантией 14-30 дней
          </span>
        </>
      ),
      description: isKg
        ? '«Кудайберген» автобазарындагы контейнерлердин акциясы: распилден түшүрүлгөн 1MZ, 2AR-FE, 2GR, K24A, M54 моторлору. Цилиндрлердин компрессиясын текшерүү видеосу жана стендде сыналышы менен!'
        : 'Специальные условия контейнеров авторынка «Кудайберген»: двигатели и коробки без пробега по СНГ. Видео замера компрессии цилиндров (12.8 bar) и полный пакет ГТД.',
      stats: [
        { label: isKg ? 'Кепилдик' : 'Гарантия', val: isKg ? '14-30 күн' : '14-30 дней' },
        { label: isKg ? 'Видео' : 'Видео замера', val: '12.8 bar' },
        { label: isKg ? 'Контейнерлер' : 'Боксы', val: '450+' },
      ],
      buttonText: isKg ? 'Моторлорду видеосу менен көрүү' : 'Смотреть моторы с видео замера',
      buttonAction: onFilterEngines,
      secondaryText: isKg ? 'Кудайберген базары' : 'Рынок Кудайберген',
      secondaryAction: () => onSelectMarket && onSelectMarket('Кудайберген'),
      accentColor: 'from-red-950 via-neutral-950 to-neutral-900',
      bgImage: '/parts/wm-03.jpg',
      icon: <Wrench className="text-red-400" size={20} />,
    },
    {
      id: 2,
      badge: isKg ? 'Бүткүл Кыргызстан боюнча экспресс' : 'Экспресс-доставка по регионам КР',
      badgeColor: 'bg-emerald-950/80 border-emerald-600 text-emerald-300',
      title: isKg ? (
        <>
          Аймактарга попутный бусиктер менен <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">
            Ош, Нарын, Талас, Ысык-Көл, Баткен
          </span>
        </>
      ) : (
        <>
          Экспресс-доставка по регионам КР <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">
            Попутные бусики & Яндекс за 1 час
          </span>
        </>
      ),
      description: isKg
        ? 'Бишкек ичинде Яндекс Доставка менен 1 саатта жетебиз. Батыш автобекетинен күн сайын кечки бусиктер менен Ош, Жалал-Абад, Нарын, Талас, Каракол жана Баткенге жөнөтөбүз.'
        : 'Быстрая логистика по всему Кыргызстану: отправка попутными бусиками с Западного автовокзала день в день + срочная Яндекс Доставка по Бишкеку за 1 час прямо из бокса.',
      stats: [
        { label: isKg ? 'Бишкек' : 'По Бишкеку', val: '1 час' },
        { label: isKg ? 'Ош / Жалал-Абад' : 'Ош / Юг КР', val: '10-12 ч' },
        { label: isKg ? 'Ысык-Көл / Нарын' : 'Иссык-Куль', val: '4-5 ч' },
      ],
      buttonText: isKg ? 'Жеткирип берүү тартиби' : 'Быстрый заказ с доставкой',
      buttonAction: onFilterEngines,
      secondaryText: isKg ? 'Бардык облустар' : 'Все регионы КР',
      secondaryAction: undefined,
      accentColor: 'from-emerald-950 via-neutral-950 to-neutral-900',
      bgImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      icon: <Truck className="text-emerald-400" size={20} />,
    },
    {
      id: 3,
      badge: isKg ? 'Сатуучулар жана контейнер ээлерине' : 'Продавцам авторынков • 0% комиссия',
      badgeColor: 'bg-amber-950/80 border-amber-600 text-amber-300',
      title: isKg ? (
        <>
          Өз контейнериңизди же авторазборду <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">
            KGzone платформасына 0% комиссия менен кош
          </span>
        </>
      ) : (
        <>
          Подключи свой контейнер к KGzone <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">
            под 0% комиссии для ОсОО, ИП и разборов
          </span>
        </>
      ),
      description: isKg
        ? 'Кудайберген, Дордой Моторс, РИОМ Авто же Жапалак базарындагы боксуңузду онлайн дүкөнгө айлантыңыз. Кардарлар түздөн-түз WhatsApp же чалуу аркылуу байланышып, катар жана контейнериңизге келишет.'
        : 'Бесплатное размещение складов автозапчастей Кыргызстана. Загружайте видео замеров, ведите учет склада, принимайте заказы самовывозом из контейнера или через MBANK.',
      stats: [
        { label: isKg ? 'Комиссия' : 'Комиссия сервиса', val: '0%' },
        { label: isKg ? 'Каттоо' : 'Регистрация', val: isKg ? '2 мүнөт' : '2 минуты' },
        { label: isKg ? 'Кардарлар' : 'Поток клиентов', val: '100 000+' },
      ],
      buttonText: isKg ? '+ Контейнерди каттоо (0%)' : '+ Подключить контейнер под 0%',
      buttonAction: onOpenSellerRegistration,
      secondaryText: isKg ? 'Кабинетке кирүү' : 'Личный кабинет',
      secondaryAction: onOpenSellerRegistration,
      accentColor: 'from-amber-950 via-neutral-950 to-neutral-900',
      bgImage: 'https://images.unsplash.com/=format&fit=crop&w=1200&q=80',
      icon: <Store className="text-amber-400" size={20} />,
    },
    {
      id: 4,
      badge: isKg ? 'Дордой-Авто • Оптика жана кузов' : 'Дордой-Авто • Склады кузовных деталей',
      badgeColor: 'bg-sky-950/80 border-sky-600 text-sky-300',
      title: isKg ? (
        <>
          Оптика жана кузовдук тетиктер <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-amber-300">
            Camry, Fit, Lexus RX, W211, BMW E39
          </span>
        </>
      ) : (
        <>
          Наличие оптики и кузовных деталей <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-200 to-amber-300">
            на рынке «Дордой-Авто» (Camry, Fit, RX, W211, E39)
          </span>
        </>
      ),
      description: isKg
        ? 'Фаралар (LED / Ксенон), капоттор, бамперлер жана каптал күзгүлөр эң популярдуу унааларга жеткиликтүү. Түздөн-түз Дордой-Авто складдарынан мыкты баада.'
        : 'Широкий выбор оптики и кузовных элементов: оригинальные фары, крылья, радиаторы и бамперы с примеркой на месте или доставкой по Бишкеку за 1 час.',
      stats: [
        { label: isKg ? 'Маркалар' : 'Популярные авто', val: 'Camry / Fit / RX' },
        { label: isKg ? 'Примерка' : 'Примерка', val: '100% зазор' },
        { label: isKg ? 'Кампалар' : 'Склады', val: 'Дордой-Авто' },
      ],
      buttonText: isKg ? 'Оптика жана кузовду тандоо' : 'Подобрать оптику и кузовные детали',
      buttonAction: onFilterOptics,
      secondaryText: isKg ? 'Дордой-Авто базары' : 'Рынок Дордой-Авто',
      secondaryAction: () => onSelectMarket && onSelectMarket('Дордой Моторс'),
      accentColor: 'from-blue-950 via-neutral-950 to-neutral-900',
      bgImage: 'https://images.unsplash.com/=format&fit=crop&w=1200&q=80',
      icon: <Car className="text-sky-400" size={20} />,
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
