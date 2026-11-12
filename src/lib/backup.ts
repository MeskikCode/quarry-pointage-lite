import { clampOvertime } from "./attendance";
import type { PointageDB } from "./db";
import { downloadBlob } from "./download";
import { isISODate } from "./format";
import {
  ABSENCE_REASONS,
  MAX_ADVANCE,
  PAY_TYPES,
  POST_KEYS,
  SHIFTS,
  STATUSES,
  type Advance,
  type AttendanceRecord,
  type Employee,
} from "./types";

export const BACKUP_APP = "quarry-pointage-lite";

/**
 * Version 2 added advances. Files of version 1 (no advances) are still
 * accepted and read as having none.
 */
export const BACKUP_VERSION = 2;
const SUPPORTED_VERSIONS = [1, 2];

const MAX_NOTE_LENGTH = 80;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  employees: (Employee & { id: number })[];
  attendance: AttendanceRecord[];
  advances: Advance[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

/** Read everything into a backup object. */
export async function createBackup(db: PointageDB, now = new Date()): Promise<Backup> {
  const [employees, attendance, advances] = await Promise.all([
    db.employees.toArray(),
    db.attendance.toArray(),
    db.advances.toArray(),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    employees: employees as Backup["employees"],
    attendance,
    advances,
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

function parseEmployee(raw: unknown): Employee & { id: number } {
  if (!isObject(raw)) throw new BackupError("employee is not an object");
  const { id, fullName, cin, post, postLabel, payType, rate, overtimeRate, active } = raw;
  const isAmount = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (!isPositiveInt(id)) throw new BackupError("employee id");
  if (typeof fullName !== "string" || !fullName.trim()) throw new BackupError("employee name");
  if (typeof post !== "string" || !POST_KEYS.includes(post as never)) throw new BackupError("employee post");
  if (!PAY_TYPES.includes(payType as never)) throw new BackupError("employee pay type");
  if (!isAmount(rate)) throw new BackupError("employee rate");
  if (!isAmount(overtimeRate)) throw new BackupError("employee overtime rate");
  if (typeof active !== "boolean") throw new BackupError("employee active flag");
  if (cin !== undefined && typeof cin !== "string") throw new BackupError("employee cin");
  if (postLabel !== undefined && typeof postLabel !== "string") throw new BackupError("employee post label");
  return {
    id,
    fullName: fullName.trim(),
    ...(cin ? { cin } : {}),
    post: post as Employee["post"],
    ...(postLabel ? { postLabel } : {}),
    payType: payType as Employee["payType"],
    rate,
    overtimeRate,
    active,
  };
}

function parseRecord(raw: unknown, employeeIds: Set<number>): AttendanceRecord {
  if (!isObject(raw)) throw new BackupError("record is not an object");
  const { employeeId, date, shift, status, reason, overtimeHours } = raw;
  if (!isPositiveInt(employeeId) || !employeeIds.has(employeeId))
    throw new BackupError("record employee");
  if (!isISODate(date)) throw new BackupError("record date");
  if (!SHIFTS.includes(shift as never)) throw new BackupError("record shift");
  if (!STATUSES.includes(status as never)) throw new BackupError("record status");
  if (reason !== "none" && !ABSENCE_REASONS.includes(reason as never))
    throw new BackupError("record reason");
  if (typeof overtimeHours !== "number") throw new BackupError("record overtime");
  return {
    employeeId,
    date,
    shift: shift as AttendanceRecord["shift"],
    status: status as AttendanceRecord["status"],
    reason: reason as AttendanceRecord["reason"],
    overtimeHours: clampOvertime(overtimeHours),
    synced: false,
  };
}

function parseAdvance(raw: unknown, employeeIds: Set<number>): Advance {
  if (!isObject(raw)) throw new BackupError("advance is not an object");
  const { employeeId, date, amount, note } = raw;
  if (!isPositiveInt(employeeId) || !employeeIds.has(employeeId)) throw new BackupError("advance employee");
  if (!isISODate(date)) throw new BackupError("advance date");
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > MAX_ADVANCE)
    throw new BackupError("advance amount");
  if (note !== undefined && (typeof note !== "string" || note.length > MAX_NOTE_LENGTH))
    throw new BackupError("advance note");
  return {
    employeeId,
    date,
    amount: Math.round(amount * 100) / 100,
    ...(note ? { note } : {}),
  };
}

/**
 * Validate the text of a backup file. Every field is checked: a file that is
 * not exactly what this application wrote is refused before it can replace
 * anything. Throws `BackupError`.
 */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("not JSON");
  }
  if (!isObject(data)) throw new BackupError("not an object");
  if (data.app !== BACKUP_APP) throw new BackupError("not a backup of this application");
  if (typeof data.version !== "number" || !SUPPORTED_VERSIONS.includes(data.version))
    throw new BackupError("unsupported version");
  if (!Array.isArray(data.employees) || !Array.isArray(data.attendance))
    throw new BackupError("missing tables");
  // Version 1 has no advances table; from version 2 on it is required.
  const rawAdvances: unknown[] = data.version === 1 ? [] : (data.advances as unknown[]);
  if (!Array.isArray(rawAdvances)) throw new BackupError("missing advances");

  const employees = data.employees.map(parseEmployee);
  const ids = new Set(employees.map((e) => e.id));
  if (ids.size !== employees.length) throw new BackupError("duplicate employee id");

  const attendance = data.attendance.map((raw) => parseRecord(raw, ids));
  const slots = new Set(attendance.map((r) => `${r.employeeId}|${r.date}|${r.shift}`));
  if (slots.size !== attendance.length) throw new BackupError("duplicate record");

  const advances = rawAdvances.map((raw) => parseAdvance(raw, ids));

  return {
    app: BACKUP_APP,
    // Whatever the file's version, what comes back is in the current shape.
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
    employees,
    attendance,
    advances,
  };
}

/** Replace the whole database with the backup, in one transaction. */
export async function restoreBackup(db: PointageDB, backup: Backup): Promise<void> {
  await db.transaction("rw", db.employees, db.attendance, db.advances, async () => {
    await db.attendance.clear();
    await db.advances.clear();
    await db.employees.clear();
    await db.employees.bulkAdd(backup.employees);
    await db.attendance.bulkAdd(backup.attendance);
    await db.advances.bulkAdd(backup.advances);
  });
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${BACKUP_APP}-backup-${stamp}.json`;
}

/** Hand a text file to the browser as a download. */
export function downloadText(text: string, fileName: string, type = "application/json"): void {
  downloadBlob(new Blob([text], { type }), fileName);
}
