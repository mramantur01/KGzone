import React, { useState } from 'react';
import { Car, Language, UserProfile } from '../../types/car';
import { ALL_CAR_BRANDS, getModelsForBrand, KYRGYZ_REGIONS_AND_CITIES } from '../../data/mockData';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { X, Plus, Check, Car as CarIcon, Image as ImageIcon, ShieldCheck } from 'lucide-react';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCar: (newCar: Car) => void;
  language: Language;
  currentUser?: UserProfile;
}

export const AddListingModal: React.FC<AddListingModalProps> = ({
  isOpen,
  onClose,
  onAddCar,
  language,
  currentUser,
}) => {
  const isKg = language === 'kg';

  const [brand, setBrand] = useState('Toyota');
  const [model, setModel] = useState('Camry');
  const [year, setYear] = useState(2022);
  const [priceUsd, setPriceUsd] = useState(25000);
  const [city, setCity] = useState(currentUser?.city || 'Бишкек');
  const [bodyType, setBodyType] = useState<'Седан' | 'Кроссовер' | 'Внедорожник' | 'Хэтчбек' | 'Минивэн' | 'Универсал' | 'Пикап'>('Седан');
  const [transmission, setTransmission] = useState<'Автомат' | 'Вариатор' | 'Механика' | 'Робот'>('Автомат');
  const [steering, setSteering] = useState<'Левый' | 'Правый'>('Левый');
  const [fuelType, setFuelType] = useState<'Бензин' | 'Газ-бензин' | 'Дизель' | 'Гибрид' | 'Электро'>('Бензин');
  const [engineVolume, setEngineVolume] = useState(2.5);
  const [powerHp, setPowerHp] = useState(200);
  const [mileageKm, setMileageKm] = useState(35000);
  const [customs, setCustoms] = useState<'Растаможен в КР' | 'Не растаможен' | 'Учет РФ'>('Растаможен в КР');
  const [color, setColor] = useState('Белый жемчуг');
  const [sellerName, setSellerName] = useState(currentUser?.name || 'Айбек');
  const [sellerPhone, setSellerPhone] = useState(currentUser?.phone || '+996 700 123 456');
  const [sellerLocation] = useState(currentUser?.city || 'Бишкек');
  const [plateNumber, setPlateNumber] = useState('01 KG 700 ABK');
  const [description, setDescription] = useState('Машина в отличном состоянии. Бережная эксплуатация, родная краска, все расходники заменены. Растаможена в Кыргызстане, юридически чистая.');

  if (!isOpen) return null;

  const modelsForBrand = getModelsForBrand(brand);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newCar: Car = {
      id: `car-${Date.now()}`,
      title: `${brand} ${model} ${year}`,
      brand,
      model,
      year: Number(year),
      priceUsd: Number(priceUsd),
      city,
      region: city === 'Ош' ? 'г. Ош' : 'г. Бишкек',
      bodyType,
      transmission,
      steering,
      fuelType,
      engineVolume: fuelType === 'Электро' ? 0 : Number(engineVolume),
      powerHp: Number(powerHp),
      mileageKm: Number(mileageKm),
      drive: bodyType === 'Внедорожник' ? 'Полный (4WD)' : 'Передний',
      customs,
      color,
      isGoodPrice: true,
      hasCarCheckPass: true,
      plateNumber: plateNumber || '01 KG 999 VIP',
      vin: `KG${Date.now()}VIN`,
      viewsCount: 1,
      publishedDate: 'Только что',
      sellerName,
      sellerPhone,
      sellerLocation: `${city}, центр`,
      description,
      features: ['Кожаный салон', 'Климат-контроль', 'Подогрев сидений', 'Камера заднего вида'],
      image: '',
      photos: [],
    };

    onAddCar(newCar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#C8102E] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
              <KochkorMuyuzIcon size={18} color="#FFFFFF" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {isKg ? 'Акысыз жарыя берүү' : 'Подать бесплатное объявление на KGzone'}
              </h3>
              <p className="text-[11px] text-white/80">
                {isKg ? 'Кыргызстандагы эң көп көрүлгөн автобазар' : 'Быстрая продажа авто в Бишкеке, Оше и всех областях КР'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Авторизованный аккаунт продавца */}
        {currentUser && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center justify-between text-xs text-emerald-900 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Подача от подтвержденного аккаунта: <b>{currentUser.name}</b> ({currentUser.phone})</span>
            </div>
            <span className="text-[11px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              Верифицирован
            </span>
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto space-y-4">
          {/* Марка и модель */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Марка *</label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  const newModels = getModelsForBrand(e.target.value);
                  if (newModels.length > 0 && newModels[0] !== 'Все модели') {
                    setModel(newModels[0]);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
              >
                {ALL_CAR_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Модель *</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Например: Camry, RX 350, Fit..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Год и Цена */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Год выпуска *</label>
              <input
                type="number"
                min="1980"
                max="2026"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Цена ($ USD) *</label>
              <input
                type="number"
                min="500"
                value={priceUsd}
                onChange={(e) => setPriceUsd(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Пробег (км) *</label>
              <input
                type="number"
                min="0"
                value={mileageKm}
                onChange={(e) => setMileageKm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Руль, Топливо, КПП */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Руль *</label>
              <select
                value={steering}
                onChange={(e) => setSteering(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
              >
                <option value="Левый">Левый руль</option>
                <option value="Правый">Правый руль (Япония)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Топливо *</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
              >
                <option value="Бензин">Бензин</option>
                <option value="Газ-бензин">Газ-бензин (ГБО)</option>
                <option value="Дизель">Дизель</option>
                <option value="Гибрид">Гибрид</option>
                <option value="Электро">Электромобиль</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Коробка *</label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
              >
                <option value="Автомат">Автомат (АКПП)</option>
                <option value="Вариатор">Вариатор (CVT)</option>
                <option value="Механика">Механика (МКПП)</option>
                <option value="Робот">Робот</option>
              </select>
            </div>
          </div>

          {/* Город, Госномер КР, Растаможка */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Город КР *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
              >
                {KYRGYZ_REGIONS_AND_CITIES.map((c) => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Госномер КР</label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="01 KG 777 AAA"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Таможня *</label>
              <select
                value={customs}
                onChange={(e) => setCustoms(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
              >
                <option value="Растаможен в КР">Растаможен в КР (100%)</option>
                <option value="Не растаможен">Не растаможен</option>
                <option value="Учет РФ">Учет РФ</option>
              </select>
            </div>
          </div>

          {/* Контакты продавца */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ваше имя *</label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Например: Азамат"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Телефон (WhatsApp) *</label>
              <input
                type="tel"
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                placeholder="+996 700 123 456"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-semibold focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Описание авто</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden"
            />
          </div>

          {/* Кнопка отправки */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check size={18} />
              <span>Опубликовать объявление бесплатно</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
