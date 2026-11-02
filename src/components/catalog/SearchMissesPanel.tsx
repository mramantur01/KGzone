import React, { useEffect, useState } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { call } from '../../api/admin';

interface Miss { id: string; q: string; brand: string; model: string; count: number; lastAt: string }

// What buyers searched for on KGzone and found nothing (last 30 days), for the seller's makes
export const SearchMissesPanel: React.FC = () => {
  const [data, setData] = useState<{ misses: Miss[]; brands: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => call<{ misses: Miss[]; brands: string[] }>('/api/search-misses/for-me').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <TrendingUp size={16} className="text-emerald-600" />
        <span>Что ищут, а у вас нет</span>
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer" aria-label="Обновить"><RefreshCw size={12} /></button>
      </div>
      <p className="text-xs text-slate-500">Покупатели искали это на KGzone за последний месяц и ничего не нашли. Подсказка, что закупить или выставить.</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!data ? <p className="text-xs text-slate-400">Загрузка...</p> : data.misses.length === 0 ? (
        <p className="text-sm text-slate-500">Пока пусто — данные копятся, когда покупатели ищут детали.</p>
      ) : (
        <ol className="divide-y divide-slate-100 text-sm">
          {data.misses.map((m, i) => (
            <li key={m.id} className="py-2 flex items-center gap-3">
              <span className="w-6 text-right text-slate-400 font-bold">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate" data-no-i18n>
                <b>{m.q || '—'}</b>{(m.brand || m.model) && <span className="text-slate-500"> · {[m.brand, m.model].filter(Boolean).join(' ')}</span>}
              </span>
              <span className="text-xs text-slate-500 whitespace-nowrap">искали {m.count} раз</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
