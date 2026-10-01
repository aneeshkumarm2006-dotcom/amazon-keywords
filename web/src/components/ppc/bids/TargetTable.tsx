"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, THead, TR, Table } from "@/components/ui/Table";
import { norm, type MatchType, type Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, dateSpan, money, pct, plural } from "../format";
import { AcosText, Jargon, ShowMore } from "../keywords/common";
import type { SortDir } from "../overview/compute";
import { SortHeader, TEXT_LINK, nextSort } from "../overview/shared";
import { guardrailsText, ladderText } from "../work/glossary";
import { viewForAction } from "../work/recs";
import {
  BAND_META,
  DEFAULT_TARGET_FILTER,
  TARGET_TEXT_COLUMNS,
  bandCounts,
  filterTargets,
  sortTargets,
  type TargetBand,
  type TargetFilter,
  type TargetRow,
  type TargetSortKey,
} from "../work/targets";

const STEP = 50;
const BANDS: TargetBand[] = ["raise", "cut", "pause", "hold", "learning", "no-sales", "inactive", "no-bid"];

export interface TargetTableProps {
  store: Store;
  rows: TargetRow[];
  window: { from: string; to: string };
  /** Recs that already have a decision: the Keywords link opens with decided rows shown, or they would be hidden there. */
  decidedRecIds?: ReadonlySet<string>;
}

