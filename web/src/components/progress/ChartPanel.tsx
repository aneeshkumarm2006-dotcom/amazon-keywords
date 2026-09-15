"use client";

import { Table2 } from "lucide-react";
import { useId, useSyncExternalStore, type ReactNode } from "react";

import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { cn } from "@/lib/utils";

/**
 * The frame every chart on the dashboard sits in.
 *
 * Three guarantees, the same three the calculators and case studies make.
 * The chart only renders after hydration, because `ResponsiveContainer`
 * measures the DOM and would otherwise disagree with the static export. The
 * SVG is hidden from assistive technology and replaced by one spoken
 * sentence. And the same numbers are always one keyboard-operable disclosure
 * away as a real table, so the chart decorates the data rather than being
 * the only way to read it.
 */

function subscribe(onStoreChange: () => void): () => void {
  let live = true;
  queueMicrotask(() => {
    if (live) onStoreChange();
  });
  return () => {
    live = false;
  };
}

const onClient = () => true;
const onServer = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}

export interface ChartPanelTable {
  caption: string;
  /** First column is a row header; the rest are data columns. */
  head: string[];
  rows: { label: string; cells: string[] }[];
}

export interface ChartPanelProps {
  title: string;
  description?: string;
  /** Spoken in place of the chart. Say what the shape means. */
  summary: string;
  table?: ChartPanelTable;
  height?: number;
  aside?: ReactNode;
  /** Rendered under the chart, inside the same card. */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function ChartPanel({
  title,
  description,
  summary,
  table,
  height = 240,
  aside,
  footer,
  className,
  children,
}: ChartPanelProps) {
  const ready = useMounted();
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-hairline bg-surface",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3
            id={headingId}
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
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
        {/* overflow-hidden matters: recharts writes a pixel width onto its own
            svg, and without this the svg's intrinsic size props the card open
            and the page scrolls sideways on a phone. */}
        <div style={{ height }} aria-hidden="true" className="min-w-0 overflow-hidden">
          {ready ? children : <div className="size-full rounded-lg bg-surface-2" />}
        </div>
      </div>

      {footer ? <div className="px-4 pb-4 sm:px-5">{footer}</div> : null}

      {table && table.rows.length > 0 ? (
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
                      <TD key={`${row.label}-${table.head[index + 1] ?? index}`} numeric mono>
                        {cell}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </details>
      ) : null}
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

/** Shared recharts styling so every chart on the dashboard reads the same. */
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
export const LEGEND_STYLE = { fontSize: "0.75rem", paddingTop: 8 } as const;
