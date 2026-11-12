import type { WorkBook } from "xlsx";
import { formatDate } from "./format";
import type { Dictionary } from "./i18n";
import { recordsOfMonth, summariseMonth, type MonthlyRow } from "./summary";
import type { AttendanceRecord, Employee } from "./types";

type Cell = string | number;

export interface ExportTables {
  summary: Cell[][];
  detail: Cell[][];
  /** Number of attendance records in the month. Zero means nothing to export. */
  recordCount: number;
}

/** The post as shown to people: the free label for `autre`, else the translated name. */
export function postName(employee: Pick<Employee, "post" | "postLabel">, t: Dictionary): string {
  return employee.post === "autre" && employee.postLabel ? employee.postLabel : t.posts[employee.post];
}

/**
 * Build the two tables of the monthly workbook as plain arrays.
 * Kept separate from the spreadsheet library so the content can be tested
 * and so the library is only loaded when a file is actually written.
 */
export function buildExportTables(
  employees: (Employee & { id: number })[],
  records: AttendanceRecord[],
  month: string,
  t: Dictionary,
): ExportTables {
  const rows = summariseMonth(employees, records, month);
  const inMonth = recordsOfMonth(records, month);
  const s = t.sheet;

  const summaryHeader: Cell[] = [
    s.name,
    s.cin,
    s.post,
    s.payType,
    s.present,
    s.halfDays,
    s.late,
    s.absentUnjustified,
    s.absentSick,
    s.absentAuthorised,
    s.daysWorked,
    s.overtime,
    s.rate,
    s.overtimeRate,
    s.basePay,
    s.overtimePay,
    s.estimatedPay,
  ];

  const summaryBody = rows.map((row: MonthlyRow): Cell[] => [
    row.fullName,
    row.cin,
    postName(row, t),
    t.payType[row.payType],
    row.present,
    row.halfDays,
    row.late,
    row.absentUnjustified,
    row.absentSick,
    row.absentAuthorised,
    row.daysWorked,
    row.overtimeHours,
    row.rate,
    row.overtimeRate,
    row.basePay,
    row.overtimePay,
    row.estimatedPay,
  ]);

  const sum = (pick: (row: MonthlyRow) => number) =>
    Math.round(rows.reduce((total, row) => total + pick(row), 0) * 100) / 100;

  const summaryTotal: Cell[] = [
    s.total,
    "",
    "",
    "",
    sum((r) => r.present),
    sum((r) => r.halfDays),
    sum((r) => r.late),
    sum((r) => r.absentUnjustified),
    sum((r) => r.absentSick),
    sum((r) => r.absentAuthorised),
    sum((r) => r.daysWorked),
    sum((r) => r.overtimeHours),
    "",
    "",
    sum((r) => r.basePay),
    sum((r) => r.overtimePay),
    sum((r) => r.estimatedPay),
  ];

  const byId = new Map(employees.map((e) => [e.id, e]));
  const detailHeader: Cell[] = [s.date, s.shift, s.name, s.cin, s.post, s.status, s.reason, s.overtime];
  const detailBody = [...inMonth]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.shift.localeCompare(b.shift) ||
        (byId.get(a.employeeId)?.fullName ?? "").localeCompare(
          byId.get(b.employeeId)?.fullName ?? "",
          "fr",
        ),
    )
    .map((record): Cell[] => {
      const employee = byId.get(record.employeeId);
      return [
        formatDate(record.date),
        t.shift[record.shift],
        employee?.fullName ?? `#${record.employeeId}`,
        employee?.cin ?? "",
        employee ? postName(employee, t) : "",
        t.status[record.status],
        t.reason[record.reason],
        record.overtimeHours,
      ];
    });

  return {
    summary: [summaryHeader, ...summaryBody, summaryTotal],
    detail: [detailHeader, ...detailBody],
    recordCount: inMonth.length,
  };
}

/** Excel refuses sheet names over 31 characters or containing these symbols. */
export function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
}

export function exportFileName(t: Dictionary, month: string): string {
  return `${t.export.fileName}-${month}.xlsx`;
}

/** Turn the tables into a workbook. The spreadsheet library is loaded here. */
export async function buildWorkbook(tables: ExportTables, t: Dictionary, rtl: boolean): Promise<WorkBook> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  if (rtl) workbook.Workbook = { Views: [{ RTL: true }] };

  const widths = (table: Cell[][]) =>
    table[0].map((_, column) => ({
      wch: Math.min(40, Math.max(10, ...table.map((row) => String(row[column] ?? "").length + 2))),
    }));

  const summary = XLSX.utils.aoa_to_sheet(tables.summary);
  summary["!cols"] = widths(tables.summary);
  XLSX.utils.book_append_sheet(workbook, summary, safeSheetName(t.sheet.summary));

  const detail = XLSX.utils.aoa_to_sheet(tables.detail);
  detail["!cols"] = widths(tables.detail);
  XLSX.utils.book_append_sheet(workbook, detail, safeSheetName(t.sheet.detail));

  return workbook;
}

/** Write the workbook and hand it to the browser as a download. */
export async function downloadWorkbook(workbook: WorkBook, fileName: string): Promise<void> {
  const XLSX = await import("xlsx");
  XLSX.writeFile(workbook, fileName, { compression: true });
}
