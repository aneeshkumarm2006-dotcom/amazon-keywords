import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { MetricDirection, Tone } from "@/types/content";

import { TONE_ICON, TONE_SOFT_BG, TONE_TEXT } from "./tone";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Small trailing unit rendered at reduced size, e.g. "%" or "/mo". */
  unit?: string;
  /** One short line under the value. */
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  /** Signed change readout, e.g. "-38.2 pts". */
  delta?: string;
  /** Which way the delta points. `tone` colours it; this picks the arrow. */
  deltaDirection?: MetricDirection;
  /** Tone applied only to the delta chip. */
  deltaTone?: Tone;
  href?: string;
  className?: string;
  /** Compact tiles drop the icon well and tighten padding. */
  compact?: boolean;
}

const DIRECTION_ICON: Record<MetricDirection, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
};

export function StatTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "neutral",
  delta,
  deltaDirection = "flat",
  deltaTone,
  href,
  className,
  compact,
}: StatTileProps) {
  const DeltaIcon = DIRECTION_ICON[deltaDirection];
  const deltaColour = deltaTone ?? tone;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
          {label}
        </p>
        {Icon && !compact ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              TONE_SOFT_BG[tone],
            )}
          >
            <Icon className={cn("size-4", TONE_ICON[tone])} aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <p className="flex items-baseline gap-1">
        <span
          className={cn(
            "tabular leading-none font-semibold text-ink",
            compact ? "text-xl" : "text-[1.75rem]",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-sm font-medium text-faint">{unit}</span> : null}
      </p>

      {delta ? (
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
            TONE_SOFT_BG[deltaColour],
            TONE_TEXT[deltaColour],
          )}
        >
          <DeltaIcon className="size-3" aria-hidden="true" />
          <span className="tabular">{delta}</span>
        </span>
      ) : null}

      {hint ? <p className="text-xs leading-relaxed text-faint">{hint}</p> : null}
    </>
  );

  const classes = cn(
    "flex flex-col gap-2 rounded-xl border border-hairline bg-surface",
    compact ? "p-3.5" : "p-4",
    href &&
      "transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}
