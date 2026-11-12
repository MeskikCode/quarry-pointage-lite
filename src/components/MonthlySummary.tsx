"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, HandCoins, Plus } from "lucide-react";
import { useMemo } from "react";
import { db } from "@/lib/db";
import { postName } from "@/lib/export";
import { addMonths, formatDays, formatMonth, formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { summariseMonth } from "@/lib/summary";
import type { StoredEmployee } from "@/lib/types";
import { IconButton } from "./ui/Button";
import { Alert, Badge } from "./ui/Feedback";
import { cn } from "./ui/cn";

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  employees: StoredEmployee[];
  /** Open the advances of one employee. */
  onAdvances: (employeeId: number) => void;
  /** Open the day-by-day calendar of one employee. */
  onCalendar: (employeeId: number) => void;
}

/** A minus sign, not a hyphen: it reads as a deduction. */
const deduction = (amount: number) => `−${formatNumber(amount, 2)}`;

/**
 * The month at a glance, per employee: days worked, absences, overtime,
 * advances and what is left to pay. This is what the owner or the accountant
 * reads; the Excel export carries the same figures in more detail.
 */
export function MonthlySummary({ month, onMonthChange, employees, onAdvances, onCalendar }: Props) {
  const { t } = useI18n();

  const records = useLiveQuery(
    () => db.attendance.where("date").between(`${month}-01`, `${month}-31`, true, true).toArray(),
    [month],
  );
  const advances = useLiveQuery(
    () => db.advances.where("date").between(`${month}-01`, `${month}-31`, true, true).toArray(),
    [month],
  );

  const rows = useMemo(
    () => summariseMonth(employees, records ?? [], month, advances ?? []),
    [employees, records, advances, month],
  );

  const totals = useMemo(() => {
    const sum = (pick: (row: (typeof rows)[number]) => number) =>
      Math.round(rows.reduce((total, row) => total + pick(row), 0) * 100) / 100;
    return {
      balance: sum((row) => row.balance),
      gross: sum((row) => row.estimatedPay),
      advances: sum((row) => row.advances),
      days: sum((row) => row.daysWorked),
      absences: sum((row) => row.absentUnjustified + row.absentSick + row.absentAuthorised),
      overtime: sum((row) => row.overtimeHours),
    };
  }, [rows]);

  return (
    <section aria-label={t.month.title} className="flex flex-col gap-4">
      <div className="flex items-center gap-2 lg:max-w-xl">
        <IconButton
          icon={ChevronLeft}
          label={t.month.previous}
          variant="outline"
          size="field"
          directional
          onClick={() => onMonthChange(addMonths(month, -1))}
        />
        <div className="flex min-h-14 min-w-0 flex-1 items-center justify-center gap-3 rounded-control border-2 border-accent bg-accent-soft px-3 text-accent">
          <CalendarRange size={22} aria-hidden className="shrink-0" />
          <span className="num text-lg font-bold" data-testid="current-month">
            {formatMonth(month)}
          </span>
        </div>
        <IconButton
          icon={ChevronRight}
          label={t.month.next}
          variant="outline"
          size="field"
          directional
          onClick={() => onMonthChange(addMonths(month, 1))}
        />
      </div>

      {/* The figure that matters most, then the totals behind it. */}
      <div className="rounded-panel border-2 border-tile-line bg-tile p-4">
        <p className="caps text-xs font-bold text-muted">{t.month.totalPay}</p>
        {/* An amount and its currency always read left to right; in Arabic the
            line is still aligned to the reading edge. */}
        <p className="mt-1 flex items-baseline gap-2 rtl:justify-end" dir="ltr" data-testid="month-total">
          <span className={cn("num text-3xl leading-tight font-bold", totals.balance < 0 ? "text-danger" : "text-white")}>
            {formatNumber(totals.balance, 2)}
          </span>
          <span className="num text-md font-medium text-muted">MAD</span>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <Stat label={t.month.gross} value={formatNumber(totals.gross, 2)} testId="month-gross" />
          <Stat
            label={t.month.advances}
            value={totals.advances > 0 ? deduction(totals.advances) : formatNumber(0, 2)}
            testId="month-advances"
          />
        </dl>
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <Stat label={t.sheet.daysWorked} value={formatDays(totals.days)} />
          <Stat label={t.month.absences} value={formatNumber(totals.absences)} />
          <Stat label={t.overtime.label} value={`${formatNumber(totals.overtime)} ${t.overtime.unit}`} />
        </dl>
      </div>

      {records !== undefined && records.length === 0 ? <Alert tone="info">{t.month.empty}</Alert> : null}

      <ul className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1680px]:grid-cols-4">
        {rows.map((row) => {
          const absences = row.absentUnjustified + row.absentSick + row.absentAuthorised;
          return (
            <li key={row.employeeId}>
              <article
                aria-label={row.fullName}
                data-month-row={row.fullName}
                className="@container flex flex-col gap-3 rounded-panel border border-line bg-canvas p-3"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-md leading-snug font-bold break-words text-white" dir="auto">
                      {row.fullName}
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                      <span dir="auto">{postName(row, t)}</span>
                      <Badge tone={row.payType === "monthly" ? "brand" : "neutral"}>{t.payType[row.payType]}</Badge>
                    </p>
                  </div>
                  <p className="shrink-0 text-end" data-pay>
                    <span className="caps block text-2xs font-bold text-muted">{t.month.pay}</span>
                    <span
                      className={cn(
                        "num text-lg leading-tight font-bold",
                        row.balance < 0 ? "text-danger" : "text-accent",
                      )}
                    >
                      {formatNumber(row.balance, 2)}
                    </span>
                    {row.advances > 0 ? (
                      <span className="num block text-2xs text-muted">
                        {t.month.gross} {formatNumber(row.estimatedPay, 2)}
                      </span>
                    ) : null}
                  </p>
                </header>
                <dl className="grid grid-cols-3 gap-2 border-t border-line pt-2.5">
                  <Stat label={t.sheet.daysWorked} value={formatDays(row.daysWorked)} />
                  <Stat label={t.month.absences} value={formatNumber(absences)} />
                  <Stat label={t.overtime.label} value={`${formatNumber(row.overtimeHours)} ${t.overtime.unit}`} />
                </dl>
                <div className="flex gap-2">
                <IconButton
                  icon={CalendarDays}
                  label={`${t.calendar.open} — ${row.fullName}`}
                  variant="outline"
                  size="lg"
                  data-calendar-open={row.fullName}
                  onClick={() => onCalendar(row.employeeId)}
                />
                <button
                  type="button"
                  data-advances-open={row.fullName}
                  onClick={() => onAdvances(row.employeeId)}
                  className="press flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-control border-2 border-tile-line bg-tile px-3 text-start hover:border-accent focus-visible:shadow-focus"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <HandCoins size={18} aria-hidden className="shrink-0 text-accent" />
                    <span className="caps text-xs font-bold text-muted">{t.advance.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      data-advance-amount
                      className={cn("num text-md font-bold", row.advances > 0 ? "text-white" : "text-muted")}
                    >
                      {row.advances > 0 ? deduction(row.advances) : formatNumber(0, 2)}
                    </span>
                    <Plus size={18} aria-hidden className="shrink-0 text-accent" />
                  </span>
                  {/* Read after the visible text, so that the spoken name starts with what is shown. */}
                  <span className="sr-only"> — {row.fullName}</span>
                </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">{t.month.note}</p>
    </section>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-between gap-0.5">
      <dt className="caps text-2xs leading-tight font-bold text-muted">{label}</dt>
      <dd className="num text-start text-md font-bold text-white" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
