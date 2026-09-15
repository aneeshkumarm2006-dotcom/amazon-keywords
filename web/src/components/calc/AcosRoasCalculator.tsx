"use client";

import { Coins, Percent, PiggyBank, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricChip } from "@/components/ui/Badge";
import { acosRoasDefaults } from "@/content/calculators";

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
import { acosTone, acosVerdict, div, money, mult, num, pct, signedPct, TONE_VAR } from "./format";
import { Gauge, type GaugeBand } from "./Gauge";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { ScenarioSlider } from "./ScenarioSlider";
import { useCalcState } from "./useCalcState";

/**
 * ACoS / ROAS calculator.
 *
 * The six result tiles are the `ACoS ROAS Calculator` sheet of
 * `ACoS-ROAS-Calculator.xlsx`, cell for cell. The scenario section is the
 * workbook's "what if I increase spend" block with one addition: because the
 * sheet asks for a spend change *and* the revenue increase expected from it,
 * those two numbers imply a response curve, and the chart sweeps it. That is
 * where the useful answer lives — not "is more spend better" but "at what
 * point does the next dollar stop paying for itself".
 */

const SWEEP_MIN = -50;
const SWEEP_MAX = 150;
const SWEEP_STEP = 10;

/**
 * Revenue elasticity implied by the scenario pair: a +50% spend change that
 * returns +25% revenue means revenue moves with spend to the power 0.55.
 * Clamped to [0, 3]; 1.0 (strictly proportional) when the pair says nothing.
 */
function elasticityFrom(spendChange: number, revenueIncrease: number): number {
  const spendFactor = 1 + spendChange / 100;
  const revenueFactor = 1 + revenueIncrease / 100;
  if (spendFactor <= 0 || revenueFactor <= 0 || Math.abs(spendChange) < 0.5) return 1;
  const exponent = Math.log(revenueFactor) / Math.log(spendFactor);
  if (!Number.isFinite(exponent)) return 1;
  return Math.min(3, Math.max(0, exponent));
}

