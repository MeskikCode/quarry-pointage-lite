import { Check, Clock, Contrast, X, type LucideIcon } from "lucide-react";
import type { Status } from "@/lib/types";

/** One icon per status, used on the cards and in the month calendar. */
export const STATUS_ICON: Record<Status, LucideIcon> = {
  present: Check,
  half_day: Contrast,
  late: Clock,
  absent: X,
};

/** A status, filled in the design system's status colours. */
export const STATUS_FILL: Record<Status, string> = {
  present: "border-ok bg-ok text-ink",
  half_day: "border-info bg-info text-ink",
  late: "border-warn bg-warn text-ink",
  absent: "border-danger bg-danger text-white",
};
