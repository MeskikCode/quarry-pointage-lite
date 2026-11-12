# Contributing

Thank you for looking at this project. Contributions are welcome, and the most useful ones right now are:

1. **A review of the Tamazight translation** by a native reader. See [docs/translations.md](docs/translations.md).
2. **Reports from real sites**: a post that is missing, a pay rule that works differently where you are, a screen that is hard to use with gloves.
3. Bug fixes, with a test that fails before the fix.

Larger features (sync, payroll deductions, weighbridge links) are outside the scope of this open edition. Please open an issue to discuss before starting work on anything substantial.

## Setting up

Node.js 22.12 or later.

```bash
npm install
npm run dev            # http://localhost:3000
```

Before opening a pull request:

```bash
npm run check          # lint, type check, unit tests, production build
npx playwright install chromium   # once
npm run test:e2e       # end-to-end tests against the build
```

If you changed anything visible, also run `npm run preview` in one terminal and `npm run audit:layout` in another. It opens the application at twelve widths in all five languages and names any label that clips.

## How the code is organised

Read [docs/system-design.md](docs/system-design.md) first. In short:

- Rules go in `src/lib/` as plain functions, with unit tests in `tests/unit/`. Anything that decides what is stored or what someone is paid belongs there, not in a component.
- Components render state and call the rules.
- Every user-visible string goes through the dictionaries in `src/lib/i18n/`, in all five languages. If you cannot write one of them, say so in the pull request and leave the French text in its place; do not use machine translation without saying so.
- Colours, sizes and fonts come from the design tokens. Do not add raw values to a component. See [docs/design-system.md](docs/design-system.md).
- Use logical properties (`start`, `end`, `ps-`, `me-`), never `left` or `right`: the layout must mirror in Arabic.
- Touch targets are at least 44px, and 56px for anything tapped during a shift.
- A change to the database schema needs a new Dexie version and a migration. See [docs/data-model.md](docs/data-model.md).

## Writing rules

These apply to the interface, the documentation, code comments and commit messages.

- Plain, factual wording. No hype.
- No emoji.
- Do not use protected professional titles or regulated claims. MeskikCode's brand rules forbid, in every language, the words for the regulated professions that design machines and buildings, and claims such as "certified" or "licensed". Write *developer*, *software development*, *system design*. A unit test checks the dictionaries.
- British spelling in English. In French, a no-break space before `: ; ! ? %`.
- Sample data must be fictional. Never commit real names, identity numbers or wages.

## Commits and pull requests

- Commit subjects are a short sentence in sentence case, describing the change ("Pay overtime to daily staff when a rate is set"). No prefix convention.
- One concern per pull request. Describe what changed and how you checked it.
- Add a line to `CHANGELOG.md` under an "Unreleased" heading.

## Licence

By contributing you agree that your contribution is released under the [MIT Licence](LICENSE) of this project.
