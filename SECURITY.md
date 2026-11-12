# Security

## What this application handles

Pointage Carrière stores names, national identity numbers and wages. All of it stays in the browser's IndexedDB on the device. There is no server, no account and no network request to any third party. Data leaves the device only in the Excel and backup files the user chooses to export.

This means the security of the data is the security of the device and of the exported files:

- Protect the phone with a screen lock.
- Treat exported files as confidential payroll documents.
- Anyone with the unlocked device can read and change the data; the application has no login.

## Supported versions

The latest release on the `main` branch.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Write to **abdelmalek@meskik.com** with:

- what you found and where,
- how to reproduce it,
- the version or commit.

You will receive an answer within three working days. Once a fix is released, the report is credited in the changelog unless you prefer otherwise.

## Dependencies

Dependencies are pinned to exact versions, and `npm audit` reports no known vulnerability at release. The spreadsheet library is installed from its publisher's own distribution (`cdn.sheetjs.com`), as the copy on the npm registry is no longer updated.
