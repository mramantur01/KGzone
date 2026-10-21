/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Car,
  Currency,
  Language,
  UserProfile,
  BuyerOrder,
  SellerIncomingOrder,
  SavedCarCheck,
  SellerStoreProfile,
  AutoPartItem,
  RegisteredUser,
  SiteSettings,
} from './types/car';
import {
  INITIAL_CARS,
  USD_TO_KGS_RATE,
  INITIAL_USER_PROFILE,
  INITIAL_BUYER_ORDERS,
  INITIAL_SELLER_INCOMING_ORDERS,
  INITIAL_SAVED_CARCHECKS,
  INITIAL_SELLER_STORE,
  INITIAL_REGISTERED_USERS,
  INITIAL_SITE_SETTINGS,
  AUTO_PARTS,
} from './data/mockData';
import { Header } from './components/layout/Header';
import { HeroFilter } from './components/cars/HeroFilter';
import { CarCard } from './components/cars/CarCard';
import { CarDetailModal } from './components/modals/CarDetailModal';
import { CarCheckModal } from './components/modals/CarCheckModal';
import { CustomsCalculatorModal } from './components/modals/CustomsCalculatorModal';
import { AddListingModal } from './components/modals/AddListingModal';
import { FavoritesModal } from './components/modals/FavoritesModal';
import { PartsSection } from './components/sections/PartsSection';
import { ReviewsSection } from './components/sections/ReviewsSection';
import { NewsSection } from './components/sections/NewsSection';
import { AccountCabinet, type PartsSearchPreset } from './components/account/AccountCabinet';
import { AuthModal } from './components/auth/AuthModal';
import { useAuth, isStaff, type Account } from './api/auth';
import { LandingHero } from './components/sections/LandingHero';
import { WorkshopSection } from './components/sections/WorkshopSection';
import { FaqSection } from './components/sections/FaqSection';
import { PromotionsSection } from './components/sections/PromotionsSection';
import { SiteControlPanelModal } from './components/cabinet/SiteControlPanelModal';
import { AIConsultantChatbot } from './components/chatbot/AIConsultantChatbot';
import { Footer } from './components/layout/Footer';
import { KyrgyzSectionDivider, KochkorMuyuzIcon, TundukIcon } from './components/ornaments/KyrgyzOrnaments';
import { ShieldCheck, Calculator, Sparkles, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { WorkshopBooking } from './types/car';
import { setSiteLanguage } from './i18n/domTranslator';
import { useParts, isDbPart } from './api/parts';
import { useCars, isDbCar } from './api/cars';

// Older components still expect the UserProfile shape; build it from the signed-in account
function accountToProfile(a: Account | null): UserProfile {
  return {
    id: a?.id || 'guest',
    name: a?.name || '',
    phone: a ? `+${a.phone}` : '',
    email: a?.email || '',
    city: a?.city || 'Бишкек',
    registeredDate: a ? new Date(a.createdAt).toLocaleDateString('ru-RU') : '',
    avatar: '',
    activeRole: 'seller',
    siteRole: a?.role === 'admin' ? 'owner' : a?.role === 'moderator' ? 'admin' : 'user',
    isApprovedAdmin: a?.role === 'admin' || a?.role === 'moderator',
    adminRequestStatus: 'none',
    walletBalanceKgs: 0,
    isPhoneVerified: Boolean(a?.phoneVerified),
    activeAdsCount: 0,
    dealsCount: 0,
    rating: 0,
  };
}

export default function App() {
  // Listings = approved cars from the database + built-in demo listings (demo edits stay local)
  const storeCars = useCars();
  const [demoCars, setDemoCars] = useState<Car[]>(INITIAL_CARS);
  const cars = useMemo(() => [...storeCars.filter((c) => isDbCar(c.id)), ...demoCars], [storeCars, demoCars]);
  const setCars: React.Dispatch<React.SetStateAction<Car[]>> = (next) =>
    setDemoCars(() => {
      const value = typeof next === 'function' ? next(cars) : next;
      return value.filter((c) => !isDbCar(c.id));
    });
  // Catalog = approved parts from the database + built-in demo listings (demo edits stay local)
  const storeParts = useParts();
  const [demoParts, setDemoParts] = useState<AutoPartItem[]>(AUTO_PARTS);
  const parts = useMemo(() => [...storeParts.filter((p) => isDbPart(p.id)), ...demoParts], [storeParts, demoParts]);
  const setParts: React.Dispatch<React.SetStateAction<AutoPartItem[]>> = (next) =>
    setDemoParts((prev) => {
      const value = typeof next === 'function' ? next(parts) : next;
      return value.filter((p) => !isDbPart(p.id));
    });
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(INITIAL_REGISTERED_USERS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [language, setLanguage] = useState<Language>('ru');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<string>('Все регионы');
  const [activeTab, setActiveTab] = useState<string>('cars');
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  // Synchronize dark class on document element
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keep <html lang> in sync with the site language (ISO code for Kyrgyz is "ky")
  // and translate the rendered page (see src/i18n/domTranslator.ts)
  React.useEffect(() => {
    document.documentElement.lang = language === 'kg' ? 'ky' : language;
    setSiteLanguage(language);
  }, [language]);

  // Состояния личного кабинета (Покупатель & Продавец)
  const { user: account } = useAuth();
  const staff = isStaff(account);
  const userProfile: UserProfile = useMemo(() => accountToProfile(account), [account]);
  const isAuthenticated = Boolean(account);
  const [buyerOrders, setBuyerOrders] = useState<BuyerOrder[]>(INITIAL_BUYER_ORDERS);
  const [sellerOrders, setSellerOrders] = useState<SellerIncomingOrder[]>(INITIAL_SELLER_INCOMING_ORDERS);
  const [savedChecks, setSavedChecks] = useState<SavedCarCheck[]>(INITIAL_SAVED_CARCHECKS);
  const [sellerStoreProfile, setSellerStoreProfile] = useState<SellerStoreProfile>(INITIAL_SELLER_STORE);

  // Избранное
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { const v = JSON.parse(localStorage.getItem('kgzone-car-favorites') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('kgzone-car-favorites', JSON.stringify(favorites)); } catch { /* storage unavailable */ }
  }, [favorites]);

  // Модальные окна
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isCarCheckOpen, setIsCarCheckOpen] = useState(false);
  const [carCheckPlate, setCarCheckPlate] = useState('');
  const [isCustomsCalcOpen, setIsCustomsCalcOpen] = useState(false);
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isCabinetAuthModalOpen, setIsCabinetAuthModalOpen] = useState(false);
  const [authModalNotice, setAuthModalNotice] = useState<string | null>(null);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');
  const [pendingPostAfterAuth, setPendingPostAfterAuth] = useState(false);
  const [partsPreset, setPartsPreset] = useState<PartsSearchPreset | null>(null);
  const [partsSellSignal, setPartsSellSignal] = useState(0);

  // Фильтры
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    yearFrom: '',
    yearTo: '',
    priceFrom: '',
    priceTo: '',
    city: '',
    bodyType: '',
    transmission: '',
    steering: '',
    fuelType: '',
    customs: '',
    typeTab: 'all' as 'all' | 'used' | 'new' | 'green',
  });

  const [sortBy, setSortBy] = useState<'date' | 'priceAsc' | 'priceDesc' | 'yearDesc'>('date');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isKg = language === 'kg';

  // Переключение избранного
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((i) => i !== id) : [...prev, id];
      showToast(exists ? 'Удалено из избранного' : 'Добавлено в избранное');
      return updated;
    });
  };

  const openAuth = (tab: 'login' | 'register', notice?: string) => {
    setAuthModalInitialTab(tab);
    setAuthModalNotice(notice || null);
    setIsCabinetAuthModalOpen(true);
  };

  // Header "Личный кабинет": open the cabinet when signed in, otherwise the sign-in window
  const openCabinet = () => {
    if (account) setActiveTab('cabinet');
    else openAuth('login');
  };

  const sellPart = () => {
    if (!account) {
      openAuth('register', 'Чтобы продать запчасть, войдите или зарегистрируйтесь.');
      return;
    }
    setActiveTab('parts');
    setPartsSellSignal((n) => n + 1);
  };

  // Проверка авторизации перед подачей объявления
  const handleTriggerPostAd = () => {
    if (!isAuthenticated || !userProfile || !userProfile.phone) {
      setAuthModalNotice(
        isKg
          ? 'Жарыя берүү үчүн алгач катталыңыз же жеке кабинетиңизге кириңиз.'
          : 'Чтобы подать объявление о продаже авто, пожалуйста, войдите или зарегистрируйтесь.'
      );
      setAuthModalInitialTab('register');
      setPendingPostAfterAuth(true);
      setIsCabinetAuthModalOpen(true);
      return;
    }
    // Если уже авторизован — открываем форму подачи объявления
    setIsAddListingOpen(true);
  };

  // Новое объявление уходит на модерацию и появится в каталоге после одобрения
  const handleCarSubmitted = () => {
    showToast('Объявление отправлено на модерацию');
  };

  // Управление авто в кабинете продавца
  const handleUpdateCarPrice = (carId: string, newPriceUsd: number) => {
    setCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, priceUsd: newPriceUsd } : c))
    );
    showToast(`Цена автомобиля обновлена: $${newPriceUsd.toLocaleString()}`);
  };

  const handleToggleCarUrgent = (carId: string) => {
    setCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, isUrgent: !c.isUrgent } : c))
    );
  };

  const handleRemoveCar = (carId: string) => {
    if (confirm('Снять объявление с публикации на KGzone?')) {
      setCars((prev) => prev.filter((c) => c.id !== carId));
      showToast('Объявление удалено из каталога');
    }
  };

  // Оформление заказа автозапчасти покупателем
  const handleOrderCreated = (newBuyerOrder: BuyerOrder) => {
    setBuyerOrders((prev) => [newBuyerOrder, ...prev]);

    // Добавляем также продавцу во входящие заказы магазина
    const newSellerOrder: SellerIncomingOrder = {
      id: `ord-s-${Date.now()}`,
      orderNumber: newBuyerOrder.orderNumber,
      date: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      customerName: userProfile.name,
      customerPhone: userProfile.phone,
      partTitle: newBuyerOrder.partTitle,
      partNumber: newBuyerOrder.partNumber,
      priceKgs: newBuyerOrder.priceKgs,
      status: 'Новый',
      deliveryType: newBuyerOrder.deliveryType,
      deliveryAddress: newBuyerOrder.deliveryAddress,
      comment: 'Заказ оформлен онлайн через сайт KGzone',
    };
    setSellerOrders((prev) => [newSellerOrder, ...prev]);
  };

  const handleOpenCarCheckWithPlate = (plate?: string) => {
    setCarCheckPlate(plate || '01 KG 777 AAA');
    setIsCarCheckOpen(true);
  };

  // Фильтрация объявлений
  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      // Таб типа авто
      if (filters.typeTab === 'green' && !(car.fuelType === 'Электро' || car.fuelType === 'Гибрид')) {
        return false;
      }
      if (filters.typeTab === 'new' && car.mileageKm > 5000) {
        return false;
      }
      if (filters.typeTab === 'used' && car.mileageKm <= 5000) {
        return false;
      }

      // Марка и модель
      if (filters.brand && car.brand !== filters.brand) return false;
      if (filters.model && car.model !== filters.model) return false;

      // Года
      if (filters.yearFrom && car.year < Number(filters.yearFrom)) return false;
      if (filters.yearTo && car.year > Number(filters.yearTo)) return false;

      // Цены
      if (currency === 'USD') {
        if (filters.priceFrom && car.priceUsd < Number(filters.priceFrom)) return false;
        if (filters.priceTo && car.priceUsd > Number(filters.priceTo)) return false;
      } else {
        const carSom = car.priceUsd * USD_TO_KGS_RATE;
        if (filters.priceFrom && carSom < Number(filters.priceFrom)) return false;
        if (filters.priceTo && carSom > Number(filters.priceTo)) return false;
      }

      // Город / Регион
      const activeCityFilter = filters.city || (selectedCity !== 'Все регионы' ? selectedCity : '');
      if (activeCityFilter && !car.city.includes(activeCityFilter)) return false;

      // Параметры
      if (filters.bodyType && car.bodyType !== filters.bodyType) return false;
      if (filters.transmission && car.transmission !== filters.transmission) return false;
      if (filters.steering && car.steering !== filters.steering) return false;
      if (filters.fuelType && car.fuelType !== filters.fuelType) return false;
      if (filters.customs && car.customs !== filters.customs) return false;

      return true;
    });
  }, [cars, filters, selectedCity, currency]);

  // Сортировка
  const sortedCars = useMemo(() => {
    const list = [...filteredCars];
    if (sortBy === 'priceAsc') {
      return list.sort((a, b) => a.priceUsd - b.priceUsd);
    }
    if (sortBy === 'priceDesc') {
      return list.sort((a, b) => b.priceUsd - a.priceUsd);
    }
    if (sortBy === 'yearDesc') {
      return list.sort((a, b) => b.year - a.year);
    }
    return list; // default by date
  }, [filteredCars, sortBy]);

  const favoriteCars = useMemo(() => {
    return cars.filter((c) => favorites.includes(c.id));
  }, [cars, favorites]);

  const handleResetFilters = () => {
    setFilters({
      brand: '',
      model: '',
      yearFrom: '',
      yearTo: '',
      priceFrom: '',
      priceTo: '',
      city: '',
      bodyType: '',
      transmission: '',
      steering: '',
      fuelType: '',
      customs: '',
      typeTab: 'all',
    });
    setSelectedCity('Все регионы');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-[#C8102E] selection:text-white">
      {/* Toast уведомление */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2">
          <KochkorMuyuzIcon size={16} color="#FBBF24" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Навигационная панель Drom.kg с орнаментами */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        language={language}
        setLanguage={setLanguage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        favoritesCount={favorites.length}
        userName={account?.name || ''}
        userSiteRole={userProfile.siteRole}
        isApprovedAdmin={staff}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenAddListing={handleTriggerPostAd}
        onOpenCarCheck={() => {
          setCarCheckPlate('01 KG 777 AAA');
          setIsCarCheckOpen(true);
        }}
        onOpenCustomsCalc={() => setIsCustomsCalcOpen(true)}
        onOpenControlPanel={staff ? () => setIsControlPanelOpen(true) : undefined}
        onOpenCabinetAuth={openCabinet}
      />

      {/* Основной контент */}
      <main className="flex-1">
        {activeTab === 'cars' && (
          <div>
            {/* Презентационный Landing Hero блок с быстрыми ссылками */}
            <LandingHero
              language={language}
              currency={currency}
              filters={filters}
              setFilters={setFilters}
              totalCarsCount={cars.length}
              onOpenCarCheck={() => {
                setCarCheckPlate('01 KG 777 AAA');
                setIsCarCheckOpen(true);
              }}
              onOpenCustomsCalc={() => setIsCustomsCalcOpen(true)}
              onOpenParts={() => setActiveTab('parts')}
              onPostAd={handleTriggerPostAd}
              onOpenWorkshop={() => setActiveTab('workshop')}
              onSelectCarId={(carId) => {
                const found = cars.find((c) => c.id === carId);
                if (found) {
                  setSelectedCar(found);
                } else {
                  const searchEl = document.getElementById('listings-grid-section');
                  searchEl?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onExploreCars={() => {
                const searchEl = document.getElementById('listings-grid-section');
                searchEl?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Главный блок поиска с фильтрами Drom */}
            <div id="search-catalog-section">
              <HeroFilter
                filters={filters}
                setFilters={setFilters}
                totalCount={sortedCars.length}
                currency={currency}
                language={language}
                onReset={handleResetFilters}
                onOpenCarCheck={() => {
                  setCarCheckPlate('01 KG 777 AAA');
                  setIsCarCheckOpen(true);
                }}
                onOpenCustomsCalc={() => setIsCustomsCalcOpen(true)}
                onOpenParts={() => setActiveTab('parts')}
              />
            </div>

            {/* Быстрые баннеры доверия в кыргызском стиле */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Баннер CarCheck */}
                <div
                  onClick={() => {
                    setCarCheckPlate('01 KG 777 AAA');
                    setIsCarCheckOpen(true);
                  }}
                  className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-xl p-4 text-white flex items-center justify-between border border-emerald-800 cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center shadow-xs">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">
                        {isKg ? 'CarCheck KG: Арест жана айыптарды текшерүү' : 'CarCheck KG: Проверка штрафов и залогов'}
                      </h4>
                      <p className="text-xs text-emerald-200">
                        {isKg ? '«Коопсуз шаар» айыптарын онлайн көрүү' : 'По базе Safe City / ГРС КР перед покупкой'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-300 hover:underline shrink-0">
                    Текшерүү →
                  </span>
                </div>

                {/* Баннер Растаможки */}
                <div
                  onClick={() => setIsCustomsCalcOpen(true)}
                  className="bg-gradient-to-r from-amber-950 to-slate-900 rounded-xl p-4 text-white flex items-center justify-between border border-amber-900 cursor-pointer hover:border-amber-500 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center shadow-xs">
                      <Calculator size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">
                        {isKg ? 'КР бажы калькулятору (Электро 0%)' : 'Калькулятор растаможки КР (Электро 0%)'}
                      </h4>
                      <p className="text-xs text-amber-200">
                        {isKg ? 'ЕАЭС 2025-2026 тарифтери боюнча так эсеп' : 'Точный расчет пошлин и НДС по сетке ЕАЭС'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-300 hover:underline shrink-0">
                    Рассчитать →
                  </span>
                </div>
              </div>
            </div>

            {/* Список объявлений с сортировкой */}
            <div id="listings-grid-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Строка управления сортировкой */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {isKg ? 'Жаңы чыккан автоунаалар' : 'Актуальные объявления'}
                  </h2>
                  <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full font-bold">
                    {sortedCars.length}
                  </span>
                </div>

                {/* Сортировка */}
                <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <ArrowUpDown size={13} />
                    {isKg ? 'Иреттөө:' : 'Сортировка:'}
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#C8102E] cursor-pointer"
                  >
                    <option value="date">По дате добавления</option>
                    <option value="priceAsc">Сначала дешевле</option>
                    <option value="priceDesc">Сначала дороже</option>
                    <option value="yearDesc">Свежие по году</option>
                  </select>
                </div>
              </div>

              {/* Сетка карточек автомобилей */}
              {sortedCars.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                  <KochkorMuyuzIcon size={48} color="#94A3B8" className="mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-800">
                    По вашему запросу ничего не найдено
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Попробуйте смягчить параметры поиска или сбросить фильтры
                  </p>
                  <button
                    onClick={handleResetFilters}
                    className="mt-4 px-4 py-2 bg-[#C8102E] text-white text-xs font-bold rounded-lg hover:bg-[#a60d26] transition-colors cursor-pointer"
                  >
                    Сбросить все фильтры
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {sortedCars.map((car) => (
                    <CarCard
                      key={car.id}
                      car={car}
                      currency={currency}
                      language={language}
                      isFavorite={favorites.includes(car.id)}
                      onToggleFavorite={toggleFavorite}
                      onSelect={(c) => setSelectedCar(c)}
                      onCheckCar={handleOpenCarCheckWithPlate}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Орнаментальный разделитель перед футером */}
            <KyrgyzSectionDivider
              title={isKg ? 'Кыргызстандагы эң ишенимдүү автобазар' : 'Все автомобили Кыргызстана на одном портале'}
              subtitle="Бишкек, Ош, РИОМ-АВТО, Кудайберген жана бардык облустар"
            />
          </div>
        )}

        {/* Раздел автозапчастей */}
        {activeTab === 'parts' && (
          <PartsSection
            currency={currency}
            language={language}
            onOrderCreated={handleOrderCreated}
            onNavigateToCabinet={() => setActiveTab('cabinet')}
            preset={partsPreset}
            openSellerSignal={partsSellSignal}
            isSignedIn={isAuthenticated}
            onRequireAuth={(notice) => openAuth('register', notice)}
          />
        )}

        {/* Раздел Автосервис & СТО (галерея работ, прайс-лист, онлайн-запись, карта, WhatsApp) */}
        {activeTab === 'workshop' && (
          <WorkshopSection
            currency={currency}
            language={language}
            onBookingSuccess={(booking) => {
              showToast(`Запись #${booking.bookingNumber} на СТО успешно сохранена!`);
            }}
          />
        )}

        {/* Раздел акций и скидок */}
        {activeTab === 'promotions' && (
          <PromotionsSection
            language={language}
            onNavigateToWorkshop={() => setActiveTab('workshop')}
            onApplyPromo={(code) => showToast(`Промокод ${code} активирован!`)}
          />
        )}

        {/* Раздел часто задаваемых вопросов (FAQ) */}
        {activeTab === 'faq' && (
          <FaqSection
            language={language}
          />
        )}

        {/* Раздел отзывов автовладельцев */}
        {activeTab === 'reviews' && (
          <ReviewsSection language={language} />
        )}

        {/* Раздел автоновостей */}
        {activeTab === 'news' && (
          <NewsSection language={language} />
        )}

        {/* Единый Личный кабинет (вход, регистрация, управление сайтом и личный профиль) */}
        {activeTab === 'cabinet' && (
          <AccountCabinet
            cars={cars}
            favoriteCarIds={favorites}
            onToggleCarFavorite={toggleFavorite}
            onSelectCar={(c) => setSelectedCar(c)}
            onOpenAuth={(tab) => openAuth(tab)}
            onSellPart={sellPart}
            onSellCar={handleTriggerPostAd}
            onFindParts={(preset) => {
              setPartsPreset({ ...preset });
              setActiveTab('parts');
              window.scrollTo({ top: 0 });
            }}
          />
        )}
      </main>

      {/* Футер */}
      <Footer
        language={language}
        onOpenCarCheck={() => {
          setCarCheckPlate('01 KG 777 AAA');
          setIsCarCheckOpen(true);
        }}
        onOpenCustomsCalc={() => setIsCustomsCalcOpen(true)}
        onOpenCabinet={() => setActiveTab('cabinet')}
        onOpenParts={() => setActiveTab('parts')}
        onOpenWorkshop={() => setActiveTab('workshop')}
        onOpenFaq={() => setActiveTab('faq')}
        onOpenPromotions={() => setActiveTab('promotions')}
        onOpenControlPanel={staff ? () => setIsControlPanelOpen(true) : undefined}
      />

      {/* Модальная Панель Управления Сайтом */}
      <SiteControlPanelModal
        isOpen={isControlPanelOpen && staff}
        onClose={() => setIsControlPanelOpen(false)}
        currentUser={userProfile}
        onSwitchUser={() => undefined}
        cars={cars}
        onUpdateCars={(updated) => setCars(updated)}
        parts={parts}
        onUpdateParts={(updated) => setParts(updated)}
        registeredUsers={registeredUsers}
        onUpdateUsers={(updated) => setRegisteredUsers(updated)}
        siteSettings={siteSettings}
        onUpdateSiteSettings={(s) => setSiteSettings(s)}
        language={language}
        currency={currency}
      />

      {/* Модальное окно входа и регистрации в Личный кабинет (в точности как на образце) */}
      <AuthModal
        isOpen={isCabinetAuthModalOpen}
        onClose={() => {
          setIsCabinetAuthModalOpen(false);
          setAuthModalNotice(null);
        }}
        notice={authModalNotice}
        initialTab={authModalInitialTab}
        onSuccess={() => {
          showToast('Вы вошли в аккаунт');
          // Continue what the visitor wanted to do before signing in
          if (pendingPostAfterAuth) {
            setPendingPostAfterAuth(false);
            setTimeout(() => setIsAddListingOpen(true), 300);
          } else if (activeTab !== 'parts') {
            setActiveTab('cabinet');
          }
        }}
      />

      <CarDetailModal
        car={selectedCar}
        onClose={() => setSelectedCar(null)}
        currency={currency}
        language={language}
        isFavorite={selectedCar ? favorites.includes(selectedCar.id) : false}
        onToggleFavorite={toggleFavorite}
        onOpenCarCheckWithPlate={handleOpenCarCheckWithPlate}
      />

      <CarCheckModal
        isOpen={isCarCheckOpen}
        onClose={() => setIsCarCheckOpen(false)}
        language={language}
        initialPlate={carCheckPlate}
      />

      <CustomsCalculatorModal
        isOpen={isCustomsCalcOpen}
        onClose={() => setIsCustomsCalcOpen(false)}
        language={language}
      />

      <AddListingModal
        isOpen={isAddListingOpen}
        onClose={() => setIsAddListingOpen(false)}
        onSubmitted={handleCarSubmitted}
        language={language}
        currentUser={userProfile}
      />

      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favoriteCars}
        currency={currency}
        language={language}
        onRemoveFavorite={toggleFavorite}
        onSelectCar={(car) => setSelectedCar(car)}
      />

      {/* Интеллектуальный AI Автоэксперт / Чат-бот портала */}
      <AIConsultantChatbot
        language={language}
        onOpenCarCheck={handleOpenCarCheckWithPlate}
        onOpenCustomsCalc={() => setIsCustomsCalcOpen(true)}
        onOpenParts={() => setActiveTab('parts')}
      />
    </div>
  );
}
