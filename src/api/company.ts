import { useEffect, useState } from 'react';
import { call } from './admin';
import { refreshParts } from './parts';
import type { AutoPartItem } from '../types/car';
import type { ModerationInfo } from './admin';

// Business cabinet of a company (owner or employee). Every action is permission-checked on the server.

export type StaffRole = 'owner' | 'shop_admin' | 'sales_manager' | 'warehouse' | 'accountant';
export type Permission = 'catalog.edit' | 'stock.edit' | 'import' | 'export' | 'orders' | 'orders.view' | 'messages' | 'staff' | 'warehouses' | 'company.edit' | 'finance' | 'audit';

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Владелец',
  shop_admin: 'Администратор магазина',
  sales_manager: 'Менеджер продаж',
  warehouse: 'Кладовщик',
  accountant: 'Бухгалтер',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner: 'Полный доступ к компании',
  shop_admin: 'Товары, импорт, склады, заказы, сообщения и настройки магазина',
  sales_manager: 'Заказы и переписка с покупателями',
  warehouse: 'Остатки и склады',
  accountant: 'Финансовые показатели, заказы (просмотр), экспорт',
};

export interface Warehouse { id: string; name: string; address: string }

export interface CompanyInfo {
  role: StaffRole;
  permissions: Permission[];
  company: {
    id: string;
    name: string;
    inn: string;
    status: string;
    city: string;
    legalAddress: string;
    actualAddress: string;
    contactPhone: string;
    bankDetails?: string;
    warehouses: Warehouse[];
  };
}

export type CompanyPart = AutoPartItem & {
  moderation?: ModerationInfo;
  listingStatus?: 'active' | 'inactive' | 'sold';
  sku?: string;
  crossNumbers?: string[];
  manufacturer?: string;
  warehouseId?: string;
  oldPriceKgs?: number;
  contactsCount?: number;
};

export const getCompany = () => call<CompanyInfo>('/api/company');

