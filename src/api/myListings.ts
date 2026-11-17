import { call, type ModerationInfo } from './admin';
import type { AutoPartItem, Car } from '../types/car';
import { refreshParts } from './parts';
import { refreshCars } from './cars';

// The signed-in seller's own listings (any moderation state).

export type ListingStatus = 'active' | 'inactive' | 'sold';
interface Owned {
  moderation?: ModerationInfo;
  listingStatus?: ListingStatus;
  raisedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  contactsCount?: number;
  viewsByDay?: Record<string, number>; // YYYY-MM-DD -> count, last 30 days
  contactsByDay?: Record<string, number>;
  /** Which buttons buyers pressed */
  contactChannels?: { whatsapp?: number; call?: number; cart?: number };
}
export type MyPart = AutoPartItem & Owned;
export type MyCar = Car & Owned;
export type ListingKind = 'parts' | 'cars';

export const importMyParts = (rows: Record<string, unknown>[]) =>
  call<{ created: number; updated: number; errors: { row: number; error: string }[]; noPhoto: number; moderation: string }>('/api/my/import', { method: 'POST', body: JSON.stringify({ rows }) });

export const listMyListings = () => call<{ parts: MyPart[]; cars: MyCar[] }>('/api/my/listings');

const after = async <T,>(p: Promise<T>) => {
  const r = await p;
  refreshParts();
  refreshCars();
  return r;
};

export const editMyListing = (kind: ListingKind, id: string, patch: Record<string, unknown>) =>
  after(call<{ needsReview: boolean }>(`/api/my/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }));

export const setMyListingStatus = (kind: ListingKind, id: string, status: ListingStatus) =>
  after(call(`/api/my/${kind}/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) }));

export const raiseMyListing = (kind: ListingKind, id: string) =>
  after(call(`/api/my/${kind}/${encodeURIComponent(id)}/raise`, { method: 'POST' }));

export const deleteMyListing = (kind: ListingKind, id: string) =>
  after(call(`/api/my/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' }));

export const listMyOrders = () => call<{ orders: any[] }>('/api/my/orders').then((d) => d.orders);

// Orders for my parts: I say "sold" / "not sold" / "no stock" and the stock on the site follows
export interface SaleOrder {
  id: string; orderNumber: string; createdAt: string; customerName: string; customerPhone: string;
  partId: string; partTitle: string; priceKgs: number; qty?: number; deliveryType: 'delivery' | 'pickup'; deliveryAddress: string;
  status: string; comment?: string; result?: 'sold' | 'not-sold' | 'no-stock' | 'no-answer'; resultBy?: 'seller' | 'buyer' | 'auto';
  stockCount?: number; partImage?: string;
}
export const listMySales = () => call<{ orders: SaleOrder[]; staleStock: number }>('/api/my/sales');
export const answerMySale = (id: string, answer: 'sold' | 'not-sold' | 'no-stock') =>
  after(call<{ stockCount?: number }>(`/api/my/sales/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ answer }) }));
export const confirmMyStock = () => after(call<{ confirmed: number }>('/api/my/stock-confirm', { method: 'POST' }));

// Admin
export interface AdminUser {
  id: string;
  accountType: 'individual' | 'legal';
  name: string;
  phone: string;
  email: string;
  city: string;
  role: 'user' | 'moderator' | 'admin';
  blocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
  company?: import('./auth').CompanyProfile;
  listingsCount: number;
  verifiedSeller?: boolean;
}

export const listUsers = () => call<{ users: AdminUser[] }>('/api/admin/users', {}, true).then((d) => d.users);
export const updateUser = (id: string, patch: Record<string, unknown>) =>
  call(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }, true);
export const resetUserPassword = (id: string) =>
  call<{ tempPassword: string }>(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST' }, true).then((d) => d.tempPassword);
export const listAudit = () => call<{ entries: any[] }>('/api/admin/audit', {}, true).then((d) => d.entries);

/** Discount for 1–14 days; the old price comes back by itself */
export const setMySale = (id: string, percent: number, days: number) => after(call<{ part: MyPart }>(`/api/my/parts/${encodeURIComponent(id)}/sale`, { method: 'POST', body: JSON.stringify({ percent, days }) }));
export const cancelMySale = (id: string) => after(call<{ part: MyPart }>(`/api/my/parts/${encodeURIComponent(id)}/sale`, { method: 'POST', body: JSON.stringify({ cancel: true }) }));
export const releaseMyReservation = (id: string) => after(call(`/api/my/parts/${encodeURIComponent(id)}/unreserve`, { method: 'POST' }));
