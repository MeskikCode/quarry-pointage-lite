import type { PointageDB } from "./db";
import {
  MAX_OVERTIME_HOURS,
  type AbsenceReason,
  type AttendanceRecord,
  type Shift,
  type Status,
} from "./types";

/** Identifies the one record a tap on a worker card writes to. */
export interface Slot {
  employeeId: number;
  date: string;
  shift: Shift;
}

/* ---------------------------------------------------------------------------
 * Rules. Pure functions: given the current record (or none) and what the
 * supervisor tapped, return the record to store, or `null` to clear it.
 * ------------------------------------------------------------------------- */

/**
 * Tap on a status button.
 * - Tapping the status already selected clears the record (undo).
 * - Absent starts as "unjustified" and carries no overtime.
 * - Any worked status keeps the overtime already entered.
 */
export function applyStatus(
  current: AttendanceRecord | undefined,
  slot: Slot,
  status: Status,
): AttendanceRecord | null {
  if (current?.status === status) return null;

  const absent = status === "absent";
  return {
    ...(current?.id !== undefined ? { id: current.id } : {}),
    ...slot,
    status,
    reason: absent ? "non_justifie" : "none",
    overtimeHours: absent ? 0 : (current?.overtimeHours ?? 0),
    synced: false,
  };
}

/** Tap on an absence reason. Only meaningful on an absent record. */
export function applyReason(
  current: AttendanceRecord | undefined,
  reason: Exclude<AbsenceReason, "none">,
): AttendanceRecord | null {
  if (!current || current.status !== "absent") return current ?? null;
  return { ...current, reason, synced: false };
}

/** Tap on the overtime stepper. Clamped to 0..MAX; ignored when absent or unmarked. */
export function applyOvertime(
  current: AttendanceRecord | undefined,
  delta: number,
): AttendanceRecord | null {
  if (!current || current.status === "absent") return current ?? null;
  const next = clampOvertime(current.overtimeHours + delta);
  return { ...current, overtimeHours: next, synced: false };
}

export function clampOvertime(hours: number): number {
  if (!Number.isFinite(hours)) return 0;
  return Math.min(MAX_OVERTIME_HOURS, Math.max(0, Math.round(hours)));
}

/* ---------------------------------------------------------------------------
 * Storage. Each operation reads and writes inside one transaction, so two
 * quick taps cannot interleave.
 * ------------------------------------------------------------------------- */

function find(db: PointageDB, slot: Slot) {
  return db.attendance
    .where("[employeeId+date+shift]")
    .equals([slot.employeeId, slot.date, slot.shift])
    .first();
}

async function commit(
  db: PointageDB,
  current: AttendanceRecord | undefined,
  next: AttendanceRecord | null,
) {
  if (next === null) {
    if (current?.id !== undefined) await db.attendance.delete(current.id);
    return;
  }
  await db.attendance.put(next);
}

export function setStatus(db: PointageDB, slot: Slot, status: Status) {
  return db.transaction("rw", db.attendance, async () => {
    const current = await find(db, slot);
    await commit(db, current, applyStatus(current, slot, status));
  });
}

export function setReason(db: PointageDB, slot: Slot, reason: Exclude<AbsenceReason, "none">) {
  return db.transaction("rw", db.attendance, async () => {
    const current = await find(db, slot);
    if (!current) return;
    await commit(db, current, applyReason(current, reason));
  });
}

export function adjustOvertime(db: PointageDB, slot: Slot, delta: number) {
  return db.transaction("rw", db.attendance, async () => {
    const current = await find(db, slot);
    if (!current) return;
    await commit(db, current, applyOvertime(current, delta));
  });
}
