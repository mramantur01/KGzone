// "Smart" parts search used by the site and the server (AI consultant): understands car names
// typed in Cyrillic ("камри" = Camry), market slang ("граната" = ШРУС), word endings
// ("колодку" = колодки) and one-letter typos ("амартизатор"). No browser or Node APIs here.

export const normText = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9ңөү]+/gi, ' ').trim();

// Cyrillic spellings of makes and models -> the Latin name used in listings
const TRANSLIT: Record<string, string> = {
  тойота: 'toyota', таета: 'toyota', тоета: 'toyota', тайота: 'toyota', лексус: 'lexus', хонда: 'honda', ниссан: 'nissan', нисан: 'nissan',
  мазда: 'mazda', мицубиси: 'mitsubishi', митсубиси: 'mitsubishi', мицубиши: 'mitsubishi', субару: 'subaru', хендай: 'hyundai', хундай: 'hyundai',
  хюндай: 'hyundai', хендэ: 'hyundai', киа: 'kia', мерседес: 'mercedes', мерс: 'mercedes', бмв: 'bmw', ауди: 'audi', фольксваген: 'volkswagen',
  фольц: 'volkswagen', ваз: 'lada', лада: 'lada', шевроле: 'chevrolet', шеви: 'chevrolet', дэу: 'daewoo', деу: 'daewoo', део: 'daewoo',
  камри: 'camry', камрю: 'camry', королла: 'corolla', карола: 'corolla', корола: 'corolla', прадо: 'prado', крузер: 'cruiser', круизер: 'cruiser',
  рав4: 'rav4', рав: 'rav4', фит: 'fit', срв: 'crv', цивик: 'civic', аккорд: 'accord', аккард: 'accord', приус: 'prius', аква: 'aqua',
  эстима: 'estima', альфард: 'alphard', хайлюкс: 'hilux', хайлакс: 'hilux', иста: 'ist', витц: 'vitz', виц: 'vitz', спринтер: 'sprinter',
  гелик: 'g class', матиз: 'matiz', спарк: 'spark', нива: 'нива', соната: 'sonata', солярис: 'solaris', спортейдж: 'sportage', рио: 'rio',
  зикр: 'zeekr', бид: 'byd', тиида: 'tiida', ноут: 'note', харриер: 'harrier', хариер: 'harrier', одиссей: 'odyssey', степвагон: 'stepwgn',
  демио: 'demio', аксела: 'axela', форестер: 'forester', аутбек: 'outback', паджеро: 'pajero', лансер: 'lancer', аутлендер: 'outlander',
  санта: 'santa', туссан: 'tucson', тусан: 'tucson', сорренто: 'sorento', соренто: 'sorento', оптима: 'optima', ниву: 'нива',
};

// Words that mean the same part at the market
const SYNONYMS: string[][] = [
  ['амортизатор', 'стойка', 'амортизаторы', 'стойки'],
  ['шрус', 'граната', 'гранату'],
  ['колодки', 'колодка', 'колодку'],
  ['фара', 'фары', 'оптика', 'фонарь'],
  ['ступица', 'подшипник'],
  ['стартер', 'бендикс'],
  ['генератор', 'динамо'],
  ['сайлентблок', 'сайлент', 'втулка'],
  ['свеча', 'свечи'],
  ['грм', 'ремень'],
  ['помпа', 'насос'],
  ['кпп', 'коробка', 'акпп', 'мкпп', 'вариатор', 'cvt'],
  ['двигатель', 'двс', 'мотор'],
  ['катушка', 'бобина'],
  ['лямбда', 'кислорода', 'кислородный'],
  ['аккумулятор', 'акб', 'батарея'],
  ['масло', 'масла'],
  ['тормозуха', 'тормозная'],
  ['рулевая', 'рулевой', 'рулевые'],
  ['датчик', 'датчики', 'сенсор'],
  ['радиатор', 'кулер'],
  ['стекло', 'лобовое', 'лобовуха'],
];
const SYN = new Map<string, string[]>();
for (const group of SYNONYMS) for (const w of group) SYN.set(w, group);

// Crude Russian stem: drops common endings so "колодку", "колодки", "колодок" meet
const ENDINGS = ['ами', 'ями', 'ов', 'ев', 'ей', 'ой', 'ый', 'ий', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ах', 'ях', 'ам', 'ям', 'ку', 'ки', 'ок', 'а', 'я', 'ы', 'и', 'у', 'ю', 'е', 'о'];
export function stem(w: string) {
  if (w.length < 5 || !/[а-я]/.test(w)) return w;
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length);
  return w;
}

// Damerau-Levenshtein distance <= 1 (one typo: missing, extra, wrong or swapped letter)
function oneTypo(a: string, b: string) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** All the ways one typed word may appear in a listing */
export function alternatives(word: string): string[] {
  const out = new Set<string>([word, stem(word)]);
  const t = TRANSLIT[word];
  if (t) out.add(t);
  for (const s of SYN.get(word) || SYN.get(stem(word)) || []) { out.add(s); out.add(stem(s)); }
  return [...out].filter(Boolean);
}

export interface Haystack { text: string; words: string[]; compact: string }

/** Prepare a listing's searchable text once */
export function haystack(fields: unknown[]): Haystack {
  const text = normText(fields.filter(Boolean).join(' '));
  return { text, words: text.split(' ').filter((w) => w.length >= 4), compact: text.replace(/\s+/g, '') };
}

/** One typed word is found exactly, by synonym, stem, Cyrillic name or with one typo */
function wordMatches(h: Haystack, w: string) {
  const alts = alternatives(w);
  if (alts.some((a) => h.text.includes(a))) return true;
  // Part numbers and codes written with or without dashes / spaces
  if (/\d/.test(w) && w.length >= 4 && h.compact.includes(w)) return true;
  if (w.length >= 5) {
    const s = stem(w);
    return h.words.some((hw) => oneTypo(stem(hw), s) || oneTypo(hw, w));
  }
  return false;
}

/** True when every word of the query is found */
export function smartMatch(h: Haystack, query: string): boolean {
  return normText(query).split(' ').filter(Boolean).every((w) => wordMatches(h, w));
}

// Words of a chat question that say nothing about the part itself
const STOP = new Set(('нужна нужен нужно нужны надо есть ли где купить найти ищу продаете продается сколько стоит цена почем ' +
  'на для в во с со и или а у по к от до мне меня мой моя мое моего машину машина авто автомобиль запчасть запчасти деталь ' +
  'какой какая какие какую хочу можно подскажите пожалуйста привет здравствуйте салам кайда барбы керек канча баасы').split(' '));

/** Share of meaningful words of a free-form question found in the listing (0..1), and how many matched */
export function smartScore(h: Haystack, question: string): { score: number; hits: number } {
  const words = normText(question).split(' ').filter((w) => w && !STOP.has(w) && !/^\d{1,3}$/.test(w));
  if (!words.length) return { score: 0, hits: 0 };
  const hits = words.filter((w) => wordMatches(h, w)).length;
  return { score: hits / words.length, hits };
}

/** Searchable fields of a part listing */
export const partHaystack = (p: {
  title?: string; partNumber?: string; brand?: string; model?: string; category?: string; subcategory?: string; subPartName?: string;
  storeLocation?: string; containerInfo?: string; bodyCode?: string; manufacturer?: string; crossNumbers?: string[]; generation?: string;
}) => haystack([p.title, p.partNumber, p.brand, p.model, p.generation, p.category, p.subcategory, p.subPartName, p.storeLocation, p.containerInfo, p.bodyCode, p.manufacturer, ...(p.crossNumbers || [])]);
