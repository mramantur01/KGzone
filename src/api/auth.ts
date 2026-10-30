import { useSyncExternalStore } from 'react';
import { call } from './admin';

// Signed-in account. The session itself is an httpOnly cookie set by the server,
// so nothing secret is stored in the browser.

export type AccountType = 'individual' | 'legal';
export type UserRole = 'user' | 'moderator' | 'admin';
export type CompanyStatus = 'unverified' | 'pending' | 'verified' | 'needs_docs' | 'rejected' | 'blocked';

export interface CompanyProfile {
  name: string;
  inn: string;
  legalAddress: string;
  actualAddress: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  bankDetails: string;
  status: CompanyStatus;
  statusComment?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface GarageCar {
  id: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number;
  vin?: string;
  mileage?: number;
  oilChangeMileage?: number;
  oilInterval?: number;
  insuranceUntil?: string; // YYYY-MM-DD
  inspectionUntil?: string; // YYYY-MM-DD
}

export interface Account {
  id: string;
  accountType: AccountType;
  name: string;
  phone: string;
  email: string;
  city: string;
  role: UserRole;
  blocked: boolean;
  phoneVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  company?: CompanyProfile;
  garage: GarageCar[];
  telegramLinked?: boolean;
  termsAcceptedAt?: string;
}

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  unverified: 'Не подтверждена',
  pending: 'На проверке',
  verified: 'Подтверждена',
  needs_docs: 'Требуются дополнительные документы',
  rejected: 'Отклонена',
  blocked: 'Временно заблокирована',
};

export const formatPhone = (digits: string) =>
  digits.startsWith('996') && digits.length === 12
    ? `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
    : `+${digits}`;

interface AuthState {
  user: Account | null;
  loading: boolean;
}

let state: AuthState = { user: null, loading: true };
const listeners = new Set<() => void>();
const set = (next: Partial<AuthState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export async function refreshMe() {
  try {
    const r = await call<{ user: Account | null }>('/api/auth/me');
    set({ user: r.user, loading: false });
  } catch {
    set({ loading: false });
  }
}

let started = false;
export function useAuth(): AuthState {
  if (!started) { started = true; refreshMe(); }
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state
  );
}

export const isStaff = (u: Account | null) => u?.role === 'admin' || u?.role === 'moderator';

const withUser = async (p: Promise<{ user: Account }>) => {
  const r = await p;
  set({ user: r.user });
  return r.user;
};

export interface RegisterInput {
  accountType: AccountType;
  name: string;
  phone: string;
  email?: string;
  password: string;
  city: string;
  company?: Partial<CompanyProfile>;
  acceptTerms: boolean;
}

export const register = (input: RegisterInput) =>
  withUser(call('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }));

export const login = (loginValue: string, password: string) =>
  withUser(call('/api/auth/login', { method: 'POST', body: JSON.stringify({ login: loginValue, password }) }));

export async function logout() {
  await call('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  set({ user: null });
}

export const updateProfile = (patch: Partial<Pick<Account, 'name' | 'city' | 'email'>> & { company?: Partial<CompanyProfile> }) =>
  withUser(call('/api/auth/me', { method: 'PATCH', body: JSON.stringify(patch) }));

export const changePassword = (current: string, next: string) =>
  call('/api/auth/password', { method: 'POST', body: JSON.stringify({ current, next }) });

export const forgotPassword = () => call('/api/auth/forgot', { method: 'POST' });

export const submitCompanyForReview = () => withUser(call('/api/auth/company/submit', { method: 'POST' }));

export const saveGarage = (garage: GarageCar[]) =>
  withUser(call('/api/auth/garage', { method: 'PUT', body: JSON.stringify({ garage }) }));

export const claimAdmin = (adminToken: string) =>
  withUser(call('/api/auth/claim-admin', { method: 'POST', body: JSON.stringify({ adminToken }) }));

// Telegram notifications: returns the t.me link that connects this account to the bot
export const getTelegramLink = () => call<{ url: string }>('/api/telegram/link', { method: 'POST' }).then((r) => r.url);
export const unlinkTelegram = () => withUser(call('/api/telegram/link', { method: 'DELETE' }));

export async function deleteAccount(password: string) {
  await call('/api/auth/me', { method: 'DELETE', body: JSON.stringify({ password }) });
  set({ user: null });
}
