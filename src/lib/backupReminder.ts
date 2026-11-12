/**
 * The data exists only on the device. If the phone is lost, broken or reset,
 * the only copy is the last backup file. This decides when to say so.
 */

/** Ask again once the last backup is this many days old. */
export const REMIND_AFTER_DAYS = 7;
/** On a device that has never been backed up, wait until the data is this old. */
export const FIRST_REMINDER_AFTER_DAYS = 3;

export const LAST_BACKUP_STORAGE_KEY = "qp_last_backup";

export type Reminder = { due: false } | { due: true; daysSinceBackup: number | null };

/** Whole days from one `YYYY-MM-DD` to another. */
export function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * - No attendance yet: nothing to protect, no reminder.
 * - Backed up before: remind once the last backup is a week old.
 * - Never backed up: remind once the oldest record is three days old, so that
 *   the first day of use is not interrupted.
 */
export function backupReminder(input: { lastBackup: string | null; oldestRecord: string | null; today: string }): Reminder {
  const { lastBackup, oldestRecord, today } = input;
  if (!oldestRecord) return { due: false };
  if (lastBackup) {
    const days = daysBetween(lastBackup, today);
    return days >= REMIND_AFTER_DAYS ? { due: true, daysSinceBackup: days } : { due: false };
  }
  return daysBetween(oldestRecord, today) >= FIRST_REMINDER_AFTER_DAYS
    ? { due: true, daysSinceBackup: null }
    : { due: false };
}

/** The date of the last backup made on this device, if any. */
export function readLastBackup(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function recordBackup(today: string): void {
  try {
    window.localStorage.setItem(LAST_BACKUP_STORAGE_KEY, today);
  } catch {
    // Storage refused: the reminder will simply come back.
  }
}
