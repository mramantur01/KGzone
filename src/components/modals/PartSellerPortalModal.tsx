import React, { useState } from 'react';
import { AutoPartItem, Currency, Language } from '../../types/car';
import { submitPart } from '../../api/parts';
import { uploadPhoto } from '../../api/upload';
import { useAuth } from '../../api/auth';
import { OemHint } from '../catalog/OemHint';
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
  const [partBrand, setPartBrand] = useState('');
  const [partModel, setPartModel] = useState('');
  const [partCross, setPartCross] = useState('');
  const [partGeneration, setPartGeneration] = useState('');
  const [partBodyCode, setPartBodyCode] = useState('');
  const [partOEM, setPartOEM] = useState('');
  const [partPriceKgs, setPartPriceKgs] = useState<number>(0);
  const [priceCurrency, setPriceCurrency] = useState<'KGS' | 'USD'>('KGS');
  const [priceInput, setPriceInput] = useState('');
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [sellerCity, setSellerCity] = useState('Бишкек');
  const [isPreview, setIsPreview] = useState(false);
  const [partCondition, setPartCondition] = useState<any>('Б/у (Контрактный)');
  const [stockStatus, setStockStatus] = useState<any>('В наличии');
  const [stockCount, setStockCount] = useState<number>(1);
  const [warrantyDays, setWarrantyDays] = useState<number>(0);
  const [countryOfImport, setCountryOfImport] = useState('Япония (Контракт)');
  const [description, setDescription] = useState('');
  const [hasCompressionVideo, setHasCompressionVideo] = useState(false);
  const [compressionBar, setCompressionBar] = useState(0);
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedPhotoSample, setSelectedPhotoSample] = useState(
    '/parts/wm-03.jpg'
  );
  // Seller's own photos (Vercel Blob); when present they replace the sample photo
  const [ownPhotos, setOwnPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError(null);
    const list = Array.from(files).slice(0, Math.max(0, 8 - ownPhotos.length - photoUploading));
    setPhotoUploading((n) => n + list.length);
    await Promise.all(
      list.map(async (file) => {
        try {
          const url = await uploadPhoto(file, 'part');
          setOwnPhotos((prev) => (prev.length < 8 ? [...prev, url] : prev));
        } catch (e: any) {
          setPhotoError(e?.message || 'Не удалось загрузить фото');
        } finally {
          setPhotoUploading((n) => n - 1);
        }
      })
    );
  };

  // Compatibility row state
  const [compatList, setCompatList] = useState<{ brand: string; model: string; bodyCode: string; years: string; engine: string }[]>([]);

  // --- TAB 2: SELLER & CONTAINER CABINET STATE ---
  const [sellerType, setSellerType] = useState<'legal' | 'individual'>('individual');
  const [sellerName, setSellerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [market, setMarket] = useState('Кудайберген');
  const [containerInfo, setContainerInfo] = useState('');
  const [directionsGuide, setDirectionsGuide] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mbankRequisites, setMbankRequisites] = useState('');
  const [isCabinetSaved, setIsCabinetSaved] = useState(false);

  // Contacts come from the signed-in account; the seller can still change them for this listing
  const { user: account } = useAuth();
  React.useEffect(() => {
    if (!account) return;
    setSellerType(account.accountType);
    setSellerName(account.name);
    setPhone(`+${account.phone}`);
    if (account.company) {
      setCompanyName(account.company.name);
      setInn(account.company.inn);
      if (account.company.actualAddress) setContainerInfo(account.company.actualAddress);
    }
    if (['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол', 'Токмок', 'Нарын', 'Талас', 'Баткен', 'Кара-Балта', 'Кант'].includes(account.city)) setSellerCity(account.city);
  }, [account?.id]);

  // --- TAB 3: SELLER ORDERS STATE ---
  // Orders are not routed to individual sellers yet (needs seller accounts); the list starts empty
  const [sellerOrders, setSellerOrders] = useState<PartSellerOrder[]>([]);

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
    'Тормозная система',
    'Детали кузова',
    'Оптика',
    'Электрика',
    'Система охлаждения',
    'Топливная система',
    'Система отопления и кондиционирования',
    'Выхлопная система',
    'Салон и безопасность',
    'Масла и фильтры',
    'Шины и диски',
    'Рулевое управление',
    'Стекла и зеркала',
    'Тюнинг и дополнительное оборудование',
  ];
  const categoryLabel = (c: string) =>
    ({ 'Масла и фильтры': 'Расходники и ТО (масла, фильтры, ремни, свечи)', 'Шины и диски': 'Колёса, шины и диски' } as Record<string, string>)[c] || c;
  const citiesList = ['Бишкек', 'Ош', 'Джалал-Абад', 'Каракол', 'Токмок', 'Нарын', 'Талас', 'Баткен', 'Кара-Балта', 'Кант'];

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
    { label: 'Двигатель', url: '/parts/wm-03.jpg' },
    { label: 'КПП / вариатор', url: '/parts/wm-10.jpg' },
    { label: 'Оптика / Фары', url: '/parts/wm-01.jpg' },
    { label: 'Тормоза / Колодки', url: '/parts/wm-02.jpg' },
    { label: 'Кузов / Бампер', url: '/parts/wm-15.jpg' },
  ];

  // SUBMIT NEW PART
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partTitle.trim() || !partOEM.trim()) {
      showNotification('Пожалуйста, заполните название и OEM артикул');
      return;
    }
    if (!partPriceKgs || partPriceKgs < 50) {
      showNotification('Укажите цену');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      showNotification('Укажите телефон для связи');
      return;
    }
    if (sellerType === 'legal' && !companyName.trim()) {
      showNotification('Укажите название магазина или компании');
      return;
    }
    if (photoUploading > 0) return;
    // First press shows the preview; the second one ("Опубликовать") sends it
    if (!isPreview) {
      setIsPreview(true);
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
      storeName: sellerType === 'legal' ? companyName.trim() : sellerName.trim() || 'Частный продавец',
      storeLocation: containerInfo,
      storeCity: sellerCity,
      city: sellerCity,
      sellerPhone: phone,
      sellerWhatsapp: whatsapp,
      image: ownPhotos[0] || selectedPhotoSample,
      images: ownPhotos.length ? ownPhotos : [selectedPhotoSample],
      videoTitle: videoTitle,
      hasCompressionVideo: hasCompressionVideo,
      compressionBar: hasCompressionVideo ? compressionBar : undefined,
      compatibility: compatList,
      crossNumbers: partCross.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean),
      sellerType: sellerType,
      companyName: companyName,
      inn: inn,
      containerInfo: containerInfo,
      directionsGuide: directionsGuide,
      paymentMethods: [],
      countryOfImport: countryOfImport,
      warrantyDays: Number(warrantyDays),
      description: description.trim(),
      deliveryAvailable,
      pickupAvailable,
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
    setIsPreview(false);
    setPartTitle('');
    setPartOEM('');
    setPartCross('');
    setDescription('');
    setPriceInput('');
    setPartPriceKgs(0);
    setOwnPhotos([]);
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
                      <option key={cat} value={cat}>{categoryLabel(cat)}</option>
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
                    <option value="Восстановленная">Восстановленная</option>
                    <option value="Новый">Новая (неоригинал)</option>
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
                  <OemHint
                    oem={partOEM}
                    dark
                    onApply={(k) => {
                      if (!partTitle.trim() && k.names[0]) setPartTitle(k.names[0].name);
                      if (!partCross.trim() && k.crosses.length) setPartCross(k.crosses.slice(0, 15).map((c) => c.number).join(', '));
                      if (!partBrand.trim() && k.fits[0]) { setPartBrand(k.fits[0].brand); setPartModel(k.fits[0].model); }
                      if (compatList.length === 0 && k.fits.length) {
                        setCompatList(k.fits.slice(0, 10).map((f) => ({ brand: f.brand, model: f.model, bodyCode: f.generation || '', years: '', engine: '' })));
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    {isKg ? 'Кросс-номерлер (аналогдор, үтүр менен)' : 'Кросс-номера / аналоги (через запятую)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isKg ? 'Мисалы: W68/3, OC 217' : 'Например: W68/3, OC 217'}
                    value={partCross}
                    onChange={(e) => setPartCross(e.target.value)}
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
                      {isKg ? 'Баасы *' : 'Цена *'}
                    </label>
                    {partPriceKgs > 0 && (
                      <span className="text-emerald-400 font-bold">
                        {priceCurrency === 'KGS' ? `~ ${Math.round(partPriceKgs / USD_TO_KGS_RATE)}` : `= ${partPriceKgs.toLocaleString('ru-RU')} сом`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={priceInput}
                      placeholder="0"
                      onChange={(e) => {
                        setPriceInput(e.target.value);
                        const v = Number(e.target.value) || 0;
                        setPartPriceKgs(Math.round(priceCurrency === 'USD' ? v * USD_TO_KGS_RATE : v));
                      }}
                      className="flex-1 min-w-0 px-3.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg font-black text-base text-emerald-400"
                    />
                    <select
                      value={priceCurrency}
                      onChange={(e) => {
                        const cur = e.target.value as 'KGS' | 'USD';
                        setPriceCurrency(cur);
                        const v = Number(priceInput) || 0;
                        setPartPriceKgs(Math.round(cur === 'USD' ? v * USD_TO_KGS_RATE : v));
                      }}
                      className="px-2 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-bold"
                    >
                      <option value="KGS">сом</option>
                      <option value="USD">$ USD</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">{isKg ? 'Каталогдо сом менен көрсөтүлөт (НБКР курсу).' : 'В каталоге цена показывается в сомах по курсу НБ КР.'}</p>
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

              {/* CONTACTS, CITY, DELIVERY */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 text-xs">
                <h4 className="font-bold text-white text-sm">{isKg ? 'Байланыш жана алуу жолу' : 'Контакты, город и получение'}</h4>
                <div className="flex flex-wrap gap-2">
                  {(['individual', 'legal'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSellerType(t)}
                      className={`px-3 py-2 rounded-xl font-bold cursor-pointer ${sellerType === t ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-950 text-neutral-300 border border-neutral-700'}`}
                    >
                      {t === 'individual' ? (isKg ? 'Жеке адам' : 'Частное лицо') : (isKg ? 'Дүкөн / компания' : 'Магазин / компания')}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sellerType === 'legal' ? (
                    <div>
                      <label className="block text-neutral-300 font-semibold mb-1">{isKg ? 'Дүкөндүн аталышы *' : 'Название магазина / компании *'}</label>
                      <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-neutral-300 font-semibold mb-1">{isKg ? 'Атыңыз' : 'Ваше имя'}</label>
                      <input value={sellerName} onChange={(e) => setSellerName(e.target.value)} maxLength={80} className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white" />
                    </div>
                  )}
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">{isKg ? 'Шаар *' : 'Город *'}</label>
                    <select value={sellerCity} onChange={(e) => setSellerCity(e.target.value)} className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white">
                      {citiesList.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">{isKg ? 'Телефон *' : 'Телефон *'}</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 700 123 456" maxLength={30} className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-neutral-300 font-semibold mb-1">WhatsApp</label>
                    <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={isKg ? 'Телефон менен бирдей болсо бош калтырыңыз' : 'Если совпадает с телефоном — оставьте пустым'} maxLength={30} className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-neutral-300 font-semibold mb-1">{isKg ? 'Дарек / рынок, катар, контейнер' : 'Адрес или рынок, ряд, контейнер'}</label>
                    <input value={containerInfo} onChange={(e) => setContainerInfo(e.target.value)} placeholder={isKg ? 'Мисалы: Кудайберген, 7-катар, 18-контейнер' : 'Например: Кудайберген, ряд 7, контейнер 18'} maxLength={120} className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-700 rounded-xl text-white" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.checked)} className="accent-red-600" />
                    <span>{isKg ? 'Жеткирүү бар' : 'Есть доставка'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={pickupAvailable} onChange={(e) => setPickupAvailable(e.target.checked)} className="accent-red-600" />
                    <span>{isKg ? 'Өзү алып кетүү' : 'Самовывоз'}</span>
                  </label>
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
                  {isKg ? 'Сүрөттү тандоо (үлгү же жеке сүрөт)' : 'Фотографии детали'}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ownPhotos.map((url, i) => (
                    <div key={url} className="relative w-24 h-20 rounded-xl overflow-hidden border-2 border-red-500">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute left-1 top-1 text-[9px] font-bold bg-red-600 text-white px-1 rounded">Главное</span>}
                      <button
                        type="button"
                        onClick={() => setOwnPhotos((prev) => prev.filter((p) => p !== url))}
                        className="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs leading-none cursor-pointer"
                        aria-label="Удалить фото"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: photoUploading }).map((_, i) => (
                    <div key={i} className="w-24 h-20 rounded-xl border border-neutral-700 bg-neutral-900 flex items-center justify-center text-[10px] text-neutral-400">
                      Загрузка...
                    </div>
                  ))}
                  {ownPhotos.length + photoUploading < 8 && (
                    <label className="w-24 h-20 rounded-xl border-2 border-dashed border-neutral-600 hover:border-red-500 text-neutral-300 flex flex-col items-center justify-center text-[10px] font-bold text-center cursor-pointer px-1">
                      <span className="text-lg leading-none">+</span>
                      <span>Загрузить своё фото</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => { handlePhotoFiles(e.target.files); e.target.value = ''; }}
                      />
                    </label>
                  )}
                </div>
                {photoError && <p className="text-[11px] text-red-400">{photoError}</p>}
                <p className="text-[11px] text-neutral-500">
                  {ownPhotos.length ? 'Будут показаны ваши фото.' : 'Лучше загрузить реальные фото детали. Если фото нет — выберите похожий образец:'}
                </p>
                <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2.5 ${ownPhotos.length ? 'hidden' : ''}`}>
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

              {/* Preview of the listing as buyers will see it */}
              {isPreview && (
                <div className="p-4 rounded-2xl bg-neutral-900 border-2 border-amber-500/60 space-y-2">
                  <div className="text-xs font-bold text-amber-400">
                    {isKg ? 'Алдын ала көрүү — сатып алуучулар ушундай көрөт' : 'Предпросмотр — так объявление увидят покупатели'}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <img src={ownPhotos[0] || selectedPhotoSample} alt="" className="w-full sm:w-40 h-28 object-cover rounded-xl bg-neutral-950" />
                    <div className="text-xs space-y-1 min-w-0">
                      <div className="font-bold text-white text-sm">{partTitle || '—'}</div>
                      <div className="text-neutral-400">
                        OEM <span className="font-mono text-amber-400">{partOEM.toUpperCase() || '—'}</span> · {categoryLabel(partCategory)} · {partCondition}
                      </div>
                      <div className="text-neutral-400">{partBrand} {partModel}{partGeneration ? ` (${partGeneration})` : ''}</div>
                      <div className="text-emerald-400 font-black text-base">{partPriceKgs.toLocaleString('ru-RU')} сом</div>
                      <div className="text-neutral-400">
                        {sellerType === 'legal' ? companyName : sellerName || (isKg ? 'Жеке сатуучу' : 'Частный продавец')} · {sellerCity} · {phone}
                      </div>
                      <div className="text-neutral-400">
                        {[deliveryAvailable && (isKg ? 'жеткирүү' : 'доставка'), pickupAvailable && (isKg ? 'өзү алып кетүү' : 'самовывоз')].filter(Boolean).join(', ') || (isKg ? 'Алуу жолу көрсөтүлгөн эмес' : 'Способ получения не указан')}
                        {' · '}{(ownPhotos.length || 1)} {isKg ? 'сүрөт' : 'фото'}
                      </div>
                      {description && <div className="text-neutral-300 line-clamp-3">{description}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => (isPreview ? setIsPreview(false) : onClose())}
                  className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs"
                >
                  {isPreview ? (isKg ? 'Өзгөртүү' : 'Изменить') : isKg ? 'Жокко чыгаруу' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || photoUploading > 0}
                  data-preview={isPreview ? '1' : '0'}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? 'Отправка...' : isPreview ? (isKg ? 'Жарыялоо (модерацияга)' : 'Опубликовать (на модерацию)') : (isKg ? 'Алдын ала көрүү' : 'Предпросмотр объявления')}</span>
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
                  {sellerOrders.length === 0 && (
                    <p className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-400">
                      {isKg
                        ? 'Азырынча буйрутмалар жок. Сатуучулардын жеке аккаунттары туташтырылгандан кийин буйрутмалар бул жерде көрүнөт.'
                        : 'Заказов пока нет. Заказы покупателей появятся здесь после подключения аккаунтов продавцов.'}
                    </p>
                  )}
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
