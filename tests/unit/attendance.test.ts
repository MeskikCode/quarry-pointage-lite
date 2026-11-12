import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  adjustOvertime,
  applyOvertime,
  applyReason,
  applyStatus,
  clampOvertime,
  markUnmarkedPresent,
  setReason,
  setStatus,
  undoMarkedPresent,
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

describe("everyone present", () => {
  let db: PointageDB;
  let ids: number[];
  const day = "2026-11-12";

  beforeEach(async () => {
    db = new PointageDB(`bulk-${Math.random()}`);
    await db.open();
    ids = (await db.employees.toArray()).map((e) => e.id as number);
  });

  it("marks the whole crew present in one operation", async () => {
    const created = await markUnmarkedPresent(db, ids, day, "jour");
    expect(created).toHaveLength(ids.length);
    const records = await db.attendance.toArray();
    expect(records).toHaveLength(ids.length);
    expect(records.every((r) => r.status === "present" && r.reason === "none" && r.overtimeHours === 0)).toBe(true);
  });

  it("leaves anyone already marked untouched", async () => {
    await setStatus(db, { employeeId: ids[0], date: day, shift: "jour" }, "absent");
    await setStatus(db, { employeeId: ids[1], date: day, shift: "jour" }, "late");
    const created = await markUnmarkedPresent(db, ids, day, "jour");
    expect(created).toHaveLength(ids.length - 2);
    const all = await db.attendance.toArray();
    expect(all.find((r) => r.employeeId === ids[0])!.status).toBe("absent");
    expect(all.find((r) => r.employeeId === ids[1])!.status).toBe("late");
  });

  it("works on one shift and one date at a time", async () => {
    await markUnmarkedPresent(db, ids, day, "jour");
    expect(await markUnmarkedPresent(db, ids, day, "jour")).toEqual([]);
    expect(await markUnmarkedPresent(db, ids, day, "nuit")).toHaveLength(ids.length);
    expect(await markUnmarkedPresent(db, ids, "2026-11-13", "jour")).toHaveLength(ids.length);
  });

  it("only touches the employees it is given", async () => {
    const created = await markUnmarkedPresent(db, ids.slice(0, 3), day, "jour");
    expect(created).toHaveLength(3);
    expect(await db.attendance.count()).toBe(3);
  });

  it("undoes exactly what it wrote", async () => {
    await setStatus(db, { employeeId: ids[0], date: day, shift: "jour" }, "absent");
    const created = await markUnmarkedPresent(db, ids, day, "jour");
    expect(await undoMarkedPresent(db, created)).toBe(created.length);
    const left = await db.attendance.toArray();
    expect(left).toHaveLength(1);
    expect(left[0].status).toBe("absent");
  });

  it("keeps a record the supervisor corrected after the bulk action", async () => {
    const created = await markUnmarkedPresent(db, ids, day, "jour");
    await setStatus(db, { employeeId: ids[2], date: day, shift: "jour" }, "absent");
    await adjustOvertime(db, { employeeId: ids[3], date: day, shift: "jour" }, 2);
    expect(await undoMarkedPresent(db, created)).toBe(created.length - 2);
    const left = await db.attendance.toArray();
    expect(left.map((r) => r.employeeId).sort()).toEqual([ids[2], ids[3]].sort());
  });
});
