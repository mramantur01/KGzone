// Builds the brand -> model -> generation catalog from Wikidata rows + the site's curated lists.
// Usage: node build-catalog.mjs <mockData.ts> <wd-models.json> <out.json>
import fs from 'node:fs';

const [dataFile, wdFile, outFile] = process.argv.slice(2);
const src = fs.readFileSync(dataFile, 'utf8').replace(/\r\n/g, '\n');
const rows = JSON.parse(fs.readFileSync(wdFile, 'utf8'));

// --- site brands and curated models -------------------------------------------------------
const brandsBlock = src.slice(src.indexOf('export const ALL_CAR_BRANDS'), src.indexOf('export const BRAND_MODELS'));
const siteBrands = [...brandsBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const modelsBlock = src.slice(src.indexOf('export const BRAND_MODELS'), src.indexOf('export const getModelsForBrand'));
const curated = {};
for (const m of modelsBlock.matchAll(/^\s*'?([^':\n]+?)'?:\s*\[([\s\S]*?)\]/gm)) {
  curated[m[1].trim()] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9а-яё]+/g, ' ').trim();
const SUFFIX = /\s+(automobiles?|auto|motors?|motor company|motor corporation|cars?|group|automotive|corporation|company|co|ltd|ag|gmbh|s p a|spa|inc|holding|new energy|ev)$/;
const strip = (s) => { let x = norm(s); for (let i = 0; i < 3; i++) x = x.replace(SUFFIX, ''); return x; };

// Explicit aliases: Wikidata brand label -> site brand name
const ALIAS = {
  'lada': 'Лада', 'avtovaz': 'Лада', 'vaz': 'Лада', 'лада': 'Лада', 'автоваз': 'Лада', 'ваз': 'Лада',
  'aston martin lagonda': 'Aston Martin', 'mg marque': 'MG', 'ab volvo': 'Volvo', 'volvo cars': 'Volvo', 'tata motors limited': 'Tata',
  'american motors': 'AMC', 'american motors corporation': 'AMC', 'rimac automobili': 'Rimac', 'human horizons': 'HiPhi', 'hiphi': 'HiPhi',
  'jiangling motors': 'JMC', 'jiangling': 'JMC', 'london ev company': 'LEVC', 'london electric vehicle company': 'LEVC',
  'renault samsung motors': 'Renault Samsung', 'renault korea': 'Renault Samsung', 'kg mobility': 'KGM', 'zotye': 'Zotye',
  'zis': 'ЗИС', 'зис': 'ЗИС', 'volga': 'Волга', 'tagaz': 'ТагАЗ', 'luaz': 'ЛуАЗ', 'raf': 'РАФ', 'eraz': 'ЕрАЗ', 'bogdan': 'Богдан', 'doninvest': 'Донинвест',
  'izhmash': 'ИЖ', 'izhavto': 'ИЖ', 'иж': 'ИЖ', 'zaporizhzhia automobile building plant': 'ЗАЗ', 'gorky automobile plant': 'ГАЗ', 'ulyanovsk automobile plant': 'УАЗ',
  'gaz': 'ГАЗ', 'uaz': 'УАЗ', 'moskvitch': 'Москвич', 'moskvich': 'Москвич', 'azlk': 'Москвич', 'zaz': 'ЗАЗ', 'izh': 'ИЖ',
  'li auto': 'Li Auto', 'lixiang': 'Li Auto', 'mercedes benz': 'Mercedes-Benz', 'mercedes': 'Mercedes-Benz',
  'land rover': 'Land Rover', 'range rover': 'Land Rover', 'rolls royce': 'Rolls-Royce', 'aston martin': 'Aston Martin',
  'alfa romeo': 'Alfa Romeo', 'great wall': 'Great Wall', 'gac trumpchi': 'GAC', 'trumpchi': 'GAC', 'gac motor': 'GAC',
  'changan': 'Changan', 'dongfeng': 'Dongfeng', 'faw': 'FAW', 'saic': 'SAIC', 'mg': 'MG', 'ds': 'DS', 'smart': 'Smart',
  'lynk co': 'Lynk & Co', 'mini': 'MINI', 'seat': 'SEAT', 'skoda': 'Skoda', 'ssangyong': 'SsangYong',
  'citroen': 'Citroen', 'polestar': 'Polestar', 'genesis': 'Genesis', 'jac': 'JAC', 'baic': 'BAIC', 'byd': 'BYD',
  'xpeng': 'Xpeng', 'nio': 'NIO', 'hongqi': 'Hongqi', 'wuling': 'Wuling', 'jetour': 'Jetour', 'exeed': 'Exeed',
};

