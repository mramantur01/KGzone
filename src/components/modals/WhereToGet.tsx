import React from 'react';
import { MapPin, Package, Phone, Store, Truck, Footprints, MessageCircle, Navigation, ExternalLink } from 'lucide-react';
import type { AutoPartItem } from '../../types/car';
import { addToCart, inCart, openCart } from '../../utils/cart';
import { openShop } from '../../seo/routes';

interface Props {
  part: AutoPartItem;
  isKg: boolean;
  isDemo: boolean;
  phoneRevealed: boolean;
  onRevealPhone: () => void;
  whatsappUrl: string;
  onWhatsApp: () => void;
  onDemo: () => void;
}

const gis = (q: string) => `https://2gis.kg/search/${encodeURIComponent(q)}`;

// Everything the buyer needs after finding a part: stock, shop, market / row / container, phone,
// and the two ways to get it — pickup or delivery — each opening the order form with that choice.
export const WhereToGet: React.FC<Props> = ({ part, isKg, isDemo, phoneRevealed, onRevealPhone, whatsappUrl, onWhatsApp, onDemo }) => {
  const shop = part.storeName || part.companyName || (isKg ? 'Сатуучу' : 'Продавец');
  const city = part.storeCity || '';
  const spot = (part.containerInfo || part.storeLocation || '').trim();
  const market = (part.market || '').trim();
  const inStock = (part.stockCount || 0) > 0;
  // Days since the seller last confirmed or changed the stock (calendar days, Bishkek time)
  const checkedAt = Date.parse(part.stockCheckedAt || '');
  const day = (t: number) => Math.floor((t + 6 * 3_600_000) / 86_400_000);
  const checkedDays = checkedAt ? Math.max(0, day(Date.now()) - day(checkedAt)) : null;
  const pickup = part.pickupAvailable !== false;
  const delivery = Boolean(part.deliveryAvailable);
  const deliveryPrice = !delivery ? '' : part.deliveryPriceKgs === 0 ? (isKg ? 'акысыз' : 'бесплатно') : part.deliveryPriceKgs ? `${part.deliveryPriceKgs.toLocaleString('ru-RU')} сом` : (isKg ? 'баасын сатуучу айтат' : 'цену скажет продавец');
  const mapQuery = [market, spot, city || 'Бишкек'].filter(Boolean).join(' ');
  const order = (withDelivery: boolean) => {
    if (isDemo) { onDemo(); return; }
    if (!inCart(part.id)) addToCart(part.id);
    openCart({ partId: part.id, delivery: withDelivery });
  };

  const row = 'flex items-start gap-2.5 py-2 border-b border-neutral-800/80 last:border-0';
  const label = 'text-[10px] font-bold uppercase tracking-wider text-neutral-400';
  return (
    <div className="rounded-xl bg-neutral-900/60 border-2 border-amber-500/40 overflow-hidden">
      <div className="px-3.5 py-2 bg-amber-400/10 text-xs font-black text-amber-300 uppercase tracking-wider">
        {isKg ? 'Кайдан сатып алуу жана кантип алуу' : 'Где купить и как получить'}
      </div>
      <div className="px-3.5 text-xs">
        {/* Stock */}
        <div className={row}>
          <Package size={16} className={`${inStock ? 'text-emerald-400' : 'text-red-400'} shrink-0 mt-0.5`} />
          <div>
            <div className={label}>{isKg ? 'Бар' : 'В наличии'}</div>
            <div className={`font-black text-sm ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
              {inStock ? (isKg ? `${part.stockCount} даана` : `${part.stockCount} шт.`) : (isKg ? 'Азыр жок' : 'Сейчас нет')}
            </div>
            {inStock && checkedDays !== null && (
              <div className={`text-[11px] ${checkedDays > 30 ? 'text-amber-600 font-semibold' : 'text-neutral-400'}`}>
                {checkedDays > 30
                  ? (isKg ? 'Бар экенин көптөн бери тастыкташкан эмес — сатуучудан сураңыз' : 'Наличие давно не подтверждали — уточните у продавца')
                  : checkedDays === 0 ? (isKg ? 'Бар экени бүгүн текшерилген' : 'Наличие проверено сегодня')
                  : checkedDays === 1 ? (isKg ? 'Бар экени кечээ текшерилген' : 'Наличие проверено вчера')
                  : (isKg ? `Бар экени ${checkedDays} күн мурун текшерилген` : `Наличие проверено ${checkedDays} дн. назад`)}
              </div>
            )}
          </div>
        </div>
        {/* Shop */}
        <div className={row}>
          <Store size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className={label}>{isKg ? 'Дүкөн' : 'Магазин'}</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white truncate" data-no-i18n>{shop}</div>
          </div>
          {part.sellerId && (
            <button type="button" onClick={() => openShop(part.sellerId!)} className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer whitespace-nowrap">
              {isKg ? 'Бардык товарлары' : 'Все товары'}
            </button>
          )}
        </div>
        {/* Market, row, container */}
        <div className={row}>
          <MapPin size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className={label}>{isKg ? 'Кайда турат' : 'Где находится'}</div>
            <div className="text-sm text-slate-900 dark:text-white" data-no-i18n>
              {[city, market].filter(Boolean).join(', ') || (isKg ? 'Дареги көрсөтүлгөн эмес' : 'Адрес не указан')}
            </div>
            {spot && <div className="text-sm font-bold text-amber-300" data-no-i18n>{spot}</div>}
            {part.directionsGuide && <div className="mt-1 text-[11px] text-neutral-400" data-no-i18n>{part.directionsGuide}</div>}
          </div>
          {(market || spot) && (
            <a href={gis(mapQuery)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-sky-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap">
              <Navigation size={12} />2ГИС
            </a>
          )}
        </div>
        {/* Phone */}
        <div className={row}>
          <Phone size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className={label}>{isKg ? 'Телефон' : 'Телефон'}</div>
            {phoneRevealed || isDemo ? (
              <a href={isDemo ? undefined : `tel:+${part.sellerPhone.replace(/[^0-9]/g, '')}`} onClick={(e) => { if (isDemo) { e.preventDefault(); onDemo(); } }} className="font-mono font-bold text-sm text-slate-900 dark:text-white hover:text-emerald-500" data-no-i18n>{part.sellerPhone}</a>
            ) : (
              <button type="button" onClick={onRevealPhone} className="font-mono font-bold text-sm text-emerald-300 hover:underline cursor-pointer" data-no-i18n>
                {part.sellerPhone.slice(0, 8)}•• •• <span className="font-sans text-[11px]">{isKg ? 'көрсөтүү' : 'показать'}</span>
              </button>
            )}
          </div>
          <a href={isDemo ? undefined : whatsappUrl} target="_blank" rel="noreferrer" onClick={(e) => { if (isDemo) { e.preventDefault(); onDemo(); } else onWhatsApp(); }} className="text-[11px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap cursor-pointer">
            <MessageCircle size={12} />WhatsApp
          </a>
        </div>
      </div>

      {/* Two ways to get the part */}
      <div className="p-3 grid grid-cols-2 gap-2 border-t border-neutral-800/80">
        <button type="button" disabled={isDemo || !pickup || !inStock} onClick={() => order(false)} className="text-left p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-700 hover:border-amber-400 disabled:opacity-40 cursor-pointer">
          <div className="flex items-center gap-1.5 font-black text-sm text-slate-900 dark:text-white"><Footprints size={15} className="text-amber-400" />{isKg ? 'Өзүм алып кетем' : 'Самовывоз'}</div>
          <div className="mt-0.5 text-[11px] text-neutral-400">{pickup ? (isKg ? 'Акысыз · дүкөндөн алып кетесиз' : 'Бесплатно · заберёте в магазине') : (isKg ? 'Бул сатуучуда жок' : 'Нет у этого продавца')}</div>
        </button>
        <button type="button" disabled={isDemo || !delivery || !inStock} onClick={() => order(true)} className="text-left p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-700 hover:border-amber-400 disabled:opacity-40 cursor-pointer">
          <div className="flex items-center gap-1.5 font-black text-sm text-slate-900 dark:text-white"><Truck size={15} className="text-sky-400" />{isKg ? 'Жеткирүү' : 'Доставка'}</div>
          <div className="mt-0.5 text-[11px] text-neutral-400">{delivery ? deliveryPrice : (isKg ? 'Сатуучу жеткирбейт' : 'Продавец не доставляет')}</div>
        </button>
      </div>
      <p className="px-3.5 pb-3 text-[11px] text-neutral-500 flex items-start gap-1">
        <ExternalLink size={11} className="shrink-0 mt-0.5" />
        {isKg ? 'Аты жана телефонуңузду калтырасыз — сатуучу чалып, бар экенин жана убакытты тастыктайт. Төлөм — алганда.' : 'Оставите имя и телефон — продавец позвонит и подтвердит наличие и время. Оплата — при получении.'}
      </p>
    </div>
  );
};
