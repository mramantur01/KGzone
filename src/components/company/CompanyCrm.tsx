import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Phone, PhoneCall, MessageSquare, ShoppingBag, UserPlus, X, Loader2, Trash2, LayoutGrid, List, Download, FileText } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { InvoiceModal, type DocKind } from './InvoiceModal';
import {
  CRM_STAGE_LABELS, addCrmClient, deleteCrmClient, listCrm, updateCrmClient,
  type CompanyInfo, type CrmClient, type CrmStage, type CrmTeamMember,
} from '../../api/company';

const STAGES: CrmStage[] = ['new', 'work', 'waiting', 'won', 'lost'];
const STAGE_COLORS: Record<CrmStage, string> = {
  new: 'bg-sky-500', work: 'bg-amber-500', waiting: 'bg-violet-500', won: 'bg-emerald-600', lost: 'bg-slate-400',
};
const SOURCE: Record<CrmClient['source'], { label: string; icon: React.ElementType }> = {
  chat: { label: 'Переписка', icon: MessageSquare },
  order: { label: 'Заказ', icon: ShoppingBag },
  manual: { label: 'Вручную', icon: UserPlus },
};
const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} сом`;
const today = () => new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10); // Bishkek date
const fmtDay = (d: string) => d.split('-').reverse().join('.');
const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1';
const open = (c: CrmClient) => c.stage !== 'won' && c.stage !== 'lost';

/** CRM for companies: every chat and order becomes a client card; deals move through stages */
export const CompanyCrm: React.FC<{ info: CompanyInfo; onOpenMessages: () => void }> = ({ info, onOpenMessages }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<CrmClient[] | null>(null);
  const [team, setTeam] = useState<CrmTeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>(() => (typeof window !== 'undefined' && window.innerWidth < 900 ? 'list' : 'board'));
  const [query, setQuery] = useState('');
  const [who, setWho] = useState<'all' | 'mine' | 'nobody'>('all');
  const [onlyToday, setOnlyToday] = useState(false);
  const [editing, setEditing] = useState<CrmClient | 'new' | null>(null);

  const load = () => listCrm().then((r) => { setClients(r.clients); setTeam(r.team); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const put = (c: CrmClient) => setClients((list) => (list || []).some((x) => x.id === c.id) ? list!.map((x) => (x.id === c.id ? c : x)) : [c, ...(list || [])]);
  const move = async (c: CrmClient, stage: CrmStage) => {
    put({ ...c, stage });
    try { put(await updateCrmClient(c.id, { stage })); } catch (e: any) { setError(e.message); load(); }
  };

  const t = today();
  const due = (clients || []).filter((c) => open(c) && c.nextAt && c.nextAt <= t);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (clients || []).filter((c) =>
      (!q || [c.name, c.phone, c.interest, c.note, c.managerName].join(' ').toLowerCase().includes(q)) &&
      (who === 'all' || (who === 'mine' ? c.managerId === user?.id : !c.managerId)) &&
      (!onlyToday || (open(c) && c.nextAt && c.nextAt <= t)));
  }, [clients, query, who, onlyToday, user?.id, t]);

  if (error && !clients) return <p className="p-4 rounded-2xl bg-white border border-slate-200 text-sm text-red-600">{error}</p>;
  if (!clients) return <div className="py-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>;

  // Funnel numbers
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const recent = clients.filter((c) => c.createdAt >= monthAgo);
  const won = recent.filter((c) => c.stage === 'won');
  const conversion = recent.length ? Math.round((won.length / recent.length) * 100) : 0;
  const pipeline = clients.filter(open).reduce((n, c) => n + c.amountKgs, 0);
  const wonSum = won.reduce((n, c) => n + c.amountKgs, 0);

  const exportCsv = () => {
    const rows = [['Имя', 'Телефон', 'Интерес', 'Этап', 'Сумма', 'Связаться', 'Ответственный', 'Источник', 'Заметка']]
      .concat(shown.map((c) => [c.name, c.phone, c.interest, CRM_STAGE_LABELS[c.stage], String(c.amountKgs), c.nextAt, c.managerName, SOURCE[c.source].label, c.note]));
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `kgzone-klienty-${t}.csv`;
    a.click();
  };

  const Card: React.FC<{ c: CrmClient; compact?: boolean }> = ({ c, compact }) => {
    const S = SOURCE[c.source];
    const late = open(c) && c.nextAt && c.nextAt < t;
    const isToday = open(c) && c.nextAt === t;
    return (
      <button type="button" onClick={() => setEditing(c)} className={`w-full text-left bg-white border rounded-xl p-2.5 hover:border-[#1d6fb8] cursor-pointer ${late ? 'border-red-300' : 'border-slate-200'}`}>
        <div className="flex items-start gap-1.5">
          <span className="font-bold text-sm text-slate-900 flex-1 min-w-0 truncate" data-no-i18n>{c.name}</span>
          <S.icon size={13} className="text-slate-400 shrink-0 mt-0.5" aria-label={S.label} />
        </div>
        {c.interest && <div className="text-xs text-slate-600 line-clamp-2 mt-0.5" data-no-i18n>{c.interest}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {c.amountKgs > 0 && <b className="text-slate-900">{som(c.amountKgs)}</b>}
          {c.nextAt && open(c) && (
            <span className={`px-1.5 rounded font-bold ${late ? 'bg-red-100 text-red-700' : isToday ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
              {late ? 'Просрочено' : isToday ? 'Сегодня' : fmtDay(c.nextAt)}
            </span>
          )}
          {!compact && c.managerName && <span className="text-slate-500 truncate" data-no-i18n>👤 {c.managerName}</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      {/* Heading */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 pt-3 sm:pt-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-slate-900">Клиенты <span className="text-slate-400 font-bold text-base">CRM</span></h1>
          <p className="text-xs text-slate-500 mt-0.5" data-no-i18n>{info.company.name} · {clients.length} клиентов · в работе {clients.filter(open).length}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setEditing('new')} aria-label="Добавить клиента" className="w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-full sm:rounded-lg bg-[#C8102E] hover:bg-[#a60d26] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus size={20} /><span className="hidden sm:inline">Добавить клиента</span>
          </button>
          <button type="button" onClick={exportCsv} className="hidden sm:flex px-3 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold items-center gap-1.5 cursor-pointer"><Download size={15} />Excel</button>
        </div>
      </div>

      {/* Funnel numbers */}
      <div className="px-3 sm:px-5 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Новых за 30 дней', String(recent.length)],
          ['Продано за 30 дней', `${won.length} · ${som(wonSum)}`],
          ['Конверсия в продажу', `${conversion}%`],
          ['Сделки в работе на сумму', som(pipeline)],
        ].map(([label, value]) => (
          <div key={label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-base font-black text-slate-900" data-no-i18n>{value}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {due.length > 0 && (
        <div className="px-3 sm:px-5 mt-3">
          <button type="button" onClick={() => setOnlyToday((v) => !v)} className="w-full text-left px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2 cursor-pointer hover:bg-amber-100">
            <PhoneCall size={15} className="shrink-0" />
            <span>Связаться сегодня: <b>{due.length}</b>{due.some((c) => c.nextAt < t) ? ` (просрочено: ${due.filter((c) => c.nextAt < t).length})` : ''}</span>
            <span className="ml-auto font-bold whitespace-nowrap">{onlyToday ? 'Показать всех' : 'Показать →'}</span>
          </button>
        </div>
      )}
      {error && <p className="mx-3 sm:mx-5 mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Search and filters */}
      <div className="px-3 sm:px-5 mt-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск: имя, телефон, запчасть, заметка" className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-[#1d6fb8]" />
        </div>
        <div className="flex gap-2">
          <select value={who} onChange={(e) => setWho(e.target.value as typeof who)} className="flex-1 sm:flex-none px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
            <option value="all">Все клиенты</option>
            <option value="mine">Мои клиенты</option>
            <option value="nobody">Без ответственного</option>
          </select>
          <div className="flex border border-slate-300 rounded-lg overflow-hidden shrink-0">
            <button type="button" onClick={() => setView('board')} aria-label="Доска" className={`px-2.5 cursor-pointer ${view === 'board' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={16} /></button>
            <button type="button" onClick={() => setView('list')} aria-label="Список" className={`px-2.5 cursor-pointer ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="py-14 px-4 text-center">
          <p className="font-bold text-slate-800">Здесь будут ваши клиенты</p>
          <p className="text-sm text-slate-500 mt-1">Каждый, кто напишет вам на KGzone или оформит заказ, появится здесь сам. Клиентов с рынка или по телефону добавьте вручную.</p>
          <button type="button" onClick={() => setEditing('new')} className="mt-4 px-5 py-2.5 rounded-lg bg-[#C8102E] text-white font-bold cursor-pointer">Добавить клиента</button>
        </div>
      ) : view === 'board' ? (
        // Deal board: one column per stage, move with the arrow menu or inside the card
        <div className="mt-3 px-3 sm:px-5 pb-4 grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-3 overflow-x-auto">
          {STAGES.map((st) => {
            const col = shown.filter((c) => c.stage === st);
            return (
              <div key={st} className="bg-slate-50 rounded-xl p-2 min-h-[160px]">
                <div className="flex items-center gap-1.5 px-1 pb-2 text-xs font-bold text-slate-700">
                  <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[st]}`} />
                  <span>{CRM_STAGE_LABELS[st]}</span>
                  <span className="text-slate-400 font-normal">{col.length}</span>
                  <span className="ml-auto text-slate-500 font-normal" data-no-i18n>{col.reduce((n, c) => n + c.amountKgs, 0) ? som(col.reduce((n, c) => n + c.amountKgs, 0)) : ''}</span>
                </div>
                <div className="space-y-2">
                  {col.slice(0, 60).map((c) => (
                    <div key={c.id} className="group relative">
                      <Card c={c} />
                      <select
                        value={c.stage}
                        onChange={(e) => move(c, e.target.value as CrmStage)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Перенести на этап"
                        className="absolute top-1.5 right-6 opacity-0 group-hover:opacity-100 focus:opacity-100 text-[11px] border border-slate-300 rounded bg-white px-1 py-0.5 cursor-pointer"
                      >
                        {STAGES.map((s2) => <option key={s2} value={s2}>{CRM_STAGE_LABELS[s2]}</option>)}
                      </select>
                    </div>
                  ))}
                  {col.length === 0 && <p className="text-[11px] text-slate-400 px-1">Пусто</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="mt-3 border-b border-slate-200" />
          {shown.length === 0 ? <div className="py-14 text-center text-sm text-slate-500">Ничего не найдено</div> : (
            <ul className="divide-y divide-slate-100">
              {shown.map((c) => (
                <li key={c.id} className="px-3 sm:px-5 py-2.5 flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_COLORS[c.stage]}`} title={CRM_STAGE_LABELS[c.stage]} />
                  <div className="flex-1 min-w-0"><Card c={c} compact /></div>
                  <select value={c.stage} onChange={(e) => move(c, e.target.value as CrmStage)} className="hidden sm:block px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white" aria-label="Этап">
                    {STAGES.map((s2) => <option key={s2} value={s2}>{CRM_STAGE_LABELS[s2]}</option>)}
                  </select>
                  {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50" aria-label="Позвонить"><Phone size={16} /></a>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {editing && (
        <ClientEditor
          info={info}
          client={editing === 'new' ? null : editing}
          team={team}
          canDelete={info.permissions.includes('orders') || info.permissions.includes('company.edit')}
          onClose={() => setEditing(null)}
          onSaved={(c) => { put(c); setEditing(null); }}
          onDeleted={(id) => { setClients((l) => (l || []).filter((x) => x.id !== id)); setEditing(null); }}
          onOpenMessages={onOpenMessages}
        />
      )}
    </div>
  );
};

const ClientEditor: React.FC<{
  info: CompanyInfo;
  client: CrmClient | null;
  team: CrmTeamMember[];
  canDelete: boolean;
  onClose: () => void;
  onSaved: (c: CrmClient) => void;
  onDeleted: (id: string) => void;
  onOpenMessages: () => void;
}> = ({ info, client, team, canDelete, onClose, onSaved, onDeleted, onOpenMessages }) => {
  const [doc, setDoc] = useState<DocKind | null>(null);
  const [f, setF] = useState({
    name: client?.name || '', phone: client?.phone || '', interest: client?.interest || '', stage: client?.stage || 'new' as CrmStage,
    amountKgs: client?.amountKgs ? String(client.amountKgs) : '', nextAt: client?.nextAt || '', managerId: client?.managerId || '', note: client?.note || '',
  });
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((v) => ({ ...v, [k]: e.target.value }));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-invoice-modal]')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { setError('Укажите имя клиента'); return; }
    setBusy(true);
    setError(null);
    const body = { ...f, amountKgs: Number(f.amountKgs) || 0 };
    try { onSaved(client ? await updateCrmClient(client.id, { ...body, comment: comment.trim() || undefined }) : await addCrmClient(body)); }
    catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };
  const quickDate = (days: number) => setF((v) => ({ ...v, nextAt: new Date(Date.now() + 6 * 3600_000 + days * 86400_000).toISOString().slice(0, 10) }));

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-white z-10 px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-black text-base text-slate-900">{client ? 'Карточка клиента' : 'Новый клиент'}</div>
            {client && <div className="text-xs text-slate-500">{SOURCE[client.source].label} · с {new Date(client.createdAt).toLocaleDateString('ru-RU')}</div>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 cursor-pointer" aria-label="Закрыть"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Имя *</label><input value={f.name} onChange={set('name')} className={inputCls} data-no-i18n /></div>
            <div>
              <label className={labelCls}>Телефон</label>
              <div className="flex gap-1">
                <input value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="+996" className={inputCls} data-no-i18n />
                {f.phone && <a href={`tel:${f.phone.replace(/[^\d+]/g, '')}`} className="px-2.5 rounded-lg bg-emerald-600 text-white flex items-center" aria-label="Позвонить"><Phone size={15} /></a>}
              </div>
            </div>
          </div>
          <div><label className={labelCls}>Что нужно клиенту</label><input value={f.interest} onChange={set('interest')} placeholder="Например: стойки на Camry 70, 2 шт" className={inputCls} data-no-i18n /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Этап</label>
              <select value={f.stage} onChange={set('stage')} className={`${inputCls} bg-white`}>
                {STAGES.map((s2) => <option key={s2} value={s2}>{CRM_STAGE_LABELS[s2]}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Сумма сделки, сом</label><input value={f.amountKgs} onChange={set('amountKgs')} inputMode="numeric" type="number" min="0" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Связаться</label>
              <input type="date" value={f.nextAt} onChange={set('nextAt')} className={inputCls} />
              <div className="flex gap-2 mt-1 text-[11px]">
                <button type="button" onClick={() => quickDate(0)} className="text-[#1d6fb8] hover:underline cursor-pointer">сегодня</button>
                <button type="button" onClick={() => quickDate(1)} className="text-[#1d6fb8] hover:underline cursor-pointer">завтра</button>
                <button type="button" onClick={() => quickDate(7)} className="text-[#1d6fb8] hover:underline cursor-pointer">через неделю</button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Ответственный</label>
              <select value={f.managerId} onChange={set('managerId')} className={`${inputCls} bg-white`} data-no-i18n>
                <option value="">— не назначен —</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Заметка</label><textarea value={f.note} onChange={set('note')} rows={2} placeholder="Машина, VIN, договорённости" className={inputCls} data-no-i18n /></div>
          {client && (
            <div>
              <label className={labelCls}>Комментарий в историю</label>
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: позвонил, приедет в субботу" className={inputCls} data-no-i18n />
            </div>
          )}
          {client && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDoc('invoice')} className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><FileText size={14} />Счёт на оплату</button>
              <button type="button" onClick={() => setDoc('waybill')} className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><FileText size={14} />Накладная</button>
            </div>
          )}
          {doc && <InvoiceModal info={info} kind={doc} buyer={f.name} lines={f.interest ? [{ name: f.interest, qty: '1', price: f.amountKgs }] : []} onClose={() => setDoc(null)} />}
          {client?.source === 'chat' && (
            <button type="button" onClick={() => { onClose(); onOpenMessages(); }} className="text-sm font-bold text-[#1d6fb8] hover:underline cursor-pointer inline-flex items-center gap-1"><MessageSquare size={14} />Открыть переписку</button>
          )}
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
          {client && client.log?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1">История</div>
              <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
                {client.log.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{new Date(l.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-slate-700" data-no-i18n><b>{l.by}:</b> {l.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 sm:px-5 py-3 flex items-center gap-2">
          {client && client.source === 'manual' && canDelete && (
            <button type="button" onClick={async () => { if (confirm(`Удалить клиента «${client.name}»?`)) { await deleteCrmClient(client.id); onDeleted(client.id); } }} className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer" aria-label="Удалить клиента"><Trash2 size={16} /></button>
          )}
          <button type="button" onClick={onClose} className="ml-auto px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer">Отмена</button>
          <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#a60d26] disabled:opacity-60 text-white text-sm font-bold flex items-center gap-2 cursor-pointer">
            {busy && <Loader2 size={15} className="animate-spin" />}Сохранить
          </button>
        </div>
      </form>
    </div>
  );
};