export function AcosRoasCalculator() {
  const { values, set, reset } = useCalcState("acos-roas", acosRoasDefaults);
  const { adSpend, adRevenue, price, cogs, fbaFee, spendChange, revenueResponse } = values;

  const model = useMemo(() => {
    const unitCost = cogs + fbaFee;
    const units = div(adRevenue, price);
    const acos = div(adSpend, adRevenue) * 100;
    const roas = div(adRevenue, adSpend);
    const marginRatio = div(price - unitCost, price);
    const breakEven = marginRatio * 100;
    const netProfit = adRevenue - adSpend - unitCost * units;
    const profitPerDollar = div(netProfit, adSpend);

    // `revenueResponse` is stored as the expected revenue increase in percent.
    const elasticity = elasticityFrom(spendChange, revenueResponse);
    const projectedSpend = adSpend * (1 + spendChange / 100);
    const projectedRevenue = adRevenue * Math.pow(Math.max(0, 1 + spendChange / 100), elasticity);
    const projectedUnits = div(projectedRevenue, price);
    const projectedAcos = div(projectedSpend, projectedRevenue) * 100;
    const projectedRoas = div(projectedRevenue, projectedSpend);
    const projectedProfit = projectedRevenue - projectedSpend - unitCost * projectedUnits;

    const sweep: { change: number; spend: number; revenue: number; profit: number; acos: number }[] =
      [];
    for (let change = SWEEP_MIN; change <= SWEEP_MAX + 0.001; change += SWEEP_STEP) {
      const factor = Math.max(0, 1 + change / 100);
      const spend = adSpend * factor;
      const revenue = adRevenue * Math.pow(factor, elasticity);
      sweep.push({
        change: Math.round(change),
        spend,
        revenue,
        profit: revenue - spend - unitCost * div(revenue, price),
        acos: div(spend, revenue) * 100,
      });
    }

    // Closed-form optimum of profit(x) = R.m.(1+x)^e - S.(1+x).
    let optimumChange = Number.NaN;
    const grossAtCurrent = adRevenue * marginRatio;
    if (elasticity > 0 && elasticity < 1 && grossAtCurrent > 0 && adSpend > 0) {
      const ratio = adSpend / (grossAtCurrent * elasticity);
      if (ratio > 0) optimumChange = (Math.pow(ratio, 1 / (elasticity - 1)) - 1) * 100;
    }

    return {
      unitCost,
      units,
      acos,
      roas,
      marginRatio,
      breakEven,
      netProfit,
      profitPerDollar,
      elasticity,
      projectedSpend,
      projectedRevenue,
      projectedAcos,
      projectedRoas,
      projectedProfit,
      sweep,
      optimumChange,
    };
  }, [adSpend, adRevenue, price, cogs, fbaFee, spendChange, revenueResponse]);

  const tone = acosTone(model.acos, model.breakEven);
  // Math.max returns NaN if any argument is NaN, so the 20 floor only holds
  // once the non-finite candidates are dropped — ACoS is NaN whenever ad
  // revenue is 0, and break-even is NaN whenever price is 0.
  const gaugeCandidates = [
    model.breakEven * 2,
    model.acos * 1.15,
    model.breakEven * 1.2 + 5,
  ].filter((candidate) => Number.isFinite(candidate));
  const gaugeMax = gaugeCandidates.length
    ? Math.max(20, Math.ceil(Math.max(...gaugeCandidates) / 10) * 10)
    : 20;
  const bands: GaugeBand[] = [
    { to: model.breakEven, tone: "good", label: "Profitable" },
    { to: Math.min(gaugeMax, model.breakEven * 1.2), tone: "warn", label: "Watch" },
    { to: gaugeMax, tone: "bad", label: "Losing money" },
  ];

  const report = buildReport("ACoS & ROAS", [
    {
      heading: "Inputs",
      lines: [
        ["Ad spend", money(adSpend)],
        ["Ad revenue", money(adRevenue)],
        ["Product price", money(price)],
        ["Cost of goods", money(cogs)],
        ["FBA fees", money(fbaFee)],
      ],
    },
    {
      heading: "Results",
      lines: [
        ["ACoS", pct(model.acos)],
        ["ROAS", mult(model.roas)],
        ["Profit margin", pct(model.breakEven)],
        ["Break-even ACoS", pct(model.breakEven)],
        ["Units sold from ads", num(model.units, 1)],
        ["Net profit after ads", money(model.netProfit)],
        ["Profit per $1 of ad spend", money(model.profitPerDollar)],
        ["Verdict", acosVerdict(model.acos, model.breakEven)],
      ],
    },
    {
      heading: `Scenario: spend ${signedPct(spendChange)}`,
      lines: [
        ["Projected ad spend", money(model.projectedSpend)],
        ["Projected ad revenue", money(model.projectedRevenue)],
        ["Projected ACoS", pct(model.projectedAcos)],
        ["Projected ROAS", mult(model.projectedRoas)],
        ["Projected net profit", money(model.projectedProfit)],
      ],
    },
  ]);

  const profitDelta = model.projectedProfit - model.netProfit;

  return (
    <CalcShell
      onReset={reset}
      copyText={report}
      inputs={
        <>
          <CurrencyField
            id="acos-ad-spend"
            label="Ad spend"
            value={adSpend}
            onChange={(next) => set("adSpend", next)}
            hint="Total spend for the period you are looking at."
            step={10}
          />
          <CurrencyField
            id="acos-ad-revenue"
            label="Ad revenue"
            value={adRevenue}
            onChange={(next) => set("adRevenue", next)}
            hint="Ad-attributed sales for the same period."
            step={10}
          />
          <CurrencyField
            id="acos-price"
            label="Product price"
            value={price}
            onChange={(next) => set("price", next)}
            hint="Average selling price, used to convert revenue into units."
            min={0.01}
          />
          <CurrencyField
            id="acos-cogs"
            label="Cost of goods"
            value={cogs}
            onChange={(next) => set("cogs", next)}
            hint="Landed unit cost before Amazon takes anything."
          />
          <CurrencyField
            id="acos-fba"
            label="FBA fees"
            value={fbaFee}
            onChange={(next) => set("fbaFee", next)}
            hint="Fulfilment fee per unit."
          />
        </>
      }
    >
      <ResultGrid>
        <ResultTile
          label="ACoS"
          value={pct(model.acos)}
          tone={tone}
          emphasis
          icon={Percent}
          hint={`Break-even is ${pct(model.breakEven)}`}
        />
        <ResultTile
          label="ROAS"
          value={mult(model.roas)}
          tone={model.roas >= div(100, model.breakEven) ? "good" : "warn"}
          emphasis
          icon={TrendingUp}
          hint={`Every $1 of spend returns ${money(model.roas)} of revenue`}
        />
        <ResultTile
          label="Net profit after ads"
          value={money(model.netProfit)}
          tone={model.netProfit >= 0 ? "good" : "bad"}
          emphasis
          icon={PiggyBank}
          hint={`On ${num(model.units, 1)} units at ${money(model.unitCost)} unit cost`}
        />
        <ResultTile
          label="Profit per $1 ad spend"
          value={money(model.profitPerDollar)}
          tone={model.profitPerDollar >= 0 ? "good" : "bad"}
          emphasis
          icon={Coins}
          hint="What the account keeps for each dollar it spends"
        />
      </ResultGrid>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] [&>*]:min-w-0">
        <CalcPanel title="Where this lands" description="ACoS against the break-even ceiling.">
          <Gauge
            value={model.acos}
            max={gaugeMax}
            bands={bands}
            valueLabel={pct(model.acos)}
            caption={`Break-even ${pct(model.breakEven)} · watch band to ${pct(model.breakEven * 1.2)}`}
            scaleLabels={["0%", pct(gaugeMax, 0)]}
          />
        </CalcPanel>

        <FormulaStack description="Every figure above, worked out with the numbers you typed.">
          <FormulaLine
            label="ACoS"
            formula="Ad spend / Ad revenue x 100"
            substituted={`${money(adSpend)} / ${money(adRevenue)} x 100`}
            result={pct(model.acos)}
            tone={tone}
          />
          <FormulaLine
            label="ROAS"
            formula="Ad revenue / Ad spend"
            substituted={`${money(adRevenue)} / ${money(adSpend)}`}
            result={mult(model.roas)}
          />
          <FormulaLine
            label="Break-even ACoS (= profit margin before ads)"
            formula="(Price - COGS - FBA fee) / Price x 100"
            substituted={`(${money(price)} - ${money(cogs)} - ${money(fbaFee)}) / ${money(price)} x 100`}
            result={pct(model.breakEven)}
          />
          <FormulaLine
            label="Net profit after ads"
            formula="Ad revenue - Ad spend - (COGS + FBA) x Units"
            substituted={`${money(adRevenue)} - ${money(adSpend)} - ${money(model.unitCost)} x ${num(model.units, 1)}`}
            result={money(model.netProfit)}
            tone={model.netProfit >= 0 ? "good" : "bad"}
            note={`Units come from ad revenue divided by price: ${money(adRevenue)} / ${money(price)} = ${num(model.units, 1)} units.`}
          />
        </FormulaStack>
      </div>

      <CalcPanel
        title="What if I spend more?"
        description="Set the spend change and the revenue increase you expect from it. The pair implies a response curve, and the chart below sweeps it."
        actions={
          <MetricChip
            label="Response"
            value={`${model.elasticity.toFixed(2)} elasticity`}
            tone={model.elasticity >= 1 ? "good" : "info"}
          />
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <ScenarioSlider
            id="acos-spend-change"
            label="Change ad spend by"
            value={spendChange}
            onChange={(next) => set("spendChange", next)}
            min={SWEEP_MIN}
            max={SWEEP_MAX}
            step={5}
            format={(value) => signedPct(value)}
            hint={`New spend ${money(model.projectedSpend)}`}
            marks={[-50, -25, 0, 25, 50, 100, 150]}
          />
          <ScenarioSlider
            id="acos-revenue-response"
            label="Expected revenue increase"
            value={revenueResponse}
            onChange={(next) => set("revenueResponse", next)}
            min={-50}
            max={150}
            step={5}
            format={(value) => signedPct(value)}
            hint={`New revenue ${money(model.projectedRevenue)}`}
            marks={[-25, 0, 25, 50, 100]}
          />
        </div>

        <ResultGrid className="mt-5">
          <ResultTile
            label="Projected ad spend"
            value={money(model.projectedSpend)}
            hint={`${signedPct(spendChange)} on ${money(adSpend)}`}
          />
          <ResultTile
            label="Projected ad revenue"
            value={money(model.projectedRevenue)}
            hint={`${signedPct(div(model.projectedRevenue - adRevenue, adRevenue) * 100, 1)} on ${money(adRevenue)}`}
          />
          <ResultTile
            label="Projected ACoS"
            value={pct(model.projectedAcos)}
            tone={acosTone(model.projectedAcos, model.breakEven)}
            hint={`Now ${pct(model.acos)} · ROAS ${mult(model.projectedRoas)}`}
          />
          <ResultTile
            label="Projected net profit"
            value={money(model.projectedProfit)}
            tone={profitDelta >= 0 ? "good" : "bad"}
            hint={`${profitDelta >= 0 ? "+" : "−"}${money(Math.abs(profitDelta))} against today`}
          />
        </ResultGrid>
      </CalcPanel>

      <ChartCard
        title="Net profit and ACoS across the spend curve"
        description="Bars are net profit after ads at each spend level. The line is the ACoS that comes with it, against the dashed break-even ceiling."
        summary={`Net profit and ACoS modelled from ${SWEEP_MIN}% to +${SWEEP_MAX}% change in ad spend, at a revenue elasticity of ${model.elasticity.toFixed(2)}. ${
          Number.isFinite(model.optimumChange)
            ? `Net profit peaks at a ${signedPct(model.optimumChange)} change in spend.`
            : "Net profit rises across the whole range at this elasticity."
        }`}
        height={300}
        table={{
          caption: "Modelled spend, revenue, net profit and ACoS at each spend change.",
          head: ["Spend change", "Ad spend", "Ad revenue", "Net profit", "ACoS"],
          rows: model.sweep
            .filter((row) => row.change % 25 === 0 || row.change === Math.round(spendChange))
            .map((row) => ({
              label: signedPct(row.change),
              cells: [money(row.spend), money(row.revenue), money(row.profit), pct(row.acos)],
            })),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart {...CHART_A11Y} data={model.sweep} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="change"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tickFormatter={(value: number) => signedPct(value)}
              interval="preserveStartEnd"
              minTickGap={18}
              height={26}
            />
            <YAxis
              yAxisId="profit"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={(value: number) =>
                Math.abs(value) >= 1000 ? `$${Math.round(value / 1000)}k` : `$${Math.round(value)}`
              }
            />
            <YAxis
              yAxisId="acos"
              orientation="right"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${Math.round(value)}%`}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              labelFormatter={(value) => `Spend ${signedPct(Number(value))}`}
              formatter={(value: unknown, name: unknown) =>
                name === "ACoS"
                  ? [pct(Number(value)), "ACoS"]
                  : [money(Number(value)), "Net profit"]
              }
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <ReferenceLine yAxisId="profit" y={0} stroke="var(--hairline-strong)" />
            <ReferenceLine
              yAxisId="acos"
              y={model.breakEven}
              stroke="var(--bad)"
              strokeDasharray="4 4"
            />
            <Bar yAxisId="profit" dataKey="profit" name="Net profit" radius={[3, 3, 0, 0]}>
              {model.sweep.map((row) => (
                <Cell
                  key={row.change}
                  fill={row.profit >= 0 ? TONE_VAR.good : TONE_VAR.bad}
                  opacity={row.change === Math.round(spendChange) ? 1 : 0.55}
                />
              ))}
            </Bar>
            <Line
              yAxisId="acos"
              type="monotone"
              dataKey="acos"
              name="ACoS"
              stroke="var(--ember)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <Interpretation
        tone={tone}
        title={acosVerdict(model.acos, model.breakEven)}
        next={
          tone === "good"
            ? [
                Number.isFinite(model.optimumChange) && model.optimumChange > 5
                  ? `Raise spend toward ${signedPct(model.optimumChange)} (${money(adSpend * (1 + model.optimumChange / 100))}) in 20% steps, checking ACoS after each step.`
                  : "Hold spend where it is — the curve says the next dollar earns less than it costs.",
                "Move the winning search terms into their own exact-match ad group before you scale the budget.",
                "Re-run this with next week's numbers; the elasticity changes as the auction does.",
              ]
            : tone === "warn"
              ? [
                  `Cut bids by 10-15% on the keywords above ${pct(model.breakEven)} ACoS rather than cutting budget.`,
                  "Check the search term report for terms with clicks and no orders — that is usually where the gap is.",
                  "Re-check in seven days; a single bad week is noise, two is a trend.",
                ]
              : [
                  `Find every keyword above ${pct(model.breakEven)} ACoS and cut its bid by 15%.`,
                  "Negate search terms with 15+ clicks and no orders.",
                  "Check the listing before blaming the ads: a conversion rate problem looks exactly like a bidding problem.",
                ]
        }
      >
        <p>
          At {money(adSpend)} of spend against {money(adRevenue)} of ad revenue the campaign runs at{" "}
          <strong>{pct(model.acos)} ACoS</strong>, a ROAS of {mult(model.roas)}. Break-even sits at{" "}
          {pct(model.breakEven)}, so the advertising{" "}
          {model.netProfit >= 0 ? "leaves" : "loses"}{" "}
          <strong>{money(Math.abs(model.netProfit))}</strong> after the cost of the{" "}
          {num(model.units, 1)} units it sold.
        </p>
        {Number.isFinite(model.optimumChange) ? (
          <p>
            On the response you entered — {signedPct(spendChange)} spend returning{" "}
            {signedPct(revenueResponse)} revenue — profit peaks at a{" "}
            {signedPct(model.optimumChange)} change in spend, about{" "}
            {money(adSpend * (1 + model.optimumChange / 100))} a period. Past that the extra
            revenue no longer covers the extra click cost.
          </p>
        ) : (
          <p>
            The response you entered is close to proportional, which means the model cannot find a
            ceiling: every extra dollar keeps paying. That is almost never true for long, so treat
            it as a signal to scale in steps and re-measure rather than a licence to double the
            budget.
          </p>
        )}
      </Interpretation>
    </CalcShell>
  );
}
