# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## 1.0.0 — 12/11/2026

First public release.

### Added

- One-tap attendance per employee, date and shift (day or night): present, half day, late, absent with a reason (unjustified, sick, authorised). A second tap clears the record.
- Overtime hours per record, from 0 to 12.
- Staff model of a crushing and sand-washing site: eleven posts in five teams, with a free title for any other post.
- Two pay types. Monthly: the salary is due for the month and overtime is payable. Daily: paid per day worked, overtime paid only when an hourly rate is set.
- Employee management on the device: add, edit, deactivate and reactivate, with history kept.
- Monthly Excel export: a summary sheet with pay computed by pay type, and a detail sheet.
- Backup of the whole database to a file, and restore with full validation of the file.
- Installable PWA that precaches the whole application and cold-boots with no network. Update prompt when a new version is ready.
- Five languages: Tamazight (Tifinagh), Arabic (right to left), French, English, Spanish. The Tamazight strings are a draft awaiting review by a native reader.
- Mobile-first layout, checked from 320 to 1920px in every language.
- MeskikCode design system (MUBCS) in its field theme, with self-hosted fonts.
- 68 unit tests and 56 end-to-end tests; continuous integration and GitHub Pages deployment workflows.

### Changed from the original blueprint

- Fixed work zones (crusher, washed sand, machinery, weighbridge) were replaced by posts and teams, because sites are not staffed alike and many have no weighbridge or fuel post.
- A single daily rate was replaced by monthly and daily pay types with a per-employee overtime rate.
- Tamazight, English and Spanish were added to French and Arabic.
- Backup and restore were added.
