import { backdropClose } from '../../utils/backdrop';
import { copyText } from '../../utils/copyText';
import React, { useState } from 'react';
import { 
  Wrench, Calendar, Clock, User, Phone, MapPin, CheckCircle2, 
  Send, Sparkles, MessageCircle, Navigation, Shield, Award,
  ChevronRight, AlertCircle, ArrowRight, Zap, Check
} from 'lucide-react';
import { Currency, Language, WorkshopService, WorkshopMaster, WorkshopWorkGallery, WorkshopBooking } from '../../types/car';
import { WORKSHOP_LOCATIONS, WORKSHOP_SERVICES, WORKSHOP_MASTERS, WORKSHOP_GALLERY } from '../../data/workshopData';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { PartsSliderBanner, type OfferBlock } from './PartsSliderBanner';

// Photos from Unsplash (free to use, unsplash.com/license); examples until real workshops add their own
const unsplash = (id: string, w = 800, h = 400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
const SERVICE_PHOTOS: Record<string, string> = {
  diagnostics: unsplash('1727893380169-4dda123e19f7'),
  suspension: unsplash('1742741592138-d61129e7fd97'),
  oil_maintenance: unsplash('1771340742493-52fbd5476ccb'),
  engine: unsplash('1792792999828-74b071329fdd'),
  hybrid_ev: unsplash('1593941707874-ef25b8b4a92b'),
  detailing_body: unsplash('1780558852670-3f49298ecc1f'),
  electric: unsplash('1765211003026-f7666ea3a948'),
};

// The service centres, masters, prices and addresses in workshopData are EXAMPLES. While this is
// true, booking and contacts are switched off and a notice is shown. Set to false only after
// replacing workshopData with real workshops and phone numbers.
const WORKSHOP_DEMO = true;
const WORKSHOP_DEMO_NOTICE = 'Раздел СТО в разработке: адреса, мастера, цены и телефоны ниже — примеры. Запись и звонки пока недоступны.';

interface WorkshopSectionProps {
  currency: Currency;
  language: Language;
  onBookingSuccess?: (booking: WorkshopBooking) => void;
  onOpenConsultant?: () => void;
}

export const WorkshopSection: React.FC<WorkshopSectionProps> = ({
  currency,
  language,
  onBookingSuccess,
  onOpenConsultant,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'booking' | 'gallery' | 'masters' | 'locations'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('loc-1');
  
  // Booking Form State
  const [selectedService, setSelectedService] = useState<WorkshopService | null>(WORKSHOP_SERVICES[0]);
  const [selectedMaster, setSelectedMaster] = useState<WorkshopMaster | null>(WORKSHOP_MASTERS[0]);
  const [bookingDate, setBookingDate] = useState<string>('Завтра');
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>('11:00');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+996 ');
  const [carBrandModel, setCarBrandModel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mbank' | 'elkart' | 'odengi' | 'card' | 'cash'>('mbank');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState<WorkshopBooking | null>(null);

  // Gallery before/after compare state
  const [galleryFilter, setGalleryFilter] = useState<string>('all');

  const isKg = language === 'kg';
  const isEn = language === 'en';

  const selectedLocation = WORKSHOP_LOCATIONS.find((l) => l.id === selectedLocationId) || WORKSHOP_LOCATIONS[0];

  const filteredServices = WORKSHOP_SERVICES.filter((srv) => {
    if (selectedCategory === 'all') return true;
    return srv.category === selectedCategory;
  });

  const filteredGallery = WORKSHOP_GALLERY.filter((item) => {
    if (galleryFilter === 'all') return true;
    return item.category.toLowerCase().includes(galleryFilter.toLowerCase());
  });

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:30', '19:00'];
  const dates = [
    { label: isKg ? 'Бүгүн' : isEn ? 'Today' : 'Сегодня', value: 'Сегодня' },
    { label: isKg ? 'Эртең' : isEn ? 'Tomorrow' : 'Завтра', value: 'Завтра' },
    { label: isKg ? 'Бүрсүгүнү' : isEn ? 'In 2 days' : 'Послезавтра', value: 'Послезавтра' },
    { label: isKg ? 'Дем алыш' : isEn ? 'Weekend' : 'Выходные', value: 'Суббота' },
  ];

  const handleStartBookingWithService = (service: WorkshopService) => {
    setSelectedService(service);
    setActiveSubTab('booking');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || clientPhone.length < 9 || !carBrandModel.trim()) {
      alert(isKg ? 'Бардык талааларды толтуруңуз' : isEn ? 'Please fill all required fields' : 'Пожалуйста, заполните имя, телефон и марку авто');
      return;
    }

    if (WORKSHOP_DEMO) {
      alert(WORKSHOP_DEMO_NOTICE);
      return;
    }

    setIsSubmittingBooking(true);
    const newBookingData = {
      serviceTitle: selectedService?.title || 'Комплексный осмотр',
      masterName: selectedMaster?.name || 'Дежурный мастер',
      date: bookingDate,
      timeSlot: bookingTimeSlot,
      carBrandModel,
      clientName,
      clientPhone,
      paymentMethod,
      workshopLocation: selectedLocation.name + ' (' + selectedLocation.address + ')',
      totalPriceKgs: selectedService?.priceKgs || 800,
    };

    try {
      const res = await fetch('/api/workshop/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBookingData),
      });
      const data = await res.json();
      const bookingRecord: WorkshopBooking = data.booking || {
        id: `bk-${Date.now()}`,
        bookingNumber: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        serviceId: selectedService?.id || 'srv-1',
        serviceTitle: selectedService?.title || '',
        masterId: selectedMaster?.id || 'mst-1',
        masterName: selectedMaster?.name || '',
        date: bookingDate,
        timeSlot: bookingTimeSlot,
        carBrandModel,
        clientName,
        clientPhone,
        paymentMethod,
        status: 'Подтверждено',
        totalPriceKgs: selectedService?.priceKgs || 800,
        createdAt: 'Сегодня, сейчас',
        workshopLocation: selectedLocation.name,
        telegramNotified: false,
      };

      if (onBookingSuccess) {
        onBookingSuccess(bookingRecord);
      }
      setBookingSuccessModal(bookingRecord);
    } catch {
      // Fallback local booking
      const fallbackBooking: WorkshopBooking = {
        id: `bk-${Date.now()}`,
        bookingNumber: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        serviceId: selectedService?.id || 'srv-1',
        serviceTitle: selectedService?.title || '',
        masterId: selectedMaster?.id || 'mst-1',
        masterName: selectedMaster?.name || '',
        date: bookingDate,
        timeSlot: bookingTimeSlot,
        carBrandModel,
        clientName,
        clientPhone,
        paymentMethod,
        status: 'Подтверждено',
        totalPriceKgs: selectedService?.priceKgs || 800,
        createdAt: 'Сегодня, сейчас',
        workshopLocation: selectedLocation.name,
        telegramNotified: true,
      };
      setBookingSuccessModal(fallbackBooking);
      if (onBookingSuccess) onBookingSuccess(fallbackBooking);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const showTab = (tab: typeof activeSubTab) => () => setActiveSubTab(tab);
  const stoOffers: OfferBlock[] = [
    {
      id: 1,
      badge: isKg ? 'Онлайн жазылуу' : isEn ? 'Online booking' : 'Онлайн-запись',
      badgeColor: 'bg-red-950/80 border-red-600 text-red-300',
      title: isKg ? (<>Устага жазылыңыз <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">кезексиз</span></>)
        : isEn ? (<>Book a mechanic <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">without queues</span></>)
        : (<>Запишитесь к мастеру <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400">без очереди</span></>),
      description: isKg ? 'Кызматты, устаны жана ыңгайлуу убакытты тандаңыз.' : isEn ? 'Pick a service, a mechanic and a convenient time.' : 'Выберите услугу, мастера и удобное время.',
      stats: [
        { label: isKg ? 'Убакыт' : isEn ? 'Time' : 'Время', val: isKg ? 'ыңгайлуу' : isEn ? 'your choice' : 'удобное' },
        { label: isKg ? 'Уста' : isEn ? 'Mechanic' : 'Мастер', val: isKg ? 'тандоо' : isEn ? 'choose' : 'на выбор' },
      ],
      buttonText: isKg ? 'Жазылуу' : isEn ? 'Book' : 'Записаться',
      buttonAction: showTab('booking'),
      accentColor: 'from-red-950 via-neutral-950 to-neutral-900',
      bgImage: unsplash('1771340012319-0b4fca008b54'),
      icon: <Calendar className="text-red-400" size={20} />,
    },
    {
      id: 2,
      badge: isKg ? 'Кызматтардын баасы' : isEn ? 'Price list' : 'Прайс-лист',
      badgeColor: 'bg-emerald-950/80 border-emerald-600 text-emerald-300',
      title: isKg ? (<>Баасын алдын ала <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">билиңиз</span></>)
        : isEn ? (<>Know the price <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">in advance</span></>)
        : (<>Узнайте цену <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-sky-400">заранее</span></>),
      description: isKg ? 'Диагностика, ходовой бөлүк, май алмаштыруу, мотор, гибриддер жана автоэлектрика.' : isEn ? 'Diagnostics, suspension, oil change, engine, hybrids and electrics.' : 'Диагностика, ходовая, замена масла, двигатель, гибриды и автоэлектрика.',
      stats: [
        { label: isKg ? 'Кызматтар' : isEn ? 'Services' : 'Услуг', val: String(WORKSHOP_SERVICES.length) },
        { label: isKg ? 'Убакыт' : isEn ? 'Duration' : 'Сроки', val: isKg ? 'көрсөтүлгөн' : isEn ? 'shown' : 'указаны' },
      ],
      buttonText: isKg ? 'Баалар' : isEn ? 'Prices' : 'Смотреть цены',
      buttonAction: showTab('services'),
      accentColor: 'from-emerald-950 via-neutral-950 to-neutral-900',
      bgImage: unsplash('1615906655593-ad0386982a0f'),
      icon: <Wrench className="text-emerald-400" size={20} />,
    },
    {
      id: 3,
      badge: isKg ? 'Иштер жана усталар' : isEn ? 'Work and mechanics' : 'Работы и мастера',
      badgeColor: 'bg-amber-950/80 border-amber-600 text-amber-300',
      title: isKg ? (<>Иштердин сүрөттөрү <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">чейин жана кийин</span></>)
        : isEn ? (<>Photos of work <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">before and after</span></>)
        : (<>Фото работ <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-red-400">до и после</span></>),
      description: isKg ? 'Усталар, алардын тажрыйбасы жана картадагы филиалдар.' : isEn ? 'Mechanics, their experience and branches on the map.' : 'Мастера, их опыт и филиалы на карте.',
      stats: [
        { label: isKg ? 'Усталар' : isEn ? 'Mechanics' : 'Мастеров', val: String(WORKSHOP_MASTERS.length) },
        { label: isKg ? 'Филиалдар' : isEn ? 'Branches' : 'Филиалов', val: String(WORKSHOP_LOCATIONS.length) },
      ],
      buttonText: isKg ? 'Галерея' : isEn ? 'Gallery' : 'Галерея работ',
      buttonAction: showTab('gallery'),
      secondaryText: isKg ? 'Усталар' : isEn ? 'Mechanics' : 'Мастера',
      secondaryAction: showTab('masters'),
      accentColor: 'from-amber-950 via-neutral-950 to-neutral-900',
      bgImage: unsplash('1767681092416-bccf9410bda4'),
      icon: <Sparkles className="text-amber-400" size={20} />,
    },
  ];

  return (
    <div className="bg-gradient-to-b from-[#cfe8d6] via-[#e4f2e8] to-[#cfe8d6] dark:from-[#1a5c3c] dark:via-[#237a50] dark:to-[#1a5c3c] pt-3 pb-6 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {WORKSHOP_DEMO && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm font-semibold flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{WORKSHOP_DEMO_NOTICE}</span>
          </div>
        )}
        {/* Heading row (same style as the parts catalog) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 py-2 border-y border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-px rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-700/60 text-[#C8102E] dark:text-red-400 text-[9px] font-bold uppercase tracking-wider mb-1">
              <KochkorMuyuzIcon size={10} />
              <span>{isKg ? 'KGzone • Автосервис жана СТО' : isEn ? 'KGzone • Car service' : 'KGzone • Автосервис и СТО'}</span>
            </div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {isKg ? 'Автосервис, диагностика жана оңдоо Кыргызстан боюнча' : isEn ? 'Car service, diagnostics and repair in Kyrgyzstan' : 'Автосервис, диагностика и ремонт по всему Кыргызстану'}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isKg ? 'Кызматтардын баасы, усталар, иштердин галереясы жана онлайн жазылуу' : isEn ? 'Prices, mechanics, work gallery and online booking' : 'Цены на услуги, мастера, галерея работ и онлайн-запись'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!WORKSHOP_DEMO && (
              <a
                href={`https://wa.me/${selectedLocation.whatsapp}?text=${encodeURIComponent('Здравствуйте! Хочу проконсультироваться по ремонту автомобиля в KGzone СТО.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1.5"
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => setActiveSubTab('booking')}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[11px] flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Calendar size={14} />
              <span>{isKg ? '+ Устага жазылуу' : isEn ? '+ Book a mechanic' : '+ Записаться к мастеру'}</span>
            </button>
          </div>
        </div>

        {/* Slider: three blocks, then ad places (the owner edits them in the cabinet) */}
        <PartsSliderBanner language={language} place="sto" offers={stoOffers} />

        {/* Навигационные табы раздела СТО */}
        <div className="flex items-center gap-2 flex-wrap pb-3 mb-6 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'services'
                ? 'bg-[#C8102E] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Wrench size={16} />
            {isKg ? 'Прайс-лист жана кызматтар' : isEn ? 'Price List & Services' : 'Прайс-лист услуг'}
          </button>

          <button
            onClick={() => setActiveSubTab('booking')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'booking'
                ? 'bg-[#C8102E] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar size={16} />
            {isKg ? 'Онлайн жазылуу (СТО)' : isEn ? 'Online Booking' : 'Онлайн-запись к мастеру'}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'gallery'
                ? 'bg-[#C8102E] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles size={16} />
            {isKg ? 'Аткарылган иштердин галереясы' : isEn ? 'Work Gallery (Before/After)' : 'Галерея работ (До / После)'}
          </button>

          <button
            onClick={() => setActiveSubTab('masters')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'masters'
                ? 'bg-[#C8102E] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <User size={16} />
            {isKg ? 'Биздин усталар' : isEn ? 'Our Specialists' : 'Мастера сервиса'}
          </button>

          <button
            onClick={() => setActiveSubTab('locations')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'locations'
                ? 'bg-[#C8102E] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <MapPin size={16} />
            {isKg ? 'Филиалдар жана карта' : isEn ? 'Branches & Map' : 'Карта мастерских & Филиалы'}
          </button>
        </div>

        {/* ============================================================== */}
        {/* SUBTAB 1: ПРАЙС-ЛИСТ НА УСЛУГИ */}
        {/* ============================================================== */}
        {activeSubTab === 'services' && (
          <div>
            {/* Фильтр по категориям */}
            <div className="flex items-center gap-2 flex-wrap pb-4 mb-6">
              {[
                { id: 'all', label: isKg ? 'Бардык кызматтар' : isEn ? 'All Services' : 'Все услуги' },
                { id: 'diagnostics', label: isKg ? 'Диагностика' : isEn ? 'Diagnostics' : 'Компьютерная диагностика' },
                { id: 'suspension', label: isKg ? 'Ходовой бөлүк' : isEn ? 'Suspension & Chassis' : 'Ходовая часть и 3D развал' },
                { id: 'oil_maintenance', label: isKg ? 'Май алмаштыруу' : isEn ? 'Oil & Filters' : 'Замена масел и жидкостей' },
                { id: 'engine', label: isKg ? 'ДВС / Мотор' : isEn ? 'Engine Repair' : 'Двигатель и ГРМ' },
                { id: 'hybrid_ev', label: isKg ? 'Гибрид жана EV' : isEn ? 'Hybrid / EV' : 'Гибриды & Электрокары' },
                { id: 'detailing_body', label: isKg ? 'Детейлинг / Полировка' : isEn ? 'Detailing' : 'Детейлинг и керамика' },
                { id: 'electric', label: isKg ? 'Автоэлектрика' : isEn ? 'Auto Electrics' : 'Автоэлектрика и кондиционер' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Сетка услуг */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-[#C8102E] transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {SERVICE_PHOTOS[srv.category] && (
                      <img src={SERVICE_PHOTOS[srv.category]} alt="" loading="lazy" className="-mx-5 -mt-5 mb-4 w-[calc(100%+2.5rem)] max-w-none h-36 object-cover" />
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                        {isKg && srv.titleKg ? srv.titleKg : isEn && srv.titleEn ? srv.titleEn : srv.title}
                      </h3>
                      {srv.isPopular && (
                        <span className="shrink-0 bg-red-100 text-[#C8102E] dark:bg-red-950/60 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Хит
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {srv.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5">
                        <Clock size={12} />
                        <span>{srv.estimatedDuration}</span>
                      </div>
                      <div className="text-lg font-black text-[#C8102E]">
                        {srv.priceKgs.toLocaleString()} сом
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartBookingWithService(srv)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-[#C8102E] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{isKg ? 'Жазылуу' : isEn ? 'Book' : 'Записаться'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 2: ОНЛАЙН-ЗАПИСЬ НА СТО */}
        {/* ============================================================== */}
        {activeSubTab === 'booking' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-[#C8102E] dark:bg-red-950 dark:text-red-400 rounded-full text-xs font-bold mb-2">
                  <Calendar size={13} />
                  <span>{isKg ? 'Тез жана ыңгайлуу онлайн бронь' : isEn ? 'Fast Online Reservation' : 'Бронирование без очередей'}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {isKg ? 'Автосервиске онлайн жазылуу' : isEn ? 'Book Your Service Appointment' : 'Онлайн-запись в автомастерскую KGzone'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {isKg 
                    ? 'Керектүү кызматты, мастерди жана ыңгайлуу убакытты тандаңыз. Заявка дароо СТОго жана Telegram-ботубузга түшөт.'
                    : 'Выберите подходящую услугу, мастера и время. Заявка моментально фиксируется в графике бокса и дублируется в Telegram-бот.'}
                </p>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-6">
                
                {/* 1. Выбор филиала СТО */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {isKg ? '1. Мастерскойдун филиалын тандаңыз' : '1. Выберите филиал СТО'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {WORKSHOP_LOCATIONS.map((loc) => (
                      <button
                        type="button"
                        key={loc.id}
                        onClick={() => setSelectedLocationId(loc.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedLocationId === loc.id
                            ? 'border-[#C8102E] bg-red-50/50 dark:bg-red-950/20 ring-1 ring-[#C8102E]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{loc.name}</span>
                          {loc.isMain && (
                            <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">
                              Главный
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin size={11} className="text-[#C8102E] shrink-0" />
                          <span>{loc.address}</span>
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Выбор услуги */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {isKg ? '2. Негизги кызматты тандаңыз' : '2. Выберите услугу'}
                  </label>
                  <select
                    value={selectedService?.id || ''}
                    onChange={(e) => {
                      const found = WORKSHOP_SERVICES.find((s) => s.id === e.target.value);
                      if (found) setSelectedService(found);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C8102E]"
                  >
                    {WORKSHOP_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {s.priceKgs.toLocaleString()} сом ({s.estimatedDuration})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Выбор мастера */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {isKg ? '3. Мастерди тандаңыз' : '3. Выберите специалиста'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {WORKSHOP_MASTERS.map((mst) => (
                      <div
                        key={mst.id}
                        onClick={() => setSelectedMaster(mst)}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          selectedMaster?.id === mst.id
                            ? 'border-[#C8102E] bg-red-50/50 dark:bg-red-950/20 ring-1 ring-[#C8102E]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={mst.avatar}
                          alt={mst.name}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {mst.name}
                            </span>
                            <span className="text-[11px] font-bold text-amber-500">
                              ★ {mst.rating}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {isKg && mst.specializationKg ? mst.specializationKg : mst.specialization}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Стаж: {mst.experienceYears} лет
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Дата и временной слот */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {isKg ? '4. Күндү тандаңыз' : '4. Дата визита'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {dates.map((d) => (
                        <button
                          type="button"
                          key={d.value}
                          onClick={() => setBookingDate(d.value)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            bookingDate === d.value
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      {isKg ? '5. Убакытты тандаңыз (Слот)' : '5. Время (Слот)'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {timeSlots.map((slot) => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setBookingTimeSlot(slot)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            bookingTimeSlot === slot
                              ? 'bg-[#C8102E] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Данные клиента и авто */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      {isKg ? 'Сиздин атыңыз' : 'Ваше имя *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ваше имя"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      {isKg ? 'Телефон номери' : 'Телефон *'}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+996 555 123 456"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      {isKg ? 'Унаанын маркасы жана жылы' : 'Марка и модель авто *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Toyota Camry 70 (2020)"
                      value={carBrandModel}
                      onChange={(e) => setCarBrandModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>
                </div>

                {/* 7. Способ оплаты */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {isKg ? '7. Ыңгайлуу төлөм ыкмасы' : '7. Способ оплаты'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'mbank', label: 'MBank' },
                      { id: 'elkart', label: 'Элкарт' },
                      { id: 'odengi', label: 'O!Деньги' },
                      { id: 'card', label: 'Visa/Master' },
                      { id: 'cash', label: 'В кассе СТО' },
                    ].map((pm) => (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          paymentMethod === pm.id
                            ? 'border-[#C8102E] bg-red-50 dark:bg-red-950 text-[#C8102E]'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Итоговая плашка и отправка */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {isKg ? 'Болжолдуу баасы:' : 'Ориентировочная стоимость:'}
                    </div>
                    <div className="text-2xl font-black text-[#C8102E]">
                      {selectedService?.priceKgs.toLocaleString()} сом
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 size={12} />
                      <span>{isKg ? 'Telegram-га автоматтык билдирүү' : 'Синхронизация с Telegram и SMS'}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="px-6 py-3 bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingBooking ? (
                      <span>Жазылууда...</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>{isKg ? 'Жазылууну ырастоо' : isEn ? 'Confirm Booking' : 'Подтвердить запись онлайн'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 3: ГАЛЕРЕЯ ВЫПОЛНЕННЫХ РАБОТ */}
        {/* ============================================================== */}
        {activeSubTab === 'gallery' && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {isKg ? 'Аткарылган иштердин фотоотчеттору (До / После)' : 'Фотоотчеты выполненных работ (До и После)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isKg 
                    ? 'Биздин мастерлер жасаган чыныгы оңдоолор: сүрөттөрү, баасы жана кардардын пикири менен'
                    : 'Реальные примеры восстановления авто в наших боксах с описанием дефекта, временем и стоимостью'}
                </p>
              </div>

              {/* Фильтр */}
              <select
                value={galleryFilter}
                onChange={(e) => setGalleryFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                <option value="all">Все категории</option>
                <option value="детейлинг">Детейлинг & Кузов</option>
                <option value="гибрид">Гибрид сервис</option>
                <option value="ходовая">Ходовая часть</option>
                <option value="двигатель">Двигатель & ГРМ</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                >
                  {/* Сравнение До и После */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 relative">
                    <div className="relative aspect-4/3 overflow-hidden group">
                      <img
                        src={item.beforeImage}
                        alt="До ремонта"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        До ремонта
                      </span>
                    </div>

                    <div className="relative aspect-4/3 overflow-hidden group">
                      <img
                        src={item.afterImage}
                        alt="После ремонта"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Результат ✓
                      </span>
                    </div>
                  </div>

                  {/* Описание кейса */}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-[#C8102E] uppercase">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-amber-500">
                        ★ {item.rating} (Отлично)
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base mb-1">
                      {item.carModel} ({item.year}) — {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div className="text-slate-500 dark:text-slate-400">
                        Мастер: <strong className="text-slate-800 dark:text-slate-200">{item.masterName}</strong> ({item.completionTime})
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {item.costKgs.toLocaleString()} сом
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 4: НАШИ МАСТЕРА */}
        {/* ============================================================== */}
        {activeSubTab === 'masters' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isKg ? 'СТО KGzone адистери жана усталары' : 'Сертифицированная команда автосервиса KGzone'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKg 
                  ? 'Көп жылдык тажрыйбасы бар кесипкөй усталар, заманбап сертификаттар'
                  : 'Специалисты с профильным стажем от 8 до 16 лет. Индивидуальный подход и фото-видео отчет по каждому узлу'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WORKSHOP_MASTERS.map((mst) => (
                <div
                  key={mst.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={mst.avatar}
                      alt={mst.name}
                      className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 border-2 border-[#C8102E]/20"
                    />
                    <div className="text-center mb-3">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {mst.name}
                      </h3>
                      <p className="text-xs text-[#C8102E] font-semibold mt-0.5">
                        {isKg && mst.specializationKg ? mst.specializationKg : mst.specialization}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-xs space-y-1 mb-4">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Опыт работы:</span>
                        <strong className="text-slate-900 dark:text-white">{mst.experienceYears} лет</strong>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Рейтинг доверия:</span>
                        <strong className="text-amber-500">★ {mst.rating}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>График:</span>
                        <strong className="text-slate-900 dark:text-white">{mst.availableDays.join(', ')}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMaster(mst);
                      setActiveSubTab('booking');
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-[#C8102E] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isKg ? 'Ушул мастерге жазылуу' : 'Записаться к мастеру'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 5: КАРТА И ТОЧНОЕ МЕСТОПОЛОЖЕНИЕ */}
        {/* ============================================================== */}
        {activeSubTab === 'locations' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Список филиалов */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
                  {isKg ? 'Биздин филиалдар жана даректер' : 'Филиалы сервиса и авторынков'}
                </h3>
                {WORKSHOP_LOCATIONS.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedLocationId === loc.id
                        ? 'border-[#C8102E] bg-red-50/40 dark:bg-red-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{loc.name}</h4>
                      {loc.isMain && (
                        <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                          Центр
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <MapPin size={12} className="text-[#C8102E] shrink-0" />
                      <span>{loc.address}</span>
                    </p>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      🕒 {loc.hours}
                    </div>

                    {!WORKSHOP_DEMO && <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${loc.whatsapp}?text=${encodeURIComponent(`Здравствуйте! Я хочу приехать в ${loc.name}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${loc.phone}`}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-md flex items-center gap-1"
                      >
                        <Phone size={12} />
                        Позвонить
                      </a>
                    </div>}
                  </div>
                ))}
              </div>

              {/* Интерактивный вид карты филиала с координатами и 2GIS/Яндекс навигатором */}
              <div className="lg:col-span-2 flex flex-col justify-between bg-slate-900 rounded-xl overflow-hidden p-6 text-white relative min-h-[380px]">
                {/* Стилизованная карта-подложка */}
                <div className="absolute inset-0 bg-slate-950 opacity-90">
                  <div className="w-full h-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/30">
                      <Navigation size={13} />
                      <span>Координаты: {selectedLocation.lat}, {selectedLocation.lng}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      г. {selectedLocation.city}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black mb-2 text-white">
                    {selectedLocation.name}
                  </h3>
                  <p className="text-sm text-slate-300 mb-4 max-w-lg">
                    {selectedLocation.address}. Удобный заезд с главной магистрали, охраняемая парковка для клиентов.
                  </p>

                  {/* Оснащение бокса */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                    {selectedLocation.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 p-2 rounded-lg">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Действия прокладки маршрута */}
                <div className="relative z-10 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3">
                  <a
                    href={`https://2gis.kg/bishkek/search/${encodeURIComponent(selectedLocation.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Navigation size={14} />
                    <span>Открыть в 2GIS</span>
                  </a>

                  <a
                    href={`https://yandex.com/maps/?text=${encodeURIComponent(selectedLocation.lat + ',' + selectedLocation.lng)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <MapPin size={14} />
                    <span>Яндекс Карты (Навигатор)</span>
                  </a>

                  <button
                    onClick={() => {
                      void copyText(selectedLocation.address);
                      alert('Адрес скопирован в буфер обмена: ' + selectedLocation.address);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Скопировать адрес
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Модальное окно успешного онлайн бронирования */}
      {bookingSuccessModal && (
        <div {...backdropClose(() => setBookingSuccessModal(null))} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              Запись успешно оформлена!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Номер брони: <strong className="text-[#C8102E]">#{bookingSuccessModal.bookingNumber}</strong>
            </p>

            <div className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-4 text-xs text-left space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Услуга:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{bookingSuccessModal.serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Мастер:</span>
                <span className="font-bold text-slate-900 dark:text-white">{bookingSuccessModal.masterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Дата и время:</span>
                <span className="font-bold text-[#C8102E]">{bookingSuccessModal.date}, {bookingSuccessModal.timeSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Автомобиль:</span>
                <span className="font-bold text-slate-900 dark:text-white">{bookingSuccessModal.carBrandModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Адрес бокса:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{bookingSuccessModal.workshopLocation}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-600">
                <span className="text-slate-500">Telegram-уведомление:</span>
                <span className="font-bold text-emerald-600">Отправлено в бот ✓</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://wa.me/${selectedLocation.whatsapp}?text=${encodeURIComponent(`Здравствуйте! Я записался на СТО. Номер брони: #${bookingSuccessModal.bookingNumber}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={15} />
                <span>Открыть в WhatsApp</span>
              </a>

              <button
                onClick={() => setBookingSuccessModal(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
