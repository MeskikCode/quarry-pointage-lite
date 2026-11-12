"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n/provider";
import { PAY_TYPES, POSTS, POST_KEYS, type PayType, type Post, type StoredEmployee } from "@/lib/types";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Alert } from "./ui/Feedback";
import { FormField, Input, Select } from "./ui/Field";
import { cn } from "./ui/cn";

interface Props {
  /** The employee to edit, or `null` to register a new one. */
  employee: StoredEmployee | null;
  defaultPost: Post;
  onClose: () => void;
}

type Errors = Partial<Record<"fullName" | "postLabel" | "rate" | "overtimeRate", string>>;

const parseAmount = (text: string) => Number(text.trim().replace(",", "."));

/** Add or edit an employee. Mounted only while open, so its state starts fresh. */
export function EmployeeModal({ employee, defaultPost, onClose }: Props) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [cin, setCin] = useState(employee?.cin ?? "");
  const [post, setPost] = useState<Post>(employee?.post ?? defaultPost);
  const [postLabel, setPostLabel] = useState(employee?.postLabel ?? "");
  const [payType, setPayType] = useState<PayType>(employee?.payType ?? POSTS[defaultPost].payType);
  const [rate, setRate] = useState(employee ? String(employee.rate) : "");
  const [overtimeRate, setOvertimeRate] = useState(employee ? String(employee.overtimeRate) : "0");
  const [active, setActive] = useState(employee?.active ?? true);
  const [errors, setErrors] = useState<Errors>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Choosing a post proposes the way that post is usually paid. The
  // supervisor can still change it: sites differ.
  function choosePost(next: Post) {
    setPost(next);
    setPayType(POSTS[next].payType);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseAmount(rate);
    const overtime = overtimeRate.trim() === "" ? 0 : parseAmount(overtimeRate);
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = t.worker.nameRequired;
    if (post === "autre" && !postLabel.trim()) next.postLabel = t.worker.postLabelRequired;
    if (!rate.trim() || !Number.isFinite(amount) || amount < 0) next.rate = t.worker.rateInvalid;
    if (!Number.isFinite(overtime) || overtime < 0) next.overtimeRate = t.worker.overtimeRateInvalid;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const data = {
      fullName: fullName.trim(),
      cin: cin.trim().toUpperCase() || undefined,
      post,
      postLabel: post === "autre" ? postLabel.trim() : undefined,
      payType,
      rate: Math.round(amount * 100) / 100,
      overtimeRate: Math.round(overtime * 100) / 100,
      active,
    };

    setSaving(true);
    setFailed(false);
    try {
      if (employee) await db.employees.put({ ...data, id: employee.id });
      else await db.employees.add(data);
      onClose();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const formId = "employee-form";

  return (
    <Dialog
      open
      onClose={onClose}
      title={employee ? t.worker.editTitle : t.worker.addTitle}
      closeLabel={t.actions.close}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button type="submit" form={formId} size="field" disabled={saving}>
            {t.actions.save}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failed ? <Alert tone="error">{t.backup.failed}</Alert> : null}

        <FormField label={t.worker.fullName} error={errors.fullName} required>
          {(field) => (
            <Input
              {...field}
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="off"
              dir="auto"
              maxLength={80}
            />
          )}
        </FormField>

        <FormField label={t.worker.post}>
          {(field) => (
            <Select {...field} name="post" value={post} onChange={(e) => choosePost(e.target.value as Post)}>
              {POST_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t.posts[key]}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {post === "autre" ? (
          <FormField label={t.worker.postLabel} hint={t.worker.postLabelHint} error={errors.postLabel} required>
            {(field) => (
              <Input
                {...field}
                name="postLabel"
                value={postLabel}
                onChange={(e) => setPostLabel(e.target.value)}
                autoComplete="off"
                dir="auto"
                maxLength={60}
              />
            )}
          </FormField>
        ) : null}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="caps mb-1.5 text-xs font-semibold text-muted">{t.payType.label}</legend>
          <div className="grid grid-cols-2 gap-2">
            {PAY_TYPES.map((key) => {
              const on = payType === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  data-pay={key}
                  onClick={() => setPayType(key)}
                  className={cn(
                    "press caps min-h-14 rounded-control border-2 px-3 text-md font-bold focus-visible:shadow-focus",
                    on
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-tile-line bg-tile text-white hover:border-accent",
                  )}
                >
                  {t.payType[key]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">{payType === "monthly" ? t.payType.monthlyHint : t.payType.dailyHint}</p>
        </fieldset>

        <div className="grid gap-4 min-[420px]:grid-cols-2">
          <FormField
            label={payType === "monthly" ? t.worker.rateMonthly : t.worker.rateDaily}
            error={errors.rate}
            required
          >
            {(field) => (
              <Input
                {...field}
                name="rate"
                mono
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                maxLength={9}
              />
            )}
          </FormField>

          <FormField label={t.worker.overtimeRate} hint={t.worker.overtimeRateHint} error={errors.overtimeRate}>
            {(field) => (
              <Input
                {...field}
                name="overtimeRate"
                mono
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                maxLength={7}
              />
            )}
          </FormField>
        </div>

        <FormField label={t.worker.cin} hint={t.worker.cinHint}>
          {(field) => (
            <Input
              {...field}
              name="cin"
              mono
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
            />
          )}
        </FormField>

        <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-control border-2 border-tile-line bg-tile p-3">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="mt-0.5 size-6 shrink-0 accent-(--brand-cyan)"
          />
          <span className="min-w-0">
            <span className="block text-md font-semibold text-white">{t.worker.active}</span>
            <span className="block text-xs text-muted">{t.worker.activeHint}</span>
          </span>
        </label>
      </form>
    </Dialog>
  );
}
