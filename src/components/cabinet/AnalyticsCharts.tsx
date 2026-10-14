import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Eye, Users, Search, TrendingUp, Activity, Sparkles,
  ArrowUpRight, Clock, Zap, RefreshCw, BarChart3, Filter
} from 'lucide-react';

interface AnalyticsChartsProps {
  carsCount: number;
  partsCount: number;
  usersCount: number;
  theme?: 'dark' | 'light';
}

// 7-day listing views data
const INITIAL_VIEWS_DATA = [
  { day: 'Пн (04.10)', viewsCars: 8420, viewsParts: 5120, total: 13540 },
  { day: 'Вт (05.10)', viewsCars: 9650, viewsParts: 5890, total: 15540 },
  { day: 'Ср (06.10)', viewsCars: 10400, viewsParts: 6300, total: 16700 },
  { day: 'Чт (07.10)', viewsCars: 11200, viewsParts: 7150, total: 18350 },
  { day: 'Пт (08.10)', viewsCars: 13900, viewsParts: 8940, total: 22840 },
  { day: 'Сб (09.10)', viewsCars: 17400, viewsParts: 10850, total: 28250 },
  { day: 'Вс (10.10)', viewsCars: 19800, viewsParts: 12400, total: 32200 },
];

// User registrations dynamics (buyers, sellers, workshops)
const INITIAL_REGISTRATIONS_DATA = [
  { month: 'Май', buyers: 120, sellers: 45, workshop: 12, total: 177 },
  { month: 'Июн', buyers: 180, sellers: 68, workshop: 19, total: 267 },
  { month: 'Июл', buyers: 240, sellers: 92, workshop: 28, total: 360 },
  { month: 'Авг', buyers: 310, sellers: 124, workshop: 35, total: 469 },
  { month: 'Сен', buyers: 420, sellers: 165, workshop: 48, total: 633 },
  { month: 'Окт', buyers: 580, sellers: 215, workshop: 64, total: 859 },
];

// Real-time live queries feed
interface LiveQuery {
  id: string;
  query: string;
  category: string;
  city: string;
  time: string;
  count: number;
}

const SEED_QUERIES: LiveQuery[] = [
  { id: 'q-1', query: 'Toyota Camry 70', category: 'Авто', city: 'Бишкек', time: 'Только что', count: 342 },
  { id: 'q-2', query: 'Фара LED Camry 70', category: 'Запчасти', city: 'Кудайберген', time: '1 мин назад', count: 189 },
  { id: 'q-3', query: 'Lexus LX 570', category: 'Авто', city: 'Ош', time: '2 мин назад', count: 275 },
  { id: 'q-4', query: 'Колодки Advics', category: 'Запчасти', city: 'Бишкек', time: '3 мин назад', count: 142 },
  { id: 'q-5', query: 'Zeekr 001', category: 'Электро', city: 'Бишкек', time: '4 мин назад', count: 310 },
  { id: 'q-6', query: 'Двигатель 2AR-FE', category: 'Запчасти', city: 'Дордой Моторс', time: '5 мин назад', count: 98 },
  { id: 'q-7', query: 'Honda Fit 2012', category: 'Авто', city: 'Джалал-Абад', time: '6 мин назад', count: 412 },
  { id: 'q-8', query: 'АКПП U660E', category: 'Запчасти', city: 'Кудайберген', time: '7 мин назад', count: 85 },
];

