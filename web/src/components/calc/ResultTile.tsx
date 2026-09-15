import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONE_BORDER, TONE_ICON, TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

/**
 * One computed number.
 *
 * Deliberately not `StatTile`: a result is not a dashboard statistic. It
 * carries the formula that produced it, it changes on every keystroke, and
 * the primary results on a page need to outweigh the supporting ones — hence
 * `emphasis`, which tints the tile in its verdict colour.
 */
export interface ResultTileProps {
  label: string;
  value: string;
  /** Small trailing unit, e.g. "/mo". Units already inside `value` stay there. */
  unit?: string;
  tone?: Tone;
  /** One short line under the value: what it means or how it was derived. */
  hint?: ReactNode;
  icon?: LucideIcon;
  /** Larger, tinted treatment for the two or three headline results. */
  emphasis?: boolean;
  className?: string;
}

export function ResultTile({
  label,
  value,
  unit,
  tone = "neutral",
  hint,
  icon: Icon,
  emphasis,
  className,
}: ResultTileProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl border p-4",
        emphasis
          ? cn(TONE_SOFT_BG[tone], TONE_BORDER[tone])
          : "border-hairline bg-surface",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.6875rem] leading-tight font-medium tracking-[0.08em] text-muted uppercase">
          {label}
        </p>
        {Icon ? (
          <Icon className={cn("size-4 shrink-0", TONE_ICON[tone])} aria-hidden="true" />
        ) : null}
      </div>

      <p className="flex items-baseline gap-1">
        <span
          className={cn(
            "tabular leading-none font-semibold break-all",
            emphasis ? "text-[1.625rem]" : "text-xl",
            emphasis && tone !== "neutral" ? TONE_TEXT[tone] : "text-ink",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-xs font-medium text-faint">{unit}</span> : null}
      </p>

      {hint ? <p className="text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

/** The standard responsive grid results sit in. */
export function ResultGrid({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 [&>*]:min-w-0",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
