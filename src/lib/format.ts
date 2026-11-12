/** Dates are stored as local calendar days, `YYYY-MM-DD`, and shown as
 * `DD/MM/YYYY` in every language. Numbers always use Latin digits. */

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day of `date` as `YYYY-MM-DD` (never the UTC day). */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Shift an ISO day by a number of days. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** `2026-11-11` to `11/11/2026`. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** `2026-11-11` to `2026-11`. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** `2026-11` to `11/2026`. */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

/** Weekday index of an ISO day, 0 = Sunday. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Group thousands with a narrow no-break space and use a decimal comma:
 * `184 200,00`. The format is the same in every language of the interface. */
export function formatNumber(value: number, decimals = 0): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = value < 0 ? "-" : "";
  return frac ? `${sign}${grouped},${frac}` : `${sign}${grouped}`;
}

export function formatMoney(value: number): string {
  return `${formatNumber(value, 2)} MAD`;
}

/** Days can be halves: `12` or `12,5`. */
export function formatDays(value: number): string {
  return Number.isInteger(value) ? formatNumber(value) : formatNumber(value, 1);
}

/** Shift a `YYYY-MM` month by a number of months. */
export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m - 1 + months, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
