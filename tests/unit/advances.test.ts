import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_NOTE_LENGTH,
  addAdvance,
  advancesOfMonth,
  deleteAdvance,
  totalOf,
  validateAdvance,
} from "@/lib/advances";
import { PointageDB } from "@/lib/db";
import { lastDayOfMonth, parseAmount } from "@/lib/format";
import { MAX_ADVANCE } from "@/lib/types";

const input = { employeeId: 1, date: "2026-11-12", amount: 500 };

describe("reading an amount typed by a person", () => {
  it.each([
    ["300", 300],
    ["12.5", 12.5],
    ["12,5", 12.5],
    ["1 500,50", 1500.5],
    ["1 500", 1500],
    ["0,5", 0.5],
    ["  250  ", 250],
  ])("reads %j as %d", (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });

  it.each(["", "abc", "-5", "+5", "12,345", "1,2,3", "1.000,50", "5 MAD", "0x10", "1e3"])(
    "refuses %j",
    (text) => {
      expect(parseAmount(text)).toBeNaN();
    },
  );
});

describe("month boundaries", () => {
  it("finds the last day of a month, leap years included", () => {
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
    expect(lastDayOfMonth("2028-02")).toBe("2028-02-29");
    expect(lastDayOfMonth("2026-04")).toBe("2026-04-30");
    expect(lastDayOfMonth("2026-12")).toBe("2026-12-31");
  });
});

describe("validating an advance", () => {
  it("accepts a normal one", () => {
    expect(validateAdvance(input, "2026-11")).toEqual({});
    expect(validateAdvance({ ...input, note: "Réparation" }, "2026-11")).toEqual({});
  });

  it("accepts the first and last day of the month", () => {
    expect(validateAdvance({ ...input, date: "2026-11-01" }, "2026-11")).toEqual({});
    expect(validateAdvance({ ...input, date: "2026-11-30" }, "2026-11")).toEqual({});
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, MAX_ADVANCE + 1])("refuses an amount of %d", (amount) => {
    expect(validateAdvance({ ...input, amount }, "2026-11")).toEqual({ amount: true });
  });

  it("accepts the largest amount", () => {
    expect(validateAdvance({ ...input, amount: MAX_ADVANCE }, "2026-11")).toEqual({});
  });

  it("refuses a date outside the month shown, or one that does not exist", () => {
    expect(validateAdvance({ ...input, date: "2026-12-01" }, "2026-11")).toEqual({ date: true });
    expect(validateAdvance({ ...input, date: "2026-10-31" }, "2026-11")).toEqual({ date: true });
    expect(validateAdvance({ ...input, date: "2026-11-31" }, "2026-11")).toEqual({ date: true });
    expect(validateAdvance({ ...input, date: "" }, "2026-11")).toEqual({ date: true });
  });

  it("refuses a note that is too long, and reports every problem at once", () => {
    expect(validateAdvance({ ...input, note: "x".repeat(MAX_NOTE_LENGTH + 1) }, "2026-11")).toEqual({ note: true });
    expect(validateAdvance({ employeeId: 1, date: "nope", amount: 0 }, "2026-11")).toEqual({
      amount: true,
      date: true,
    });
  });
});

describe("storing advances", () => {
  let db: PointageDB;

  beforeEach(async () => {
    db = new PointageDB(`advances-${Math.random()}`);
    await db.open();
  });

  it("stores an advance and returns its id", async () => {
    const id = await addAdvance(db, { ...input, note: "  Réparation  " });
    expect(id).toBeGreaterThan(0);
    expect(await db.advances.get(id)).toEqual({
      id,
      employeeId: 1,
      date: "2026-11-12",
      amount: 500,
      note: "Réparation",
    });
  });

  it("rounds to cents and leaves out an empty note", async () => {
    const id = await addAdvance(db, { ...input, amount: 10.126, note: "   " });
    const stored = await db.advances.get(id);
    expect(stored!.amount).toBe(10.13);
    expect(stored).not.toHaveProperty("note");
  });

  it("deletes an advance and leaves the others", async () => {
    const first = await addAdvance(db, input);
    const second = await addAdvance(db, { ...input, amount: 200 });
    await deleteAdvance(db, first);
    expect((await db.advances.toArray()).map((a) => a.id)).toEqual([second]);
  });

  it("lists the advances of one month, oldest first", async () => {
    await addAdvance(db, { ...input, date: "2026-11-20", amount: 3 });
    await addAdvance(db, { ...input, date: "2026-10-31", amount: 9 });
    await addAdvance(db, { ...input, date: "2026-11-02", amount: 1 });
    await addAdvance(db, { ...input, date: "2026-11-02", amount: 2 });
    const list = advancesOfMonth(await db.advances.toArray(), "2026-11");
    expect(list.map((a) => a.amount)).toEqual([1, 2, 3]);
    expect(totalOf(list)).toBe(6);
  });

  it("totals without floating-point drift", () => {
    expect(totalOf([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
    expect(totalOf([])).toBe(0);
  });
});

describe("upgrading a device from version 1 of the database", () => {
  it("keeps every employee and attendance record, and adds an empty advances table", async () => {
    const name = `upgrade-${Math.random()}`;

    // The database exactly as version 1 of the application created it.
    const old = new Dexie(name);
    old.version(1).stores({
      employees: "++id, post, payType, active",
      attendance: "++id, &[employeeId+date+shift], date, employeeId",
    });
    await old.table("employees").add({
      fullName: "Mohamed Bouzidi",
      post: "chef_concassage",
      payType: "monthly",
      rate: 6000,
      overtimeRate: 30,
      active: true,
    });
    await old.table("attendance").add({
      employeeId: 1,
      date: "2026-11-11",
      shift: "jour",
      status: "present",
      reason: "none",
      overtimeHours: 2,
      synced: false,
    });
    old.close();

    // Opened by the current version of the application.
    const db = new PointageDB(name);
    await db.open();
    expect(db.verno).toBe(3);
    expect(await db.employees.count()).toBe(1);
    expect(await db.attendance.count()).toBe(1);
    expect((await db.attendance.toArray())[0].overtimeHours).toBe(2);
    // The sample crew is only added to a brand new database, never to an upgraded one.
    expect((await db.employees.toArray()).map((e) => e.fullName)).toEqual(["Mohamed Bouzidi"]);
    expect(await db.advances.count()).toBe(0);

    // And the new table works.
    const id = await addAdvance(db, { employeeId: 1, date: "2026-11-12", amount: 300 });
    expect(await db.advances.get(id)).toMatchObject({ amount: 300 });
    db.close();
  });
});
