import React, { useEffect, useState } from 'react';
import { recordView, recordContact } from '../../utils/viewHistory';
import { ReportListingButton } from '../common/ReportListingButton';
import { isDemoListing, DEMO_NOTICE } from '../../utils/demo';
import { SellerContactBlock } from '../chat/SellerContactBlock';
import { AutoPartItem, BuyerOrder, Currency, Language } from '../../types/car';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import {
  X,
  MapPin,
  Phone,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ZoomIn,
  Copy,
  Check,
  Building2,
  UserCheck,
  CreditCard,
  Gauge,
  Video,
  Image as ImageIcon,
  ChevronRight,
  Info,
  Car,
} from 'lucide-react';

interface PartDetailModalProps {
  part: AutoPartItem;
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  language: Language;
  onOpenOrder: (part: AutoPartItem) => void;
  allParts?: AutoPartItem[];
  onSelectPart?: (part: AutoPartItem) => void;
}

export const PartDetailModal: React.FC<PartDetailModalProps> = ({
  part,
  isOpen,
  onClose,
  currency,
  language,
  onOpenOrder,
  allParts = [],
  onSelectPart,
}) => {
  if (!isOpen || !part) return null;

  const isKg = language === 'kg';
  const priceSom = part.priceKgs;
  const priceUsd = Math.round(priceSom / USD_TO_KGS_RATE);

  // Gallery state
  const galleryImages = part.images && part.images.length > 0 ? part.images : [part.image];
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copiedOEM, setCopiedOEM] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState<boolean>(false);
  const viewsCount = part.views || 0;

  useEffect(() => {
    recordView({ kind: 'part', id: part.id, title: part.title, image: part.image, price: `${part.priceKgs.toLocaleString('ru-RU')} сом` });
    setSelectedImageIdx(0);
  }, [part.id]);

  const handleCopyOEM = () => {
    navigator.clipboard.writeText(part.partNumber);
    setCopiedOEM(true);
    setTimeout(() => setCopiedOEM(false), 2000);
  };

  const isDemo = isDemoListing(part.id);
  const handleRevealPhone = () => {
    if (isDemo) return;
    setIsPhoneRevealed(true);
    recordContact('part', part.id);
  };

  const cleanPhone = part.sellerPhone.replace(/[^0-9]/g, '');
  const sellerWhatsappNumber = part.sellerWhatsapp || cleanPhone;
  const whatsappUrl = `https://wa.me/${sellerWhatsappNumber}?text=${encodeURIComponent(
    `Саламатсызбы! KGzone сайтынан көрдүм: ${part.title} (OEM: ${part.partNumber}, Дүкөн: ${part.storeName}, Рынok: ${part.market}, Баасы: ${part.priceKgs} сом). Барбы? Контейнериңизге барып алып кетсем болобу?`
  )}`;

  // Other listings from the same seller (same phone number)
  const sellerDigits = cleanPhone.slice(-9);
  const sellerParts = allParts
    .filter((p) => p.id !== part.id && sellerDigits.length >= 6 && p.sellerPhone.replace(/[^0-9]/g, '').endsWith(sellerDigits))
    .slice(0, 4);

  // Similar parts: same category for the same car first, then same category, then same car
  const score = (p: AutoPartItem) =>
    (p.category === part.category ? 2 : 0) + (p.brand === part.brand && p.model === part.model ? 2 : p.brand === part.brand ? 1 : 0);
  const similarParts = allParts
    .filter((p) => p.id !== part.id && !sellerParts.includes(p) && score(p) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-white flex flex-col max-h-[92vh]">
        
        {/* Kyrgyz National Gold-Red Ribbon Header */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-700 via-amber-500 to-red-700 shrink-0" />

        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <KochkorMuyuzIcon size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
                {isKg ? 'KGzone • Автотетик паспорту' : 'KGzone • Паспорт автозапчасти'}
              </span>
              <div className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
                <span>{part.market}</span>
                <span>•</span>
                <span>{part.containerInfo || part.storeLocation}</span>
                <span>•</span>
                {viewsCount > 0 && <span className="text-neutral-400 font-mono">👁️ {viewsCount}</span>}
                <span>•</span>
                <span className="text-neutral-400">{part.createdAt || 'Сегодня'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Grid: Gallery & Media Left, Details Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT: MEDIA SECTION (PHOTOS & VIDEO) - 7 cols */}
            <div className="lg:col-span-7 space-y-3">
              
              {/* Media Switcher Tabs (Фотографии / Видео-осмотр) */}
              <div className="flex items-center justify-between bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs font-bold">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveMediaTab('photos')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMediaTab === 'photos'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon size={14} />
                    <span>{isKg ? 'Сүрөттөр' : 'Фотографии'} ({galleryImages.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveMediaTab('video')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMediaTab === 'video'
                        ? 'bg-amber-500 text-neutral-950 font-black shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Video size={14} />
                    <span>{isKg ? 'Видео-көрүү' : 'Видео-осмотр'}</span>
                    {part.hasCompressionVideo && (
                      <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 text-[10px] border border-red-700">
                        Компрессия
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-neutral-400 pr-2 hidden sm:block">
                  {part.condition}
                </div>
              </div>

              {/* MEDIA DISPLAY CONTAINER */}
              {activeMediaTab === 'photos' ? (
                <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-4/3 group">
                  <img
                    src={galleryImages[selectedImageIdx] || part.image}
                    alt={part.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102 cursor-pointer"
                    onClick={() => setIsZoomed(true)}
                  />

                  {/* Stock Pill Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-neutral-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{part.stockStatus} ({part.stockCount} шт.)</span>
                  </div>

                  {/* Zoom Hint Button */}
                  <button
                    onClick={() => setIsZoomed(true)}
                    className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-neutral-950/80 backdrop-blur-md border border-neutral-700 text-neutral-200 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <ZoomIn size={14} />
                    <span>{isKg ? 'Чоңойтуу' : 'Увеличить'}</span>
                  </button>
                </div>
              ) : (
                /* VIDEO PLAYER TAB */
                <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-amber-500/30 aspect-4/3 flex flex-col items-center justify-center p-6 text-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent z-10" />
                  
                  <img
                    src={part.image}
                    alt="video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 filter blur-xs"
                  />

                  <div className="relative z-20 max-w-md space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 transition-transform hover:scale-110 cursor-pointer"
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                    >
                      <Play size={28} className="translate-x-0.5 fill-current" />
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">
                        {part.videoTitle || (isKg ? 'Тетикти стендде текшерүү жана компрессия өлчөө' : 'Видео замера компрессии цилиндров и тест на стенде')}
                      </h4>
                      <p className="text-xs text-neutral-300 mt-1">
                        {isKg 
                          ? 'Япониядан келген контракттык моторду/тетикти текшерүү видеосу. Бардык цилиндрлерде компрессия 12.8 - 13.0 бар.' 
                          : 'Оригинальный замер компрессии цилиндров на стенде Кудайбергена: 12.8 - 13.0 bar во всех цилиндрах. Без задиров и нагара.'}
                      </p>
                    </div>

                    {/* Compression Gauge Indicators */}
                    <div className="grid grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                      <div className="p-2 rounded-xl bg-neutral-950/80 border border-emerald-500/40 text-emerald-300">
                        <div className="text-[9px] text-neutral-400">Цил. 1</div>
                        <div className="font-bold text-sm">12.9 bar</div>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950/80 border border-emerald-500/40 text-emerald-300">
                        <div className="text-[9px] text-neutral-400">Цил. 2</div>
                        <div className="font-bold text-sm">13.0 bar</div>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950/80 border border-emerald-500/40 text-emerald-300">
                        <div className="text-[9px] text-neutral-400">Цил. 3</div>
                        <div className="font-bold text-sm">12.8 bar</div>
                      </div>
                      <div className="p-2 rounded-xl bg-neutral-950/80 border border-emerald-500/40 text-emerald-300">
                        <div className="text-[9px] text-neutral-400">Цил. 4</div>
                        <div className="font-bold text-sm">12.9 bar</div>
                      </div>
                    </div>

                    {isVideoPlaying && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-600 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} />
                        <span>{isKg ? 'Видео тастыкталган: Мотор идеалдуу абалда' : 'Видео подтверждено: Двигатель проверен механиками авторынка'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attribution for CC BY / CC BY-SA photos (credit applies to the main photo) */}
              {activeMediaTab === 'photos' && part.photoCredit && selectedImageIdx === 0 && (
                <p className="text-[10px] text-neutral-500">
                  Фото:{' '}
                  <a
                    href={part.photoCredit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neutral-300"
                    data-no-i18n
                  >
                    {part.photoCredit.author}
                  </a>
                  , {part.photoCredit.license}, Wikimedia Commons
                </p>
              )}

              {/* THUMBNAIL STRIP */}
              {activeMediaTab === 'photos' && galleryImages.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative w-16 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        selectedImageIdx === idx
                          ? 'border-red-500 ring-2 ring-red-500/30'
                          : 'border-neutral-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* QUICK KEY SPECS BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Абалы' : 'Состояние'}</span>
                  <span className="font-bold text-amber-400">{part.condition}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Кепилдик' : 'Гарантия'}</span>
                  <span className="font-bold text-emerald-400">{part.warrantyDays || 14} {isKg ? 'күн' : 'дней'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Алып келинген' : 'Страна ввоза'}</span>
                  <span className="font-bold text-neutral-200">{part.countryOfImport || 'Япония (Контракт)'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{isKg ? 'Жеткирип берүү' : 'Доставка'}</span>
                  <span className="font-bold text-sky-400">{isKg ? '1 саатта / Аймактарга' : 'Яндекс 1ч / Бусик КР'}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: DETAILS, COMPATIBILITY & SELLER BOX - 5 cols */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Part Title and OEM Bar */}
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-950/70 text-red-400 border border-red-800/80 text-[11px] font-bold">
                    {part.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[11px] font-semibold">
                    {part.brand} {part.model}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                  {part.title}
                </h2>
                {isDemo && (
                  <p className="mt-2 px-3 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-semibold">{DEMO_NOTICE}</p>
                )}

                {/* OEM Copy button */}
                <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-xs">
                    <span className="text-neutral-400 mr-2">OEM / Артикул:</span>
                    <span className="font-mono font-bold text-amber-400">{part.partNumber}</span>
                    {part.manufacturer && <span className="ml-2 text-neutral-400">· {isKg ? 'Өндүрүүчү' : 'Производитель'}: <span className="text-white" data-no-i18n>{part.manufacturer}</span></span>}
                    {part.crossNumbers?.length ? (
                      <div className="mt-1 text-neutral-400">{isKg ? 'Кросс-номерлер' : 'Кросс-номера'}: <span className="font-mono text-neutral-200" data-no-i18n>{part.crossNumbers.join(', ')}</span></div>
                    ) : null}
                  </div>
                  <button
                    onClick={handleCopyOEM}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedOEM ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">{isKg ? 'Көчүрүлдү' : 'Скопировано'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>{isKg ? 'Көчүрүү' : 'Копировать'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Price Block & Action Buttons */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-neutral-400 block">{isKg ? 'Баасы' : 'Стоимость'}</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {priceSom.toLocaleString()} сом
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-neutral-400">~ ${priceUsd.toLocaleString()} USD</span>
                    <span className="text-[10px] text-neutral-500 block">курс 1$ = {USD_TO_KGS_RATE} KGS</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      if (!isDemo) onOpenOrder(part);
                    }}
                    className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                  >
                    <Truck size={16} />
                    <span>{isKg ? 'Оформить буюртма' : 'Оформить заказ'}</span>
                  </button>

                  <a
                    href={isDemo ? undefined : whatsappUrl}
                    aria-disabled={isDemo || undefined}
                    onClick={() => recordContact('part', part.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Description */}
              {part.description && (
                <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-xs text-neutral-300 leading-relaxed">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    {isKg ? 'Сыпаттамасы' : 'Описание детали от продавца'}
                  </div>
                  <p>{part.description}</p>
                </div>
              )}

              {/* VERIFIED SELLER & CONTAINER CARD (Requirements 2 & 5) */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Store size={18} className="text-amber-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {part.companyName || part.storeName}
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>{part.sellerType === 'individual' ? 'Жеке сатуучу (Авторазбор)' : 'ОсОО / ИП Тастыкталган'}</span>
                      </span>
                    </div>
                  </div>

                  {part.inn && (
                    <div className="text-right">
                      <span className="text-[9px] text-neutral-400 block">ИНН КР:</span>
                      <span className="font-mono text-xs text-amber-300 font-bold">{part.inn}</span>
                    </div>
                  )}
                </div>

                {/* Location and Guide */}
                <div className="space-y-1.5 text-xs text-neutral-300">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">{part.market}: </span>
                      <span className="text-amber-300 font-semibold">{part.containerInfo || part.storeLocation}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-300 flex items-start gap-2">
                    <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      {part.directionsGuide || (
                        part.market.includes('Кудайберген')
                          ? 'Кантип баруу: Патрис Лумумба көчөсүнөн негизги кире бериш, мечиттин тушундагы 4-өтмөк, бокс #22.'
                          : 'Дордой Моторс автобазары, контейнерлер борбордук катарда.'
                      )}
                    </span>
                  </div>
                </div>

                {/* Seller direct phone and payment methods (Click-to-reveal Anti-Spam Drom feature) */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2 flex-wrap text-xs">
                  {!isPhoneRevealed ? (
                    <button
                      onClick={handleRevealPhone}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <Phone size={14} />
                      <span>{isKg ? 'Телефонду көрсөтүү' : 'Показать телефон'}</span>
                      <span className="font-mono text-emerald-200 text-[11px]">
                        {part.sellerPhone.slice(0, 8)}•• ••
                      </span>
                    </button>
                  ) : (
                    <a
                      href={`tel:${cleanPhone}`}
                      className="py-2 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Phone size={14} className="text-emerald-300" />
                      <span>{part.sellerPhone}</span>
                    </a>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                    <CreditCard size={12} className="text-amber-400" />
                    <span>MBANK, О!Деньги, Элкарт</span>
                  </div>
                </div>
              </div>

              {/* COMPATIBILITY TABLE (Requirement 5) */}
              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Car size={14} className="text-amber-400" />
                    <span>{isKg ? 'Шайкеш келген унаалар' : 'Таблица совместимости с авто'}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">100% Fit</span>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400">
                        <th className="pb-1.5 font-semibold">Марка & Модель</th>
                        <th className="pb-1.5 font-semibold">Кузов / Муун</th>
                        <th className="pb-1.5 font-semibold">Жылдары</th>
                        <th className="pb-1.5 font-semibold">Мотор</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-200">
                      {part.compatibility && part.compatibility.length > 0 ? (
                        part.compatibility.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-800/40">
                            <td className="py-1.5 font-bold text-white">{item.brand} {item.model}</td>
                            <td className="py-1.5 text-neutral-300">{item.bodyCode || '-'}</td>
                            <td className="py-1.5 font-mono text-amber-300">{item.years}</td>
                            <td className="py-1.5 text-neutral-300">{item.engine || 'Бензин / Гибрид'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-neutral-800/40">
                          <td className="py-1.5 font-bold text-white">{part.brand} {part.model}</td>
                          <td className="py-1.5 text-neutral-300">{part.bodyCode || part.generation || '-'}</td>
                          <td className="py-1.5 font-mono text-amber-300">{part.yearRange || '2008-2022'}</td>
                          <td className="py-1.5 text-neutral-300">Стандарт OEM</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {part.sellerId && (
            <div className="pt-6 border-t border-neutral-800">
              <SellerContactBlock kind="parts" listingId={part.id} listingTitle={part.title} sellerId={part.sellerId} dark />
            </div>
          )}

          {sellerParts.length > 0 && (
            <div className="pt-6 border-t border-neutral-800">
              <h4 className="font-bold text-sm text-white mb-3">
                {isKg ? 'Бул сатуучунун башка жарыялары' : 'Другие объявления этого продавца'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sellerParts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPart?.(p)}
                    className="text-left p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer group"
                  >
                    <div className="h-24 rounded-xl overflow-hidden mb-2 bg-neutral-950">
                      <img src={p.image} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="font-bold text-xs text-white line-clamp-2 group-hover:text-amber-400">{p.title}</div>
                    <div className="font-black text-emerald-400 text-xs mt-1">{p.priceKgs.toLocaleString()} сом</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SIMILAR PARTS BLOCK (Requirement: Похожие объявления) */}
          {similarParts.length > 0 && (
            <div className="pt-6 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>
                    {isKg
                      ? `Окшош тетиктер (${part.brand} ${part.model})`
                      : `Похожие запчасти для ${part.brand} ${part.model}`}
                  </span>
                </h4>
                <span className="text-xs text-neutral-400 font-medium">
                  {similarParts.length} {isKg ? 'сунуш' : 'предложения'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {similarParts.map((simPart) => (
                  <div
                    key={simPart.id}
                    onClick={() => {
                      if (onSelectPart) onSelectPart(simPart);
                    }}
                    className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-all hover:scale-102 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="h-24 rounded-xl overflow-hidden mb-2 bg-neutral-950">
                        <img
                          src={simPart.image}
                          alt={simPart.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h5 className="font-bold text-xs text-white line-clamp-2 leading-tight group-hover:text-amber-400 transition-colors">
                        {simPart.title}
                      </h5>
                    </div>
                    <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="font-black text-emerald-400 text-xs">
                        {simPart.priceKgs.toLocaleString()} сом
                      </span>
                      <span className="text-[10px] text-neutral-400 truncate max-w-[80px]">
                        {simPart.market}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-400 shrink-0" />
            <span>{isKg ? 'Кеңеш: тетикти көрүп, текшергенден кийин гана төлөңүз. Алдын ала төлөбөңүз.' : 'Совет: платите только после осмотра детали. Не переводите предоплату незнакомым продавцам.'}</span>
          </div>
          <ReportListingButton kind="part" listingId={part.id} listingTitle={part.title} />
          <button
            onClick={onClose}
            className="text-xs text-neutral-300 hover:text-white font-semibold cursor-pointer underline"
          >
            {isKg ? 'Жабуу' : 'Закрыть просмотр'}
          </button>
        </div>

      </div>

      {/* LIGHTBOX ZOOM MODAL */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-5 right-5 p-3 rounded-full bg-neutral-800 text-white hover:bg-neutral-700"
          >
            <X size={24} />
          </button>
          <img
            src={galleryImages[selectedImageIdx] || part.image}
            alt={part.title}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
          <div className="absolute bottom-5 bg-neutral-900/90 text-white px-4 py-2 rounded-xl text-xs border border-neutral-700">
            {part.title} • {isKg ? 'Жабуу үчүн каалаган жерди басыңыз' : 'Нажмите в любое место, чтобы закрыть'}
          </div>
        </div>
      )}
    </div>
  );
};
