import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, ChevronRight, ChevronLeft, MapPin, MessageCircle,
  Flame, ArrowLeftRight, Check, ArrowRight
} from 'lucide-react';
import { TundukIcon } from '../ornaments/KyrgyzOrnaments';
import { Currency, Language } from '../../types/car';
import { INITIAL_CARS, USD_TO_KGS_RATE } from '../../data/mockData';

export interface FilterState {
  brand: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  priceFrom: string;
  priceTo: string;
  city: string;
  bodyType: string;
  transmission: string;
  steering: string;
  fuelType: string;
  customs: string;
  typeTab: 'all' | 'used' | 'new' | 'green';
}

interface LandingHeroProps {
  language: Language;
  currency: Currency;
  totalCarsCount: number;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onResetFilters?: () => void;
  onOpenCarCheck: () => void;
  onOpenCustomsCalc: () => void;
  onOpenParts: () => void;
  onPostAd: () => void;
  onExploreCars: () => void;
  onOpenWorkshop?: () => void;
  onSelectCarId?: (carId: string) => void;
}

interface ShowcaseSlide {
  id: string;
  carId: string;
  badgeRu: string;
  badgeKg: string;
  badgeEn: string;
  badgeColor: string;
  title: string;
  specsRu: string;
  specsKg: string;
  specsEn: string;
  priceUsd: number;
  priceKgs: number;
  city: string;
  plate: string;
  image: string;
  shortName: string;
  year: number;
  mileage: string;
  features: string[];
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  language,
  currency,
  totalCarsCount,
  filters,
  setFilters,
  onResetFilters,
  onOpenCarCheck,
  onOpenCustomsCalc,
  onOpenParts,
  onPostAd,
  onExploreCars,
  onOpenWorkshop,
  onSelectCarId,
}) => {
  const isKg = language === 'kg';
  const isEn = language === 'en';
  const isUsd = currency === 'USD';

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  // Only the visible slide and the next one are downloaded
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0, 1]));
  const [cardPosition, setCardPosition] = useState<'left' | 'right'>('left');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slides: ShowcaseSlide[] = [
    {
      id: 'slide-zeekr',
      carId: 'car-13',
      badgeRu: '⚡ Хит электромобилей в Бишкеке',
      badgeKg: '⚡ Бишкектеги эң популярдуу электрокар',
      badgeEn: '⚡ #1 Best-Selling EV in Bishkek',
      badgeColor: 'emerald',
      title: 'Zeekr 001 YOU 100 kWh 4WD',
      specsRu: '2024 г. • 544 л.с. • 4WD • 3 000 км • Пневмоподвеска • Двери с приводом',
      specsKg: '2024-ж. • 544 а.к. • 4WD • 3 000 км • Пневмоподвеска • Автомат эшиктер',
      specsEn: '2024 • 544 HP • 4WD • 3,000 km • Air Suspension • Power Doors',
      priceUsd: 36800,
      priceKgs: 3220000,
      city: 'Бишкек',
      plate: '01 KG 100 ZEK',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=2000&q=85',
      shortName: 'Zeekr 001 YOU',
      year: 2024,
      mileage: '3 000 км',
      features: [
        'Батарея 100 кВт·ч (запас хода 656 км)',
        'Пневмоподвеска с регулировкой клиренса',
        'Автоматические двери с электроприводом',
        'Премиум салон Nappa & аудио Yamaha',
      ],
    },
    {
      id: 'slide-lc300',
      carId: 'car-1',
      badgeRu: '👑 Король бездорожья & Премиум',
      badgeKg: '👑 Жол тандабастар падышасы',
      badgeEn: '👑 King of Off-Road & Luxury',
      badgeColor: 'amber',
      title: 'Toyota Land Cruiser 300 GR-Sport',
      specsRu: '2023 г. • 3.5 л Twin-Turbo • 4WD • 14 000 км • Комплектация GR-Sport • Растаможен',
      specsKg: '2023-ж. • 3.5 л Твин-турбо • 4WD • 14 000 км • GR-Sport • КР бажыдан өткөн',
      specsEn: '2023 • 3.5L Twin-Turbo • 4WD • 14,000 km • GR-Sport Package • Cleared',
      priceUsd: 98500,
      priceKgs: 8618750,
      city: 'Бишкек',
      plate: '01 KG 777 AAA',
      image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=2000&q=85',
      shortName: 'LC 300 GR-Sport',
      year: 2023,
      mileage: '14 000 км',
      features: [
        'Куплен новым в салоне Toyota Center Bishkek',
        'Комплектация GR-Sport с блокировками E-KDSS',
        'Бронепленка SunTek люкс пакет & шумка',
        'Растаможен в КР 100%, юридически чист',
      ],
    },
    {
      id: 'slide-bmw-x5',
      carId: 'car-12',
      badgeRu: '🔥 Баварский драйв M-Sport',
      badgeKg: '🔥 Бавариялык M-Sport драйв',
      badgeEn: '🔥 Bavarian Drive M-Sport',
      badgeColor: 'rose',
      title: 'BMW X5 xDrive40i M-Sport',
      specsRu: '2022 г. • 3.0 л TwinPower Turbo (340 л.с.) • 4WD • 32 000 км • Лазерные фары',
      specsKg: '2022-ж. • 3.0 л TwinPower Turbo (340 а.к.) • 4WD • 32 000 км • Лазер жарык',
      specsEn: '2022 • 3.0L TwinPower Turbo (340 HP) • 4WD • 32,000 km • Laser Lights',
      priceUsd: 62000,
      priceKgs: 5425000,
      city: 'Бишкек',
      plate: '01 KG 001 BMW',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=2000&q=85',
      shortName: 'BMW X5 M-Sport',
      year: 2022,
      mileage: '32 000 км',
      features: [
        'Официальный M-Sport пакет экстерьер и салон',
        'Лазерные фары BMW Laserlight & панорама',
        'Проекционный дисплей Head-Up Display',
        'Harman/Kardon акустика & камеры 360°',
      ],
    },
    {
      id: 'slide-li-l7',
      carId: 'car-29',
      badgeRu: '⚡ Умный флагман • Запас хода 1315 км',
      badgeKg: '⚡ Акылдуу гибрид • 1315 км жүрүү аралыгы',
      badgeEn: '⚡ Smart EREV SUV • 1,315 km Range',
      badgeColor: 'emerald',
      title: 'Li Auto L7 Max 4WD 2024',
      specsRu: '2024 г. • 449 л.с. • Dual-Motor 4WD • 2 500 км • Пневмоподвеска • Кожа Nappa',
      specsKg: '2024-ж. • 449 а.к. • Эки моторлуу 4WD • 2 500 км • Magic Carpet пневмо',
      specsEn: '2024 • 449 HP • Dual-Motor 4WD • 2,500 km • Magic Carpet Air Suspension',
      priceUsd: 42500,
      priceKgs: 3718750,
      city: 'Бишкек',
      plate: '01 KG 717 LIX',
      image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=2000&q=85',
      shortName: 'Li Auto L7 Max',
      year: 2024,
      mileage: '2 500 км',
      features: [
        'Суммарный запас хода 1 315 км (CLTC)',
        'Пневматическая подвеска Magic Carpet Air',
        'Кожа Nappa, массаж и вентиляция всех сидений',
        'Английский язык прошит, сим-карта Beeline впаяна',
      ],
    },
    {
      id: 'slide-lx570',
      carId: 'car-15',
      badgeRu: '💎 Премиальный внедорожник',
      badgeKg: '💎 Премиум жол тандабас',
      badgeEn: '💎 Premium Full-Size SUV',
      badgeColor: 'amber',
      title: 'Porsche Cayenne Coupe 2023',
      specsRu: '2023 г. • 3.0 л Turbo (353 л.с.) • 4WD • 12 000 км • Салон Club Leather • Sport Chrono',
      specsKg: '2023-ж. • 3.0 л Турбо (353 а.к.) • 4WD • 12 000 км • Sport Chrono пакети',
      specsEn: '2023 • 3.0L Turbo (353 HP) • 4WD • 12,000 km • Club Leather • Sport Chrono',
      priceUsd: 89000,
      priceKgs: 7787500,
      city: 'Бишкек',
      plate: '01 KG 999 POR',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=85',
      shortName: 'Porsche Cayenne',
      year: 2023,
      mileage: '12 000 км',
      features: [
        'Пакет Sport Chrono с переключателем режимов',
        'Эксклюзивная кожа Club Leather Truffle Brown',
        'Спортивная выхлопная система Porsche Sport',
        'Диски RS Spyder Design R21 & пневмоподвеска',
      ],
    },
    {
      id: 'slide-camry',
      carId: 'car-2',
      badgeRu: '🇰🇬 Самый ликвидный седан в КР',
      badgeKg: '🇰🇬 Кыргызстандагы эң популярдуу седан',
      badgeEn: '🇰🇬 Most In-Demand Sedan in KG',
      badgeColor: 'rose',
      title: 'Toyota Camry 70 Люкс Safety',
      specsRu: '2021 г. • 2.5 л (203 л.с.) • АКПП 8ст • 42 000 км • Японская сборка • Не бит',
      specsKg: '2021-ж. • 2.5 л • 8АКПП • 42 000 км • Япондук жыйноо • Боёлгон эмес',
      specsEn: '2021 • 2.5L (203 HP) • 8-speed Auto • 42,000 km • Japanese Build • Mint',
      priceUsd: 24500,
      priceKgs: 2143750,
      city: 'Бишкек',
      plate: '01 KG 808 BSK',
      image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=2000&q=85',
      shortName: 'Camry 70 Люкс',
      year: 2021,
      mileage: '42 000 км',
      features: [
        'Японская сборка, 100% родной заводской окрас',
        'Комплектация Люкс Safety с комплексом TSS 2.0',
        'Акустика JBL Premium Audio с 9 динамиками',
        'Обслуживался исключительно в Liqui Moly Bishkek',
      ],
    },
  ].map((slide) => {
    // Title, price, photo and specs always come from the real listing the slide opens
    const car = INITIAL_CARS.find((c) => c.id === slide.carId);
    if (!car) return slide;
    const km = car.mileageKm.toLocaleString('ru-RU');
    const engine = car.fuelType === 'Электро' ? null : `${car.engineVolume} л`;
    const drive = car.drive.includes('4WD') ? '4WD' : car.drive === 'Задний' ? 'RWD' : 'FWD';
    return {
      ...slide,
      title: car.title,
      shortName: `${car.brand} ${car.model}`,
      priceUsd: car.priceUsd,
      priceKgs: Math.round(car.priceUsd * USD_TO_KGS_RATE),
      city: car.city,
      plate: car.plateNumber,
      image: car.photos?.[0] || car.image,
      year: car.year,
      mileage: `${km} км`,
      specsRu: [`${car.year} г.`, engine, `${car.powerHp} л.с.`, drive, `${km} км`, car.transmission].filter(Boolean).join(' • '),
      specsKg: [`${car.year}-ж.`, engine, `${car.powerHp} а.к.`, drive, `${km} км`].filter(Boolean).join(' • '),
      specsEn: [`${car.year}`, engine?.replace(' л', 'L'), `${car.powerHp} HP`, drive, `${km} km`].filter(Boolean).join(' • '),
      features: car.features?.length ? car.features.slice(0, 4) : slide.features,
    };
  });

  // Auto-play timer for slideshow (3.8s per slide)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 3800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const currentSlide = slides[currentSlideIndex];
  React.useEffect(() => {
    setLoadedSlides((prev) => {
      const next = (currentSlideIndex + 1) % slides.length;
      if (prev.has(currentSlideIndex) && prev.has(next)) return prev;
      return new Set([...prev, currentSlideIndex, next]);
    });
  }, [currentSlideIndex, slides.length]);

  const getBadgeText = (slide: ShowcaseSlide) => {
    if (isKg) return slide.badgeKg;
    if (isEn) return slide.badgeEn;
    return slide.badgeRu;
  };

  const getSpecsText = (slide: ShowcaseSlide) => {
    if (isKg) return slide.specsKg;
    if (isEn) return slide.specsEn;
    return slide.specsRu;
  };

  const handleViewCar = () => {
    if (onSelectCarId) {
      onSelectCarId(currentSlide.carId);
    } else {
      onExploreCars();
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Здравствуйте! Интересует автомобиль ${currentSlide.title} (${currentSlide.plate}) по цене $${currentSlide.priceUsd.toLocaleString()} на Автобазаре Кыргызстана.`
    );
    window.open(`https://wa.me/996555123456?text=${text}`, '_blank');
  };

  return (
    <section className="relative bg-slate-950 text-white overflow-hidden border-b border-slate-800">
      


      {/* 
        CINEMATIC HERO CONTAINER:
        Ample height (680px - 740px) so the floating presentation / search card sits gracefully 
        on one side (left or right), leaving the background car photo 100% visible and unobstructed!
      */}
      <div className="relative w-full h-[690px] sm:h-[720px] lg:h-[750px] overflow-hidden select-none">
        
        {/* Photos Layer with smooth crossfade */}
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {loadedSlides.has(idx) && <img
              src={slide.image}
              alt={slide.title}
              decoding="async"
              fetchPriority={idx === 0 ? 'high' : 'low'}
              className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-7000 ease-out"
            />}
            {/* Soft vignette on edges that keeps 90% of the photo crisp and vibrant */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none" />
          </div>
        ))}

        {/* Kyrgyz National Tunduk Watermark in background */}
        <div className="absolute top-4 right-8 opacity-10 pointer-events-none text-red-500 z-20">
          <TundukIcon size={120} />
        </div>

        {/* 
          TOP ROW: Slide counter & Quick car selector tabs (Thumbnails)
        */}
        <div className="absolute top-3 left-4 right-4 sm:top-4 sm:left-6 sm:right-6 z-30 max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Slide counter & Fast Auto badge */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 text-xs font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold">{currentSlideIndex + 1}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{slides.length}</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 text-[11px] font-medium hidden sm:inline">
              {isKg ? 'КР популярдуу автолору' : isEn ? 'Hot Cars in KG' : 'Популярные авто в КР'}
            </span>
          </div>

          {/* Quick pill tabs to switch between showcased cars (phones use the arrows and dots instead) */}
          <div className="hidden md:flex items-center justify-end gap-1.5 flex-wrap max-w-[75%]">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-3 py-1 text-[11px] sm:text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 backdrop-blur-md ${
                  idx === currentSlideIndex
                    ? 'bg-[#C8102E] text-white shadow-md shadow-red-900/50 ring-1 ring-white/30'
                    : 'bg-slate-950/75 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-700/70'
                }`}
              >
                <span>{s.shortName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 
          CHEVRON ARROWS (Left & Right)
        */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950/80 hover:bg-[#C8102E] border border-slate-700/80 hover:border-red-500 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-2xl"
          aria-label="Предыдущий автомобиль"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950/80 hover:bg-[#C8102E] border border-slate-700/80 hover:border-red-500 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-2xl"
          aria-label="Следующий автомобиль"
        >
          <ChevronRight size={22} />
        </button>

        {/* 
          =========================================================================
          INTEGRATED FLOATING SEARCH & SHOWCASE CARD (ADDED DIRECTLY ONTO THE LEFT BLOCK!)
          Integrates the exact HeroFilter requested by user, while keeping background
          car slide photo completely clear and visible on the center & opposite side!
          =========================================================================
        */}
        {/* 
          COMPACT FLOATING SHOWCASE CARD
          Positioned on the side (left by default), small and sleek so it doesn't cover 
          the background car photo. Focused exclusively on the currently displayed car.
        */}
        <div
          className={`absolute z-30 pointer-events-auto transition-all duration-500 ease-out ${
            cardPosition === 'left'
              ? 'left-3 sm:left-6 lg:left-8'
              : 'right-3 sm:right-6 lg:right-8'
          } top-14 sm:top-16 w-[calc(100%-1.5rem)] sm:w-[310px] md:w-[330px] lg:w-[340px]`}
        >
          <div className="bg-slate-950/85 backdrop-blur-xl rounded-2xl border border-slate-700/80 p-3.5 sm:p-4 shadow-2xl shadow-black/95 text-white relative overflow-hidden">
            
            {/* Subtle Tunduk ornament watermark */}
            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none text-amber-500">
              <TundukIcon size={120} />
            </div>

            {/* TOP BAR OF CARD: Badge, Plate & Dock Flip Button */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/90 border border-red-800/80 text-[#ff4d67] text-[10px] font-black tracking-wide">
                  <Flame size={11} className="text-[#ff4d67]" />
                  <span className="truncate max-w-[150px]">{getBadgeText(currentSlide)}</span>
                </span>

                <div className="inline-flex items-center gap-1 bg-white text-slate-900 px-1.5 py-0.2 rounded-xs font-mono text-[10px] font-black border border-slate-300 shadow-xs">
                  <span className="text-[9px] bg-red-600 text-white px-0.5 rounded-xs font-sans font-bold">KG</span>
                  <span>{currentSlide.plate}</span>
                </div>
              </div>

              {/* DOCK TOGGLE BUTTON (↔ Слева / ↔ Справа) */}
              <button
                onClick={() => setCardPosition((prev) => (prev === 'left' ? 'right' : 'left'))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-[10px] font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                title="Переместить блок на другую сторону"
              >
                <ArrowLeftRight size={11} />
                <span>{cardPosition === 'left' ? '↔ Справа' : '↔ Слева'}</span>
              </button>
            </div>

            {/* CAR TITLE & DETAILS */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin size={11} className="text-red-400" />
                <span>{currentSlide.city}</span>
                <span>•</span>
                <span>{currentSlide.year} г.</span>
                <span>•</span>
                <span>{currentSlide.mileage}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {currentSlide.title}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                {getSpecsText(currentSlide)}
              </p>
            </div>

            {/* PRICE TAG */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                  {isKg ? 'Баасы' : 'Стоимость'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  ${currentSlide.priceUsd.toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-amber-300 font-mono block">
                  {currentSlide.priceKgs.toLocaleString()} СОМ
                </span>
                <span className="text-[10px] text-slate-400">Растаможен в КР 100%</span>
              </div>
            </div>

            {/* KEY FEATURES (COMPACT CHIPS) */}
            <div className="grid grid-cols-2 gap-1.5 mb-3.5">
              {currentSlide.features.slice(0, 2).map((feat, fIdx) => (
                <div
                  key={fIdx}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[10px] text-slate-300"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS (COMPACT ROW) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleViewCar}
                  className="flex-1 py-2.5 px-3 bg-[#C8102E] hover:bg-[#a60d26] text-white font-black text-xs rounded-xl uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{isKg ? 'Көрүү' : 'Смотреть авто'}</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={onOpenCustomsCalc}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Калькулятор растаможки"
                >
                  <Calculator size={14} className="text-amber-400" />
                  <span className="hidden sm:inline">Пошлина</span>
                </button>
              </div>

              <button
                onClick={handleWhatsApp}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Написать в WhatsApp</span>
              </button>
            </div>

            {/* MINI SLIDE SWITCHER DOTS ON BOTTOM */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-[10px]">Авто {currentSlideIndex + 1} из {slides.length}</span>
              <div className="flex items-center gap-1.5">
                {slides.map((_, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => setCurrentSlideIndex(sIdx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      sIdx === currentSlideIndex
                        ? 'w-5 bg-[#C8102E]'
                        : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Перейти к авто ${sIdx + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Seamless countdown progress bar at bottom of hero */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 h-1 overflow-hidden z-20">
          <div
            key={currentSlideIndex}
            className="h-full bg-gradient-to-r from-[#C8102E] to-amber-400 animate-[progress_3.8s_linear]"
            style={{
              width: '100%',
              animationDuration: '3.8s',
            }}
          />
        </div>

      </div>
    </section>
  );
};
