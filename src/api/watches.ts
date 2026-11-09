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

// Anonymous daily counters for the owner's statistics: one visit per browser per day, searches by phrase
const pulsed = new Set<string>();
export function pulse(type: 'visit' | 'search', q = '') {
  if (type === 'visit') {
    const today = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem('kgz-visit') === today) return; localStorage.setItem('kgz-visit', today); } catch { /* private mode */ }
  } else {
    const key = q.trim().toLowerCase();
    if (key.length < 3 || pulsed.has(key)) return;
    pulsed.add(key);
  }
  fetch('/api/pulse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }), keepalive: true }).catch(() => undefined);
}
