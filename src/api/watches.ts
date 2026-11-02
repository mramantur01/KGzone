import { call } from './admin';

// "Сообщить, когда появится": saved searches of a buyer
export interface Watch { id: string; q: string; brand: string; model: string; createdAt: string; lastNotifiedAt?: string }

export const listWatches = () => call<{ watches: Watch[] }>('/api/watches').then((r) => r.watches);
export const addWatch = (q: string, brand = '', model = '') =>
  call<{ watch: Watch }>('/api/watches', { method: 'POST', body: JSON.stringify({ q, brand, model }) }).then((r) => r.watch);
export const removeWatch = (id: string) => call(`/api/watches/${encodeURIComponent(id)}`, { method: 'DELETE' });

const compact = (v: string) => v.toLowerCase().replace(/ё/g, 'е').replace(/[\s-]/g, '');

/** Same rule as the server: make/model must fit and every word must be in the title or numbers */
export function watchMatches(w: Pick<Watch, 'q' | 'brand' | 'model'>, p: { brand?: string; model?: string; title: string; partNumber?: string; crossNumbers?: string[] }) {
  if (w.brand && String(p.brand || '').toLowerCase() !== w.brand.toLowerCase()) return false;
  if (w.model && !String(p.model || '').toLowerCase().includes(w.model.toLowerCase())) return false;
  const hay = compact([p.title, p.partNumber, ...(p.crossNumbers || []), p.model].join(' '));
  return w.q.split(' ').filter(Boolean).every((word) => hay.includes(compact(word)));
}

// Searches that found nothing are counted so sellers see what buyers need (one report per phrase per visit)
const reported = new Set<string>();
export function reportSearchMiss(q: string, brand = '', model = '') {
  const key = `${q.trim().toLowerCase()}|${brand}|${model}`;
  if ((q.trim().length < 3 && !brand) || reported.has(key)) return;
  reported.add(key);
  call('/api/search-misses', { method: 'POST', body: JSON.stringify({ q, brand, model }) }).catch(() => undefined);
}
