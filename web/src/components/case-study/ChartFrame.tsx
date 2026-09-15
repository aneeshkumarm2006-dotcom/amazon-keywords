"use client";

import { Table2 } from "lucide-react";
import type { ReactNode } from "react";

import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { cn } from "@/lib/utils";

import { useMounted } from "./useMounted";

/**
 * The shell every chart on this route sits in.
 *
 * Three things it guarantees. The chart only renders after hydration, because
 * `ResponsiveContainer` measures the DOM and would otherwise mismatch the
 * static export's HTML. The SVG is hidden from assistive technology and
 * replaced by a one-sentence spoken summary. And the same numbers are always
 * available as a real table, one keyboard-operable disclosure away, so the
 * chart is decoration over data rather than the only way to read it.
 */

export interface ChartTableData {
  caption: string;
  /** First column is a row header; the rest are data columns. */
  head: string[];
  rows: { label: string; cells: string[] }[];
}

export interface ChartFrameProps {
  title: string;
  description?: string;
  /** Spoken in place of the chart. Say what the shape means, not "a chart". */
  summary: string;
  table: ChartTableData;
  /** Chart height in pixels. The container handles width. */
  height?: number;
  /** Rendered top-right of the header, e.g. a legend key or a chip. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ChartFrame({
  title,
  description,
  summary,
  table,
  height = 260,
  aside,
  className,
  children,
}: ChartFrameProps) {
  const ready = useMounted();

  return (
    <section
      className={cn("flex flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </header>

      <div className="px-1 pt-4 pb-1 sm:px-2">
        <p className="sr-only">{summary}</p>
        <div style={{ height }} aria-hidden="true">
          {ready ? (
            children
          ) : (
            <div className="size-full rounded-lg bg-surface-2" />
          )}
        </div>
      </div>

      <details className="group/table border-t border-hairline">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-[0.8125rem] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5">
          <Table2 className="size-4 shrink-0 text-faint" aria-hidden="true" />
          <span className="group-open/table:hidden">Show the numbers as a table</span>
          <span className="hidden group-open/table:inline">Hide the table</span>
        </summary>
        <div className="px-4 pb-4 sm:px-5">
          <Table caption={table.caption} wrapperClassName="bg-canvas" stickyFirstColumn>
            <THead>
              <TR>
                <TH>{table.head[0]}</TH>
                {table.head.slice(1).map((heading) => (
                  <TH key={heading} numeric>
                    {heading}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {table.rows.map((row) => (
                <TR key={row.label}>
                  <THRow className="whitespace-nowrap">{row.label}</THRow>
                  {row.cells.map((cell, index) => (
                    <TD key={`${row.label}-${table.head[index + 1]}`} numeric mono>
                      {cell}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </details>
    </section>
  );
}

/**
 * Spread onto every recharts root rendered inside the `aria-hidden` chart
 * viewport above. Recharts' accessibility layer puts `tabindex="0"` on its own
 * `<svg>`, so without this the chart is a tab stop that assistive technology
 * cannot see. The numbers stay reachable through the spoken summary and the
 * table below it, so the svg itself leaves the tab order.
 */
export const CHART_A11Y = { tabIndex: -1 } as const;

/** Shared recharts styling, so every chart on the site reads the same. */
export const CHART_TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: "0.75rem",
  fontSize: "0.75rem",
  color: "var(--ink)",
  boxShadow: "var(--shadow-card-value)",
  padding: "0.5rem 0.7rem",
} as const;

export const CHART_LABEL_STYLE = { color: "var(--muted)", marginBottom: 2 } as const;

export const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 } as const;

export const AXIS_TICK_SMALL = { fill: "var(--muted)", fontSize: 10 } as const;

export const LEGEND_STYLE = { fontSize: "0.75rem", paddingTop: 10 } as const;
