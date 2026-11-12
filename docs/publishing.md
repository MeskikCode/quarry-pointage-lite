# Publishing checklist

The steps to put this repository online under the MeskikCode organisation, in order. Everything that could be prepared without a GitHub account is done: the code, the tests, the workflows, the documentation, the `v1.0.0` tag and the `origin` remote.

## 1. Before publishing

- [ ] **Tamazight.** `src/lib/i18n/zgh.ts` and `README.zgh.md` are drafts, marked as such in the files and the README. Either have a native reader check them, or publish with the draft notice in place.
- [ ] Run the checks once more on your machine:

```bash
npm ci
npm run check
npm run test:e2e
```

## 2. Create the repository

On github.com, in the **MeskikCode** organisation: **New repository**.

- Name: `quarry-pointage-lite`
- Visibility: **Public**
- Leave **all** the "Initialize this repository" options unticked (no README, no .gitignore, no licence): they are already here.

## 3. Push

The remote is already set (`git remote -v` shows `origin`). From the project folder:

```bash
git push -u origin main
```

```bash
git push origin v1.0.0
```

## 4. Repository settings

**Settings, Pages**
- Build and deployment, Source: **GitHub Actions**.
- Then open the **Actions** tab and re-run "Deploy to GitHub Pages" if it ran before Pages was enabled. The demo is served at https://meskikcode.github.io/quarry-pointage-lite/.

**About** (the gear next to "About" on the repository's main page)
- Description: `Offline-first attendance PWA for crushing and sand-washing sites. One tap per employee, monthly Excel export, five languages.`
- Website: `https://meskikcode.github.io/quarry-pointage-lite/`
- Topics: `pwa` `offline-first` `nextjs` `typescript` `indexeddb` `dexie` `attendance` `payroll` `excel` `morocco` `tamazight` `arabic` `rtl` `accessibility`

**Settings, General**
- Social preview: upload `docs/social-preview.png`.
- Features: keep Issues on; Wiki and Projects can be turned off.

**Settings, Advanced Security** (or "Code security")
- Turn on **Private vulnerability reporting**, **Dependabot alerts** and **Dependabot security updates**. Dependabot version updates are already configured in `.github/dependabot.yml`.

**Settings, Rules, Rulesets**: new branch ruleset for `main`
- Require a pull request before merging.
- Require status checks to pass: **Lint, types, unit tests, build** and **End-to-end tests** (they appear in the list after the first CI run).
- Block force pushes.

## 5. Release

**Releases, Draft a new release**: choose the tag `v1.0.0`, title `Pointage Carrière 1.0.0`, and paste the 1.0.0 section of `CHANGELOG.md` as the notes.

## 6. After publishing

- [ ] The **Actions** tab shows CI and the Pages deployment green on `main`.
- [ ] Open the demo on an Android phone, install it, switch on airplane mode, and use it: the one test that has not been done yet.
- [ ] Update the MeskikCode organisation's description to the one-liner, and add the organisation to `sameAs` on meskikcode.com now that it has a public repository.

## Regenerating the images

After a visible change, from the project folder, with the production build served (`npm run build`, then `npm run preview` in another terminal):

```bash
npm run screenshots
```

```bash
npm run social-preview
```
