import type { AutoPartItem, Language } from '../types/car';

// Listings are written in Russian; the site translates them to Kyrgyz and English by itself (see translateSome on the server)
export const partTitle = (p: AutoPartItem, lang: Language) => (lang !== 'ru' && p.tr?.[lang]?.t) || p.title;
export const partDescription = (p: AutoPartItem, lang: Language) => (lang !== 'ru' && p.tr?.[lang]?.d) || p.description;
