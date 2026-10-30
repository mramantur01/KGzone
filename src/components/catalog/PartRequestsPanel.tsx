import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { listPartRequests, setPartRequestStatus, type PartRequest } from '../../api/partRequests';
import { formatPhone } from '../../api/auth';

const TABS: { id: PartRequest['status']; label: string }[] = [
  { id: 'new', label: 'Новые' },
  { id: 'in_work', label: 'В работе' },
  { id: 'done', label: 'Найдено' },
  { id: 'closed', label: 'Закрыты' },
];

// Staff: buyers' "find me a part" requests
export const PartRequestsPanel: React.FC = () => {
  const [items, setItems] = useState<PartRequest[] | null>(null);
  const [tab, setTab] = useState<PartRequest['status']>('new');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => listPartRequests().then(setItems).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const shown = (items || []).filter((r) => r.status === tab);
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
        <Search size={15} className="text-amber-600" />
        <span>Заявки на поиск запчастей</span>
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer" aria-label="Обновить"><RefreshCw size={12} /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${tab === t.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {t.label} ({(items || []).filter((r) => r.status === t.id).length})
          </button>
        ))}
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {shown.length === 0 ? (
        <p className="text-slate-400 text-center py-3">{items ? 'Заявок нет' : 'Загрузка...'}</p>
      ) : shown.map((r) => (
        <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="font-bold text-slate-900" data-no-i18n>
            {r.part}{[r.brand, r.model, r.generation].filter(Boolean).length ? ` — ${[r.brand, r.model, r.generation].filter(Boolean).join(' ')}` : ''}
          </div>
          {r.comment && <div className="text-slate-600" data-no-i18n>{r.comment}</div>}
          <div className="text-slate-500">
            <span data-no-i18n>{r.name ? `${r.name}, ` : ''}</span>
            <a href={`tel:+${r.phone}`} className="font-mono text-slate-800 underline" data-no-i18n>{formatPhone(r.phone)}</a>
            {' · '}{new Date(r.createdAt).toLocaleString('ru-RU')}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TABS.filter((t) => t.id !== r.status).map((t) => (
              <button key={t.id} type="button" onClick={() => setPartRequestStatus(r.id, t.id).then(load).catch((e) => setError(e.message))} className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer">
                → {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
