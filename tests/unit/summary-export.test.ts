import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildExportTables, buildWorkbookBlob, exportFileName, safeSheetName } from "@/lib/export";
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
import type { Advance, AttendanceRecord, StoredEmployee } from "@/lib/types";

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

// Advances of November 2026. Employee 4 has no attendance at all; the last
// one belongs to the previous month and must be ignored.
const advances: Advance[] = [
  { employeeId: 2, date: "2026-11-05", amount: 1000 },
  { employeeId: 1, date: "2026-11-10", amount: 400 },
  { employeeId: 4, date: "2026-11-15", amount: 200, note: "Dépannage" },
  { employeeId: 2, date: "2026-11-20", amount: 500, note: "Réparation" },
  { employeeId: 2, date: "2026-10-30", amount: 300 },
];

describe("pay with advances", () => {
  const rows = summariseMonth(employees, records, "2026-11", advances);
  const row = (id: number) => rows.find((r) => r.employeeId === id)!;

  it("deducts the month's advances from what is still to pay, not from the pay itself", () => {
    expect(row(2)).toMatchObject({ estimatedPay: 4600, advances: 1500, balance: 3100 });
    expect(row(5)).toMatchObject({ advances: 0, balance: 140 });
  });

  it("ignores advances of other months", () => {
    // The 300 MAD advance of 30/10 is not counted in November.
    expect(row(2).advances).toBe(1500);
    expect(summariseMonth(employees, records, "2026-10", advances).find((r) => r.employeeId === 2)!.advances).toBe(300);
  });

  it("lets the balance go negative when more was advanced than is due", () => {
    expect(row(1)).toMatchObject({ estimatedPay: 350, advances: 400, balance: -50 });
  });

  it("keeps a deactivated employee who only has an advance in the month", () => {
    expect(row(4)).toMatchObject({ daysWorked: 0, estimatedPay: 0, advances: 200, balance: -200 });
    // With no advance they are left out again.
    expect(summariseMonth(employees, records, "2026-11", []).some((r) => r.employeeId === 4)).toBe(false);
  });

  it("treats a missing list of advances as none", () => {
    const plain = summariseMonth(employees, records, "2026-11");
    expect(plain.every((r) => r.advances === 0 && r.balance === r.estimatedPay)).toBe(true);
  });

  it("adds cents without floating-point drift", () => {
    const cents: Advance[] = [
      { employeeId: 1, date: "2026-11-01", amount: 10.1 },
      { employeeId: 1, date: "2026-11-02", amount: 20.2 },
    ];
    expect(summariseMonth(employees, records, "2026-11", cents).find((r) => r.employeeId === 1)!.advances).toBe(30.3);
  });
});

