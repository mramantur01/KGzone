import React, { useState, useMemo } from 'react';
import {
  POPULAR_BRANDS,
  ALL_CAR_BRANDS,
  getModelsForBrand,
  getGenerationsForModel,
  USD_TO_KGS_RATE,
} from '../../data/mockData';
import { partFitsBrand, partFitsModel, partFitsGeneration, partInCategory, partMatchesSubPart } from '../../utils/partMatching';
import { ModelPartsTree } from './ModelPartsTree';
import { useParts } from '../../api/parts';
import { decodeVin, type VinInfo } from '../../utils/vin';
import { togglePartFavorite, usePartFavorites } from '../../utils/partFavorites';
import { AutoPartItem, BuyerOrder, Currency, Language } from '../../types/car';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import { PartDetailModal } from '../modals/PartDetailModal';
import { PartOrderModal } from '../modals/PartOrderModal';
import { PartSellerPortalModal } from '../modals/PartSellerPortalModal';
import { AllBrandsModal } from '../common/AllBrandsModal';
import { PartsSliderBanner } from './PartsSliderBanner';
import { AdBannerSlot } from '../common/AdBannerSlot';
import { PARTS_SIDEBAR_ADS, PARTS_SIDEBAR_BOXES, PARTS_SIDEBAR_BOTTOM_ADS } from '../../data/adBanners';
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Store,
  ShieldCheck,
  ChevronRight,
  Filter,
  Car as CarIcon,
  Tag,
  Wrench,
  ShoppingBag,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  DollarSign,
  Package,
  Plus,
  Video,
  Eye,
  SlidersHorizontal,
  Calendar,
  LayoutGrid,
  List,
  ArrowUpDown,
  Building,
  Heart,
  Truck,
  User,
} from 'lucide-react';

const PAGE_SIZE = 24;

const partConditionGroup = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes('восстановл')) return 'Восстановленная';
  if (c.includes('контракт')) return 'Контрактная';
  if (c.includes('б/у') || c.includes('разбор')) return 'Б/У';
  return 'Новая';
};

const partSellerType = (p: AutoPartItem) => p.sellerType || (p.companyName || p.inn ? 'legal' : 'individual');

const fmtPartDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : null);

interface PartsSectionProps {
  currency: Currency;
  language: Language;
  onOrderCreated?: (order: BuyerOrder) => void;
  onNavigateToCabinet?: () => void;
}

