"use client";

import { Check, Clock, Contrast, Minus, Pencil, Plus, X, type LucideIcon } from "lucide-react";
import { postName } from "@/lib/export";
import { useI18n } from "@/lib/i18n/provider";
import {
  ABSENCE_REASONS,
  MAX_OVERTIME_HOURS,
  STATUSES,
  type AbsenceReason,
  type AttendanceRecord,
  type Status,
  type StoredEmployee,
} from "@/lib/types";
import { Badge } from "./ui/Feedback";
import { IconButton } from "./ui/Button";
import { cn } from "./ui/cn";

const STATUS_ICON: Record<Status, LucideIcon> = {
  present: Check,
  half_day: Contrast,
  late: Clock,
  absent: X,
};

/** Selected state per status, in the design system's status colours. */
const STATUS_ON: Record<Status, string> = {
  present: "border-ok bg-ok text-ink",
  half_day: "border-info bg-info text-ink",
  late: "border-warn bg-warn text-ink",
  absent: "border-danger bg-danger text-white",
};

const TILE_OFF = "border-tile-line bg-tile text-white hover:border-accent";

interface Props {
  employee: StoredEmployee;
  record: AttendanceRecord | undefined;
  onStatus: (status: Status) => void;
  onReason: (reason: Exclude<AbsenceReason, "none">) => void;
  onOvertime: (delta: number) => void;
  onEdit: () => void;
}

export function AttendanceCard({ employee, record, onStatus, onReason, onOvertime, onEdit }: Props) {
  const { t } = useI18n();
  const status = record?.status;
  const overtime = record?.overtimeHours ?? 0;

  return (
    <article
      aria-label={employee.fullName}
      className={cn(
        "flex flex-col gap-3 rounded-panel border border-line bg-canvas p-3 sm:p-4",
        !employee.active && "opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-bold break-words text-white" dir="auto">
            {employee.fullName}
          </h3>
          <p className="mt-0.5 text-sm text-muted" dir="auto">
            {postName(employee, t)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={employee.payType === "monthly" ? "brand" : "neutral"}>{t.payType[employee.payType]}</Badge>
            {employee.cin ? <span className="num text-xs text-muted">{employee.cin}</span> : null}
            {!employee.active ? <Badge tone="warn">{t.worker.inactive}</Badge> : null}
          </div>
        </div>
        <IconButton
          icon={Pencil}
          label={`${t.actions.edit} — ${employee.fullName}`}
          onClick={onEdit}
          className="-me-1 -mt-1"
        />
      </header>

      {employee.active ? (
        <>
          <div role="group" aria-label={t.sheet.status} className="grid grid-cols-2 gap-2">
            {STATUSES.map((key) => {
              const Icon = STATUS_ICON[key];
              const on = status === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  data-status={key}
                  onClick={() => onStatus(key)}
                  className={cn(
                    "press caps flex min-h-14 items-center justify-center gap-2 rounded-control border-2 px-2 py-1.5",
                    "text-base leading-tight font-bold focus-visible:shadow-focus",
                    on ? STATUS_ON[key] : TILE_OFF,
                  )}
                >
                  <Icon size={20} strokeWidth={2.5} aria-hidden className="shrink-0" />
                  <span>{t.status[key]}</span>
                </button>
              );
            })}
          </div>

          {status === "absent" ? (
            <div role="group" aria-label={t.reason.label} className="flex flex-col gap-1.5">
              <p className="caps text-xs font-semibold text-muted">{t.reason.label}</p>
              {/* Three across where the labels fit; they wrap onto more rows
                  in longer languages rather than clip. */}
              <div className="flex flex-wrap gap-2">
                {ABSENCE_REASONS.map((key) => {
                  const on = record?.reason === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      data-reason={key}
                      onClick={() => onReason(key)}
                      className={cn(
                        "press caps min-h-12 flex-1 rounded-chip border-2 px-3 py-1 text-xs leading-tight font-bold whitespace-nowrap",
                        "focus-visible:shadow-focus",
                        on ? "border-white bg-white text-ink" : TILE_OFF,
                      )}
                    >
                      {t.reason[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {status && status !== "absent" ? (
            <div className="flex items-center justify-between gap-3">
              <p className="caps text-xs font-semibold text-muted">{t.overtime.label}</p>
              <div className="flex items-center gap-2">
                <IconButton
                  icon={Minus}
                  label={t.overtime.remove}
                  variant="outline"
                  size="lg"
                  disabled={overtime <= 0}
                  onClick={() => onOvertime(-1)}
                />
                <output
                  aria-label={t.overtime.label}
                  data-overtime
                  className={cn("num min-w-14 text-center text-xl font-bold", overtime > 0 ? "text-accent" : "text-muted")}
                >
                  {overtime}
                  <span className="text-sm font-medium"> {t.overtime.unit}</span>
                </output>
                <IconButton
                  icon={Plus}
                  label={t.overtime.add}
                  variant="outline"
                  size="lg"
                  disabled={overtime >= MAX_OVERTIME_HOURS}
                  onClick={() => onOvertime(1)}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
