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
