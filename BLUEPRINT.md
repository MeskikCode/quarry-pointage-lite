# Blueprint: Pointage Carrière

**Organisation:** MeskikCode
**Target environment:** river crushing and sand-washing sites (*concassage rivière et sable lavé*)
**Shape:** offline-first Progressive Web App (Next.js, Dexie, Serwist)
**Repository goal:** a public, open-source product showing real-world Moroccan industrial software development.

This is the specification the project started from, kept for the record and updated where the build departed from it. Departures are marked **As built**.

---

## 1. Summary and field constraints

Crushing sites are hard on software:

- **No or intermittent connectivity.** Riverbeds and crushing plants often have no 4G or Wi-Fi.
- **Dust and protective gear.** Supervisors wear gloves; fingerprint readers fail and typing is impractical.
- **A multilingual workforce.** Supervisors and team leads work in Arabic, French and Tamazight.
- **Spreadsheet replacement.** Paper logs and hand-kept Excel sheets give way to a one-tap offline screen and an instant `.xlsx` for payroll.

**As built:** five languages (Tamazight, Arabic, French, English, Spanish) instead of French and Arabic.

## 2. Stack

- **Framework:** Next.js (App Router, TypeScript), exported as static files
- **Styling:** Tailwind CSS over the MeskikCode design system tokens: high contrast, large touch targets
- **Offline database:** Dexie (IndexedDB) with `dexie-react-hooks`
- **Service worker:** Serwist, precaching the whole application for offline cold boots
- **Export:** a spreadsheet library for the monthly Excel file
- **Icons:** `lucide-react`

**As built:** the export uses `write-excel-file` rather than SheetJS, whose free edition cannot style cells or freeze rows; the accountant's file needed both. The service worker is bundled by a small build script (`scripts/build-sw.mjs`) using the Serwist runtime, rather than through the `@serwist/next` plugin. A static export has no server for the plugin to hook into, and the script writes the precache list from the files actually produced.

## 3. Structure

```text
quarry-pointage-lite/
├── public/                    icons and the brand mark
├── scripts/                   service worker build, preview server, icons, audits
├── src/
│   ├── app/                   layout, page, web manifest, global styles
│   ├── components/            attendance screen, cards, dialogs, design system components
│   ├── lib/                   rules: database, attendance, pay, export, backup, languages
│   ├── styles/                design tokens and fonts
│   └── sw.ts                  service worker
├── tests/                     unit and end-to-end tests
├── docs/                      system design, data model, design system, translations
└── README.md                  in five languages
```

## 4. Data

### Employees

The original blueprint assigned each worker to a fixed zone (crusher, washed sand, machinery, weighbridge) with a single daily rate.

**As built:** that did not match how sites around Marrakech are staffed and paid. Zones were replaced by **posts** grouped in **teams**, and the single rate by two **pay types**:

- *Monthly* staff (chef concassage, chef matériel, accountant, electrician-operator, welder, drivers) are under contract. The salary is due for the month even when some days are missed, and overtime is payable.
- *Daily* staff (workers, guards) are paid for the days they work. Overtime is paid only when a rate is set.
- Posts that only some sites have (fuel attendant, weighbridge agent, storekeeper) are entered as "other" with their own title.

| Field | Description |
| --- | --- |
| `id` | Local identifier |
| `fullName` | |
| `cin` | National identity card number, optional |
| `post`, `postLabel` | The post, and a free title when it is "other" |
| `payType` | `monthly` or `daily` |
| `rate` | Monthly salary or daily wage in MAD |
| `overtimeRate` | MAD per overtime hour; 0 means recorded but not paid |
| `active` | |

### Attendance

| Field | Description |
| --- | --- |
| `employeeId`, `date`, `shift` | One record per employee, date and shift (day or night) |
| `status` | `present`, `half_day`, `late`, `absent` |
| `reason` | `none`, `non_justifie`, `maladie`, `autorise` |
| `overtimeHours` | 0 to 12 |
| `synced` | Reserved for a cloud edition |

Full detail: [docs/data-model.md](docs/data-model.md).

## 5. Workflows

1. **Cold boot offline.** The supervisor opens the installed application with no signal; the service worker serves it from the device.
2. **Filter by team.** Management, technical, drivers, workers, guards.
3. **One-tap attendance.** Present, half day or late are logged at once. Absent reveals three reasons: unjustified, sick, authorised.
4. **Overtime.** A stepper, one hour at a time.
5. **Excel export.** At month end, one file with a summary per employee, the detail of every record, and every advance.

**As built, added:** a month summary in the application; advances (*avances*) per employee, deducted from what is left to pay; and backup and restore of the whole database to a file, since the device holds the only copy.

## 6. Milestones

1. Offline core: database, attendance screen, Excel export.
2. PWA: manifest, icons, service worker, cold boot offline.
3. Languages and employee management.
4. Tests, documentation, release.

## 7. Quick start

```bash
npm install
npm run dev
```

See the [README](README.md).

## 8. Private client extensions

This repository is the open edition. Client deployments by MeskikCode extend the same base with:

- **Background sync** to a central database when connectivity returns.
- **Weighbridge integration**, linking shifts to weighing tickets (*bons de pesée*) and tonnage.
- **Payroll**: Moroccan social security and tax deductions, loans repaid over several months, printable pay slips (*bulletins de paie*).
