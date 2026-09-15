import { TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

import { TONE_VAR } from "./format";

/**
 * A colour-banded semicircular gauge.
 *
 * Hand-drawn SVG rather than a charting library: the shape is two arcs and a
 * needle, and recharts would cost a client bundle for it. Colours come from
 * the design tokens as CSS variables, so the gauge re-paints itself when the
 * theme flips without React re-rendering.
 *
 * The SVG is hidden from assistive technology. The same reading is published
 * twice in real text underneath — the value with its band name, and the band
 * legend — so the gauge is an illustration of the answer, never the answer.
 */

export interface GaugeBand {
  /** Upper bound of this band, on the same scale as `value`. */
  to: number;
  tone: Tone;
  label: string;
}

export interface GaugeProps {
  value: number;
  min?: number;
  max: number;
  /** Ordered low to high. The last band's `to` should be `max`. */
  bands: GaugeBand[];
  /** Pre-formatted headline, e.g. "34.3%". */
  valueLabel: string;
  /** Short line under the value, e.g. "Break-even 55.0%". */
  caption?: string;
  /** Formatted scale ends, e.g. ["0%", "110%"]. */
  scaleLabels?: [string, string];
  className?: string;
}

const CX = 120;
const CY = 120;
const R = 96;
const STROKE = 17;

function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

function arcPath(radius: number, startDeg: number, endDeg: number): string {
  const start = polar(radius, startDeg);
  const end = polar(radius, endDeg);
  const largeArc = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** A scale bound as text; an em dash when the bound is not a real number. */
function bound(value: number): string {
  return Number.isFinite(value) ? value.toFixed(0) : "—";
}

/** Map a value on the scale to its angle: 180° at the floor, 0° at the ceiling. */
function angleFor(value: number, min: number, max: number): number {
  if (max <= min) return 180;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return 180 - t * 180;
}

export function bandFor(value: number, bands: GaugeBand[]): GaugeBand | undefined {
  return bands.find((band) => value <= band.to) ?? bands[bands.length - 1];
}

export function Gauge({
  value,
  min = 0,
  max,
  bands,
  valueLabel,
  caption,
  scaleLabels,
  className,
}: GaugeProps) {
  const finite = Number.isFinite(value);
  // A non-finite scale end or band bound makes every angle NaN, which would
  // emit invalid path data and print "NaN" in the legend. Treat it as
  // unrenderable: keep the reading, drop the arcs, the needle and the bands.
  const scaleOk =
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    bands.every((band) => Number.isFinite(band.to));
  const plotted = finite && scaleOk;
  const active = plotted ? bandFor(value, bands) : undefined;
  const needleAngle = angleFor(finite ? value : min, min, max);
  const needleTip = polar(R - 24, needleAngle);
  const overflow = plotted && value > max;

  // Each band starts where the previous one ended; the first starts at the floor.
  const segments = scaleOk
    ? bands.map((band, index) => ({
        band,
        from: index === 0 ? min : bands[index - 1].to,
        to: band.to,
      }))
    : [];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        viewBox="0 0 240 150"
        className="w-full max-w-[16rem]"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={arcPath(R, 180, 0)}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {segments.map(({ band, from, to }) => {
          const startAngle = angleFor(from, min, max);
          const endAngle = angleFor(to, min, max);
          // Written so a NaN comparison fails closed and skips the segment.
          if (!(startAngle - endAngle >= 0.4)) return null;
          return (
            <path
              key={band.label}
              d={arcPath(R, startAngle, endAngle)}
              fill="none"
              stroke={TONE_VAR[band.tone]}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              opacity={active && active.label === band.label ? 1 : 0.32}
            />
          );
        })}

        {plotted ? (
          <>
            <line
              x1={CX}
              y1={CY}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="var(--ink)"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r={7} fill="var(--surface)" stroke="var(--ink)" strokeWidth={3} />
          </>
        ) : null}

        <text
          x={CX - R}
          y={CY + 26}
          textAnchor="middle"
          fill="var(--faint)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          {scaleLabels?.[0] ?? bound(min)}
        </text>
        <text
          x={CX + R}
          y={CY + 26}
          textAnchor="middle"
          fill="var(--faint)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          {scaleLabels?.[1] ?? bound(max)}
        </text>
      </svg>

      <p className="-mt-6 flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular text-[2rem] leading-none font-semibold",
            active ? TONE_TEXT[active.tone] : "text-ink",
          )}
        >
          {finite ? valueLabel : "—"}
        </span>
      </p>
      {active ? (
        <p className={cn("mt-1.5 text-[0.8125rem] font-medium", TONE_TEXT[active.tone])}>
          {active.label}
          {overflow ? " (off the scale)" : ""}
        </p>
      ) : null}
      {caption ? <p className="mt-1 text-xs text-muted">{caption}</p> : null}

      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {segments.map(({ band, from, to }) => (
          <li key={band.label} className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: TONE_VAR[band.tone] }}
              aria-hidden="true"
            />
            <span>
              {band.label}
              <span className="tabular ml-1 text-faint">
                {bound(from)}–{bound(to)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