export const PartsSection: React.FC<PartsSectionProps> = ({
  currency,
  language,
  onOrderCreated,
  onNavigateToCabinet,
}) => {
  const isKg = language === 'kg';

  // Live parts list (supports adding new parts dynamically)
  // Shared catalog (approved database parts + demo listings) with local stock changes from orders
  const storeParts = useParts();
  const [stockOverrides, setStockOverrides] = useState<Record<string, Partial<AutoPartItem>>>({});
  const partsList = useMemo(
    () => storeParts.map((p) => (stockOverrides[p.id] ? { ...p, ...stockOverrides[p.id] } : p)),
    [storeParts, stockOverrides]
  );

  // View mode: Grid vs Drom-style Rows
  const [viewMode, setViewMode] = useState<'grid' | 'rows'>('grid');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedGeneration, setSelectedGeneration] = useState<string>('');
  const [isModelTreeHidden, setIsModelTreeHidden] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedSubPart, setSelectedSubPart] = useState<string>('Все');
  const [selectedCityOrMarket, setSelectedCityOrMarket] = useState<string>('Все');
  const [selectedCondition, setSelectedCondition] = useState<string>('Все');
  const [selectedOriginalType, setSelectedOriginalType] = useState<string>('Все');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyWithVideo, setOnlyWithVideo] = useState<boolean>(false);
  const [sellerTypeFilter, setSellerTypeFilter] = useState<'Все' | 'individual' | 'legal'>('Все');
  const [deliveryFilter, setDeliveryFilter] = useState<'Все' | 'delivery' | 'pickup'>('Все');
  const [onlyWithPhoto, setOnlyWithPhoto] = useState<boolean>(false);
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [vinInput, setVinInput] = useState('');
  const [vinInfo, setVinInfo] = useState<VinInfo | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const favoriteIds = usePartFavorites();

  // Track revealed phone numbers (anti-spam Drom feature)
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  const toggleRevealPhone = (partId: string) => {
    setRevealedPhones((prev) => ({ ...prev, [partId]: true }));
  };

  // Modals state
  const [selectedPartForDetail, setSelectedPartForDetail] = useState<AutoPartItem | null>(null);
  const [orderedPart, setOrderedPart] = useState<AutoPartItem | null>(null);
  const [isSellerPortalOpen, setIsSellerPortalOpen] = useState<boolean>(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [copiedPartNumber, setCopiedPartNumber] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyOEM = (oem: string) => {
    navigator.clipboard.writeText(oem);
    setCopiedPartNumber(oem);
    showToast(isKg ? `OEM көчүрүлдү: ${oem}` : `OEM артикул скопирован: ${oem}`);
    setTimeout(() => setCopiedPartNumber(null), 2500);
  };

  const handleStockUpdate = (partId: string, delta: number) => {
    const item = partsList.find((p) => p.id === partId);
    if (!item) return;
    const newCount = Math.max(0, (item.stockCount || 0) + delta);
    setStockOverrides((prev) => ({
      ...prev,
      [partId]: {
        stockCount: newCount,
        inStock: newCount > 0,
        stockStatus: newCount === 0 ? 'Продано' : newCount < 2 ? 'Осталось мало' : 'В наличии',
      },
    }));
  };

  const availableModels = getModelsForBrand(selectedBrand);
  const availableGenerations = useMemo(
    () => (selectedBrand && selectedModel ? getGenerationsForModel(selectedBrand, selectedModel) : []),
    [selectedBrand, selectedModel]
  );
  const currentGeneration = availableGenerations.find((g) => g.name === selectedGeneration) || null;
  // Popular brands first, then every other brand from the catalog
  const brandOptions = useMemo(() => ALL_CAR_BRANDS.filter((b) => !POPULAR_BRANDS.includes(b)), []);

  // 12 COMPLETE CATEGORIES WITH CORRESPONDING SUB-PARTS
  const categoriesData = [
    {
      id: 'Все',
      labelRu: 'Все категории',
      labelKg: 'Бардык категориялар',
      icon: '📦',
      subParts: [],
    },
    {
      id: 'Двигатель',
      matchId: 'Двигатель и элементы двигателя',
      aliases: ['Двигатель в сборе'],
      labelRu: 'Двигатель',
      labelKg: 'Кыймылдаткыч',
      icon: '⚙️',
      subParts: [
        'Двигатель в сборе',
        'ГБЦ',
        'Поршни и кольца',
        'Ремень ГРМ',
        'Цепь ГРМ',
        'Турбина',
        'Прокладка ГБЦ',
        'Свечи зажигания',
        'Помпа',
      ],
    },
    {
      id: 'Трансмиссия',
      matchId: 'Трансмиссия',
      labelRu: 'Трансмиссия',
      labelKg: 'Трансмиссия & КПП',
      icon: '🔄',
      subParts: [
        'АКПП',
        'МКПП',
        'Вариатор (CVT)',
        'Сцепление',
        'Раздаточная коробка',
        'Карданный вал',
        'ШРУС (граната)',
        'Редуктор',
      ],
    },
    {
      id: 'Подвеска',
      matchId: 'Ходовая часть',
      aliases: ['Амортизаторы', 'Рычаги', 'Пневмобаллоны'],
      labelRu: 'Подвеска & ходовая',
      labelKg: 'Асма & ходовая',
      icon: '🛞',
      subParts: [
        'Амортизаторы',
        'Стойки в сборе',
        'Пружины',
        'Рычаги подвески',
        'Шаровые опоры',
        'Сайлентблоки',
        'Ступицы',
        'Пневмобаллоны',
      ],
    },
    {
      id: 'Тормозная система',
      matchId: 'Тормозная система',
      labelRu: 'Тормозная система',
      labelKg: 'Тормоз системасы',
      icon: '🛑',
      subParts: [
        'Тормозные колодки',
        'Тормозные диски',
        'Суппорты',
        'Вакуумный усилитель',
        'Тормозные шланги',
        'Блок ABS',
      ],
    },
    {
      id: 'Кузов',
      matchId: 'Детали кузова',
      aliases: ['Бампер', 'Капот'],
      labelRu: 'Кузов',
      labelKg: 'Кузовдук тетиктер',
      icon: '🚗',
      subParts: [
        'Бампер передний',
        'Бампер задний',
        'Капот',
        'Крыло',
        'Дверь',
        'Крышка багажника',
        'Решётка радиатора',
        'Боковое зеркало',
        'Лобовое стекло',
      ],
    },
    {
      id: 'Оптика',
      matchId: 'Оптика',
      aliases: ['Фара'],
      labelRu: 'Оптика & фары',
      labelKg: 'Оптика & фаралар',
      icon: '💡',
      subParts: [
        'Фары Full LED',
        'Ксеноновые фары',
        'Задние фонари',
        'Противотуманки',
        'Поворотники',
        'Блок розжига',
      ],
    },
    {
      id: 'Электрика',
      matchId: 'Электрика',
      aliases: ['Блок управления', 'ЭБУ', 'Датчик'],
      labelRu: 'Электрика',
      labelKg: 'Электрика',
      icon: '⚡',
      subParts: [
        'Стартер',
        'Генератор',
        'ЭБУ (мозги)',
        'Катушка зажигания',
        'Датчик кислорода',
        'Модуль BMS',
        'Проводка',
      ],
    },
    {
      id: 'Система охлаждения',
      matchId: 'Система охлаждения',
      aliases: ['Радиатор охлаждения'],
      labelRu: 'Система охлаждения',
      labelKg: 'Муздатуу системасы',
      icon: '🌡️',
      subParts: ['Радиатор', 'Вентилятор', 'Помпа', 'Термостат', 'Расширительный бачок', 'Патрубки'],
    },
    {
      id: 'Отопление и кондиционер',
      matchId: 'Система отопления и кондиционирования',
      labelRu: 'Отопление и кондиционер',
      labelKg: 'Жылытуу жана кондиционер',
      icon: '❄️',
      subParts: ['Радиатор печки', 'Компрессор кондиционера', 'Конденсер', 'Мотор печки', 'Блок управления климатом'],
    },
    {
      id: 'Топливная система',
      matchId: 'Топливная система',
      labelRu: 'Топливная система',
      labelKg: 'Күйүүчү май системасы',
      icon: '⛽',
      subParts: ['Форсунки', 'Топливный насос', 'Топливная рампа', 'Топливный бак', 'Топливный фильтр', 'Дроссельная заслонка'],
    },
    {
      id: 'Масла и фильтры',
      matchId: 'Масла и фильтры',
      aliases: ['Расходники', 'Тормозные колодки'],
      labelRu: 'Расходники и ТО',
      labelKg: 'Чыгым материалдары жана ТО',
      icon: '🛢️',
      subParts: [
        'Моторное масло',
        'Масляный фильтр',
        'Воздушный фильтр',
        'Салонный фильтр',
        'Свечи зажигания',
        'Ремни',
        'Щётки стеклоочистителя',
      ],
    },
    {
      id: 'Шины и диски',
      matchId: 'Шины и диски',
      labelRu: 'Колёса, шины и диски',
      labelKg: 'Дөңгөлөктөр жана дисктер',
      icon: '🛞',
      subParts: [
        'Легкосплавные диски R16-R20',
        'Штампованные диски',
        'Зимняя резина',
        'Всесезонные шины',
        'Датчики TPMS',
      ],
    },
    {
      id: 'Салон',
      matchId: 'Салон и безопасность',
      labelRu: 'Салон & безопасность',
      labelKg: 'Салон & коопсуздук',
      icon: '🛡️',
      subParts: [
        'Сиденья',
        'Мультируль',
        'Торпедо',
        'Подушки Airbag',
        'Ремни безопасности',
        'Обшивка дверей',
      ],
    },
    {
      id: 'Выхлопная система',
      matchId: 'Выхлопная система',
      labelRu: 'Выхлопная система',
      labelKg: 'Чыгаруу системасы',
      icon: '💨',
      subParts: [
        'Глушитель',
        'Катализатор',
        'Пламегаситель',
        'Резонатор',
        'Лямбда-зонд',
      ],
    },
    {
      id: 'Тюнинг',
      matchId: 'Тюнинг и дополнительное оборудование',
      labelRu: 'Тюнинг и доп. оборудование',
      labelKg: 'Тюнинг жана кошумча жабдуулар',
      icon: '🏁',
      subParts: ['Обвес', 'Спойлер', 'Фаркоп', 'Магнитола', 'Видеорегистратор', 'Сигнализация', 'Багажник на крышу'],
    },
  ];

  // Quick search suggestions (Drom-style)
  // Cities and Markets of Kyrgyzstan
  const locationsList = [
    { id: 'Все', label: isKg ? 'Бардык шаарлар жана базарлар' : 'Все города и рынки' },
    { id: 'Кудайберген', label: 'Авторынок «Кудайберген» (Бишкек)' },
    { id: 'Дордой Моторс', label: 'Рынок «Дордой Моторс / Дордой-Авто»' },
    { id: 'РИОМ Авто', label: 'Авторынок «РИОМ Авто» (Военно-Антоновка)' },
    { id: 'Баят', label: 'Рынок «Баят»' },
    { id: 'Жапалак Ош', label: 'Авторынок «Жапалак» (г. Ош)' },
    { id: 'База Автозапчастей Ош', label: 'Склады г. Ош' },
    { id: 'Бишкек', label: 'г. Бишкек (Склады и разборы)' },
    { id: 'Ош', label: 'г. Ош' },
    { id: 'Джалал-Абад', label: 'г. Джалал-Абад' },
    { id: 'Каракол', label: 'г. Каракол (Иссык-Куль)' },
    { id: 'Токмок', label: 'г. Токмок' },
    { id: 'Нарын', label: 'г. Нарын' },
    { id: 'Талас', label: 'г. Талас' },
    { id: 'Баткен', label: 'г. Баткен' },
  ];

  // Selected Category Object
  const currentCategoryObj = categoriesData.find((c) => c.id === selectedCategory);

  // Filtering & Sorting
  const filteredParts = useMemo(() => {
    let result = partsList.filter((part) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          part.title.toLowerCase().includes(q) ||
          part.partNumber.toLowerCase().includes(q) ||
          part.brand.toLowerCase().includes(q) ||
          part.model.toLowerCase().includes(q) ||
          part.category.toLowerCase().includes(q) ||
          (part.subcategory && part.subcategory.toLowerCase().includes(q)) ||
          (part.subPartName && part.subPartName.toLowerCase().includes(q)) ||
          (part.storeLocation && part.storeLocation.toLowerCase().includes(q)) ||
          (part.containerInfo && part.containerInfo.toLowerCase().includes(q)) ||
          (part.bodyCode && part.bodyCode.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Brand / model / generation (the part's own car or any car in its compatibility table)
      if (selectedBrand && !selectedModel && !partFitsBrand(part, selectedBrand)) return false;
      if (selectedModel && !partFitsModel(part, selectedBrand, selectedModel)) return false;
      if (currentGeneration && !partFitsGeneration(part, currentGeneration)) return false;

      // Year
      if (selectedYear) {
        const y = selectedYear;
        const partMatch =
          (part.generation && part.generation.includes(y)) ||
          (part.year && String(part.year) === y) ||
          (part.yearRange && part.yearRange.includes(y)) ||
          (part.compatibility && part.compatibility.some((c) => c.years.includes(y)));
        if (!partMatch) return false;
      }

      // Category / sub-part
      if (selectedCategory !== 'Все') {
        const catObj = categoriesData.find((c) => c.id === selectedCategory);
        if (catObj && !partInCategory(part, catObj)) return false;
      }
      if (!partMatchesSubPart(part, selectedSubPart)) return false;

      // Location / Market / City
      if (selectedCityOrMarket !== 'Все') {
        const locLower = selectedCityOrMarket.toLowerCase();
        const matchLoc =
          part.market.toLowerCase().includes(locLower) ||
          part.storeCity.toLowerCase().includes(locLower) ||
          (part.city && part.city.toLowerCase().includes(locLower)) ||
          part.storeLocation.toLowerCase().includes(locLower);
        if (!matchLoc) return false;
      }

      // Condition: new / used / contract (from a donor car abroad) / restored
      if (selectedCondition !== 'Все') {
        const group = partConditionGroup(part.condition);
        if (selectedCondition === 'Б/У' ? group !== 'Б/У' && group !== 'Контрактная' : group !== selectedCondition) return false;
      }

      // Original / Analog
      if (selectedOriginalType !== 'Все') {
        if (selectedOriginalType === 'Оригинал' && !part.condition.includes('Оригинал')) {
          return false;
        }
        if (selectedOriginalType === 'Аналог' && !part.condition.includes('Дубликат') && !part.condition.includes('OEM')) {
          return false;
        }
      }

      // Price range
      if (priceMin && part.priceKgs < Number(priceMin)) return false;
      if (priceMax && part.priceKgs > Number(priceMax)) return false;

      // Stock
      if (onlyInStock && !part.inStock) return false;

      // Video check
      if (onlyWithVideo && !part.hasCompressionVideo && !part.videoUrl) return false;

      if (sellerTypeFilter !== 'Все' && partSellerType(part) !== sellerTypeFilter) return false;
      if (deliveryFilter === 'delivery' && !part.deliveryAvailable) return false;
      if (deliveryFilter === 'pickup' && part.pickupAvailable === false) return false;
      if (onlyWithPhoto && !part.image) return false;
      if (onlyFavorites && !favoriteIds.includes(part.id)) return false;

      return true;
    });

    // Relevance: exact OEM match first, then OEM contains, then title
    const q = searchQuery.toLowerCase().trim();
    const relevance = (p: AutoPartItem) =>
      !q ? 0 : (p.partNumber.toLowerCase() === q ? 4 : 0) + (p.partNumber.toLowerCase().includes(q) ? 2 : 0) + (p.title.toLowerCase().includes(q) ? 1 : 0);

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price_asc') return a.priceKgs - b.priceKgs;
      if (sortBy === 'price_desc') return b.priceKgs - a.priceKgs;
      if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'relevance') return relevance(b) - relevance(a);
      // Newest first: database listings carry a date, built-in demo listings keep their order
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return result;
  }, [
    partsList,
    searchQuery,
    selectedBrand,
    selectedModel,
    currentGeneration,
    selectedYear,
    selectedCategory,
    selectedSubPart,
    selectedCityOrMarket,
    selectedCondition,
    selectedOriginalType,
    priceMin,
    priceMax,
    sortBy,
    onlyInStock,
    onlyWithVideo,
    sellerTypeFilter,
    deliveryFilter,
    onlyWithPhoto,
    onlyFavorites,
    favoriteIds,
  ]);

  // Back to the first page whenever the result set changes
  React.useEffect(() => setVisibleCount(PAGE_SIZE), [filteredParts.length, sortBy]);
  const shownParts = filteredParts.slice(0, visibleCount);

  const handleVinSearch = () => {
    setVinError(null);
    const info = decodeVin(vinInput);
    if (!info) {
      setVinInfo(null);
      setVinError(isKg ? 'VIN 17 белгиден турат (I, O, Q тамгаларысыз). Япон унааларында көбүнчө кузов номери болот — аны издөөгө жазыңыз.' : 'VIN — 17 символов без букв I, O, Q. У японских авто часто номер кузова вместо VIN — введите его в поиск.');
      return;
    }
    setVinInfo(info);
    if (info.brand && ALL_CAR_BRANDS.includes(info.brand)) {
      setSelectedBrand(info.brand);
      setSelectedModel('');
      setSelectedGeneration('');
    }
    if (info.year) setSelectedYear(String(info.year));
  };

  // Parts that fit the selected car, ignoring the other filters (feeds the per-model parts tree)
  const fittingParts = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    return partsList.filter(
      (p) => partFitsModel(p, selectedBrand, selectedModel) && (!currentGeneration || partFitsGeneration(p, currentGeneration))
    );
  }, [partsList, selectedBrand, selectedModel, currentGeneration]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedGeneration('');
    setIsModelTreeHidden(false);
    setSelectedYear('');
    setSelectedCategory('Все');
    setSelectedSubPart('Все');
    setSelectedCityOrMarket('Все');
    setSelectedCondition('Все');
    setSelectedOriginalType('Все');
    setPriceMin('');
    setPriceMax('');
    setSortBy('newest');
    setOnlyInStock(false);
    setOnlyWithVideo(false);
    setSellerTypeFilter('Все');
    setDeliveryFilter('Все');
    setOnlyWithPhoto(false);
    setOnlyFavorites(false);
    setVinInput('');
    setVinInfo(null);
    setVinError(null);
  };

  const handleWhatsAppOrder = (part: AutoPartItem) => {
    const cleanPhone = part.sellerPhone.replace(/[^0-9]/g, '');
    const sellerWhatsappNumber = part.sellerWhatsapp || cleanPhone;
    const text = encodeURIComponent(
      `Саламатсызбы! Мен KGzone сайтындагы тетикти көрдүм:\n` +
      `📦 ${part.title} (OEM: ${part.partNumber})\n` +
      `🏢 Базар: ${part.market} (${part.containerInfo || part.storeLocation})\n` +
      `💰 Баасы: ${part.priceKgs} сом.\n\n` +
      `Азыр боксуңузда барбы? Барып текшерүүгө болобу?`
    );
    window.open(`https://wa.me/${sellerWhatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="bg-neutral-950 text-white min-h-screen py-8 px-4 sm:px-6 lg:px-8 relative overflow-clip">
      
      {/* Background Kyrgyz Ornaments (Tunduk & Kochkor Muyuz) */}
      <div className="absolute top-10 right-10 opacity-4 pointer-events-none text-red-500">
        <TundukIcon size={450} />
      </div>
      <div className="absolute bottom-10 left-10 opacity-4 pointer-events-none text-amber-400">
        <KochkorMuyuzIcon size={400} />
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* TOP ACTION BAR: HEADING & ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-850">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-700/60 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              <KochkorMuyuzIcon size={14} />
              <span>{isKg ? 'KGzone • Автотетиктер порталы' : 'KGzone • Портал автозапчастей Кыргызстана'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isKg ? 'Кыргызстандын автотетиктери (Drom үлгүсүндө)' : 'Автозапчасти для любого авто по всему Кыргызстану'}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isKg
                ? 'Бишкек, Ош, Кудайберген, Дордой-Авто жана бардык облустар боюнча түз байланыш'
                : 'Прямые контакты разборов, контейнеров Кудайбергена, Дордой-Авто и магазинов всех городов КР'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSellerPortalOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer hover:scale-102"
            >
              <Store size={16} />
              <span>{isKg ? '+ Контейнер кошуу (0%)' : '+ Подать запчасть / Контейнер 0%'}</span>
            </button>
          </div>
        </div>

        {/* 1. DYNAMIC BANNER SLIDER (Promo banners) */}
        <PartsSliderBanner
          language={language}
          onFilterEngines={() => {
            setSelectedCategory('Двигатель');
            setOnlyWithVideo(true);
            showToast('Фильтр: контрактные двигатели из Японии с видео замера компрессии');
          }}
          onFilterOptics={() => {
            setSelectedCategory('Оптика');
            setSelectedCityOrMarket('Дордой Моторс');
            showToast('Фильтр: Оптика и кузовные детали на Дордой-Авто');
          }}
          onOpenSellerRegistration={() => setIsSellerPortalOpen(true)}
          onSelectMarket={(m) => {
            setSelectedCityOrMarket(m);
            showToast(`Фильтр по рынку: ${m}`);
          }}
        />

        {/* 2. ADVANCED SEARCH TERMINAL & DROM-STYLE QUICK SUGGESTIONS */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl mb-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />

          {/* Main Search Input & Location */}
          <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={isKg ? 'Тетикти издөө: аталышы, OEM артикул (2AR-FE, 04465-33471), контейнер...' : 'Поиск: деталь, марка, модель, OEM артикул (например: 2AR-FE, 04465-33471), контейнер...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3.5 bg-neutral-950 border border-neutral-700 rounded-2xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-red-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* City or Market Selector */}
            <div className="w-full md:w-64">
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" />
                <select
                  value={selectedCityOrMarket}
                  onChange={(e) => setSelectedCityOrMarket(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-neutral-950 border border-neutral-700 rounded-2xl text-xs sm:text-sm text-white cursor-pointer font-bold"
                >
                  {locationsList.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Filters */}
            {(searchQuery || selectedBrand || selectedModel || selectedYear || selectedCategory !== 'Все' || selectedSubPart !== 'Все' || selectedCityOrMarket !== 'Все' || selectedCondition !== 'Все' || selectedOriginalType !== 'Все' || priceMin || priceMax || onlyInStock || onlyWithVideo || sellerTypeFilter !== 'Все' || deliveryFilter !== 'Все' || onlyWithPhoto || onlyFavorites) && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-red-400 rounded-2xl flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <RotateCcw size={14} />
                <span>{isKg ? 'Тазалоо' : 'Сбросить'}</span>
              </button>
            )}
          </div>

          {/* Detailed Filters: Brand, Model, Year, Condition, Original/Analog, Price Range */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 pt-3 border-t border-neutral-800 text-xs">
            {/* Brand */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-neutral-400 font-semibold">{isKg ? 'Марка:' : 'Марка авто:'}</span>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Все ({ALL_CAR_BRANDS.length})
                </button>
              </div>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedModel('');
                  setSelectedGeneration('');
                }}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium"
              >
                <option value="">{isKg ? 'Каалаган марка' : 'Любая марка'}</option>
                <optgroup label={isKg ? 'Популярдуу' : 'Популярные'}>
                  {POPULAR_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </optgroup>
                <optgroup label={isKg ? 'Бардык маркалар' : 'Все марки'}>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Model */}
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Модель:' : 'Модель авто:'}</span>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setSelectedGeneration('');
                  setIsModelTreeHidden(false);
                }}
                disabled={!selectedBrand}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white disabled:opacity-40 font-medium"
              >
                <option value="">{selectedBrand ? (isKg ? 'Бардык моделдер' : 'Все модели') : (isKg ? 'Марканы тандаңыз' : 'Сначала марку')}</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Generation (only when the catalog knows them) */}
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Муун:' : 'Поколение:'}</span>
              <select
                value={selectedGeneration}
                onChange={(e) => setSelectedGeneration(e.target.value)}
                disabled={availableGenerations.length === 0}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white disabled:opacity-40 font-medium"
              >
                <option value="">
                  {availableGenerations.length ? (isKg ? 'Бардык муундар' : 'Все поколения') : '—'}
                </option>
                {availableGenerations.map((g) => (
                  <option key={g.name} value={g.name}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Чыккан жылы:' : 'Год выпуска:'}</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium"
              >
                <option value="">{isKg ? 'Каалаган жыл' : 'Любой год'}</option>
                {Array.from({ length: 26 }, (_, i) => 2025 - i).map((yr) => (
                  <option key={yr} value={String(yr)}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Condition: Новая / Б/У */}
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Абалы:' : 'Состояние:'}</span>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium"
              >
                <option value="Все">{isKg ? 'Бардыгы' : 'Любое (Новая/Б-у)'}</option>
                <option value="Новая">{isKg ? 'Жаңы' : 'Только новая'}</option>
                <option value="Б/У">{isKg ? 'Б/У' : 'Б/у'}</option>
                <option value="Контрактная">{isKg ? 'Контракттык' : 'Контрактная'}</option>
                <option value="Восстановленная">{isKg ? 'Калыбына келтирилген' : 'Восстановленная'}</option>
              </select>
            </div>

            {/* Original vs Analog */}
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Подлинность:' : 'Подлинность:'}</span>
              <select
                value={selectedOriginalType}
                onChange={(e) => setSelectedOriginalType(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium"
              >
                <option value="Все">{isKg ? 'Бардыгы' : 'Оригинал и аналог'}</option>
                <option value="Оригинал">{isKg ? 'Оригинал гана' : 'Только оригинал'}</option>
                <option value="Аналог">{isKg ? 'OEM дубликат / аналог' : 'Качественный аналог'}</option>
              </select>
            </div>

            {/* Price Range (От - До в сомах) */}
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Баасы (сом):' : 'Цена (сом):'}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="от"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-1/2 px-2 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-[11px]"
                />
                <input
                  type="number"
                  placeholder="до"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-1/2 px-2 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Seller type, delivery, VIN and quick toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-3 mt-3 border-t border-neutral-800 text-xs">
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Сатуучу:' : 'Продавец:'}</span>
              <select
                value={sellerTypeFilter}
                onChange={(e) => setSellerTypeFilter(e.target.value as typeof sellerTypeFilter)}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium"
              >
                <option value="Все">{isKg ? 'Бардыгы' : 'Все продавцы'}</option>
                <option value="individual">{isKg ? 'Жеке сатуучу' : 'Частный продавец'}</option>
                <option value="legal">{isKg ? 'Дүкөн / компания' : 'Магазин / компания'}</option>
              </select>
            </div>
            <div>
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'Алуу жолу:' : 'Получение:'}</span>
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as typeof deliveryFilter)}
                className="w-full px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-medium"
              >
                <option value="Все">{isKg ? 'Баары' : 'Доставка или самовывоз'}</option>
                <option value="delivery">{isKg ? 'Жеткирүү бар' : 'Есть доставка'}</option>
                <option value="pickup">{isKg ? 'Өзү алып кетүү' : 'Самовывоз'}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <span className="block text-neutral-400 font-semibold mb-1">{isKg ? 'VIN боюнча тандоо:' : 'Подбор по VIN:'}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vinInput}
                  onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVinSearch(); }}
                  placeholder={isKg ? '17 белгилүү VIN' : 'VIN из 17 символов'}
                  maxLength={20}
                  className="flex-1 min-w-0 px-2.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleVinSearch}
                  className="px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer shrink-0"
                >
                  {isKg ? 'Тандоо' : 'Подобрать'}
                </button>
              </div>
              {vinError && <p className="text-[11px] text-red-400 mt-1">{vinError}</p>}
              {vinInfo && (
                <p className="text-[11px] text-neutral-400 mt-1">
                  {isKg ? 'VIN боюнча:' : 'По VIN:'}{' '}
                  <b className="text-white">{vinInfo.brand || (isKg ? 'марка аныкталган жок' : 'марка не определена')}</b>
                  {vinInfo.year ? ', ' + vinInfo.year : ''}
                  {vinInfo.region ? ' · ' + vinInfo.region : ''}.{' '}
                  {isKg ? 'Моделди тизмеден тандаңыз. Так тандоо үчүн VIN-каталог туташтырылышы керек.' : 'Выберите модель из списка. Точный подбор по VIN требует подключения VIN-каталога.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3 text-xs text-neutral-300">
            {[
              { checked: onlyWithPhoto, set: setOnlyWithPhoto, label: isKg ? 'Сүрөтү барлар гана' : 'Только с фото' },
              { checked: onlyInStock, set: setOnlyInStock, label: isKg ? 'Кампада бар' : 'Только в наличии' },
              { checked: onlyWithVideo, set: setOnlyWithVideo, label: isKg ? 'Видеосу бар' : 'С видео' },
              { checked: onlyFavorites, set: setOnlyFavorites, label: (isKg ? 'Тандалгандар' : 'Избранное') + ' (' + favoriteIds.length + ')' },
            ].map((t, i) => (
              <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={t.checked} onChange={(e) => t.set(e.target.checked)} className="accent-red-600" />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 3. 12 CATEGORIES RIBBON WITH SUB-PARTS */}
        <div className="mb-6 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap pb-2 text-xs font-bold">
            {categoriesData.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubPart('Все');
                  }}
                  className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-lg shadow-red-950/60 ring-1 ring-amber-400'
                      : 'bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{isKg ? cat.labelKg : cat.labelRu}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-parts strip when a category is selected */}
          {currentCategoryObj && currentCategoryObj.subParts.length > 0 && (
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] text-neutral-400 font-semibold shrink-0 mr-1">
                {isKg ? 'Тетиктин түрү:' : 'Тип детали:'}
              </span>
              <button
                onClick={() => setSelectedSubPart('Все')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                  selectedSubPart === 'Все'
                    ? 'bg-amber-500 text-neutral-950 font-black'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                {isKg ? 'Бардык түрлөрү' : 'Все типы детали'}
              </button>
              {currentCategoryObj.subParts.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubPart(sub)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
                    selectedSubPart === sub
                      ? 'bg-amber-500 text-neutral-950 font-black'
                      : 'bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. RESULTS BAR WITH SORTING & VIEW MODE TOGGLE (Grid vs Drom Rows) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-white">
              {isKg ? 'Табылган автотетиктер' : 'Каталог автозапчастей'}
            </h2>
            <span className="text-xs bg-neutral-950 text-amber-400 border border-neutral-800 font-bold px-2.5 py-0.5 rounded-full">
              {filteredParts.length} {isKg ? 'деталь' : 'объявлений'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Sorting */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <ArrowUpDown size={13} />
              <span>{isKg ? 'Иреттөө:' : 'Сортировка:'}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white cursor-pointer font-medium"
              >
                <option value="newest">{isKg ? 'Алгач жаңылары' : 'Сначала новые'}</option>
                <option value="relevance">{isKg ? 'Дал келүүсү боюнча' : 'По релевантности'}</option>
                <option value="price_asc">{isKg ? 'Алгач арзандары' : 'Сначала дешевые'}</option>
                <option value="price_desc">{isKg ? 'Алгач кымбаттары' : 'Сначала дорогие'}</option>
                <option value="popular">{isKg ? 'Көрүүлөр боюнча' : 'По популярности'}</option>
              </select>
            </div>

            {/* View switcher: Grid vs Drom Rows */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="Сетка карточек"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('rows')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'rows' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="Строчный список в стиле Drom.ru"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* 5. MAIN CONTENT LAYOUT: SIDEBAR WITH POPULAR MAKES + LISTINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          
          {/* SIDEBAR: advertising slots (see src/data/adBanners.ts). The column stretches to the
              catalog's height; the last slot sticks to the screen in the remaining space. */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            <AdBannerSlot banners={PARTS_SIDEBAR_ADS} />
            {PARTS_SIDEBAR_BOXES.map((slot, i) => (
              <AdBannerSlot key={i} banners={slot} variant="box" intervalMs={7000 + i * 1500} />
            ))}
            <div className="flex-1">
              <AdBannerSlot banners={PARTS_SIDEBAR_BOTTOM_ADS} className="sticky top-24" />
            </div>
          </div>

          {/* LISTINGS CONTAINER (9 cols on desktop) */}
          <div className="lg:col-span-9">
            {selectedBrand && selectedModel && !isModelTreeHidden && (
              <ModelPartsTree
                brand={selectedBrand}
                model={selectedModel}
                generation={currentGeneration}
                fittingParts={fittingParts}
                categories={categoriesData.filter((c) => c.id !== 'Все')}
                selectedCategory={selectedCategory}
                selectedSubPart={selectedSubPart}
                onSelect={(cat, sub) => {
                  setSelectedCategory(cat);
                  setSelectedSubPart(sub);
                }}
                onClose={() => setIsModelTreeHidden(true)}
                isKg={isKg}
              />
            )}

            {filteredParts.length === 0 ? (
              <div className="bg-neutral-900/90 rounded-3xl border border-neutral-800 p-12 text-center my-4">
                <Wrench size={48} className="mx-auto text-neutral-600 mb-3" />
                <h3 className="text-base font-bold text-white">
                  {isKg ? 'Тетиктер табылган жок' : 'По вашему запросу деталей не найдено'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  {isKg
                    ? 'Фильтрлерди бошотуп көрүңүз же Кудайберген базарындагы консультантка WhatsApp аркылуу кайрылыңыз.'
                    : 'Попробуйте сбросить фильтры или напишите на авторынок Кудайберген для индивидуального поиска.'}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {isKg ? 'Фильтрлерди тазалоо' : 'Сбросить все фильтры'}
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              
              /* 1. GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {shownParts.map((part) => {
                  const priceUsd = Math.round(part.priceKgs / USD_TO_KGS_RATE);
                  const isCopied = copiedPartNumber === part.partNumber;

                  return (
                    <div
                      key={part.id}
                      className="bg-neutral-900/95 border border-neutral-800 hover:border-neutral-700 rounded-3xl p-4 flex flex-col justify-between transition-all group shadow-xl hover:shadow-2xl relative overflow-hidden"
                    >
                      <div>
                        {/* Image & Badges */}
                        <div
                          className="relative h-44 rounded-2xl overflow-hidden mb-3 bg-neutral-950 cursor-pointer"
                          onClick={() => setSelectedPartForDetail(part)}
                        >
                          <img
                            src={part.image}
                            alt={part.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePartFavorite(part.id); }}
                            className="absolute bottom-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center cursor-pointer"
                            title={favoriteIds.includes(part.id) ? 'Удалить из избранного' : 'В избранное'}
                          >
                            <Heart size={15} className={favoriteIds.includes(part.id) ? 'fill-red-500 text-red-500' : 'text-white'} />
                          </button>

                          {/* Condition badge */}
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-neutral-950/85 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-neutral-700">
                            {part.condition}
                          </span>

                          {/* Compression video badge */}
                          {part.hasCompressionVideo && (
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-red-950/90 backdrop-blur-md text-red-300 text-[10px] font-bold border border-red-700 flex items-center gap-1 shadow-sm">
                              <Video size={11} className="text-red-400" />
                              <span>{part.compressionBar ? `${part.compressionBar} bar ` : ''}видео</span>
                            </span>
                          )}

                          {/* Location badge */}
                          <span className="absolute bottom-2.5 left-2.5 bg-neutral-950/90 backdrop-blur-md text-neutral-200 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-neutral-800 flex items-center gap-1">
                            <MapPin size={11} className="text-red-400" />
                            <span>{part.market}: {part.containerInfo || part.storeLocation}</span>
                          </span>

                          {/* Hover hint */}
                          <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <div className="px-3 py-1.5 rounded-xl bg-neutral-900/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                              <Eye size={14} />
                              <span>{isKg ? 'Паспорт жана видео' : 'Паспорт & видео'}</span>
                            </div>
                          </div>
                        </div>

                        {/* OEM Part Number Bar */}
                        <div className="flex items-center justify-between bg-neutral-950/90 px-3 py-1.5 rounded-xl border border-neutral-800 mb-2">
                          <span className="text-[10px] text-neutral-400">OEM Артикул:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyOEM(part.partNumber);
                            }}
                            className="font-mono font-bold text-xs text-amber-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                            title="Скопировать OEM артикул"
                          >
                            <span>{part.partNumber}</span>
                            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="opacity-70" />}
                          </button>
                        </div>

                        {/* Title */}
                        <h3
                          onClick={() => setSelectedPartForDetail(part)}
                          className="font-bold text-sm text-white line-clamp-2 mb-1 group-hover:text-amber-400 transition-colors cursor-pointer leading-snug"
                        >
                          {part.title}
                        </h3>

                        {/* Compatibility */}
                        <div className="text-[11px] text-neutral-400 mb-1 truncate">
                          Шайкештик: <span className="text-neutral-200 font-semibold">{part.brand} {part.model}{part.generation ? ' (' + part.generation + ')' : ''}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 space-y-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            {partSellerType(part) === 'legal' ? <Building size={11} className="shrink-0" /> : <User size={11} className="shrink-0" />}
                            <span className="truncate">{part.storeName || part.companyName || (isKg ? 'Көрсөтүлгөн эмес' : 'Не указано')}</span>
                            <span className="text-neutral-600">·</span>
                            <span className="shrink-0">{part.storeCity || part.city || (isKg ? 'Көрсөтүлгөн эмес' : 'Не указано')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Truck size={11} className="shrink-0" />
                            <span>
                              {part.deliveryAvailable ? (isKg ? 'Жеткирүү бар' : 'Есть доставка') : (isKg ? 'Жеткирүү жок' : 'Без доставки')}
                              {part.pickupAvailable !== false ? (isKg ? ' · өзү алып кетүү' : ' · самовывоз') : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="shrink-0" />
                            <span>{isKg ? 'Жарыяланды:' : 'Опубликовано:'} {fmtPartDate(part.createdAt) || (isKg ? 'Көрсөтүлгөн эмес' : 'Не указано')}</span>
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM: PRICE, STOCK & ACTIONS */}
                      <div className="pt-3 border-t border-neutral-800/80">
                        <div className="flex items-baseline justify-between mb-3">
                          <div>
                            <div className="text-lg font-black text-emerald-400 leading-none">
                              {part.priceKgs.toLocaleString()} сом
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-1">
                              ~ ${priceUsd.toLocaleString()} USD
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] bg-neutral-950 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded-md font-bold block mb-0.5">
                              {part.stockStatus} ({part.stockCount} шт.)
                            </span>
                            {part.views ? (
                              <span className="text-[9px] text-neutral-500 font-mono">👁️ {part.views}</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            onClick={() => setSelectedPartForDetail(part)}
                            className="py-2.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Паспорт</span>
                          </button>

                          <button
                            onClick={() => setOrderedPart(part)}
                            className="py-2.5 px-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ShoppingBag size={13} />
                            <span>Купить</span>
                          </button>

                          <button
                            onClick={() => handleWhatsAppOrder(part)}
                            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Написать продавцу в WhatsApp"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </button>
                          <a
                            href={'tel:+' + part.sellerPhone.replace(/[^0-9]/g, '')}
                            className="py-2.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                            title="Позвонить продавцу"
                          >
                            <Phone size={13} />
                            <span>{isKg ? 'Чалуу' : 'Звонок'}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (

              /* 2. DROM-STYLE ROWS VIEW (Compact, scan-friendly rows) */
              <div className="space-y-3">
                {shownParts.map((part) => {
                  const priceUsd = Math.round(part.priceKgs / USD_TO_KGS_RATE);
                  const isPhoneRevealed = !!revealedPhones[part.id];
                  const cleanPhone = part.sellerPhone.replace(/[^0-9]/g, '');

                  return (
                    <div
                      key={part.id}
                      className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 group hover:shadow-lg"
                    >
                      {/* Left: Thumbnail & Main Specs */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Thumbnail */}
                        <div
                          onClick={() => setSelectedPartForDetail(part)}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-950 shrink-0 cursor-pointer relative"
                        >
                          <img src={part.image} alt={part.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          {part.hasCompressionVideo && (
                            <span className="absolute bottom-1 right-1 bg-red-600 text-white p-0.5 rounded text-[9px]">
                              <Video size={10} />
                            </span>
                          )}
                        </div>

                        {/* Text Information */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-[11px] mb-1">
                            <span className="font-mono text-amber-400 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                              {part.partNumber}
                            </span>
                            <span className="text-neutral-400">
                              {part.brand} {part.model} {part.generation ? `(${part.generation})` : ''}
                            </span>
                            <span className="text-neutral-400">•</span>
                            <span className="text-neutral-400">{part.category}</span>
                            <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                              {part.condition}
                            </span>
                          </div>

                          <h3
                            onClick={() => setSelectedPartForDetail(part)}
                            className="font-bold text-sm text-white line-clamp-1 group-hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            {part.title}
                          </h3>

                          {/* Market and views snippet */}
                          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-neutral-300">
                              <MapPin size={12} className="text-red-400" />
                              <span>{part.market}: {part.containerInfo || part.storeLocation}</span>
                            </span>
                            <span>•</span>
                            <span className="text-neutral-500 font-mono">👁️ {part.views || 215}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">{part.stockStatus} ({part.stockCount} шт.)</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Quick Action Buttons */}
                      <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                        <div className="text-left md:text-right">
                          <div className="text-lg font-black text-emerald-400">
                            {part.priceKgs.toLocaleString()} сом
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            ~ ${priceUsd} USD
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Click to reveal phone (Drom feature) */}
                          {!isPhoneRevealed ? (
                            <button
                              onClick={() => toggleRevealPhone(part.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Показать номер продавца"
                            >
                              <Phone size={13} className="text-emerald-400" />
                              <span>{isKg ? 'Телефон' : 'Показать тел.'}</span>
                            </button>
                          ) : (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs flex items-center gap-1 transition-colors"
                            >
                              <Phone size={13} />
                              <span>{part.sellerPhone}</span>
                            </a>
                          )}

                          <button
                            onClick={() => setSelectedPartForDetail(part)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye size={13} />
                            <span>Паспорт</span>
                          </button>

                          <button
                            onClick={() => setOrderedPart(part)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-md"
                          >
                            <ShoppingBag size={13} />
                            <span>Заказ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            )}

            {filteredParts.length > visibleCount && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold cursor-pointer"
                >
                  {isKg ? "Дагы көрсөтүү" : "Показать ещё"} ({filteredParts.length - visibleCount})
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 5. DETAILED PART MODAL WITH REVEAL PHONE, COMPATIBILITY, AND SIMILAR PARTS */}
      {selectedPartForDetail && (
        <PartDetailModal
          part={selectedPartForDetail}
          isOpen={!!selectedPartForDetail}
          onClose={() => setSelectedPartForDetail(null)}
          currency={currency}
          language={language}
          allParts={partsList}
          onSelectPart={(part) => {
            setSelectedPartForDetail(part);
          }}
          onOpenOrder={(part) => {
            setSelectedPartForDetail(null);
            setOrderedPart(part);
          }}
        />
      )}

      {/* 4. BUYER ORDER MODAL */}
      {orderedPart && (
        <PartOrderModal
          part={orderedPart}
          onClose={() => setOrderedPart(null)}
          currency={currency}
          language={language}
          onOrderSuccess={(order: BuyerOrder) => {
            if (onOrderCreated) onOrderCreated(order);
            handleStockUpdate(orderedPart.id, -1);
            showToast(`Заказ #${order.orderNumber} оформлен! Статус доступен в Личном кабинете.`);
            setOrderedPart(null);
          }}
          onNavigateToCabinet={onNavigateToCabinet}
        />
      )}

      {/* 2 & 3. SELLER PORTAL & PART UPLOAD MODAL */}
      <PartSellerPortalModal
        isOpen={isSellerPortalOpen}
        onClose={() => setIsSellerPortalOpen(false)}
        language={language}
        currency={currency}
        existingParts={partsList}
        onUpdatePartStock={handleStockUpdate}
      />

      {/* ALL BRANDS MODAL */}
      <AllBrandsModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        selectedBrand={selectedBrand}
        onSelectBrand={(b) => {
          setSelectedBrand(b);
          setSelectedModel('');
          setIsBrandModalOpen(false);
        }}
        title={isKg ? 'Авто маркасын тандоо' : 'Выбор марки авто для поиска запчастей'}
      />
    </div>
  );
};
