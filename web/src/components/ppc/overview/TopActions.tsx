"use client";

import { ArrowRight, ListChecks } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Recommendation } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { money, plural } from "../format";
import { StoreDot } from "../StoreDot";
import { viewForAction } from "../work/recs";
import { ACTION_META, actionGroup, type ActionGroup } from "./compute";
import { Panel, ScopeLink, TEXT_LINK, useOverview } from "./shared";

function impactLabel(r: Recommendation, currency: string): string | null {
  const v = r.impact ?? 0;
  if (!(v > 0)) return null;
  const amount = money(v, currency, { decimals: 0 });
  const group = actionGroup(r.action);
  return group === "harvest" || group === "bid-up" ? `+${amount} sales/mo` : `saves ${amount}/mo`;
}

/** The Keywords tab that lists this rec, filtered to it — where it can be approved. */
function recHref(r: Recommendation): string {
  return `/dashboard/keywords?view=${viewForAction(r.action)}&q=${encodeURIComponent(r.subject)}`;
}

export interface TopActionsProps {
  recs: Recommendation[];
  /** Open recommendations in scope (for the "N more" line). */
  totalOpen: number;
  loading: boolean;
  multi: boolean;
  className?: string;
}

/** The highest-priority open recommendations, as one-line rows. */
export function TopActions({ recs, totalOpen, loading, multi, className }: TopActionsProps) {
  const { storesById } = useOverview();
  return (
    <Panel
      title="Top actions"
      description={<p>Highest priority first, then biggest monthly effect. Paired negatives ride along with their harvest.</p>}
      aside={
        !loading && totalOpen ? (
          <Badge tone="brand" size="sm">
            {plural(totalOpen, "open rec")}
          </Badge>
        ) : null
      }
      className={className}
      footer={
        <ButtonLink href="/dashboard/keywords" size="sm" variant="secondary" iconAfter={ArrowRight}>
          Review all in Keywords
        </ButtonLink>
      }
    >
      {loading ? (
        <ul className="divide-y divide-hairline" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        </ul>
      ) : recs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2">
            <ListChecks className="size-5 text-faint" aria-hidden="true" />
          </span>
          <p className="font-display text-[0.9375rem] font-semibold text-ink">Nothing to act on</p>
          <p className="max-w-xs text-[0.8125rem] leading-relaxed text-muted">
            Every recommendation has a decision, or the rules found nothing worth changing in the latest window.
          </p>
        </div>
      ) : (
        <ol className="@container divide-y divide-hairline">
          {recs.map((r) => {
            const store = storesById.get(r.storeId);
            const group: ActionGroup = actionGroup(r.action);
            const meta = ACTION_META[group];
            const impact = impactLabel(r, store?.currency ?? "USD");
            return (
              <li
                key={r.id}
                className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 px-4 py-2.5 sm:px-5 @md:grid-cols-[4.75rem_minmax(0,1fr)_auto]"
              >
                <span className="pt-0.5">
                  <Badge tone={meta.tone} size="sm" variant={r.priority === "high" ? "solid" : "soft"}>
                    {meta.label}
                  </Badge>
                  {r.priority === "high" ? <span className="sr-only"> (high priority)</span> : null}
                </span>
                <div className="min-w-0">
                  <p className="text-sm">
                    <ScopeLink
                      href={recHref(r)}
                      storeId={r.storeId}
                      className={cn(TEXT_LINK, "block truncate text-ink hover:text-brand [@media(pointer:coarse)]:leading-[2.75rem]")}
                      title={r.subject}
                    >
                      {r.subject}
                    </ScopeLink>
                  </p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                    {multi && store ? <StoreDot colorIndex={store.colorIndex} /> : null}
                    <span className="truncate" title={`${r.campaign} / ${r.adGroup} — ${r.reason}`}>
                      {multi && store ? `${store.name} · ` : ""}
                      {r.reason}
                    </span>
                  </p>
                </div>
                {impact ? (
                  <span className="col-start-2 tabular text-xs font-medium whitespace-nowrap text-ink @md:col-start-auto @md:pt-0.5 @md:text-right">
                    {impact}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
