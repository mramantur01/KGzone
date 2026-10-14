// npm run i18n:check
// Finds Russian strings in the code that have no Kyrgyz or English translation yet and writes
// them to scripts/i18n/missing.json as { "русский текст": ["кыргызча", "English"] } to fill in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractStrings } from './extract.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const localesDir = path.join(root, 'src/i18n/locales');
const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);

const kg = readJson(path.join(localesDir, 'kg.json'), {});
const en = readJson(path.join(localesDir, 'en.json'), {});
const ignore = new Set(readJson(path.join(here, 'ignore.json'), []));
const missingFile = path.join(here, 'missing.json');
const previous = readJson(missingFile, {});

// Same number handling as the runtime: "18 400 км" is covered by the "{} км" key
const NUMBER = /\d+(?:[  .,]\d+)*/g;
const has = (dict, k) => k in dict || (/\d/.test(k) && k.replace(NUMBER, '{}') in dict);

const strings = extractStrings(root);
const missing = {};
const byFile = {};
for (const [k, files] of strings) {
  if (ignore.has(k)) continue;
  const needKg = !has(kg, k), needEn = !has(en, k);
  if (!needKg && !needEn) continue;
  // Keep anything already typed into missing.json, prefill the language that exists
  const [prevKg = '', prevEn = ''] = previous[k] || [];
  missing[k] = [needKg ? prevKg : kg[k], needEn ? prevEn : en[k]];
  files.forEach((f) => (byFile[f] = (byFile[f] || 0) + 1));
}

const count = Object.keys(missing).length;
if (count === 0) {
  if (fs.existsSync(missingFile)) fs.unlinkSync(missingFile);
  console.log(`✓ All ${strings.size} strings are translated into KG and EN.`);
} else {
  fs.writeFileSync(missingFile, JSON.stringify(missing, null, 2) + '\n');
  console.log(`✗ ${count} strings need translation (out of ${strings.size}):`);
  for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) console.log(`   ${n}\t${f}`);
  console.log('\nFill in scripts/i18n/missing.json as "русский": ["кыргызча", "English"], then run: npm run i18n:apply');
  console.log('Keep every {} placeholder. Strings that must stay as-is can go into scripts/i18n/ignore.json.');
  process.exitCode = 1;
}
