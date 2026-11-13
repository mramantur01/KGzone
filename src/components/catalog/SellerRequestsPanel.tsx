import React, { useEffect, useState } from 'react';
import { Search, Phone, RefreshCw, Send, Loader2 } from 'lucide-react';
import { call } from '../../api/admin';
import { formatPhone } from '../../api/auth';
import { sendOffer, type RequestOffer } from '../../api/partRequests';

// "Предложить цену": the seller answers a request with a price; the buyer compares offers
const OfferForm: React.FC<{ requestId: string; mine: RequestOffer | null; onSent: (o: RequestOffer) => void }> = ({ requestId, mine, onSent }) => {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(mine ? String(mine.priceKgs) : '');
  const [condition, setCondition] = useState(mine?.condition || 'Новый');
  const [note, setNote] = useState(mine?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold flex items-center gap-1 cursor-pointer">
        <Send size={12} /><span>{mine ? `Ваша цена: ${mine.priceKgs.toLocaleString('ru-RU')} сом — изменить` : 'Предложить цену'}</span>
      </button>
    );
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { const r = await sendOffer(requestId, { priceKgs: Number(price), condition, note }); onSent(r.offer); setOpen(false); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="w-full mt-1 p-2.5 rounded-xl bg-white border border-slate-200 grid grid-cols-2 sm:grid-cols-[110px_150px_1fr_auto] gap-2 items-center">
      <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="1" required placeholder="Цена, сом" className="px-2.5 py-2 border border-slate-300 rounded-lg" />
      <select value={condition} onChange={(e) => setCondition(e.target.value)} className="px-2 py-2 border border-slate-300 rounded-lg bg-white">
        {['Новый', 'Новый (Оригинал)', 'Дубликат (OEM)', 'Б/у (Контрактный)', 'Б/У с разбора', 'Восстановленная'].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Комментарий: производитель, срок, доставка" className="col-span-2 sm:col-span-1 px-2.5 py-2 border border-slate-300 rounded-lg" />
      <button type="submit" disabled={busy} className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg bg-[#C8102E] text-white font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60">
        {busy && <Loader2 size={12} className="animate-spin" />}Отправить
      </button>
      {error && <p className="col-span-full text-red-600">{error}</p>}
    </form>
  );
};

interface SellerRequest {
  id: string;
  part: string;
  brand: string;
  model: string;
  generation?: string;
  vin?: string;
  comment?: string;
  name?: string;
  phone: string;
  createdAt: string;
  offersCount?: number;
  myOffer?: RequestOffer | null;
}

// Buyers' "find me a part" requests for the brands this seller has listed
export const SellerRequestsPanel: React.FC<{ showEmpty?: boolean }> = ({ showEmpty = false }) => {
  const [data, setData] = useState<{ requests: SellerRequest[]; brands: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => call<{ requests: SellerRequest[]; brands: string[] }>('/api/part-requests/for-me').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (data && data.brands.length === 0) {
    // nothing listed yet: nothing to match
    return showEmpty ? (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-sm text-slate-600">
        <p className="font-bold text-slate-900 text-base">Заявки покупателей</p>
        <p className="mt-1">Здесь появятся заявки «ищу деталь» для марок, по которым у вас есть товары на сайте.</p>
      </div>
    ) : null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <Search size={16} className="text-[#C8102E]" />
        <span>Покупатели ищут запчасти для ваших марок</span>
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer" aria-label="Обновить"><RefreshCw size={12} /></button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!data ? <p className="text-xs text-slate-400">Загрузка...</p> : data.requests.length === 0 ? (
        <p className="text-sm text-slate-500">Пока заявок нет. Когда покупатель оставит заявку на <span data-no-i18n>{data.brands.join(', ')}</span>, она появится здесь.</p>
      ) : (
        <div className="space-y-2">
          {data.requests.map((r) => (
            <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div className="font-bold text-slate-900" data-no-i18n>{r.part}</div>
              <div className="text-xs text-slate-600" data-no-i18n>
                {[r.brand, r.model, r.generation].filter(Boolean).join(' ')}{r.vin ? ` · VIN/кузов ${r.vin}` : ''}
              </div>
              {r.comment && <div className="text-xs text-slate-600 mt-1" data-no-i18n>{r.comment}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString('ru-RU')}{r.offersCount ? ` · предложений: ${r.offersCount}` : ''}</span>
                <OfferForm requestId={r.id} mine={r.myOffer || null} onSent={(o) => setData((d) => d && { ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, myOffer: o, offersCount: (x.offersCount || 0) + (x.myOffer ? 0 : 1) } : x)) })} />
                <a href={`tel:+${r.phone}`} className="px-3 py-1.5 rounded-lg bg-[#C8102E] text-white font-bold flex items-center gap-1">
                  <Phone size={12} /><span data-no-i18n>{r.name ? `${r.name}, ` : ''}{formatPhone(r.phone)}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
