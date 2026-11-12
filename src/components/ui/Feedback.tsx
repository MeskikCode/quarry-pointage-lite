import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

/** MUBCS Alert and Badge (DESIGN/components/feedback/Alert.jsx, core/Badge.jsx). */

type Tone = "info" | "ok" | "warn" | "error";

const ALERT: Record<Tone, { box: string; icon: LucideIcon }> = {
  info: { box: "border-accent/35 bg-info-soft text-info-ink", icon: Info },
  ok: { box: "border-ok/30 bg-ok-soft text-ok-ink", icon: CircleCheck },
  warn: { box: "border-warn/35 bg-warn-soft text-warn-ink", icon: TriangleAlert },
  error: { box: "border-danger/30 bg-danger-soft text-danger-ink", icon: OctagonAlert },
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Light surface on the dark canvas, as in the field kit. `role` announces
 * errors immediately and everything else politely. */
export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const { box, icon: Icon } = ALERT[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-panel border px-4 py-3", box, className)}
    >
      <Icon size={17} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-base font-semibold">{title}</p> : null}
        {children ? <p className="text-sm opacity-90">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "neutral" | "brand" | "ok" | "warn" | "error";

const BADGE: Record<BadgeTone, string> = {
  neutral: "border-tile-line bg-tile text-body",
  brand: "border-accent/35 bg-accent-soft text-accent",
  ok: "border-ok/30 bg-ok-soft text-ok-ink",
  warn: "border-warn/35 bg-warn-soft text-warn-ink",
  error: "border-danger/30 bg-danger-soft text-danger-ink",
};

/** Squared chip, never a pill. */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "caps inline-flex min-h-[22px] items-center gap-1.5 rounded-chip border px-2 text-2xs font-semibold",
        BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
