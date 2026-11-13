import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, X, Minus, Plus, Trash2, Loader2, CheckCircle2, Store } from 'lucide-react';
import { useParts } from '../../api/parts';
import { useAuth } from '../../api/auth';
import { call } from '../../api/admin';
import { isDemoCabinet } from '../../api/demo';
import type { AutoPartItem } from '../../types/car';
import { partPath } from '../../seo/routes';
import { removeFromCart, sellerKey, setCartQty, unitPrice, useCart } from '../../utils/cart';

const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const inputCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]';

interface Group { key: string; seller: string; location: string; lines: { part: AutoPartItem; qty: number }[]; total: number; delivery: string }

/** Header button with the number of items; opens the cart */
export const CartButton: React.FC = () => {
  const lines = useCart();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onAdded = () => { setBump(true); setTimeout(() => setBump(false), 600); };
    window.addEventListener('kgz:open-cart', onOpen);
    window.addEventListener('kgz:cart-added', onAdded);
    return () => { window.removeEventListener('kgz:open-cart', onOpen); window.removeEventListener('kgz:cart-added', onAdded); };
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`relative p-2 text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer transition-transform ${bump ? 'scale-125' : ''}`} title="Корзина" aria-label="Корзина">
        <ShoppingCart size={20} />
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-black leading-4 text-center">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </>
  );
};

const CartDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const lines = useCart();
  const parts = useParts();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState<Group | null>(null);
  const [done, setDone] = useState<{ number: string; seller: string } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const gone = lines.filter((l) => parts.length && !byId.has(l.partId));
  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const l of lines) {
      const p = byId.get(l.partId);
      if (!p) continue;
      const k = sellerKey(p);
      const g = map.get(k) || { key: k, seller: p.storeName || p.companyName || 'Продавец', location: [p.market, p.storeLocation].filter(Boolean).join(', '), lines: [], total: 0, delivery: '' };
      const qty = Math.min(l.qty, Math.max(1, p.stockCount || 1));
      g.lines.push({ part: p, qty });
      g.total += unitPrice(p, qty) * qty;
      map.set(k, g);
    }
    for (const g of map.values()) {
      const prices = g.lines.map((x) => x.part.deliveryPriceKgs).filter((x): x is number => typeof x === 'number');
      g.delivery = prices.length ? (Math.max(...prices) === 0 ? 'Доставка бесплатно' : `Доставка от ${som(Math.max(...prices))}`) : g.lines.some((x) => x.part.deliveryAvailable) ? 'Доставка — цену уточнит продавец' : 'Только самовывоз';
    }
    return [...map.values()];
  }, [lines, byId]);

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/50 flex justify-end" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-50 text-slate-800 w-full sm:w-[440px] h-full flex flex-col shadow-2xl">
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="font-black text-lg flex items-center gap-2"><ShoppingCart size={19} className="text-[#C8102E]" />Корзина</div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer" aria-label="Закрыть"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {done && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <div className="font-black flex items-center gap-2"><CheckCircle2 size={18} />Заказ {done.number} отправлен</div>
              <p className="mt-1">«<span data-no-i18n>{done.seller}</span>» получил ваш заказ и телефон. Продавец позвонит, чтобы подтвердить наличие и время.</p>
            </div>
          )}
          {gone.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <span className="flex-1">{gone.length} товар(а) уже сняты с продажи.</span>
              <button type="button" onClick={() => removeFromCart(gone.map((g) => g.partId))} className="font-bold underline cursor-pointer">Убрать</button>
            </div>
          )}
          {groups.length === 0 && !done && (
            <div className="py-16 text-center text-slate-500 text-sm">
              <ShoppingCart size={36} className="mx-auto text-slate-300 mb-2" />
              Корзина пустая. Нажимайте «В корзину» у запчастей — у одного продавца можно заказать сразу несколько.
            </div>
          )}
          {groups.map((g) => (
            <div key={g.key} className="bg-white rounded-2xl border border-slate-200">
              <div className="px-3 py-2.5 border-b border-slate-100 flex items-start gap-2">
                <Store size={16} className="text-[#C8102E] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate" data-no-i18n>{g.seller}</div>
                  {g.location && <div className="text-[11px] text-slate-500 truncate" data-no-i18n>{g.location}</div>}
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {g.lines.map(({ part: p, qty }) => {
                  const u = unitPrice(p, qty);
                  return (
                    <li key={p.id} className="p-3 flex gap-2.5">
                      {p.image ? <img src={p.image} alt="" className="w-14 h-12 rounded-md object-cover bg-slate-100 shrink-0" /> : <div className="w-14 h-12 rounded-md bg-slate-100 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <a href={partPath(p)} className="text-sm font-semibold text-[#1d6fb8] hover:underline line-clamp-2" data-no-i18n>{p.title}</a>
                        <div className="text-[11px] text-slate-500" data-no-i18n>OEM {p.partNumber}</div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden">
                            <button type="button" onClick={() => setCartQty(p.id, qty - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 cursor-pointer" aria-label="Меньше"><Minus size={14} /></button>
                            <span className="w-8 text-center text-sm font-bold">{qty}</span>
                            <button type="button" disabled={qty >= (p.stockCount || 1)} onClick={() => setCartQty(p.id, qty + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 cursor-pointer disabled:opacity-30" aria-label="Больше"><Plus size={14} /></button>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-sm">{som(u * qty)}</div>
                            {u < p.priceKgs && <div className="text-[10px] text-sky-700 font-bold">оптом {som(u)}/шт</div>}
                          </div>
                          <button type="button" onClick={() => removeFromCart([p.id])} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer" aria-label="Убрать из корзины"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="px-3 py-2.5 border-t border-slate-100 flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-black">{som(g.total)}</div>
                  <div className="text-[11px] text-slate-500">{g.delivery}</div>
                </div>
                <button type="button" disabled={isDemoCabinet() || g.lines.some((x) => !x.part.sellerId)} onClick={() => { setDone(null); setCheckout(g); }} className="px-4 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-50 text-white text-sm font-bold cursor-pointer" title={g.lines.some((x) => !x.part.sellerId) ? 'Это пример объявления — заказ недоступен' : undefined}>
                  Заказать у продавца
                </button>
              </div>
            </div>
          ))}
        </div>
        {checkout && (
          <CheckoutForm group={checkout} defaultName={user?.name || ''} defaultPhone={user?.phone ? `+${user.phone}` : ''} onClose={() => setCheckout(null)}
            onDone={(number) => { setDone({ number, seller: checkout.seller }); removeFromCart(checkout.lines.map((x) => x.part.id)); setCheckout(null); }} />
        )}
      </div>
    </div>,
    document.body,
  );
};

const CheckoutForm: React.FC<{ group: Group; defaultName: string; defaultPhone: string; onClose: () => void; onDone: (n: string) => void }> = ({ group, defaultName, defaultPhone, onClose, onDone }) => {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [delivery, setDelivery] = useState(false);
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDeliver = group.lines.some((x) => x.part.deliveryAvailable);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await call<{ orderNumber: string }>('/api/cart/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: group.lines.map((x) => ({ partId: x.part.id, qty: x.qty })), customerName: name, customerPhone: phone, deliveryType: delivery ? 'delivery' : 'pickup', deliveryAddress: address, comment }),
      });
      onDone(r.orderNumber);
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={send} className="bg-white border-t border-slate-200 p-4 space-y-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <div className="font-black text-sm">Заказ у «<span data-no-i18n>{group.seller}</span>» · {som(group.total)}</div>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" required className={inputCls} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 ..." inputMode="tel" required className={inputCls} />
      </div>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={!delivery} onChange={() => setDelivery(false)} className="accent-[#C8102E]" />Заберу сам</label>
        {canDeliver && <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={delivery} onChange={() => setDelivery(true)} className="accent-[#C8102E]" />Доставка</label>}
      </div>
      {delivery && <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес или город для отправки" required className={inputCls} />}
      <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий: VIN, удобное время" className={inputCls} />
      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
      <p className="text-[11px] text-slate-500">Оплата — продавцу при получении. Не переводите предоплату незнакомым продавцам.</p>
      <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 cursor-pointer">
        {busy && <Loader2 size={16} className="animate-spin" />}Отправить заказ продавцу
      </button>
    </form>
  );
};