const siteByNorm = new Map();
for (const b of siteBrands) {
  for (const part of b.split(/\s*[/()]\s*/).filter(Boolean)) {
    siteByNorm.set(strip(part), b);
    siteByNorm.set(norm(part), b);
  }
}
const matchBrand = (label) => {
  if (!label) return null;
  const n = norm(label), s = strip(label);
  const alias = ALIAS[n] || ALIAS[s];
  if (alias && siteBrands.includes(alias)) return alias;
  if (alias) {
    const viaAlias = siteByNorm.get(strip(alias)) || siteByNorm.get(norm(alias));
    if (viaAlias) return viaAlias;
  }
  return siteByNorm.get(n) || siteByNorm.get(s) || null;
};

// --- cleanup helpers ---------------------------------------------------------------------
const JUNK = /\b(transmission|gearbox|engine|concept|prototype|in competition|racing|race car|rally|show car|vision|study|record car|land speed|safety car|pace car|art car)\b|\d+\/\d+(\/\d+)?\s*PS\b|\b\d+\s*hp\b|\btruck\b|\bbus\b|-ton\b/i;
// Site brands written in Cyrillic get Russian model names when Wikidata has them
const CYRILLIC_BRAND = (b) => /[А-Яа-яЁё]/.test(b);

// Extra prefixes to strip from model names ("Lada Priora" -> "Priora")
const BRAND_PREFIXES = {};
for (const [alias, brand] of Object.entries(ALIAS)) (BRAND_PREFIXES[brand] ||= []).push(alias);
BRAND_PREFIXES['Лада'] = ['Lada', 'LADA', 'Лада', 'AvtoVAZ'];

const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
// "second generation" / "11th generation" -> "2-е поколение" (translated via the i18n pattern "{}-е поколение")
const normalizeGen = (g) => {
  const m = g.match(/^(?:(.*?)\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d+)(?:st|nd|rd|th)?\s+generation$/i);
  if (!m) return g.trim();
  const n = ORD[m[2].toLowerCase()] || Number(m[2]);
  return (m[1] ? m[1].trim() + ' ' : '') + `${n}-е поколение`;
};

// Comparison key that treats Cyrillic and Latin spellings as equal ("Гранта" == "Granta")
const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const key = (s) => norm(s).replace(/[а-яё]/g, (c) => TR[c] ?? c).replace(/\s+/g, ' ');

