import { cn } from "@/lib/utils";

import { sparklinePath, trendDirection } from "./compute";

export interface SparklineProps {
  values: readonly number[];
  /** CSS colour for the line, e.g. `var(--series-2)`. */
  color?: string;
  width?: number;
  height?: number;
  /** Spoken description prefix, e.g. "Daily spend". */
  label?: string;
  className?: string;
}

/**
 * A tiny inline-SVG trend line (no recharts: a table of ten rows should not
 * mount ten chart instances). Decorative drawing plus one spoken sentence.
 */
export function Sparkline({ values, color = "var(--brand)", width = 84, height = 24, label = "Daily spend", className }: SparklineProps) {
  const path = sparklinePath(values, width, height);
  const trend = trendDirection(values);
  const spoken =
    trend.direction === "flat"
      ? `${label}: roughly flat`
      : `${label}: ${trend.direction === "up" ? "rising" : "falling"}${Number.isFinite(trend.change) ? ` about ${Math.round(Math.abs(trend.change) * 100)}%` : ""} from the start of the period to the end`;
  if (!path) return <span className="text-faint">—</span>;
  return (
    <span className={cn("inline-flex align-middle", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        focusable="false"
        className="overflow-visible"
      >
        <path d={path.area} fill={color} fillOpacity={0.12} stroke="none" />
        <path d={path.line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={path.last.x} cy={path.last.y} r={2} fill={color} />
      </svg>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
