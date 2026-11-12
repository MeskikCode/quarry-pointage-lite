import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  adjustOvertime,
  applyOvertime,
  applyReason,
  applyStatus,
  clampOvertime,
  setReason,
  setStatus,
  type Slot,
} from "@/lib/attendance";
import { PointageDB, SEED_EMPLOYEES } from "@/lib/db";
import { MAX_OVERTIME_HOURS, PAY_TYPES, TEAMS, teamOf } from "@/lib/types";

const slot: Slot = { employeeId: 1, date: "2026-11-11", shift: "jour" };

describe("attendance rules", () => {
  it("marks a worker present with no reason and no overtime", () => {
    expect(applyStatus(undefined, slot, "present")).toEqual({
      ...slot,
      status: "present",
      reason: "none",
      overtimeHours: 0,
      synced: false,
    });
  });

  it("clears the record when the selected status is tapped again", () => {
    const present = applyStatus(undefined, slot, "present")!;
    expect(applyStatus(present, slot, "present")).toBeNull();
  });

  it("starts an absence as unjustified and drops overtime", () => {
    const worked = { ...applyStatus(undefined, slot, "present")!, overtimeHours: 3 };
    const absent = applyStatus(worked, slot, "absent")!;
    expect(absent.reason).toBe("non_justifie");
    expect(absent.overtimeHours).toBe(0);
  });

  it("keeps overtime when switching between worked statuses", () => {
    const worked = { ...applyStatus(undefined, slot, "present")!, overtimeHours: 2 };
    expect(applyStatus(worked, slot, "late")!.overtimeHours).toBe(2);
    expect(applyStatus(worked, slot, "half_day")!.reason).toBe("none");
  });

  it("only accepts a reason on an absent record", () => {
    const present = applyStatus(undefined, slot, "present")!;
    expect(applyReason(present, "maladie")).toEqual(present);
    const absent = applyStatus(undefined, slot, "absent")!;
    expect(applyReason(absent, "maladie")!.reason).toBe("maladie");
    expect(applyReason(undefined, "maladie")).toBeNull();
  });

  it("clamps overtime between zero and the maximum", () => {
    const present = applyStatus(undefined, slot, "present")!;
    expect(applyOvertime(present, -1)!.overtimeHours).toBe(0);
    expect(applyOvertime(present, 99)!.overtimeHours).toBe(MAX_OVERTIME_HOURS);
    expect(clampOvertime(Number.NaN)).toBe(0);
    expect(clampOvertime(2.6)).toBe(3);
  });

  it("ignores overtime on an absent or unmarked worker", () => {
    const absent = applyStatus(undefined, slot, "absent")!;
    expect(applyOvertime(absent, 1)!.overtimeHours).toBe(0);
    expect(applyOvertime(undefined, 1)).toBeNull();
  });
});

describe("attendance storage", () => {
  let db: PointageDB;

  beforeEach(async () => {
    db = new PointageDB(`test-${Math.random()}`);
    await db.open();
  });

  it("seeds a fictional crew covering every team and both pay types", async () => {
    const employees = await db.employees.toArray();
    expect(employees).toHaveLength(SEED_EMPLOYEES.length);
    expect(new Set(employees.map((e) => teamOf(e.post)))).toEqual(new Set(TEAMS));
    expect(new Set(employees.map((e) => e.payType))).toEqual(new Set(PAY_TYPES));
    // Two guards: one for the day, one for the night.
    expect(employees.filter((e) => e.post === "gardien")).toHaveLength(2);
  });

  it("keeps one record per worker, date and shift", async () => {
    await setStatus(db, slot, "present");
    await setStatus(db, slot, "late");
    await setStatus(db, { ...slot, shift: "nuit" }, "present");
    const records = await db.attendance.toArray();
    expect(records).toHaveLength(2);
    expect(records.find((r) => r.shift === "jour")!.status).toBe("late");
  });

  it("refuses a duplicate written behind the rules", async () => {
    await setStatus(db, slot, "present");
    await expect(
      db.attendance.add({ ...slot, status: "absent", reason: "none", overtimeHours: 0, synced: false }),
    ).rejects.toThrow();
  });

  it("removes the record on a second tap", async () => {
    await setStatus(db, slot, "present");
    await setStatus(db, slot, "present");
    expect(await db.attendance.count()).toBe(0);
  });

  it("stores reason and overtime changes", async () => {
    await setStatus(db, slot, "absent");
    await setReason(db, slot, "autorise");
    expect((await db.attendance.toArray())[0].reason).toBe("autorise");

    await setStatus(db, slot, "present");
    await adjustOvertime(db, slot, 1);
    await adjustOvertime(db, slot, 1);
    const record = (await db.attendance.toArray())[0];
    expect(record.overtimeHours).toBe(2);
    expect(record.reason).toBe("none");
    expect(record.synced).toBe(false);
  });

  it("does nothing when adjusting a worker who is not marked", async () => {
    await adjustOvertime(db, slot, 1);
    await setReason(db, slot, "maladie");
    expect(await db.attendance.count()).toBe(0);
  });
});
