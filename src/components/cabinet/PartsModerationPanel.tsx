import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Lock, RefreshCw, Trash2, LogOut, Clock } from 'lucide-react';
import {
  adminDeletePart, adminUpdatePart, checkAdminKey, getAdminKey, listAdminParts, moderatePart, setAdminKey,
  type ModeratedPart, type PartStatus,
} from '../../api/parts';

const STATUS_TABS: { id: PartStatus; label: string }[] = [
  { id: 'pending', label: 'На модерации' },
  { id: 'approved', label: 'Опубликованы' },
  { id: 'rejected', label: 'Отклонены' },
];

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Moderation queue for parts submitted by sellers. Talks to /api/admin/parts with the admin password
// (the ADMIN_TOKEN env var on the server), which is kept only for this browser session.
export const PartsModerationPanel: React.FC = () => {
  const [authed, setAuthed] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<PartStatus>('pending');
  const [parts, setParts] = useState<ModeratedPart[]>([]);
  const [counts, setCounts] = useState<Record<PartStatus, number>>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listAdminParts('all');
      setCounts({
        pending: all.filter((p) => p.moderation?.status === 'pending').length,
        approved: all.filter((p) => p.moderation?.status === 'approved').length,
        rejected: all.filter((p) => p.moderation?.status === 'rejected').length,
      });
      setParts(all);
    } catch (e: any) {
      if (e.status === 401) { setAuthed(false); setAdminKey(''); }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore a session password silently
  useEffect(() => {
    const key = getAdminKey();
    if (key) checkAdminKey(key).then((ok) => { setAuthed(ok); if (ok) load(); });
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await checkAdminKey(password.trim());
    setPassword('');
    if (!ok) { setError('Неверный пароль администратора'); return; }
    setAuthed(true);
    load();
  };

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); await load(); } catch (e: any) { setError(e.message); }
  };

  if (!authed) {
    return (
      <form onSubmit={login} className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
        <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
          <Lock size={16} />
          <span>Модерация запчастей продавцов</span>
        </div>
        <p className="text-xs text-slate-400">
          Введите пароль администратора (переменная ADMIN_TOKEN на сервере), чтобы одобрять и отклонять заявки.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль администратора"
            autoComplete="current-password"
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold cursor-pointer">
            Войти
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    );
  }

  const shown = parts.filter((p) => p.moderation?.status === tab);

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-amber-300 text-sm">Модерация запчастей продавцов</div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Обновить</span>
          </button>
          <button type="button" onClick={() => { setAdminKey(''); setAuthed(false); }} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer">
            <LogOut size={12} />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${tab === t.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">
          {tab === 'pending' ? 'Новых заявок нет' : 'Здесь пока пусто'}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((p) => (
            <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row gap-3">
              <img src={p.image} alt="" className="w-full sm:w-28 h-24 object-cover rounded-lg bg-slate-800" />
              <div className="flex-1 min-w-0 space-y-1 text-xs">
                <div className="font-bold text-white text-sm">{p.title}</div>
                <div className="text-slate-300">
                  {p.brand} {p.model} · OEM <span className="font-mono text-amber-300">{p.partNumber}</span> · {p.priceKgs.toLocaleString('ru-RU')} сом · {p.stockCount} шт.
                </div>
                <div className="text-slate-400">
                  {p.storeName || p.companyName} · {p.market} {p.containerInfo ? `· ${p.containerInfo}` : ''} · {p.sellerPhone}
                </div>
                {p.description && <div className="text-slate-400 line-clamp-2">{p.description}</div>}
                <div className="text-slate-500 flex items-center gap-1">
                  <Clock size={11} />
                  <span>Подана: {fmtDate(p.moderation?.submittedAt)}</span>
                  {p.moderation?.reason && <span className="text-red-400">· Причина: {p.moderation.reason}</span>}
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                {tab !== 'approved' && (
                  <button type="button" onClick={() => act(() => moderatePart(p.id, 'approve'))} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <CheckCircle2 size={13} />
                    <span>Одобрить</span>
                  </button>
                )}
                {tab === 'pending' && rejecting !== p.id && (
                  <button type="button" onClick={() => { setRejecting(p.id); setReason(''); }} className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <XCircle size={13} />
                    <span>Отклонить</span>
                  </button>
                )}
                {tab === 'approved' && (
                  <button type="button" onClick={() => act(() => adminUpdatePart(p.id, { stockCount: p.stockCount > 0 ? 0 : 1 }))} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer">
                    {p.stockCount > 0 ? 'Нет в наличии' : 'В наличии'}
                  </button>
                )}
                {tab !== 'pending' && (
                  <button type="button" onClick={() => { if (confirm('Удалить запчасть из базы?')) act(() => adminDeletePart(p.id)); }} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Trash2 size={13} />
                    <span>Удалить</span>
                  </button>
                )}
              </div>

              {rejecting === p.id && (
                <div className="sm:w-64 flex flex-col gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Причина отказа (увидит админ)"
                    className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { act(() => moderatePart(p.id, 'reject', reason)); setRejecting(null); }} className="flex-1 px-2 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold cursor-pointer">
                      Отклонить
                    </button>
                    <button type="button" onClick={() => setRejecting(null)} className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer">
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
