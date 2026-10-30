import { isDemoListing, DEMO_NOTICE, isVip } from '../../utils/demo';
import React from 'react';
import { Car, Currency, Language } from '../../types/car';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { KyrgyzPlateBadge, KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { CarImagePreview } from '../common/CarImagePreview';
import { Heart, MapPin, Eye, Check } from 'lucide-react';

interface CarCardProps {
  car: Car;
  currency: Currency;
  language: Language;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (car: Car) => void;
  onCheckCar: (plate: string) => void;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  currency,
  language,
  isFavorite,
  onToggleFavorite,
  onSelect,
  onCheckCar,
}) => {
  const isKg = language === 'kg';
  const priceSom = Math.round(car.priceUsd * USD_TO_KGS_RATE);

  const formattedPriceUsd = car.priceUsd.toLocaleString('ru-RU');
  const formattedPriceSom = priceSom.toLocaleString('ru-RU');

  return (
    <div
      onClick={() => onSelect(car)}
      className="group bg-white rounded-xl border border-slate-200/90 hover:border-red-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden cursor-pointer relative"
    >
      {/* Контейнер изображения авто */}
      <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
        <CarImagePreview
          src={car.image}
          alt={car.title}
          bodyType={car.bodyType}
          brand={car.brand}
        />

        {isVip(car) && (
          <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-amber-400 text-neutral-950 text-[10px] font-black">VIP</span>
        )}
        {isDemoListing(car.id) && (
          <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-black" title={DEMO_NOTICE}>
            Пример
          </span>
        )}

        {/* Кнопка "В избранное" */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(car.id);
          }}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xs flex items-center justify-center text-white transition-all cursor-pointer"
          title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        >
          <Heart
            size={17}
            className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
          />
        </button>

        {/* Автономер Кыргызстана поверх фото */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <KyrgyzPlateBadge plate={car.plateNumber} />
        </div>

      </div>

      {/* Основная информация карточки */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Заголовок объявления */}
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-[#C8102E] transition-colors">
            {car.title}
          </h3>

          {/* Цены: USD и KGS */}
          <div className="mt-1.5 flex items-baseline gap-2">
            {currency === 'USD' ? (
              <>
                <span className="text-lg font-black text-slate-950 tabular-nums">
                  ${formattedPriceUsd}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {formattedPriceSom} сом
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-black text-[#C8102E] tabular-nums">
                  {formattedPriceSom} сом
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  ${formattedPriceUsd}
                </span>
              </>
            )}
          </div>

          {/* Небоксовые метаданные с типографическими разделителями (Zero-pill) */}
          <div className="mt-2.5 text-xs text-slate-600 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>{car.year} г.</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{car.engineVolume > 0 ? `${car.engineVolume} л` : 'Электро'}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{car.powerHp} л.с.</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{car.fuelType}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{car.transmission}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className={car.steering === 'Правый' ? 'text-amber-700 font-semibold' : ''}>
              {car.steering} руль
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="tabular-nums">{car.mileageKm.toLocaleString('ru-RU')} км</span>
          </div>
        </div>

        {/* Нижняя часть карточки: Город, растаможка и время */}
        <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 text-slate-700 font-medium">
            <MapPin size={13} className="text-[#C8102E] shrink-0" />
            <span className="truncate max-w-[130px]">{car.city}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              {car.customs}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
