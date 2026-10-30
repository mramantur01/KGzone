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
}
export type MyPart = AutoPartItem & Owned;
export type MyCar = Car & Owned;
export type ListingKind = 'parts' | 'cars';

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
