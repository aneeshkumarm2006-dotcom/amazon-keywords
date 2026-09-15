"use client";

import { Leaf, PieChart as PieIcon, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricChip } from "@/components/ui/Badge";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { tacosDefaults } from "@/content/calculators";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

import { CalcPanel, CalcShell, buildReport } from "./CalcShell";
import {
  AXIS_TICK,
  AXIS_TICK_SMALL,
  CHART_A11Y,
  CHART_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  ChartCard,
  LEGEND_STYLE,
} from "./ChartCard";
import { CurrencyField } from "./fields";
import { FormulaLine, FormulaStack } from "./FormulaLine";
import { TONE_VAR, div, money, mult, pct, points, signedPct } from "./format";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { ScenarioSlider } from "./ScenarioSlider";
import { useCalcState } from "./useCalcState";

/**
 * TACoS calculator.
 *
 * ACoS only sees the sales advertising can claim. TACoS — ad spend over total
 * sales, ad and organic together — sees whether the whole product is getting
 * healthier. The useful reading is never the level, it is the direction, and
 * the direction only means something next to what total sales did.
 *
 * Hence two periods and the four-quadrant read: the same TACoS number is a
 * success or a warning depending on whether revenue moved with it.
 */

interface Quadrant {
  id: string;
  title: string;
  tone: Tone;
  meaning: string;
  action: string;
}

const QUADRANTS: Record<string, Quadrant> = {
  compounding: {
    id: "compounding",
    title: "Organic is compounding",
    tone: "good",
    meaning:
      "TACoS fell while total sales rose. Organic sales are growing faster than ad spend, which is exactly what advertising is supposed to buy: rank that keeps selling after the click stops.",
    action:
      "Hold the strategy. Reinvest part of the saved spend into the next tier of keywords rather than banking all of it.",
  },
  buying: {
    id: "buying",
    title: "Buying growth",
    tone: "warn",
    meaning:
      "TACoS rose and total sales rose with it. Growth is real but it is being paid for. That is the correct shape during a launch or a Q4 push, and the wrong shape for a mature product.",
    action:
      "Decide explicitly whether this is a launch. If it is not, cap spend at last period's level and see whether sales hold.",
  },
  starving: {
    id: "starving",
    title: "Under-invested",
    tone: "info",
    meaning:
      "TACoS fell but so did total sales. Spend came down faster than revenue, so efficiency improved on a shrinking base — usually a budget cut, a stock-out or a seasonal dip rather than a win.",
    action:
      "Check inventory and daily budget caps before celebrating. Efficiency on a falling top line is not a result.",
  },
  renting: {
    id: "renting",
    title: "Renting revenue",
    tone: "bad",
    meaning:
      "TACoS rose while total sales were flat or falling. The account is paying more to stand still, which means organic share is eroding and ads are backfilling it.",
    action:
      "Audit the listing and the competition before touching bids. A TACoS rise with flat sales is usually a conversion-rate problem wearing a bidding costume.",
  },
};

function quadrantFor(tacosDelta: number, revenueChange: number): Quadrant {
  const salesUp = revenueChange > 0.5;
  const tacosUp = tacosDelta > 0.05;
  if (!tacosUp && salesUp) return QUADRANTS.compounding;
  if (tacosUp && salesUp) return QUADRANTS.buying;
  if (!tacosUp && !salesUp) return QUADRANTS.starving;
  return QUADRANTS.renting;
}

