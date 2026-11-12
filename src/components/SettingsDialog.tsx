"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { db } from "@/lib/db";
import { eraseAllData } from "@/lib/employees";
import { useI18n } from "@/lib/i18n/provider";
import { MAX_SITE_NAME, readSiteName, writeSiteName } from "@/lib/settings";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { Alert } from "./ui/Feedback";
import { FormField, Input } from "./ui/Field";

interface Props {
  onClose: () => void;
  install: { canInstall: boolean; installed: boolean; install: () => Promise<void> };
}

/** The site's name, installing the application, and starting from an empty list. */
export function SettingsDialog({ onClose, install }: Props) {
  const { t } = useI18n();
  const stored = useLiveQuery(() => readSiteName(db), []);
  // `null` until the person types: the field shows the stored name until then.
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [erased, setErased] = useState(false);

  const value = draft ?? stored ?? "";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await writeSiteName(db, value);
      setDraft(null);
      setSaved(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  async function erase() {
    try {
      await eraseAllData(db);
      setConfirmErase(false);
      setErased(true);
      setDraft(null);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t.settings.title}
      closeLabel={t.actions.close}
      footer={
        <Button variant="secondary" size="lg" onClick={onClose} className="border-2">
          {t.actions.close}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {failed ? <Alert tone="error">{t.backup.failed}</Alert> : null}

        <form onSubmit={save} noValidate className="flex flex-col gap-3">
          <FormField label={t.settings.siteName} hint={t.settings.siteNameHint}>
            {(field) => (
              <Input
                {...field}
                name="siteName"
                value={value}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaved(false);
                }}
                autoComplete="off"
                dir="auto"
                maxLength={MAX_SITE_NAME}
              />
            )}
          </FormField>
          {saved ? <Alert tone="ok">{t.settings.saved}</Alert> : null}
          <Button type="submit" size="lg" variant="secondary" className="border-2">
            {t.settings.save}
          </Button>
        </form>

        <section aria-label={t.settings.install} className="flex flex-col gap-2 border-t border-line pt-4">
          {install.installed ? (
            <Alert tone="ok">{t.settings.installed}</Alert>
          ) : install.canInstall ? (
            <>
              <Button size="field" block icon={Download} onClick={() => void install.install()} data-action="install">
                {t.settings.install}
              </Button>
              <p className="text-xs text-muted">{t.settings.installHint}</p>
            </>
          ) : (
            <>
              <p className="caps text-xs font-bold text-muted">{t.settings.install}</p>
              <p className="text-sm text-body">{t.settings.installHint}</p>
              <p className="text-sm text-body">{t.settings.installManual}</p>
            </>
          )}
        </section>

        <section aria-label={t.settings.erase} className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm text-body">{t.settings.eraseHint}</p>
          {erased ? <Alert tone="ok">{t.settings.erased}</Alert> : null}
          {confirmErase ? (
            <div className="grid gap-2 min-[420px]:grid-cols-2">
              <Button variant="danger" size="lg" onClick={erase} data-action="erase-confirm">
                {t.settings.eraseConfirm}
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setConfirmErase(false)}>
                {t.actions.cancel}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              icon={Trash2}
              onClick={() => {
                setConfirmErase(true);
                setErased(false);
              }}
              className="border-2"
              data-action="erase"
            >
              {t.settings.erase}
            </Button>
          )}
        </section>
      </div>
    </Dialog>
  );
}
