"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  ClipboardCheck,
  FileSpreadsheet,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adjustOvertime,
  markUnmarkedPresent,
  setReason,
  setStatus,
  undoMarkedPresent,
  type Slot,
} from "@/lib/attendance";
import { db } from "@/lib/db";
import { addDays, formatDate, monthOf, todayISO, weekdayOf } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { countShift } from "@/lib/summary";
import { POST_KEYS, SHIFTS, TEAMS, teamOf, type Post, type Shift, type StoredEmployee, type Team } from "@/lib/types";
import { useOnline } from "@/lib/useOnline";
import { AttendanceCard } from "./AttendanceCard";
import { AdvanceDialog } from "./AdvanceDialog";
import { BackupDialog } from "./BackupDialog";
import { EmployeeModal } from "./EmployeeModal";
import { ExportDialog } from "./ExportDialog";
import { FieldStatusBar } from "./FieldStatusBar";
import { LanguageDialog } from "./LanguageDialog";
import { MonthlySummary } from "./MonthlySummary";
import { UpdatePrompt } from "./UpdatePrompt";
import { Button, IconButton } from "./ui/Button";
import { Alert } from "./ui/Feedback";
import { cn } from "./ui/cn";

type TeamFilter = Team | "all";

/** Post proposed when adding an employee from a filtered team. */
const FIRST_POST: Record<TeamFilter, Post> = {
  all: "ouvrier",
  encadrement: "chef_concassage",
  technique: "electricien_operateur",
  conducteurs: "conducteur_chargeuse",
  ouvriers: "ouvrier",
  gardiens: "gardien",
};
type View = "attendance" | "month";

/** What the last "everyone present" tap wrote, for the undo notice. */
interface BulkMark {
  ids: number[];
  /** Date, shift and team the tap applied to. The notice disappears when any of them changes. */
  scope: string;
}

type Panel =
  | { kind: "none" }
  | { kind: "language" }
  | { kind: "export" }
  | { kind: "backup" }
  | { kind: "advance"; employee: StoredEmployee }
  | { kind: "employee"; employee: StoredEmployee | null };

const SEGMENT_ON = "border-accent bg-accent-soft text-accent";
const SEGMENT_OFF = "border-tile-line bg-tile text-white hover:border-accent";

