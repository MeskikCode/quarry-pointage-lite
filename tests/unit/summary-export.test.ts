import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildExportTables, buildWorkbook, exportFileName, safeSheetName } from "@/lib/export";
import {
  addDays,
  addMonths,
  formatDate,
  formatDays,
  formatMoney,
  formatMonth,
  formatNumber,
  isISODate,
  monthOf,
  toISODate,
  weekdayOf,
} from "@/lib/format";
import { dictionaries } from "@/lib/i18n";
import { computePay, countShift, summariseMonth } from "@/lib/summary";
import type { AttendanceRecord, StoredEmployee } from "@/lib/types";

// 1: daily hand, overtime not paid. 2: monthly driver, overtime paid.
// 3: seasonal hand who left mid-month. 4: left before the month.
// 5: daily fuel attendant (free post label) whose overtime is paid.
const employees: StoredEmployee[] = [
  { id: 1, fullName: "Brahim Oukacha", cin: "EE100011", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true },
  { id: 2, fullName: "Omar Idrissi", post: "conducteur_chargeuse", payType: "monthly", rate: 4500, overtimeRate: 25, active: true },
  { id: 3, fullName: "Saisonnier Parti", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: false },
  { id: 4, fullName: "Jamais Venu", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: false },
  { id: 5, fullName: "Ali Pompiste", post: "autre", postLabel: "Pompiste", payType: "daily", rate: 110, overtimeRate: 15, active: true },
];

const record = (
  employeeId: number,
  date: string,
  status: AttendanceRecord["status"],
  extra: Partial<AttendanceRecord> = {},
): AttendanceRecord => ({
  employeeId,
  date,
  shift: "jour",
  status,
  reason: status === "absent" ? "non_justifie" : "none",
  overtimeHours: 0,
  synced: false,
  ...extra,
});

const records: AttendanceRecord[] = [
  record(1, "2026-11-02", "present", { overtimeHours: 2 }),
  record(1, "2026-11-03", "present"),
  record(1, "2026-11-04", "half_day"),
  record(1, "2026-11-05", "late", { overtimeHours: 1 }),
  record(1, "2026-11-06", "absent", { reason: "maladie" }),
  record(1, "2026-11-07", "absent"),
  record(2, "2026-11-02", "present", { overtimeHours: 4 }),
  record(2, "2026-11-03", "absent", { reason: "autorise" }),
  record(5, "2026-11-02", "present", { overtimeHours: 2 }),
  record(3, "2026-11-02", "present"),
  record(1, "2026-10-31", "present"), // previous month: must be ignored
  record(1, "2026-12-01", "present"), // next month: must be ignored
];

describe("monthly summary", () => {
  const rows = summariseMonth(employees, records, "2026-11");
  const hand = rows.find((r) => r.employeeId === 1)!;
  const driver = rows.find((r) => r.employeeId === 2)!;
  const attendant = rows.find((r) => r.employeeId === 5)!;

  it("counts each status and reason within the month only", () => {
    expect(hand).toMatchObject({
      present: 2,
      halfDays: 1,
      late: 1,
      absentSick: 1,
      absentUnjustified: 1,
      absentAuthorised: 0,
      overtimeHours: 3,
    });
  });

  it("counts a half day as half and a late day as a full day worked", () => {
    expect(hand.daysWorked).toBe(3.5);
  });

  it("pays daily staff for the days worked, and no overtime without a rate", () => {
    expect(hand).toMatchObject({ basePay: 350, overtimePay: 0, estimatedPay: 350 });
  });

  it("pays daily staff their overtime when a rate is set", () => {
    expect(attendant).toMatchObject({ basePay: 110, overtimePay: 30, estimatedPay: 140 });
  });

  it("pays monthly staff the full salary despite an absence, plus overtime", () => {
    expect(driver.daysWorked).toBe(1);
    expect(driver.absentAuthorised).toBe(1);
    expect(driver).toMatchObject({ basePay: 4500, overtimePay: 100, estimatedPay: 4600 });
  });

  it("computes pay for both pay types", () => {
    expect(computePay({ payType: "monthly", rate: 5000, overtimeRate: 25 }, 0, 0).estimatedPay).toBe(5000);
    expect(computePay({ payType: "daily", rate: 100, overtimeRate: 0 }, 22.5, 10).estimatedPay).toBe(2250);
    expect(computePay({ payType: "daily", rate: 90.5, overtimeRate: 12.5 }, 3, 3).estimatedPay).toBe(309);
  });

  it("keeps a deactivated worker who worked, drops one who did not", () => {
    expect(rows.map((r) => r.employeeId).sort()).toEqual([1, 2, 3, 5]);
  });

  it("sorts by post in site order, then by name", () => {
    // driver, then the hands by name, then the free-label post
    expect(rows.map((r) => r.employeeId)).toEqual([2, 1, 3, 5]);
  });

  it("lists active staff with no record: salary due for monthly, nothing for daily", () => {
    const empty = summariseMonth(employees, [], "2026-11");
    expect(empty.map((r) => r.employeeId).sort()).toEqual([1, 2, 5]);
    expect(empty.find((r) => r.employeeId === 2)!.estimatedPay).toBe(4500);
    expect(empty.find((r) => r.employeeId === 1)!.estimatedPay).toBe(0);
  });

  it("counts a shift for the summary strip", () => {
    const day = records.filter((r) => r.date === "2026-11-02");
    expect(countShift([1, 2, 3, 4, 5], day)).toEqual({
      total: 5,
      present: 4,
      halfDay: 0,
      late: 0,
      absent: 0,
      unmarked: 1,
    });
  });
});

