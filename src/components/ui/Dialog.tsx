"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { IconButton } from "./Button";
import { cn } from "./cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * MUBCS Dialog on the native `<dialog>` element, which provides the focus
 * trap, Escape to close, and an inert page behind for free.
 *
 * Mobile first: a sheet attached to the bottom edge, within thumb reach.
 * From 640px it becomes the centred 480px panel of the design system.
 */
export function Dialog({ open, onClose, title, subtitle, closeLabel, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none flex-col overflow-hidden p-0 open:flex",
        "max-h-[92dvh] rounded-t-modal border border-line bg-card text-body shadow-modal",
        "backdrop:bg-scrim backdrop:backdrop-blur-[3px]",
        "sm:m-auto sm:w-[480px] sm:max-w-[92vw] sm:rounded-modal",
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold text-strong">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <IconButton icon={X} label={closeLabel} onClick={onClose} className="-me-2 -mt-2" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      {footer ? (
        <footer className="flex flex-col-reverse gap-2 border-t border-line bg-sunken px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-4">
          {footer}
        </footer>
      ) : null}
    </dialog>
  );
}
