import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

const STROKE: Record<Tone, string> = {
  neutral: "var(--hairline-strong)",
  brand: "var(--brand)",
  ember: "var(--ember)",
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  info: "var(--info)",
};

export interface LevelRingProps {
  /** 0-100. */
  percent: number;
  /** Rendered inside the ring — usually the level number. */
  label: string;
  /** Tiny caption under the label. */
  caption?: string;
  tone?: Tone;
  size?: number;
  /** Spoken description, since the ring is decorative to a screen reader. */
  srLabel: string;
  className?: string;
}

/**
 * A progress ring drawn with two SVG circles.
 *
 * No chart library: it is one arc, it has to be crisp at 56px, and it must
 * render identically on the server and the client so the dashboard header
 * does not shift while storage loads.
 */
export function LevelRing({
  percent,
  label,
  caption,
  tone = "brand",
  size = 84,
  srLabel,
  className,
}: LevelRingProps) {
  const stroke = Math.max(5, Math.round(size / 12));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.min(100, Math.max(0, percent));
  const dash = (bounded / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={srLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="tabular leading-none font-semibold text-ink"
          style={{ fontSize: Math.round(size / 3.2) }}
        >
          {label}
        </span>
        {caption ? (
          <span
            className="leading-none font-medium tracking-[0.08em] text-faint uppercase"
            style={{ fontSize: Math.max(8, Math.round(size / 10)) }}
          >
            {caption}
          </span>
        ) : null}
      </span>
    </div>
  );
}
