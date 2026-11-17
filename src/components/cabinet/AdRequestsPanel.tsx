import React, { useEffect, useState } from 'react';
import { Megaphone, Loader2, ExternalLink, Phone } from 'lucide-react';
import {
  loadAdPrices, saveAdPrices, listAdRequests, setAdRequestStatus, publishAdRequest,
  AD_PERIOD_LABELS, AD_PLACE_LABELS, type AdPrices, type AdRequest,
} from '../../api/ads';
import { loadBanner } from '../../api/banner';

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white';
const STATUS: Record<AdRequest['status'], [string, string]> = {
  new: ['Новая', 'bg-amber-100 text-amber-800'],
  paid: ['Оплачена', 'bg-sky-100 text-sky-800'],
  published: ['На сайте', 'bg-emerald-100 text-emerald-800'],
  rejected: ['Отклонена', 'bg-slate-100 text-slate-500'],
};
const ru = (d: string) => d.split('-').reverse().join('.');

// Owner: ad prices shown on /reklama and the advertisers' requests
export const AdRequestsPanel: React.FC = () => {
  const [prices, setPrices] = useState<AdPrices | null>(null);
  const [requests, setRequests] = useState<AdRequest[] | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = () => listAdRequests().then(setRequests).catch((e) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { loadAdPrices().then(setPrices).catch(() => undefined); load(); }, []);

  const savePrices = async () => {
    if (!prices) return;
    setBusy('prices'); setMsg(null);
    try { setPrices(await saveAdPrices(prices)); setMsg({ ok: true, text: 'Цены сохранены — они видны на странице «Реклама на KGzone».' }); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const status = async (r: AdRequest, s: AdRequest['status']) => {
    setBusy(r.id); setMsg(null);
    try { await setAdRequestStatus(r.id, s); await load(); } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const publish = async (r: AdRequest) => {
    if (!confirm(`Поставить рекламу «${r.title || r.business}» в ${AD_PLACE_LABELS[r.place].toLowerCase()}? Деньги уже получены?`)) return;
    setBusy(r.id); setMsg(null);
    try { await publishAdRequest(r.id, await loadBanner(false, r.place)); await loadBanner(true, r.place); await load(); setMsg({ ok: true, text: 'Слайд добавлен с датами показа. Его можно изменить в «Слайдах» выше.' }); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(''); }
  };
  const num = (k: keyof AdPrices) => (e: React.ChangeEvent<HTMLInputElement>) => prices && setPrices({ ...prices, [k]: Number(e.target.value) || 0 });

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <Megaphone size={16} className="text-[#C8102E]" />Заявки на рекламу
        <a href="/reklama" target="_blank" rel="noopener" className="ml-auto text-xs font-bold text-[#1d6fb8] hover:underline inline-flex items-center gap-1">Страница для рекламодателей<ExternalLink size={12} /></a>
      </div>

      {prices && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="font-bold text-slate-800 text-xs">Цены (сом). 0 — «по договорённости»</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <label>Запчасти, неделя<input type="number" min={0} value={prices.partsWeek} onChange={num('partsWeek')} className={inputCls} /></label>
            <label>Запчасти, месяц<input type="number" min={0} value={prices.partsMonth} onChange={num('partsMonth')} className={inputCls} /></label>
            <label>Сервис, неделя<input type="number" min={0} value={prices.stoWeek} onChange={num('stoWeek')} className={inputCls} /></label>
            <label>Сервис, месяц<input type="number" min={0} value={prices.stoMonth} onChange={num('stoMonth')} className={inputCls} /></label>
            <label>Сбоку, неделя<input type="number" min={0} value={prices.sideWeek} onChange={num('sideWeek')} className={inputCls} /></label>
            <label>Сбоку, месяц<input type="number" min={0} value={prices.sideMonth} onChange={num('sideMonth')} className={inputCls} /></label>
          </div>
          <input value={prices.note} onChange={(e) => setPrices({ ...prices, note: e.target.value })} maxLength={300} placeholder="Примечание для рекламодателей, например: оплата MBank, скидка за 3 месяца" className={inputCls} />
          <button type="button" onClick={savePrices} disabled={busy === 'prices'} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer">{busy === 'prices' && <Loader2 size={13} className="animate-spin" />}Сохранить цены</button>
        </div>
      )}

      {msg && <p className={`text-xs rounded-lg px-3 py-2 border ${msg.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>{msg.text}</p>}

      {!requests ? <Loader2 className="animate-spin text-slate-400" /> : requests.length === 0 ? (
        <p className="text-xs text-slate-500">Заявок пока нет. Рекламодатели оставляют их на странице «Реклама на KGzone» — туда ведут кнопки «Разместить свою рекламу».</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
              {r.image && <img src={r.image} alt="" className="w-full sm:w-40 h-20 object-cover rounded-lg bg-slate-100" />}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-slate-900" data-no-i18n>{r.business || r.name}</b>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                </div>
                <div className="text-xs text-slate-600">{AD_PLACE_LABELS[r.place]} · {AD_PERIOD_LABELS[r.period]} · с {ru(r.startDate)}</div>
                {(r.title || r.text) && <div className="text-xs text-slate-800" data-no-i18n><b>{r.title}</b> {r.text}</div>}
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3" data-no-i18n>
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-[#1d6fb8]"><Phone size={11} />{r.name}, {r.phone}</a>
                  {r.href && <a href={r.href} target="_blank" rel="noopener noreferrer" className="text-[#1d6fb8] truncate max-w-[220px]">{r.href}</a>}
                </div>
                {r.comment && <div className="text-xs text-slate-500" data-no-i18n>«{r.comment}»</div>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status !== 'published' && <button type="button" disabled={!!busy} onClick={() => publish(r)} className="px-3 py-1.5 rounded-lg bg-[#C8102E] text-white text-xs font-bold cursor-pointer">Поставить на сайт</button>}
                  {r.status === 'new' && <button type="button" disabled={!!busy} onClick={() => status(r, 'paid')} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold cursor-pointer">Отметить: оплачено</button>}
                  {r.status !== 'rejected' && r.status !== 'published' && <button type="button" disabled={!!busy} onClick={() => status(r, 'rejected')} className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-bold cursor-pointer">Отклонить</button>}
                  {busy === r.id && <Loader2 size={14} className="animate-spin text-slate-400" />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
