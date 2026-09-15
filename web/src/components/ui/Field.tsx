import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared chrome for labelled form controls: label, hint, error, layout. */

export interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Hide the label visually but keep it for screen readers. */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  hideLabel,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className={cn(
            "text-[0.8125rem] font-medium text-ink",
            hideLabel && "sr-only",
          )}
        >
          {label}
          {required ? (
            <span className="ml-1 text-bad" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export const CONTROL_BASE =
  "w-full rounded-lg border bg-surface px-3 text-sm text-ink " +
  "placeholder:text-faint transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint";

export function controlBorder(error?: string): string {
  return error ? "border-bad" : "border-hairline hover:border-hairline-strong";
}
