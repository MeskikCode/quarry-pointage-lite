import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "./cn";

/** MUBCS FormField, Input and Select at the large (46px+) size the field kit
 * uses, with logical properties so they mirror in right-to-left layouts. */

const CONTROL =
  "t-control h-12 w-full rounded-control border bg-sunken px-3 text-md text-strong " +
  "placeholder:text-muted focus:border-accent focus:shadow-focus focus:outline-none";

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}

export function FormField({ label, hint, error, required, children }: FormFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="caps text-xs font-semibold text-muted">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": note ? noteId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {note ? (
        <p id={noteId} role={error ? "alert" : undefined} className={cn("text-xs", error ? "text-danger" : "text-muted")}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ mono, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        CONTROL,
        rest["aria-invalid"] ? "border-danger" : "border-tile-line",
        mono && "num text-start",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, "appearance-none border-tile-line pe-10", className)} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={18}
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
