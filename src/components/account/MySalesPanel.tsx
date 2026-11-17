import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, PackageX, Phone, Truck, Footprints, Loader2, ShoppingBag, BadgeCheck, Clock } from 'lucide-react';
import { CrownProgressCard } from './CrownProgressCard';
import { answerMySale, confirmMyStock, listMySales, type SaleOrder } from '../../api/myListings';

const card = 'p-4 sm:p-5 rounded-2xl bg-white border border-slate-200';
const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const when = (iso: string) => {
  const t = Date.parse(iso);
  if (!t) return iso;
  return new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bishkek' });
};
const RESULT: Record<string, { text: string; cls: string }> = {
  sold: { text: 'Продано', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'not-sold': { text: 'Не купил', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  'no-stock': { text: 'Товара не было', cls: 'bg-red-50 text-red-700 border-red-200' },
  'no-answer': { text: 'Закрыт без ответа', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const isOpen = (o: SaleOrder) => !['Выполнен', 'Отменен'].includes(o.status);

/** Orders for the seller's parts: the seller says "sold" or "not sold" and the stock on the site follows */
export const MySalesPanel: React.FC<{ onCount?: (n: number) => void }> = ({ onCount }) => {
  const [orders, setOrders] = useState<SaleOrder[] | null>(null);
  const [stale, setStale] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(() => {
    listMySales()
      .then((r) => { setOrders(r.orders); setStale(r.staleStock); onCount?.(r.orders.filter(isOpen).length); })
      .catch((e) => { setOrders([]); setMsg({ ok: false, text: e.message }); });
  }, [onCount]);
  useEffect(() => { load(); }, [load]);

  const answer = async (o: SaleOrder, a: 'sold' | 'not-sold' | 'no-stock') => {
    setBusy(o.id + a); setMsg(null);
    try {
      const r = await answerMySale(o.id, a);
      const left = r.stockCount;
      setMsg({ ok: true, text: a === 'sold'
        ? `Отмечено: продано. На сайте осталось ${left ?? 0} шт.${left === 0 ? ' Товар снят с сайта.' : ''}`
        : a === 'no-stock' ? 'Отмечено: товара нет. Товар снят с сайта — когда появится, укажите количество в «Мои объявления».'
          : 'Отмечено: не купил. Наличие на сайте не изменилось.' });
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(null); }
  };

  const confirmStock = async () => {
    setBusy('stock'); setMsg(null);
    try { const r = await confirmMyStock(); setMsg({ ok: true, text: `Наличие подтверждено: ${r.confirmed} товар(ов).` }); setStale(0); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(null); }
  };

  if (!orders) return <div className={`${card} text-sm text-slate-500 flex items-center gap-2`}><Loader2 size={16} className="animate-spin" />Загрузка заказов…</div>;
  const open = orders.filter(isOpen);
  const done = orders.filter((o) => !isOpen(o));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Заказы покупателей</h2>
        <p className="text-sm text-slate-500">Покупатель заказал — отметьте, продали или нет. Количество на сайте поменяется само, и покупатели всегда видят правильное наличие.</p>
      </div>

      {msg && <div className={`p-3 rounded-xl text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}

      {/* Monthly stock check */}
      <div className={`${card} flex flex-col sm:flex-row sm:items-center gap-3 ${stale ? '!border-amber-300 !bg-amber-50' : ''}`}>
        <BadgeCheck size={22} className={stale ? 'text-amber-600 shrink-0' : 'text-emerald-600 shrink-0'} />
        <div className="flex-1 text-sm">
          {stale
            ? <><b className="text-slate-900">{stale} товар(ов): наличие не подтверждали больше месяца.</b><div className="text-slate-600">Если количество верное — нажмите кнопку. Если нет — исправьте в «Мои объявления».</div></>
            : <><b className="text-slate-900">Наличие верное?</b><div className="text-slate-600">Раз в месяц подтверждайте — покупатели увидят «наличие проверено».</div></>}
        </div>
        <button type="button" onClick={confirmStock} disabled={busy === 'stock'} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap">
          {busy === 'stock' ? 'Сохраняю…' : 'Наличие верное'}
        </button>
      </div>

      {open.length > 0 && (
        <div className="p-3 rounded-xl bg-[#C8102E] text-white text-sm font-bold flex items-center gap-2">
          <Clock size={16} />Ждут ответа: {open.length}. Продали или нет?
        </div>
      )}
      {open.length === 0 && (
        <div className={`${card} text-sm text-slate-500 text-center`}>
          <ShoppingBag size={28} className="mx-auto mb-2 text-slate-300" />
          Новых заказов нет. Когда покупатель оформит заказ, он появится здесь.
        </div>
      )}

      {open.map((o) => (
        <div key={o.id} className={`${card} !border-2 !border-amber-300`}>
          <div className="flex gap-3">
            {o.partImage && <img src={o.partImage} alt="" className="w-16 h-16 rounded-lg object-cover bg-slate-100 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-slate-400" data-no-i18n>{o.orderNumber} · {when(o.createdAt)}</div>
              <div className="font-bold text-slate-900" data-no-i18n>{o.partTitle}</div>
              <div className="text-sm text-slate-600"><b>{o.qty || 1} шт.</b> · {som(o.priceKgs)}{o.stockCount !== undefined && <> · на сайте сейчас: <b>{o.stockCount} шт.</b></>}</div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-slate-50 text-sm space-y-1">
            <div><b data-no-i18n>{o.customerName}</b> · <a href={`tel:+${o.customerPhone.replace(/\D/g, '')}`} className="font-mono font-bold text-emerald-700 inline-flex items-center gap-1"><Phone size={13} />{o.customerPhone}</a></div>
            <div className="text-slate-600 flex items-center gap-1.5">
              {o.deliveryType === 'delivery' ? <><Truck size={14} className="text-sky-600" />Доставка: <span data-no-i18n>{o.deliveryAddress}</span></> : <><Footprints size={14} className="text-amber-600" />Самовывоз</>}
            </div>
            {o.comment && <div className="text-slate-500 text-xs" data-no-i18n>{o.comment}</div>}
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button type="button" disabled={!!busy} onClick={() => answer(o, 'sold')} className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
              <CheckCircle2 size={17} />Продано ({o.qty || 1} шт.)
            </button>
            <button type="button" disabled={!!busy} onClick={() => answer(o, 'not-sold')} className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
              <XCircle size={17} />Не купил
            </button>
            <button type="button" disabled={!!busy} onClick={() => answer(o, 'no-stock')} className="py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
              <PackageX size={17} />Товара нет
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">«Продано» — уменьшит наличие на сайте. «Товара нет» — снимет товар с сайта. «Не купил» — наличие не меняется.</p>
        </div>
      ))}

      <CrownProgressCard />

      {done.length > 0 && (
        <div className={card}>
          <button type="button" onClick={() => setShowDone(!showDone)} className="text-sm font-bold text-slate-700 cursor-pointer">
            {showDone ? '▾' : '▸'} Отвеченные заказы ({done.length})
          </button>
          {showDone && (
            <div className="mt-3 divide-y divide-slate-100">
              {done.map((o) => {
                const r = RESULT[o.result || (o.status === 'Выполнен' ? 'sold' : 'not-sold')];
                return (
                  <div key={o.id} className="py-2 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate" data-no-i18n>{o.partTitle} × {o.qty || 1}</div>
                      <div className="text-xs text-slate-400" data-no-i18n>{o.orderNumber} · {when(o.createdAt)} · {o.customerName}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap ${r.cls}`}>{r.text}{o.resultBy === 'buyer' ? ' · со слов покупателя' : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
