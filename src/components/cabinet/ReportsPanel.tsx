import React, { useCallback, useEffect, useState } from 'react';
import { Flag, RefreshCw } from 'lucide-react';
import { checkAdminKey, getAdminKey } from '../../api/admin';
import { listReports, setReportStatus, type ListingReport } from '../../api/reports';

const TABS: { id: ListingReport['status']; label: string }[] = [
  { id: 'new', label: 'Новые' },
  { id: 'resolved', label: 'Решены' },
  { id: 'dismissed', label: 'Отклонены' },
];

// Complaints from visitors about listings. Uses the same admin password as the moderation panels.
export const ReportsPanel: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<ListingReport[]>([]);
  const [tab, setTab] = useState<ListingReport['status']>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listReports());
      setAuthed(true);
    } catch (e: any) {
      if (e.status === 401) setAuthed(false);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const key = getAdminKey();
    if (key) checkAdminKey(key).then((ok) => { if (ok) load(); });
  }, [load]);

  const act = async (id: string, status: ListingReport['status']) => {
    try { await setReportStatus(id, status); await load(); } catch (e: any) { setError(e.message); }
  };

  const shown = items.filter((r) => r.status === tab);

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-red-500/30 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-red-300 text-sm">
          <Flag size={15} />
          <span>Жалобы на объявления</span>
        </div>
        <button type="button" onClick={load} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>{authed ? 'Обновить' : 'Загрузить'}</span>
        </button>
      </div>

      {!authed ? (
        <p className="text-xs text-slate-400">Войдите паролем администратора в блоке модерации выше, затем нажмите «Загрузить».</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${tab === t.id ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {t.label} ({items.filter((r) => r.status === t.id).length})
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">Жалоб нет</p>
          ) : (
            <div className="space-y-2">
              {shown.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-white" data-no-i18n>{r.listingTitle || r.listingId}</div>
                  <div className="text-slate-300">
                    {r.kind === 'car' ? 'Авто' : 'Запчасть'} · <span className="text-red-300">{r.reason}</span> · {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </div>
                  {r.comment && <div className="text-slate-400" data-no-i18n>{r.comment}</div>}
                  {r.contact && <div className="text-slate-500" data-no-i18n>{r.contact}</div>}
                  <div className="text-slate-500 font-mono">{r.listingId}</div>
                  {r.status === 'new' && (
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => act(r.id, 'resolved')} className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
                        Решено
                      </button>
                      <button type="button" onClick={() => act(r.id, 'dismissed')} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer">
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};
