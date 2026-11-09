import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { call } from '../../api/admin';

interface Notice { id: string; text: string; at: string }

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// Links inside a notice ("https://k-gzone.vercel.app/zapchast/...") become clickable
const withLinks = (text: string) =>
  text.split(/(https?:\/\/\S+)/g).map((piece, i) =>
    /^https?:\/\//.test(piece)
      ? <a key={i} href={piece.replace(/^https?:\/\/[^/]+/, '') || '/'} className="text-[#C8102E] font-semibold underline break-all">открыть</a>
      : <React.Fragment key={i}>{piece}</React.Fragment>);

/** Bell in the header: messages, approved listings, found parts. Polls once a minute while signed in. */
export const NotificationBell: React.FC = () => {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [readAt, setReadAt] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (document.hidden) return;
    call<{ items: Notice[]; unread: number; readAt: string }>('/api/notifications')
      .then((d) => { setItems(d.items || []); setUnread(d.unread || 0); setReadAt(d.readAt || ''); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      call('/api/notifications/read', { method: 'POST' }).catch(() => undefined);
    }
  };

  return (
    <div className="relative" ref={box}>
      <button
        onClick={toggle}
        className="relative p-2 text-neutral-300 hover:text-white transition-colors rounded-lg hover:bg-neutral-800 cursor-pointer"
        title="Уведомления"
        aria-label="Уведомления"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-black leading-4 text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 max-h-[70vh] overflow-y-auto bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-[60]">
          <div className="sticky top-0 bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-black text-sm">Уведомления</span>
            <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Закрыть"><X size={16} /></button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Пока ничего нет. Здесь появятся новые сообщения, ответы модератора и запчасти, которые вы ждёте.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id} className={`px-4 py-3 text-sm ${n.at > readAt ? 'bg-amber-50' : ''}`}>
                  <div className="whitespace-pre-line leading-snug" data-no-i18n>{withLinks(n.text)}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{ago(n.at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
