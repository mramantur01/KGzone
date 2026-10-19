// Downloads a freely licensed photo for each demo car model from Wikimedia Commons
// (the lead image of the model's English Wikipedia article) into static/cars/,
// and writes src/data/carPhotos.json with the local path + author/licence credit.
//
//   node scripts/photos/car-photos.mjs          # download missing photos
//   node scripts/photos/car-photos.mjs --list   # only show which files would be used
//
// To change a photo: edit ARTICLES (or set FILE_OVERRIDES to an exact Commons file name)
// and run the script again.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const OUT_DIR = path.join(ROOT, 'static/cars');
const OUT_JSON = path.join(ROOT, 'src/data/carPhotos.json');
const UA = 'KGzone-catalog/1.0 (https://k-gzone.vercel.app)';
const LIST_ONLY = process.argv.includes('--list');

// car id -> English Wikipedia article about that model generation
const ARTICLES = {
  'car-1': 'Toyota Land Cruiser (J300)',
  'car-2': 'Toyota Camry (XV70)',
  'car-3': 'BYD Song Plus',
  'car-4': 'Lexus RX (AL20)',
  'car-5': 'Zeekr 001',
  'car-6': 'Honda Fit (second generation)',
  'car-7': 'Mercedes-Benz E-Class (W213)',
  'car-8': 'Toyota Alphard',
  'car-9': 'Hyundai Santa Fe (TM)',
  'car-10': 'Kia K5',
  'car-11': 'Li Auto L7',
  'car-12': 'BMW X5 (G05)',
  'car-13': 'Zeekr 001',
  'car-14': 'BYD Song Plus',
  'car-15': 'Lexus LX (J200)',
  'car-16': 'Toyota RAV4 (XA50)',
  'car-17': 'Honda CR-V (fifth generation)',
  'car-18': 'Volkswagen ID.4',
  'car-19': 'Geely Xingyue L',
  'car-20': 'Chevrolet Cobalt',
  'car-21': 'Subaru Forester (SK)',
  'car-22': 'Mercedes-Benz E-Class (W211)',
  'car-23': 'Hyundai Tucson (NX4)',
  'car-24': 'Tesla Model Y',
  'car-25': 'Tank 300',
  'car-26': 'Toyota Highlander (XU70)',
  'car-27': 'Lexus RX (AL20)',
  'car-28': 'Honda Fit (third generation)',
  'car-29': 'Li Auto L7',
  'car-30': 'Geely Xingyue L',
  'car-31': 'Toyota RAV4 (XA50)',
  'car-32': 'Hyundai Sonata (DN8)',
  'car-33': 'Kia K5',
  'car-34': 'Mercedes-Benz S-Class (W222)',
  'car-35': 'Genesis GV80',
  'car-36': 'Nissan Patrol (Y62)',
  'car-37': 'Tesla Model Y',
  'car-38': 'Lexus GX (J150)',
  'car-39': 'Chery Tiggo 8',
  'car-40': 'Volkswagen Touareg',
};

// car id -> exact Commons file name, when the article's lead image is not suitable
const FILE_OVERRIDES = {
  'car-4': '2018 Lexus RX 350 F Sport in Sonic Titanium, front left.jpg',
  'car-27': '2018 Lexus RX 350 F Sport in Sonic Titanium, front left.jpg',
  'car-8': 'Toyota ALPHARD GF (H30W) front.jpg',
  'car-9': '2019 Hyundai Santa Fe front 1.21.19.jpg',
  'car-18': '2021 SAIC-Volkswagen ID.4 Crozz (front).jpg',
  'car-20': '2019 Chevrolet Cobalt 1.8 LTZ facelift (front).jpg',
  'car-21': 'Subaru Forester 2018 (SK) CUV Front Quarter.jpg',
  'car-23': 'Hyundai Tucson (NX4) 1X7A0424.jpg',
  'car-24': '2022 Tesla Model Y Long Range AWD Front.jpg',
  'car-37': '2022 Tesla Model Y Long Range AWD Front.jpg',
  'car-28': 'Honda FIT 13G (GK) front.JPG',
  'car-32': '2020 Hyundai Sonata SEL (Quartz White), front right.jpg',
  'car-36': '2018 Nissan Patrol Nismo (front).jpg',
  'car-38': '2020 Lexus GX 460 in Sonic Titanium, front right.jpg',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, asJson = true) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return asJson ? r.json() : Buffer.from(await r.arrayBuffer());
  }
  throw new Error(`gave up: ${url}`);
}

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function leadImage(article) {
  const u = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(article)}`;
  const d = await get(u);
  const page = Object.values(d.query.pages)[0];
  return page?.pageimage || null;
}

async function fileInfo(file) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1024&titles=${encodeURIComponent('File:' + file)}`;
  const d = await get(u);
  const page = Object.values(d.query.pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata || {};
  return {
    thumb: info.thumburl,
    license: strip(meta.LicenseShortName?.value),
    artist: strip(meta.Artist?.value),
    free: !/fair use|non-free/i.test(meta.LicenseShortName?.value || '') && (meta.Copyrighted?.value !== 'True' || !!meta.LicenseUrl?.value || /public domain|CC0/i.test(meta.LicenseShortName?.value || '')),
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
  };
}

const existing = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : {};
const result = {};
const byFile = new Map();
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [id, article] of Object.entries(ARTICLES)) {
  try {
    const file = FILE_OVERRIDES[id] || (await leadImage(article));
    if (!file) { console.log(`✗ ${id} ${article}: no lead image`); continue; }
    if (LIST_ONLY) { console.log(`${id}\t${article}\t${file}`); await sleep(300); continue; }
    if (byFile.has(file)) { result[id] = byFile.get(file); console.log(`= ${id} ${file}`); continue; }
    const info = await fileInfo(file);
    if (!info?.thumb || !info.free) { console.log(`✗ ${id} ${file}: not free or missing (${info?.license})`); continue; }
    // Saved as .jpg; run scripts/photos/compress.ps1 afterwards to convert and shrink to 1024px
    const name = `${slug(article)}${FILE_OVERRIDES[id] ? "-alt" : ""}.jpg`;
    const dest = path.join(OUT_DIR, name);
    if (!fs.existsSync(dest) || existing[id]?.file !== file) {
      fs.writeFileSync(dest, await get(info.thumb, false));
      await sleep(1500);
    }
    const entry = {
      image: `/cars/${name}`,
      file,
      credit: `${info.artist || 'Wikimedia Commons'} · ${info.license} · Wikimedia Commons`,
      source: info.page,
    };
    result[id] = entry;
    byFile.set(file, entry);
    console.log(`✓ ${id} ${file} (${info.license})`);
  } catch (e) {
    console.log(`✗ ${id} ${article}: ${e.message}`);
    if (existing[id]) result[id] = existing[id];
  }
}

if (!LIST_ONLY) {
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2) + '\n');
  console.log(`\n${Object.keys(result).length}/${Object.keys(ARTICLES).length} cars → ${path.relative(ROOT, OUT_JSON)}`);
}
