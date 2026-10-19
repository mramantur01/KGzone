import { useSyncExternalStore } from 'react';
import type { AutoPartItem } from '../types/car';
import { AUTO_PARTS } from '../data/mockData';

// Client side of the parts catalog: public list, seller submissions (go to moderation),
// and the admin moderation API (needs the ADMIN_TOKEN password, kept for the browser session).

export type PartStatus = 'pending' | 'approved' | 'rejected';
export interface ModeratedPart extends AutoPartItem {
  createdAt?: string;
  moderation?: { status: PartStatus; submittedAt?: string; reviewedAt?: string; reason?: string };
}

const ADMIN_KEY = 'kgzone-admin-token';

export const getAdminKey = (): string => {
  try { return sessionStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; }
};
export const setAdminKey = (key: string) => {
  try { key ? sessionStorage.setItem(ADMIN_KEY, key) : sessionStorage.removeItem(ADMIN_KEY); } catch { /* private mode */ }
};

async function call<T>(url: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (admin) headers['x-admin-token'] = getAdminKey();
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.error || `Ошибка ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

// ---- shared catalog store (approved parts from the database + built-in demo listings) ----
let approved: AutoPartItem[] = [];
let snapshot: AutoPartItem[] = AUTO_PARTS;
const listeners = new Set<() => void>();
const emit = () => {
  const ids = new Set(approved.map((p) => p.id));
  snapshot = [...approved, ...AUTO_PARTS.filter((p) => !ids.has(p.id))];
  listeners.forEach((l) => l());
};

export async function refreshParts() {
  try {
    const data = await call<{ parts: AutoPartItem[] }>('/api/parts');
    approved = data.parts;
    emit();
  } catch {
    // Offline or API down: keep showing what we have
  }
}

/** True for parts stored in the database (editable via the admin API), false for built-in demo listings */
export const isDbPart = (id: string) => approved.some((p) => p.id === id);

let loaded = false;
export function useParts(): AutoPartItem[] {
  if (!loaded) { loaded = true; refreshParts(); }
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => snapshot,
    () => snapshot
  );
}

// ---- seller ----
export const submitPart = (part: Partial<AutoPartItem>) =>
  call<{ id: string; status: PartStatus }>('/api/parts', { method: 'POST', body: JSON.stringify(part) });

// ---- admin ----
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

export const listAdminParts = (status: PartStatus | 'all' = 'all') =>
  call<{ parts: ModeratedPart[] }>(`/api/admin/parts?status=${status}`, {}, true).then((d) => d.parts);

export const moderatePart = async (id: string, action: 'approve' | 'reject', reason?: string) => {
  const r = await call<{ part: ModeratedPart }>(`/api/admin/parts/${encodeURIComponent(id)}/moderate`, {
    method: 'PATCH', body: JSON.stringify({ action, reason }),
  }, true);
  await refreshParts();
  return r.part;
};

export const adminAddPart = async (part: Partial<AutoPartItem>) => {
  const r = await call<{ part: AutoPartItem }>('/api/admin/parts', { method: 'POST', body: JSON.stringify(part) }, true);
  await refreshParts();
  return r.part;
};

export const adminUpdatePart = async (id: string, patch: Partial<AutoPartItem>) => {
  const r = await call<{ part: ModeratedPart }>(`/api/admin/parts/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  }, true);
  await refreshParts();
  return r.part;
};

export const adminDeletePart = async (id: string) => {
  await call(`/api/admin/parts/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
  await refreshParts();
};
