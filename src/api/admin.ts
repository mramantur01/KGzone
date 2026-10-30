// Shared API plumbing: JSON requests and the admin password (the server's ADMIN_TOKEN),
// which is kept only for the current browser session.

import { demoResponse, isDemoCabinet } from './demo';

const ADMIN_KEY = 'kgzone-admin-token';

export const getAdminKey = (): string => {
  try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; }
};
export const setAdminKey = (key: string) => {
  try { key ? sessionStorage.setItem(ADMIN_KEY, key) : sessionStorage.removeItem(ADMIN_KEY); } catch { /* private mode */ }
};

export type ApiError = Error & { status?: number };

export async function call<T>(url: string, init: RequestInit = {}, admin = false): Promise<T> {
  if (isDemoCabinet()) {
    const demo = demoResponse(url, (init.method || 'GET').toUpperCase());
    if (demo !== undefined) return demo as T;
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (admin && getAdminKey()) headers['x-admin-token'] = getAdminKey();
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.error || `Ошибка ${res.status}`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const checkAdminKey = async (key: string) => {
  const prev = getAdminKey();
  setAdminKey(key);
  try {
    await call('/api/admin/check', {}, true);
    return true;
  } catch {
    setAdminKey(prev);
    return false;
  }
};

export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export interface ModerationInfo {
  status: ModerationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reason?: string;
}
