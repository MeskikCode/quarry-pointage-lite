import type { PointageDB } from "./db";
import { isISODate, monthOf } from "./format";
import { MAX_ADVANCE, type Advance } from "./types";

export const MAX_NOTE_LENGTH = 80;

export interface AdvanceInput {
  employeeId: number;
  date: string;
  amount: number;
  note?: string;
}

/** Which fields of an advance are not acceptable. Empty means valid. */
export type AdvanceErrors = Partial<Record<"amount" | "date" | "note", true>>;

/**
 * Check an advance before it is stored. The date must fall in the month the
 * supervisor is working on, so that the list shown is always the list that
 * is counted.
 */
export function validateAdvance(input: AdvanceInput, month: string): AdvanceErrors {
  const errors: AdvanceErrors = {};
  const { amount, date, note } = input;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ADVANCE) errors.amount = true;
  if (!isISODate(date) || monthOf(date) !== month) errors.date = true;
  if (note !== undefined && note.length > MAX_NOTE_LENGTH) errors.note = true;
  return errors;
}

/** Store an advance. Returns its id. */
export function addAdvance(db: PointageDB, input: AdvanceInput): Promise<number> {
  const note = input.note?.trim();
  return db.advances.add({
    employeeId: input.employeeId,
    date: input.date,
    amount: Math.round(input.amount * 100) / 100,
    ...(note ? { note } : {}),
  }) as Promise<number>;
}

export function deleteAdvance(db: PointageDB, id: number): Promise<void> {
  return db.advances.delete(id);
}

/** Advances whose date falls in `month` (`YYYY-MM`), oldest first. */
export function advancesOfMonth<T extends Advance>(advances: T[], month: string): T[] {
  const prefix = `${month}-`;
  return advances
    .filter((a) => a.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));
}

export function totalOf(advances: Pick<Advance, "amount">[]): number {
  return Math.round(advances.reduce((sum, a) => sum + a.amount, 0) * 100) / 100;
}
