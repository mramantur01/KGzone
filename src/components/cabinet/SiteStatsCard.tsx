import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { call } from '../../api/admin';

interface Stats {
  days: string[];
  series: Record<'visits' | 'searches' | 'registrations' | 'parts' | 'cars' | 'chats', number[]>;
  totals: { users: number; sellers: number; activeSellers: number; liveParts: number; liveCars: number; pending: number; chats: number };
  topMisses: { q: string; count: number }[];
}

const SERIES: { key: keyof Stats['series']; label: string; color: string }[] = [
  { key: 'visits', label: 'Посетители', color: 'bg-sky-500' },
  { key: 'searches', label: 'Поиски запчастей', color: 'bg-violet-500' },
  { key: 'registrations', label: 'Регистрации', color: 'bg-emerald-500' },
  { key: 'parts', label: 'Новые запчасти', color: 'bg-amber-500' },
  { key: 'cars', label: 'Новые авто', color: 'bg-orange-500' },
  { key: 'chats', label: 'Новые переписки', color: 'bg-rose-500' },
];

const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });

// Small bar chart: 14 days, today on the right; the number on top of each bar
const Bars: React.FC<{ values: number[]; days: string[]; color: string }> = ({ values, days, color }) => {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px] h-20">
      {values.map((v, i) => (
        <div key={days[i]} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${shortDay(days[i])}: ${v}`}>
          <span className="text-[9px] text-slate-500 leading-none mb-0.5">{v || ''}</span>
          <div className={`w-full rounded-t ${v ? color : 'bg-slate-100'}`} style={{ height: `${v ? Math.max(6, (v / max) * 100) : 4}%` }} />
        </div>
      ))}
    </div>
  );
};

/** Owner's site statistics: how the site grows day by day */
export const SiteStatsCard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); call<Stats>('/api/admin/stats', {}, true).then(setStats).catch((e) => setError(e.message)); };
  useEffect(load, []);

  const sum = (k: keyof Stats['series']) => stats ? stats.series[k].reduce((a, b) => a + b, 0) : 0;
  const today = (k: keyof Stats['series']) => stats ? stats.series[k][stats.series[k].length - 1] : 0;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-slate-900"><BarChart3 size={16} className="text-sky-600" />Статистика сайта за 2 недели</div>
        <button onClick={load} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer" title="Обновить"><RefreshCw size={14} /></button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!stats ? !error && <p className="text-xs text-slate-400">Загрузка...</p> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Пользователей', stats.totals.users],
              ['Продавцов', stats.totals.sellers],
              ['Активных продавцов за неделю', stats.totals.activeSellers],
              ['Ждут проверки', stats.totals.pending],
              ['Запчастей на сайте', stats.totals.liveParts],
              ['Авто на сайте', stats.totals.liveCars],
              ['Переписок всего', stats.totals.chats],
              ['Посетителей сегодня', today('visits')],
            ].map(([label, value]) => (
              <div key={label as string} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-black text-slate-900">{Number(value).toLocaleString('ru-RU')}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{label}</div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SERIES.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{s.label}</span>
                  <span className="text-slate-500">сегодня {today(s.key)} · за 2 недели {sum(s.key)}</span>
                </div>
                <Bars values={stats.series[s.key]} days={stats.days} color={s.color} />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5"><span>{shortDay(stats.days[0])}</span><span>сегодня</span></div>
              </div>
            ))}
          </div>
          {stats.topMisses.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1">Чаще всего ищут, но не находят</div>
              <ul className="text-xs text-slate-600 space-y-0.5">
                {stats.topMisses.map((m) => <li key={m.q} className="flex justify-between gap-2"><span className="truncate" data-no-i18n>{m.q}</span><b>{m.count}</b></li>)}
              </ul>
            </div>
          )}
          <p className="text-[11px] text-slate-400">Посетители и поиски считаются с сегодняшнего дня — раньше сайт их не записывал.</p>
        </>
      )}
    </div>
  );
};
