import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { addAdvance } from "@/lib/advances";
import { setStatus } from "@/lib/attendance";
import { BACKUP_APP, BACKUP_VERSION, BackupError, createBackup, parseBackup, restoreBackup } from "@/lib/backup";
import { backupReminder, daysBetween, FIRST_REMINDER_AFTER_DAYS, REMIND_AFTER_DAYS } from "@/lib/backupReminder";
import { PointageDB, SEED_EMPLOYEES } from "@/lib/db";
import { deleteEmployee, eraseAllData, historyOf } from "@/lib/employees";
import { cleanSiteName, MAX_SITE_NAME, readSiteName, writeSiteName } from "@/lib/settings";

const fresh = async () => {
  const db = new PointageDB(`site-${Math.random()}`);
  await db.open();
  return db;
};

describe("the site's name", () => {
  it("is cleaned of extra spaces and cut to its maximum length", () => {
    expect(cleanSiteName("  Carrière   Oued  Tensift ")).toBe("Carrière Oued Tensift");
    expect(cleanSiteName("x".repeat(100))).toHaveLength(MAX_SITE_NAME);
    expect(cleanSiteName("   ")).toBe("");
  });

  it("is stored, read back, and removed when emptied", async () => {
    const db = await fresh();
    expect(await readSiteName(db)).toBe("");
    await writeSiteName(db, " مقلع واد تانسيفت ");
    expect(await readSiteName(db)).toBe("مقلع واد تانسيفت");
    await writeSiteName(db, "  ");
    expect(await readSiteName(db)).toBe("");
    expect(await db.settings.count()).toBe(0);
  });
});

describe("deleting an employee", () => {
  let db: PointageDB;
  beforeEach(async () => {
    db = await fresh();
  });

  it("deletes an employee with nothing on record", async () => {
    expect(await historyOf(db, 1)).toEqual({ records: 0, advances: 0 });
    expect(await deleteEmployee(db, 1)).toBe(true);
    expect(await db.employees.get(1)).toBeUndefined();
  });

  it("keeps an employee who has attendance", async () => {
    await setStatus(db, { employeeId: 1, date: "2026-11-12", shift: "jour" }, "present");
    expect(await deleteEmployee(db, 1)).toBe(false);
    expect(await db.employees.get(1)).toBeDefined();
  });

  it("keeps an employee who has an advance", async () => {
    await addAdvance(db, { employeeId: 2, date: "2026-11-12", amount: 100 });
    expect(await historyOf(db, 2)).toEqual({ records: 0, advances: 1 });
    expect(await deleteEmployee(db, 2)).toBe(false);
    expect(await db.employees.get(2)).toBeDefined();
  });
});

describe("erasing all data", () => {
  it("empties every table and does not bring the sample crew back", async () => {
    const name = `erase-${Math.random()}`;
    const db = new PointageDB(name);
    await db.open();
    expect(await db.employees.count()).toBe(SEED_EMPLOYEES.length);
    await setStatus(db, { employeeId: 1, date: "2026-11-12", shift: "jour" }, "present");
    await addAdvance(db, { employeeId: 1, date: "2026-11-12", amount: 100 });
    await writeSiteName(db, "Carrière");

    await eraseAllData(db);
    for (const table of [db.employees, db.attendance, db.advances, db.settings]) {
      expect(await table.count()).toBe(0);
    }

    // Reopened, as on the next launch: still empty.
    db.close();
    const again = new PointageDB(name);
    await again.open();
    expect(await again.employees.count()).toBe(0);
    again.close();
  });
});

