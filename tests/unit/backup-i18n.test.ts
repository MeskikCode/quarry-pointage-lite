import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { setStatus } from "@/lib/attendance";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
} from "@/lib/backup";
import { PointageDB } from "@/lib/db";
import { LANGUAGES, detectLanguage, dictionaries, directionOf, isLanguage } from "@/lib/i18n";

const freshDb = async () => {
  const db = new PointageDB(`backup-${Math.random()}`);
  await db.open();
  return db;
};

describe("backup and restore", () => {
  it("round-trips the whole database", async () => {
    const source = await freshDb();
    await setStatus(source, { employeeId: 1, date: "2026-11-11", shift: "jour" }, "present");
    await setStatus(source, { employeeId: 2, date: "2026-11-11", shift: "nuit" }, "absent");
    await source.employees.update(3, { active: false });

    const text = JSON.stringify(await createBackup(source));
    const backup = parseBackup(text);
    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.version).toBe(BACKUP_VERSION);

    const target = await freshDb();
    await target.employees.clear();
    await restoreBackup(target, backup);

    expect(await target.employees.toArray()).toEqual(await source.employees.toArray());
    const strip = (rows: { id?: number }[]) => rows.map((row) => ({ ...row, id: undefined }));
    expect(strip(await target.attendance.toArray())).toEqual(strip(await source.attendance.toArray()));
  });

  it("replaces existing data rather than merging", async () => {
    const source = await freshDb();
    const backup = parseBackup(JSON.stringify(await createBackup(source)));

    const target = await freshDb();
    await target.employees.add({ fullName: "Extra", post: "ouvrier", payType: "daily", rate: 1, overtimeRate: 0, active: true });
    await setStatus(target, { employeeId: 1, date: "2026-01-01", shift: "jour" }, "present");
    await restoreBackup(target, backup);

    expect(await target.employees.count()).toBe(backup.employees.length);
    expect(await target.attendance.count()).toBe(0);
  });

  const valid = () => ({
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: "2026-11-11T10:00:00.000Z",
    employees: [
      { id: 1, fullName: "A", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true },
    ],
    attendance: [
      { employeeId: 1, date: "2026-11-11", shift: "jour", status: "present", reason: "none", overtimeHours: 1 },
    ],
  });

  it("accepts a well-formed file", () => {
    expect(parseBackup(JSON.stringify(valid())).attendance).toHaveLength(1);
  });

  it.each([
    ["text that is not JSON", "not json"],
    ["another application's file", JSON.stringify({ ...valid(), app: "other" })],
    ["an unknown version", JSON.stringify({ ...valid(), version: 99 })],
    ["a missing table", JSON.stringify({ ...valid(), attendance: undefined })],
    ["an unknown post", JSON.stringify({ ...valid(), employees: [{ ...valid().employees[0], post: "directeur" }] })],
    ["an unknown pay type", JSON.stringify({ ...valid(), employees: [{ ...valid().employees[0], payType: "weekly" }] })],
    ["a negative wage", JSON.stringify({ ...valid(), employees: [{ ...valid().employees[0], rate: -1 }] })],
    ["a missing overtime rate", JSON.stringify({ ...valid(), employees: [{ ...valid().employees[0], overtimeRate: undefined }] })],
    ["a duplicate worker id", JSON.stringify({ ...valid(), employees: [valid().employees[0], valid().employees[0]] })],
    ["a record for an unknown worker", JSON.stringify({ ...valid(), attendance: [{ ...valid().attendance[0], employeeId: 9 }] })],
    ["an impossible date", JSON.stringify({ ...valid(), attendance: [{ ...valid().attendance[0], date: "2026-02-30" }] })],
    ["an unknown status", JSON.stringify({ ...valid(), attendance: [{ ...valid().attendance[0], status: "holiday" }] })],
    ["a duplicate record", JSON.stringify({ ...valid(), attendance: [valid().attendance[0], valid().attendance[0]] })],
  ])("refuses %s", (_label, text) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
  });

  it("clamps overtime found in a file", () => {
    const data = valid();
    data.attendance[0].overtimeHours = 40;
    expect(parseBackup(JSON.stringify(data)).attendance[0].overtimeHours).toBe(12);
  });

  it("names the file with the local date", () => {
    expect(backupFileName(new Date(2026, 10, 5))).toBe("quarry-pointage-lite-backup-2026-11-05.json");
  });
});

/** Every key path of a dictionary, with the kind of value it holds. */
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`];
  if (typeof value === "function") return [`${path}()`];
  if (typeof value === "object" && value !== null)
    return Object.entries(value).flatMap(([key, child]) => shape(child, path ? `${path}.${key}` : key));
  return [path];
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === "function") return [String(value(3, 7))];
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

describe("languages", () => {
  const reference = shape(dictionaries.fr).sort();

  it("offers Tamazight, Arabic, French, English and Spanish, in that order", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["zgh", "ar", "fr", "en", "es"]);
    expect(directionOf("ar")).toBe("rtl");
    expect(LANGUAGES.filter((l) => l.dir === "rtl")).toHaveLength(1);
  });

  it.each(LANGUAGES.map((l) => l.code))("%s has exactly the keys of the reference", (code) => {
    expect(shape(dictionaries[code]).sort()).toEqual(reference);
  });

  it.each(LANGUAGES.map((l) => l.code))("%s leaves no string empty", (code) => {
    const { reason, ...rest } = dictionaries[code];
    expect(reason.none).toBe("");
    const all = [...strings(rest), reason.non_justifie, reason.maladie, reason.autorise, reason.label];
    expect(all.filter((s) => s.trim() === "")).toEqual([]);
  });

  it("writes Tamazight in Tifinagh and Arabic in Arabic script", () => {
    expect(dictionaries.zgh.status.present).toMatch(/^[ⴰ-⵿\s]+$/);
    expect(dictionaries.ar.status.present).toMatch(/^[؀-ۿ\s]+$/);
  });

  it("never uses protected titles or emoji in any language", () => {
    // Spelt in fragments so that this file does not itself contain the words.
    const titles = ["engin" + "eer", "ing[ée]" + "nie", "archi" + "tect", "مهن" + "دس", "هند" + "سة"];
    const claims = ["certified", "licensed", "accredited"];
    const banned = new RegExp([...titles, ...claims, "\\p{Extended_Pictographic}"].join("|"), "iu");
    for (const dictionary of Object.values(dictionaries)) {
      expect(strings(dictionary).filter((s) => banned.test(s))).toEqual([]);
    }
  });

  it("picks the device language when the application speaks it", () => {
    expect(detectLanguage(["es-ES", "en"])).toBe("es");
    expect(detectLanguage(["ar-MA"])).toBe("ar");
    expect(detectLanguage(["zgh-Tfng-MA"])).toBe("zgh");
    expect(detectLanguage(["tzm"])).toBe("zgh");
    expect(detectLanguage(["de-DE", "en-GB"])).toBe("en");
    expect(detectLanguage(["de-DE"])).toBe("fr");
    expect(detectLanguage([])).toBe("fr");
    expect(isLanguage("it")).toBe(false);
  });
});