const SEARCH_CATEGORIES_DATA = [
  { name: 'Toyota / Lexus', queries: 4820, percent: '38%' },
  { name: 'Двигатель & ГРМ', queries: 2750, percent: '22%' },
  { name: 'Электро / Гибрид', queries: 2180, percent: '17%' },
  { name: 'Кузов & Оптика', queries: 1640, percent: '13%' },
  { name: 'Ходовая & Амортизаторы', queries: 1290, percent: '10%' },
];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  carsCount,
  partsCount,
  usersCount,
  theme = 'dark',
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [viewsData, setViewsData] = useState(INITIAL_VIEWS_DATA);
  const [liveQueries, setLiveQueries] = useState<LiveQuery[]>(SEED_QUERIES);
  const [liveRps, setLiveRps] = useState(48); // requests per minute
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Real-time ticker simulation for search activity
  useEffect(() => {
    if (!isLiveActive) return;

    const interval = setInterval(() => {
      const candidates = [
        { query: 'Радиатор Prado 150', category: 'Запчасти', city: 'Кудайберген' },
        { query: 'BYD Song Plus DM-i', category: 'Электро', city: 'Бишкек' },
        { query: 'Бампер передний Camry 55', category: 'Кузов', city: 'Ош' },
        { query: 'Hyundai Sonata 2021', category: 'Авто', city: 'Бишкек' },
        { query: 'Масло 0W-20 Toyota', category: 'Масла', city: 'Кудайберген' },
        { query: 'Турбина BMW X5 B58', category: 'Двигатель', city: 'Бишкек' },
        { query: 'Генератор Denso 12V', category: 'Электрика', city: 'Дордой Моторс' },
        { query: 'Li Auto L7 Max', category: 'Авто', city: 'Бишкек' },
      ];
      const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
      const newQuery: LiveQuery = {
        id: `q-${Date.now()}`,
        query: randomItem.query,
        category: randomItem.category,
        city: randomItem.city,
        time: 'Только что',
        count: Math.floor(Math.random() * 80) + 120,
      };

      setLiveQueries((prev) => [newQuery, ...prev.slice(0, 7)]);
      setLiveRps((prev) => Math.min(95, Math.max(32, prev + Math.floor(Math.random() * 7) - 3)));

      // Subtle dynamic fluctuation on last day's views in chart
      setViewsData((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last) {
          copy[copy.length - 1] = {
            ...last,
            viewsCars: last.viewsCars + Math.floor(Math.random() * 5) + 1,
            viewsParts: last.viewsParts + Math.floor(Math.random() * 4) + 1,
            total: last.total + Math.floor(Math.random() * 9) + 2,
          };
        }
        return copy;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isLiveActive]);

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const innerCardBg = isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200';

  return (
    <div className="space-y-6">
      {/* HEADER WITH REALTIME BADGE & PERIOD SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-[#C8102E]" />
              <span>Аналитический дашборд портала KGzone</span>
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Визуализация активности покупателей, просмотров авто и запчастей по Кыргызстану.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Последние 7 дней
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === '30d'
                  ? 'bg-[#C8102E] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30 дней
            </button>
          </div>

          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLiveActive
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Приостановить / возобновить обновление потока в реальном времени"
          >
            <RefreshCw size={13} className={isLiveActive ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isLiveActive ? 'Поток: Вкл' : 'Поток: Пауза'}</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`${innerCardBg} p-4 rounded-2xl border relative overflow-hidden`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1">
            <span>Просмотров сегодня</span>
            <Eye size={15} className="text-red-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {viewsData[viewsData.length - 1].total.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mt-1">
            <ArrowUpRight size={13} />
            <span>+18.4% к прошлой неделе</span>
          </div>
        </div>

        <div className={`${innerCardBg} p-4 rounded-2xl border relative overflow-hidden`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1">
            <span>Поисковых запросов/мин</span>
            <Search size={15} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono flex items-center gap-2">
            <span>{liveRps}</span>
            <span className="text-xs font-normal text-slate-400">запр/мин</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-300 font-bold mt-1">
            <Zap size={13} />
            <span>Пик: 14:00 - 18:00 (Бишкек)</span>
          </div>
        </div>

        <div className={`${innerCardBg} p-4 rounded-2xl border relative overflow-hidden`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1">
            <span>Всего пользователей</span>
            <Users size={15} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {usersCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-300 font-bold mt-1">
            <TrendingUp size={13} />
            <span>+859 за последний месяц</span>
          </div>
        </div>

        <div className={`${innerCardBg} p-4 rounded-2xl border relative overflow-hidden`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1">
            <span>Объявлений в базе</span>
            <Activity size={15} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {(carsCount + partsCount).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {carsCount} авто • {partsCount} запчастей
          </div>
        </div>
      </div>

      {/* CHART 1: RECHARTS AREA CHART - VIEWS OVER TIME */}
      <div className={`${innerCardBg} p-5 rounded-2xl border space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Eye size={16} className="text-[#C8102E]" />
              <span>Динамика просмотров объявлений (Автомобили & Запчасти)</span>
            </h4>
            <p className="text-xs text-slate-400">
              Показывает ежедневную активность посетителей по разделам авторынка
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#C8102E]"></span>
              <span className="text-slate-300">Автомобили</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0a7582]"></span>
              <span className="text-slate-300">Автозапчасти</span>
            </div>
          </div>
        </div>

        <div className="w-full h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={viewsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8102E" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#C8102E" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorParts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0a7582" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0a7582" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="day" stroke={textColor} fontSize={11} tickLine={false} />
              <YAxis stroke={textColor} fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="viewsCars"
                name="Просмотры Авто"
                stroke="#C8102E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCars)"
              />
              <Area
                type="monotone"
                dataKey="viewsParts"
                name="Просмотры Запчастей"
                stroke="#0a7582"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorParts)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW WITH 2 CHARTS: USER REGISTRATIONS & REAL-TIME SEARCH QUERIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CHART 2: RECHARTS BAR CHART - USER REGISTRATIONS BY ROLE */}
        <div className={`${innerCardBg} p-5 rounded-2xl border space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Users size={16} className="text-blue-400" />
                <span>Динамика новых регистраций пользователей</span>
              </h4>
              <p className="text-xs text-slate-400">
                Рост аудитории: покупатели, продавцы и автосервисы СТО
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800">
              +385% за полгода
            </span>
          </div>

          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={INITIAL_REGISTRATIONS_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="buyers" name="Покупатели" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sellers" name="Продавцы" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="workshop" name="СТО / Сервисы" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: POPULAR SEARCH CATEGORIES + LIVE ACTIVITY FEED */}
        <div className={`${innerCardBg} p-5 rounded-2xl border space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Search size={16} className="text-amber-400" />
                <span>Популярные поисковые категории (мес.)</span>
              </h4>
              <p className="text-xs text-slate-400">
                Лидеры пользовательского спроса по авторынку КР
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Всего: 12 680 запр.</span>
          </div>

          <div className="space-y-3">
            {SEARCH_CATEGORIES_DATA.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">{item.queries} запросов</span>
                    <span className="text-amber-400 font-black font-mono w-10 text-right">{item.percent}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      idx === 0
                        ? 'bg-[#C8102E]'
                        : idx === 1
                        ? 'bg-amber-500'
                        : idx === 2
                        ? 'bg-emerald-500'
                        : idx === 3
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                    }`}
                    style={{ width: item.percent }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
            <span>Самый частый запрос:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">Toyota Camry 70 / Prado 150</span>
          </div>
        </div>

      </div>

      {/* REAL-TIME SEARCH STREAM MONITOR */}
      <div className={`${innerCardBg} p-5 rounded-2xl border space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Activity size={16} className="text-emerald-400" />
              <span>Поисковая активность в реальном времени (Live Query Feed)</span>
            </h4>
          </div>
          <span className="text-xs text-slate-400">Обновляется каждые ~4.5 сек</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {liveQueries.map((q) => (
            <div
              key={q.id}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300"
            >
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className={`px-1.5 py-0.2 rounded font-bold ${
                  q.category === 'Авто'
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : q.category === 'Запчасти'
                    ? 'bg-teal-950 text-teal-300 border border-teal-800'
                    : q.category === 'Электро'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}>
                  {q.category}
                </span>
                <span className="text-slate-400 font-mono flex items-center gap-1">
                  <Clock size={10} />
                  {q.time}
                </span>
              </div>

              <div className="font-bold text-xs text-white truncate" title={q.query}>
                {q.query}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span className="text-slate-400">{q.city}</span>
                <span className="text-amber-400 font-mono font-semibold">{q.count} рез.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
