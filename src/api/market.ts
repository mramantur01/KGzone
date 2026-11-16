import { call } from './admin';
import { refreshParts } from './parts';

// Reservation of a part for 2 hours and the best shops block

export const reservePart = async (id: string, name: string, phone: string) => {
  const r = await call<{ reservedUntil: string; orderNumber: string }>(`/api/parts/${encodeURIComponent(id)}/reserve`, { method: 'POST', body: JSON.stringify({ name, phone }) });
  refreshParts();
  return r;
};

export interface TopSeller {
  id: string;
  name: string;
  city: string;
  avatarUrl?: string;
  official: boolean;
  verified: boolean;
  market: string;
  rating: number | null;
  reviewsCount: number;
  partsCount: number;
}
export const loadTopSellers = () => call<{ sellers: TopSeller[] }>('/api/sellers/top').then((r) => r.sellers);

/** Same part number written differently ("04465-48150", "0446548150") */
export const oemKey = (v?: string) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Time like 14:30 */
export const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bishkek' }) : '');
/** 1 товар, 2 товара, 5 товаров */
export const ruPlural = (n: number, one: string, few: string, many: string) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; };
export const isActiveUntil = (iso?: string) => Boolean(iso && Date.parse(iso) > Date.now());