export function AttendanceScreen() {
  const { t, ready } = useI18n();
  const online = useOnline();

  const [date, setDate] = useState(todayISO);
  const [shift, setShift] = useState<Shift>("jour");
  const [team, setTeam] = useState<TeamFilter>("all");
  const [view, setView] = useState<View>("attendance");
  const [month, setMonth] = useState(() => monthOf(todayISO()));
  const [bulk, setBulk] = useState<BulkMark | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const [storageError, setStorageError] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);

  // Ask the browser not to evict the database, and surface a blocked one.
  useEffect(() => {
    db.open().catch(() => setStorageError(true));
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  const employees = useLiveQuery(
    () => db.employees.toArray() as Promise<StoredEmployee[]>,
    [],
  );
  const dayRecords = useLiveQuery(() => db.attendance.where("date").equals(date).toArray(), [date]);

  const records = useMemo(
    () => (dayRecords ?? []).filter((record) => record.shift === shift),
    [dayRecords, shift],
  );
  const recordOf = useMemo(() => new Map(records.map((r) => [r.employeeId, r])), [records]);

  const active = useMemo(() => (employees ?? []).filter((e) => e.active), [employees]);
  const inactiveCount = (employees?.length ?? 0) - active.length;

  const visible = useMemo(() => {
    const pool = showInactive ? (employees ?? []) : active;
    return pool
      .filter((e) => team === "all" || teamOf(e.post) === team)
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          POST_KEYS.indexOf(a.post) - POST_KEYS.indexOf(b.post) ||
          a.fullName.localeCompare(b.fullName, "fr"),
      );
  }, [employees, active, showInactive, team]);

  const counts = useMemo(
    () =>
      countShift(
        active.filter((e) => team === "all" || teamOf(e.post) === team).map((e) => e.id),
        records,
      ),
    [active, team, records],
  );

  const teamTotals = useMemo(() => {
    const totals: Record<TeamFilter, number> = {
      all: active.length,
      encadrement: 0,
      technique: 0,
      conducteurs: 0,
      ouvriers: 0,
      gardiens: 0,
    };
    for (const employee of active) totals[teamOf(employee.post)] += 1;
    return totals;
  }, [active]);

  const write = useCallback((operation: Promise<unknown>) => {
    operation.catch(() => setStorageError(true));
  }, []);

  const slotOf = (employeeId: number): Slot => ({ employeeId, date, shift });
  const scope = `${date}|${shift}|${team}`;
  const undoable = bulk && bulk.scope === scope && bulk.ids.length > 0 ? bulk : null;

  async function markEveryonePresent() {
    const crew = active.filter((e) => team === "all" || teamOf(e.post) === team).map((e) => e.id);
    try {
      const ids = await markUnmarkedPresent(db, crew, date, shift);
      setBulk({ ids, scope });
    } catch {
      setStorageError(true);
    }
  }

  async function undoEveryonePresent() {
    if (!undoable) return;
    try {
      await undoMarkedPresent(db, undoable.ids);
    } catch {
      setStorageError(true);
    }
    setBulk(null);
  }

  function openView(next: View) {
    // The month shown follows the date being worked on.
    if (next === "month") setMonth(monthOf(date));
    setView(next);
  }
  const closePanel = () => setPanel({ kind: "none" });
  const isToday = date === todayISO();
  const loading = employees === undefined || dayRecords === undefined;

  // The page is prerendered at build time. Everything below depends on the
  // device (today's date, its language, its database), so until the device
  // has taken over only the bar is shown, exactly as it was prerendered.
  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col bg-ink">
        <FieldStatusBar online onLanguage={() => undefined} />
        <p role="status" className="caps py-10 text-center text-sm font-semibold text-muted">
          {t.app.loading}
        </p>
      </div>
    );
  }

  // Actions: fixed to the bottom edge on phones and tablets, within thumb
  // reach. On desktop they sit in the toolbar: on their own row at first,
  // beside the date and shift on very wide screens. The cyan primary is the
  // action of the moment: "everyone present" while taking attendance, the
  // export while reading the month.
  const actionBar = (
    <div className="fixed inset-x-0 bottom-0 z-20 min-w-0 border-t-2 border-line bg-ink px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:static lg:z-auto lg:col-span-2 lg:border-0 lg:bg-transparent lg:p-0 2xl:col-span-1">
      <div className="mx-auto flex max-w-[1600px] items-stretch gap-2 lg:justify-end">
        <Button
          size="field"
          variant={view === "month" ? "primary" : "secondary"}
          icon={FileSpreadsheet}
          onClick={() => setPanel({ kind: "export" })}
          className={cn("min-w-0 flex-1 lg:flex-none", view === "attendance" && "border-2")}
        >
          {t.actions.export}
        </Button>
        <Button
          size="field"
          variant="secondary"
          icon={UserPlus}
          onClick={() => setPanel({ kind: "employee", employee: null })}
          aria-label={t.worker.addTitle}
          className="border-2"
        >
          <span className="max-[430px]:sr-only">{t.actions.addWorker}</span>
        </Button>
        <Button
          size="field"
          variant="secondary"
          icon={DatabaseBackup}
          onClick={() => setPanel({ kind: "backup" })}
          aria-label={t.backup.title}
          className="border-2"
        >
          <span className="max-md:sr-only">{t.actions.backup}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <FieldStatusBar online={online} onLanguage={() => setPanel({ kind: "language" })} />
      <UpdatePrompt />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-3 pt-4 pb-safe-bar sm:px-6 lg:px-8 lg:pb-8">
        {storageError ? (
          <Alert
            tone="error"
            title={t.storage.title}
            action={
              <Button variant="danger" size="lg" onClick={() => window.location.reload()}>
                {t.actions.retry}
              </Button>
            }
          >
            {t.storage.body}
          </Alert>
        ) : null}

        {!online ? (
          <Alert tone="warn" title={t.offline.title}>
            {t.offline.body}
          </Alert>
        ) : null}

        <div role="group" aria-label={t.view.label} className="grid grid-cols-2 gap-2 lg:max-w-xl">
          {(
            [
              { key: "attendance", label: t.view.attendance, icon: ClipboardCheck },
              { key: "month", label: t.view.month, icon: Wallet },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              data-view={key}
              onClick={() => openView(key)}
              className={cn(
                "press caps flex min-h-14 items-center justify-center gap-2 rounded-control border-2 px-2 text-base leading-tight font-bold",
                "focus-visible:shadow-focus",
                view === key ? SEGMENT_ON : SEGMENT_OFF,
              )}
            >
              <Icon size={20} aria-hidden className="shrink-0" />
              <span className="min-w-0 break-words">{label}</span>
            </button>
          ))}
        </div>

        {view === "month" ? (
          <>
            <MonthlySummary
              month={month}
              onMonthChange={setMonth}
              employees={employees ?? []}
              onAdvances={(employeeId) => {
                const employee = employees?.find((e) => e.id === employeeId);
                if (employee) setPanel({ kind: "advance", employee });
              }}
            />
            {actionBar}
          </>
        ) : null}

        {/* Date, shift and actions. One column on phones, one row on desktop. */}
        {view === "attendance" ? (
        <>
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center 2xl:grid-cols-[minmax(0,1fr)_18rem_auto]">
          <div className="flex items-center gap-2">
            <IconButton
              icon={ChevronLeft}
              label={t.date.previous}
              variant="outline"
              size="field"
              directional
              onClick={() => setDate((d) => addDays(d, -1))}
            />
            <div className="relative min-w-0 flex-1">
            <input
              ref={dateInput}
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full opacity-0"
            />
            <button
              type="button"
              aria-label={`${t.date.pick} — ${formatDate(date)}`}
              onClick={() => {
                const input = dateInput.current;
                if (!input) return;
                if (typeof input.showPicker === "function") input.showPicker();
                else input.focus();
              }}
              className={cn(
                "press relative flex min-h-14 w-full min-w-0 items-center justify-center gap-3 rounded-control border-2 px-3",
                "focus-visible:shadow-focus",
                isToday ? SEGMENT_ON : SEGMENT_OFF,
              )}
            >
              <CalendarDays size={22} aria-hidden className="shrink-0" />
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="caps max-w-full truncate text-xs font-semibold">
                  {isToday ? t.date.today : t.date.weekdays[weekdayOf(date)]}
                </span>
                <span className="num text-lg font-bold" data-testid="current-date">
                  {formatDate(date)}
                </span>
              </span>
            </button>
            </div>
            <IconButton
              icon={ChevronRight}
              label={t.date.next}
              variant="outline"
              size="field"
              directional
              onClick={() => setDate((d) => addDays(d, 1))}
            />
          </div>

          <div role="group" aria-label={t.shift.label} className="grid grid-cols-2 gap-2">
            {SHIFTS.map((key) => {
              const Icon = key === "jour" ? Sun : Moon;
              const on = shift === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  data-shift={key}
                  onClick={() => setShift(key)}
                  className={cn(
                    "press caps flex min-h-14 items-center justify-center gap-2 rounded-control border-2 px-3 text-md font-bold",
                    "focus-visible:shadow-focus",
                    on ? SEGMENT_ON : SEGMENT_OFF,
                  )}
                >
                  <Icon size={20} aria-hidden className="shrink-0" />
                  {t.shift[key]}
                </button>
              );
            })}
          </div>

          {actionBar}
        </section>

        {/* Team filter: a horizontal scroller on phones, a wrapped row above. */}
        <nav aria-label={t.teams.label}>
          <ul className="scroll-quiet -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {(["all", ...TEAMS] as TeamFilter[]).map((key) => {
              const on = team === key;
              return (
                <li key={key} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    data-team={key}
                    onClick={() => setTeam(key)}
                    className={cn(
                      "press caps flex min-h-12 items-center gap-2 rounded-control border-2 px-4 text-sm font-bold whitespace-nowrap",
                      "focus-visible:shadow-focus",
                      on ? SEGMENT_ON : SEGMENT_OFF,
                    )}
                  >
                    {t.teams[key]}
                    <span className="num text-xs font-medium opacity-80">{teamTotals[key]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Shift summary. */}
        <dl className="grid grid-cols-3 gap-2 sm:gap-3" aria-live="polite">
          {(
            [
              { label: t.counts.present, value: counts.present + counts.late + counts.halfDay, dot: "bg-ok", id: "present" },
              { label: t.counts.absent, value: counts.absent, dot: "bg-danger", id: "absent" },
              { label: t.counts.unmarked, value: counts.unmarked, dot: "bg-muted", id: "unmarked" },
            ] as const
          ).map((item) => (
            <div key={item.id} className="rounded-panel border border-tile-line bg-tile px-3 py-2 sm:px-4 sm:py-3">
              <dt className="caps flex items-start gap-1.5 text-2xs leading-tight font-bold text-muted sm:text-xs">
                <span aria-hidden className={cn("mt-[0.35em] size-1.5 shrink-0 rounded-full", item.dot)} />
                <span className="min-w-0 break-words">{item.label}</span>
              </dt>
              <dd className="num text-start text-2xl leading-tight font-bold text-white" data-count={item.id}>
                {loading ? "–" : item.value}
              </dd>
            </div>
          ))}
        </dl>

        {undoable ? (
          <Alert
            tone="ok"
            action={
              <Button variant="outline" size="lg" onClick={undoEveryonePresent}>
                {t.bulk.undo}
              </Button>
            }
          >
            <span data-testid="bulk-done">{t.bulk.done(undoable.ids.length)}</span>
          </Alert>
        ) : null}

        {!loading && counts.unmarked > 0 ? (
          <Button size="field" block icon={CheckCheck} onClick={markEveryonePresent} data-action="all-present">
            {t.bulk.allPresent}
            <span className="num font-medium opacity-80">({counts.unmarked})</span>
          </Button>
        ) : null}

        {inactiveCount > 0 ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-body">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-6 shrink-0 accent-(--brand-cyan)"
            />
            <span>
              {t.worker.showInactive} <span className="num text-muted">({inactiveCount})</span>
            </span>
          </label>
        ) : null}

        {/* Workers: one column on phones, up to four on wide screens. */}
        {loading ? (
          <p role="status" className="caps py-10 text-center text-sm font-semibold text-muted">
            {t.app.loading}
          </p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-panel border border-line px-4 py-10 text-center">
            <p className="text-base text-body">{t.empty.team}</p>
            <Button
              variant="outline"
              size="lg"
              icon={UserPlus}
              onClick={() => setPanel({ kind: "employee", employee: null })}
            >
              {t.worker.addTitle}
            </Button>
          </div>
        ) : (
          <ul className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1680px]:grid-cols-4">
            {visible.map((employee) => (
              <li key={employee.id}>
                <AttendanceCard
                  employee={employee}
                  record={recordOf.get(employee.id)}
                  onStatus={(status) => write(setStatus(db, slotOf(employee.id), status))}
                  onReason={(reason) => write(setReason(db, slotOf(employee.id), reason))}
                  onOvertime={(delta) => write(adjustOvertime(db, slotOf(employee.id), delta))}
                  onEdit={() => setPanel({ kind: "employee", employee })}
                />
              </li>
            ))}
          </ul>
        )}

        </>
        ) : null}

        <footer className="mt-auto flex flex-col gap-1 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <ShieldCheck size={15} aria-hidden className="shrink-0 text-accent" />
            {t.about.privacy}
          </p>
          <p>
            {t.about.madeBy}
            <span aria-hidden> · </span>
            {t.about.tagline}
          </p>
        </footer>
      </main>

      <LanguageDialog open={panel.kind === "language"} onClose={closePanel} />
      {panel.kind === "export" ? <ExportDialog initialMonth={view === "month" ? month : monthOf(date)} onClose={closePanel} /> : null}
      {panel.kind === "backup" ? <BackupDialog onClose={closePanel} /> : null}
      {panel.kind === "advance" ? (
        <AdvanceDialog key={panel.employee.id} employee={panel.employee} month={month} onClose={closePanel} />
      ) : null}
      {panel.kind === "employee" ? (
        <EmployeeModal
          key={panel.employee?.id ?? "new"}
          employee={panel.employee}
          defaultPost={FIRST_POST[team]}
          onClose={closePanel}
        />
      ) : null}
    </div>
  );
}
