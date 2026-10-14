import React, { useState } from 'react';
import { ShyrdakRibbon, KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { Currency, Language } from '../../types/car';
import { 
  Heart, Plus, Search, ShieldCheck, User, Menu, X, Wrench, 
  Calculator, MessageSquare, Newspaper, Tag, HelpCircle, Sun, Moon,
  Phone, MessageCircle, Shield
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  favoritesCount: number;
  userName?: string;
  userSiteRole?: 'owner' | 'admin' | 'user';
  isApprovedAdmin?: boolean;
  onOpenFavorites: () => void;
  onOpenAddListing: () => void;
  onOpenCarCheck: () => void;
  onOpenCustomsCalc: () => void;
  onOpenControlPanel?: () => void;
  onOpenCabinetAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  language,
  setLanguage,
  darkMode,
  setDarkMode,
  selectedCity,
  setSelectedCity,
  favoritesCount,
  userName = 'Амантур',
  userSiteRole = 'owner',
  isApprovedAdmin = true,
  onOpenFavorites,
  onOpenAddListing,
  onOpenCarCheck,
  onOpenCustomsCalc,
  onOpenControlPanel,
  onOpenCabinetAuth,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isKg = language === 'kg';
  const isEn = language === 'en';

  return (
    <header className="sticky top-0 z-40 bg-black border-b border-neutral-800 shadow-md transition-colors text-white">
      {/* Кыргызский орнаментальный кант (Шырдак бордюр) */}
      <ShyrdakRibbon variant="red" />

      {/* Верхняя микро-панель: Город, курс НБ КР, язык, валюта, WhatsApp, Dark Mode */}
      <div className="bg-[#0a0a0a] text-slate-300 text-xs border-b border-neutral-800">
        {/* Same container as the main row below so both rows line up on wide screens */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-neutral-400">{isKg ? 'Аймак:' : isEn ? 'Region:' : 'Регион:'}</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="Все регионы" className="bg-neutral-900 text-white">Кыргызстан (Бардык аймактар)</option>
              <option value="Бишкек" className="bg-neutral-900 text-white">Бишкек</option>
              <option value="Ош" className="bg-neutral-900 text-white">Ош</option>
              <option value="Джалал-Абад" className="bg-neutral-900 text-white">Жалал-Абад</option>
              <option value="Каракол" className="bg-neutral-900 text-white">Каракол (Ысык-Көл)</option>
              <option value="Нарын" className="bg-neutral-900 text-white">Нарын</option>
              <option value="Талас" className="bg-neutral-900 text-white">Талас</option>
              <option value="Баткен" className="bg-neutral-900 text-white">Баткен</option>
            </select>
          </div>

          <div className="hidden md:flex items-center gap-2 text-neutral-400 shrink-0">
            <span>·</span>
            <span>{isKg ? 'НБ КР курсу:' : 'Курс НБ КР:'}</span>
            <span className="text-amber-400 font-mono font-semibold">1 $ = 87.50 сом</span>
          </div>

          {/* Быстрая связь в WhatsApp */}
          <a
            href="https://wa.me/996555777999?text=Здравствуйте!%20Хочу%20проконсультироваться%20по%20порталу%20KGzone"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold shrink-0"
          >
            <MessageCircle size={13} />
            <span>WhatsApp: +996 555 777 999</span>
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Панель управления сайтом (Прямой доступ) */}
          {onOpenControlPanel && (
            <button
              onClick={onOpenControlPanel}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-black transition-all cursor-pointer shrink-0 shadow-xs"
              title="Открыть Панель Управления Сайтом KGzone"
            >
              <Shield size={13} className="text-amber-400" />
              <span>Панель управления</span>
            </button>
          )}

          {/* Переключатель темы Dark / Light */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-700/60"
            title={darkMode ? 'Светлая тема' : 'Тёмная тема'}
            aria-label="Переключить тему"
          >
            {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-neutral-300" />}
          </button>

          {/* Валюта */}
          <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                currency === 'USD' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              USD $
            </button>
            <button
              onClick={() => setCurrency('KGS')}
              className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                currency === 'KGS' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              СОМ 
            </button>
          </div>

          {/* Язык RU / KG / EN */}
          <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800">
            <button
              onClick={() => setLanguage('ru')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                language === 'ru' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => setLanguage('kg')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                language === 'kg' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              KG
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                language === 'en' ? 'bg-neutral-700 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Основная зона навигации (Strict 3-zone contract) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Zone 1: Brand title / wordmark */}
        <button
          onClick={() => setActiveTab('cars')}
          className="flex items-center gap-2 text-left cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded bg-[#C8102E] flex items-center justify-center text-white font-black text-xl shadow-xs group-hover:bg-[#a60d26] transition-colors">
            <KochkorMuyuzIcon size={24} color="#FFFFFF" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              KG<span className="text-amber-400">zone</span>
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-3.5 text-[13px] font-semibold">
          <button
            onClick={() => setActiveTab('cars')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 cursor-pointer ${
              activeTab === 'cars'
                ? 'text-white border-white'
                : 'text-neutral-300 border-transparent hover:text-white hover:border-white/50'
            }`}
          >
            {isKg ? 'Автоунаалар' : isEn ? 'Cars' : 'Автомобили'}
          </button>

          <button
            onClick={() => setActiveTab('workshop')}
            className={`flex items-center gap-1.5 whitespace-nowrap transition-colors pb-1 border-b-2 cursor-pointer ${
              activeTab === 'workshop'
                ? 'text-white border-white'
                : 'text-neutral-300 border-transparent hover:text-white hover:border-white/50'
            }`}
          >
            <Wrench size={15} className="text-amber-300" />
            <span>{isKg ? 'Автосервис & СТО' : isEn ? 'Workshop' : 'СТО & Сервис'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          
          <button
            onClick={onOpenCarCheck}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-white whitespace-nowrap transition-colors pb-1 border-b-2 border-transparent hover:border-white/50 cursor-pointer"
          >
            <ShieldCheck size={16} className="text-emerald-300" />
            <span>CarCheck KG</span>
          </button>

          <button
            onClick={() => setActiveTab('parts')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 cursor-pointer ${
              activeTab === 'parts'
                ? 'text-white border-white'
                : 'text-neutral-300 border-transparent hover:text-white hover:border-white/50'
            }`}
          >
            {isKg ? 'Тетиктер (Запчасти)' : isEn ? 'Parts' : 'Автозапчасти'}
          </button>

          <button
            onClick={() => setActiveTab('promotions')}
            className={`flex items-center gap-1 whitespace-nowrap transition-colors pb-1 border-b-2 cursor-pointer ${
              activeTab === 'promotions'
                ? 'text-white border-white'
                : 'text-neutral-300 border-transparent hover:text-white hover:border-white/50'
            }`}
          >
            <Tag size={14} className="text-amber-300" />
            <span>{isKg ? 'Акциялар' : isEn ? 'Deals' : 'Акции'}</span>
          </button>

          <button
            onClick={onOpenCustomsCalc}
            className="text-neutral-300 hover:text-white whitespace-nowrap transition-colors pb-1 border-b-2 border-transparent hover:border-white/50 cursor-pointer"
          >
            {isKg ? 'Бажы калькулятору' : 'Растаможка КР'}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 cursor-pointer ${
              activeTab === 'reviews'
                ? 'text-white border-white'
                : 'text-neutral-300 border-transparent hover:text-white hover:border-white/50'
            }`}
          >
            {isKg ? 'Пикирлер' : isEn ? 'Reviews' : 'Отзывы'}
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`whitespace-nowrap transition-colors pb-1 border-b-2 cursor-pointer ${
              activeTab === 'faq'
                ? 'text-white border-white'
                : 'text-neutral-300 border-transparent hover:text-white hover:border-white/50'
            }`}
          >
            FAQ
          </button>
        </nav>

        {/* Zone 3: Actions (Control Panel, Personal Cabinet, Favorites, Post Ad) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Личный кабинет */}
          <button
            onClick={() => {
              if (onOpenCabinetAuth) {
                onOpenCabinetAuth();
              } else {
                setActiveTab('cabinet');
              }
            }}
            className={`flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border transition-all cursor-pointer group shrink-0 ${
              activeTab === 'cabinet'
                ? 'bg-neutral-900 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 hover:border-neutral-500 shadow-sm'
            }`}
            title="Личный кабинет"
          >
            {/* Желтый / золотой контурный значок пользователя */}
            <User size={20} className="text-amber-400 shrink-0 group-hover:scale-105 transition-transform" strokeWidth={1.8} />

            {/* Две строки: Личный \n кабинет жирным белым шрифтом */}
            <div className="flex flex-col text-left leading-[1.15]">
              <span className="text-white font-black text-xs sm:text-sm tracking-tight">Личный</span>
              <span className="text-white font-black text-xs sm:text-sm tracking-tight">кабинет</span>
            </div>
          </button>

          {/* Избранное */}
          <button
            onClick={onOpenFavorites}
            className="relative p-2 text-neutral-300 hover:text-white transition-colors rounded-lg hover:bg-neutral-800 cursor-pointer"
            title={isKg ? 'Сакталгандар' : 'Избранное'}
            aria-label="Избранное"
          >
            <Heart size={20} className={favoritesCount > 0 ? 'fill-red-400 text-red-400' : ''} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#C8102E] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Подать объявление */}
          <button
            onClick={onOpenAddListing}
            title={isKg ? 'Жарыя берүү' : 'Подать объявление'}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus size={16} />
            <span className="xl:hidden 2xl:inline">{isKg ? 'Жарыя берүү' : 'Подать объявление'}</span>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-white hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Меню навигации"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-black text-white border-t border-neutral-800 px-4 py-3 shadow-2xl space-y-2 animate-in slide-in-from-top duration-150">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-neutral-800">
            <button
              onClick={() => {
                setActiveTab('cars');
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
                activeTab === 'cars' ? 'bg-[#C8102E] text-white' : 'bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800'
              }`}
            >
              <Search size={15} />
              <span>Автомобили</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('workshop');
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'workshop' ? 'bg-[#C8102E] text-white' : 'bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800'
              }`}
            >
              <Wrench size={15} />
              <span>Автосервис & СТО</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('parts');
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'parts' ? 'bg-[#C8102E] text-white' : 'bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800'
              }`}
            >
              <Wrench size={15} />
              <span>Запчасти</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('promotions');
                setMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'promotions' ? 'bg-[#C8102E] text-white' : 'bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800'
              }`}
            >
              <Tag size={15} />
              <span>Акции и скидки</span>
            </button>

            <button
              onClick={() => {
                onOpenCarCheck();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 bg-neutral-900 text-emerald-400 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <ShieldCheck size={15} />
              <span>CarCheck KG</span>
            </button>

            <button
              onClick={() => {
                onOpenCustomsCalc();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl text-left text-xs font-bold flex items-center gap-2 bg-neutral-900 text-amber-400 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            >
              <Calculator size={15} />
              <span>Растаможка</span>
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <button
              onClick={() => {
                if (onOpenCabinetAuth) onOpenCabinetAuth();
                setActiveTab('cabinet');
                setMobileMenuOpen(false);
              }}
              className={`w-full p-3 rounded-2xl text-left border flex items-center gap-3 transition-colors ${
                activeTab === 'cabinet'
                  ? 'bg-neutral-900 border-amber-400 text-white shadow-md'
                  : 'bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800'
              }`}
            >
              <User size={22} className="text-amber-400 shrink-0" strokeWidth={1.8} />
              <div className="flex flex-col text-left leading-[1.15]">
                <span className="text-white font-black text-sm tracking-tight">Личный</span>
                <span className="text-white font-black text-sm tracking-tight">кабинет</span>
              </div>
            </button>

            {/* Панель управления сайтом в мобильном меню */}
            {onOpenControlPanel && (
              <button
                onClick={() => {
                  onOpenControlPanel();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl text-left text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Shield size={16} className="text-amber-400" />
                <span>Панель управления сайтом</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('reviews');
                setMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2.5 transition-colors"
            >
              <MessageSquare size={16} />
              <span>Отзывы и рейтинги</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('faq');
                setMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2.5 transition-colors"
            >
              <HelpCircle size={16} />
              <span>Часто задаваемые вопросы (FAQ)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('news');
                setMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 flex items-center gap-2.5 transition-colors"
            >
              <Newspaper size={16} />
              <span>Автоновости КР</span>
            </button>

            <button
              onClick={() => {
                onOpenAddListing();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 py-3 bg-[#C8102E] hover:bg-[#a60d26] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Подать объявление о продаже</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
