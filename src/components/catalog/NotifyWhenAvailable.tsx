import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { requestSignIn } from '../../api/chat';
import { addWatch } from '../../api/watches';

// "Сообщить, когда появится": saves the search; a Telegram message (and a note in the cabinet)
// comes when a seller publishes a matching part.
export const NotifyWhenAvailable: React.FC<{ q: string; brand?: string; model?: string }> = ({ q, brand = '', model = '' }) => {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setState('idle'); setError(null); }, [q, brand, model]);

  const what = [q.trim(), brand, model].filter(Boolean).join(' ');
  if (!what) return null;

  const save = async () => {
    if (!user) { requestSignIn('Чтобы получить уведомление, когда деталь появится, войдите или зарегистрируйтесь.'); return; }
    setState('busy');
    setError(null);
    try { await addWatch(q.trim(), brand, model); setState('done'); }
    catch (e: any) { setError(e.message); setState('idle'); }
  };

  return (
    <div className="mt-4">
      {state === 'done' ? (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-400 font-semibold">
          <BellRing size={16} /> Сообщим, когда появится «<span data-no-i18n>{what}</span>». Подписки — в Личном кабинете.
        </p>
      ) : (
        <button type="button" onClick={save} disabled={state === 'busy'} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
          {state === 'busy' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          <span>Сообщить, когда появится</span>
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};
