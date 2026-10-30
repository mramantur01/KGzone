import React, { useEffect, useState } from 'react';
import { Search, Phone, RefreshCw } from 'lucide-react';
import { call } from '../../api/admin';
import { formatPhone } from '../../api/auth';

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
}

// Buyers' "find me a part" requests for the brands this seller has listed
export const SellerRequestsPanel: React.FC = () => {
  const [data, setData] = useState<{ requests: SellerRequest[]; brands: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => call<{ requests: SellerRequest[]; brands: string[] }>('/api/part-requests/for-me').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (data && data.brands.length === 0) return null; // nothing listed yet: nothing to match

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
                <span className="text-slate-500">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
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
