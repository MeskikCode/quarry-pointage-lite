/** Stable keys. They are stored as written here and translated only at
 * display and export time, so a record entered in one language reads
 * correctly in every other. */

/**
 * How a worker is paid. This is the distinction a crushing site actually
 * runs on:
 *
 * - `monthly`: under contract. The salary is due for the month even when
 *   some days are missed, and overtime hours are payable.
 * - `daily`: paid for the days worked. Overtime is often not paid; it is
 *   when an hourly overtime rate is set for the worker.
 */
export const PAY_TYPES = ["monthly", "daily"] as const;
export type PayType = (typeof PAY_TYPES)[number];

/** Groups used to filter the attendance screen. */
export const TEAMS = ["encadrement", "technique", "conducteurs", "ouvriers", "gardiens"] as const;
export type Team = (typeof TEAMS)[number];

/**
 * The posts found on a crushing and sand-washing site around Marrakech,
 * with the team each belongs to and the way it is usually paid.
 *
 * Sites differ: many have no weighbridge agent, fuel attendant or
 * storekeeper. Those, and anything else, are entered as `autre` with a
 * free label.
 */
export const POSTS = {
  /** Runs the crushing plant, or the whole site where there is no equipment chief. */
  chef_concassage: { team: "encadrement", payType: "monthly" },
  /** Runs loaders, excavators and trucks, and drives when a driver is missing. */
  chef_materiel: { team: "encadrement", payType: "monthly" },
  /** Keeps the books: sales, purchases, delivery notes. */
  comptable: { team: "encadrement", payType: "monthly" },
  /** Fixes electrical faults and runs crushers, screens, the sand washer and conveyors. */
  electricien_operateur: { team: "technique", payType: "monthly" },
  soudeur: { team: "technique", payType: "monthly" },
  conducteur_chargeuse: { team: "conducteurs", payType: "monthly" },
  conducteur_pelle: { team: "conducteurs", payType: "monthly" },
  chauffeur_camion: { team: "conducteurs", payType: "monthly" },
  /** General hand: any manual job, helps with repairs. */
  ouvrier: { team: "ouvriers", payType: "daily" },
  /** Site guard. There are usually two: one by day, one by night. */
  gardien: { team: "gardiens", payType: "daily" },
  autre: { team: "ouvriers", payType: "daily" },
} as const satisfies Record<string, { team: Team; payType: PayType }>;

export type Post = keyof typeof POSTS;
export const POST_KEYS = Object.keys(POSTS) as Post[];

export const SHIFTS = ["jour", "nuit"] as const;
export type Shift = (typeof SHIFTS)[number];

export const STATUSES = ["present", "half_day", "late", "absent"] as const;
export type Status = (typeof STATUSES)[number];

export const ABSENCE_REASONS = ["non_justifie", "maladie", "autorise"] as const;
export type AbsenceReason = "none" | (typeof ABSENCE_REASONS)[number];

export const MAX_OVERTIME_HOURS = 12;

export interface Employee {
  id?: number;
  fullName: string;
  /** National identity card number, used to match payroll. Optional. */
  cin?: string;
  post: Post;
  /** Free label, used when `post` is `autre` (for example "Pompiste"). */
  postLabel?: string;
  payType: PayType;
  /** Monthly salary or daily wage in MAD, according to `payType`. */
  rate: number;
  /** MAD per overtime hour. Zero means overtime is recorded but not paid. */
  overtimeRate: number;
  active: boolean;
}

export interface AttendanceRecord {
  id?: number;
  employeeId: number;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  shift: Shift;
  status: Status;
  reason: AbsenceReason;
  overtimeHours: number;
  /** Reserved for a future sync between phones. Always `false` for now. */
  synced: boolean;
}

export type StoredEmployee = Employee & { id: number };
export type StoredAttendance = AttendanceRecord & { id: number };

/** Largest advance accepted in one entry, in MAD. A guard against typing errors. */
export const MAX_ADVANCE = 1_000_000;

/**
 * An advance (avance): money handed to an employee before pay day, deducted
 * from what is due at the end of the month. It belongs to the month of its
 * date.
 */
export interface Advance {
  id?: number;
  employeeId: number;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** MAD, always above zero, at most two decimals. */
  amount: number;
  note?: string;
}

export type StoredAdvance = Advance & { id: number };

/** A setting of the site, stored as a key and a text value. */
export interface Setting {
  key: string;
  value: string;
}

export function teamOf(post: Post): Team {
  return POSTS[post].team;
}
