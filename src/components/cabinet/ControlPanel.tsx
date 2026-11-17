import React, { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, ListChecks, MessageSquareWarning, Users, Megaphone, Settings, RefreshCw, CheckCircle2 } from 'lucide-react';
import { call } from '../../api/admin';
import type { StaffPerm } from '../../api/staffPerms';
import { SiteStatsCard } from './SiteStatsCard';
import { BannerSlidesPanel } from './BannerSlidesPanel';
import { AdRequestsPanel } from './AdRequestsPanel';
import { WeeklyReportCard, TelegramBotCard, ChannelCard, ImportForSellerCard, BackupCard } from './AdminToolsPanel';
import { PartsModerationPanel, CarsModerationPanel } from './PartsModerationPanel';
import { ReviewsModerationPanel } from './ReviewsModerationPanel';
import { ReportsPanel } from './ReportsPanel';
import { CatalogStatusCard } from '../catalog/CatalogStatusCard';
import { PartRequestsPanel } from '../catalog/PartRequestsPanel';
import { AdminUsersPanel } from '../account/AdminUsersPanel';

export type PanelTab = 'overview' | 'listings' | 'complaints' | 'people' | 'ads' | 'settings';

const TABS: { id: PanelTab; label: string; icon: React.ElementType; need: StaffPerm[] }[] = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard, need: [] },
  { id: 'listings', label: 'Объявления', icon: ListChecks, need: ['listings', 'requests'] },
  { id: 'complaints', label: 'Жалобы и отзывы', icon: MessageSquareWarning, need: ['reports', 'reviews'] },
  { id: 'people', label: 'Люди', icon: Users, need: ['users.roles', 'users.crown', 'users.shops', 'users.block', 'users.password'] },
  { id: 'ads', label: 'Реклама', icon: Megaphone, need: ['ads'] },
  { id: 'settings', label: 'Настройки', icon: Settings, need: ['settings'] },
];

/** Tiles of "what needs attention": the number, where a click leads, and which section to scroll to */
const TILES: { key: string; icon: string; label: string; unit: string; tab: PanelTab; anchor?: string }[] = [
  { key: 'listings', icon: '🧩', label: 'На проверке', unit: 'объявлений', tab: 'listings', anchor: 'cp-listings' },
  { key: 'reports', icon: '⚠️', label: 'Жалобы', unit: 'новых', tab: 'complaints', anchor: 'cp-reports' },
  { key: 'shops', icon: '🏬', label: 'Магазины ждут', unit: 'проверки', tab: 'people' },
  { key: 'ads', icon: '📢', label: 'Заявки на рекламу', unit: 'новых', tab: 'ads', anchor: 'cp-adreq' },
  { key: 'reviews', icon: '⭐', label: 'Отзывы', unit: 'на проверке', tab: 'complaints', anchor: 'cp-reviews' },
  { key: 'requests', icon: '🔎', label: 'Ищут запчасть', unit: 'новых заявок', tab: 'listings', anchor: 'cp-requests' },
  { key: 'orders', icon: '🛒', label: 'Заказы без ответа', unit: 'дольше 3 часов · продавцам напомнили', tab: 'overview' },
  { key: 'prices', icon: '🚩', label: 'Подозрительные цены', unit: 'скрыто до проверки', tab: 'listings', anchor: 'cp-listings' },
];

