import { cn } from "@/lib/utils";

export interface SparklineProps {
  /** Two or more values. Rendered left to right, scaled to fit. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * A hand-rolled 20-pixel trend line. Decorative by design — every number it
 * draws is also printed next to it — so it carries no accessible name and
 * inherits `currentColor` from whatever tone class the caller sets.
 */
export function Sparkline({ values, width = 78, height = 22, className }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const inset = 2.5;
  const usable = height - inset * 2;

  const coords = values.map((value, index) => {
    const x = index * step;
    const y = height - inset - ((value - min) / span) * usable;
    return [x, y] as const;
  });

  const path = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.75}
      />
      <circle cx={lastX} cy={lastY} r={2.25} fill="currentColor" />
    </svg>
  );
}
