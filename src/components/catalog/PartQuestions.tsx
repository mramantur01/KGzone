import React, { useEffect, useState } from 'react';
import { HelpCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { call } from '../../api/admin';
import { useAuth } from '../../api/auth';
import { requestSignIn } from '../../api/chat';
import { isDemoListing } from '../../utils/demo';
import { partPath } from '../../seo/routes';

interface Question { id: string; partId: string; authorId: string; authorName: string; text: string; answer?: string; answeredBy?: string; answeredAt?: string; createdAt: string; partTitle?: string; partImage?: string }

const AnswerBox: React.FC<{ q: Question; onDone: (q: Question) => void; dark?: boolean }> = ({ q, onDone, dark }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { const r = await call<{ question: Question }>(`/api/questions/${encodeURIComponent(q.id)}/answer`, { method: 'POST', body: JSON.stringify({ text }) }); onDone(r.question); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={send} className="mt-1.5 flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ваш ответ — его увидят все покупатели" className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs ${dark ? 'bg-neutral-950 border border-neutral-700 text-white' : 'border border-slate-300'}`} />
      <button type="submit" disabled={busy || !text.trim()} className="px-3 py-1.5 rounded-lg bg-[#C8102E] text-white text-xs font-bold cursor-pointer disabled:opacity-60">{busy ? <Loader2 size={12} className="animate-spin" /> : 'Ответить'}</button>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </form>
  );
};

/** Questions and answers on a listing (dark product page) */
export const PartQuestions: React.FC<{ partId: string }> = ({ partId }) => {
  const { user } = useAuth();
  const [list, setList] = useState<Question[] | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const demo = isDemoListing(partId);
  const load = () => call<{ questions: Question[]; isSeller: boolean }>(`/api/parts/${encodeURIComponent(partId)}/questions`).then((r) => { setList(r.questions); setIsSeller(r.isSeller); }).catch(() => setList([]));
  useEffect(() => { if (!demo) load(); else setList([]); }, [partId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { requestSignIn('Чтобы задать вопрос продавцу, войдите или зарегистрируйтесь.'); return; }
    setBusy(true); setMsg(null);
    try { await call(`/api/parts/${encodeURIComponent(partId)}/questions`, { method: 'POST', body: JSON.stringify({ text }) }); setText(''); setMsg('Вопрос отправлен продавцу. Ответ появится здесь, а вам придёт уведомление.'); load(); }
    catch (err: any) { setMsg(err.message); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { await call(`/api/questions/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined); load(); };
  if (demo) return null;

  return (
    <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-xs space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1"><HelpCircle size={12} />Вопросы о товаре {list?.length ? `(${list.length})` : ''}</div>
      {list === null ? <Loader2 size={14} className="animate-spin text-neutral-500" /> : list.length === 0 ? (
        <p className="text-neutral-500">Пока вопросов нет. Спросите — ответ продавца увидят все.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((q) => (
            <li key={q.id} className="p-2 rounded-lg bg-neutral-950/70">
              <div className="flex items-start gap-2">
                <span className="flex-1 text-neutral-200" data-no-i18n><b className="text-white">{q.authorName}:</b> {q.text}</span>
                {(isSeller || q.authorId === user?.id) && <button type="button" onClick={() => remove(q.id)} className="text-neutral-500 hover:text-red-400 cursor-pointer" aria-label="Удалить вопрос"><Trash2 size={12} /></button>}
              </div>
              {q.answer ? (
                <div className="mt-1 pl-2 border-l-2 border-emerald-600 text-emerald-200" data-no-i18n><b>Продавец:</b> {q.answer}</div>
              ) : isSeller ? (
                <AnswerBox q={q} dark onDone={() => load()} />
              ) : <div className="mt-1 text-neutral-500">Ждём ответа продавца</div>}
            </li>
          ))}
        </ul>
      )}
      {!isSeller && (
        <form onSubmit={ask} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Например: подойдёт на Camry 2019 года?" className="flex-1 min-w-0 px-2.5 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 placeholder:text-neutral-500" />
          <button type="submit" disabled={busy || text.trim().length < 5} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer disabled:opacity-50">{busy ? <Loader2 size={12} className="animate-spin" /> : 'Спросить'}</button>
        </form>
      )}
      {msg && <p className="text-amber-300">{msg}</p>}
    </div>
  );
};

/** Seller cabinet: questions on my listings that still wait for an answer */
export const QuestionsForMe: React.FC = () => {
  const [list, setList] = useState<Question[] | null>(null);
  const load = () => call<{ questions: Question[] }>('/api/questions/for-me').then((r) => setList(r.questions)).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  if (!list || list.length === 0) return null;
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <HelpCircle size={16} className="text-sky-600" /><span>Вопросы покупателей о ваших товарах ({list.length})</span>
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer" aria-label="Обновить"><RefreshCw size={12} /></button>
      </div>
      <p className="text-xs text-slate-500">Ответ увидят все, кто откроет товар, — одинаковые вопросы по телефону станут реже.</p>
      <div className="space-y-2">
        {list.map((q) => (
          <div key={q.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <a href={partPath({ id: q.partId, title: q.partTitle || 'zapchast' })} className="text-xs font-bold text-[#1d6fb8] hover:underline" data-no-i18n>{q.partTitle}</a>
            <div className="mt-0.5" data-no-i18n><b>{q.authorName}:</b> {q.text}</div>
            <AnswerBox q={q} onDone={() => setList((l) => (l || []).filter((x) => x.id !== q.id))} />
          </div>
        ))}
      </div>
    </div>
  );
};
