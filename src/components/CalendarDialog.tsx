"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Moon, Sun } from "lucide-react";
import { useMemo } from "react";
import { db } from "@/lib/db";
import { formatDate, formatDays, formatMonth, formatNumber, lastDayOfMonth, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { recordsOfMonth, summariseMonth } from "@/lib/summary";
import { SHIFTS, STATUSES, type AttendanceRecord, type Shift, type StoredEmployee } from "@/lib/types";
import { STATUS_FILL, STATUS_ICON } from "./status";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { cn } from "./ui/cn";

interface Props {
  employee: StoredEmployee;
  month: string;
  onClose: () => void;
}

/** Monday first, as on the calendars used on site. Indexes into Sunday-first lists. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/**
 * One employee's month, day by day: the day shift on top, the night shift
 * below. This is what settles a disagreement about a day ("I was there on the
 * 14th") without scrolling back through the attendance screen.
 */
export function CalendarDialog({ employee, month, onClose }: Props) {
  const { t } = useI18n();
  const stored = useLiveQuery(
    () => db.attendance.where("employeeId").equals(employee.id).toArray(),
    [employee.id],
  );
  const records = useMemo(() => recordsOfMonth(stored ?? [], month), [stored, month]);
  const row = useMemo(() => summariseMonth([{ ...employee, active: true }], records, month)[0], [employee, records, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Partial<Record<Shift, AttendanceRecord>>>();
    for (const record of records) map.set(record.date, { ...map.get(record.date), [record.shift]: record });
    return map;
  }, [records]);

  const [y, m] = month.split("-").map(Number);
  const dayCount = Number(lastDayOfMonth(month).slice(8));
  const leading = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const today = todayISO();
  const absences = row.absentUnjustified + row.absentSick + row.absentAuthorised;

  const describe = (record: AttendanceRecord | undefined) => {
    if (!record) return "—";
    const reason = record.status === "absent" ? ` (${t.reason[record.reason]})` : "";
    const overtime = record.overtimeHours > 0 ? `, +${record.overtimeHours} ${t.overtime.unit}` : "";
    return `${t.status[record.status]}${reason}${overtime}`;
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t.calendar.title}
      subtitle={`${employee.fullName} · ${formatMonth(month)}`}
      closeLabel={t.actions.close}
      footer={
        <Button variant="secondary" size="lg" onClick={onClose} className="border-2">
          {t.actions.close}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-2 rounded-panel border border-tile-line bg-tile p-3">
          {[
            [t.sheet.daysWorked, formatDays(row.daysWorked)],
            [t.month.absences, formatNumber(absences)],
            [t.overtime.label, `${formatNumber(row.overtimeHours)} ${t.overtime.unit}`],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col justify-between gap-0.5">
              <dt className="caps text-2xs leading-tight font-bold text-muted">{label}</dt>
              <dd className="num text-start text-md font-bold text-white">{value}</dd>
            </div>
          ))}
        </dl>

        {records.length === 0 ? <p className="text-sm text-muted">{t.calendar.none}</p> : null}

        <div role="grid" aria-label={t.calendar.title} data-testid="calendar">
          <div role="row" className="grid grid-cols-7 gap-1">
            {WEEK.map((index) => (
              <div key={index} role="columnheader" className="caps truncate pb-1 text-center text-2xs font-bold text-muted">
                {t.date.weekdaysShort[index]}
              </div>
            ))}
          </div>
          <div role="row" className="grid grid-cols-7 gap-1">
            {Array.from({ length: leading }, (_, i) => (
              <div key={`blank-${i}`} role="gridcell" aria-hidden />
            ))}
            {Array.from({ length: dayCount }, (_, i) => {
              const day = i + 1;
              const iso = `${month}-${String(day).padStart(2, "0")}`;
              const shifts = byDay.get(iso) ?? {};
              const label = `${formatDate(iso)} — ${t.shift.jour}: ${describe(shifts.jour)}; ${t.shift.nuit}: ${describe(shifts.nuit)}`;
              return (
                <div
                  key={iso}
                  role="gridcell"
                  title={label}
                  data-day={iso}
                  className={cn(
                    "flex min-h-16 flex-col items-center gap-0.5 rounded-chip border bg-canvas px-0.5 py-1",
                    iso === today ? "border-accent" : "border-line",
                  )}
                >
                  <span aria-hidden className="num text-xs font-bold text-muted">
                    {day}
                  </span>
                  <span className="sr-only">{label}</span>
                  {SHIFTS.map((shift) => {
                    const record = shifts[shift];
                    if (!record) return <span key={shift} aria-hidden className="h-[18px]" />;
                    const Icon = STATUS_ICON[record.status];
                    return (
                      <span
                        key={shift}
                        aria-hidden
                        data-shift={shift}
                        data-status={record.status}
                        className={cn("flex h-[18px] w-full max-w-7 items-center justify-center rounded-xs border", STATUS_FILL[record.status])}
                      >
                        <Icon size={12} strokeWidth={3} />
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend: what the colours and the two rows mean. */}
        <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-xs text-body">
          {STATUSES.map((status) => {
            const Icon = STATUS_ICON[status];
            return (
              <li key={status} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("flex size-[18px] items-center justify-center rounded-xs border", STATUS_FILL[status])}>
                  <Icon size={12} strokeWidth={3} />
                </span>
                {t.status[status]}
              </li>
            );
          })}
          <li className="flex items-center gap-1.5">
            <Sun size={14} aria-hidden className="text-muted" />
            <span>{t.shift.jour}</span>
            <span aria-hidden className="text-muted">/</span>
            <Moon size={14} aria-hidden className="text-muted" />
            <span>{t.shift.nuit}</span>
          </li>
        </ul>
      </div>
    </Dialog>
  );
}
