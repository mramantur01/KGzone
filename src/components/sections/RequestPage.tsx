import React, { useEffect, useState } from 'react';
import { Loader2, Phone, Search, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { VerifiedSellerBadge } from '../common/VerifiedSellerBadge';
import { closeRequest, getRequestView, myRequests, rememberRequest, requestKey, requestPath, type RequestView } from '../../api/partRequests';
import { partPath } from '../../seo/routes';

const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;

/** Buyer's request with sellers' price offers: kgzone/zayavka/<id>?k=<private key> */
export const RequestPage: React.FC<{ requestId: string }> = ({ requestId }) => {
  const key = new URLSearchParams(window.location.search).get('k') || requestKey(requestId);
  const [data, setData] = useState<RequestView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const load = () => getRequestView(requestId, key).then((d) => {
    setData(d);
    if (key) rememberRequest({ id: requestId, key, part: d.request.part, createdAt: d.request.createdAt });
  }).catch((e) => setError(e.message));
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-600">{error}. Проверьте ссылку на заявку.</div>;
  if (!data) return <div className="py-24 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;
  const r = data.request;
  const closed = r.status === 'done' || r.status === 'closed';
  const link = `${window.location.origin}${requestPath(r.id, key)}`;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="text-xs font-bold text-slate-500 uppercase">Ваша заявка</div>
        <h1 className="text-xl font-black text-slate-900 mt-0.5" data-no-i18n>{r.part}</h1>
        <div className="text-sm text-slate-600" data-no-i18n>{[r.brand, r.model, r.generation].filter(Boolean).join(' ')}{r.vin ? ` · VIN/кузов ${r.vin}` : ''}</div>
        {r.comment && <p className="text-sm text-slate-700 mt-1" data-no-i18n>{r.comment}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded-lg font-bold ${closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>{closed ? 'Заявка закрыта' : 'Продавцы присылают цены'}</span>
          <span className="text-slate-500">от {new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
          {key && (
            <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* blocked */ } }} className="ml-auto px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer">
              <Copy size={12} />{copied ? 'Ссылка скопирована' : 'Сохранить ссылку'}
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Эта страница открывается только по вашей ссылке. Новые предложения появляются сами.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 font-black text-slate-900">Предложения продавцов <span className="text-slate-400">{data.offers.length}</span></div>
        {data.offers.length === 0 ? (
          <div className="py-12 px-4 text-center text-sm text-slate-500">
            <Search size={28} className="mx-auto text-slate-300 mb-2" />
            Пока предложений нет. Заявку видят продавцы этой марки — их цены появятся здесь, а вам придёт уведомление.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.offers.map((o, i) => (
              <li key={o.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="truncate" data-no-i18n>{o.sellerName}</span>
                    {o.verified && <VerifiedSellerBadge size={13} />}
                    {i === 0 && data.offers.length > 1 && <span className="px-1.5 rounded bg-emerald-600 text-white text-[10px] font-black">ДЕШЕВЛЕ ВСЕХ</span>}
                  </div>
                  <div className="text-xs text-slate-500" data-no-i18n>{[o.condition, o.note].filter(Boolean).join(' · ') || '—'}</div>
                  {o.partId && <a href={partPath({ id: o.partId, title: r.part })} className="text-xs font-bold text-[#1d6fb8] hover:underline inline-flex items-center gap-1"><ExternalLink size={11} />Объявление продавца</a>}
                </div>
                <div className="text-lg font-black text-slate-900 whitespace-nowrap">{som(o.priceKgs)}</div>
                <a href={`tel:${o.sellerPhone.replace(/[^\d+]/g, '')}`} className="px-3 py-2 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-bold inline-flex items-center gap-1.5">
                  <Phone size={14} /><span data-no-i18n>{o.sellerPhone}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!closed && key && (
        <button type="button" onClick={async () => { await closeRequest(r.id, key); load(); }} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 inline-flex items-center justify-center gap-2 cursor-pointer">
          <CheckCircle2 size={15} />Я нашёл деталь — закрыть заявку
        </button>
      )}
      <p className="text-[11px] text-slate-500">Оплачивайте при получении и осматривайте деталь. Не переводите предоплату незнакомым продавцам.</p>
    </div>
  );
};

/** Short list of the buyer's own requests (shown on the parts page) */
export const MyRequestsStrip: React.FC = () => {
  const [list] = useState(() => myRequests().slice(0, 3));
  if (!list.length) return null;
  return (
    <div className="mb-3 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-neutral-200 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-bold text-amber-300">Мои заявки:</span>
      {list.map((r) => (
        <a key={r.id} href={requestPath(r.id, r.key)} className="underline hover:text-white" data-no-i18n>{r.part}</a>
      ))}
      <span className="text-neutral-400">— смотрите цены от продавцов</span>
    </div>
  );
};
