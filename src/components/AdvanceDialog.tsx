"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  MAX_NOTE_LENGTH,
  addAdvance,
  advancesOfMonth,
  deleteAdvance,
  totalOf,
  validateAdvance,
  type AdvanceErrors,
} from "@/lib/advances";
import { db } from "@/lib/db";
import { formatDate, formatMonth, formatNumber, lastDayOfMonth, monthOf, parseAmount, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import type { StoredAdvance, StoredEmployee } from "@/lib/types";
import { Button, IconButton } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Alert } from "./ui/Feedback";
import { FormField, Input } from "./ui/Field";

interface Props {
  employee: StoredEmployee;
  /** The month being read, `YYYY-MM`. An advance belongs to the month of its date. */
  month: string;
  onClose: () => void;
}

/**
 * The advances (avances) of one employee for one month: what has been handed
 * over so far, and a form to add the next one. Mounted only while open.
 */
export function AdvanceDialog({ employee, month, onClose }: Props) {
  const { t } = useI18n();
  const stored = useLiveQuery(
    () => db.advances.where("employeeId").equals(employee.id).toArray() as Promise<StoredAdvance[]>,
    [employee.id],
  );
  const list = useMemo(() => advancesOfMonth(stored ?? [], month), [stored, month]);
  const total = totalOf(list);

  const today = todayISO();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(monthOf(today) === month ? today : `${month}-01`);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<AdvanceErrors>({});
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { employeeId: employee.id, date, amount: parseAmount(amount), note: note.trim() || undefined };
    const found = validateAdvance(input, month);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await addAdvance(db, input);
      setAmount("");
      setNote("");
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  async function remove(id: number) {
    try {
      await deleteAdvance(db, id);
      setConfirming(null);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t.advance.title}
      subtitle={`${employee.fullName} · ${formatMonth(month)}`}
      closeLabel={t.actions.close}
      footer={
        <Button variant="secondary" size="lg" onClick={onClose} className="border-2">
          {t.actions.close}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {failed ? <Alert tone="error">{t.backup.failed}</Alert> : null}

        <section aria-label={t.advance.title} className="flex flex-col gap-2">
          {list.length === 0 ? (
            <p className="text-sm text-muted" data-testid="advance-empty">
              {t.advance.empty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((advance) => (
                <li
                  key={advance.id}
                  data-advance
                  className="rounded-control border-2 border-tile-line bg-tile p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="num text-sm font-bold text-white">{formatDate(advance.date)}</p>
                      {advance.note ? (
                        <p className="text-sm break-words text-muted" dir="auto">
                          {advance.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="num text-md font-bold text-white" data-amount>
                        {formatNumber(advance.amount, 2)}
                      </span>
                      <IconButton
                        icon={Trash2}
                        label={t.advance.remove}
                        onClick={() => setConfirming(confirming === advance.id ? null : advance.id)}
                      />
                    </div>
                  </div>
                  {confirming === advance.id ? (
                    <div className="mt-2 grid gap-2 min-[420px]:grid-cols-2">
                      <Button variant="danger" size="lg" data-advance-confirm onClick={() => remove(advance.id)}>
                        {t.advance.confirmRemove}
                      </Button>
                      <Button variant="ghost" size="lg" onClick={() => setConfirming(null)}>
                        {t.actions.cancel}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {list.length > 0 ? (
            <p className="flex items-baseline justify-between gap-3 border-t border-line pt-2" data-testid="advance-total">
              <span className="caps text-xs font-bold text-muted">{t.advance.total}</span>
              <span className="num text-lg font-bold text-accent">{formatNumber(total, 2)}</span>
            </p>
          ) : null}
        </section>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-line pt-4">
          <div className="grid gap-4 min-[420px]:grid-cols-2">
            <FormField label={t.advance.amount} error={errors.amount ? t.advance.amountInvalid : undefined} required>
              {(field) => (
                <Input
                  {...field}
                  name="amount"
                  mono
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={10}
                />
              )}
            </FormField>
            <FormField label={t.advance.date} error={errors.date ? t.advance.dateInvalid : undefined} required>
              {(field) => (
                <Input
                  {...field}
                  name="date"
                  type="date"
                  mono
                  value={date}
                  min={`${month}-01`}
                  max={lastDayOfMonth(month)}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </FormField>
          </div>
          <FormField label={t.advance.note} hint={t.advance.noteHint}>
            {(field) => (
              <Input
                {...field}
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoComplete="off"
                dir="auto"
                maxLength={MAX_NOTE_LENGTH}
              />
            )}
          </FormField>
          <Button type="submit" size="field" icon={Plus} block>
            {t.advance.add}
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
