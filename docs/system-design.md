# System design

Pointage Carrière is a static web application. There is no server: the browser on the supervisor's phone is the whole system.

## Constraints that shaped it

| On site | Consequence in the build |
| --- | --- |
| No signal in the riverbed, patchy 4G at the plant | Everything needed to run is on the device after the first visit |
| Dust, gloves, sunlight | 56px touch targets, a high-contrast dark canvas, one tap per action |
| One phone, often a modest Android | A small static bundle, no background work, no account |
| Supervisors read Arabic, French or Tamazight | Five languages, right-to-left support, numbers always left to right |
| Payroll is prepared by an accountant on a PC | Excel is the hand-over format; nothing proprietary |
| The phone can be lost or reset | Backup to a file, and restore from it |

## Layers

```
src/app/            Next.js entry: layout, the single page, the web manifest
src/components/     Screens and dialogs. Render state, call the rules.
src/components/ui/  The design system components (Button, Dialog, Alert, ...)
src/lib/            The rules. Plain TypeScript, no React, no browser needed.
  types.ts          Posts, teams, pay types, statuses: the vocabulary
  db.ts             The Dexie database and the sample crew
  attendance.ts     What a tap does to a record
  summary.ts        Monthly totals and pay
  export.ts         The Excel workbook
  backup.ts         Backup file: create, validate, restore
  format.ts         Dates and numbers
  i18n/             One dictionary per language
src/sw.ts           The service worker
scripts/            Build, preview, icons, layout audit, screenshots
```

The split matters for trust. Everything that decides what is stored or what someone is paid lives in `src/lib/` as pure functions with unit tests. A component can be rewritten without touching a rule, and a rule can be checked without opening a browser.

## Data flow

1. A tap on a status button calls `setStatus(db, slot, status)`.
2. Inside one IndexedDB transaction, the current record for that employee, date and shift is read, `applyStatus` computes the next record (or `null` to clear it), and the result is written.
3. `useLiveQuery` observes the tables; the card and the summary strip re-render from the database. The screen never holds a copy of the data that could drift from what is stored.

A unique compound index on `[employeeId+date+shift]` makes a duplicate record impossible, even from a bug.

## Offline strategy

The application is exported with `output: "export"`: `next build` writes plain files to `out/`. After the build, `scripts/build-sw.mjs`:

1. walks `out/` and hashes every file,
2. bundles `src/sw.ts` (which uses [Serwist](https://serwist.pages.dev/)) with that list inlined,
3. writes `out/sw.js`.

On the first visit the service worker downloads and caches the entire export, about 1.7 MB: every script, the fonts for all five languages, and the spreadsheet library. From then on the application starts with no network at all, and nothing is fetched at runtime, so there are no runtime caching rules to get wrong.

Precaching everything, rather than an application shell, is deliberate. The export is small, and the costly failure is a supervisor discovering at month end, with no signal, that the Excel code was never downloaded.

Being offline is a normal state, not an error. The status bar turns from cyan to red and says so; nothing else changes.

## Updates

A new version installs in the background and then waits. It is not activated under a supervisor in the middle of a shift. A prompt appears ("New version available"); accepting it activates the new worker and reloads the page. Attendance data is in IndexedDB and is not affected by an update.

## Hosting

Any static host works. For a sub-folder (GitHub Pages serves this repository at `/quarry-pointage-lite`), set `NEXT_PUBLIC_BASE_PATH` at build time; it is applied to the routes, the manifest, the icons and the service worker scope. `.github/workflows/pages.yml` does this.

The service worker requires HTTPS (or `localhost`).

## Rendering

The page is prerendered at build time in French. The date, the language and the data all depend on the device, so the prerendered page shows only the status bar; the rest is rendered once the browser has taken over. This keeps the first paint immediate and avoids a mismatch between the prerendered and the live page.

## What is tested

- **Unit (Vitest, 68 tests):** attendance rules, storage constraints, monthly totals, pay for both pay types, Excel content read back from a real workbook, backup round trip and refusal of malformed files, dictionary parity across languages.
- **End to end (Playwright, 56 tests, phone and desktop):** the full attendance flow, employee management, each language with its direction and font, widths from 320 to 1920px in every language, Excel export read back and checked, backup and restore, a cold boot with the network cut, export with no network, and a check that no request leaves the origin.
