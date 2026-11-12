import type { CellObject, SheetData } from "write-excel-file/browser";
import { advancesOfMonth, totalOf } from "./advances";
import { formatDate, formatMonth } from "./format";
import type { Dictionary } from "./i18n";
import { recordsOfMonth, summariseMonth, type MonthlyRow } from "./summary";
import type { Advance, AttendanceRecord, Employee } from "./types";

type Cell = string | number;

export interface ExportTables {
  /** Header, one row per employee, then the totals row. */
  summary: Cell[][];
  /** Header, then one row per attendance record. */
  detail: Cell[][];
  /** Header, one row per advance, then the totals row. */
  advances: Cell[][];
  /** Number of attendance records in the month. */
  recordCount: number;
  /** Number of advances in the month. */
  advanceCount: number;
}

/** The post as shown to people: the free label for `autre`, else the translated name. */
export function postName(employee: Pick<Employee, "post" | "postLabel">, t: Dictionary): string {
  return employee.post === "autre" && employee.postLabel ? employee.postLabel : t.posts[employee.post];
}

/**
 * Build the three tables of the monthly workbook as plain arrays, exactly as
 * they read in the sheets. Kept apart from the spreadsheet library so the
 * content can be tested directly, and so that the library is only loaded
 * when a file is actually written.
 */
export function buildExportTables(
  employees: (Employee & { id: number })[],
  records: AttendanceRecord[],
  advances: Advance[],
  month: string,
  t: Dictionary,
): ExportTables {
  const monthAdvances = advancesOfMonth(advances, month);
  const rows = summariseMonth(employees, records, month, monthAdvances);
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
    s.advances,
    s.balance,
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
    row.advances,
    row.balance,
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
    sum((r) => r.advances),
    sum((r) => r.balance),
  ];

  const byId = new Map(employees.map((e) => [e.id, e]));
  const nameOf = (id: number) => byId.get(id)?.fullName ?? `#${id}`;

  const detailHeader: Cell[] = [s.date, s.shift, s.name, s.cin, s.post, s.status, s.reason, s.overtime];
  const detailBody = [...inMonth]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.shift.localeCompare(b.shift) ||
        nameOf(a.employeeId).localeCompare(nameOf(b.employeeId), "fr"),
    )
    .map((record): Cell[] => {
      const employee = byId.get(record.employeeId);
      return [
        formatDate(record.date),
        t.shift[record.shift],
        nameOf(record.employeeId),
        employee?.cin ?? "",
        employee ? postName(employee, t) : "",
        t.status[record.status],
        t.reason[record.reason],
        record.overtimeHours,
      ];
    });

  const advancesHeader: Cell[] = [s.date, s.name, s.cin, s.post, s.amount, s.note];
  const advancesBody = monthAdvances
    .sort((a, b) => a.date.localeCompare(b.date) || nameOf(a.employeeId).localeCompare(nameOf(b.employeeId), "fr"))
    .map((advance): Cell[] => {
      const employee = byId.get(advance.employeeId);
      return [
        formatDate(advance.date),
        nameOf(advance.employeeId),
        employee?.cin ?? "",
        employee ? postName(employee, t) : "",
        advance.amount,
        advance.note ?? "",
      ];
    });
  const advancesTotal: Cell[] = [s.total, "", "", "", totalOf(monthAdvances), ""];

  return {
    summary: [summaryHeader, ...summaryBody, summaryTotal],
    detail: [detailHeader, ...detailBody],
    advances: [advancesHeader, ...advancesBody, advancesTotal],
    recordCount: inMonth.length,
    advanceCount: monthAdvances.length,
  };
}

/** Excel refuses sheet names over 31 characters or containing these symbols. */
export function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
}

export function exportFileName(t: Dictionary, month: string): string {
  return `${t.export.fileName}-${month}.xlsx`;
}

/* ---------------------------------------------------------------------------
 * The workbook file.
 *
 * Colours are those of the MeskikCode design system. A spreadsheet cannot
 * read a CSS variable, so the values are written out here, once.
 * ------------------------------------------------------------------------- */

const COLORS = {
  headerBackground: "#0F172A", // --slate-900
  headerText: "#FFFFFF",
  title: "#0F172A", // --slate-900
  muted: "#64748B", // --slate-500
  line: "#E2E8F0", // --slate-200
  stripe: "#F8FAFC", // --slate-50
  totalBackground: "#E6F8FF", // --cyan-50
  accent: "#00A3FF", // --brand-cyan-deep
};

type Kind = "text" | "int" | "decimal" | "money" | "balance" | "date";

interface ColumnSpec {
  kind: Kind;
  /** Width in characters. */
  width: number;
}

const FORMATS: Partial<Record<Kind, string>> = {
  int: "0",
  decimal: "0.0",
  money: "#,##0.00",
  // A negative balance (more advanced than due) shows in red.
  balance: "#,##0.00;[Red]-#,##0.00",
  date: "dd/mm/yyyy",
};

const col = (kind: Kind, width: number): ColumnSpec => ({ kind, width });

const SUMMARY_COLUMNS: ColumnSpec[] = [
  col("text", 28), // name
  col("text", 13), // CIN
  col("text", 26), // post
  col("text", 12), // pay type
  col("int", 11), // days present
  col("int", 11), // half days
  col("int", 11), // late
  col("int", 13), // absent, unjustified
  col("int", 13), // absent, sick
  col("int", 13), // absent, authorised
  col("decimal", 12), // days worked
  col("int", 13), // overtime hours
  col("money", 15), // rate
  col("money", 15), // overtime rate
  col("money", 15), // base pay
  col("money", 15), // overtime pay
  col("money", 16), // estimated pay
  col("money", 15), // advances
  col("balance", 17), // left to pay
];

