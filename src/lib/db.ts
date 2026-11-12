import Dexie, { type EntityTable } from "dexie";
import type { Advance, AttendanceRecord, Employee } from "./types";

/**
 * Local database. Everything the application knows lives here, on the
 * device; nothing is sent anywhere.
 *
 * Schema changes are made by adding a new `version(n)` block below, never by
 * editing an existing one, so that devices already in use upgrade in place.
 * See docs/data-model.md.
 */
export class PointageDB extends Dexie {
  employees!: EntityTable<Employee, "id">;
  attendance!: EntityTable<AttendanceRecord, "id">;
  advances!: EntityTable<Advance, "id">;

  constructor(name = "quarry-pointage-lite") {
    super(name);

    this.version(1).stores({
      employees: "++id, post, payType, active",
      // One record per worker, date and shift: the compound index is unique.
      attendance: "++id, &[employeeId+date+shift], date, employeeId",
    });

    // Version 2 adds advances. The other tables are carried over unchanged,
    // and a device already in use upgrades in place the next time it opens.
    this.version(2).stores({
      advances: "++id, employeeId, date",
    });

    this.on("populate", (tx) => {
      tx.table("employees").bulkAdd(SEED_EMPLOYEES);
    });
  }
}

/**
 * Sample crew, shown on first launch so the screen is not empty. It mirrors
 * the staff of a typical crushing site around Marrakech: contracted staff
 * paid by the month, and hands and guards paid by the day.
 *
 * These people are fictional. So are their identity numbers and wages.
 */
export const SEED_EMPLOYEES: Employee[] = [
  { fullName: "Mohamed Bouzidi", cin: "EE100001", post: "chef_concassage", payType: "monthly", rate: 6000, overtimeRate: 30, active: true },
  { fullName: "Omar Idrissi", cin: "EE100002", post: "chef_materiel", payType: "monthly", rate: 5500, overtimeRate: 30, active: true },
  { fullName: "Khalid Benali", cin: "EE100003", post: "comptable", payType: "monthly", rate: 4500, overtimeRate: 25, active: true },
  { fullName: "Hassan Aït Lahcen", cin: "EE100004", post: "electricien_operateur", payType: "monthly", rate: 5000, overtimeRate: 25, active: true },
  { fullName: "Lahcen Amzil", cin: "EE100005", post: "soudeur", payType: "monthly", rate: 4500, overtimeRate: 25, active: true },
  { fullName: "Saïd Ouhammou", cin: "EE100006", post: "conducteur_chargeuse", payType: "monthly", rate: 4500, overtimeRate: 25, active: true },
  { fullName: "Rachid El Fassi", cin: "EE100007", post: "conducteur_chargeuse", payType: "monthly", rate: 4500, overtimeRate: 25, active: true },
  { fullName: "Abdelkrim Naciri", cin: "EE100008", post: "conducteur_pelle", payType: "monthly", rate: 5000, overtimeRate: 25, active: true },
  { fullName: "Youssef Tahiri", cin: "EE100009", post: "chauffeur_camion", payType: "monthly", rate: 4000, overtimeRate: 20, active: true },
  { fullName: "Mustapha Zeroual", cin: "EE100010", post: "chauffeur_camion", payType: "monthly", rate: 4000, overtimeRate: 20, active: true },
  { fullName: "Brahim Oukacha", cin: "EE100011", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true },
  { fullName: "Ali Aït Baha", cin: "EE100012", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true },
  { fullName: "Hamid Oubella", cin: "EE100013", post: "ouvrier", payType: "daily", rate: 100, overtimeRate: 0, active: true },
  { fullName: "Lhoussaine Idar", cin: "EE100014", post: "gardien", payType: "daily", rate: 90, overtimeRate: 0, active: true },
  { fullName: "Mbark Aït Ali", cin: "EE100015", post: "gardien", payType: "daily", rate: 90, overtimeRate: 0, active: true },
];

export const db = new PointageDB();
