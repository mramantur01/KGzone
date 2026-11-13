import { useSyncExternalStore } from 'react';
import type { AutoPartItem } from '../types/car';

// Buyer's cart: several parts of one seller go out as one order. Kept in this browser.
export interface CartLine { partId: string; qty: number; addedAt: string }
const KEY = 'kgzone-cart';
let lines: CartLine[] = (() => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } })();
const listeners = new Set<() => void>();
const save = (next: CartLine[]) => {
  lines = next;
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
};

export const useCart = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => lines, () => lines);
export const inCart = (id: string) => lines.some((l) => l.partId === id);
export function addToCart(id: string, qty = 1) {
  const cur = lines.find((l) => l.partId === id);
  save(cur ? lines.map((l) => (l.partId === id ? { ...l, qty: Math.min(999, l.qty + qty) } : l)) : [...lines, { partId: id, qty, addedAt: new Date().toISOString() }].slice(-100));
  window.dispatchEvent(new CustomEvent('kgz:cart-added'));
}
export const setCartQty = (id: string, qty: number) => save(qty <= 0 ? lines.filter((l) => l.partId !== id) : lines.map((l) => (l.partId === id ? { ...l, qty: Math.min(999, qty) } : l)));
export const removeFromCart = (ids: string[]) => save(lines.filter((l) => !ids.includes(l.partId)));
export const openCart = () => window.dispatchEvent(new CustomEvent('kgz:open-cart'));

/** Price per piece for a quantity (wholesale price from N pieces) */
export const unitPrice = (p: AutoPartItem, qty: number) =>
  p.wholesalePriceKgs && qty >= (p.wholesaleMinQty || 2) ? p.wholesalePriceKgs : p.priceKgs;

/** One group per seller (registered seller id, or the phone for older listings) */
export const sellerKey = (p: AutoPartItem) => p.sellerId || `phone:${p.sellerPhone.replace(/\D/g, '').slice(-9)}`;