describe("Excel export", () => {
  const t = dictionaries.fr;
  const tables = buildExportTables(employees, records, "2026-11", t);

  it("writes a header, one row per worker and a total", () => {
    expect(tables.summary).toHaveLength(1 + 4 + 1);
    expect(tables.summary[0]).toHaveLength(17);
    expect(tables.summary[0][0]).toBe("Nom complet");
    const total = tables.summary.at(-1)!;
    expect(total[0]).toBe("Total");
    // days worked: 1 + 1 + 3.5 + 1
    expect(total[10]).toBe(6.5);
    // base 4500 + 110 + 350 + 100; overtime 100 + 30; estimated 5190
    expect(total[14]).toBe(5060);
    expect(total[15]).toBe(130);
    expect(total[16]).toBe(5190);
  });

  it("names the post and the pay type of each worker", () => {
    const driver = tables.summary.find((row) => row[0] === "Omar Idrissi")!;
    expect(driver[2]).toBe("Conducteur chargeuse");
    expect(driver[3]).toBe("Mensuel");
    const attendant = tables.summary.find((row) => row[0] === "Ali Pompiste")!;
    expect(attendant[2]).toBe("Pompiste");
    expect(attendant[3]).toBe("Journalier");
  });

  it("writes one detail row per record of the month, in date order", () => {
    expect(tables.recordCount).toBe(10);
    expect(tables.detail).toHaveLength(1 + 10);
    expect(tables.detail[1][0]).toBe("02/11/2026");
    expect(tables.detail.at(-1)![0]).toBe("07/11/2026");
  });

  it("translates stored keys into the export language", () => {
    const ar = buildExportTables(employees, records, "2026-11", dictionaries.ar);
    expect(ar.summary[0][0]).toBe("الاسم الكامل");
    expect(ar.summary[1][2]).toBe("سائق الجرافة");
    expect(ar.summary[1][3]).toBe("شهري");
    const sick = tables.detail.find((row) => row[6] === "Maladie");
    expect(sick?.[5]).toBe("Absent");
  });

  it("reports an empty month", () => {
    expect(buildExportTables(employees, records, "2025-01", t).recordCount).toBe(0);
  });

  it("produces a workbook that reads back with the same figures", async () => {
    const workbook = await buildWorkbook(tables, t, false);
    const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const reread = XLSX.read(bytes);
    expect(reread.SheetNames).toEqual(["Récapitulatif", "Détail"]);
    const summary = XLSX.utils.sheet_to_json<(string | number)[]>(reread.Sheets["Récapitulatif"], { header: 1 });
    expect(summary).toEqual(tables.summary);
  });

  it("marks the workbook right-to-left for Arabic", async () => {
    const workbook = await buildWorkbook(tables, dictionaries.ar, true);
    expect(workbook.Workbook?.Views?.[0]?.RTL).toBe(true);
  });

  it("keeps sheet and file names valid", () => {
    expect(safeSheetName("a/b:c*d?e[f]g\\h")).toBe("a b c d e f g h");
    expect(safeSheetName("x".repeat(40))).toHaveLength(31);
    expect(exportFileName(t, "2026-11")).toBe("pointage-2026-11.xlsx");
    for (const dictionary of Object.values(dictionaries)) {
      expect(safeSheetName(dictionary.sheet.summary)).toBe(dictionary.sheet.summary);
      expect(safeSheetName(dictionary.sheet.detail)).toBe(dictionary.sheet.detail);
    }
  });
});

describe("formatting", () => {
  it("uses the local calendar day, not the UTC day", () => {
    expect(toISODate(new Date(2026, 10, 11, 23, 59))).toBe("2026-11-11");
    expect(toISODate(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
  });

  it("moves across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats dates and months day first", () => {
    expect(formatDate("2026-11-05")).toBe("05/11/2026");
    expect(formatMonth("2026-11")).toBe("11/2026");
    expect(monthOf("2026-11-05")).toBe("2026-11");
    expect(weekdayOf("2026-11-11")).toBe(3);
  });

  it("validates ISO dates strictly", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("11/11/2026")).toBe(false);
    expect(isISODate(20261111)).toBe(false);
  });

  it("formats numbers with a decimal comma and grouped thousands", () => {
    expect(formatNumber(184200, 2)).toBe("184 200,00");
    expect(formatNumber(950)).toBe("950");
    expect(formatMoney(1234.5)).toBe("1 234,50 MAD");
    expect(formatDays(12)).toBe("12");
    expect(formatDays(12.5)).toBe("12,5");
  });
});

describe("month navigation", () => {
  it("moves across year ends", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 0)).toBe("2026-11");
    expect(addMonths("2026-11", 14)).toBe("2028-01");
  });
});
