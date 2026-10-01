import { StatTile } from "@/components/ui/StatTile";
import { TONE_ICON } from "@/components/ui/tone";
import { cn } from "@/lib/utils";

import { count, money, pct } from "../format";
import type { Kpi, PeriodResult } from "./compute";
import { buildKpis } from "./compute";
import { headlineMoney, ratioX } from "./shared";

function formatValue(k: Kpi, currency: string): string {
  switch (k.format) {
    case "money":
      return headlineMoney(k.value, currency);
    case "moneyPrecise":
      return money(k.value, currency);
    case "pct":
      return pct(k.value, k.key === "ctr" ? 2 : 1);
    case "ratio":
      return ratioX(k.value);
    case "count":
      return count(k.value);
  }
}

const VERDICT: Record<string, string> = {
  good: "at or under target",
  warn: "over target, under break-even",
  bad: "above break-even",
  neutral: "",
};

export interface KpiTilesProps {
  period: PeriodResult;
}

/**
 * The eight headline numbers for the period, each with its change against the
 * previous period of equal length. There is deliberately no TACoS tile: it
 * needs total (organic + ad) sales, which a Search Term Report does not carry.
 */
export function KpiTiles({ period }: KpiTilesProps) {
  const kpis = buildKpis(period);
  const currency = period.currency;
  const weighted = period.convert && period.stores.length > 1;

  const hintFor = (k: Kpi): string => {
    if (k.key === "acos") {
      return Number.isFinite(period.target.acos)
        ? `Target ${pct(period.target.acos)}${weighted ? " (spend-weighted)" : ""}`
        : "No target set";
    }
    if (!period.prevHasData) return "No earlier data";
    const totalsKpi = k.key === "spend" || k.key === "sales" || k.key === "orders";
    if (totalsKpi && !period.prevCovered) return "Previous period incomplete";
    return `was ${formatValue({ ...k, value: k.prev }, currency)}`;
  };

  return (
    <section aria-label={`Key metrics, last ${period.days} days`} className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {kpis.map((k) => {
        const text = formatValue(k, currency);
        const tone = k.tone && k.tone !== "neutral" ? k.tone : undefined;
        return (
          <StatTile
            key={k.key}
            compact
            label={k.label}
            value={
              tone ? (
                <span className={cn(TONE_ICON[tone])}>
                  {text}
                  <span className="sr-only">, {VERDICT[tone]}</span>
                </span>
              ) : (
                text
              )
            }
            hint={hintFor(k)}
            delta={k.delta?.label}
            deltaDirection={k.delta?.direction}
            deltaTone={k.delta?.tone}
            className="min-w-0"
          />
        );
      })}
    </section>
  );
}
