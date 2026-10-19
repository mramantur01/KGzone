import React, { useState } from 'react';
import { AutoPartItem, Currency, Language } from '../../types/car';
import { submitPart } from '../../api/parts';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import {
  X,
  Plus,
  Store,
  Building2,
  User,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Package,
  Layers,
  MapPin,
  Phone,
  MessageCircle,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  Trash2,
  Edit3,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface PartSellerOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  partTitle: string;
  partNumber: string;
  partId: string;
  quantity: number;
  totalKgs: number;
  deliveryType: 'Самовывоз из контейнера' | 'Яндекс Доставка Бишкек' | 'Попутный бусик в регионы';
  deliveryCity?: string;
  status: 'Новый' | 'Подтвержден' | 'Готов к выдаче в контейнере' | 'В доставке' | 'Завершен / Оплачен' | 'Отменен';
}

interface PartSellerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  existingParts: AutoPartItem[];
  onUpdatePartStock: (partId: string, delta: number) => void;
}

export const PartSellerPortalModal: React.FC<PartSellerPortalModalProps> = ({
  isOpen,
  onClose,
  language,
  currency,
  existingParts,
  onUpdatePartStock,
}) => {
  if (!isOpen) return null;

  const isKg = language === 'kg';
  const [activeTab, setActiveTab] = useState<'upload' | 'cabinet' | 'orders'>('upload');

  // --- TAB 1: UPLOAD PART STATE ---
  const [partTitle, setPartTitle] = useState('');
  const [partCategory, setPartCategory] = useState('Двигатель и элементы двигателя');
  const [partBrand, setPartBrand] = useState('Toyota');
  const [partModel, setPartModel] = useState('Camry');
  const [partGeneration, setPartGeneration] = useState('XV50, XV70 (2011-2022)');
  const [partBodyCode, setPartBodyCode] = useState('ASV50, GSV70');
  const [partOEM, setPartOEM] = useState('');
  const [partPriceKgs, setPartPriceKgs] = useState<number>(18000);
  const [partCondition, setPartCondition] = useState<any>('Б/у (Контрактный)');
  const [stockStatus, setStockStatus] = useState<any>('В наличии');
  const [stockCount, setStockCount] = useState<number>(3);
  const [warrantyDays, setWarrantyDays] = useState<number>(14);
  const [countryOfImport, setCountryOfImport] = useState('Япония (Контракт)');
  const [description, setDescription] = useState('');
  const [hasCompressionVideo, setHasCompressionVideo] = useState(true);
  const [compressionBar, setCompressionBar] = useState(12.8);
  const [videoTitle, setVideoTitle] = useState('Замер компрессии цилиндров (12.8-13.0 bar)');
  const [selectedPhotoSample, setSelectedPhotoSample] = useState(
    '/parts/wm-03.jpg'
  );

  // Compatibility row state
  const [compatList, setCompatList] = useState([
    { brand: 'Toyota', model: 'Camry', bodyCode: 'XV50, XV70', years: '2011-2022', engine: '2.5L 2AR-FE' },
    { brand: 'Toyota', model: 'Alphard', bodyCode: 'AGH30', years: '2015-2023', engine: '2.5L 2AR-FE' },
    { brand: 'Toyota', model: 'RAV4', bodyCode: 'ASA44', years: '2013-2019', engine: '2.5L 2AR-FE' },
  ]);

  // --- TAB 2: SELLER & CONTAINER CABINET STATE ---
  const [sellerType, setSellerType] = useState<'legal' | 'individual'>('legal');
  const [companyName, setCompanyName] = useState('ОсОО «Кудайберген Моторс KG»');
  const [inn, setInn] = useState('01205198910245');
  const [market, setMarket] = useState('Кудайберген');
  const [containerInfo, setContainerInfo] = useState('Ряд 7, Контейнер 18-19');
  const [directionsGuide, setDirectionsGuide] = useState('Вход от ул. Патриса Лумумбы, второй проход налево от мечети, ориентир Japan Motors');
  const [phone, setPhone] = useState('+996 555 777 999');
  const [whatsapp, setWhatsapp] = useState('996555777999');
  const [mbankRequisites, setMbankRequisites] = useState('+996 555 777 999 (MBANK)');
  const [isCabinetSaved, setIsCabinetSaved] = useState(false);

  // --- TAB 3: SELLER ORDERS STATE ---
  const [sellerOrders, setSellerOrders] = useState<PartSellerOrder[]>([
    {
      id: 'ord-s-1',
      orderNumber: 'KG-PART-8412',
      date: 'Сегодня, 14:20',
      customerName: 'Азамат Б.',
      customerPhone: '+996 700 123 456',
      partTitle: 'Двигатель 2.5 2AR-FE в сборе с навесным (Контрактный из Японии)',
      partNumber: '2AR-FE-JPN-48K',
      partId: 'part-3',
      quantity: 1,
      totalKgs: 118000,
      deliveryType: 'Самовывоз из контейнера',
      status: 'Готов к выдаче в контейнере',
    },
    {
      id: 'ord-s-2',
      orderNumber: 'KG-PART-7921',
      date: 'Сегодня, 11:05',
      customerName: 'Эркин Т.',
      customerPhone: '+996 772 888 111',
      partTitle: 'Фара передняя левая Full LED Toyota Camry 70',
      partNumber: '81185-33D30',
      partId: 'part-1',
      quantity: 1,
      totalKgs: 34000,
      deliveryType: 'Попутный бусик в регионы',
      deliveryCity: 'г. Ош (Западный автовокзал)',
      status: 'В доставке',
    },
    {
      id: 'ord-s-3',
      orderNumber: 'KG-PART-6540',
      date: 'Вчера, 16:45',
      customerName: 'Данияр К.',
      customerPhone: '+996 550 999 222',
      partTitle: 'Комплект передних тормозных колодок ADVICS Toyota Camry',
      partNumber: '04465-33471',
      partId: 'part-2',
      quantity: 1,
      totalKgs: 3800,
      deliveryType: 'Яндекс Доставка Бишкек',
      status: 'Завершен / Оплачен',
    },
  ]);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Categories list
  const categoriesList = [
    'Двигатель и элементы двигателя',
    'Трансмиссия',
    'Ходовая часть',
    'Детали кузова',
    'Оптика',
    'Тормозная система',
    'Рулевое управление',
    'Система отопления и кондиционирования',
    'Электрика',
    'Стекла и зеркала',
    'Салон и безопасность',
  ];

  // Markets list
  const marketsList = [
    'Кудайберген',
    'Дордой Моторс',
    'РИОМ Авто',
    'Баят',
    'Жапалак Ош',
    'Авторазбор Бишкек',
  ];

  // Pre-configured high quality photos of parts
  const photoPresets = [
    { label: 'Двигатель / КПП', url: '/parts/wm-03.jpg' },
    { label: 'Оптика / Фары', url: 'https://images.unsplash.com/=format&fit=crop&w=600&q=80' },
    { label: 'Тормоза / Колодки', url: 'https://images.unsplash.com/=format&fit=crop&w=600&q=80' },
    { label: 'Подвеска / Рычаги', url: 'https://images.unsplash.com/=format&fit=crop&w=600&q=80' },
    { label: 'Кузов / Бампер', url: '/parts/wm-01.jpg' },
  ];

  // SUBMIT NEW PART
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partTitle.trim() || !partOEM.trim()) {
      showNotification('Пожалуйста, заполните название и OEM артикул');
      return;
    }

    const newPart: AutoPartItem = {
      id: `part-${Date.now()}`,
      title: partTitle.trim(),
      category: partCategory,
      brand: partBrand,
      model: partModel,
      generation: partGeneration,
      bodyCode: partBodyCode,
      partNumber: partOEM.trim().toUpperCase(),
      priceKgs: Number(partPriceKgs),
      condition: partCondition,
      inStock: stockCount > 0,
      stockCount: Number(stockCount),
      stockStatus: stockStatus,
      market: market as any,
      storeName: sellerType === 'legal' ? companyName : 'Частный разбор',
      storeLocation: containerInfo,
      storeCity: market.includes('Ош') ? 'Ош' : 'Бишкек',
      sellerPhone: phone,
      sellerWhatsapp: whatsapp,
      image: selectedPhotoSample,
      images: [selectedPhotoSample],
      videoUrl: hasCompressionVideo ? 'https://example.com/video-compression' : undefined,
      videoTitle: videoTitle,
      hasCompressionVideo: hasCompressionVideo,
      compressionBar: compressionBar,
      compatibility: compatList,
      sellerType: sellerType,
      companyName: companyName,
      inn: inn,
      containerInfo: containerInfo,
      directionsGuide: directionsGuide,
      paymentMethods: ['MBANK', 'О!Деньги', 'Элкарт', 'Наличные в боксе'],
      countryOfImport: countryOfImport,
      warrantyDays: Number(warrantyDays),
      description: description.trim() || `Оригинальная автозапчасть в отличном состоянии. Проверена на стенде. Гарантия ${warrantyDays} дней.`,
      deliveryAvailable: true,
    };

    // Goes to the moderation queue; it appears in the catalog once an admin approves it
    setIsSubmitting(true);
    try {
      await submitPart(newPart);
    } catch (err: any) {
      showNotification(err?.message || 'Не удалось отправить заявку. Попробуйте ещё раз.');
      return;
    } finally {
      setIsSubmitting(false);
    }
    showNotification(`Запчасть «${newPart.title}» отправлена на модерацию. Она появится в каталоге после проверки администратором.`);
    
    // reset form
    setPartTitle('');
    setPartOEM('');
    setDescription('');
  };

  // CHANGE STATUS OF AN ORDER (Requirement 4)
  const handleOrderStatusChange = (orderId: string, newStatus: PartSellerOrder['status']) => {
    setSellerOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          // If status becomes "Завершен / Оплачен", trigger stock decrement
          if (newStatus === 'Завершен / Оплачен' && order.status !== 'Завершен / Оплачен') {
            onUpdatePartStock(order.partId, -order.quantity);
            showNotification(`Заказ #${order.orderNumber} выполнен: со склада списано ${order.quantity} шт.`);
          }
          return { ...order, status: newStatus };
        }
        return order;
      })
    );
  };

  // Analytics computation
  const totalRevenue = sellerOrders
    .filter((o) => o.status === 'Завершен / Оплачен')
    .reduce((sum, o) => sum + o.totalKgs, 0);

  const activeOrdersCount = sellerOrders.filter(
    (o) => o.status !== 'Завершен / Оплачен' && o.status !== 'Отменен'
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-white flex flex-col max-h-[92vh]">
        
        {/* Top Gold-Red Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600 shrink-0" />

        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Store size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
                {isKg ? 'Сатуучунун кабинети • Контейнер KGzone' : 'Кабинет продавца • Склады и Контейнеры KGzone'}
              </span>
              <div className="text-xs text-neutral-400">
                {sellerType === 'legal' ? companyName : 'Частный продавец'} • {market} ({containerInfo})
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs (Загрузка детали / Профиль контейнера / Сделки и заказы) */}
        <div className="px-5 pt-3 pb-2 border-b border-neutral-800 flex items-center gap-2 flex-wrap bg-neutral-900/40 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Plus size={15} />
            <span>{isKg ? '+ Тетик жүктөө (Сүрөт/Видео)' : '+ Загрузка автозапчасти (Фото/Видео)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('cabinet')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cabinet'
                ? 'bg-amber-500 text-neutral-950 font-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Building2 size={15} />
            <span>{isKg ? 'Профиль & Контейнер (ИНН)' : 'Профиль контейнера & ИНН (0% комиссия)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Package size={15} />
            <span>{isKg ? 'Буйрутмалар & Склад' : 'Сделки & Заказы со склада'}</span>
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                {activeOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* Toast Alert */}
        {notificationMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg">
            <CheckCircle2 size={16} />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* ======================================================== */}
          {/* TAB 1: UPLOAD PART WITH PHOTO, VIDEO, COMPATIBILITY      */}
          {/* ======================================================== */}
          {activeTab === 'upload' && (
            <form onSubmit={handleCreatePart} className="space-y-6">
              
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {isKg ? 'Жаңы автотетик кошуу' : 'Форма публикации автозапчасти'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {isKg
                      ? 'Кудайберген, Дордой-Авто же башка базардагы контейнериңизден түз сатуу'
                      : 'Прямая публикация в каталог KGzone с видео замера компрессии, OEM номером и гарантией'}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold">
                  0% {isKg ? 'комиссия' : 'комиссии за размещение'}
                </div>
              </div>

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Part Name */}
                <div className="md:col-span-2">
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Тетиктин аталышы *' : 'Название автозапчасти *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Двигатель 2.5 2AR-FE в сборе с навесным (Контрактный из Японии)"
                    value={partTitle}
                    onChange={(e) => setPartTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-medium"
                  />
                </div>

                {/* Category (11 categories) */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Категория *' : 'Категория запчасти *'}
                  </label>
                  <select
                    value={partCategory}
                    onChange={(e) => setPartCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Абалы *' : 'Состояние детали *'}
                  </label>
                  <select
                    value={partCondition}
                    onChange={(e) => setPartCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  >
                    <option value="Новый (Оригинал)">Новая (Оригинал)</option>
                    <option value="Б/у (Контрактный)">Б/У контрактная из Японии/Кореи</option>
                    <option value="Дубликат (OEM)">Новая качественный OEM дубликат</option>
                    <option value="Б/У с разбора">Б/У с местного авторазбора</option>
                  </select>
                </div>

                {/* Brand & Model */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Авто маркасы' : 'Марка автомобиля'}
                  </label>
                  <input
                    type="text"
                    value={partBrand}
                    onChange={(e) => setPartBrand(e.target.value)}
                    placeholder="Toyota, Honda, Lexus, Mercedes, BMW..."
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Модель жана муун' : 'Модель и поколение'}
                  </label>
                  <input
                    type="text"
                    value={partModel}
                    onChange={(e) => setPartModel(e.target.value)}
                    placeholder="Camry XV50/70, Fit GE8, RX350..."
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                {/* OEM and Country */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'OEM / Каталогдук артикул *' : 'OEM / Каталожный артикул *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: 2AR-FE-JPN-48K или 81185-33D30"
                    value={partOEM}
                    onChange={(e) => setPartOEM(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Алып келинген өлкө' : 'Страна ввоза / Поставка'}
                  </label>
                  <select
                    value={countryOfImport}
                    onChange={(e) => setCountryOfImport(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  >
                    <option value="Япония (Контракт)">Япония (Контрактный распил)</option>
                    <option value="Южная Корея">Южная Корея (Оригинал)</option>
                    <option value="ОАЭ (Дубай)">ОАЭ / Дубай</option>
                    <option value="Германия">Германия / Европа</option>
                    <option value="Китай (Завод)">Китай (Оригинал с завода)</option>
                  </select>
                </div>

                {/* Price in KGS & USD auto convert */}
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-300 font-semibold">
                      {isKg ? 'Баасы (сом менен) *' : 'Стоимость в сомах (KGS) *'}
                    </label>
                    <span className="text-emerald-400 font-bold">
                      ~ ${Math.round(partPriceKgs / USD_TO_KGS_RATE)} USD
                    </span>
                  </div>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={partPriceKgs}
                    onChange={(e) => setPartPriceKgs(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-black text-base text-emerald-400"
                  />
                </div>

                {/* Stock Control (+ / -) */}
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-300 font-semibold">
                      {isKg ? 'Складдагы калдык (даана) *' : 'Количество на складе (шт.) *'}
                    </label>
                    <span className="text-amber-400 font-bold">{stockStatus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStockCount((prev) => Math.max(0, prev - 1))}
                      className="w-10 h-10 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-black text-lg flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={stockCount}
                      onChange={(e) => setStockCount(Number(e.target.value))}
                      className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-center font-bold text-base text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setStockCount((prev) => prev + 1)}
                      className="w-10 h-10 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-black text-lg flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* VIDEO MATERIALS & COMPRESSION INSPECTION (Requirement 3) */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video size={18} className="text-amber-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {isKg ? 'Видео-материалдар жана компрессия өлчөө' : 'Загрузка видеоматериалов и замер компрессии'}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {isKg
                          ? 'Стендде текшерүү же манометр менен компрессия өлчөө видеосу кардарлардын ишенимин 3 эсе жогорулатат'
                          : 'Видео замера компрессии цилиндров и тест работы на стенде привлекают на 300% больше покупателей'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={hasCompressionVideo}
                      onChange={(e) => setHasCompressionVideo(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-0"
                    />
                    <span>{isKg ? 'Видео бар' : 'Есть видео замера'}</span>
                  </label>
                </div>

                {hasCompressionVideo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <label className="block text-neutral-300 font-semibold mb-1">
                        {isKg ? 'Видеонун аталышы' : 'Название видеоролика'}
                      </label>
                      <input
                        type="text"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-300 font-semibold mb-1">
                        {isKg ? 'Орточо компрессия (bar)' : 'Средний замер компрессии (bar)'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={compressionBar}
                        onChange={(e) => setCompressionBar(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PHOTO PRESET SELECTOR (Requirement 3) */}
              <div className="space-y-2">
                <label className="block text-neutral-300 font-semibold text-xs">
                  {isKg ? 'Сүрөттү тандоо (үлгү же жеке сүрөт)' : 'Фотографии детали (готовые образцы или ссылка)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {photoPresets.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhotoSample(preset.url)}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedPhotoSample === preset.url
                          ? 'border-red-500 ring-2 ring-red-500/40'
                          : 'border-neutral-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] text-center font-bold text-white truncate">
                        {preset.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* COMPATIBILITY TABLE (Requirement 3 & 5) */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">
                    {isKg ? 'Шайкештик таблицасы (кайсы унааларга туура келет)' : 'Таблица совместимости с машинами'}
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setCompatList([
                        ...compatList,
                        { brand: 'Toyota', model: 'Harrier', bodyCode: 'ACU30', years: '2003-2012', engine: '2.4L' },
                      ])
                    }
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>{isKg ? '+ Сап кошуу' : '+ Добавить модель'}</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {compatList.map((c, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800 items-center">
                      <input
                        type="text"
                        value={c.brand + ' ' + c.model}
                        onChange={(e) => {
                          const updated = [...compatList];
                          updated[i].model = e.target.value;
                          setCompatList(updated);
                        }}
                        className="bg-neutral-900 px-2 py-1 rounded text-white"
                        placeholder="Марка & Модель"
                      />
                      <input
                        type="text"
                        value={c.bodyCode}
                        onChange={(e) => {
                          const updated = [...compatList];
                          updated[i].bodyCode = e.target.value;
                          setCompatList(updated);
                        }}
                        className="bg-neutral-900 px-2 py-1 rounded text-white"
                        placeholder="Кузов"
                      />
                      <input
                        type="text"
                        value={c.years}
                        onChange={(e) => {
                          const updated = [...compatList];
                          updated[i].years = e.target.value;
                          setCompatList(updated);
                        }}
                        className="bg-neutral-900 px-2 py-1 rounded text-white"
                        placeholder="Годы"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={c.engine}
                          onChange={(e) => {
                            const updated = [...compatList];
                            updated[i].engine = e.target.value;
                            setCompatList(updated);
                          }}
                          className="bg-neutral-900 px-2 py-1 rounded text-white flex-1"
                          placeholder="Мотор"
                        />
                        <button
                          type="button"
                          onClick={() => setCompatList(compatList.filter((_, idx) => idx !== i))}
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
                >
                  {isKg ? 'Жокко чыгаруу' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? 'Отправка...' : 'Отправить на модерацию'}</span>
                </button>
              </div>

            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SELLER & CONTAINER CABINET (Requirement 2)         */}
          {/* ======================================================== */}
          {activeTab === 'cabinet' && (
            <div className="space-y-6">
              
              {/* Type Switcher: Legal vs Individual */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-neutral-900 rounded-2xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSellerType('legal')}
                  className={`p-3 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                    sellerType === 'legal'
                      ? 'bg-neutral-800 border border-amber-500/50 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Building2 size={20} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm">
                      {isKg ? 'Юридикалык жак (ОсОО / ИП)' : 'Юридическое лицо (ОсОО / ИП)'}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {isKg ? '14-орундуу ИНН, автобазар жана контейнер' : '14-значный ИНН КР, привязка к контейнеру'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSellerType('individual')}
                  className={`p-3 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                    sellerType === 'individual'
                      ? 'bg-neutral-800 border border-amber-500/50 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <User size={20} className="text-sky-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm">
                      {isKg ? 'Жеке жак (Авторазбор)' : 'Частное лицо (Авторазбор)'}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {isKg ? 'Жеке сатуучу, гараждан алып кетүү' : 'Продажа с авто, гараж, самовывоз'}
                    </div>
                  </div>
                </button>
              </div>

              {/* Form container info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Company Name */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {sellerType === 'legal' ? (isKg ? 'Ишкананын аталышы (ОсОО / ИП) *' : 'Название компании (ОсОО / ИП) *') : (isKg ? 'Сатуучунун аты же авторазбор *' : 'Имя продавца или авторазбора *')}
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-bold"
                  />
                </div>

                {/* INN (14 digits) */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Кыргызстандын 14-орундуу ИННи *' : '14-значный ИНН Кыргызстана *'}
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="01205198910245"
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-amber-400 font-mono font-bold"
                  />
                </div>

                {/* Market selection */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Автобазарга байлоо *' : 'Привязка к авторынку Кыргызстана *'}
                  </label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  >
                    {marketsList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Container / Row */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Катар жана контейнердин так номери *' : 'Точный номер контейнера / ряда *'}
                  </label>
                  <input
                    type="text"
                    value={containerInfo}
                    onChange={(e) => setContainerInfo(e.target.value)}
                    placeholder="Ряд 7, Контейнер 18-19"
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-bold"
                  />
                </div>

                {/* Walking directions */}
                <div className="md:col-span-2">
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Кантип баруу керек (кардарга ориентирлер)' : 'Ориентиры как пройти к контейнеру для покупателей'}
                  </label>
                  <input
                    type="text"
                    value={directionsGuide}
                    onChange={(e) => setDirectionsGuide(e.target.value)}
                    placeholder="Вход от ул. Патриса Лумумбы, второй проход налево от мечети..."
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                {/* Phone & WhatsApp */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Байланыш телефону *' : 'Телефон продавца *'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'WhatsApp номери *' : 'WhatsApp для быстрых заказов *'}
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-mono"
                  />
                </div>

                {/* Payment requisites (MBANK, O!Dengi, Elkart) */}
                <div className="md:col-span-2">
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Төлөм реквизиттери (MBANK, О!Деньги, Элкарт)' : 'Реквизиты оплаты (MBANK, О!Деньги, Элкарт, Наличные)'}
                  </label>
                  <input
                    type="text"
                    value={mbankRequisites}
                    onChange={(e) => setMbankRequisites(e.target.value)}
                    placeholder="+996 555 777 999 (MBANK / О!Деньги) или расчетный счет"
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-emerald-400 font-semibold"
                  />
                </div>
              </div>

              {/* Save Cabinet Profile */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>{isKg ? 'Маалыматтар мамлекеттик реестр боюнча сакталат' : 'Данные юридического лица верифицированы'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCabinetSaved(true);
                    showNotification('Профиль контейнера успешно обновлен и сохранен!');
                  }}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Check size={16} />
                  <span>{isKg ? 'Контейнерди сактоо' : 'Сохранить профиль фирмы / контейнера'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CONTROL OF PURCHASES & SALES (Requirement 4)      */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              
              {/* Seller Analytics Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Жалпы түшкөн киреше' : 'Выручка от заказов'}</span>
                  <div className="text-lg font-black text-emerald-400 mt-1">
                    {totalRevenue.toLocaleString()} сом
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Буйрутмалар саны' : 'Всего заказов'}</span>
                  <div className="text-lg font-black text-amber-400 mt-1">
                    {sellerOrders.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Складдагы калдык' : 'Остатки на складе'}</span>
                  <div className="text-lg font-black text-white mt-1">
                    {existingParts.reduce((acc, p) => acc + (p.stockCount || 0), 0)} шт.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Активдүү товарлар' : 'Активные детали'}</span>
                  <div className="text-lg font-black text-sky-400 mt-1">
                    {existingParts.length}
                  </div>
                </div>
              </div>

              {/* Orders Management List */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center justify-between">
                  <span>{isKg ? 'Контейнерге түшкөн буйрутмалар' : 'Управление заказами контейнера'}</span>
                  <span className="text-xs text-neutral-400 font-normal">
                    {isKg ? 'Статусту өзгөрткөндө складдан автоматтык түрдө кемийт' : 'При завершении заказа остатки списываются автоматически'}
                  </span>
                </h4>

                <div className="space-y-3">
                  {sellerOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-400">{ord.orderNumber}</span>
                          <span className="text-xs text-neutral-400">• {ord.date}</span>
                        </div>

                        {/* Order status dropdown */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400">{isKg ? 'Статус:' : 'Статус:'}</span>
                          <select
                            value={ord.status}
                            onChange={(e) => handleOrderStatusChange(ord.id, e.target.value as any)}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-300 cursor-pointer"
                          >
                            <option value="Новый">Новый</option>
                            <option value="Подтвержден">Подтвержден</option>
                            <option value="Готов к выдаче в контейнере">Готов к выдаче в контейнере</option>
                            <option value="В доставке">В доставке</option>
                            <option value="Завершен / Оплачен">Завершен / Оплачен</option>
                            <option value="Отменен">Отменен</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        <div className="sm:col-span-7">
                          <div className="font-bold text-white text-sm mb-1">{ord.partTitle}</div>
                          <div className="text-neutral-400">
                            OEM: <span className="font-mono text-neutral-300">{ord.partNumber}</span> • {ord.quantity} шт.
                          </div>
                          <div className="text-sky-400 mt-1 flex items-center gap-1">
                            <Store size={13} />
                            <span>{ord.deliveryType} {ord.deliveryCity ? `(${ord.deliveryCity})` : ''}</span>
                          </div>
                        </div>

                        <div className="sm:col-span-5 flex flex-col justify-between sm:text-right">
                          <div className="text-base font-black text-emerald-400">
                            {ord.totalKgs.toLocaleString()} сом
                          </div>
                          <div className="text-neutral-300 text-xs">
                            Клиент: <span className="font-semibold text-white">{ord.customerName}</span> ({ord.customerPhone})
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
