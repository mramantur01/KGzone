import { useSyncExternalStore } from 'react';
import type { Car } from '../types/car';
import { INITIAL_CARS } from '../data/mockData';
import { call, type ModerationInfo, type ModerationStatus } from './admin';
import { HIDE_DEMO_CARS_AT, vipFirst } from '../utils/demo';

// Car listings: approved listings from the database + built-in demo listings.
// New listings from sellers go to moderation first.

export interface ModeratedCar extends Car {
  createdAt?: string;
  moderation?: ModerationInfo;
}

let approved: Car[] = [];
let snapshot: Car[] = INITIAL_CARS;
const listeners = new Set<() => void>();
const emit = () => {
  const ids = new Set(approved.map((c) => c.id));
  const demo = approved.length >= HIDE_DEMO_CARS_AT ? [] : INITIAL_CARS.filter((c) => !ids.has(c.id));
  snapshot = [...vipFirst(approved), ...demo];
  listeners.forEach((l) => l());
};

export async function refreshCars() {
  try {
    const data = await call<{ cars: Car[] }>('/api/cars');
    approved = data.cars;
    emit();
  } catch {
    // keep what we have
  }
}

export const isDbCar = (id: string) => approved.some((c) => c.id === id);

let loaded = false;
export function useCars(): Car[] {
  if (!loaded) { loaded = true; refreshCars(); }
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => snapshot,
    () => snapshot
  );
}

export const submitCar = (car: Partial<Car>) =>
  call<{ id: string; status: ModerationStatus }>('/api/cars', { method: 'POST', body: JSON.stringify(car) });

export const listAdminCars = (status: ModerationStatus | 'all' = 'all') =>
  call<{ cars: ModeratedCar[] }>(`/api/admin/cars?status=${status}`, {}, true).then((d) => d.cars);

export const moderateCar = async (id: string, action: 'approve' | 'reject', reason?: string) => {
  const r = await call<{ car: ModeratedCar }>(`/api/admin/cars/${encodeURIComponent(id)}/moderate`, {
    method: 'PATCH', body: JSON.stringify({ action, reason }),
  }, true);
  await refreshCars();
  return r.car;
};

export const adminUpdateCar = async (id: string, patch: Partial<Car>) => {
  const r = await call<{ car: ModeratedCar }>(`/api/admin/cars/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  }, true);
  await refreshCars();
  return r.car;
};

export const adminDeleteCar = async (id: string) => {
  await call(`/api/admin/cars/${encodeURIComponent(id)}`, { method: 'DELETE' }, true);
  await refreshCars();
};