/** Company context of the signed-in user, or null when they have none */
export function useCompany(userId: string | undefined) {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reload = () => getCompany().then(setInfo).catch(() => setInfo(null)).finally(() => setLoaded(true));
  useEffect(() => {
    setInfo(null);
    setLoaded(false);
    if (userId) reload(); else setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  return { info, loaded, reload };
}

const after = async <T,>(p: Promise<T>) => { const r = await p; refreshParts(); return r; };

export const listCompanyParts = () => call<{ parts: CompanyPart[] }>('/api/company/parts').then((r) => r.parts);
export const createCompanyPart = (part: Record<string, unknown>) => after(call('/api/company/parts', { method: 'POST', body: JSON.stringify(part) }));
export const updateCompanyPart = (id: string, patch: Record<string, unknown>) =>
  after(call(`/api/company/parts/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }));
export const bulkCompanyParts = (ids: string[], action: string, extra: Record<string, unknown> = {}) =>
  after(call<{ updated: number }>('/api/company/parts/bulk', { method: 'POST', body: JSON.stringify({ ids, action, ...extra }) }));
export const importCompanyRows = (rows: Record<string, string>[]) =>
  after(call<{ created: number; updated: number; errors: { row: number; error: string }[]; moderation: string; noPhoto?: number }>('/api/company/import', { method: 'POST', body: JSON.stringify({ rows }) }));

export async function downloadCompanyExport() {
  const res = await fetch('/api/company/export');
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Не удалось выгрузить каталог');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kgzone-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const saveWarehouses = (warehouses: Warehouse[]) => call<{ warehouses: Warehouse[] }>('/api/company/warehouses', { method: 'PUT', body: JSON.stringify({ warehouses }) });

export interface StaffMember { id: string; userId: string; role: StaffRole; createdAt: string; name: string; phone: string; blocked: boolean }
export const listStaff = () => call<{ staff: StaffMember[] }>('/api/company/staff').then((r) => r.staff);
export const addStaff = (phone: string, role: StaffRole) => call('/api/company/staff', { method: 'POST', body: JSON.stringify({ phone, role }) });
export const changeStaffRole = (id: string, role: StaffRole) => call(`/api/company/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeStaff = (id: string) => call(`/api/company/staff/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const leaveCompany = () => call('/api/company/membership', { method: 'DELETE' });

export const listCompanyOrders = () => call<{ orders: any[]; statuses: string[] }>('/api/company/orders');
export const setCompanyOrderStatus = (id: string, status: string) =>
  call(`/api/company/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const getCompanyStats = () => call<any>('/api/company/stats');
export const getCompanyAudit = () => call<{ entries: any[] }>('/api/company/audit').then((r) => r.entries);

// ---- CRM: clients from chats, orders and added by hand ----
export type CrmStage = 'new' | 'work' | 'waiting' | 'won' | 'lost';
export const CRM_STAGE_LABELS: Record<CrmStage, string> = { new: 'Новый', work: 'В работе', waiting: 'Ждёт оплату', won: 'Продано', lost: 'Отказ' };
export interface CrmClient {
  id: string;
  source: 'chat' | 'order' | 'manual';
  name: string;
  phone: string;
  interest: string;
  stage: CrmStage;
  amountKgs: number;
  note: string;
  nextAt: string;
  managerId: string;
  managerName: string;
  conversationId?: string;
  orderId?: string;
  log: { at: string; by: string; text: string }[];
  createdAt: string;
  updatedAt: string;
}
export interface CrmTeamMember { id: string; name: string }
export const listCrm = () => call<{ clients: CrmClient[]; team: CrmTeamMember[] }>('/api/company/crm');
export const addCrmClient = (c: Partial<CrmClient>) =>
  call<{ client: CrmClient }>('/api/company/crm', { method: 'POST', body: JSON.stringify(c) }).then((r) => r.client);
export const updateCrmClient = (id: string, patch: Partial<CrmClient> & { comment?: string }) =>
  call<{ client: CrmClient }>(`/api/company/crm/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }).then((r) => r.client);
export const deleteCrmClient = (id: string) => call(`/api/company/crm/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---- Company settings, price feed, reports, broadcast, cash desk ----
export interface CompanySettings {
  wholesale: { discountPct: number; fromKgs: number };
  priceFeedUrl: string;
  priceFeedAt?: string;
  priceFeedResult?: string;
  replyTemplates: string[];
  autoReply: { enabled: boolean; text: string; from: string; to: string };
  lastBroadcastAt?: string;
}
export const getCompanySettings = () => call<{ settings: CompanySettings }>('/api/company/settings').then((r) => r.settings);
export const saveCompanySettings = (patch: Partial<CompanySettings>) =>
  call<{ settings: CompanySettings }>('/api/company/settings', { method: 'PUT', body: JSON.stringify(patch) }).then((r) => r.settings);
export const syncPriceFeed = () => after(call<{ result: string }>('/api/company/price-feed/sync', { method: 'POST' }));

export interface ReportItem { id: string; title: string; partNumber: string; priceKgs: number; stockCount: number; views: number; contacts: number; since: string }
export interface CompanyReports {
  managers: { name: string; won: number; wonSum: number; open: number; lost: number }[];
  viewedNotBought: ReportItem[];
  stale: ReportItem[];
  staleValueKgs: number;
  stockValueKgs?: number;
  offlineMonth: { count: number; sumKgs: number };
}
export const getCompanyReports = () => call<CompanyReports>('/api/company/reports');

export const getBroadcastInfo = () => call<{ recipients: number; lastAt: string | null }>('/api/company/broadcast');
export const sendBroadcast = (text: string) => call<{ sent: number }>('/api/company/broadcast', { method: 'POST', body: JSON.stringify({ text }) });

export interface CashSale { id: string; orderNumber: string; createdAt: string; customerName: string; partId: string; partTitle: string; partNumber: string; priceKgs: number; qty?: number; soldBy?: string; comment?: string }
export const listCashSales = () => call<{ sales: CashSale[] }>('/api/company/sales').then((r) => r.sales);
export const addCashSale = (sale: { partId: string; qty: number; priceKgs: number; customerName?: string }) =>
  after(call<{ sale: CashSale; stockLeft: number }>('/api/company/sales', { method: 'POST', body: JSON.stringify(sale) }));
