"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { db } from "@/lib/db";
import { postName } from "@/lib/export";
import { addMonths, formatDays, formatMonth, formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { summariseMonth } from "@/lib/summary";
import type { StoredEmployee } from "@/lib/types";
import { IconButton } from "./ui/Button";
import { Alert, Badge } from "./ui/Feedback";

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  employees: StoredEmployee[];
}

/**
 * The month at a glance, per employee: days worked, absences, overtime and
 * the pay due. This is what the owner or the accountant reads; the Excel
 * export carries the same figures in more detail.
 */
export function MonthlySummary({ month, onMonthChange, employees }: Props) {
  const { t } = useI18n();

  const records = useLiveQuery(
    () => db.attendance.where("date").between(`${month}-01`, `${month}-31`, true, true).toArray(),
    [month],
  );

  const rows = useMemo(() => summariseMonth(employees, records ?? [], month), [employees, records, month]);

  const totals = useMemo(
    () => ({
      pay: rows.reduce((sum, row) => sum + row.estimatedPay, 0),
      days: rows.reduce((sum, row) => sum + row.daysWorked, 0),
      absences: rows.reduce((sum, row) => sum + row.absentUnjustified + row.absentSick + row.absentAuthorised, 0),
      overtime: rows.reduce((sum, row) => sum + row.overtimeHours, 0),
    }),
    [rows],
  );

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
          <span className="num text-3xl leading-tight font-bold text-white">{formatNumber(totals.pay, 2)}</span>
          <span className="num text-md font-medium text-muted">MAD</span>
        </p>
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
                    <h3 className="text-md leading-snug font-bold break-words text-white" dir="auto">
                      {row.fullName}
                    </h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                      <span dir="auto">{postName(row, t)}</span>
                      <Badge tone={row.payType === "monthly" ? "brand" : "neutral"}>{t.payType[row.payType]}</Badge>
                    </p>
                  </div>
                  <p className="shrink-0 text-end" data-pay>
                    <span className="caps block text-2xs font-bold text-muted">{t.month.pay}</span>
                    <span className="num text-lg leading-tight font-bold text-accent">
                      {formatNumber(row.estimatedPay, 2)}
                    </span>
                  </p>
                </header>
                <dl className="grid grid-cols-3 gap-2 border-t border-line pt-2.5">
                  <Stat label={t.sheet.daysWorked} value={formatDays(row.daysWorked)} />
                  <Stat label={t.month.absences} value={formatNumber(absences)} />
                  <Stat label={t.overtime.label} value={`${formatNumber(row.overtimeHours)} ${t.overtime.unit}`} />
                </dl>
              </article>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">{t.month.note}</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-between gap-0.5">
      <dt className="caps text-2xs leading-tight font-bold text-muted">{label}</dt>
      <dd className="num text-start text-md font-bold text-white">{value}</dd>
    </div>
  );
}
