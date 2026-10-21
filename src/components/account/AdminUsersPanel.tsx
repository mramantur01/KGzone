import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, KeyRound, Ban, ShieldCheck, Building2, User } from 'lucide-react';
import { listAudit, listUsers, resetUserPassword, updateUser, type AdminUser } from '../../api/myListings';
import { COMPANY_STATUS_LABELS, formatPhone, type CompanyStatus } from '../../api/auth';

const ROLE_LABELS = { user: 'Пользователь', moderator: 'Модератор', admin: 'Администратор' } as const;
const ACTION_LABELS: Record<string, string> = {
  'claim-admin': 'Получил права администратора',
  'update-user': 'Изменил пользователя',
  'reset-password': 'Сбросил пароль',
};

type Filter = 'all' | 'companies' | 'pending' | 'blocked' | 'staff';

export const AdminUsersPanel: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [tempPassword, setTempPassword] = useState<{ id: string; value: string } | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a] = await Promise.all([listUsers(), listAudit()]);
      setUsers(u);
      setAudit(a);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); await load(); } catch (e: any) { setError(e.message); }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'companies' && u.accountType !== 'legal') return false;
      if (filter === 'pending' && u.company?.status !== 'pending') return false;
      if (filter === 'blocked' && !u.blocked) return false;
      if (filter === 'staff' && u.role === 'user') return false;
      if (!q) return true;
      return [u.name, u.phone, u.email, u.city, u.company?.name, u.company?.inn].some((v) => v?.toLowerCase().includes(q));
    });
  }, [users, query, filter]);

  const pendingCompanies = users.filter((u) => u.company?.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">Пользователи и компании</h2>
        <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Обновить</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Имя, телефон, почта, компания, ИНН" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['all', `Все (${users.length})`],
            ['companies', 'Компании'],
            ['pending', `Ждут проверки (${pendingCompanies})`],
            ['blocked', 'Заблокированы'],
            ['staff', 'Сотрудники сайта'],
          ] as [Filter, string][]).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${filter === id ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">{loading ? 'Загрузка...' : 'Никого не найдено'}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((u) => (
            <div key={u.id} className={`p-4 rounded-2xl bg-white border ${u.blocked ? 'border-red-300' : 'border-slate-200'} space-y-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900" data-no-i18n>
                    {u.accountType === 'legal' ? <Building2 size={15} className="text-slate-500 shrink-0" /> : <User size={15} className="text-slate-500 shrink-0" />}
                    <span>{u.company?.name || u.name}</span>
                    {u.id === currentUserId && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">это вы</span>}
                  </div>
                  <div className="text-xs text-slate-500" data-no-i18n>
                    {u.company ? `${u.name} · ` : ''}{formatPhone(u.phone)}{u.email ? ` · ${u.email}` : ''} · {u.city}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Регистрация: {new Date(u.createdAt).toLocaleDateString('ru-RU')} · Объявлений: {u.listingsCount}
                    {u.lastLoginAt ? ` · Вход: ${new Date(u.lastLoginAt).toLocaleDateString('ru-RU')}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={u.role}
                    onChange={(e) => act(() => updateUser(u.id, { role: e.target.value }))}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    {Object.entries(ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => { if (u.blocked || confirm(`Заблокировать ${u.name}? Все его сеансы будут закрыты.`)) act(() => updateUser(u.id, { blocked: !u.blocked })); }}
                      className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer ${u.blocked ? 'bg-emerald-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                    >
                      <Ban size={12} /><span>{u.blocked ? 'Разблокировать' : 'Заблокировать'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Сбросить пароль для ${u.name}? Сделайте это, только если проверили, что номер принадлежит этому человеку.`)) act(async () => setTempPassword({ id: u.id, value: await resetUserPassword(u.id) })); }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound size={12} /><span>Сбросить пароль</span>
                  </button>
                </div>
              </div>

              {tempPassword?.id === u.id && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Временный пароль (показывается один раз, передайте его владельцу аккаунта лично):{' '}
                  <span className="font-mono font-bold select-all" data-no-i18n>{tempPassword.value}</span>
                  <button type="button" onClick={() => setTempPassword(null)} className="ml-2 underline cursor-pointer">Скрыть</button>
                </div>
              )}

              {u.company && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-600" data-no-i18n>
                    <div>ИНН: <b className="font-mono">{u.company.inn}</b></div>
                    <div>Контакт: {u.company.contactPerson || '—'}</div>
                    <div>Юр. адрес: {u.company.legalAddress || '—'}</div>
                    <div>Факт. адрес: {u.company.actualAddress || '—'}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1"><ShieldCheck size={13} />Статус: {COMPANY_STATUS_LABELS[u.company.status]}</span>
                    {u.company.submittedAt && <span className="text-slate-400">подана {new Date(u.company.submittedAt).toLocaleDateString('ru-RU')}</span>}
                  </div>
                  {u.company.statusComment && <div className="text-slate-500">Комментарий: {u.company.statusComment}</div>}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={comments[u.id] ?? ''}
                      onChange={(e) => setComments((c) => ({ ...c, [u.id]: e.target.value }))}
                      placeholder="Комментарий для компании (что исправить)"
                      maxLength={500}
                      className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    <select
                      value=""
                      onChange={(e) => {
                        const status = e.target.value as CompanyStatus;
                        if (status) act(() => updateUser(u.id, { companyStatus: status, companyComment: comments[u.id] || '' }));
                      }}
                      className="px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-bold"
                    >
                      <option value="">Изменить статус…</option>
                      {(Object.keys(COMPANY_STATUS_LABELS) as CompanyStatus[]).map((s) => <option key={s} value={s}>{COMPANY_STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <button type="button" onClick={() => setShowAudit((v) => !v)} className="text-xs font-bold text-slate-600 underline cursor-pointer">
          {showAudit ? 'Скрыть журнал действий' : `Журнал действий администраторов (${audit.length})`}
        </button>
        {showAudit && (
          <div className="mt-2 rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 text-xs">
            {audit.length === 0 && <p className="p-3 text-slate-500">Пока пусто</p>}
            {audit.map((a) => (
              <div key={a.id} className="p-2.5 flex flex-wrap gap-x-3 text-slate-600">
                <span className="text-slate-400">{new Date(a.at).toLocaleString('ru-RU')}</span>
                <span className="font-bold" data-no-i18n>{a.actorName}</span>
                <span>{ACTION_LABELS[a.action] || a.action}</span>
                <span className="font-mono text-slate-400" data-no-i18n>
                  {users.find((u) => u.id === a.target)?.name || a.target}
                  {a.details && Object.keys(a.details).length ? ` ${JSON.stringify(a.details)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