export function TacosCalculator() {
  const { values, set, reset } = useCalcState("tacos", {
    ...tacosDefaults,
    organicGrowth: 0,
  });
  const {
    adSpend,
    adRevenue,
    totalRevenue,
    priorAdSpend,
    priorAdRevenue,
    priorTotalRevenue,
    organicGrowth,
  } = values;

  const model = useMemo(() => {
    const period = (spend: number, adSales: number, total: number) => {
      const organic = total - adSales;
      return {
        spend,
        adSales,
        total,
        organic,
        tacos: div(spend, total) * 100,
        acos: div(spend, adSales) * 100,
        roas: div(adSales, spend),
        organicShare: div(organic, total) * 100,
        adShare: div(adSales, total) * 100,
      };
    };

    const now = period(adSpend, adRevenue, totalRevenue);
    const prior = period(priorAdSpend, priorAdRevenue, priorTotalRevenue);

    const tacosDelta = now.tacos - prior.tacos;
    const acosDelta = now.acos - prior.acos;
    const revenueChange = div(now.total - prior.total, prior.total) * 100;
    const organicChange = div(now.organic - prior.organic, prior.organic) * 100;
    const spendChange = div(now.spend - prior.spend, prior.spend) * 100;
    const organicShareDelta = now.organicShare - prior.organicShare;

    const quadrant = quadrantFor(tacosDelta, revenueChange);

    const chartRows = [
      {
        period: "Last month",
        adRevenue: prior.adSales,
        organic: prior.organic,
        tacos: prior.tacos,
      },
      { period: "This month", adRevenue: now.adSales, organic: now.organic, tacos: now.tacos },
    ];

    // Projection: hold ad spend, grow organic by the slider, see where TACoS lands.
    const projectedOrganic = now.organic * (1 + organicGrowth / 100);
    const projectedTotal = now.adSales + projectedOrganic;
    const projectedTacos = div(now.spend, projectedTotal) * 100;

    return {
      now,
      prior,
      tacosDelta,
      acosDelta,
      revenueChange,
      organicChange,
      spendChange,
      organicShareDelta,
      quadrant,
      chartRows,
      projectedOrganic,
      projectedTotal,
      projectedTacos,
    };
  }, [
    adSpend,
    adRevenue,
    totalRevenue,
    priorAdSpend,
    priorAdRevenue,
    priorTotalRevenue,
    organicGrowth,
  ]);

  const adRevenueOverTotal = adRevenue > totalRevenue;

  const report = buildReport("TACoS", [
    {
      heading: "This month",
      lines: [
        ["Ad spend", money(adSpend, 0)],
        ["Ad revenue", money(adRevenue, 0)],
        ["Total revenue", money(totalRevenue, 0)],
        ["Organic revenue", money(model.now.organic, 0)],
        ["TACoS", pct(model.now.tacos)],
        ["ACoS", pct(model.now.acos)],
        ["ROAS", mult(model.now.roas)],
        ["Organic share", pct(model.now.organicShare)],
      ],
    },
    {
      heading: "Last month",
      lines: [
        ["Ad spend", money(priorAdSpend, 0)],
        ["Ad revenue", money(priorAdRevenue, 0)],
        ["Total revenue", money(priorTotalRevenue, 0)],
        ["Organic revenue", money(model.prior.organic, 0)],
        ["TACoS", pct(model.prior.tacos)],
        ["ACoS", pct(model.prior.acos)],
        ["Organic share", pct(model.prior.organicShare)],
      ],
    },
    {
      heading: "Movement",
      lines: [
        ["TACoS", points(model.tacosDelta)],
        ["ACoS", points(model.acosDelta)],
        ["Total revenue", signedPct(model.revenueChange, 1)],
        ["Organic revenue", signedPct(model.organicChange, 1)],
        ["Ad spend", signedPct(model.spendChange, 1)],
        ["Organic share", points(model.organicShareDelta)],
        ["Reading", model.quadrant.title],
      ],
    },
  ]);

  return (
    <CalcShell
      onReset={reset}
      copyText={report}
      inputs={
        <>
          <CurrencyField
            id="tacos-spend"
            label="Ad spend this month"
            value={adSpend}
            onChange={(next) => set("adSpend", next)}
            hint="Every ad type: Sponsored Products, Brands and Display."
            step={50}
          />
          <CurrencyField
            id="tacos-ad-revenue"
            label="Ad revenue this month"
            value={adRevenue}
            onChange={(next) => set("adRevenue", next)}
            hint="Ad-attributed sales only."
            step={50}
          />
          <CurrencyField
            id="tacos-total-revenue"
            label="Total revenue this month"
            value={totalRevenue}
            onChange={(next) => set("totalRevenue", next)}
            hint="All sales, ad and organic, from the Business Report."
            step={50}
          />
          <CurrencyField
            id="tacos-prior-spend"
            label="Ad spend last month"
            value={priorAdSpend}
            onChange={(next) => set("priorAdSpend", next)}
            hint="Comparison period."
            step={50}
          />
          <CurrencyField
            id="tacos-prior-ad-revenue"
            label="Ad revenue last month"
            value={priorAdRevenue}
            onChange={(next) => set("priorAdRevenue", next)}
            hint="Comparison period."
            step={50}
          />
          <CurrencyField
            id="tacos-prior-total-revenue"
            label="Total revenue last month"
            value={priorTotalRevenue}
            onChange={(next) => set("priorTotalRevenue", next)}
            hint="Comparison period."
            step={50}
          />
        </>
      }
    >
      {adRevenueOverTotal ? (
        <div className="rounded-xl border border-warn/35 bg-warn-soft px-4 py-3 text-sm leading-relaxed text-ink">
          Ad revenue is higher than total revenue, which cannot happen — ad-attributed sales are a
          subset of all sales. Check that you took total revenue from the Business Report and not
          from the advertising console.
        </div>
      ) : null}

      <ResultGrid>
        <ResultTile
          label="TACoS"
          value={pct(model.now.tacos)}
          tone={model.tacosDelta <= 0 ? "good" : "warn"}
          emphasis
          icon={model.tacosDelta <= 0 ? TrendingDown : TrendingUp}
          hint={`${points(model.tacosDelta)} against ${pct(model.prior.tacos)} last month`}
        />
        <ResultTile
          label="ACoS"
          value={pct(model.now.acos)}
          tone={model.acosDelta <= 0 ? "good" : "warn"}
          emphasis
          hint={`${points(model.acosDelta)} · ROAS ${mult(model.now.roas)}`}
        />
        <ResultTile
          label="Organic revenue"
          value={money(model.now.organic, 0)}
          tone={model.organicChange >= 0 ? "good" : "bad"}
          emphasis
          icon={Leaf}
          hint={`${signedPct(model.organicChange, 1)} against last month`}
        />
        <ResultTile
          label="Organic share"
          value={pct(model.now.organicShare)}
          tone={model.organicShareDelta >= 0 ? "good" : "warn"}
          emphasis
          icon={PieIcon}
          hint={`${points(model.organicShareDelta)} · ads carry ${pct(model.now.adShare)}`}
        />
      </ResultGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <ChartCard
          title="Ad and organic revenue, month against month"
          description="Stacked bars are where the revenue came from. The line is TACoS, which is ad spend against the whole stack."
          summary={`Last month ${money(model.prior.adSales, 0)} of ad revenue and ${money(model.prior.organic, 0)} of organic at ${pct(model.prior.tacos)} TACoS. This month ${money(model.now.adSales, 0)} of ad revenue and ${money(model.now.organic, 0)} of organic at ${pct(model.now.tacos)} TACoS. Total revenue moved ${signedPct(model.revenueChange, 1)} and organic ${signedPct(model.organicChange, 1)}.`}
          height={270}
          table={{
            caption: "Ad revenue, organic revenue, total and TACoS for both periods.",
            head: ["Period", "Ad revenue", "Organic", "Total", "TACoS"],
            rows: model.chartRows.map((row) => ({
              label: row.period,
              cells: [
                money(row.adRevenue, 0),
                money(row.organic, 0),
                money(row.adRevenue + row.organic, 0),
                pct(row.tacos),
              ],
            })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...CHART_A11Y} data={model.chartRows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis
                dataKey="period"
                tick={AXIS_TICK_SMALL}
                tickLine={false}
                axisLine={{ stroke: "var(--hairline)" }}
                height={26}
              />
              <YAxis
                yAxisId="revenue"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={(value: number) =>
                  Math.abs(value) >= 1000 ? `$${Math.round(value / 1000)}k` : `$${Math.round(value)}`
                }
              />
              <YAxis
                yAxisId="tacos"
                orientation="right"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, "dataMax"]}
                tickFormatter={(value: number) => `${Math.round(value)}%`}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_LABEL_STYLE}
                formatter={(value: unknown, name: unknown) =>
                  name === "TACoS"
                    ? [pct(Number(value)), "TACoS"]
                    : [money(Number(value), 0), String(name)]
                }
              />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <Bar
                yAxisId="revenue"
                dataKey="adRevenue"
                name="Ad revenue"
                stackId="revenue"
                fill={TONE_VAR.brand}
              />
              <Bar
                yAxisId="revenue"
                dataKey="organic"
                name="Organic revenue"
                stackId="revenue"
                fill={TONE_VAR.good}
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="tacos"
                type="linear"
                dataKey="tacos"
                name="TACoS"
                stroke="var(--ember)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <CalcPanel
          title="Month on month"
          description="TACoS on its own says nothing. These two rows together are the reading."
        >
          <Table caption="This month against last month across every metric.">
            <THead>
              <TR>
                <TH>Metric</TH>
                <TH numeric>Last month</TH>
                <TH numeric>This month</TH>
                <TH numeric>Change</TH>
              </TR>
            </THead>
            <TBody>
              {[
                {
                  label: "Ad spend",
                  prior: money(model.prior.spend, 0),
                  now: money(model.now.spend, 0),
                  change: signedPct(model.spendChange, 1),
                  good: model.spendChange <= 0,
                },
                {
                  label: "Ad revenue",
                  prior: money(model.prior.adSales, 0),
                  now: money(model.now.adSales, 0),
                  change: signedPct(div(model.now.adSales - model.prior.adSales, model.prior.adSales) * 100, 1),
                  good: model.now.adSales >= model.prior.adSales,
                },
                {
                  label: "Organic revenue",
                  prior: money(model.prior.organic, 0),
                  now: money(model.now.organic, 0),
                  change: signedPct(model.organicChange, 1),
                  good: model.organicChange >= 0,
                },
                {
                  label: "Total revenue",
                  prior: money(model.prior.total, 0),
                  now: money(model.now.total, 0),
                  change: signedPct(model.revenueChange, 1),
                  good: model.revenueChange >= 0,
                },
                {
                  label: "TACoS",
                  prior: pct(model.prior.tacos),
                  now: pct(model.now.tacos),
                  change: points(model.tacosDelta),
                  good: model.tacosDelta <= 0,
                },
                {
                  label: "ACoS",
                  prior: pct(model.prior.acos),
                  now: pct(model.now.acos),
                  change: points(model.acosDelta),
                  good: model.acosDelta <= 0,
                },
                {
                  label: "Organic share",
                  prior: pct(model.prior.organicShare),
                  now: pct(model.now.organicShare),
                  change: points(model.organicShareDelta),
                  good: model.organicShareDelta >= 0,
                },
              ].map((row) => (
                <TR key={row.label}>
                  <THRow>{row.label}</THRow>
                  <TD numeric mono className="text-muted">
                    {row.prior}
                  </TD>
                  <TD numeric mono className="font-semibold">
                    {row.now}
                  </TD>
                  <TD numeric mono className={cn("font-semibold", row.good ? "text-good" : "text-bad")}>
                    {row.change}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CalcPanel>
      </div>

      <CalcPanel
        title={`The reading: ${model.quadrant.title}`}
        description="Four combinations of TACoS direction and total-sales direction. Only one of them is the outcome advertising is supposed to produce."
        actions={
          <MetricChip label="Pattern" value={model.quadrant.title} tone={model.quadrant.tone} />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(QUADRANTS).map((quadrant) => {
            const active = quadrant.id === model.quadrant.id;
            return (
              <div
                key={quadrant.id}
                className={cn(
                  "rounded-lg border p-3.5",
                  active
                    ? "border-brand/40 bg-brand-soft"
                    : "border-hairline bg-canvas opacity-75",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TONE_VAR[quadrant.tone] }}
                    aria-hidden="true"
                  />
                  <p className="font-display text-[0.875rem] font-semibold text-ink">
                    {quadrant.title}
                  </p>
                  {active ? (
                    <span className="ml-auto text-[0.6875rem] font-semibold tracking-wide text-brand uppercase">
                      You are here
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                  {quadrant.meaning}
                </p>
                {active ? (
                  <p className="mt-2 text-[0.8125rem] leading-relaxed font-medium text-ink">
                    {quadrant.action}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CalcPanel>

      <CalcPanel
        title="What has to happen to organic for TACoS to fall further?"
        description="Hold ad spend where it is and move organic revenue. TACoS is the whole point of the exercise: the same spend against a bigger base."
        actions={
          <MetricChip
            label="Projected TACoS"
            value={pct(model.projectedTacos)}
            tone={model.projectedTacos <= model.now.tacos ? "good" : "warn"}
          />
        }
      >
        <ScenarioSlider
          id="tacos-organic-growth"
          label="Change organic revenue by"
          value={organicGrowth}
          onChange={(next) => set("organicGrowth", next)}
          min={-50}
          max={150}
          step={5}
          format={(value) => signedPct(value)}
          hint={`Organic ${money(model.projectedOrganic, 0)} · total ${money(model.projectedTotal, 0)}`}
          marks={[-25, 0, 25, 50, 100]}
        />

        <ResultGrid columns={3} className="mt-5">
          <ResultTile
            label="Projected organic revenue"
            value={money(model.projectedOrganic, 0)}
            hint={`${signedPct(organicGrowth)} on ${money(model.now.organic, 0)}`}
          />
          <ResultTile
            label="Projected total revenue"
            value={money(model.projectedTotal, 0)}
            hint={`Ad revenue held at ${money(model.now.adSales, 0)}`}
          />
          <ResultTile
            label="Projected TACoS"
            value={pct(model.projectedTacos)}
            tone={model.projectedTacos <= model.now.tacos ? "good" : "warn"}
            hint={`${points(model.projectedTacos - model.now.tacos)} against today, at the same ${money(adSpend, 0)} of spend`}
          />
        </ResultGrid>
      </CalcPanel>

      <FormulaStack description="Four lines. The difference between the first two is the whole reason TACoS exists.">
        <FormulaLine
          label="TACoS"
          formula="Ad spend / Total revenue x 100"
          substituted={`${money(adSpend, 0)} / ${money(totalRevenue, 0)} x 100`}
          result={pct(model.now.tacos)}
          tone={model.tacosDelta <= 0 ? "good" : "warn"}
        />
        <FormulaLine
          label="ACoS"
          formula="Ad spend / Ad revenue x 100"
          substituted={`${money(adSpend, 0)} / ${money(adRevenue, 0)} x 100`}
          result={pct(model.now.acos)}
          note="ACoS only sees the sales advertising can claim. TACoS sees the whole product."
        />
        <FormulaLine
          label="Organic revenue"
          formula="Total revenue - Ad revenue"
          substituted={`${money(totalRevenue, 0)} - ${money(adRevenue, 0)}`}
          result={money(model.now.organic, 0)}
          tone="good"
        />
        <FormulaLine
          label="Organic share"
          formula="Organic revenue / Total revenue x 100"
          substituted={`${money(model.now.organic, 0)} / ${money(totalRevenue, 0)} x 100`}
          result={pct(model.now.organicShare)}
          tone={model.organicShareDelta >= 0 ? "good" : "warn"}
          note={`Last month ${pct(model.prior.organicShare)}, so organic share moved ${points(model.organicShareDelta)}.`}
        />
      </FormulaStack>

      <Interpretation
        tone={model.quadrant.tone}
        title={model.quadrant.title}
        next={[
          model.quadrant.action,
          `Report TACoS to the client alongside total revenue, never on its own — ${pct(model.now.tacos)} means nothing without the ${money(totalRevenue, 0)} it is measured against.`,
          `Track organic share month on month. It moved ${points(model.organicShareDelta)} this period; two consecutive falls is the signal to audit the listing, not the campaigns.`,
          `Set the next review for the same day next month with the same two reports — the advertising console for spend and ad sales, the Business Report for total sales.`,
        ]}
      >
        <p>
          {money(adSpend, 0)} of ad spend against {money(totalRevenue, 0)} of total sales is a{" "}
          <strong>{pct(model.now.tacos)} TACoS</strong>, against {pct(model.now.acos)} ACoS on the{" "}
          {money(adRevenue, 0)} advertising can claim. The gap between those two numbers is the{" "}
          {money(model.now.organic, 0)} of organic revenue — {pct(model.now.organicShare)} of the
          business — that advertising is not paying for directly.
        </p>
        <p>
          Month on month TACoS moved {points(model.tacosDelta)} while total revenue moved{" "}
          {signedPct(model.revenueChange, 1)} and organic revenue{" "}
          {signedPct(model.organicChange, 1)}. {model.quadrant.meaning}
        </p>
      </Interpretation>
    </CalcShell>
  );
}
