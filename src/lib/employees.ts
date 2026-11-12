import type { PointageDB } from "./db";

/** How much an employee has on record: attendance and advances, all months. */
export async function historyOf(db: PointageDB, employeeId: number): Promise<{ records: number; advances: number }> {
  const [records, advances] = await Promise.all([
    db.attendance.where("employeeId").equals(employeeId).count(),
    db.advances.where("employeeId").equals(employeeId).count(),
  ]);
  return { records, advances };
}

/**
 * Delete an employee for good, but only one with nothing on record: an entry
 * made by mistake, or a sample employee. Anyone with attendance or advances
 * is kept, so that no past month changes; they can be deactivated instead.
 * Returns whether the employee was deleted.
 */
export function deleteEmployee(db: PointageDB, employeeId: number): Promise<boolean> {
  return db.transaction("rw", db.employees, db.attendance, db.advances, async () => {
    const { records, advances } = await historyOf(db, employeeId);
    if (records > 0 || advances > 0) return false;
    await db.employees.delete(employeeId);
    return true;
  });
}

/**
 * Erase everything on this device: employees, attendance, advances and the
 * site's settings. Used to start from an empty list, without the sample crew.
 * The sample crew is not added back.
 */
export function eraseAllData(db: PointageDB): Promise<void> {
  return db.transaction("rw", [db.employees, db.attendance, db.advances, db.settings], async () => {
    await Promise.all([db.attendance.clear(), db.advances.clear(), db.settings.clear()]);
    await db.employees.clear();
  });
}
