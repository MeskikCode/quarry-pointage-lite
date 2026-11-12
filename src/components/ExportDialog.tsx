"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { db } from "@/lib/db";
import { buildExportTables, buildWorkbook, downloadWorkbook, exportFileName } from "@/lib/export";
import { useI18n } from "@/lib/i18n/provider";
import type { StoredEmployee } from "@/lib/types";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Alert } from "./ui/Feedback";
import { FormField, Input } from "./ui/Field";

type Outcome = "idle" | "working" | "done" | "empty" | "failed";

/** Monthly Excel export. Mounted only while open. */
export function ExportDialog({ initialMonth, onClose }: { initialMonth: string; onClose: () => void }) {
  const { t, dir } = useI18n();
  const [month, setMonth] = useState(initialMonth);
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);

  async function run() {
    if (!valid) return;
    setOutcome("working");
    try {
      const [employees, records] = await Promise.all([
        db.employees.toArray() as Promise<StoredEmployee[]>,
        db.attendance.where("date").between(`${month}-01`, `${month}-31`, true, true).toArray(),
      ]);
      const tables = buildExportTables(employees, records, month, t);
      if (tables.recordCount === 0) {
        setOutcome("empty");
        return;
      }
      const workbook = await buildWorkbook(tables, t, dir === "rtl");
      await downloadWorkbook(workbook, exportFileName(t, month));
      setOutcome("done");
    } catch {
      setOutcome("failed");
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t.export.title}
      subtitle={t.export.hint}
      closeLabel={t.actions.close}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            {t.actions.close}
          </Button>
          <Button size="field" icon={Download} onClick={run} disabled={!valid || outcome === "working"}>
            {t.export.download}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label={t.export.month}>
          {(field) => (
            <Input
              {...field}
              type="month"
              mono
              value={month}
              placeholder="2026-11"
              onChange={(e) => {
                setMonth(e.target.value);
                setOutcome("idle");
              }}
            />
          )}
        </FormField>
        {outcome === "done" ? <Alert tone="ok">{t.export.done}</Alert> : null}
        {outcome === "empty" ? <Alert tone="warn">{t.export.empty}</Alert> : null}
        {outcome === "failed" ? <Alert tone="error">{t.export.failed}</Alert> : null}
      </div>
    </Dialog>
  );
}
