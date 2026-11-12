"use client";

import { Check } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/provider";
import { Dialog } from "./ui/Dialog";
import { cn } from "./ui/cn";

/** Five 56px rows, each language written in its own name and script. */
export function LanguageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t.app.language} closeLabel={t.actions.close}>
      <ul className="flex flex-col gap-2">
        {LANGUAGES.map((language) => {
          const on = language.code === lang;
          return (
            <li key={language.code}>
              <button
                type="button"
                lang={language.code}
                dir={language.dir}
                aria-pressed={on}
                data-lang={language.code}
                onClick={() => {
                  setLang(language.code);
                  onClose();
                }}
                className={cn(
                  "press flex min-h-14 w-full items-center justify-between gap-3 rounded-control border-2 px-4",
                  "text-lg font-semibold focus-visible:shadow-focus",
                  on
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-tile-line bg-tile text-white hover:border-accent",
                  language.code === "ar" && "font-[family-name:var(--font-arabic)]",
                  language.code === "zgh" && "font-[family-name:var(--font-tifinagh)]",
                  (language.code === "fr" || language.code === "en" || language.code === "es") &&
                    "font-[family-name:var(--font-sans)]",
                )}
              >
                <span>{language.name}</span>
                {on ? <Check size={22} strokeWidth={2.5} aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
