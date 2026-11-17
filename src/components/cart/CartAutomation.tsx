import React, { useEffect, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useCart, openCart } from '../../utils/cart';
import { useAuth } from '../../api/auth';
import { call } from '../../api/admin';

const SHOWN_KEY = 'kgz:cart-reminder-day';
const today = () => new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);

/**
 * Signed in: the cart is copied to the account, so the site can remind about it the next day (Telegram / bell).
 * Everyone: coming back a day later with parts still in the cart shows a small reminder once a day.
 */
export const CartAutomation: React.FC = () => {
  const lines = useCart();
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  // Copy the cart to the account (a second after the last change)
  useEffect(() => {
    if (!user) return;
    const t = window.setTimeout(() => {
      call('/api/my/cart', { method: 'POST', body: JSON.stringify({ items: lines.map((l) => ({ partId: l.partId, qty: l.qty })) }) }).catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [user?.id, lines]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reminder on return: parts added more than a day ago, shown at most once a day
  useEffect(() => {
    if (!lines.length) { setShow(false); return; }
    const oldest = Math.min(...lines.map((l) => Date.parse(l.addedAt) || Date.now()));
    let shownDay = '';
    try { shownDay = localStorage.getItem(SHOWN_KEY) || ''; } catch { /* storage unavailable */ }
    if (Date.now() - oldest > 24 * 3_600_000 && shownDay !== today()) setShow(true);
  }, [lines.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setShow(false);
    try { localStorage.setItem(SHOWN_KEY, today()); } catch { /* storage unavailable */ }
  };
  if (!show) return null;
  const count = lines.reduce((n, l) => n + l.qty, 0);
  return (
    <div role="dialog" aria-label="Напоминание о корзине" className="fixed z-[59] right-4 left-4 sm:left-auto bottom-20 sm:bottom-24 sm:w-[340px] p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900">
      <button type="button" onClick={close} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
      <div className="flex items-start gap-3 pr-4">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-[#C8102E] flex items-center justify-center shrink-0"><ShoppingCart size={20} /></div>
        <div>
          <div className="font-black text-sm">В корзине ждут запчасти: {count} шт.</div>
          <div className="text-xs text-slate-500 mt-0.5">Оформите заказ, пока они есть в наличии — продавец позвонит и подтвердит.</div>
        </div>
      </div>
      <button type="button" onClick={() => { close(); openCart(); }} className="mt-3 w-full py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-black cursor-pointer">Открыть корзину</button>
    </div>
  );
};