/** The site control panel: what needs attention on top, the rest in tabs. Each person sees only what their ticks allow. */
export const ControlPanel: React.FC<{ perms: StaffPerm[]; currentUserId: string; initialTab?: PanelTab }> = ({ perms, currentUserId, initialTab }) => {
  const can = (need: StaffPerm[]) => need.length === 0 || need.some((x) => perms.includes(x));
  const tabs = TABS.filter((t) => can(t.need));
  const [tab, setTab] = useState<PanelTab>(initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : 'overview');
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCounts((await call<{ counts: Record<string, number> }>('/api/admin/overview')).counts); } catch { setCounts({}); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (t: PanelTab, anchor?: string) => {
    setTab(t);
    window.setTimeout(() => {
      const el = anchor ? document.getElementById(anchor) : null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else document.getElementById('cp-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const tiles = counts ? TILES.filter((t) => t.key in counts) : [];
  const total = tiles.reduce((n, t) => n + (counts![t.key] || 0), 0);
  const badge = (id: PanelTab) => tiles.filter((t) => t.tab === id && t.key !== 'prices').reduce((n, t) => n + (counts![t.key] || 0), 0);
  const has = (x: StaffPerm) => perms.includes(x);

  return (
    <div className="space-y-4 scroll-mt-28" id="cp-top">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">Панель управления</h2>
        <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Обновить
        </button>
      </div>

      {/* What needs attention */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="font-black text-slate-900">Что требует внимания</div>
          {counts && total === 0 && <div className="text-sm font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={16} />Всё в порядке ✅</div>}
          {counts && total > 0 && <div className="text-xs font-bold text-[#C8102E]">Всего дел: {total}</div>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {!counts && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[86px] rounded-xl bg-slate-100 animate-pulse" />)}
          {tiles.map((t) => {
            const n = counts![t.key] || 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => open(t.tab, t.anchor)}
                className={`text-left p-3 rounded-xl border-2 transition-colors cursor-pointer ${n > 0 ? 'bg-red-50 border-[#C8102E]/40 hover:border-[#C8102E]' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><span className="text-base">{t.icon}</span>{t.label}</div>
                <div className={`mt-1 text-2xl font-black ${n > 0 ? 'text-[#C8102E]' : 'text-slate-400'}`}>{n}</div>
                <div className="text-[11px] text-slate-500">{t.unit}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[64px] z-20 -mx-1 px-1 py-1 bg-slate-50/95 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="tablist">
          {tabs.map((t) => {
            const b = t.id === 'overview' ? 0 : badge(t.id);
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => open(t.id)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${tab === t.id ? 'bg-[#C8102E] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
              >
                <t.icon size={15} />{t.label}
                {b > 0 && <span className={`px-1.5 rounded-full text-[11px] ${tab === t.id ? 'bg-white text-[#C8102E]' : 'bg-[#C8102E] text-white'}`}>{b}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {has('stats') ? <><WeeklyReportCard /><SiteStatsCard /></> : <p className="p-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-500">Выберите вкладку выше или нажмите на плитку с делами.</p>}
        </div>
      )}
      {tab === 'listings' && (
        <div className="space-y-4">
          {has('listings') && <><CatalogStatusCard /><div id="cp-listings" className="space-y-4 kgz-themed scroll-mt-32"><PartsModerationPanel /><CarsModerationPanel /></div></>}
          {has('requests') && <div id="cp-requests" className="scroll-mt-32"><PartRequestsPanel /></div>}
        </div>
      )}
      {tab === 'complaints' && (
        <div className="space-y-4">
          {has('reports') && <div id="cp-reports" className="kgz-themed scroll-mt-32"><ReportsPanel /></div>}
          {has('reviews') && <div id="cp-reviews" className="scroll-mt-32"><ReviewsModerationPanel /></div>}
        </div>
      )}
      {tab === 'people' && <AdminUsersPanel currentUserId={currentUserId} myPerms={perms} />}
      {tab === 'ads' && (
        <div className="space-y-4">
          <div id="cp-adreq" className="scroll-mt-32"><AdRequestsPanel /></div>
          <BannerSlidesPanel />
          <BannerSlidesPanel place="sto" />
          <BannerSlidesPanel place="side" />
        </div>
      )}
      {tab === 'settings' && (
        <div className="space-y-4">
          <TelegramBotCard />
          <ChannelCard />
          <ImportForSellerCard />
          <BackupCard />
        </div>
      )}
    </div>
  );
};
