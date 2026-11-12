import {
  POST_KEYS,
  type AttendanceRecord,
  type Employee,
  type PayType,
  type Post,
  type Status,
} from "./types";

/** One line of the monthly recap: everything payroll needs for one worker. */
export interface MonthlyRow {
  employeeId: number;
  fullName: string;
  cin: string;
  post: Post;
  postLabel: string;
  payType: PayType;
  /** Monthly salary or daily wage, according to `payType`. */
  rate: number;
  overtimeRate: number;
  present: number;
  halfDays: number;
  late: number;
  absentUnjustified: number;
  absentSick: number;
  absentAuthorised: number;
  /** present + late + half days counted as 0.5. */
  daysWorked: number;
  overtimeHours: number;
  /** Monthly: the salary. Daily: days worked x daily wage. */
  basePay: number;
  /** Overtime hours x the worker's overtime rate (zero when not paid). */
  overtimePay: number;
  estimatedPay: number;
}

export interface ShiftCounts {
  total: number;
  present: number;
  halfDay: number;
  late: number;
  absent: number;
  unmarked: number;
}

/** Records whose date falls in `month` (`YYYY-MM`). */
export function recordsOfMonth<T extends AttendanceRecord>(records: T[], month: string): T[] {
  const prefix = `${month}-`;
  return records.filter((r) => r.date.startsWith(prefix));
}

/**
 * Pay for the month, before any deduction.
 *
 * - Monthly staff are under contract: the salary is due for the month even
 *   when some days are missed. Absences are reported, not deducted.
 * - Daily staff are paid for the days they worked.
 * - Overtime is paid at the worker's own hourly rate. A rate of zero means
 *   the hours are recorded but not paid, which is common for daily staff.
 */
export function computePay(
  employee: Pick<Employee, "payType" | "rate" | "overtimeRate">,
  daysWorked: number,
  overtimeHours: number,
) {
  const basePay = roundMoney(employee.payType === "monthly" ? employee.rate : daysWorked * employee.rate);
  const overtimePay = roundMoney(overtimeHours * employee.overtimeRate);
  return { basePay, overtimePay, estimatedPay: roundMoney(basePay + overtimePay) };
}

/**
 * Build the monthly recap.
 *
 * A worker appears if they are active or have at least one record in the
 * month, so a seasonal worker deactivated mid-month is still paid for the
 * days they worked. A deactivated monthly worker with no record is left out.
 * Rows are sorted by post, in the order of the site hierarchy, then by name.
 */
export function summariseMonth(
  employees: (Employee & { id: number })[],
  records: AttendanceRecord[],
  month: string,
): MonthlyRow[] {
  const inMonth = recordsOfMonth(records, month);
  const byEmployee = new Map<number, AttendanceRecord[]>();
  for (const record of inMonth) {
    const list = byEmployee.get(record.employeeId);
    if (list) list.push(record);
    else byEmployee.set(record.employeeId, [record]);
  }

  const rows: MonthlyRow[] = [];
  for (const employee of employees) {
    const own = byEmployee.get(employee.id) ?? [];
    if (!employee.active && own.length === 0) continue;

    const count = (status: Status) => own.filter((r) => r.status === status).length;
    const reason = (key: AttendanceRecord["reason"]) =>
      own.filter((r) => r.status === "absent" && r.reason === key).length;

    const present = count("present");
    const halfDays = count("half_day");
    const late = count("late");
    const daysWorked = present + late + halfDays * 0.5;
    const overtimeHours = own.reduce((sum, r) => sum + r.overtimeHours, 0);

    rows.push({
      employeeId: employee.id,
      fullName: employee.fullName,
      cin: employee.cin ?? "",
      post: employee.post,
      postLabel: employee.postLabel ?? "",
      payType: employee.payType,
      rate: employee.rate,
      overtimeRate: employee.overtimeRate,
      present,
      halfDays,
      late,
      absentUnjustified: reason("non_justifie"),
      absentSick: reason("maladie"),
      absentAuthorised: reason("autorise"),
      daysWorked,
      overtimeHours,
      ...computePay(employee, daysWorked, overtimeHours),
    });
  }

  return rows.sort(
    (a, b) =>
      POST_KEYS.indexOf(a.post) - POST_KEYS.indexOf(b.post) ||
      a.fullName.localeCompare(b.fullName, "fr"),
  );
}

/** Counts for the summary strip of one date and shift. */
export function countShift(employeeIds: number[], records: AttendanceRecord[]): ShiftCounts {
  const byEmployee = new Map(records.map((r) => [r.employeeId, r.status]));
  const counts: ShiftCounts = {
    total: employeeIds.length,
    present: 0,
    halfDay: 0,
    late: 0,
    absent: 0,
    unmarked: 0,
  };
  for (const id of employeeIds) {
    const status = byEmployee.get(id);
    if (status === "present") counts.present += 1;
    else if (status === "half_day") counts.halfDay += 1;
    else if (status === "late") counts.late += 1;
    else if (status === "absent") counts.absent += 1;
    else counts.unmarked += 1;
  }
  return counts;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
