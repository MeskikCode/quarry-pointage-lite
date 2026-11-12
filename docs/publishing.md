# Publishing checklist

One-time steps to put this repository online under the MeskikCode organisation. Nothing here has been done yet: the repository exists only on the machine it was built on.

## Before publishing

- [ ] **Tamazight review.** `src/lib/i18n/zgh.ts` and `README.zgh.md` are drafts. Have a native reader check them, or publish with the draft notice left in place (it is, by default).
- [ ] Run `npm run check`, then `npm run test:e2e`. Both must pass.
- [ ] Read the five READMEs once as a visitor would.

## Create the repository

1. On GitHub, in the **MeskikCode** organisation, create a public repository named `quarry-pointage-lite`. Do not add a README, a licence or a `.gitignore`: they are already here.
2. Push:

```bash
git remote add origin https://github.com/MeskikCode/quarry-pointage-lite.git
git push -u origin main
git push origin v1.0.0
```

## Turn on the live demo

1. Repository **Settings**, then **Pages**. Under *Build and deployment*, set **Source** to **GitHub Actions**.
2. The "Deploy to GitHub Pages" workflow runs on the next push to `main` (or run it by hand from the Actions tab).
3. The demo is served at `https://meskikcode.github.io/quarry-pointage-lite/`. Open it on a phone and install it.

## Present the repository

- **Description:** Offline-first attendance PWA for crushing and sand-washing sites. One tap per employee, monthly Excel export, five languages.
- **Website:** the demo URL above.
- **Topics:** `pwa`, `offline-first`, `nextjs`, `typescript`, `indexeddb`, `dexie`, `attendance`, `payroll`, `morocco`, `tamazight`, `arabic`, `rtl`.
- **Social preview:** Settings, General, Social preview. Use `docs/screenshots/desktop-fr.png` or a 1280x640 image made from it.
- Create a **release** from the tag `v1.0.0`, with the 1.0.0 section of `CHANGELOG.md` as its notes.

## After publishing

- Update the organisation description to the MeskikCode one-liner, and add the organisation to `sameAs` on meskikcode.com once this repository is public.
- Check the Actions tab: the CI workflow should be green on `main`.
