import React, { useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { getTelegramLink, refreshMe, unlinkTelegram, type Account } from '../../api/auth';

// Connects the account to the KGzone Telegram bot: new messages, moderation results and
// "find me a part" requests arrive in Telegram.
export const TelegramCard: React.FC<{ user: Account; compact?: boolean }> = ({ user, compact }) => {
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const stopWaiting = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setWaiting(false);
  };
  useEffect(() => stopWaiting, []);
  useEffect(() => { if (user.telegramLinked) stopWaiting(); }, [user.telegramLinked]);

  const connect = async () => {
    setError(null);
    setBusy(true);
    // Open the window first (inside the click) so pop-up blockers allow it
    const win = window.open('about:blank', '_blank');
    try {
      const url = await getTelegramLink();
      if (win) win.location.href = url; else window.location.href = url;
      setWaiting(true);
      let tries = 0;
      timer.current = window.setInterval(() => {
        tries++;
        refreshMe();
        if (tries > 60) stopWaiting();
      }, 3000);
    } catch (e: any) {
      win?.close();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try { await unlinkTelegram(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <Send size={16} className="text-sky-500" />
        <span>Уведомления в Telegram</span>
        {user.telegramLinked && <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Подключено</span>}
      </div>
      {!compact && (
        <p className="text-sm text-slate-600 mt-1">
          Сразу узнавайте о новых сообщениях покупателей, результатах модерации и заявках на запчасти для ваших марок.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {user.telegramLinked ? (
          <button type="button" onClick={disconnect} disabled={busy} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer disabled:opacity-60">
            Отключить
          </button>
        ) : (
          <button type="button" onClick={connect} disabled={busy} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            <span>Подключить Telegram</span>
          </button>
        )}
        {waiting && !user.telegramLinked && (
          <span className="text-xs text-slate-500">В Telegram нажмите «Запустить» (Start) — здесь появится «Подключено».</span>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
};
