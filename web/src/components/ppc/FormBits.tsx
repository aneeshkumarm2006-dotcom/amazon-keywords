import type { ReactNode } from "react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/** A titled block of a long form; `id` anchors the in-page section links. */
export function FormSection({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-display text-base font-semibold text-ink">
            {title}
          </h2>
          {description ? <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

export interface NumFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Whole numbers only: switches the mobile keypad. */
  integer?: boolean;
}

/**
 * A numeric text field that keeps exactly what was typed ("", "0.", "1,5")
 * and leaves parsing / range checks to the form's validate step, so a
 * half-typed value is never rewritten under the cursor.
 */
export function NumField({ id, label, value, onChange, unit, hint, error, placeholder, disabled, className, integer }: NumFieldProps) {
  return (
    <Input
      id={id}
      label={label}
      value={value}
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      disabled={disabled}
      suffix={unit}
      hint={hint}
      error={error}
      onChange={(e) => onChange(e.target.value)}
      fieldClassName={className}
      className={cn("tabular", unit && unit.length > 6 ? "pr-28" : undefined)}
    />
  );
}
