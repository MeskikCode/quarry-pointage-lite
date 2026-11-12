# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## 1.0.0 — 12/11/2026

First public release.

### Added

- One-tap attendance per employee, date and shift (day or night): present, half day, late, absent with a reason (unjustified, sick, authorised), in one row of four large buttons. A second tap clears the record.
- "Everyone present": one button marks every unmarked employee present, for the whole crew or the filtered team. It never overwrites an employee already marked, and it can be undone; the undo keeps any record corrected since.
- Month summary in the application: days worked, absences, overtime and pay due per employee, and the total for the month, with month navigation.
- Overtime hours per record, from 0 to 12, with a "+1 h" button that opens a stepper once there is overtime, so that a marked card stays short.
- Staff model of a crushing and sand-washing site: eleven posts in five teams, with a free title for any other post.
- Two pay types. Monthly: the salary is due for the month and overtime is payable. Daily: paid per day worked, overtime paid only when an hourly rate is set.
- Employee management on the device: add, edit, deactivate and reactivate, with history kept. An employee with nothing on record can be deleted; anyone else can only be deactivated.
- Advances (avances): entered per employee with a date and a note, listed and deletable (with confirmation), and deducted from what is left to pay in the month summary. A negative balance shows in red.
- Monthly Excel export in three sheets (summary with pay, advances and balance; attendance detail; advances), formatted for the accountant: title, frozen and styled header, real numbers and dates, totals row, landscape printing, right to left in Arabic.
- Backup of the whole database to a file, and restore with full validation of the file. Backup files written by earlier formats (before advances, before settings) are still accepted.
- A reminder to back up when the last backup is a week old, or three days after first use on a device never backed up.
- A month calendar per employee: each day's day and night shift in colour, with the month's totals.
- Settings: the site's name (shown in the header and on every Excel sheet), installing the application from inside it, and erasing all data to start from an empty list.
- Accessibility: every screen and dialog passes an automated WCAG 2.1 AA audit (axe-core) in French and Arabic; the spoken name of every button includes its visible text; keyboard use and focus are tested.
- Installable PWA that precaches the whole application and cold-boots with no network. Update prompt when a new version is ready.
- Five languages: Tamazight (Tifinagh), Arabic (right to left), French, English, Spanish. The Tamazight strings are a draft awaiting review by a native reader.
- Mobile-first layout, checked from 320 to 1920px in every language.
- MeskikCode design system (MUBCS) in its field theme, with self-hosted fonts.
- Faster first screen on a modest phone: the whole screen is prerendered, the language is applied before the first paint, data arrives in one render, and a tap redraws only the card it changes. Measured Lighthouse mobile performance, median of three runs: 89 (French), 90 (Arabic), 68 (English).
- 164 unit tests and 96 end-to-end tests; continuous integration and GitHub Pages deployment workflows.

### Changed from the original blueprint

- Fixed work zones (crusher, washed sand, machinery, weighbridge) were replaced by posts and teams, because sites are not staffed alike and many have no weighbridge or fuel post.
- A single daily rate was replaced by monthly and daily pay types with a per-employee overtime rate.
- Tamazight, English and Spanish were added to French and Arabic.
- Backup and restore were added.