/** Every keyword / product target in the window with the maths behind its bid, not just the flagged ones. */
export function TargetTable({ store, rows, window: win, decidedRecIds }: TargetTableProps) {
  const uid = useId();
  const [filter, setFilter] = useState<TargetFilter>(DEFAULT_TARGET_FILTER);
  const [sort, setSort] = useState<{ key: TargetSortKey; dir: SortDir }>({ key: "spend", dir: "desc" });
  const [limit, setLimit] = useState(STEP);
  const counts = useMemo(() => bandCounts(rows), [rows]);
  const campaigns = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (!m.has(norm(r.campaign))) m.set(norm(r.campaign), r.campaign);
    return [...m.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);
  const filtered = useMemo(() => filterTargets(rows, filter), [rows, filter]);
  const sorted = useMemo(() => sortTargets(filtered, sort.key, sort.dir), [filtered, sort]);
  const shown = sorted.slice(0, limit);
  const cur = store.currency;
  const E = store.economics;
  const update = (patch: Partial<TargetFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setLimit(STEP);
  };
  const onSort = (k: TargetSortKey) => setSort((s) => nextSort(s, k, TARGET_TEXT_COLUMNS));
  const head = (label: string, key: TargetSortKey, numeric = true) => (
    <SortHeader label={label} column={key} sortKey={sort.key} dir={sort.dir} onSort={onSort} numeric={numeric} />
  );

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-xl border border-hairline bg-surface">
      <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
        <h2 id={`${uid}-h`} className="font-display text-base font-semibold text-ink">
          Every target&apos;s bid
        </h2>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
          {plural(rows.length, "keyword or product target")} with traffic in {dateSpan(win.from, win.to)} (the same window the recommendations use).
          Each row blends its conversion rate with its ad group&apos;s (<Jargon k="smoothedCvr">smoothed CVR</Jargon>), works out a{" "}
          <Jargon k="maxCpc">max CPC</Jargon>, reads the{" "}
          <Jargon k="ladder" text={ladderText(store.rules.ladder)}>
            bid ladder
          </Jargon>{" "}
          and applies the{" "}
          <Jargon k="guardrails" text={guardrailsText(store.rules, (n) => money(n, store.currency))}>
            guardrails
          </Jargon>
          . Rows the engine turned into a recommendation link to it.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by band">
          {BANDS.filter((b) => counts[b] > 0).map((b) => {
            const on = filter.band === b;
            return (
              <button
                key={b}
                type="button"
                aria-pressed={on}
                onClick={() => update({ band: on ? "" : b })}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11",
                  on ? "border-brand bg-brand-soft text-ink" : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                )}
              >
                {BAND_META[b].label}
                <span className="tabular text-faint">{count(counts[b])}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid gap-3 border-b border-hairline px-4 py-3 sm:grid-cols-3 sm:px-5">
        <Input id={`${uid}-q`} label="Search" icon={Search} placeholder="Keyword, ASIN or campaign" value={filter.text} onChange={(e) => update({ text: e.target.value })} />
        <Select
          id={`${uid}-camp`}
          label="Campaign"
          value={filter.campaign}
          onChange={(e) => update({ campaign: e.target.value })}
          options={[{ value: "", label: "All campaigns" }, ...campaigns]}
        />
        <Select
          id={`${uid}-mt`}
          label="Match type"
          value={filter.matchType}
          onChange={(e) => update({ matchType: e.target.value as MatchType | "" })}
          options={[
            { value: "", label: "Any" },
            { value: "exact", label: "Exact" },
            { value: "phrase", label: "Phrase" },
            { value: "broad", label: "Broad" },
            { value: "auto", label: "Auto" },
            { value: "product", label: "Product" },
          ]}
        />
      </div>

      {shown.length ? (
        <Table caption={`Bids for ${store.name}`} wrapperClassName="relative rounded-none border-0 bg-transparent" className="text-sm">
          <THead>
            <tr>
              {head("Target", "target", false)}
              {head("Bid", "bid")}
              {head("Clicks", "clicks")}
              {head("Orders", "orders")}
              {head("ACoS", "acos")}
              {head("CVR", "cvr")}
              {head("Smoothed", "smoothed")}
              {head("Max CPC", "maxCpc")}
              {head("Ladder", "ratio", false)}
              {head("New bid", "suggested")}
              {head("History", "history")}
            </tr>
          </THead>
          <TBody>
            {shown.map((r) => {
              const meta = BAND_META[r.band];
              const change = r.suggestedBid !== undefined && r.currentBid ? r.suggestedBid / r.currentBid - 1 : NaN;
              return (
                <TR key={r.key}>
                  <TD className="max-w-[13rem] px-2.5">
                    <p className="font-medium break-words text-ink">{r.targeting}</p>
                    <p className="truncate text-xs text-muted" title={`${r.campaign} → ${r.adGroup}`}>
                      {r.campaign} → {r.adGroup} · {r.matchType}
                    </p>
                  </TD>
                  <TD numeric className="px-2.5 whitespace-nowrap">
                    {r.currentBid !== undefined ? (
                      <>
                        <span className="tabular text-[0.8125rem]">{money(r.currentBid, cur)}</span>
                        {r.currentBidSource === "avg-cpc" ? <span className="block text-[0.6875rem] text-muted">avg CPC</span> : null}
                      </>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </TD>
                  <TD numeric mono className="px-2.5">
                    {count(r.counters.clicks)}
                  </TD>
                  <TD numeric mono className="px-2.5">
                    {count(r.counters.orders)}
                  </TD>
                  <TD numeric className="px-2.5">
                    <AcosText acos={r.acos} target={E.targetAcos} breakEven={E.breakEvenAcos} spend={r.counters.spend} />
                  </TD>
                  <TD numeric mono className="px-2.5">
                    {pct(r.cvr)}
                  </TD>
                  <TD numeric mono className="px-2.5" title={r.priorSource !== "none" ? `Blended with the ${r.priorSource} CVR ${pct(r.priorCvr, 2)}` : undefined}>
                    {pct(r.smoothedCvr, 2)}
                  </TD>
                  <TD numeric mono className="px-2.5">
                    {money(r.maxCpc, cur)}
                  </TD>
                  <TD className="max-w-[14rem] min-w-[10rem] px-2.5">
                    <Badge tone={meta.tone} size="sm">
                      {meta.label}
                    </Badge>
                    <p className="mt-0.5 text-xs leading-snug text-muted">{r.bandLabel}</p>
                    {r.rec ? (
                      <Link
                        href={`/dashboard/keywords?view=${viewForAction(r.rec.action)}&q=${encodeURIComponent(r.targeting)}${decidedRecIds?.has(r.rec.id) ? "&decided=1" : ""}`}
                        className={cn(TEXT_LINK, "inline-flex min-h-8 items-center gap-1 text-xs whitespace-nowrap [@media(pointer:coarse)]:min-h-11")}
                      >
                        Recommendation in Keywords
                        <ArrowRight className="size-3" aria-hidden="true" />
                        <span className="sr-only"> for {r.targeting}</span>
                      </Link>
                    ) : null}
                  </TD>
                  <TD numeric className="px-2.5 whitespace-nowrap">
                    {r.band === "pause" ? (
                      <span className="text-xs font-medium text-bad">pause</span>
                    ) : r.suggestedBid !== undefined ? (
                      <>
                        <span className="tabular text-[0.8125rem] font-semibold text-ink">{money(r.suggestedBid, cur)}</span>
                        <span className={cn("block tabular text-[0.6875rem]", change > 0 ? "text-info" : "text-warn")}>
                          {change > 0 ? "+" : "−"}
                          {pct(Math.abs(change))}
                        </span>
                      </>
                    ) : r.band === "hold" && r.currentBid !== undefined ? (
                      <span className="text-xs text-muted">hold</span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </TD>
                  <TD numeric className="px-2.5 whitespace-nowrap">
                    {r.learning ? (
                      <Badge tone="warn" size="sm">
                        {r.historyDays}/{store.rules.minDaysHistory}d<span className="sr-only"> of history — still learning</span>
                      </Badge>
                    ) : (
                      <span className="tabular text-xs text-muted">{r.historyDays}d</span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">No targets match these filters.</p>
      )}
      <ShowMore
        shown={shown.length}
        total={sorted.length}
        step={STEP}
        noun="targets"
        onMore={() => setLimit((l) => l + STEP)}
        onAll={() => setLimit(sorted.length)}
        className="border-t border-hairline"
      />
    </section>
  );
}
