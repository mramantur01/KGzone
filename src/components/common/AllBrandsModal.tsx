import React, { useState, useMemo } from 'react';
import { ALL_CAR_BRANDS, POPULAR_BRANDS } from '../../data/mockData';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { X, Search, Check } from 'lucide-react';

interface AllBrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  title?: string;
}

export const AllBrandsModal: React.FC<AllBrandsModalProps> = ({
  isOpen,
  onClose,
  selectedBrand,
  onSelectBrand,
  title = 'Все марки автомобилей',
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'countries' | 'alphabet'>('countries');

  if (!isOpen) return null;

  const BRANDS_BY_COUNTRY: Record<string, { flag: string; brands: string[] }> = {
    'Япония': {
      flag: '🇯🇵',
      brands: ['Toyota', 'Lexus', 'Honda', 'Nissan', 'Mitsubishi', 'Mazda', 'Subaru', 'Suzuki', 'Daihatsu', 'Infiniti'],
    },
    'Южная Корея': {
      flag: '🇰🇷',
      brands: ['Hyundai', 'Kia', 'Genesis', 'Daewoo', 'SsangYong'],
    },
    'Германия': {
      flag: '🇩🇪',
      brands: ['Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Opel', 'Porsche'],
    },
    'Китай': {
      flag: '🇨🇳',
      brands: ['BYD', 'Zeekr', 'Li Auto', 'Geely', 'Haval', 'Chery', 'Changan', 'JAC', 'Exeed', 'Tank', 'Voyah', 'Jetour', 'Hongqi'],
    },
    'США': {
      flag: '🇺🇸',
      brands: ['Ford', 'Chevrolet', 'Jeep', 'Tesla', 'Cadillac', 'Dodge', 'Chrysler', 'GMC', 'Lincoln'],
    },
    'Россия и СНГ': {
      flag: '🇷🇺',
      brands: ['Lada / ВАЗ', 'ГАЗ', 'УАЗ', 'Москвич'],
    },
    'Европа': {
      flag: '🇪🇺',
      brands: ['Land Rover', 'Renault', 'Peugeot', 'Skoda', 'Volvo', 'Fiat', 'Seat', 'Jaguar'],
    },
  };

  // Группировка брендов по первой букве
  const groupedBrands = useMemo(() => {
    const filtered = ALL_CAR_BRANDS.filter((b) =>
      b.toLowerCase().includes(search.toLowerCase().trim())
    );

    const groups: Record<string, string[]> = {};
    filtered.forEach((b) => {
      const firstChar = b.charAt(0).toUpperCase();
      const letter = /^[0-9]/.test(firstChar) ? '#' : firstChar;
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(b);
    });

    // Сортировка групп (латиница, затем кириллица)
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .map((letter) => ({
        letter,
        brands: groups[letter].sort((a, b) => a.localeCompare(b, 'ru')),
      }));
  }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C8102E] flex items-center justify-center text-white">
              <KochkorMuyuzIcon size={18} color="#FFFFFF" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {title} ({ALL_CAR_BRANDS.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Полный каталог всех мировых и отечественных брендов
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Поиск бренда */}
        <div className="p-4 sm:p-6 pb-2 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Быстрый поиск марки (например: Toyota, Zeekr, Лада, BMW, Audi, ГАЗ)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#C8102E]"
            />
          </div>

          {/* Быстрые популярные марки */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 font-medium whitespace-nowrap">Популярные в КР:</span>
            {['Toyota', 'Lexus', 'Honda', 'Mercedes-Benz', 'BMW', 'Hyundai', 'Kia', 'BYD', 'Zeekr', 'Li Auto', 'Volkswagen', 'Лада', 'Daewoo'].map((b) => (
              <button
                key={b}
                onClick={() => {
                  onSelectBrand(b);
                  onClose();
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedBrand === b
                    ? 'bg-[#C8102E] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Вкладки: По странам / По алфавиту */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('countries')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'countries'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              🌍 По странам происхождения
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('alphabet')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'alphabet'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              🔤 По алфавиту (A-Z)
            </button>
          </div>
        </div>

        {/* Каталог брендов */}
        <div className="p-4 sm:p-6 max-h-[62vh] overflow-y-auto space-y-6">
          {activeTab === 'countries' && !search ? (
            /* Группировка по странам происхождения */
            Object.entries(BRANDS_BY_COUNTRY).map(([country, { flag, brands }]) => (
              <div key={country} className="pb-4 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg">{flag}</span>
                  <h4 className="font-bold text-sm text-slate-900">{country}</h4>
                  <span className="text-[11px] text-slate-500 font-medium">({brands.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                  {brands.map((brand) => {
                    const isSelected = selectedBrand === brand;
                    return (
                      <button
                        key={brand}
                        onClick={() => {
                          onSelectBrand(brand);
                          onClose();
                        }}
                        className={`p-2.5 rounded-xl text-left font-medium transition-all cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? 'bg-[#C8102E] text-white border-[#C8102E] shadow-xs font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span className="truncate">{brand}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            /* Алфавитный указатель */
            groupedBrands.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                Марка по запросу «{search}» не найдена
              </div>
            ) : (
              groupedBrands.map(({ letter, brands }) => (
                <div key={letter} className="flex flex-col sm:flex-row gap-2 sm:gap-6 pb-4 border-b border-slate-100 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {letter}
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                    {brands.map((brand) => {
                      const isSelected = selectedBrand === brand;
                      return (
                        <button
                          key={brand}
                          onClick={() => {
                            onSelectBrand(brand);
                            onClose();
                          }}
                          className={`p-2 rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#C8102E] text-white shadow-xs font-bold'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className="truncate">{brand}</span>
                          {isSelected && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
