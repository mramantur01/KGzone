// npm run i18n:apply
// Moves filled-in translations from scripts/i18n/missing.json into src/i18n/locales/{kg,en}.json.
// Entries with an empty translation stay in missing.json for later.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.resolve(here, '../../src/i18n/locales');
const missingFile = path.join(here, 'missing.json');

if (!fs.existsSync(missingFile)) {
  console.log('Nothing to apply: run npm run i18n:check first.');
  process.exit(0);
}

const load = (lang) => JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8'));
const dicts = { kg: load('kg'), en: load('en') };
const missing = JSON.parse(fs.readFileSync(missingFile, 'utf8'));
const slots = (s) => (s.match(/\{\}/g) || []).length;

const left = {};
const errors = [];
let applied = 0;
for (const [ru, [kgText = '', enText = ''] = []] of Object.entries(missing)) {
  const pending = ['', ''];
  for (const [i, lang, text] of [[0, 'kg', kgText], [1, 'en', enText]]) {
    const t = (text || '').trim();
    if (!t) continue;
    if (slots(t) !== slots(ru)) {
      errors.push(`${lang}: "${ru}" -> "${t}" (expected ${slots(ru)} {} placeholders)`);
      pending[i] = t;
      continue;
    }
    if (dicts[lang][ru] !== t) applied++;
    dicts[lang][ru] = t;
  }
  const stillKg = !(ru in dicts.kg), stillEn = !(ru in dicts.en);
  if (stillKg || stillEn || pending[0] || pending[1]) {
    left[ru] = [pending[0] || (stillKg ? '' : dicts.kg[ru]), pending[1] || (stillEn ? '' : dicts.en[ru])];
  }
}

for (const lang of ['kg', 'en']) {
  fs.writeFileSync(path.join(localesDir, `${lang}.json`), JSON.stringify(dicts[lang], null, 1) + '\n');
}
if (Object.keys(left).length) fs.writeFileSync(missingFile, JSON.stringify(left, null, 2) + '\n');
else fs.unlinkSync(missingFile);

console.log(`Applied ${applied} translations. Still missing: ${Object.keys(left).length}.`);
if (errors.length) {
  console.log('\nNot applied (placeholder count mismatch):\n' + errors.join('\n'));
  process.exitCode = 1;
}
