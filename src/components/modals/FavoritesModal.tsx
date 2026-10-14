import React from 'react';
import { Car, Currency, Language } from '../../types/car';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { KyrgyzPlateBadge } from '../ornaments/KyrgyzOrnaments';
import { X, Heart, Trash2, ExternalLink } from 'lucide-react';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Car[];
  currency: Currency;
  language: Language;
  onRemoveFavorite: (id: string) => void;
  onSelectCar: (car: Car) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  currency,
  language,
  onRemoveFavorite,
  onSelectCar,
}) => {
  if (!isOpen) return null;

  const isKg = language === 'kg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Heart size={18} className="fill-red-500 text-red-500" />
            <h3 className="font-bold text-base">
              {isKg ? 'Сакталган автоунаалар' : 'Избранные объявления'} ({favorites.length})
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Список */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart size={44} className="mx-auto text-slate-300 stroke-1 mb-3" />
              <div className="font-bold text-slate-800 text-base">Список избранного пуст</div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Нажимайте на сердечко в карточках объявлений, чтобы сохранить понравившиеся автомобили
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((car) => {
                const priceSom = Math.round(car.priceUsd * USD_TO_KGS_RATE);
                return (
                  <div
                    key={car.id}
                    onClick={() => {
                      onSelectCar(car);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 bg-slate-900 rounded-lg overflow-hidden shrink-0">
                        {car.image ? (
                          <img
                            src={car.image}
                            alt={car.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                            Авто
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{car.title}</h4>
                        <div className="text-xs font-semibold text-[#C8102E] mt-0.5">
                          ${car.priceUsd.toLocaleString()} · {priceSom.toLocaleString('ru-RU')} сом
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {car.city} · {car.year} г. · {car.transmission} · {car.steering} руль
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFavorite(car.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
