// Runs a SPARQL query against Wikidata. Usage: node wd.mjs <file.rq> [out.json]
import fs from 'node:fs';
const [qf, out] = process.argv.slice(2);
const query = fs.readFileSync(qf, 'utf8').replace(/^﻿/, '');
const res = await fetch('https://query.wikidata.org/sparql', {
  method: 'POST',
  headers: {
    'User-Agent': 'KGzone-catalog-builder/1.0 (car marketplace model list; contact via site owner)',
    Accept: 'application/sparql-results+json',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ query }),
});
const text = await res.text();
if (!res.ok) { console.error(res.status, text.slice(0, 500)); process.exit(1); }
const data = JSON.parse(text);
const rows = data.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
if (out) fs.writeFileSync(out, JSON.stringify(rows));
console.log('rows:', rows.length);
console.log(JSON.stringify(rows.slice(0, 5), null, 1));
