import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { CONTROL_BASE, controlBorder, describedBy, FieldShell } from "./Field";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  className?: string;
  fieldClassName?: string;
  /** Live character counter against `maxLength`. */
  showCount?: boolean;
}

export function Textarea({
  id,
  label,
  hint,
  error,
  hideLabel,
  className,
  fieldClassName,
  showCount,
  maxLength,
  value,
  rows = 5,
  required,
  ...rest
}: TextareaProps) {
  const used = typeof value === "string" ? value.length : 0;

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      required={required}
      className={fieldClassName}
    >
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(CONTROL_BASE, controlBorder(error), "resize-y py-2.5 leading-relaxed", className)}
        {...rest}
      />
      {showCount && maxLength ? (
        <p className="tabular text-right text-[0.6875rem] text-faint">
          {used} / {maxLength}
        </p>
      ) : null}
    </FieldShell>
  );
}