const DETAIL_COLUMNS: ColumnSpec[] = [
  col("date", 13),
  col("text", 12),
  col("text", 28),
  col("text", 13),
  col("text", 26),
  col("text", 14),
  col("text", 18),
  col("int", 13),
];

const ADVANCES_COLUMNS: ColumnSpec[] = [
  col("date", 13),
  col("text", 28),
  col("text", 13),
  col("text", 26),
  col("money", 15),
  col("text", 44),
];

interface SheetSpec {
  name: string;
  title: string;
  subtitle: string;
  columns: ColumnSpec[];
  table: Cell[][];
  /** The last row of the table is a totals row. */
  totals: boolean;
}

/** `02/11/2026` as a date at midnight UTC, so that the serial number is a whole day. */
function toDate(display: string): Date {
  const [d, m, y] = display.split("/").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // A date that does not parse must stop the export, not become a blank or NaN cell.
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date in the export: ${display}`);
  return date;
}

/**
 * Turn the tables into an `.xlsx` file: a title and a note above the table,
 * a dark header row, striped rows, real numbers and dates with their formats,
 * a totals row, frozen top rows, landscape printing, and a right-to-left
 * sheet for Arabic. The spreadsheet library is loaded here, on demand.
 */
export async function buildWorkbookBlob(
  tables: ExportTables,
  t: Dictionary,
  month: string,
  rtl: boolean,
): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const label = formatMonth(month);

  const specs: SheetSpec[] = [
    {
      name: t.sheet.summary,
      title: `${t.app.name} — ${label}`,
      subtitle: t.month.note,
      columns: SUMMARY_COLUMNS,
      table: tables.summary,
      totals: true,
    },
    {
      name: t.sheet.detail,
      title: `${t.sheet.detail} — ${label}`,
      subtitle: "",
      columns: DETAIL_COLUMNS,
      table: tables.detail,
      totals: false,
    },
    {
      name: t.sheet.advancesSheet,
      title: `${t.sheet.advancesSheet} — ${label}`,
      subtitle: "",
      columns: ADVANCES_COLUMNS,
      table: tables.advances,
      totals: true,
    },
  ];

  const border: CellObject = { borderStyle: "thin", borderColor: COLORS.line };

  const sheets = specs.map((spec) => {
    const width = spec.columns.length;
    const [header, ...rest] = spec.table;
    const body = spec.totals ? rest.slice(0, -1) : rest;
    const total = spec.totals ? rest[rest.length - 1] : undefined;

    const dataCell = (value: Cell, column: ColumnSpec, extra: CellObject = {}): CellObject => {
      const format = FORMATS[column.kind];
      if (column.kind === "text") {
        return { value: String(value), type: String, alignVertical: "center", ...border, ...extra };
      }
      if (column.kind === "date") {
        return {
          value: toDate(String(value)),
          type: Date,
          format,
          align: "left",
          alignVertical: "center",
          ...border,
          ...extra,
        };
      }
      return { value: Number(value), type: Number, format, alignVertical: "center", ...border, ...extra };
    };

    const rows: SheetData = [
      // Title, then a note (or a blank line), so that every sheet's header is on row 3.
      [
        { value: spec.title, fontWeight: "bold", fontSize: 14, textColor: COLORS.title, columnSpan: width, height: 28, alignVertical: "center" },
        ...Array(width - 1).fill(null),
      ],
      spec.subtitle
        ? [{ value: spec.subtitle, fontStyle: "italic", textColor: COLORS.muted, columnSpan: width, alignVertical: "center" }, ...Array(width - 1).fill(null)]
        : Array(width).fill(null),
      header.map((value) => ({
        value: String(value),
        type: String,
        fontWeight: "bold",
        textColor: COLORS.headerText,
        backgroundColor: COLORS.headerBackground,
        align: "center",
        alignVertical: "center",
        wrap: true,
        height: 36,
        ...border,
      })),
      ...body.map((row, index) =>
        row.map((value, c) =>
          dataCell(value, spec.columns[c], index % 2 === 1 ? { backgroundColor: COLORS.stripe } : {}),
        ),
      ),
    ];

    if (total) {
      rows.push(
        total.map((value, c) => {
          const column = spec.columns[c];
          const style: CellObject = {
            fontWeight: "bold",
            backgroundColor: COLORS.totalBackground,
            topBorderStyle: "medium",
            topBorderColor: COLORS.accent,
            height: 26,
          };
          // The label and the blanks of the totals row are text, whatever the
          // column otherwise holds (the label sits in the date column of the
          // advances sheet, for one).
          return typeof value === "string"
            ? { value, type: String, alignVertical: "center", ...border, ...style }
            : dataCell(value, column, style);
        }),
      );
    }

    return {
      sheet: safeSheetName(spec.name),
      data: rows,
      columns: spec.columns.map(({ width: w }) => ({ width: w })),
      stickyRowsCount: 3,
      orientation: "landscape" as const,
      rightToLeft: rtl,
    };
  });

  return writeXlsxFile(sheets, { fontFamily: "Calibri", fontSize: 11 }).toBlob();
}
