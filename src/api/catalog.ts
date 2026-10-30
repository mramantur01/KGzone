import { call } from './admin';

// Parts catalog (Laximo / TecDoc via the server). Without a connected catalog only the
// cross search across KGzone listings works.

export interface CatalogStatus {
  configured: boolean;
  provider: string | null;
  features: { vin: boolean; frame: boolean; groups: boolean; crosses: boolean };
  available: { id: string; name: string; configured: boolean }[];
  selected: string | null;
}
export interface CatalogVehicle { ref: string; brand: string; model: string; modification?: string; year?: string; engine?: string; bodyCode?: string; market?: string; generation?: string }
export interface CatalogGroup { id: string; name: string; parentId?: string }
export interface CatalogPart { oem: string; name: string; quantity?: string; note?: string; brand?: string }
export interface CrossListing { id: string; title: string; partNumber: string; priceKgs: number; city?: string; image?: string }
export interface CrossesResult {
  oem: string;
  local: CrossListing[];
  viaCrosses: CrossListing[];
  external: { brand: string; number: string; name?: string }[];
  catalog: string | null;
  externalError: string | null;
  knowledge: OemKnowledge | null;
}

let statusPromise: Promise<CatalogStatus> | null = null;
export const getCatalogStatus = () => {
  if (!statusPromise) {
    statusPromise = call<CatalogStatus>('/api/catalog/status').catch((e) => { statusPromise = null; throw e; });
  }
  return statusPromise;
};

const result = <T,>(p: Promise<{ result: T }>) => p.then((r) => r.result);
/** Paid catalog when connected, otherwise the free NHTSA VIN database (no assembly diagrams) */
export const findCatalogVehicles = (q: string) =>
  call<{ result: CatalogVehicle[]; provider: string; groups?: boolean }>(`/api/catalog/vehicles?q=${encodeURIComponent(q)}`).then((r) => ({ vehicles: r.result, provider: r.provider, groups: r.groups !== false }));
export const listCatalogGroups = (vehicle: string) => result(call<{ result: CatalogGroup[] }>(`/api/catalog/groups?vehicle=${encodeURIComponent(vehicle)}`));
export const listCatalogParts = (vehicle: string, group: string) =>
  result(call<{ result: CatalogPart[] }>(`/api/catalog/parts?vehicle=${encodeURIComponent(vehicle)}&group=${encodeURIComponent(group)}`));
export interface OemKnowledge {
  number: string;
  names: { name: string; count: number }[];
  crosses: { number: string; sellers: number }[];
  fits: { brand: string; model: string; generation?: string; sellers: number }[];
  listings: number;
  sellers: number;
}
export const getOemKnowledge = (oem: string) => call<{ knowledge: OemKnowledge | null }>(`/api/oem/${encodeURIComponent(oem)}`).then((r) => r.knowledge);

export const getCrosses = (oem: string) => call<CrossesResult>(`/api/catalog/crosses?oem=${encodeURIComponent(oem)}`);

/** Looks like an OEM / article number rather than words: has digits, 5+ characters, no spaces between words */
export const looksLikeOem = (q: string) => {
  const t = q.trim();
  return t.length >= 5 && /\d/.test(t) && !/\s/.test(t) && t.replace(/[^A-Za-z0-9]/g, '').length >= 5;
};

/** Japanese frame number like NZE141-1234567 */
export const looksLikeFrame = (q: string) => /^[A-Z0-9]{2,8}-?\d{5,8}$/i.test(q.replace(/\s/g, ''));
