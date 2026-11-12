"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  backupFileName,
  createBackup,
  downloadText,
  parseBackup,
  restoreBackup,
  type Backup,
} from "@/lib/backup";
import { db } from "@/lib/db";
import { APP_VERSION } from "@/lib/env";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Alert } from "./ui/Feedback";

type Outcome = "idle" | "exported" | "restored" | "invalid" | "failed";

/** Backup to a file and restore from one. Mounted only while open. */
export function BackupDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const [pending, setPending] = useState<Backup | null>(null);

  async function exportNow() {
    try {
      const backup = await createBackup(db);
      downloadText(JSON.stringify(backup, null, 2), backupFileName());
      setOutcome("exported");
    } catch {
      setOutcome("failed");
    }
  }

  async function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setOutcome("idle");
    } catch {
      setPending(null);
      setOutcome("invalid");
    }
  }

  async function replace() {
    if (!pending) return;
    try {
      await restoreBackup(db, pending);
      setOutcome("restored");
    } catch {
      setOutcome("failed");
    }
    setPending(null);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={pending ? t.backup.confirmTitle : t.backup.title}
      subtitle={pending ? undefined : t.backup.hint}
      closeLabel={t.actions.close}
      footer={
        pending ? (
          <>
            <Button variant="ghost" size="lg" onClick={() => setPending(null)}>
              {t.actions.cancel}
            </Button>
            <Button variant="danger" size="field" onClick={replace}>
              {t.backup.replace}
            </Button>
          </>
        ) : undefined
      }
    >
      {pending ? (
        <Alert tone="warn">{t.backup.confirmBody(pending.employees.length, pending.attendance.length)}</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {outcome === "exported" ? <Alert tone="ok">{t.backup.exported}</Alert> : null}
          {outcome === "restored" ? <Alert tone="ok">{t.backup.restored}</Alert> : null}
          {outcome === "invalid" ? <Alert tone="error">{t.backup.invalid}</Alert> : null}
          {outcome === "failed" ? <Alert tone="error">{t.backup.failed}</Alert> : null}

          <Button size="field" block icon={Download} onClick={exportNow}>
            {t.backup.export}
          </Button>
          <Button size="field" block variant="secondary" icon={Upload} onClick={() => input.current?.click()}>
            {t.backup.import}
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            onChange={readFile}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid="backup-file"
          />

          <p className="mt-2 text-xs text-muted">
            {t.about.privacy}
            <span className="num ms-2">v{APP_VERSION}</span>
          </p>
        </div>
      )}
    </Dialog>
  );
}
