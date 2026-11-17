import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, PackageX, X, Star } from 'lucide-react';
import { call } from '../../api/admin';
import { refreshParts } from '../../api/parts';
import { dueOrder, forgetOrder, snoozeOrder, type PendingOrder } from '../../utils/orderFeedback';

/** A few hours after an order: "Did you buy it?" — the answer keeps the stock on the site right */
export const OrderFeedbackPrompt: React.FC = () => {
  const [order, setOrder] = useState<PendingOrder | undefined>();
  const [thanks, setThanks] = useState<false | true | 'review'>(false);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState<PendingOrder | null>(null);
  const [stars, setStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setOrder(dueOrder());
    check();
    const t = window.setInterval(check, 60_000);
    window.addEventListener('kgz:order-feedback', check);
    return () => { window.clearInterval(t); window.removeEventListener('kgz:order-feedback', check); };
  }, []);

  if (thanks) {
    return (
      <div className="fixed z-[60] left-4 right-4 sm:right-auto bottom-20 sm:bottom-6 sm:w-[360px] p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xl text-sm font-bold text-emerald-700 flex items-center gap-2">
        <CheckCircle2 size={18} />{thanks === 'review' ? 'Спасибо за отзыв!' : 'Спасибо! Наличие на сайте обновлено.'}
      </div>
    );
  }

  // After «Да, купил»: rate the seller (stars + a few words), or skip
  if (rate) {
    const sendReview = async () => {
      if (!stars) return;
      setBusy(true); setErr(null);
      try {
        await call('/api/orders/review', { method: 'POST', body: JSON.stringify({ key: rate.key, rating: stars, text: reviewText }) });
        setRate(null);
        setThanks('review');
        window.setTimeout(() => setThanks(false), 3000);
      } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
    };
    return (
      <div role="dialog" aria-label="Оцените продавца" className="fixed z-[60] left-4 right-4 sm:right-auto bottom-20 sm:bottom-6 sm:w-[380px] p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900">
        <button type="button" onClick={() => setRate(null)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={14} />Спасибо! Наличие обновлено.</div>
        <div className="mt-1 font-black text-sm pr-5">Оцените продавца{rate.seller ? <> «<span data-no-i18n>{rate.seller}</span>»</> : null}</div>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Оценка">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} из 5`} onClick={() => setStars(n)} className="cursor-pointer p-0.5">
              <Star size={30} className={n <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
            </button>
          ))}
        </div>
        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={2} maxLength={1000} placeholder="Пару слов о продавце (необязательно)" className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-sm resize-none" />
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy || !stars} onClick={sendReview} className="flex-1 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-black cursor-pointer disabled:opacity-50">Отправить отзыв</button>
          <button type="button" onClick={() => setRate(null)} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer">Пропустить</button>
        </div>
      </div>
    );
  }
  if (!order) return null;

  const send = async (answer: 'bought' | 'not-bought' | 'no-stock') => {
    setBusy(true);
    try {
      await call('/api/orders/feedback', { method: 'POST', body: JSON.stringify({ key: order.key, answer }) });
      forgetOrder(order.key);
      refreshParts();
      if (answer === 'bought') { setStars(0); setReviewText(''); setErr(null); setRate(order); return; }
      setThanks(true);
      window.setTimeout(() => setThanks(false), 3000);
    } catch { snoozeOrder(order.key); } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-label="Вы купили?" className="fixed z-[60] left-4 right-4 sm:right-auto bottom-20 sm:bottom-6 sm:w-[380px] p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900">
      <button type="button" onClick={() => snoozeOrder(order.key)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Спросить позже"><X size={16} /></button>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400" data-no-i18n>Заказ {order.orderNumber}</div>
      <div className="mt-1 font-black text-sm pr-5">
        Вы купили «<span data-no-i18n>{order.title}</span>»{order.seller ? <> у «<span data-no-i18n>{order.seller}</span>»</> : null}?
      </div>
      <div className="text-xs text-slate-500 mt-0.5">Ваш ответ помогает показывать на сайте правильное наличие.</div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button type="button" disabled={busy} onClick={() => send('bought')} className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex flex-col items-center gap-0.5 cursor-pointer disabled:opacity-50"><CheckCircle2 size={16} />Да, купил</button>
        <button type="button" disabled={busy} onClick={() => send('not-bought')} className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer disabled:opacity-50"><XCircle size={16} />Не купил</button>
        <button type="button" disabled={busy} onClick={() => send('no-stock')} className="py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer disabled:opacity-50"><PackageX size={16} />Товара не было</button>
      </div>
    </div>
  );
};
