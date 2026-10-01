"use client";

import { ArrowRight, Layers } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, money, pct } from "../format";
import { useAllRecommendations, useDecisions } from "../hooks";
import { StoreDot } from "../StoreDot";
import { useToday } from "../overview/usePreferences";
import { storeRecSummary, type StoreRecSummary } from "../work/recs";

export interface StorePickerProps {
  stores: Store[];
  onPick: (storeId: string) => void;
  /** "recs": open recommendation counts per store. "economics": target / break-even only (no engine run). */
  variant?: "recs" | "economics";
  title: string;
  description: string;
}

/**
 * All-stores scope on a per-store page: one card per store. Picking a card
 * switches the console scope to that store (the whole page follows).
 */
export function StorePicker({ stores, onPick, variant = "recs", title, description }: StorePickerProps) {
  const withRecs = variant === "recs";
  const all = useAllRecommendations(withRecs);
  const { decisions } = useDecisions(withRecs ? "all" : null);
  const today = useToday();
  const summaries = useMemo(() => {
    const out = new Map<string, StoreRecSummary>();
    if (!withRecs) return out;
    for (const s of all.perStore) {
      const d = decisions.filter((x) => x.storeId === s.store.id);
      out.set(s.store.id, storeRecSummary(s.recommendations, d, today || s.window.to || ""));
    }
    return out;
  }, [withRecs, all.perStore, decisions, today]);

  return (
    <section aria-labelledby="store-picker-title" className="rounded-xl border border-hairline bg-surface">
      <header className="flex items-start gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
          <Layers className="size-4 text-brand" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="store-picker-title" className="font-display text-base font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
        </div>
      </header>
      <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {stores.map((s) => {
          const sum = summaries.get(s.id);
          return (
            <li key={s.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(s.id)}
                className={cn(
                  "group flex h-full w-full min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-canvas p-4 text-left",
                  "transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <StoreDot colorIndex={s.colorIndex} size="md" />
                  <span className="truncate font-display text-[0.9375rem] font-semibold text-ink">{s.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted">
                    {s.marketplace} · {s.currency}
                  </span>
                </span>
                {withRecs ? (
                  sum ? (
                    <>
                      <span className="grid grid-cols-4 gap-2 text-center">
                        {(
                          [
                            ["Harvest", sum.harvest],
                            ["Negatives", sum.negatives],
                            ["Bids", sum.bids],
                            ["Flags", sum.flags],
                          ] as const
                        ).map(([label, n]) => (
                          <span key={label} className="min-w-0 rounded-lg bg-surface px-1 py-1.5">
                            <span className="block tabular text-base font-semibold text-ink">{count(n)}</span>
                            <span className="block truncate text-[0.6875rem] text-muted">{label}</span>
                          </span>
                        ))}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>
                          about <strong className="tabular font-semibold text-ink">{money(sum.impact, s.currency, { decimals: 0 })}</strong> / month at stake
                        </span>
                        {sum.high ? (
                          <Badge tone="bad" size="sm">
                            {count(sum.high)} high priority
                          </Badge>
                        ) : null}
                        {sum.approved ? (
                          <Badge tone="good" size="sm">
                            {count(sum.approved)} approved to export
                          </Badge>
                        ) : null}
                      </span>
                    </>
                  ) : all.loading ? (
                    <span className="space-y-2" aria-hidden="true">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </span>
                  ) : (
                    <span className="text-xs text-muted">No search term data yet.</span>
                  )
                ) : (
                  <span className="text-xs text-muted">
                    Target ACoS <strong className="tabular text-ink">{pct(s.economics.targetAcos)}</strong> · Break-even{" "}
                    <strong className="tabular text-ink">{pct(s.economics.breakEvenAcos)}</strong>
                  </span>
                )}
                <span className="mt-auto inline-flex items-center gap-1 text-[0.8125rem] font-medium text-brand group-hover:underline">
                  Open {s.name}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
