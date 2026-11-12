"use client";

import { Globe, Wifi, WifiOff } from "lucide-react";
import { asset } from "@/lib/env";
import { useI18n } from "@/lib/i18n/provider";
import { IconButton } from "./ui/Button";
import { cn } from "./ui/cn";

interface Props {
  online: boolean;
  onLanguage: () => void;
}

/**
 * MUBCS FieldStatusBar: pinned, on the field ink. The bottom rule is cyan
 * when connected and red when not. Offline is a normal state here, not an
 * error, so the bar only reports it.
 */
export function FieldStatusBar({ online, onLanguage }: Props) {
  const { t } = useI18n();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b-2 bg-ink pt-[env(safe-area-inset-top)] text-white",
        online ? "border-accent" : "border-danger",
      )}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-[1600px] items-center justify-between gap-3 ps-4 pe-2 sm:ps-6 sm:pe-4 lg:ps-8 lg:pe-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export: a plain image, already sized */}
          <img
            src={asset("/brand/mark.png")}
            alt="MeskikCode"
            width={40}
            height={22}
            className="h-[22px] w-auto shrink-0"
          />
          <h1 className="caps truncate text-base font-bold" dir="ltr">
            {t.app.name}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <p
            role="status"
            className={cn(
              "flex items-center gap-1.5 font-num text-xs",
              online ? "text-accent" : "text-danger",
            )}
          >
            {online ? <Wifi size={16} aria-hidden /> : <WifiOff size={16} aria-hidden />}
            <span className={cn(online && "max-[380px]:sr-only")}>
              {online ? t.app.online : t.app.offline}
            </span>
          </p>
          <IconButton icon={Globe} label={t.app.language} onClick={onLanguage} size="lg" />
        </div>
      </div>
    </header>
  );
}
