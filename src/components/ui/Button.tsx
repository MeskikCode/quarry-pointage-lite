import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

/** MUBCS Button and IconButton, ported to Tailwind over the design tokens.
 * Variants and sizes follow DESIGN/components/core/Button.jsx. */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "field";

const BASE =
  "inline-flex items-center justify-center rounded-control border font-semibold " +
  "disabled:opacity-45 focus-visible:shadow-focus";

const VARIANTS: Record<Variant, string> = {
  primary:
    "border-transparent bg-accent text-on-accent hover:bg-accent-deep hover:shadow-glow active:bg-accent-press",
  secondary: "border-tile-line bg-tile text-white hover:bg-line active:bg-line",
  outline: "border-accent bg-transparent text-accent hover:bg-accent-soft active:bg-accent-soft",
  ghost: "border-transparent bg-transparent text-muted hover:bg-tile active:bg-line",
  danger:
    "border-transparent bg-danger text-white hover:bg-danger-hover active:bg-danger-press",
};

const SIZES: Record<Size, { box: string; icon: number }> = {
  sm: { box: "t-control h-[30px] gap-1.5 px-2.5 text-sm whitespace-nowrap", icon: 14 },
  md: { box: "t-control h-[38px] gap-2 px-3.5 text-base whitespace-nowrap", icon: 16 },
  lg: { box: "t-control min-h-[46px] gap-2.5 px-5 text-md", icon: 18 },
  // 56px gloved target. The label may wrap in long languages; it never clips.
  field: { box: "press caps min-h-14 gap-3 px-4 py-2 text-md leading-tight sm:px-6 sm:text-lg", icon: 22 },
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  block,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const s = SIZES[size];
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], s.box, block && "flex w-full", className)}
      {...rest}
    >
      {Icon ? <Icon size={s.icon} strokeWidth={size === "field" ? 2.25 : 2} aria-hidden className="shrink-0" /> : null}
      {children}
    </button>
  );
}

type IconSize = "md" | "lg" | "field";

const ICON_SIZES: Record<IconSize, { box: string; icon: number }> = {
  md: { box: "size-11", icon: 18 },
  lg: { box: "size-12", icon: 20 },
  field: { box: "size-14", icon: 26 },
};

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Required: becomes the accessible name. */
  label: string;
  variant?: "ghost" | "outline" | "solid";
  size?: IconSize;
  /** Mirror the glyph in right-to-left layouts (arrows and chevrons only). */
  directional?: boolean;
}

export function IconButton({
  icon: Icon,
  label,
  variant = "ghost",
  size = "md",
  directional,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const s = ICON_SIZES[size];
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "press inline-flex shrink-0 items-center justify-center rounded-control border",
        "disabled:opacity-45 focus-visible:shadow-focus",
        variant === "ghost" && "border-transparent text-white hover:bg-tile active:bg-line",
        variant === "outline" && "border-2 border-tile-line bg-tile text-white hover:bg-line",
        variant === "solid" && "border-transparent bg-accent text-on-accent hover:bg-accent-deep",
        s.box,
        className,
      )}
      {...rest}
    >
      <Icon size={s.icon} strokeWidth={2.25} aria-hidden className={cn(directional && "rtl:-scale-x-100")} />
    </button>
  );
}
