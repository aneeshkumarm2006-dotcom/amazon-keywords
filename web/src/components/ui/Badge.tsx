import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

import { TONE_BORDER, TONE_SOFT_BG, TONE_TEXT } from "./tone";

export type BadgeSize = "sm" | "md";
export type BadgeVariant = "soft" | "outline" | "solid";

const SIZES: Record<BadgeSize, string> = {
  sm: "h-5 gap-1 px-1.5 text-[0.6875rem]",
  md: "h-6 gap-1.5 px-2 text-xs",
};

const SOLID: Record<Tone, string> = {
  neutral: "bg-ink text-canvas border-transparent",
  brand: "bg-brand text-on-brand border-transparent",
  ember: "bg-ember text-on-ember border-transparent",
  good: "bg-good text-on-good border-transparent",
  warn: "bg-warn text-on-warn border-transparent",
  bad: "bg-bad text-on-bad border-transparent",
  info: "bg-info text-on-info border-transparent",
};

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  tone?: Tone;
  size?: BadgeSize;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  size = "md",
  variant = "soft",
  icon: Icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border font-medium whitespace-nowrap",
        SIZES[size],
        variant === "solid" && SOLID[tone],
        variant === "soft" && cn(TONE_SOFT_BG[tone], TONE_TEXT[tone], "border-transparent"),
        variant === "outline" && cn("bg-transparent", TONE_TEXT[tone], TONE_BORDER[tone]),
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon className="size-3 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** A dense mono chip for numerals — ACoS values, spend, counts. */
export function MetricChip({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label?: string;
  value: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
        TONE_SOFT_BG[tone],
        TONE_BORDER[tone],
        className,
      )}
    >
      {label ? (
        <span className="text-[0.6875rem] tracking-wide text-muted uppercase">{label}</span>
      ) : null}
      <span className={cn("tabular text-[0.75rem] font-semibold", TONE_TEXT[tone])}>
        {value}
      </span>
    </span>
  );
}
