import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { listConversations, type ConversationSummary } from '../../api/chat';
import { ChatThread } from './ChatThread';

// Cabinet → "Сообщения": conversation list + the selected thread
export const MessagesPanel: React.FC = () => {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listConversations()); setError(null); } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = items.filter((c) => filter === 'all' || c.role === filter);
  const current = items.find((c) => c.id === selected) || null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">Сообщения</h2>
        <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /><span>Обновить</span>
        </button>
      </div>
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className={`md:col-span-2 space-y-2 ${current ? 'hidden md:block' : ''}`}>
          <div className="flex flex-wrap gap-1.5">
            {([['all', 'Все'], ['buyer', 'Я покупаю'], ['seller', 'Мне пишут покупатели']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filter === id ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
              {loading ? 'Загрузка...' : 'Диалогов пока нет. Нажмите «Написать продавцу» в объявлении.'}
            </p>
          ) : (
            shown.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={`w-full text-left p-3 rounded-2xl border flex gap-3 cursor-pointer ${selected === c.id ? 'border-[#C8102E] bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                {c.listingImage ? <img src={c.listingImage} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate" data-no-i18n>{c.otherName}</span>
                    {c.unread > 0 && <span className="ml-auto text-[10px] font-bold px-1.5 rounded-full bg-[#C8102E] text-white">{c.unread}</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate" data-no-i18n>{c.listingTitle}</div>
                  <div className="text-xs text-slate-600 truncate" data-no-i18n>{c.lastMessage?.text}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={`md:col-span-3 ${current ? '' : 'hidden md:block'}`}>
          {current ? (
            <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setSelected(null); load(); }} className="md:hidden p-1 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Назад"><ArrowLeft size={18} /></button>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900" data-no-i18n>{current.otherName}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {current.role === 'buyer' ? 'Вы покупатель' : 'Вы продавец'} · <span data-no-i18n>{current.listingTitle}</span>
                  </div>
                </div>
              </div>
              <ChatThread key={current.id} conversationId={current.id} />
              <p className="text-[11px] text-slate-400">Не переводите предоплату, пока не увидите деталь. Подозрительное сообщение? Пожалуйтесь на объявление.</p>
            </div>
          ) : (
            <p className="p-10 text-center text-sm text-slate-400 bg-white rounded-2xl border border-slate-200">Выберите диалог слева</p>
          )}
        </div>
      </div>
    </div>
  );
};
