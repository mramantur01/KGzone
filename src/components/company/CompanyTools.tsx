import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Banknote, RefreshCw, Link2, MessageSquareText, Clock, Megaphone, Percent, TrendingDown, Archive, Users } from 'lucide-react';
import {
  addCashSale, getBroadcastInfo, getCompanyReports, getCompanySettings, listCashSales, listCompanyParts, saveCompanySettings, sendBroadcast, syncPriceFeed,
  type CashSale, type CompanyInfo, type CompanyPart, type CompanyReports, type CompanySettings,
} from '../../api/company';

const card = 'p-4 rounded-2xl bg-white border border-slate-200';
const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const btnRed = 'px-4 py-2 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer';
const btnGray = 'px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60';
const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const Note: React.FC<{ ok?: boolean; children: React.ReactNode }> = ({ ok, children }) => (
  <p className={`text-xs rounded-lg px-3 py-2 border ${ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{children}</p>
);

// ---------------- Cash desk: sales at the market ----------------
export const CashDesk: React.FC = () => {
  const [parts, setParts] = useState<CompanyPart[] | null>(null);
  const [sales, setSales] = useState<CashSale[] | null>(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<CompanyPart | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [customer, setCustomer] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => {
    listCompanyParts().then(setParts).catch(() => setParts([]));
    listCashSales().then(setSales).catch((e) => { setSales([]); setMsg({ ok: false, text: e.message }); });
  };
  useEffect(load, []);

  const found = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/[\s-]/g, '');
    if (s.length < 2 || !parts) return [];
    return parts.filter((p) => (p.stockCount || 0) > 0 && [p.title, p.partNumber, p.sku, ...(p.crossNumbers || [])].join(' ').toLowerCase().replace(/[\s-]/g, '').includes(s)).slice(0, 8);
  }, [q, parts]);

  const pick = (p: CompanyPart) => { setPicked(p); setPrice(String(p.priceKgs)); setQty('1'); setQ(''); setMsg(null); };
  const sell = async () => {
    if (!picked) return;
    setBusy(true); setMsg(null);
    try {
      const r = await addCashSale({ partId: picked.id, qty: Number(qty) || 1, priceKgs: Number(price) || picked.priceKgs, customerName: customer.trim() || undefined });
      setMsg({ ok: true, text: `Продано: ${picked.title} × ${qty}. Осталось на складе: ${r.stockLeft} шт.` });
      setPicked(null); setCustomer('');
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  };

  const today = new Date().toDateString();
  const todaySales = (sales || []).filter((s) => new Date(s.createdAt).toDateString() === today);
  const monthAgo = Date.now() - 30 * 86400_000;
  const month = (sales || []).filter((s) => Date.parse(s.createdAt) >= monthAgo);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Продаж сегодня', String(todaySales.length)],
          ['Выручка сегодня', som(todaySales.reduce((n, s) => n + s.priceKgs, 0))],
          ['Продаж за 30 дней', String(month.length)],
          ['Выручка за 30 дней', som(month.reduce((n, s) => n + s.priceKgs, 0))],
        ].map(([l, v]) => (
          <div key={l} className="p-3 rounded-xl bg-white border border-slate-200"><div className="text-lg font-black text-slate-900">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>
        ))}
      </div>

      <div className={`${card} space-y-3`}>
        <div className="font-bold text-slate-900 flex items-center gap-2"><Banknote size={17} className="text-emerald-600" />Продажа на рынке</div>
        <p className="text-xs text-slate-500">Продали товар в контейнере или по телефону? Отметьте здесь — остаток уменьшится сам, а продажа попадёт в статистику и отчёты.</p>
        {!picked ? (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найдите товар: название, OEM или артикул" className={`${inputCls} pl-9 py-2.5`} />
            {found.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {found.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pick(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm cursor-pointer">
                      <span className="flex-1 min-w-0"><span className="block font-semibold truncate" data-no-i18n>{p.title}</span><span className="block text-xs text-slate-500" data-no-i18n>OEM {p.partNumber} · остаток {p.stockCount}</span></span>
                      <b className="whitespace-nowrap">{som(p.priceKgs)}</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim().length >= 2 && parts && found.length === 0 && <p className="text-xs text-slate-500 mt-1">Не нашли товар в наличии</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0"><b className="block truncate" data-no-i18n>{picked.title}</b><span className="text-xs text-slate-500" data-no-i18n>OEM {picked.partNumber} · на складе {picked.stockCount} шт</span></span>
              <button type="button" onClick={() => setPicked(null)} className="text-xs text-slate-500 underline cursor-pointer">Другой товар</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Количество</label><input type="number" min="1" max={picked.stockCount} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Цена за штуку, сом</label><input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} /></div>
              <div className="col-span-2 sm:col-span-1"><label className={labelCls}>Покупатель (необязательно)</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="СТО «Мастер»" className={inputCls} /></div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={sell} disabled={busy} className={btnRed}>{busy && <Loader2 size={15} className="animate-spin" />}Продано · {som((Number(qty) || 1) * (Number(price) || 0))}</button>
            </div>
          </div>
        )}
        {msg && <Note ok={msg.ok}>{msg.text}</Note>}
      </div>

      <div className={card}>
        <div className="font-bold text-sm text-slate-900 mb-2">Последние продажи</div>
        {!sales ? <Loader2 className="animate-spin text-slate-400" /> : sales.length === 0 ? <p className="text-xs text-slate-500">Пока нет продаж через кассу</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {sales.slice(0, 50).map((s) => (
              <li key={s.id} className="py-2 flex items-center gap-2">
                <span className="text-xs text-slate-400 w-24 shrink-0">{new Date(s.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="flex-1 min-w-0 truncate" data-no-i18n>{s.partTitle} <span className="text-slate-500">· {s.comment}</span>{s.customerName && s.customerName !== 'Продажа на рынке' ? <span className="text-slate-500"> · {s.customerName}</span> : null}</span>
                <b className="whitespace-nowrap">{som(s.priceKgs)}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ---------------- Reports for the director ----------------
export const CompanyReportsPanel: React.FC = () => {
  const [r, setR] = useState<CompanyReports | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getCompanyReports().then(setR).catch((e) => setError(e.message)); }, []);
  if (error) return <p className={card}>{error}</p>;
  if (!r) return <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;
  const Table: React.FC<{ items: CompanyReports['stale']; empty: string; extra: (i: CompanyReports['stale'][number]) => string }> = ({ items, empty, extra }) =>
    items.length === 0 ? <p className="text-xs text-slate-500">{empty}</p> : (
      <ul className="divide-y divide-slate-100 text-sm">
        {items.map((i) => (
          <li key={i.id} className="py-1.5 flex items-center gap-2">
            <span className="flex-1 min-w-0"><span className="block truncate" data-no-i18n>{i.title}</span><span className="block text-xs text-slate-500" data-no-i18n>OEM {i.partNumber} · {i.stockCount} шт · {som(i.priceKgs)}</span></span>
            <span className="text-xs text-slate-600 whitespace-nowrap">{extra(i)}</span>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Продажи на рынке за 30 дней', `${r.offlineMonth.count} · ${som(r.offlineMonth.sumKgs)}`],
          ['Товар без движения 90+ дней', som(r.staleValueKgs)],
          ...(r.stockValueKgs !== undefined ? [['Весь товар на складе', som(r.stockValueKgs)]] : []),
          ['Смотрят, но не звонят', String(r.viewedNotBought.length)],
        ].map(([l, v]) => (
          <div key={l} className="p-3 rounded-xl bg-white border border-slate-200"><div className="text-lg font-black text-slate-900">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>
        ))}
      </div>
      <div className={card}>
        <div className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2"><Users size={15} />Продажи по менеджерам за 30 дней (из CRM)</div>
        {r.managers.length === 0 ? <p className="text-xs text-slate-500">Назначайте ответственных в «Клиентах», и здесь появится результат каждого менеджера.</p> : (
          <table className="w-full text-sm">
            <thead className="text-[11px] text-slate-400 text-left"><tr><th className="py-1">Менеджер</th><th>Продано</th><th>Сумма</th><th>В работе</th><th>Отказ</th></tr></thead>
            <tbody>
              {r.managers.map((m) => (
                <tr key={m.name} className="border-t border-slate-100"><td className="py-1.5 font-semibold" data-no-i18n>{m.name}</td><td>{m.won}</td><td className="font-bold">{som(m.wonSum)}</td><td>{m.open}</td><td className="text-slate-500">{m.lost}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className={card}>
        <div className="font-bold text-sm text-slate-900 flex items-center gap-2"><TrendingDown size={15} className="text-sky-600" />Смотрят, но не звонят</div>
        <p className="text-xs text-slate-500 mb-2">Много просмотров и ни одного обращения — проверьте цену и фото.</p>
        <Table items={r.viewedNotBought} empty="Таких товаров нет — отлично!" extra={(i) => `👁 ${i.views}`} />
      </div>
      <div className={card}>
        <div className="font-bold text-sm text-slate-900 flex items-center gap-2"><Archive size={15} className="text-amber-600" />Лежит без движения больше 90 дней</div>
        <p className="text-xs text-slate-500 mb-2">Сделайте скидку или поднимите объявление — деньги заморожены в товаре.</p>
        <Table items={r.stale} empty="Всё продаётся — залежавшегося товара нет." extra={(i) => `с ${new Date(i.since).toLocaleDateString('ru-RU')}`} />
      </div>
    </div>
  );
};

// ---------------- Settings: wholesale, price feed, replies, auto-reply, broadcast ----------------
export const CompanySettingsPanel: React.FC<{ info: CompanyInfo }> = ({ info }) => {
  const can = (p: string) => info.permissions.includes(p as any);
  const edit = can('company.edit');
  const [s, setS] = useState<CompanySettings | null>(null);
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string } | null>>({});
  const [busy, setBusy] = useState('');
  const [templates, setTemplates] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [bText, setBText] = useState('');
  const [bInfo, setBInfo] = useState<{ recipients: number; lastAt: string | null } | null>(null);
  const load = () => getCompanySettings().then((x) => { setS(x); setTemplates(x.replyTemplates.join('\n')); setFeedUrl(x.priceFeedUrl); }).catch((e) => setMsg({ all: { ok: false, text: e.message } }));
  useEffect(() => {
    load();
    if (can('messages')) getBroadcastInfo().then(setBInfo).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!s) return msg.all ? <Note>{msg.all.text}</Note> : <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;

  const save = async (key: string, patch: Partial<CompanySettings>, okText = 'Сохранено') => {
    setBusy(key); setMsg((m) => ({ ...m, [key]: null }));
    try { const next = await saveCompanySettings(patch); setS(next); setMsg((m) => ({ ...m, [key]: { ok: true, text: okText } })); }
    catch (e: any) { setMsg((m) => ({ ...m, [key]: { ok: false, text: e.message } })); }
    finally { setBusy(''); }
  };
  const runFeed = async () => {
    setBusy('feed'); setMsg((m) => ({ ...m, feed: null }));
    try { const r = await syncPriceFeed(); setMsg((m) => ({ ...m, feed: { ok: true, text: r.result } })); load(); }
    catch (e: any) { setMsg((m) => ({ ...m, feed: { ok: false, text: e.message } })); }
    finally { setBusy(''); }
  };
  const broadcast = async () => {
    if (!confirm(`Отправить рассылку ${bInfo?.recipients || 0} клиентам? Повторить можно через сутки.`)) return;
    setBusy('b'); setMsg((m) => ({ ...m, b: null }));
    try { const r = await sendBroadcast(bText.trim()); setMsg((m) => ({ ...m, b: { ok: true, text: `Отправлено клиентам: ${r.sent}` } })); setBText(''); getBroadcastInfo().then(setBInfo).catch(() => undefined); }
    catch (e: any) { setMsg((m) => ({ ...m, b: { ok: false, text: e.message } })); }
    finally { setBusy(''); }
  };
  const lockNote = !edit && <p className="text-[11px] text-slate-400">Изменять может владелец или администратор магазина.</p>;

  return (
    <div className="space-y-4">
      {/* Wholesale */}
      <div className={`${card} space-y-3`}>
        <div className="font-bold text-slate-900 flex items-center gap-2"><Percent size={16} className="text-[#C8102E]" />Оптовая скидка</div>
        <p className="text-xs text-slate-500">Покажем на странице магазина и в ваших объявлениях: «Скидка 5% при заказе от 20 000 сом». Цену «опт от N шт» на отдельные товары задайте в «Каталоге» — отметьте товары и выберите «Оптовая цена».</p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div><label className={labelCls}>Скидка, %</label><input type="number" min="0" max="50" disabled={!edit} value={s.wholesale.discountPct || ''} onChange={(e) => setS({ ...s, wholesale: { ...s.wholesale, discountPct: Number(e.target.value) } })} className={inputCls} /></div>
          <div><label className={labelCls}>При заказе от, сом</label><input type="number" min="0" disabled={!edit} value={s.wholesale.fromKgs || ''} onChange={(e) => setS({ ...s, wholesale: { ...s.wholesale, fromKgs: Number(e.target.value) } })} className={inputCls} /></div>
        </div>
        {edit && <button type="button" disabled={busy === 'w'} onClick={() => save('w', { wholesale: s.wholesale })} className={btnGray}>{busy === 'w' && <Loader2 size={14} className="animate-spin" />}Сохранить</button>}
        {lockNote}
        {msg.w && <Note ok={msg.w.ok}>{msg.w.text}</Note>}
      </div>

      {/* Price feed */}
      {can('import') && (
        <div className={`${card} space-y-3`}>
          <div className="font-bold text-slate-900 flex items-center gap-2"><Link2 size={16} className="text-emerald-600" />Прайс по ссылке — обновляется сам каждую ночь</div>
          <ol className="text-xs text-slate-600 list-decimal pl-4 space-y-0.5">
            <li>Ведите прайс в Google-таблице с колонками как в шаблоне импорта (Название, Марка, OEM, Цена, Количество, Артикул продавца).</li>
            <li>В таблице: «Настройки доступа» → «Все, у кого есть ссылка» → «Читатель».</li>
            <li>Вставьте ссылку сюда. Каждую ночь цены и остатки на KGzone обновятся по таблице.</li>
          </ol>
          <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} disabled={!edit} placeholder="https://docs.google.com/spreadsheets/d/..." className={inputCls} />
          <div className="flex flex-wrap gap-2">
            {edit && <button type="button" disabled={busy === 'f'} onClick={() => save('f', { priceFeedUrl: feedUrl.trim() }, feedUrl.trim() ? 'Ссылка сохранена. Нажмите «Обновить сейчас», чтобы проверить.' : 'Автообновление выключено')} className={btnGray}>{busy === 'f' && <Loader2 size={14} className="animate-spin" />}Сохранить ссылку</button>}
            {s.priceFeedUrl && <button type="button" disabled={busy === 'feed'} onClick={runFeed} className={btnRed}>{busy === 'feed' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Обновить сейчас</button>}
          </div>
          {s.priceFeedResult && <p className="text-xs text-slate-600">Последнее обновление: {s.priceFeedResult}</p>}
          {msg.f && <Note ok={msg.f.ok}>{msg.f.text}</Note>}
          {msg.feed && <Note ok={msg.feed.ok}>{msg.feed.text}</Note>}
        </div>
      )}

      {/* Reply templates */}
      <div className={`${card} space-y-3`}>
        <div className="font-bold text-slate-900 flex items-center gap-2"><MessageSquareText size={16} className="text-sky-600" />Шаблоны ответов для менеджеров</div>
        <p className="text-xs text-slate-500">Одна строка — один шаблон. В переписке с покупателем они появятся кнопками над полем ввода.</p>
        <textarea rows={5} disabled={!edit} value={templates} onChange={(e) => setTemplates(e.target.value)} placeholder={'Есть в наличии, приезжайте: Кудайберген, ряд 3, контейнер 12.\nОтправим в регионы почтой или такси, оплата при получении.\nПодберём по VIN — пришлите фото техпаспорта.'} className={inputCls} />
        {edit && <button type="button" disabled={busy === 't'} onClick={() => save('t', { replyTemplates: templates.split('\n').map((x) => x.trim()).filter(Boolean) })} className={btnGray}>{busy === 't' && <Loader2 size={14} className="animate-spin" />}Сохранить шаблоны</button>}
        {lockNote}
        {msg.t && <Note ok={msg.t.ok}>{msg.t.text}</Note>}
      </div>

      {/* Auto-reply */}
      <div className={`${card} space-y-3`}>
        <div className="font-bold text-slate-900 flex items-center gap-2"><Clock size={16} className="text-violet-600" />Автоответ в нерабочее время</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" disabled={!edit} checked={s.autoReply.enabled} onChange={(e) => setS({ ...s, autoReply: { ...s.autoReply, enabled: e.target.checked } })} className="w-4 h-4 accent-[#C8102E]" />
          <span>Отвечать покупателям автоматически, когда магазин закрыт</span>
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <div><label className={labelCls}>Работаем с</label><input type="time" disabled={!edit} value={s.autoReply.from} onChange={(e) => setS({ ...s, autoReply: { ...s.autoReply, from: e.target.value } })} className={inputCls} /></div>
          <div><label className={labelCls}>до</label><input type="time" disabled={!edit} value={s.autoReply.to} onChange={(e) => setS({ ...s, autoReply: { ...s.autoReply, to: e.target.value } })} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Текст автоответа</label><textarea rows={2} disabled={!edit} value={s.autoReply.text} onChange={(e) => setS({ ...s, autoReply: { ...s.autoReply, text: e.target.value } })} className={inputCls} /></div>
        {edit && <button type="button" disabled={busy === 'a'} onClick={() => save('a', { autoReply: s.autoReply })} className={btnGray}>{busy === 'a' && <Loader2 size={14} className="animate-spin" />}Сохранить</button>}
        {lockNote}
        {msg.a && <Note ok={msg.a.ok}>{msg.a.text}</Note>}
      </div>

      {/* Broadcast */}
      {can('messages') && (
        <div className={`${card} space-y-3`}>
          <div className="font-bold text-slate-900 flex items-center gap-2"><Megaphone size={16} className="text-amber-600" />Рассылка постоянным клиентам</div>
          <p className="text-xs text-slate-500">
            Получат клиенты, которые писали вам на KGzone (кроме «Отказ»): в колокольчик на сайте и в Telegram, если он подключён.
            Сейчас получателей: <b>{bInfo?.recipients ?? '…'}</b>. Не чаще раза в сутки{bInfo?.lastAt ? `, последняя: ${new Date(bInfo.lastAt).toLocaleString('ru-RU')}` : ''}.
          </p>
          <textarea rows={3} maxLength={500} value={bText} onChange={(e) => setBText(e.target.value)} placeholder="Пришла новая партия колодок Toyota — оригинал, есть в наличии. Для СТО скидка 7%." className={inputCls} />
          <button type="button" disabled={busy === 'b' || bText.trim().length < 10 || !bInfo?.recipients} onClick={broadcast} className={btnRed}>{busy === 'b' ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}Отправить рассылку</button>
          {msg.b && <Note ok={msg.b.ok}>{msg.b.text}</Note>}
        </div>
      )}
    </div>
  );
};
