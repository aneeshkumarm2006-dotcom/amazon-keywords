"use client";

import { ArrowRight, Sprout, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, dateSpan, pct, plural } from "../format";
import { seriesBg } from "../markets";
import { StoreDot } from "../StoreDot";
import type { HarvestSummary, PeriodResult } from "./compute";
import { Panel, headlineMoney, tableMoney, useOverview } from "./shared";

/** Deep link into Keywords; the page may read `view` to open the right list. */
export const KEYWORDS_NEGATIVES_HREF = "/dashboard/keywords?view=negatives";
export const KEYWORDS_HARVEST_HREF = "/dashboard/keywords?view=harvest";

function Headline({ value, label, sub }: { value: string; label: string; sub?: ReactNode }) {
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="tabular text-[1.75rem] leading-none font-semibold text-ink">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </p>
      {sub ? <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{sub}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- wasted */

export interface WastedPanelProps {
  period: PeriodResult;
  className?: string;
}

/**
 * Spend on search terms with no orders in the period, split by what can be
 * done about it today: dead clicks (enough clicks to act on) vs watching.
 */
export function WastedPanel({ period, className }: WastedPanelProps) {
  const { storesById } = useOverview();
  const w = period.wasted;
  const currency = period.currency;
  const multi = period.stores.length > 1;
  const threshold = w.negateClicks !== undefined ? `≥ ${w.negateClicks} clicks` : "≥ each store's negate threshold";
  const deadShare = w.total > 0 ? w.dead / w.total : 0;

  return (
    <Panel
      title="Wasted spend"
      description={
        <p>Search terms with 0 orders in the last {period.days} days. A term that converts in another ad group is not counted.</p>
      }
      aside={
        <span className="flex size-8 items-center justify-center rounded-lg bg-bad-soft" aria-hidden="true">
          <Trash2 className="size-4 text-bad" />
        </span>
      }
      className={className}
      footer={
        <ButtonLink href={KEYWORDS_NEGATIVES_HREF} size="sm" variant="secondary" iconAfter={ArrowRight}>
          Review negatives in Keywords
        </ButtonLink>
      }
    >
      <div className="@container space-y-5 px-4 py-4 sm:px-5">
        {w.total > 0 ? (
          <>
            <Headline
              value={headlineMoney(w.total, currency)}
              label={Number.isFinite(w.share) ? `${pct(w.share)} of spend` : "wasted"}
              sub={
                <>
                  About <strong className="tabular font-semibold text-ink">{headlineMoney(w.monthly, currency)}</strong> a month at this
                  rate, <strong className="tabular font-semibold text-ink">{headlineMoney(w.deadMonthly, currency)}</strong> of it
                  recoverable now.
                </>
              }
            />

            <div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <span className="h-full bg-bad" style={{ width: `${deadShare * 100}%` }} />
                <span className="h-full bg-warn/70" style={{ width: `${(1 - deadShare) * 100}%` }} />
              </div>
              <dl className="mt-3 grid gap-3 @md:grid-cols-2">
                <div className="flex gap-2.5">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-bad" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[0.8125rem] font-semibold text-ink">Dead clicks</dt>
                    <dd className="tabular text-sm text-ink">
                      {tableMoney(w.dead, currency)} <span className="text-muted">· {plural(w.deadTerms, "term")}</span>
                    </dd>
                    <dd className="text-xs leading-relaxed text-muted">0 orders after {threshold}: negate or pause now.</dd>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-warn/70" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[0.8125rem] font-semibold text-ink">Watching</dt>
                    <dd className="tabular text-sm text-ink">
                      {tableMoney(w.watching, currency)} <span className="text-muted">· {plural(w.watchingTerms, "term")}</span>
                    </dd>
                    <dd className="text-xs leading-relaxed text-muted">
                      0 orders, fewer clicks so far — or brand / competitor terms, never negated.
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {multi ? <WastedByStore period={period} storesById={storesById} /> : null}

            <div>
              <h3 className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">Biggest wasted terms</h3>
              <ol className="mt-2 divide-y divide-hairline">
                {w.top.map((t) => {
                  const store = storesById.get(t.storeId);
                  return (
                    <li key={`${t.storeId}|${t.campaign}|${t.adGroup}|${t.term}`} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink" title={t.term}>
                          {t.term}
                        </p>
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                          {multi && store ? <StoreDot colorIndex={store.colorIndex} /> : null}
                          <span className="truncate" title={`${t.campaign} / ${t.adGroup}`}>
                            {multi && store ? `${store.name} · ` : ""}
                            {t.campaign}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-sm text-ink">{tableMoney(t.spend, currency)}</p>
                        <p className="flex items-center justify-end gap-1.5 text-xs text-muted">
                          <span className="tabular">{plural(t.clicks, "click")}</span>
                          <Badge size="sm" tone={t.kind === "dead" ? "bad" : "warn"}>
                            {t.protectedKind ? t.protectedKind : t.kind === "dead" ? "dead" : "watch"}
                          </Badge>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        ) : (
          <Headline
            value={headlineMoney(0, currency)}
            label="wasted"
            sub="Every search term that spent money in this period has at least one order somewhere in its store."
          />
        )}
      </div>
    </Panel>
  );
}

function WastedByStore({ period, storesById }: { period: PeriodResult; storesById: Map<string, Store> }) {
  const w = period.wasted;
  const rows = w.byStore.filter((s) => s.terms > 0);
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => (Number.isFinite(r.total) ? r.total : 0)), 0);
  return (
    <div>
      <h3 className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">By store</h3>
      <ul className="mt-2 space-y-2">
        {rows
          .slice()
          .sort((a, b) => (Number.isFinite(b.total) ? b.total : -1) - (Number.isFinite(a.total) ? a.total : -1))
          .map((r) => {
            const store = storesById.get(r.storeId);
            const converted = Number.isFinite(r.total);
            return (
              <li
                key={r.storeId}
                className="grid grid-cols-[minmax(0,1fr)_3.5rem_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_auto]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <StoreDot colorIndex={store?.colorIndex ?? 0} />
                  <span className="truncate text-ink">{store?.name ?? r.storeId}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <span
                    className={cn("block h-full rounded-full", seriesBg(store?.colorIndex ?? 0))}
                    style={{ width: `${converted && max > 0 ? Math.max(3, (r.total / max) * 100) : 0}%` }}
                  />
                </span>
                <span className="tabular text-right text-ink">
                  {converted ? tableMoney(r.total, period.currency) : `${tableMoney(r.totalNative, store?.currency ?? period.currency)}*`}
                </span>
              </li>
            );
          })}
      </ul>
      {rows.some((r) => !Number.isFinite(r.total)) ? (
        <p className="mt-1.5 text-xs text-muted">* In the store&apos;s own currency (no exchange rate).</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- harvest */

export interface HarvestPanelProps {
  summary: HarvestSummary;
  loading: boolean;
  currency: string;
  multi: boolean;
  /** The engine's evaluated window(s): one string when every store shares it. */
  windowLabel?: string;
  className?: string;
}

/** Sales already flowing through terms the engine says to harvest into exact / product targets. */
export function HarvestPanel({ summary, loading, currency, multi, windowLabel, className }: HarvestPanelProps) {
  const { storesById } = useOverview();
  return (
    <Panel
      title="Harvest opportunity"
      description={
        <p>
          Converting search terms the rules say to add as exact keywords or product targets
          {windowLabel ? ` (engine window: ${windowLabel})` : " (each store's rule window)"}.
        </p>
      }
      aside={
        <span className="flex size-8 items-center justify-center rounded-lg bg-good-soft" aria-hidden="true">
          <Sprout className="size-4 text-good" />
        </span>
      }
      className={className}
      footer={
        <ButtonLink href={KEYWORDS_HARVEST_HREF} size="sm" variant="secondary" iconAfter={ArrowRight}>
          Review harvests in Keywords
        </ButtonLink>
      }
    >
      <div className="space-y-5 px-4 py-4 sm:px-5">
        {loading ? (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : summary.count === 0 ? (
          <Headline
            value="0"
            label="terms to harvest"
            sub="Nothing qualifies yet: a harvest needs at least the store's minimum orders at an ACoS under target, on a term that is not already targeted."
          />
        ) : (
          <>
            <Headline
              value={count(summary.count)}
              label={summary.count === 1 ? "term to harvest" : "terms to harvest"}
              sub={
                <>
                  <strong className="tabular font-semibold text-ink">{headlineMoney(summary.sales, currency)}</strong> sales from{" "}
                  {plural(summary.orders, "order")} at <strong className="tabular font-semibold text-good">{pct(summary.acos)}</strong> ACoS
                  — about <strong className="tabular font-semibold text-ink">{headlineMoney(summary.monthly, currency)}</strong> a month to
                  move into tighter targeting.
                  {summary.unconverted
                    ? ` ${plural(summary.unconverted, "harvest")} from stores without an exchange rate are not in these totals.`
                    : ""}
                </>
              }
            />
            <div>
              <h3 className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">Top harvests</h3>
              <ol className="mt-2 divide-y divide-hairline">
                {summary.top.map(({ rec, sales }) => {
                  const store = storesById.get(rec.storeId);
                  return (
                    <li key={rec.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink" title={rec.subject}>
                          {rec.subject}
                          {rec.action === "harvest-product" ? <span className="ml-1.5 text-xs font-normal text-muted">(ASIN)</span> : null}
                        </p>
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                          {multi && store ? <StoreDot colorIndex={store.colorIndex} /> : null}
                          <span className="truncate" title={`${rec.campaign} / ${rec.adGroup}`}>
                            {multi && store ? `${store.name} · ` : ""}from {rec.campaign}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-sm text-ink">{tableMoney(sales, currency)}</p>
                        <p className="tabular text-xs text-muted">
                          {plural(rec.counters.orders, "order")} ·{" "}
                          {pct(rec.counters.sales > 0 ? rec.counters.spend / rec.counters.sales : NaN)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

/** "30 Aug – 26 Sep 2026" when every store's engine window matches, else undefined. */
export function engineWindowLabel(windows: readonly { from: string; to: string }[]): string | undefined {
  const real = windows.filter((w) => w.from && w.to);
  if (!real.length) return undefined;
  const first = real[0];
  return real.every((w) => w.from === first.from && w.to === first.to) ? dateSpan(first.from, first.to) : undefined;
}
