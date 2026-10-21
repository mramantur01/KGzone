import { useSyncExternalStore } from 'react';

// Recently opened listings (this browser only) + view counters for database listings.
const KEY = 'kgzone-view-history';
const MAX = 50;

export interface ViewedItem {
  kind: 'part' | 'car';
  id: string;
  title: string;
  image: string;
  price: string;
  at: string;
}

const read = (): ViewedItem[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

let items: ViewedItem[] = read();
const listeners = new Set<() => void>();
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
};

export function recordView(item: Omit<ViewedItem, 'at'>) {
  items = [{ ...item, at: new Date().toISOString() }, ...items.filter((i) => !(i.kind === item.kind && i.id === item.id))].slice(0, MAX);
  save();
  // Count the view on the server (ignored for built-in demo listings)
  fetch(`/api/stats/${item.kind === 'part' ? 'parts' : 'cars'}/${encodeURIComponent(item.id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'view' }),
  }).catch(() => undefined);
}

export function recordContact(kind: 'part' | 'car', id: string) {
  fetch(`/api/stats/${kind === 'part' ? 'parts' : 'cars'}/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'contact' }),
  }).catch(() => undefined);
}

export function clearViewHistory() {
  items = [];
  save();
}

export function useViewHistory(): ViewedItem[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => items,
    () => items
  );
}