describe("the backup reminder", () => {
  const today = "2026-11-12";

  it("counts whole days, across months and years", () => {
    expect(daysBetween("2026-11-12", "2026-11-12")).toBe(0);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2025-12-25", "2026-01-01")).toBe(7);
    // The day clocks change in Morocco must not shift the count.
    expect(daysBetween("2026-03-01", "2026-04-30")).toBe(60);
  });

  it("stays quiet when there is nothing to protect", () => {
    expect(backupReminder({ lastBackup: null, oldestRecord: null, today })).toEqual({ due: false });
    expect(backupReminder({ lastBackup: "2020-01-01", oldestRecord: null, today })).toEqual({ due: false });
  });

  it("lets a new device be used for a few days before asking", () => {
    expect(backupReminder({ lastBackup: null, oldestRecord: today, today })).toEqual({ due: false });
    expect(backupReminder({ lastBackup: null, oldestRecord: "2026-11-10", today })).toEqual({ due: false });
    expect(FIRST_REMINDER_AFTER_DAYS).toBe(3);
    expect(backupReminder({ lastBackup: null, oldestRecord: "2026-11-09", today })).toEqual({
      due: true,
      daysSinceBackup: null,
    });
  });

  it("asks again once the last backup is a week old", () => {
    expect(REMIND_AFTER_DAYS).toBe(7);
    expect(backupReminder({ lastBackup: "2026-11-06", oldestRecord: "2026-10-01", today })).toEqual({ due: false });
    expect(backupReminder({ lastBackup: "2026-11-05", oldestRecord: "2026-10-01", today })).toEqual({
      due: true,
      daysSinceBackup: 7,
    });
  });
});

describe("upgrading a device from version 2 of the database", () => {
  it("keeps attendance and advances, and adds an empty settings table", async () => {
    const name = `upgrade2-${Math.random()}`;
    const old = new Dexie(name);
    old.version(1).stores({
      employees: "++id, post, payType, active",
      attendance: "++id, &[employeeId+date+shift], date, employeeId",
    });
    old.version(2).stores({ advances: "++id, employeeId, date" });
    await old.table("employees").add({
      fullName: "Omar Idrissi",
      post: "chef_materiel",
      payType: "monthly",
      rate: 5500,
      overtimeRate: 30,
      active: true,
    });
    await old.table("advances").add({ employeeId: 1, date: "2026-11-05", amount: 400 });
    old.close();

    const db = new PointageDB(name);
    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.employees.count()).toBe(1);
    expect(await db.advances.count()).toBe(1);
    expect(await db.settings.count()).toBe(0);
    await writeSiteName(db, "Carrière");
    expect(await readSiteName(db)).toBe("Carrière");
    db.close();
  });
});

describe("backup format 3", () => {
  const file = (extra: Record<string, unknown> = {}) => ({
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: "2026-11-12T10:00:00.000Z",
    employees: [{ id: 1, fullName: "A", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true }],
    attendance: [],
    advances: [],
    settings: { siteName: "Carrière Oued Tensift" },
    ...extra,
  });

  it("is the current version", () => {
    expect(BACKUP_VERSION).toBe(3);
  });

  it("carries the site's name through a backup and a restore", async () => {
    const source = await fresh();
    await writeSiteName(source, "Carrière Oued Tensift");
    const backup = parseBackup(JSON.stringify(await createBackup(source)));
    expect(backup.settings).toEqual({ siteName: "Carrière Oued Tensift" });

    const target = await fresh();
    await writeSiteName(target, "Autre site");
    await restoreBackup(target, backup);
    expect(await readSiteName(target)).toBe("Carrière Oued Tensift");
  });

  it("restoring a file without a site name removes the device's one", async () => {
    const target = await fresh();
    await writeSiteName(target, "Autre site");
    await restoreBackup(target, parseBackup(JSON.stringify(file({ settings: {} }))));
    expect(await readSiteName(target)).toBe("");
  });

  it("still accepts a version 2 file, which has no settings", () => {
    const { settings: _settings, ...v2 } = file();
    void _settings;
    const backup = parseBackup(JSON.stringify({ ...v2, version: 2 }));
    expect(backup.settings).toEqual({});
    expect(backup.version).toBe(3);
  });

  it.each([
    ["a version 3 file without settings", file({ settings: undefined })],
    ["settings that are not an object", file({ settings: "Carrière" })],
    ["a site name that is not text", file({ settings: { siteName: 12 } })],
    ["a site name that is too long", file({ settings: { siteName: "x".repeat(MAX_SITE_NAME + 1) } })],
  ])("refuses %s", (_label, data) => {
    expect(() => parseBackup(JSON.stringify(data))).toThrow(BackupError);
  });
});
