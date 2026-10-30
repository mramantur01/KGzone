import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Lock, RefreshCw, Trash2, LogOut, Clock } from 'lucide-react';
import { checkAdminKey, getAdminKey, setAdminKey, type ModerationInfo, type ModerationStatus } from '../../api/admin';

export interface ModeratedItem {
  id: string;
  moderation?: ModerationInfo;
}

export interface ModerationPanelProps<T extends ModeratedItem> {
  title: string;
  list: () => Promise<T[]>;
  moderate: (id: string, action: 'approve' | 'reject', reason?: string) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  /** Extra button for published items (e.g. toggle stock) */
  publishedActions?: { label: (item: T) => string; run: (item: T) => Promise<unknown> }[];
  image: (item: T) => string;
  heading: (item: T) => string;
  details: (item: T) => React.ReactNode;
}

const STATUS_TABS: { id: ModerationStatus; label: string }[] = [
  { id: 'pending', label: 'На модерации' },
  { id: 'approved', label: 'Опубликованы' },
  { id: 'rejected', label: 'Отклонены' },
];

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Moderation queue for seller submissions (parts or car listings). The admin password
// (ADMIN_TOKEN on the server) is kept only for this browser session.
export function ModerationPanel<T extends ModeratedItem>(props: ModerationPanelProps<T>) {
  const { title, list, moderate, remove, publishedActions = [], image, heading, details } = props;
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<ModerationStatus>('pending');
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await list());
    } catch (e: any) {
      if (e.status === 401) { setAuthed(false); setAdminKey(''); }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [list]);

  // Signed-in admins/moderators get in automatically; otherwise restore the session password
  useEffect(() => {
    checkAdminKey(getAdminKey()).then((ok) => { setAuthed(ok); if (ok) load(); });
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
          <span>{title}</span>
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
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold cursor-pointer">
            Войти
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    );
  }

  const count = (s: ModerationStatus) => items.filter((i) => i.moderation?.status === s).length;
  const shown = items.filter((i) => i.moderation?.status === tab);

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-amber-300 text-sm">{title}</div>
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
            {t.label} ({count(t.id)})
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">{tab === 'pending' ? 'Новых заявок нет' : 'Здесь пока пусто'}</p>
      ) : (
        <div className="space-y-2">
          {shown.map((item) => (
            <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row gap-3">
              {image(item) ? (
                <img src={image(item)} alt="" className="w-full sm:w-28 h-24 object-cover rounded-lg bg-slate-800" />
              ) : (
                <div className="w-full sm:w-28 h-24 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] text-slate-500">Без фото</div>
              )}
              <div className="flex-1 min-w-0 space-y-1 text-xs">
                <div className="font-bold text-white text-sm" data-no-i18n>{heading(item)}</div>
                {details(item)}
                <div className="text-slate-500 flex flex-wrap items-center gap-1">
                  <Clock size={11} />
                  <span>Подана: {fmtDate(item.moderation?.submittedAt)}</span>
                  {item.moderation?.reason && <span className="text-red-400">· Причина: {item.moderation.reason}</span>}
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                {tab !== 'approved' && (
                  <button type="button" onClick={() => act(() => moderate(item.id, 'approve'))} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <CheckCircle2 size={13} />
                    <span>Одобрить</span>
                  </button>
                )}
                {tab === 'pending' && rejecting !== item.id && (
                  <button type="button" onClick={() => { setRejecting(item.id); setReason(''); }} className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <XCircle size={13} />
                    <span>Отклонить</span>
                  </button>
                )}
                {tab === 'approved' && publishedActions.map((a) => (
                  <button key={a.label(item)} type="button" onClick={() => act(() => a.run(item))} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer">
                    {a.label(item)}
                  </button>
                ))}
                {tab !== 'pending' && (
                  <button type="button" onClick={() => { if (confirm('Удалить из базы?')) act(() => remove(item.id)); }} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Trash2 size={13} />
                    <span>Удалить</span>
                  </button>
                )}
              </div>

              {rejecting === item.id && (
                <div className="sm:w-64 flex flex-col gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Причина отказа (увидит админ)"
                    className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { act(() => moderate(item.id, 'reject', reason)); setRejecting(null); }} className="flex-1 px-2 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold cursor-pointer">
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
}
