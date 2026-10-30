import { useSyncExternalStore } from 'react';
import type { AutoPartItem } from '../types/car';
import { AUTO_PARTS } from '../data/mockData';
import { call, type ModerationInfo, type ModerationStatus } from './admin';
import { HIDE_DEMO_PARTS_AT, vipFirst } from '../utils/demo';

export { getAdminKey, setAdminKey, checkAdminKey } from './admin';

// Client side of the parts catalog: public list, seller submissions (go to moderation),
// and the admin moderation API.

export type PartStatus = ModerationStatus;
export interface ModeratedPart extends AutoPartItem {
  createdAt?: string;
  moderation?: ModerationInfo;
}

// ---- shared catalog store (approved parts from the database + built-in demo listings) ----
let approved: AutoPartItem[] = [];
let snapshot: AutoPartItem[] = AUTO_PARTS;
const listeners = new Set<() => void>();
const emit = () => {
  const ids = new Set(approved.map((p) => p.id));
  const demo = approved.length >= HIDE_DEMO_PARTS_AT ? [] : AUTO_PARTS.filter((p) => !ids.has(p.id));
  snapshot = [...vipFirst(approved), ...demo];
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
