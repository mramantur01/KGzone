import type { AutoPartItem } from '../types/car';
import type { CarGeneration } from '../data/mockData';

// Shared rules for "does this part fit the selected car", used by the parts filter and the
// per-model parts tree so both always agree.

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яё]+/g, ' ').trim();

/** "Land Cruiser Prado" matches "Land Cruiser Prado 150" and vice versa */
const sameModel = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ');
};

export const partFitsModel = (part: AutoPartItem, brand: string, model: string): boolean => {
  if (part.brand === brand && sameModel(part.model, model)) return true;
  return !!part.compatibility?.some((c) => c.brand === brand && sameModel(c.model, model));
};

export const partFitsBrand = (part: AutoPartItem, brand: string): boolean =>
  part.brand === brand || !!part.compatibility?.some((c) => c.brand === brand);

// "2018-2023", "(2018–н.в.)", "2016+" -> [from, to]
const YEARS = /(\d{4})\s*(?:[-–]\s*(\d{4}|н\.в\.|наст\.?)|\+)?/g;
const yearRanges = (text: string): [number, number][] =>
  [...text.matchAll(YEARS)].map((m) => [Number(m[1]), m[2] && /\d{4}/.test(m[2]) ? Number(m[2]) : m[2] || text.includes(m[1] + '+') ? 2100 : Number(m[1])]);

export const partFitsGeneration = (part: AutoPartItem, gen: CarGeneration): boolean => {
  const texts = [part.generation, part.bodyCode, part.yearRange, ...(part.compatibility || []).flatMap((c) => [c.bodyCode, c.years])]
    .filter(Boolean)
    .join(' ');
  // Body / generation code written on the part ("XV70", "W211", "GE8")
  const code = norm(gen.name);
  if (code && code.length >= 2 && norm(texts).split(' ').some((w) => w === code)) return true;
  // Otherwise compare production years
  if (!gen.from) return false;
  const genTo = gen.to ?? 2100;
  return yearRanges(texts).some(([a, b]) => a <= genTo && b >= gen.from!);
};

export interface PartCategoryDef {
  id: string;
  matchId?: string;
  /** Other category names sellers use for the same group ("Стартер" belongs to "Электрика") */
  aliases?: string[];
  subParts?: string[];
}

export const partInCategory = (part: AutoPartItem, cat: PartCategoryDef): boolean => {
  if (cat.id === 'Все') return true;
  const target = cat.matchId || cat.id;
  const category = part.category.toLowerCase();
  if (part.category === target || part.category.includes(cat.id) || part.category.includes(target)) return true;
  // A part filed under a narrower name ("Стартер", "Турбина") still belongs to the group
  return [...(cat.aliases || []), ...(cat.subParts || [])].some((k) => {
    const key = k.toLowerCase();
    return category.includes(key) || key.includes(category);
  });
};

export const partMatchesSubPart = (part: AutoPartItem, sub: string): boolean => {
  if (sub === 'Все') return true;
  const s = sub.toLowerCase();
  return (
    part.title.toLowerCase().includes(s) ||
    !!part.subcategory?.toLowerCase().includes(s) ||
    !!part.subPartName?.toLowerCase().includes(s)
  );
};