describe("Excel export", () => {
  const t = dictionaries.fr;
  const tables = buildExportTables(employees, records, advances, "2026-11", t);

  it("writes a header, one row per employee and a total", () => {
    // Omar, Brahim, Jamais Venu, Saisonnier Parti, Ali: in the order of the site hierarchy.
    expect(tables.summary).toHaveLength(1 + 5 + 1);
    expect(tables.summary[0]).toHaveLength(19);
    expect(tables.summary[0][0]).toBe("Nom complet");
    expect(tables.summary.slice(1, -1).map((row) => row[0])).toEqual([
      "Omar Idrissi",
      "Brahim Oukacha",
      "Jamais Venu",
      "Saisonnier Parti",
      "Ali Pompiste",
    ]);
    const total = tables.summary.at(-1)!;
    expect(total[0]).toBe("Total");
    // days worked: 1 + 3.5 + 0 + 1 + 1
    expect(total[10]).toBe(6.5);
    // base 4500 + 350 + 0 + 100 + 110; overtime 100 + 30; estimated 5190
    expect(total[14]).toBe(5060);
    expect(total[15]).toBe(130);
    expect(total[16]).toBe(5190);
    // advances 1500 + 400 + 200; left to pay 5190 - 2100
    expect(total[17]).toBe(2100);
    expect(total[18]).toBe(3090);
  });

  it("names the post and the pay type of each employee, and shows each balance", () => {
    const driver = tables.summary.find((row) => row[0] === "Omar Idrissi")!;
    expect(driver[2]).toBe("Conducteur chargeuse");
    expect(driver[3]).toBe("Mensuel");
    expect(driver.slice(16)).toEqual([4600, 1500, 3100]);
    const attendant = tables.summary.find((row) => row[0] === "Ali Pompiste")!;
    expect(attendant[2]).toBe("Pompiste");
    expect(attendant[3]).toBe("Journalier");
    expect(tables.summary.find((row) => row[0] === "Brahim Oukacha")!.at(-1)).toBe(-50);
  });

  it("writes one detail row per record of the month, in date order", () => {
    expect(tables.recordCount).toBe(10);
    expect(tables.detail).toHaveLength(1 + 10);
    expect(tables.detail[1][0]).toBe("02/11/2026");
    expect(tables.detail.at(-1)![0]).toBe("07/11/2026");
  });

  it("lists the advances of the month by date, with their note and a total", () => {
    expect(tables.advanceCount).toBe(4);
    expect(tables.advances).toHaveLength(1 + 4 + 1);
    expect(tables.advances[0]).toEqual(["Date", "Nom complet", "CIN", "Poste", "Montant (MAD)", "Note"]);
    expect(tables.advances.slice(1, -1).map((row) => [row[0], row[1], row[4], row[5]])).toEqual([
      ["05/11/2026", "Omar Idrissi", 1000, ""],
      ["10/11/2026", "Brahim Oukacha", 400, ""],
      ["15/11/2026", "Jamais Venu", 200, "Dépannage"],
      ["20/11/2026", "Omar Idrissi", 500, "Réparation"],
    ]);
    expect(tables.advances.at(-1)).toEqual(["Total", "", "", "", 2100, ""]);
  });

  it("translates stored keys into the export language", () => {
    const ar = buildExportTables(employees, records, advances, "2026-11", dictionaries.ar);
    expect(ar.summary[0][0]).toBe("الاسم الكامل");
    expect(ar.summary[1][2]).toBe("سائق الجرافة");
    expect(ar.summary[1][3]).toBe("شهري");
    expect(ar.advances[0][4]).toBe("المبلغ (درهم)");
    const sick = tables.detail.find((row) => row[6] === "Maladie");
    expect(sick?.[5]).toBe("Absent");
  });

  it("reports an empty month, and a month with only advances as not empty", () => {
    const empty = buildExportTables(employees, records, advances, "2025-01", t);
    expect(empty.recordCount).toBe(0);
    expect(empty.advanceCount).toBe(0);
    const onlyAdvances = buildExportTables(employees, [], advances, "2026-11", t);
    expect(onlyAdvances.recordCount).toBe(0);
    expect(onlyAdvances.advanceCount).toBe(4);
  });

  it("keeps sheet and file names valid in every language", () => {
    expect(safeSheetName("a/b:c*d?e[f]g\\h")).toBe("a b c d e f g h");
    expect(safeSheetName("x".repeat(40))).toHaveLength(31);
    expect(exportFileName(t, "2026-11")).toBe("pointage-2026-11.xlsx");
    for (const dictionary of Object.values(dictionaries)) {
      const names = [dictionary.sheet.summary, dictionary.sheet.detail, dictionary.sheet.advancesSheet];
      for (const name of names) expect(safeSheetName(name)).toBe(name);
      expect(new Set(names).size).toBe(3);
    }
  });
});

