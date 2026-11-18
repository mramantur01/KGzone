import { useSyncExternalStore } from 'react';
import { isSignedIn } from '../api/auth';
import { requestSignIn } from '../api/chat';

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
  // Favourites are for signed-in people: a guest is sent to registration
  if (!isSignedIn()) { requestSignIn('Чтобы сохранять запчасти в избранное, зарегистрируйтесь или войдите.', 'register'); return; }
  ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  // Tell the site, so the part page can show «♡ 9 в избранном» (only listings from the database)
  const on = ids.includes(id);
  if (!id.startsWith('demo')) fetch(`/api/parts/${encodeURIComponent(id)}/fav`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ on }) }).catch(() => undefined);
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
