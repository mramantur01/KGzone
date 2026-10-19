# Car catalog (brands → models → generations)

`src/data/carCatalog.json` is generated from Wikidata (CC0 license) plus the curated lists in
`src/data/mockData.ts` (`BRAND_MODELS`, which keep their spelling and go first). To refresh it:

```bash
npm run catalog:update
```

The build step maps Wikidata brands to the site's `ALL_CAR_BRANDS` (see `ALIAS` in
`build-catalog.mjs`), drops concept/racing cars, gearboxes and pre-1960 models, merges Cyrillic and
Latin spellings ("Гранта" = "Granta"), and adds hand-written models for brands Wikidata barely
covers (`SUPPLEMENT`). Check the printed list of brands without models after each run.
