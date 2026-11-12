# Data model

All data is in one IndexedDB database on the device, `quarry-pointage-lite`, accessed through Dexie (`src/lib/db.ts`). Types are in `src/lib/types.ts`.

## Table `employees`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | number, auto-increment | Local identifier |
| `fullName` | string | |
| `cin` | string, optional | National identity card number, to match payroll |
| `post` | `Post` | One of the posts below |
| `postLabel` | string, optional | Free title, used when `post` is `autre` |
| `payType` | `"monthly"` or `"daily"` | How the employee is paid |
| `rate` | number | Monthly salary or daily wage in MAD, according to `payType` |
| `overtimeRate` | number | MAD per overtime hour. `0` means overtime is recorded but not paid |
| `active` | boolean | Inactive employees leave the attendance screen; their history is kept |

Indexes: `++id, post, payType, active`.

### Posts and teams

The list reflects the staff of a crushing and sand-washing site around Marrakech. Each post belongs to a team (used to filter the screen) and proposes the way that post is usually paid; the supervisor can change it per employee.

| Post key | Team | Usual pay |
| --- | --- | --- |
| `chef_concassage` | encadrement | monthly |
| `chef_materiel` | encadrement | monthly |
| `comptable` | encadrement | monthly |
| `electricien_operateur` | technique | monthly |
| `soudeur` | technique | monthly |
| `conducteur_chargeuse` | conducteurs | monthly |
| `conducteur_pelle` | conducteurs | monthly |
| `chauffeur_camion` | conducteurs | monthly |
| `ouvrier` | ouvriers | daily |
| `gardien` | gardiens | daily |
| `autre` | ouvriers | daily |

Sites differ. Many have no weighbridge agent, fuel attendant or storekeeper, and some give the operator's job to a general worker. Rather than a long list that fits nobody, anything else is `autre` with its own title in `postLabel`.

Keys are stored, never labels: a record entered in Arabic reads correctly in French, and in the export.

## Table `attendance`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | number, auto-increment | |
| `employeeId` | number | References `employees.id` |
| `date` | string | Local calendar day, `YYYY-MM-DD` |
| `shift` | `"jour"` or `"nuit"` | |
| `status` | `"present"`, `"half_day"`, `"late"`, `"absent"` | |
| `reason` | `"none"`, `"non_justifie"`, `"maladie"`, `"autorise"` | `"none"` unless absent |
| `overtimeHours` | integer, 0 to 12 | Always 0 when absent |
| `synced` | boolean | Reserved for a cloud edition; always `false` here |

Indexes: `++id, &[employeeId+date+shift], date, employeeId`. The compound index is unique: there is at most one record per employee, date and shift.

Dates are local calendar days, not UTC instants: a night shift recorded at 23:30 belongs to the day the supervisor sees on the screen.

## Pay rules

Implemented in `computePay` and `summariseMonth` (`src/lib/summary.ts`).

```
days worked   = present + late + 0.5 x half days

monthly staff:  base pay = monthly salary
daily staff:    base pay = days worked x daily wage

overtime pay  = overtime hours x the employee's overtime rate
estimated pay = base pay + overtime pay
```

- **Monthly** staff are under contract. The salary is due for the month even when some days are missed; absences are reported in the export, not deducted. Overtime is payable.
- **Daily** staff are paid for the days they worked. Their overtime is often not paid: it is only when an overtime rate above zero is entered for that employee.
- A deactivated employee who has records in the month still appears in that month's export. A deactivated employee with none does not.

The result is labelled *estimated*. It is gross pay before any deduction, advance or bonus. It is a preparation aid for the accountant, not a pay slip and not a CNSS declaration.

## Migrations

The schema is declared as `this.version(1).stores({...})`. To change it:

1. Add a new block, `this.version(2).stores({...}).upgrade(tx => ...)`, below the existing one. Never edit a published version.
2. Bump `BACKUP_VERSION` in `src/lib/backup.ts` if the shape of stored objects changed, and make `parseBackup` accept and convert the previous version.
3. Add a unit test that opens a version 1 database and reads it after the upgrade.

Devices in the field upgrade in place the next time the application opens.

## Backup file

`createBackup` writes one JSON file:

```json
{
  "app": "quarry-pointage-lite",
  "version": 1,
  "exportedAt": "2026-11-12T08:30:00.000Z",
  "employees": [{ "id": 1, "fullName": "…", "post": "ouvrier", "payType": "daily", "rate": 100, "overtimeRate": 0, "active": true }],
  "attendance": [{ "employeeId": 1, "date": "2026-11-12", "shift": "jour", "status": "present", "reason": "none", "overtimeHours": 0 }]
}
```

`parseBackup` checks every field of every row before anything is replaced: known posts, pay types, statuses and reasons, real calendar dates, non-negative amounts, no duplicate employee and no duplicate record, and every record pointing at an employee in the file. A file that fails any check is refused and the database is left untouched. Restoring replaces the whole database in one transaction, after an explicit confirmation.

The backup contains names, identity numbers and wages. It is the user's responsibility to store the file somewhere appropriate.