// --- turn rows into models and generations -------------------------------------------------
const year = (v) => (v ? Number(v.slice(0, 4)) || null : null);
const removeBrand = (label, brandLabels) => {
  let out = label;
  for (const b of brandLabels.filter(Boolean).sort((a, c) => c.length - a.length)) {
    const re = new RegExp('^' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+', 'i');
    out = out.replace(re, '');
  }
  return out.trim();
};

const items = new Map(); // item id -> merged info
for (const r of rows) {
  const id = r.m.split('/').pop();
  const it = items.get(id) || { id, en: r.en, ru: r.ru, brands: new Set(), brandLabels: new Set(), series: r.seriesEn, start: null, end: null };
  const site = matchBrand(r.brandEn) || matchBrand(r.brandRu);
  if (site) it.brands.add(site);
  if (r.brandEn) it.brandLabels.add(r.brandEn);
  if (!it.series && r.seriesEn) it.series = r.seriesEn;
  const s = year(r.start) || year(r.inception);
  if (s && (!it.start || s < it.start)) it.start = s;
  const e = year(r.end);
  if (e && (!it.end || e > it.end)) it.end = e;
  items.set(id, it);
}

const catalog = {}; // brand -> modelName -> { gens: Map(name -> [from,to]) }
let used = 0;
const unmatched = {};
for (const it of items.values()) {
  const label = it.en || it.ru;
  if (!label || /^Q\d+$/.test(label)) continue;
  if (it.brands.size === 0) {
    for (const b of it.brandLabels) unmatched[b] = (unmatched[b] || 0) + 1;
    continue;
  }
  // Not a car you can buy: gearboxes, engines, racing/concept/show cars
  if (JUNK.test(label) || (it.series && JUNK.test(it.series))) continue;
  // Too old for the Kyrgyz market (keeps items without known years)
  const lastYear = it.end ?? it.start;
  if (lastYear && lastYear < 1960) continue;
  for (const brand of it.brands) {
    const brandLabels = [...it.brandLabels, brand, ...brand.split(/\s*[/()]\s*/), ...(BRAND_PREFIXES[brand] || [])];
    let model, gen = null;
    // Cyrillic site brands (Лада, ГАЗ, УАЗ...) read better with the Russian label
    const label = (CYRILLIC_BRAND(brand) && it.ru ? it.ru : (it.en || it.ru)).replace(/\s*\[[^\]]*\]\s*$/, '');
    if (CYRILLIC_BRAND(brand) && it.ru) it.series = null; // series labels are English only
    const paren = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (it.series) {
      model = removeBrand(it.series.replace(/\s*\([^)]*\)\s*$/, ''), brandLabels);
      const own = removeBrand(paren ? paren[1] : label, brandLabels);
      gen = paren ? paren[2] : own !== model ? own.replace(new RegExp('^' + model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '') || own : null;
    } else if (paren) {
      model = removeBrand(paren[1], brandLabels);
      gen = paren[2];
    } else {
      model = removeBrand(label, brandLabels);
    }
    // "Civic 10th generation" with no series -> model "Civic", generation "10-е поколение"
    const inlineGen = !gen && model.match(/^(.+?)\s+((?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d+)(?:st|nd|rd|th)?\s+generation)$/i);
    if (inlineGen) { model = inlineGen[1]; gen = inlineGen[2]; }
    if (!model || model.length > 40 || /^\d{4}$/.test(model)) continue;
    if (gen) gen = normalizeGen(gen);
    if (gen && (gen.length > 40 || norm(gen) === norm(model) || /^(автомобиль|автомобили|car|automobile|vehicle|концепт|concept)$/i.test(gen))) gen = null;
    catalog[brand] ||= {};
    const entry = (catalog[brand][model] ||= { gens: new Map() });
    if (gen) {
      const prev = entry.gens.get(gen);
      entry.gens.set(gen, [
        Math.min(prev?.[0] ?? Infinity, it.start ?? Infinity),
        Math.max(prev?.[1] ?? -Infinity, it.end ?? -Infinity),
      ]);
    }
    used++;
  }
}

