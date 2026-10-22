import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { getConversation, sendMessage, type ChatMessage } from '../../api/chat';

// Messages of one conversation with a reply box; refreshes every 15 seconds while open.
export const ChatThread: React.FC<{ conversationId: string; dark?: boolean; className?: string }> = ({ conversationId, dark = false, className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await getConversation(conversationId);
      setMessages(r.messages);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      setMessages(await sendMessage(conversationId, text.trim()));
      setText('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col ${className}`}>
      <div ref={listRef} className={`flex-1 min-h-[200px] max-h-[50vh] overflow-y-auto space-y-2 p-3 rounded-xl ${dark ? 'bg-neutral-950 border border-neutral-800' : 'bg-slate-50 border border-slate-200'}`}>
        {loading ? (
          <div className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" size={18} /></div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Сообщений пока нет</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${m.mine ? 'bg-[#C8102E] text-white rounded-br-sm' : dark ? 'bg-neutral-800 text-white rounded-bl-sm' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'}`}>
                <div data-no-i18n>{m.text}</div>
                <div className={`text-[10px] mt-0.5 ${m.mine ? 'text-white/70' : 'text-slate-400'}`}>{fmt(m.at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
          maxLength={2000}
          placeholder="Сообщение..."
          className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-sm resize-none ${dark ? 'bg-neutral-900 border border-neutral-700 text-white' : 'bg-white border border-slate-300'}`}
        />
        <button type="submit" disabled={sending || !text.trim()} className="px-4 rounded-xl bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-50 text-white cursor-pointer" aria-label="Отправить">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
