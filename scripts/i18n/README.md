# Translations (RU → KG / EN)

The site is written in Russian. `src/i18n/domTranslator.ts` swaps the rendered Russian text for
Kyrgyz or English using `src/i18n/locales/kg.json` and `en.json` (keys are the Russian text).

## After adding or changing Russian text

```bash
npm run i18n:check
```

Lists every string without a translation and writes them to `scripts/i18n/missing.json`:

```json
{
  "Новая кнопка": ["", ""],
  "Осталось {} мест": ["", ""]
}
```

Fill in `["кыргызча", "English"]` for each entry, then:

```bash
npm run i18n:apply
```

Rules:

- Keep every `{}` — it stands for a `${...}` value from the code (numbers, names). The order can change.
- Numbers are matched automatically: `"18 400 км"` uses the `"{} км"` entry.
- If Kyrgyz is the same as Russian (names, «Бишкек», «Модель»), copy the Russian text.
- Strings that must never be translated (URLs, file export contents) go into `ignore.json`.
- To keep user content untranslated, add `data-no-i18n` to its element.