// Brands Wikidata barely covers (new Chinese brands, Russian assemblers). Only well-known models.
const SUPPLEMENT = {
  Aurus: ['Senat', 'Komendant', 'Arsenal'],
  Austin: ['Mini', 'Metro', 'Maestro', 'Montego', 'Allegro'],
  Belgee: ['X50', 'X70', 'S50'],
  Bremach: ['T-Rex'],
  Ciimo: ['M-NV', 'X-NV'],
  'DW Hower': ['H3', 'H5'],
  Enovate: ['ME7', 'ME5', 'ME-S'],
  Evolute: ['i-Pro', 'i-Joy', 'i-Jet', 'i-Space', 'i-Sky', 'i-Van'],
  Exlantix: ['ES', 'ET'],
  FSO: ['Polonez', '125p', 'Lanos', 'Matiz'],
  Hanteng: ['X5', 'X7', 'X8'],
  HiPhi: ['X', 'Y', 'Z'],
  Huanghai: ['N1', 'N2', 'Antelope', 'Landscape', 'Plutus'],
  Jidu: ['01', '07'],
  Knewstar: ['001'],
  'M-Hero': ['917', '817'],
  Nysa: ['522'],
  Oshan: ['X5', 'X5 Plus', 'X7', 'Z6'],
  'Polar Stone': ['01'],
  Radar: ['RD6', 'Horizon'],
  Rox: ['01', 'Adamas'],
  Scout: ['Traveler', 'Terra'],
  Skywell: ['ET5', 'HT-i', 'BE11'],
  Solaris: ['HC', 'KRS', 'KRX', 'SRV'],
  Sollers: ['SP7', 'ST6', 'ST8', 'Argo', 'Atlant'],
  'TENET Plus': ['T4', 'T7', 'T8'],
  VGV: ['U70', 'U75 Plus', 'VX7'],
  Vortex: ['Estina', 'Tingo', 'Corda'],
  Zotye: ['T600', 'T700', 'SR9', 'Z100', 'Coupa', 'Nomad'],
  'Атом': ['Атом'],
  'ВИС': ['ВИС-2345', 'ВИС-2346', 'ВИС-2347'],
  'Донинвест': ['Орион', 'Кондор', 'Ассоль'],
  'ЗИС': ['ЗИС-101', 'ЗИС-110'],
  'РАФ': ['РАФ-2203 «Латвия»', 'РАФ-977'],
};
for (const [brand, models] of Object.entries(SUPPLEMENT)) {
  if (!siteBrands.includes(brand)) continue;
  catalog[brand] ||= {};
  for (const m of models) catalog[brand][m] ||= { gens: new Map() };
}

// --- merge curated models (they keep their spelling and go first) -----------------------------
const out = {};
let totalModels = 0, totalGens = 0;
for (const brand of siteBrands) {
  const wd = catalog[brand] || {};
  const seen = new Map();
  const list = [];
  for (const name of curated[brand] || []) {
    seen.set(key(name), list.length);
    list.push({ n: name, g: [] });
  }
  for (const name of Object.keys(wd).sort((a, c) => a.localeCompare(c))) {
    const gens = [...wd[name].gens.entries()]
      .map(([g, [a, b]]) => [g, Number.isFinite(a) ? a : null, Number.isFinite(b) ? b : null])
      .sort((x, y) => (x[1] ?? 9999) - (y[1] ?? 9999));
    const k = key(name);
    if (seen.has(k)) {
      const target = list[seen.get(k)];
      const have = new Set(target.g.map((x) => key(x[0])));
      target.g.push(...gens.filter((x) => !have.has(key(x[0]))));
      continue;
    }
    seen.set(k, list.length);
    list.push({ n: name, g: gens });
  }
  if (list.length) out[brand] = list.map((m) => (m.g.length ? m : { n: m.n }));
  totalModels += list.length;
  totalGens += list.reduce((s, m) => s + m.g.length, 0);
}

fs.writeFileSync(outFile, JSON.stringify(out));
const withModels = Object.keys(out).length;
console.log(`site brands: ${siteBrands.length}, with models: ${withModels}, models: ${totalModels}, generations: ${totalGens}`);
console.log('size:', Math.round(fs.statSync(outFile).size / 1024), 'KB');
console.log('site brands without models:', siteBrands.filter((b) => !out[b]).join(', '));
console.log('\ntop unmatched Wikidata brands:', Object.entries(unmatched).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([b, n]) => `${b}:${n}`).join(', '));
