"use client";

import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useId, type ReactNode } from "react";

import { TH } from "@/components/ui/Table";
import { TONE_TEXT } from "@/components/ui/tone";
import type { Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { money } from "../format";
import type { MetricDelta, SortDir } from "./compute";

/* ---------------------------------------------------------------- context */

export interface OverviewContextValue {
  /** Switch the console scope to a store (or "all") and keep focus sensible. */
  switchScope: (scope: string) => void;
  /** Set the scope without moving focus — for links that navigate away. */
  setScope: (scope: string) => void;
  storesById: Map<string, Store>;
}

const OverviewContext = createContext<OverviewContextValue | null>(null);

export const OverviewProvider = OverviewContext.Provider;

export function useOverview(): OverviewContextValue {
  const ctx = useContext(OverviewContext);
  if (!ctx) throw new Error("useOverview must be used inside <OverviewProvider>");
  return ctx;
}

/* ------------------------------------------------------------- formatting */

/** Table money: always two decimals (one decimal place width per column). */
export function tableMoney(value: number, currency: string): string {
  return money(value, currency);
}

/** Tile / headline money: whole units. */
export function headlineMoney(value: number, currency: string): string {
  return money(value, currency, { decimals: 0 });
}

/** Axis ticks: "$1.2k", "$850", "£12". */
export function axisMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const base = money(0, currency, { decimals: 0 }).replace(/0/g, "");
    const k = value / 1000;
    return `${base}${k.toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }
  return money(value, currency, { decimals: 0 });
}

/** 3.84 → "3.84×" */
export function ratioX(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}×` : "—";
}

const SHORT_DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const LONG_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-09-28" → "28 Sep" */
export function shortDay(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? SHORT_DAY.format(new Date(`${iso}T00:00:00Z`)) : iso;
}

/** "2026-09-28" → "Mon, 28 Sep 2026" */
export function longDay(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? LONG_DAY.format(new Date(`${iso}T00:00:00Z`)) : iso;
}

/* ------------------------------------------------------------------ panel */

export interface PanelProps {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** The card every overview section sits in; its title is an <h2>. */
export function Panel({ title, description, aside, footer, className, children }: PanelProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-[1_1_14rem]">
          <h2 id={headingId} className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
            {title}
          </h2>
          {description ? <div className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</div> : null}
        </div>
        {aside ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div> : null}
      </header>
      {children}
      {footer ? <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  );
}

/** Table wrapper classes for a table that sits flush inside a Panel. */
export const FLUSH_TABLE = "relative rounded-none border-0 bg-transparent";

/* -------------------------------------------------------------- sort head */

export interface SortHeaderProps<K extends string> {
  label: string;
  column: K;
  sortKey: K;
  dir: SortDir;
  onSort: (column: K) => void;
  numeric?: boolean;
  className?: string;
  /** Spoken extra, e.g. the currency. */
  srExtra?: string;
}

/**
 * A column header that sorts. `aria-sort` sits on the active <th> only; the
 * button says what a press will do.
 */
export function SortHeader<K extends string>({ label, column, sortKey, dir, onSort, numeric, className, srExtra }: SortHeaderProps<K>) {
  const active = sortKey === column;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  const next = active ? (dir === "asc" ? "descending" : "ascending") : numeric ? "descending" : "ascending";
  return (
    <TH numeric={numeric} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined} className={cn("px-2.5", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 rounded px-0.5 uppercase transition-colors hover:text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "[@media(pointer:coarse)]:min-h-11",
          numeric && "flex-row-reverse",
          active && "text-ink",
        )}
      >
        <Icon className={cn("size-3 shrink-0", active ? "text-brand" : "text-faint")} aria-hidden="true" />
        <span>
          {label}
          {srExtra ? <span className="sr-only"> ({srExtra})</span> : null}
          <span className="sr-only">, sort {next}</span>
        </span>
      </button>
    </TH>
  );
}

/** Flip direction on the active column; a new column starts descending for numbers, ascending for text. */
export function nextSort<K extends string>(
  current: { key: K; dir: SortDir },
  column: K,
  textColumns: readonly K[],
): { key: K; dir: SortDir } {
  if (current.key === column) return { key: column, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key: column, dir: textColumns.includes(column) ? "asc" : "desc" };
}

/* ------------------------------------------------------------------ delta */

const DELTA_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight } as const;

/** A compact change readout for table cells: arrow + signed value, coloured by tone. */
export function DeltaText({ delta, empty = "—", className }: { delta: MetricDelta | null; empty?: string; className?: string }) {
  if (!delta) return <span className={cn("text-faint", className)}>{empty}</span>;
  const Icon = DELTA_ICON[delta.direction];
  const tone = delta.tone === "neutral" ? "text-muted" : TONE_TEXT[delta.tone];
  const spoken = delta.tone === "good" ? " (better)" : delta.tone === "bad" ? " (worse)" : "";
  return (
    <span
      className={cn("inline-flex items-center justify-end gap-0.5 whitespace-nowrap tabular text-[0.8125rem] font-medium", tone, className)}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {delta.label}
      {spoken ? <span className="sr-only">{spoken}</span> : null}
    </span>
  );
}

/* -------------------------------------------------------------- scope link */

export interface ScopeLinkProps {
  href: string;
  /** Switch the console scope to this store before navigating. */
  storeId?: string;
  className?: string;
  title?: string;
  children: ReactNode;
  "aria-label"?: string;
}

/** A link that selects a store first, so the destination page opens on it. */
export function ScopeLink({ href, storeId, className, children, ...rest }: ScopeLinkProps) {
  const { setScope } = useOverview();
  // The scope lives in IndexedDB, so it also applies when the link opens in a new tab.
  const onClick = storeId ? () => setScope(storeId) : undefined;
  return (
    <Link href={href} onClick={onClick} className={className} {...rest}>
      {children}
    </Link>
  );
}

/** Inline text link styling used across the overview. */
export const TEXT_LINK =
  "font-medium text-brand underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
