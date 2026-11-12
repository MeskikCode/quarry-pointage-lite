# Translations

The application speaks five languages, always listed in this order: Tamazight, Arabic, French, English, Spanish.

| Code | Language | Script and direction | Status |
| --- | --- | --- | --- |
| `zgh` | Standard Moroccan Tamazight | Tifinagh, left to right | **Draft, awaiting review by a native reader** |
| `ar` | Arabic | Arabic, right to left | Written by MeskikCode |
| `fr` | French | Latin | Written by MeskikCode. Reference language |
| `en` | English | Latin | Written by MeskikCode. British spelling |
| `es` | Spanish | Latin | Written by MeskikCode |

## Where the strings are

One file per language in `src/lib/i18n/`. `fr.ts` is the reference: its shape defines the `Dictionary` type, so a missing or extra key in another language fails the type check, and a unit test compares every language against it.

Data is never translated in storage. Posts, statuses and reasons are stored as stable keys (`chef_concassage`, `half_day`, `maladie`) and translated when shown or exported.

## Reviewing Tamazight

`src/lib/i18n/zgh.ts` was drafted without a native reader. Vocabulary for quarry equipment and payroll is not fully standardised in Tifinagh, and several terms are best-effort choices or adapted loanwords, for example the posts (`ⴰⵙⵓⴷⵓⵔ`, `ⴰⵎⵏⴷⴰⵀ ⵏ ⵜⵛⴰⵔⵊⵓⵣⵜ`), the pay types and the button labels.

If you read Tamazight, a review is the most valuable contribution this project can receive:

1. Open the application, choose ⵜⴰⵎⴰⵣⵉⵖⵜ, and use it for a few minutes.
2. Note anything wrong, awkward or unclear, with the wording you would use.
3. Open an issue with the "Translation" template, or edit `zgh.ts` and open a pull request.

Prefer words a site chief in the Haouz or the Souss would actually say over literal translations. Where a French or Arabic loanword is what people use on site, use it.

## Writing rules

- **Tone:** short and practical. Field screens use bare imperatives.
- **French:** a no-break space (` `) before `: ; ! ? %`.
- **English:** British spelling, no contractions.
- **Arabic:** written natively, not translated word for word; no letter-spacing. In running text the brand is written مسكيكُّود.
- **Numbers and dates:** Latin digits, dates as `DD/MM/YYYY`, in every language.
- **Never** use protected professional titles: the words, in any language, for the regulated professions that design machines and buildings. Nor regulated claims such as "certified", "licensed" or "accredited". Write developer, development, system design. A unit test enforces this in the dictionaries.
- No emoji.
- Keep button labels short. Run `npm run audit:layout` after changing them: it reports any label that no longer fits at 320px.

## Adding a language

1. Copy `fr.ts` to `<code>.ts` and translate the values.
2. Add the language to `LANGUAGES` and `dictionaries` in `src/lib/i18n/index.ts`, with its direction.
3. If the script is new, add a self-hosted font in `src/styles/fonts.css`, a `:root[lang="<code>"]` block in `src/app/globals.css`, and note it in `docs/design-system.md`.
4. Add the language to the list in `tests/e2e/languages.spec.ts` and in `scripts/audit-layout.mjs`.
5. Run `npm run check`, `npm run test:e2e` and `npm run audit:layout`.
