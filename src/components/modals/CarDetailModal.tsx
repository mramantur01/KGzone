import React, { useEffect, useState } from 'react';
import { Car, Currency, Language } from '../../types/car';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { KyrgyzPlateBadge, KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { CarImagePreview } from '../common/CarImagePreview';
import { ReportListingButton } from '../common/ReportListingButton';
import { SellerContactBlock } from '../chat/SellerContactBlock';
import { recordView, recordContact } from '../../utils/viewHistory';
import {
  X,
  Phone,
  MessageCircle,
  ShieldCheck,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  Compass,
  CheckCircle2,
  Share2,
  Heart,
  Calculator,
} from 'lucide-react';

interface CarDetailModalProps {
  car: Car | null;
  onClose: () => void;
  currency: Currency;
  language: Language;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenCarCheckWithPlate: (plate: string) => void;
}

export const CarDetailModal: React.FC<CarDetailModalProps> = ({
  car,
  onClose,
  currency,
  language,
  isFavorite,
  onToggleFavorite,
  onOpenCarCheckWithPlate,
}) => {
  const [showPhone, setShowPhone] = useState(false);
  const [loanDownPaymentPercent, setLoanDownPaymentPercent] = useState(30);
  const [loanYears, setLoanYears] = useState(3);
  const [copiedLink, setCopiedLink] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setPhotoIndex(0);
    if (car) recordView({ kind: 'car', id: car.id, title: car.title, image: car.image, price: `$${car.priceUsd.toLocaleString('ru-RU')}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car?.id]);

  if (!car) return null;

  const photos = car.photos?.length ? car.photos : car.image ? [car.image] : [];
  const mainPhoto = photos[Math.min(photoIndex, photos.length - 1)] || car.image;

  const isKg = language === 'kg';
  const priceSom = Math.round(car.priceUsd * USD_TO_KGS_RATE);
  const formattedPriceUsd = car.priceUsd.toLocaleString('ru-RU');
  const formattedPriceSom = priceSom.toLocaleString('ru-RU');

  // Расчет кредита по ставкам банков КР (~18% годовых в сомах)
  const downPaymentSom = Math.round((priceSom * loanDownPaymentPercent) / 100);
  const loanPrincipalSom = priceSom - downPaymentSom;
  const annualInterestRate = 0.18;
  const monthlyRate = annualInterestRate / 12;
  const totalMonths = loanYears * 12;
  const monthlyPaymentSom = Math.round(
    (loanPrincipalSom * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
      (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const cleanPhone = car.sellerPhone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Саламатсызбы! Мен сиздин KGzone сайтындагы ${car.title} (${car.year} г., $${formattedPriceUsd}) жарыяңыз боюнча байланышып жатам.`
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#C8102E] flex items-center justify-center text-white">
              <KochkorMuyuzIcon size={16} color="#FFFFFF" />
            </div>
            <span className="font-bold text-sm tracking-wide">
              {car.brand} {car.model} · {car.year}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(car.id)}
              className="p-1.5 text-slate-300 hover:text-red-400 rounded-md transition-colors cursor-pointer"
              title="В избранное"
            >
              <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1.5 text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Поделиться"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Уведомление о скопированной ссылке */}
        {copiedLink && (
          <div className="bg-emerald-600 text-white text-xs py-1 text-center font-medium">
            Ссылка на автомобиль скопирована в буфер обмена!
          </div>
        )}

        {/* Тело модалки */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          {/* Верхняя строка: Заголовок и Цена */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {car.plateNumber && <KyrgyzPlateBadge plate={car.plateNumber} />}
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {car.customs}
                </span>
                {car.isUrgent && (
                  <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Срочно
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {car.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                <MapPin size={14} className="text-[#C8102E]" />
                <span>{car.city}{car.sellerLocation && car.sellerLocation !== car.city ? ` (${car.sellerLocation})` : ''}</span>
                <span>·</span>
                <span>Опубликовано: {car.publishedDate}</span>
                <span>·</span>
                <span>Просмотров: {car.viewsCount}</span>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-2xl sm:text-3xl font-black text-[#C8102E] tabular-nums">
                ${formattedPriceUsd}
              </div>
              <div className="text-sm font-semibold text-slate-700 tabular-nums">
                {formattedPriceSom} сом
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                по курсу НБ КР 87.50
              </div>
            </div>
          </div>

          {car.sellerId && (
            <div className="mb-6">
              <SellerContactBlock kind="cars" listingId={car.id} listingTitle={car.title} sellerId={car.sellerId} />
            </div>
          )}

          {/* Галерея / Главное фото */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2 rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-16/9 bg-slate-900 relative">
              <CarImagePreview
                key={mainPhoto}
                src={mainPhoto}
                alt={car.title}
                bodyType={car.bodyType}
                brand={car.brand}
                aspectRatio="16/9"
              />
              {photos.length > 1 && (
                <span className="absolute right-2 bottom-2 z-10 text-[11px] font-bold bg-black/60 text-white px-2 py-0.5 rounded">
                  {Math.min(photoIndex, photos.length - 1) + 1} / {photos.length}
                </span>
              )}
            </div>
            {car.photoCredit && (
              <p className="md:col-span-2 md:row-start-3 -mt-2 text-[10px] text-slate-400">
                Фото модели для примера:{' '}
                <a href={car.photoCredit.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600" data-no-i18n>
                  {car.photoCredit.text}
                </a>
              </p>
            )}
            {photos.length > 1 && (
              <div className="md:col-span-2 md:row-start-2 flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setPhotoIndex(i)}
                    className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 cursor-pointer ${i === photoIndex ? 'border-[#C8102E]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Карточка контактов продавца (Quick Action) */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                  Продавец
                </div>
                <div className="text-base font-bold text-slate-900">{car.sellerName}</div>
                <div className="text-xs text-slate-600 mt-0.5">{car.sellerLocation}</div>

                {/* Блок CarCheck */}
                <div className={`mt-4 p-3 bg-white rounded-lg border ${car.hasCarCheckPass ? 'border-emerald-200' : 'border-amber-200'}`}>
                  <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${car.hasCarCheckPass ? 'text-emerald-800' : 'text-amber-800'}`}>
                    <ShieldCheck size={16} className={car.hasCarCheckPass ? 'text-emerald-600' : 'text-amber-500'} />
                    <span>Проверка CarCheck KG</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {car.hasCarCheckPass
                      ? 'Автомобиль проверен администрацией KGzone.'
                      : 'Автомобиль ещё не проверялся. Перед покупкой проверьте госномер и VIN на аресты и залоги.'}
                  </p>
                  <button
                    onClick={() => onOpenCarCheckWithPlate(car.plateNumber)}
                    className="mt-2 w-full py-1 text-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors cursor-pointer"
                  >
                    Посмотреть полный отчет →
                  </button>
                </div>
                <ReportListingButton kind="car" listingId={car.id} listingTitle={car.title} className="mt-3 !text-slate-500" />
              </div>

              {/* Кнопки связи */}
              <div className="mt-4 space-y-2">
                {showPhone ? (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Phone size={16} />
                    <span className="font-mono">{car.sellerPhone}</span>
                  </a>
                ) : (
                  <button
                    onClick={() => { setShowPhone(true); recordContact('car', car.id); }}
                    className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Phone size={16} />
                    <span>Показать телефон</span>
                  </button>
                )}

                <a
                  href={whatsappUrl}
                  onClick={() => recordContact('car', car.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <MessageCircle size={16} />
                  <span>Написать в WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Таблица технических характеристик (Как на Drom.ru) */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 mb-3 pb-1 border-b border-slate-200">
              Характеристики автомобиля
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Двигатель:</span>
                <span className="font-medium text-slate-900">
                  {car.engineVolume > 0 ? `${car.engineVolume} л / ${car.powerHp} л.с.` : `Электро / ${car.powerHp} л.с.`}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Топливо:</span>
                <span className="font-medium text-slate-900">{car.fuelType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Коробка передач:</span>
                <span className="font-medium text-slate-900">{car.transmission}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Привод:</span>
                <span className="font-medium text-slate-900">{car.drive}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Руль:</span>
                <span className={`font-semibold ${car.steering === 'Правый' ? 'text-amber-800' : 'text-slate-900'}`}>
                  {car.steering}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Пробег:</span>
                <span className="font-medium text-slate-900 tabular-nums">{car.mileageKm.toLocaleString('ru-RU')} км</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Кузов:</span>
                <span className="font-medium text-slate-900">{car.bodyType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Цвет:</span>
                <span className="font-medium text-slate-900">{car.color}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Таможня:</span>
                <span className="font-semibold text-emerald-700">{car.customs}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Госномер:</span>
                <span className="font-mono font-bold text-slate-900">{car.plateNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">VIN / Номер кузова:</span>
                <span className="font-mono text-slate-700">{car.vin}</span>
              </div>
            </div>
          </div>

          {/* Комплектация и опции */}
          {car.features && car.features.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-slate-900 mb-2">Комплектация и оснащение</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {car.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Описание от продавца */}
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Описание продавца</h3>
            <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {car.description}
            </p>
          </div>

          {/* Автокредит калькулятор в Кыргызстане */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-amber-700" />
                <h4 className="font-bold text-sm text-amber-950">
                  Автокредит в банках Кыргызстана (Оптима, Demir, Элдик Банк)
                </h4>
              </div>
              <span className="text-xs font-bold text-amber-800">
                Ставка ~18% в сомах
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">
                  Первоначальный взнос: <span className="font-bold">{loanDownPaymentPercent}%</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="70"
                  step="5"
                  value={loanDownPaymentPercent}
                  onChange={(e) => setLoanDownPaymentPercent(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <div className="font-semibold text-slate-900 mt-1 tabular-nums">
                  {downPaymentSom.toLocaleString('ru-RU')} сом
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">
                  Срок кредита: <span className="font-bold">{loanYears} {loanYears === 1 ? 'год' : 'года'}</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5].map((y) => (
                    <button
                      key={y}
                      onClick={() => setLoanYears(y)}
                      className={`px-3 py-1 text-xs rounded font-bold cursor-pointer transition-colors ${
                        loanYears === y
                          ? 'bg-amber-700 text-white'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {y}г
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-amber-200 sm:text-right">
                <div className="text-slate-500 text-[11px]">Ежемесячный платеж:</div>
                <div className="text-lg font-black text-amber-900 tabular-nums">
                  {monthlyPaymentSom.toLocaleString('ru-RU')} сом/мес
                </div>
                <div className="text-[10px] text-slate-400">
                  ≈ ${Math.round(monthlyPaymentSom / USD_TO_KGS_RATE)} USD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
