import React, { useState } from 'react';
import { AutoPartItem, BuyerOrder, Currency, Language } from '../../types/car';
import { USD_TO_KGS_RATE } from '../../data/mockData';
import { KochkorMuyuzIcon, TundukIcon } from '../ornaments/KyrgyzOrnaments';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Store,
  Clock,
  Send,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Building2,
  DollarSign,
} from 'lucide-react';

interface PartOrderModalProps {
  part: AutoPartItem | null;
  onClose: () => void;
  currency: Currency;
  language: Language;
  onOrderSuccess: (order: BuyerOrder) => void;
  onNavigateToCabinet?: () => void;
}

export const PartOrderModal: React.FC<PartOrderModalProps> = ({
  part,
  onClose,
  currency,
  language,
  onOrderSuccess,
  onNavigateToCabinet,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+996 ');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'bishkek' | 'regions'>('pickup');
  const [selectedRegion, setSelectedRegion] = useState('Ош');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mbank' | 'odengi' | 'elkart' | 'cash'>('mbank');
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  if (!part) return null;

  const isKg = language === 'kg';
  const priceSom = part.priceKgs;
  const priceUsd = Math.round(priceSom / USD_TO_KGS_RATE);

  const cleanPhone = part.sellerPhone.replace(/[^0-9]/g, '');
  const sellerWhatsappNumber = part.sellerWhatsapp || cleanPhone;
  
  const paymentLabels: Record<string, string> = {
    mbank: 'MBANK (QR / онлайн)',
    odengi: 'О!Деньги',
    elkart: 'Элкарт',
    cash: 'Наличными в контейнере',
  };

  const regionMinibusRates: Record<string, { time: string; station: string }> = {
    'Ош': { time: '12-14 часов', station: 'Западный автовокзал (вечерний бусик)' },
    'Жалал-Абад': { time: '10-12 часов', station: 'Западный автовокзал' },
    'Нарын': { time: '4-5 часов', station: 'Восточный автовокзал' },
    'Талас': { time: '5-6 часов', station: 'Западный автовокзал' },
    'Ысык-Көл (Каракол/Балыкчы)': { time: '3-5 часов', station: 'Восточный автовокзал' },
    'Баткен': { time: '18-20 часов', station: 'Западный автовокзал' },
  };

  const whatsappOrderText = encodeURIComponent(
    `Саламатсызбы! KGzone аркылуу буйрутма бергим келет:\n\n` +
    `📦 Товар: ${part.title}\n` +
    `🔢 OEM: ${part.partNumber}\n` +
    `🏢 Дүкөн/Рынок: ${part.market} (${part.containerInfo || part.storeLocation})\n` +
    `💰 Баасы: ${priceSom} сом (~$${priceUsd})\n` +
    `🚚 Жеткирүү: ${deliveryType === 'pickup' ? 'Самовывоз из бокса' : deliveryType === 'bishkek' ? 'Яндекс Доставка Бишкек' : `Попутный бусик (${selectedRegion})`}\n` +
    `💳 Төлөм: ${paymentLabels[paymentMethod]}\n\n` +
    `Сураныч, бар экенин тастыктап бериңиз!`
  );

  const whatsappUrl = `https://wa.me/${sellerWhatsappNumber}?text=${whatsappOrderText}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrderId = `KG-PART-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderNumber(newOrderId);
    setIsSubmitted(true);

    const fullDeliveryInfo =
      deliveryType === 'pickup'
        ? `Самовывоз из контейнера (${part.containerInfo || part.storeLocation})`
        : deliveryType === 'bishkek'
        ? `Яндекс Доставка за 1 час: ${deliveryAddress.trim() || 'По согласованию'}`
        : `Попутный бусик (${selectedRegion}): ${regionMinibusRates[selectedRegion]?.station || ''}`;

    const newOrder: BuyerOrder = {
      id: `ord-b-${Date.now()}`,
      orderNumber: newOrderId,
      date: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      partTitle: part.title,
      partNumber: part.partNumber,
      storeName: part.companyName || part.storeName,
      storeLocation: `${part.market}, ${part.containerInfo || part.storeLocation}`,
      storePhone: part.sellerPhone,
      priceKgs: part.priceKgs,
      status: 'Забронирован',
      deliveryType:
        deliveryType === 'pickup'
          ? 'Самовывоз'
          : deliveryType === 'bishkek'
          ? 'Доставка по Бишкеку'
          : 'Отправка в регионы',
      deliveryAddress: fullDeliveryInfo,
    };

    // Asynchronously sync with the Full-Stack Express backend
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        partId: part.id,
        partTitle: part.title,
        partNumber: part.partNumber,
        storeName: part.storeName,
        storeLocation: part.storeLocation,
        priceKgs: part.priceKgs,
        deliveryType: deliveryType,
        deliveryAddress: fullDeliveryInfo,
        paymentMethod: paymentLabels[paymentMethod],
        comment: comment.trim(),
      }),
    }).catch((err) => console.log('Backend sync notice:', err));

    onOrderSuccess(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-6 text-white">
        
        {/* Kyrgyz Gold-Red Top Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <KochkorMuyuzIcon size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                {isSubmitted
                  ? isKg ? 'Буйрутма кабыл алынды!' : 'Заказ успешно оформлен!'
                  : isKg ? 'Тетикти онлайн буйрутма берүү' : 'Оформление покупки и бронирование'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {part.market} • {part.containerInfo || part.storeLocation}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto space-y-4">
          {isSubmitted ? (
            /* Success confirmation */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-950 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h4 className="text-xl font-black text-white">
                  Заказ №{orderNumber} принят!
                </h4>
                <p className="text-xs text-neutral-300 mt-1 max-w-md mx-auto leading-relaxed">
                  Товар <span className="font-bold text-amber-400">«{part.title}»</span> забронирован в боксе{' '}
                  <span className="font-bold text-white">{part.market} ({part.containerInfo || part.storeLocation})</span>.
                  Склад удерживает позицию.
                </p>
              </div>

              {/* Order details summary */}
              <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 text-left text-xs space-y-2">
                <div className="flex justify-between pb-1.5 border-b border-neutral-800">
                  <span className="text-neutral-400">Рынок и контейнер:</span>
                  <span className="font-bold text-white">{part.market}, {part.containerInfo || part.storeLocation}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-neutral-800">
                  <span className="text-neutral-400">Способ получения:</span>
                  <span className="font-bold text-sky-400">
                    {deliveryType === 'pickup'
                      ? 'Самовывоз из контейнера (готов через 15 мин)'
                      : deliveryType === 'bishkek'
                      ? 'Яндекс Доставка за 1 час'
                      : `Попутный бусик (${selectedRegion})`}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-neutral-800">
                  <span className="text-neutral-400">Способ оплаты:</span>
                  <span className="font-bold text-emerald-400">{paymentLabels[paymentMethod]}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 font-bold">Итого к оплате:</span>
                  <span className="font-black text-emerald-400 text-base">
                    {priceSom.toLocaleString('ru-RU')} сом (~${priceUsd})
                  </span>
                </div>
              </div>

              {/* Direct WhatsApp Action with order prefilled text */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 text-left space-y-2">
                <div className="text-xs text-neutral-300">
                  Хотите сразу подтвердить выдачу или маршрут бусика?
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <MessageCircle size={15} />
                  <span>Открыть диалог в WhatsApp с продавцом контейнера →</span>
                </a>
              </div>

              {onNavigateToCabinet && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToCabinet();
                  }}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShoppingBag size={14} className="text-amber-400" />
                  <span>Посмотреть статус в Личном кабинете (Мои заказы) →</span>
                </button>
              )}
            </div>
          ) : (
            /* Order Checkout Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Part Mini Card */}
              <div className="flex gap-3.5 p-3.5 bg-neutral-900 rounded-2xl border border-neutral-800">
                <div className="w-18 h-18 bg-neutral-950 rounded-xl overflow-hidden shrink-0">
                  <img src={part.image} alt={part.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-0.5">
                    <span>{part.brand} {part.model}</span>
                    <span>•</span>
                    <span className="font-mono text-amber-300">OEM: {part.partNumber}</span>
                  </div>
                  <h4 className="font-bold text-white text-sm line-clamp-2">
                    {part.title}
                  </h4>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-base font-black text-emerald-400">
                      {priceSom.toLocaleString('ru-RU')} сом
                    </span>
                    <span className="text-neutral-400 text-xs font-semibold">
                      (${priceUsd} USD)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold ml-auto">
                      {part.stockStatus} ({part.stockCount} шт.)
                    </span>
                  </div>
                </div>
              </div>

              {/* Store Location Notice */}
              <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs text-neutral-300 flex items-start gap-2.5">
                <MapPin size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">
                    {part.market}: <span className="text-amber-400">{part.containerInfo || part.storeLocation}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {part.directionsGuide || 'Бишкек / Ош базары. Проверка на стенде перед оплатой.'}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    {isKg ? 'Сиздин атыңыз *' : 'Ваше имя *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Азамат"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-medium focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    {isKg ? 'Телефон / WhatsApp *' : 'Номер телефона (WhatsApp) *'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+996 700 123 456"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-mono font-bold focus:border-red-500"
                  />
                </div>
              </div>

              {/* Delivery Option Selection (Requirement 4) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {isKg ? 'Алуу ыкмасы (Жеткирүү):' : 'Способ получения детали:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      deliveryType === 'pickup'
                        ? 'bg-neutral-800 text-white border-amber-400 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <Store size={16} className="text-amber-400 mb-1" />
                    <span className="font-bold text-white">Самовывоз</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">В боксе за 15 мин</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('bishkek')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      deliveryType === 'bishkek'
                        ? 'bg-neutral-800 text-white border-red-500 shadow-md ring-1 ring-red-500/40'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <Truck size={16} className="text-red-400 mb-1" />
                    <span className="font-bold text-white">Яндекс Доставка</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">По Бишкеку за 1 час</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('regions')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      deliveryType === 'regions'
                        ? 'bg-neutral-800 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <Send size={16} className="text-emerald-400 mb-1" />
                    <span className="font-bold text-white">Попутный бусик</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">Ош, Нарын, Талас...</span>
                  </button>
                </div>
              </div>

              {/* Conditional Region Minibus Selector */}
              {deliveryType === 'regions' && (
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-xs space-y-2">
                  <label className="block font-semibold text-emerald-400">
                    Выберите регион доставки бусиком:
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-bold"
                  >
                    {Object.keys(regionMinibusRates).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <div className="text-[11px] text-neutral-400">
                    Отправление: <span className="text-white">{regionMinibusRates[selectedRegion]?.station}</span> • Время в пути: <span className="text-amber-400">{regionMinibusRates[selectedRegion]?.time}</span>
                  </div>
                </div>
              )}

              {/* Conditional Address */}
              {deliveryType === 'bishkek' && (
                <div className="text-xs">
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Адрес доставки по Бишкеку (улица, дом, СТО):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: ул. Льва Толстого 45, бокс СТО Мастер"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white"
                  />
                </div>
              )}

              {/* Payment Methods (Requirement 4) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {isKg ? 'Төлөм ыкмасы:' : 'Способ оплаты:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mbank')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'mbank'
                        ? 'bg-neutral-800 border-amber-400 text-white shadow-md'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block font-bold text-amber-400">MBANK</span>
                    <span className="text-[9px] text-neutral-400">QR / Перевод</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('odengi')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'odengi'
                        ? 'bg-neutral-800 border-red-500 text-white shadow-md'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block font-bold text-red-400">О!Деньги</span>
                    <span className="text-[9px] text-neutral-400">Кошелек</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('elkart')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'elkart'
                        ? 'bg-neutral-800 border-sky-400 text-white shadow-md'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block font-bold text-sky-400">Элкарт</span>
                    <span className="text-[9px] text-neutral-400">Любой банк КР</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-neutral-800 border-emerald-400 text-white shadow-md'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block font-bold text-emerald-400">Наличные</span>
                    <span className="text-[9px] text-neutral-400">В боксе</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 size={16} />
                  <span>{isKg ? 'Буйрутманы тастыктоо' : 'Оформить заказ и забронировать'}</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
