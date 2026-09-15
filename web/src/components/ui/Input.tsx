import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { CONTROL_BASE, controlBorder, describedBy, FieldShell } from "./Field";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  icon?: LucideIcon;
  /** Small trailing unit, e.g. "%" or "USD". */
  suffix?: ReactNode;
  className?: string;
  fieldClassName?: string;
}

export function Input({
  id,
  label,
  hint,
  error,
  hideLabel,
  icon: Icon,
  suffix,
  className,
  fieldClassName,
  required,
  ...rest
}: InputProps) {
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
      <div className="relative flex items-center">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-3 size-4 text-faint"
            aria-hidden="true"
          />
        ) : null}
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(
            CONTROL_BASE,
            controlBorder(error),
            "h-11",
            Icon && "pl-9",
            suffix && "pr-14",
            className,
          )}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 text-xs font-medium text-faint">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}
