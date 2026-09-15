"use client";

import { useCallback, useState, type ChangeEvent, type FocusEvent, type ReactNode } from "react";

import { Input } from "@/components/ui/Input";
import { clamp } from "@/lib/utils";

/**
 * Labelled numeric inputs.
 *
 * All three wrap one control. The wrinkle they solve is that a controlled
 * `<input type="number">` bound straight to a number cannot hold the
 * intermediate states a person types on the way to a value — "", "-", "1." —
 * because each of those parses to something the parent would immediately
 * write back. So the control keeps a string draft while it has focus, pushes
 * up every parse that succeeds, and drops the draft on blur, at which point
 * the value is clamped into range and re-rendered in canonical form.
 */

export interface NumericFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Decimal places used when the field re-formats itself on blur. */
  decimals?: number;
  hint?: string;
  /** Trailing unit inside the control, e.g. "USD", "%", "clicks". */
  suffix?: ReactNode;
  disabled?: boolean;
  className?: string;
}

function canonical(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(decimals)));
}

export function NumericField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 2,
  hint,
  suffix,
  disabled,
  className,
}: NumericFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setDraft(raw);
      if (raw.trim() === "") return;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) onChange(parsed);
    },
    [onChange],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const parsed = raw.trim() === "" ? Number.NaN : Number(raw);
      const lower = min ?? Number.NEGATIVE_INFINITY;
      const upper = max ?? Number.POSITIVE_INFINITY;
      const next = Number.isFinite(parsed) ? clamp(parsed, lower, upper) : clamp(0, lower, upper);
      onChange(Number(next.toFixed(decimals)));
      setDraft(null);
    },
    [decimals, max, min, onChange],
  );

  return (
    <Input
      id={id}
      label={label}
      hint={hint}
      suffix={suffix}
      type="number"
      inputMode="decimal"
      value={draft ?? canonical(value, decimals)}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      fieldClassName={className}
      className="tabular"
    />
  );
}

/** Dollars. Two decimals, never negative unless a floor says otherwise. */
export function CurrencyField(props: Omit<NumericFieldProps, "suffix" | "decimals">) {
  return <NumericField {...props} min={props.min ?? 0} step={props.step ?? 0.01} decimals={2} suffix="USD" />;
}

/** A percentage held as 0-100, not 0-1. */
export function PercentField(props: Omit<NumericFieldProps, "suffix" | "decimals">) {
  return <NumericField {...props} min={props.min ?? 0} step={props.step ?? 0.5} decimals={2} suffix="%" />;
}

/** A plain count or multiplier. `unit` becomes the trailing label. */
export function NumberField({
  unit,
  ...props
}: Omit<NumericFieldProps, "suffix"> & { unit?: string }) {
  return <NumericField {...props} suffix={unit} />;
}

/** A row of fields that collapses to one column at phone width. */
export function FieldGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <div className={columns === 1 ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>{children}</div>
  );
}
