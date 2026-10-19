import React, { useRef, useState } from 'react';
import { Car, Language, UserProfile } from '../../types/car';
import { ALL_CAR_BRANDS, getModelsForBrand, KYRGYZ_REGIONS_AND_CITIES } from '../../data/mockData';
import { KochkorMuyuzIcon } from '../ornaments/KyrgyzOrnaments';
import { X, Check, Image as ImageIcon, ShieldCheck, Loader2, Clock } from 'lucide-react';
import { submitCar } from '../../api/cars';
import { uploadPhoto } from '../../api/upload';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the listing was accepted for moderation */
  onSubmitted?: () => void;
  language: Language;
  currentUser?: UserProfile;
}

const MAX_PHOTOS = 15;

const inputCls =
  'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C8102E] focus:outline-hidden';

export const AddListingModal: React.FC<AddListingModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  language,
  currentUser,
}) => {
  const isKg = language === 'kg';

  const [brand, setBrand] = useState('Toyota');
  const [model, setModel] = useState('Camry');
  const [year, setYear] = useState(2020);
  const [priceUsd, setPriceUsd] = useState<number | ''>('');
  const [city, setCity] = useState(currentUser?.city || 'Бишкек');
  const [bodyType, setBodyType] = useState<Car['bodyType']>('Седан');
  const [transmission, setTransmission] = useState<Car['transmission']>('Автомат');
  const [steering, setSteering] = useState<Car['steering']>('Левый');
  const [fuelType, setFuelType] = useState<Car['fuelType']>('Бензин');
  const [drive, setDrive] = useState<Car['drive']>('Передний');
  const [engineVolume, setEngineVolume] = useState<number | ''>('');
  const [powerHp, setPowerHp] = useState<number | ''>('');
  const [mileageKm, setMileageKm] = useState<number | ''>('');
  const [customs, setCustoms] = useState<Car['customs']>('Растаможен в КР');
  const [color, setColor] = useState('');
  const [isExchange, setIsExchange] = useState(false);
  const [sellerName, setSellerName] = useState(currentUser?.name || '');
  const [sellerPhone, setSellerPhone] = useState(currentUser?.phone || '');
  const [plateNumber, setPlateNumber] = useState('');
  const [vin, setVin] = useState('');
  const [description, setDescription] = useState('');

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (done) {
      // Fresh form for the next listing
      setDone(false);
      setPhotos([]);
      setDescription('');
      setPlateNumber('');
      setVin('');
      setPriceUsd('');
      setMileageKm('');
    }
    setSubmitError(null);
    onClose();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPhotoError(null);
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length - uploading);
    if (list.length < files.length) setPhotoError(`Можно добавить не больше ${MAX_PHOTOS} фото`);
    setUploading((n) => n + list.length);
    await Promise.all(
      list.map(async (file) => {
        try {
          const url = await uploadPhoto(file, 'car');
          setPhotos((prev) => (prev.length < MAX_PHOTOS ? [...prev, url] : prev));
        } catch (e: any) {
          setPhotoError(e?.message || 'Не удалось загрузить фото');
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
    if (fileInput.current) fileInput.current.value = '';
  };

  const removePhoto = (url: string) => setPhotos((prev) => prev.filter((p) => p !== url));
  const makeMain = (url: string) => setPhotos((prev) => [url, ...prev.filter((p) => p !== url)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitCar({
        brand,
        model: model.trim(),
        year: Number(year),
        priceUsd: Number(priceUsd),
        city,
        region: city,
        bodyType,
        transmission,
        steering,
        fuelType,
        drive,
        engineVolume: fuelType === 'Электро' ? 0 : Number(engineVolume) || 0,
        powerHp: Number(powerHp) || 0,
        mileageKm: Number(mileageKm) || 0,
        customs,
        color: color.trim(),
        isExchange,
        plateNumber: plateNumber.trim(),
        vin: vin.trim(),
        sellerName: sellerName.trim(),
        sellerPhone: sellerPhone.trim(),
        sellerLocation: city,
        description: description.trim(),
        photos,
      });
      setDone(true);
      onSubmitted?.();
    } catch (err: any) {
      setSubmitError(err?.message || 'Не удалось отправить объявление. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-[#C8102E] text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 shrink-0 rounded bg-white/20 flex items-center justify-center">
              <KochkorMuyuzIcon size={18} color="#FFFFFF" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {isKg ? 'Акысыз жарыя берүү' : 'Подать бесплатное объявление на KGzone'}
              </h3>
              <p className="text-[11px] text-white/80">
                {isKg ? 'Кыргызстандагы эң көп көрүлгөн автобазар' : 'Быстрая продажа авто в Бишкеке, Оше и всех областях КР'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 shrink-0 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={28} className="text-amber-600" />
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">Объявление отправлено на модерацию</h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Администратор проверит объявление, и после одобрения оно появится в каталоге. Обычно это занимает не больше нескольких часов.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 bg-[#C8102E] hover:bg-[#a60d26] text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              Понятно
            </button>
          </div>
        ) : (
          <>
            {/* Авторизованный аккаунт продавца */}
            {currentUser && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 font-medium">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                  <span>Подача от аккаунта: <b>{currentUser.name}</b> ({currentUser.phone})</span>
                </div>
              </div>
            )}

            {/* Форма */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto space-y-4">
              {/* Фото */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Фотографии ({photos.length}/{MAX_PHOTOS})
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {photos.map((url, i) => (
                    <div key={url} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 ? (
                        <span className="absolute left-1 top-1 text-[10px] font-bold bg-[#C8102E] text-white px-1.5 py-0.5 rounded">Главное</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeMain(url)}
                          className="absolute left-1 top-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Сделать главным
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute right-1 top-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                        aria-label="Удалить фото"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: uploading }).map((_, i) => (
                    <div key={`up-${i}`} className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                    </div>
                  ))}
                  {photos.length + uploading < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 hover:border-[#C8102E] text-slate-500 hover:text-[#C8102E] flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <ImageIcon size={20} />
                      <span>Добавить фото</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <p className="text-[11px] text-slate-500 mt-1">Объявления с фото продаются в несколько раз быстрее. Первое фото — главное.</p>
                {photoError && <p className="text-xs text-red-600 mt-1">{photoError}</p>}
              </div>

              {/* Марка и модель */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Марка *</label>
                  <select
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      const newModels = getModelsForBrand(e.target.value);
                      setModel(newModels.length > 0 && newModels[0] !== 'Все модели' ? newModels[0] : '');
                    }}
                    className={`${inputCls} font-semibold`}
                    data-no-i18n
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
                    list="add-listing-models"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Например: Camry, RX 350, Fit..."
                    className={`${inputCls} font-semibold`}
                    required
                  />
                  <datalist id="add-listing-models">
                    {getModelsForBrand(brand)
                      .filter((m) => m !== 'Все модели')
                      .map((m) => (
                        <option key={m} value={m} />
                      ))}
                  </datalist>
                </div>
              </div>

              {/* Год, Цена, Пробег */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Год выпуска *</label>
                  <input
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={`${inputCls} font-semibold`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Цена ($ USD) *</label>
                  <input
                    type="number"
                    min="100"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="15000"
                    className={`${inputCls} font-semibold`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Пробег (км) *</label>
                  <input
                    type="number"
                    min="0"
                    value={mileageKm}
                    onChange={(e) => setMileageKm(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="120000"
                    className={`${inputCls} font-semibold`}
                    required
                  />
                </div>
              </div>

              {/* Кузов, Привод, Цвет */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Кузов *</label>
                  <select value={bodyType} onChange={(e) => setBodyType(e.target.value as Car['bodyType'])} className={inputCls}>
                    {['Седан', 'Кроссовер', 'Внедорожник', 'Хэтчбек', 'Минивэн', 'Универсал', 'Пикап', 'Купе', 'Лифтбек'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Привод *</label>
                  <select value={drive} onChange={(e) => setDrive(e.target.value as Car['drive'])} className={inputCls}>
                    <option value="Передний">Передний</option>
                    <option value="Задний">Задний</option>
                    <option value="Полный (4WD)">Полный (4WD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Цвет</label>
                  <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Белый" className={inputCls} />
                </div>
              </div>

              {/* Руль, Топливо, КПП */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Руль *</label>
                  <select value={steering} onChange={(e) => setSteering(e.target.value as Car['steering'])} className={inputCls}>
                    <option value="Левый">Левый руль</option>
                    <option value="Правый">Правый руль (Япония)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Топливо *</label>
                  <select value={fuelType} onChange={(e) => setFuelType(e.target.value as Car['fuelType'])} className={inputCls}>
                    <option value="Бензин">Бензин</option>
                    <option value="Газ-бензин">Газ-бензин (ГБО)</option>
                    <option value="Дизель">Дизель</option>
                    <option value="Гибрид">Гибрид</option>
                    <option value="Электро">Электромобиль</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Коробка *</label>
                  <select value={transmission} onChange={(e) => setTransmission(e.target.value as Car['transmission'])} className={inputCls}>
                    <option value="Автомат">Автомат (АКПП)</option>
                    <option value="Вариатор">Вариатор (CVT)</option>
                    <option value="Механика">Механика (МКПП)</option>
                    <option value="Робот">Робот</option>
                  </select>
                </div>
              </div>

              {/* Объём, Мощность, Таможня */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Объём двигателя (л)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={fuelType === 'Электро' ? '' : engineVolume}
                    disabled={fuelType === 'Электро'}
                    onChange={(e) => setEngineVolume(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={fuelType === 'Электро' ? '—' : '2.5'}
                    className={`${inputCls} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Мощность (л.с.)</label>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    value={powerHp}
                    onChange={(e) => setPowerHp(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="180"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Таможня *</label>
                  <select value={customs} onChange={(e) => setCustoms(e.target.value as Car['customs'])} className={inputCls}>
                    <option value="Растаможен в КР">Растаможен в КР (100%)</option>
                    <option value="Не растаможен">Не растаможен</option>
                    <option value="Учет РФ">Учет РФ</option>
                  </select>
                </div>
              </div>

              {/* Город, Госномер, VIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Город КР *</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
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
                    maxLength={20}
                    className={`${inputCls} font-mono font-bold uppercase`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">VIN</label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="17 символов"
                    maxLength={17}
                    className={`${inputCls} font-mono uppercase`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={isExchange} onChange={(e) => setIsExchange(e.target.checked)} className="accent-[#C8102E]" />
                <span>Рассмотрю обмен</span>
              </label>

              {/* Контакты продавца */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ваше имя *</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="Например: Азамат"
                    className={`${inputCls} font-semibold`}
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
                    className={`${inputCls} font-mono font-semibold`}
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
                  placeholder="Состояние, история обслуживания, что заменено, есть ли вложения..."
                  maxLength={3000}
                  className={inputCls}
                />
              </div>

              {submitError && <p className="text-sm text-red-600 font-semibold">{submitError}</p>}

              {/* Кнопка отправки */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={submitting || uploading > 0}
                  className="w-full py-3 bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting || uploading > 0 ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  <span>{uploading > 0 ? 'Загрузка фото...' : submitting ? 'Отправка...' : 'Отправить на модерацию'}</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">Бесплатно. Объявление появится в каталоге после проверки администратором.</p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
