import React, { useState } from 'react';
import { ALL_CAR_BRANDS, getModelsForBrand, KYRGYZ_REGIONS_AND_CITIES, useCarCatalog } from '../../data/mockData';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import { Currency, Language } from '../../types/car';
import {
  Search,
  RotateCcw,
  ShieldCheck,
  Calculator,
  Wrench,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  DollarSign,
  SlidersHorizontal,
  X,
  Sparkles,
  Zap,
  Flame,
  Check,
} from 'lucide-react';
import { AllBrandsModal } from '../common/AllBrandsModal';

interface FilterState {
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

interface HeroFilterProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalCount: number;
  currency: Currency;
  language: Language;
  onReset: () => void;
  onOpenCarCheck: () => void;
  onOpenCustomsCalc: () => void;
  onOpenParts?: () => void;
}

export const HeroFilter: React.FC<HeroFilterProps> = ({
  filters,
  setFilters,
  totalCount,
  currency,
  language,
  onReset,
  onOpenCarCheck,
  onOpenCustomsCalc,
  onOpenParts,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAllBrandsModalOpen, setIsAllBrandsModalOpen] = useState(false);
  const isKg = language === 'kg';
  const isUsd = currency === 'USD';

  useCarCatalog();
  const availableModels = getModelsForBrand(filters.brand);

  const handleBrandChange = (brand: string) => {
    setFilters((prev) => ({
      ...prev,
      brand: prev.brand === brand ? '' : brand,
      model: '',
    }));
  };

  const setPricePreset = (maxUsd: number) => {
    const maxVal = isUsd ? maxUsd.toString() : (maxUsd * 87.5).toString();
    setFilters((prev) => ({
      ...prev,
      priceTo: prev.priceTo === maxVal ? '' : maxVal,
    }));
  };

  const scrollToResults = () => {
    const el = document.getElementById('listings-grid-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative bg-slate-900 border-b border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
      {/* Background Ornament Accents */}
      <div className="absolute top-0 right-10 opacity-5 pointer-events-none text-red-500">
        <TundukIcon size={240} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 
          1. TOP ROW: Quick Service Links & Quick Category Tabs
        */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1 md:pb-0">
            {[
              { id: 'all', label: isKg ? 'Бардык унаалар' : 'Все авто', count: totalCount },
              { id: 'green', label: isKg ? '⚡ Электро & Гибрид' : '⚡ Электро & Гибриды' },
              { id: 'new', label: isKg ? '✨ Жаңы 2024-2026' : '✨ Новые авто' },
              { id: 'used', label: isKg ? 'Жүргөн авто' : 'С пробегом' },
            ].map((tab) => {
              const isActive = filters.typeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilters((p) => ({ ...p, typeTab: tab.id as any }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#C8102E] text-white shadow-md shadow-red-950/40 ring-1 ring-red-400/40'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Service Action Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              onClick={onOpenCarCheck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900 transition-all font-semibold cursor-pointer shadow-xs"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{isKg ? 'CarCheck KG' : 'Проверить CarCheck'}</span>
            </button>

            <button
              onClick={onOpenCustomsCalc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/80 hover:bg-amber-900 transition-all font-semibold cursor-pointer shadow-xs"
            >
              <Calculator size={14} className="text-amber-400" />
              <span>{isKg ? 'Бажы калькулятору' : 'Растаможка 2026'}</span>
            </button>

            {onOpenParts && (
              <button
                onClick={onOpenParts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800/80 hover:bg-blue-900 transition-all font-semibold cursor-pointer shadow-xs"
              >
                <Wrench size={14} className="text-blue-400" />
                <span>{isKg ? 'Кудайберген тетиктер' : 'Запчасти'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 
          2. MAIN SEARCH CONSOLE CARD
          Modern, unified search panel with high contrast and intuitive layout
        */}
        <div className="bg-slate-800/90 border border-slate-700/90 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
          {/* Main 5-Column Search Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Марка */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {isKg ? 'Марка' : 'Марка'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAllBrandsModalOpen(true)}
                  className="text-[11px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                >
                  Все ({ALL_CAR_BRANDS.length})
                </button>
              </div>
              <div className="relative">
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters((p) => ({ ...p, brand: e.target.value, model: '' }))}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C8102E] cursor-pointer appearance-none pr-8"
                >
                  <option value="" className="bg-slate-900 text-slate-300">
                    {isKg ? 'Бардык маркалар' : 'Любая марка'}
                  </option>
                  {ALL_CAR_BRANDS.map((b) => (
                    <option key={b} value={b} className="bg-slate-900 text-white">
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. Модель */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                {isKg ? 'Модель' : 'Модель'}
              </label>
              <div className="relative">
                <select
                  value={filters.model}
                  onChange={(e) => setFilters((p) => ({ ...p, model: e.target.value }))}
                  disabled={!filters.brand}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C8102E] cursor-pointer disabled:bg-slate-900/50 disabled:text-slate-500 appearance-none pr-8"
                >
                  <option value="" className="bg-slate-900 text-slate-300">
                    {filters.brand
                      ? isKg ? 'Бардык моделдер' : 'Все модели'
                      : isKg ? 'Адегенде марканы тандаңыз' : 'Сначала марку'}
                  </option>
                  {availableModels.map((m) => (
                    <option key={m} value={m} className="bg-slate-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. Цена до */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  {isKg ? 'Баасы' : 'Цена до'}, {currency}
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPricePreset(15000)}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    $15k
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setPricePreset(30000)}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    $30k
                  </button>
                </div>
              </div>
              <input
                type="number"
                placeholder={isKg ? 'Чектөөсүз' : 'До...'}
                value={filters.priceTo}
                onChange={(e) => setFilters((p) => ({ ...p, priceTo: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
              />
            </div>

            {/* 4. Год от */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                {isKg ? 'Жылы баштап' : 'Год от'}
              </label>
              <div className="relative">
                <select
                  value={filters.yearFrom}
                  onChange={(e) => setFilters((p) => ({ ...p, yearFrom: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#C8102E] cursor-pointer appearance-none pr-8"
                >
                  <option value="" className="bg-slate-900 text-slate-300">
                    Любой год
                  </option>
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2018, 2015, 2010, 2005].map((y) => (
                    <option key={y} value={y.toString()} className="bg-slate-900 text-white">
                      {y} и новее
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 5. Кнопка поиска с динамическим счетчиком */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={scrollToResults}
                className="w-full py-2.5 px-4 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-950/60 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer h-[42px]"
              >
                <Search size={16} />
                <span>
                  {isKg ? 'Табуу' : 'Показать'} ({totalCount} авто)
                </span>
              </button>
            </div>
          </div>


          {/* 
            4. ADVANCED FILTERS DRAWER TOGGLE
          */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal size={14} className="text-red-400" />
              <span>
                {showAdvanced
                  ? isKg ? 'Кыскартуу ▲' : 'Скрыть дополнительные фильтры ▲'
                  : isKg ? 'Көбүрөөк параметрлер (КПП, руль, күйүүчү май, кузов) ▼' : 'Больше параметров (КПП, руль, топливо, кузов) ▼'}
              </span>
            </button>

            {(filters.brand || filters.model || filters.priceTo || filters.yearFrom || filters.city || filters.bodyType || filters.transmission || filters.fuelType) && (
              <button
                type="button"
                onClick={onReset}
                className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{isKg ? 'Чыпкаларды тазалоо' : 'Сбросить все фильтры'}</span>
              </button>
            )}
          </div>

          {/* ADVANCED PARAMETERS PANEL */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fadeIn">
              {/* Город / Регион */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Регион / Город
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Весь Кыргызстан</option>
                  <option value="Бишкек">г. Бишкек (01)</option>
                  <option value="Ош">г. Ош (02)</option>
                  <option value="Военно-Антоновка (РИОМ-АВТО)">РИОМ-АВТО</option>
                  <option value="Токмок">г. Токмок (08)</option>
                  <option value="Каракол">г. Каракол (09)</option>
                  <option value="Джалал-Абад">г. Джалал-Абад (03)</option>
                </select>
              </div>

              {/* Коробка передач */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  КПП
                </label>
                <select
                  value={filters.transmission}
                  onChange={(e) => setFilters((p) => ({ ...p, transmission: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Любая КПП</option>
                  <option value="Автомат">Автомат</option>
                  <option value="Вариатор">Вариатор</option>
                  <option value="Робот">Робот</option>
                  <option value="Механика">Механика</option>
                </select>
              </div>

              {/* Руль */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Руль
                </label>
                <select
                  value={filters.steering}
                  onChange={(e) => setFilters((p) => ({ ...p, steering: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Любой руль</option>
                  <option value="Левый">Левый руль</option>
                  <option value="Правый">Правый руль</option>
                </select>
              </div>

              {/* Топливо */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Топливо
                </label>
                <select
                  value={filters.fuelType}
                  onChange={(e) => setFilters((p) => ({ ...p, fuelType: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Любое топливо</option>
                  <option value="Бензин">Бензин</option>
                  <option value="Гибрид">Гибрид</option>
                  <option value="Электро">Электро</option>
                  <option value="Дизель">Дизель</option>
                  <option value="Газ-бензин">Газ-бензин</option>
                </select>
              </div>

              {/* Кузов */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Кузов
                </label>
                <select
                  value={filters.bodyType}
                  onChange={(e) => setFilters((p) => ({ ...p, bodyType: e.target.value }))}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="">Любой кузов</option>
                  <option value="Седан">Седан</option>
                  <option value="Кроссовер">Кроссовер</option>
                  <option value="Внедорожник">Внедорожник</option>
                  <option value="Хэтчбек">Хэтчбек</option>
                  <option value="Лифтбек">Лифтбек</option>
                  <option value="Минивэн">Минивэн</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal with all 210+ car brands */}
      <AllBrandsModal
        isOpen={isAllBrandsModalOpen}
        onClose={() => setIsAllBrandsModalOpen(false)}
        onSelectBrand={(selected) => {
          handleBrandChange(selected);
          setIsAllBrandsModalOpen(false);
        }}
        selectedBrand={filters.brand}
        title={isKg ? 'Бардык авто маркалар (210+)' : 'Все марки автомобилей (210+)'}
      />
    </div>
  );
};
