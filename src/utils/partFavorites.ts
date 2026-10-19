import { useSyncExternalStore } from 'react';

// Favourite parts are remembered in this browser only (no account needed).
const KEY = 'kgzone-part-favorites';

const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

let ids: string[] = read();
const listeners = new Set<() => void>();

export function togglePartFavorite(id: string) {
  ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export function usePartFavorites(): string[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => ids,
    () => ids
  );
}