describe("Excel file", () => {
  const t = dictionaries.fr;
  const tables = buildExportTables(employees, records, advances, "2026-11", t);

  const open = async (rtl = false, dictionary = t) => {
    const blob = await buildWorkbookBlob(
      buildExportTables(employees, records, advances, "2026-11", dictionary),
      dictionary,
      "2026-11",
      rtl,
    );
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const files = unzipSync(bytes);
    return { bytes, xml: (name: string) => strFromU8(files[name]) };
  };

  it("has three named sheets: summary, detail and advances", async () => {
    const { xml } = await open();
    const names = [...xml("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(["Récapitulatif", "Détail", "Avances"]);
  });

  it("reads back with the same figures, as real numbers", async () => {
    const { bytes } = await open();
    const book = XLSX.read(bytes);
    // The table starts on row 3, under a title and a note.
    const summary = XLSX.utils.sheet_to_json<Record<string, string | number>>(book.Sheets["Récapitulatif"], { range: 2 });
    expect(summary).toHaveLength(6);
    const omar = summary.find((r) => r["Nom complet"] === "Omar Idrissi")!;
    expect(omar).toMatchObject({
      "Mode de paie": "Mensuel",
      "Paie estimée (MAD)": 4600,
      "Avances (MAD)": 1500,
      "Reste à payer (MAD)": 3100,
    });
    expect(summary.find((r) => r["Nom complet"] === "Brahim Oukacha")!["Reste à payer (MAD)"]).toBe(-50);
    const total = summary.find((r) => r["Nom complet"] === "Total")!;
    expect(total).toMatchObject({ "Avances (MAD)": 2100, "Reste à payer (MAD)": 3090 });

    const advancesSheet = XLSX.utils.sheet_to_json<Record<string, string | number>>(book.Sheets["Avances"], { range: 2 });
    expect(advancesSheet).toHaveLength(5);
    expect(advancesSheet.at(-1)).toMatchObject({ Date: "Total", "Montant (MAD)": 2100 });

    const detail = XLSX.utils.sheet_to_json(book.Sheets["Détail"], { range: 2 });
    expect(detail).toHaveLength(tables.recordCount);
  });

  it("freezes the title and header rows, and prints in landscape", async () => {
    const { xml } = await open();
    for (const sheet of [1, 2, 3]) {
      const text = xml(`xl/worksheets/sheet${sheet}.xml`);
      expect(text).toMatch(/<pane [^>]*ySplit="3"[^>]*state="frozen"/);
      expect(text).toContain('orientation="landscape"');
      expect(text).toContain("<mergeCell ");
    }
  });

  it("styles the header and totals, and sets real number and date formats", async () => {
    const { xml } = await open();
    const styles = xml("xl/styles.xml");
    expect(styles).toContain("<b/>");
    expect(styles).toContain('rgb="FF0F172A"'); // header background (slate 900)
    expect(styles).toContain('formatCode="#,##0.00"');
    expect(styles).toContain('formatCode="#,##0.00;[Red]-#,##0.00"');
    expect(styles).toContain('formatCode="dd/mm/yyyy"');
    expect(styles).toContain('style="medium"'); // top border of the totals row
  });

  it("writes dates as whole-day Excel dates, whatever the time zone", async () => {
    const { xml } = await open();
    // 02/11/2026 is day 46328 of the Excel calendar; 05/11/2026 is 46331.
    expect(xml("xl/worksheets/sheet2.xml")).toMatch(/<c r="A4" s="\d+"><v>46328<\/v><\/c>/);
    expect(xml("xl/worksheets/sheet3.xml")).toMatch(/<c r="A4" s="\d+"><v>46331<\/v><\/c>/);
    // The label of the totals row is text, not a date.
    expect(xml("xl/worksheets/sheet3.xml")).not.toContain("<v>NaN</v>");
  });

  it("is a right-to-left workbook in Arabic only", async () => {
    expect((await open(true, dictionaries.ar)).xml("xl/worksheets/sheet1.xml")).toContain('rightToLeft="1"');
    expect((await open(false)).xml("xl/worksheets/sheet1.xml")).not.toContain("rightToLeft");
  });

  it("builds in every language, and keeps Arabic and Tifinagh text intact", async () => {
    for (const [code, dictionary] of Object.entries(dictionaries)) {
      const { bytes } = await open(code === "ar", dictionary);
      const book = XLSX.read(bytes);
      expect(book.SheetNames).toEqual([
        dictionary.sheet.summary,
        dictionary.sheet.detail,
        dictionary.sheet.advancesSheet,
      ]);
    }
  });

  it("stops rather than write a date it cannot read", async () => {
    const broken = { ...tables, detail: [tables.detail[0], ["xx/yy/zzzz", ...tables.detail[1].slice(1)]] };
    await expect(buildWorkbookBlob(broken, t, "2026-11", false)).rejects.toThrow("Invalid date");
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
