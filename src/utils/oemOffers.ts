import type { AutoPartItem } from '../types/car';

// Same part from other sellers: matched by OEM number or cross numbers (spaces and dashes ignored)
const norm = (v?: string) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function partNumbers(p: Pick<AutoPartItem, 'partNumber' | 'crossNumbers'>): Set<string> {
  return new Set([p.partNumber, ...(p.crossNumbers || [])].map(norm).filter((n) => n.length >= 4));
}

export function sameOemOffers(part: AutoPartItem, all: AutoPartItem[]): AutoPartItem[] {
  const mine = partNumbers(part);
  if (!mine.size) return [];
  return all
    .filter((p) => p.id !== part.id && (p.sellerId ? p.sellerId !== part.sellerId : true) && [...partNumbers(p)].some((n) => mine.has(n)))
    .sort((a, b) => a.priceKgs - b.priceKgs);
}

/** Price range of a number on the site (for sellers setting a price); own listings excluded */
export function priceRange(oem: string, all: AutoPartItem[], excludeSellerId?: string) {
  const n = norm(oem);
  if (n.length < 4) return null;
  const prices = all
    .filter((p) => p.sellerId !== excludeSellerId || !excludeSellerId)
    .filter((p) => partNumbers(p).has(n))
    .map((p) => p.priceKgs)
    .filter((x) => x > 0)
    .sort((a, b) => a - b);
  if (!prices.length) return null;
  return { min: prices[0], max: prices[prices.length - 1], count: prices.length, median: prices[Math.floor(prices.length / 2)] };
}
