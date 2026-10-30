import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { call } from '../../api/admin';

interface Review { id: string; authorName: string; city?: string; rating: number; text: string; targetTitle?: string; status?: string; createdAt?: string; date?: string }

// Staff: site reviews wait here until approved
export const ReviewsModerationPanel: React.FC = () => {
  const [items, setItems] = useState<Review[] | null>(null);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => call<{ reviews: Review[] }>('/api/admin/reviews', {}, true).then((r) => setItems(r.reviews)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const setStatus = (id: string, status: 'approved' | 'rejected') =>
    call(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }, true).then(load).catch((e) => setError(e.message));

  const statusOf = (r: Review) => (r.status === 'approved' || r.status === 'rejected' ? r.status : 'pending');
  const shown = (items || []).filter((r) => statusOf(r) === tab);
  const tabs: [typeof tab, string][] = [['pending', 'На модерации'], ['approved', 'Опубликованы'], ['rejected', 'Отклонены']];

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
        <MessageSquare size={15} className="text-sky-600" />
        <span>Отзывы на сайте</span>
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer" aria-label="Обновить"><RefreshCw size={12} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${tab === id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {label} ({(items || []).filter((r) => statusOf(r) === id).length})
          </button>
        ))}
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {shown.length === 0 ? <p className="text-slate-400 text-center py-3">{items ? 'Пусто' : 'Загрузка...'}</p> : shown.map((r) => (
        <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="font-bold text-slate-900" data-no-i18n>{r.authorName}{r.city ? `, ${r.city}` : ''} · {r.rating}/5</div>
          {r.targetTitle && <div className="text-slate-500" data-no-i18n>{r.targetTitle}</div>}
          <div className="text-slate-700 whitespace-pre-wrap" data-no-i18n>{r.text}</div>
          <div className="flex gap-1.5 pt-1">
            {statusOf(r) !== 'approved' && <button type="button" onClick={() => setStatus(r.id, 'approved')} className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer">Опубликовать</button>}
            {statusOf(r) !== 'rejected' && <button type="button" onClick={() => setStatus(r.id, 'rejected')} className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold cursor-pointer">Отклонить</button>}
          </div>
        </div>
      ))}
    </div>
  );
};
