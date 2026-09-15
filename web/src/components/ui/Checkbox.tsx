import { Check, Minus } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "children"> {
  id: string;
  label: ReactNode;
  hint?: string;
  /** Renders the mixed state: a filled box with a dash instead of a tick. */
  indeterminate?: boolean;
  className?: string;
}

/**
 * A real `<input type="checkbox">` visually replaced by a token-styled box.
 * The input keeps its native keyboard behaviour and focus ring.
 */
export function Checkbox({
  id,
  label,
  hint,
  indeterminate,
  className,
  checked,
  disabled,
  ...rest
}: CheckboxProps) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-checked={indeterminate ? "mixed" : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(
            "peer size-5 cursor-pointer appearance-none rounded-[0.3rem] border bg-surface",
            "border-hairline-strong transition-colors duration-150",
            "checked:border-brand checked:bg-brand",
            indeterminate && "border-brand bg-brand",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          {...rest}
        />
        {indeterminate ? (
          <Minus
            className="pointer-events-none absolute size-3.5 text-on-brand"
            strokeWidth={3}
            aria-hidden="true"
          />
        ) : (
          <Check
            className="pointer-events-none absolute size-3.5 text-on-brand opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pt-px">
        <label
          htmlFor={id}
          className={cn(
            "cursor-pointer text-sm leading-snug text-ink",
            disabled && "cursor-not-allowed text-faint",
          )}
        >
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-faint">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}
