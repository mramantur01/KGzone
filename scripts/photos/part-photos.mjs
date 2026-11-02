// Downloads a freely licensed photo for each kind of part used in the demo seller cabinet
// from Wikimedia Commons into static/parts/demo/, and writes src/data/demoPartPhotos.json
// with the local path + author/licence credit.
//
//   node scripts/photos/part-photos.mjs          # download missing photos
//   node scripts/photos/part-photos.mjs --list   # only show which files would be used
//
// To change a photo: put an exact Commons file name into FILE_OVERRIDES and run again.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const OUT_DIR = path.join(ROOT, 'static/parts/demo');
const OUT_JSON = path.join(ROOT, 'src/data/demoPartPhotos.json');
const UA = 'KGzone-catalog/1.0 (https://k-gzone.vercel.app)';
const LIST_ONLY = process.argv.includes('--list');

// photo key -> Commons search (English works best)
const QUERIES = {
  pads: 'brake pads',
  foglight: 'car fog lamp',
  mirror: 'car side mirror',
  stabilizer: 'stabilizer link',
  hub: 'wheel hub assembly',
  sparkplug: 'spark plugs',
  airfilter: 'engine air filter',
  arm: 'control arm',
  cvboot: 'CV joint boot',
  cvjoint: 'CV joint axle',
  tierod: 'tie rod end',
  pump: 'coolant pump',
  belt: 'serpentine belt',
  coil: 'ignition coil',
  alternator: 'alternator',
  starter: 'starter motor',
  battery: 'car battery',
  headlight: 'xenon headlight',
  projector: 'headlight projector',
};
// Picked by hand: the search alone often returns unrelated photos
const FILE_OVERRIDES = {
  pads: 'Brake pad.jpg',
  foglight: 'Front fog lights of Ford Focus Mk I.jpg',
  mirror: 'Aussenspiegel McLaren 650S.JPG',
  stabilizer: 'Stabilisatorkoppelstange mit Kugelgelenken BWCM IMG 20160202 1602.jpg',
  hub: 'Wheel hub assembly.jpg',
  sparkplug: 'Zündkerzen 1.jpg',
  airfilter: 'Dirty-air-filter.jpg',
  arm: 'Track control arm for a Kia Ceed 01.jpg',
  cvboot: 'Achsmanschette.jpg',
  cvjoint: 'CV joint half axle.jpg',
  tierod: 'Tie rod end.jpeg',
  pump: 'Kuehlmittelpumpe Suzuki G10A.jpg',
  belt: 'Keilrippenriemen Servopumpe Spannrollen VW T4 IMG 20160922 135213.jpg',
  coil: 'Ignition coil.jpg',
  alternator: 'Automotive alternator. Terminals.jpg',
  starter: 'Automobile starter.JPG',
  battery: 'Lead-acid automotive battery, 55 Ah.jpg',
  headlight: '" 13 - ITALY - Alfa Romeo headlight assembly - projector black headlamp xenon - Giulietta 2013.jpg',
  projector: 'Headlight projector optics.jpg',
};

const OK_LICENSE = /^(cc[- ]by|cc[- ]by[- ]sa|cc0|public domain|pd)/i;

async function api(params) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', origin: '*', ...params });
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Commons ${r.status}`);
  return r.json();
}

async function pick(key) {
  const params = {
    action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '640',
    ...(FILE_OVERRIDES[key]
      ? { titles: `File:${FILE_OVERRIDES[key]}` }
      : { generator: 'search', gsrsearch: `${QUERIES[key]} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20' }),
  };
  const data = await api(params);
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/jpe?g/i.test(ii.mime) || ii.width < 500) continue;
    const m = ii.extmetadata || {};
    const license = (m.LicenseShortName?.value || '').trim();
    if (!OK_LICENSE.test(license)) continue;
    const author = (m.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons';
    return { title: p.title, thumb: ii.thumburl, page: ii.descriptionurl, license, author };
  }
  return null;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const credits = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : {};
for (const key of Object.keys(QUERIES)) {
  const file = path.join(OUT_DIR, `${key}.jpg`);
  if (!LIST_ONLY && fs.existsSync(file) && credits[key] && !FILE_OVERRIDES[key]) continue;
  try {
    const hit = await pick(key);
    if (!hit) { console.log(`- ${key}: nothing suitable`); continue; }
    console.log(`${key}: ${hit.title} (${hit.license}, ${hit.author})`);
    if (LIST_ONLY) continue;
    const img = await fetch(hit.thumb, { headers: { 'User-Agent': UA } });
    if (!img.ok) throw new Error(`image ${img.status}`);
    fs.writeFileSync(file, Buffer.from(await img.arrayBuffer()));
    credits[key] = { src: `/parts/demo/${key}.jpg`, author: hit.author.slice(0, 120), license: hit.license, url: hit.page };
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    console.log(`! ${key}: ${e.message}`);
  }
}
if (!LIST_ONLY) fs.writeFileSync(OUT_JSON, JSON.stringify(credits, null, 2) + '\n');
console.log('done');
