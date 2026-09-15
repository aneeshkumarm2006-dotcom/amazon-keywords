import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { CONTROL_BASE, controlBorder, describedBy, FieldShell } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  options: SelectOption[];
  /** Renders a leading blank option with this label. */
  placeholder?: string;
  className?: string;
  fieldClassName?: string;
}

export function Select({
  id,
  label,
  hint,
  error,
  hideLabel,
  options,
  placeholder,
  className,
  fieldClassName,
  required,
  ...rest
}: SelectProps) {
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
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(
            CONTROL_BASE,
            controlBorder(error),
            "h-11 cursor-pointer appearance-none pr-9",
            className,
          )}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 size-4 text-faint"
          aria-hidden="true"
        />
      </div>
    </FieldShell>
  );
}
