"use client";

import { MousePointerClick, Scale, ShieldCheck, Target } from "lucide-react";
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
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { breakEvenDefaults } from "@/content/calculators";

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
import { CurrencyField, PercentField } from "./fields";
import { FormulaLine, FormulaStack } from "./FormulaLine";
import { TONE_VAR, div, money, num, pct } from "./format";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { ScenarioSlider } from "./ScenarioSlider";
import { useCalcState } from "./useCalcState";

/**
 * Break-even ACoS.
 *
 * One number, done properly. Break-even ACoS is the profit margin before
 * advertising — at that ACoS the ad costs exactly the profit on the unit it
 * sold. It is a ceiling, not a target.
 *
 * The target is what is left after deciding how much of the margin advertising
 * is allowed to eat, which is a business decision about growth against profit
 * rather than a calculation. The retention slider makes that decision explicit
 * and prices it: every point of margin you keep is a point of ACoS you give up.
 */

const RETENTION_LEVELS = [0, 20, 40, 60, 80];

export function BreakEvenAcosCalculator() {
  const { values, set, reset } = useCalcState("break-even-acos", breakEvenDefaults);
  const { price, cogs, shipping, fbaFee, referralPct, otherCosts, cvr, profitRetention } = values;

  const model = useMemo(() => {
    const referralFee = price * (referralPct / 100);
    const totalCost = cogs + shipping + fbaFee + referralFee + otherCosts;
    const profitPerUnit = price - totalCost;
    const breakEvenAcos = div(profitPerUnit, price) * 100;
    const targetAcos = breakEvenAcos * (1 - profitRetention / 100);

    const cvrRatio = cvr / 100;
    const breakEvenCpc = (breakEvenAcos / 100) * price * cvrRatio;
    const targetCpc = (targetAcos / 100) * price * cvrRatio;
    const clicksPerOrder = div(100, cvr);

    const adCostPerUnit = (targetAcos / 100) * price;
    const profitKeptPerUnit = profitPerUnit - adCostPerUnit;

    const levels = RETENTION_LEVELS.map((retention) => {
      const acos = breakEvenAcos * (1 - retention / 100);
      const adCost = (acos / 100) * price;
      return {
        retention,
        acos,
        cpc: (acos / 100) * price * cvrRatio,
        adCost,
        profitKept: profitPerUnit - adCost,
        current: Math.abs(retention - profitRetention) < 0.001,
      };
    });

    return {
      referralFee,
      totalCost,
      profitPerUnit,
      breakEvenAcos,
      targetAcos,
      breakEvenCpc,
      targetCpc,
      clicksPerOrder,
      adCostPerUnit,
      profitKeptPerUnit,
      levels,
    };
  }, [price, cogs, shipping, fbaFee, referralPct, otherCosts, cvr, profitRetention]);

  const marginTone =
    model.breakEvenAcos >= 35 ? "good" : model.breakEvenAcos >= 20 ? "warn" : "bad";

  const report = buildReport("Break-even ACoS", [
    {
      heading: "Unit economics",
      lines: [
        ["Selling price", money(price)],
        ["Cost of goods", money(cogs)],
        ["Shipping to Amazon", money(shipping)],
        ["FBA fulfilment fee", money(fbaFee)],
        [`Referral fee (${pct(referralPct, 0)})`, money(model.referralFee)],
        ["Other costs", money(otherCosts)],
        ["Total cost per unit", money(model.totalCost)],
        ["Profit per unit before ads", money(model.profitPerUnit)],
      ],
    },
    {
      heading: "Targets",
      lines: [
        ["Break-even ACoS", pct(model.breakEvenAcos)],
        ["Profit to keep", pct(profitRetention, 0)],
        ["Target ACoS", pct(model.targetAcos)],
        ["Break-even CPC", money(model.breakEvenCpc)],
        ["Target CPC", money(model.targetCpc)],
        ["Clicks per order", num(model.clicksPerOrder, 1)],
        ["Ad cost per unit at target", money(model.adCostPerUnit)],
        ["Profit kept per unit", money(model.profitKeptPerUnit)],
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
            id="be-price"
            label="Selling price"
            value={price}
            onChange={(next) => set("price", next)}
            hint="List price before promotions."
            min={0.01}
          />
          <CurrencyField
            id="be-cogs"
            label="Cost of goods"
            value={cogs}
            onChange={(next) => set("cogs", next)}
            hint="Manufacturing cost per unit."
          />
          <CurrencyField
            id="be-shipping"
            label="Shipping to Amazon"
            value={shipping}
            onChange={(next) => set("shipping", next)}
            hint="Inbound freight and prep, per unit."
          />
          <CurrencyField
            id="be-fba"
            label="FBA fulfilment fee"
            value={fbaFee}
            onChange={(next) => set("fbaFee", next)}
            hint="Pick, pack and ship."
          />
          <PercentField
            id="be-referral"
            label="Referral fee"
            value={referralPct}
            onChange={(next) => set("referralPct", next)}
            hint="Amazon's category commission."
            max={50}
            step={0.5}
          />
          <CurrencyField
            id="be-other"
            label="Other costs"
            value={otherCosts}
            onChange={(next) => set("otherCosts", next)}
            hint="Storage, returns reserve, inserts."
          />
          <PercentField
            id="be-cvr"
            label="Conversion rate"
            value={cvr}
            onChange={(next) => set("cvr", next)}
            hint="Used to turn an ACoS ceiling into a click price."
            max={100}
            step={0.5}
          />
        </>
      }
    >
      <ResultGrid>
        <ResultTile
          label="Break-even ACoS"
          value={pct(model.breakEvenAcos)}
          tone={marginTone}
          emphasis
          icon={Scale}
          hint={`${money(model.profitPerUnit)} of profit on a ${money(price)} sale`}
        />
        <ResultTile
          label="Target ACoS"
          value={pct(model.targetAcos)}
          tone="brand"
          emphasis
          icon={Target}
          hint={`Keeping ${pct(profitRetention, 0)} of the margin`}
        />
        <ResultTile
          label="Break-even CPC"
          value={money(model.breakEvenCpc)}
          tone="warn"
          emphasis
          icon={MousePointerClick}
          hint={`The click price where profit is exactly zero at ${pct(cvr)} CVR`}
        />
        <ResultTile
          label="Target CPC"
          value={money(model.targetCpc)}
          tone="good"
          emphasis
          icon={ShieldCheck}
          hint={`Bid this and keep ${money(model.profitKeptPerUnit)} a unit`}
        />
      </ResultGrid>

      <CalcPanel
        title="How much of the margin does advertising get?"
        description="Break-even is where the ad eats the whole margin. Everything to the right of zero on this slider is profit you are refusing to spend — which is the right call for a mature product and the wrong call during a launch."
        actions={
          <MetricChip
            label="Profit kept"
            value={money(model.profitKeptPerUnit)}
            tone={model.profitKeptPerUnit > 0 ? "good" : "bad"}
          />
        }
      >
        <ScenarioSlider
          id="be-retention"
          label="Share of the margin advertising may not touch"
          value={profitRetention}
          onChange={(next) => set("profitRetention", next)}
          min={0}
          max={90}
          step={5}
          format={(value) => `${value}%`}
          hint={`Target ACoS ${pct(model.targetAcos)} · bid up to ${money(model.targetCpc)}`}
          marks={[0, 20, 40, 60, 80]}
        />

        <Table className="mt-5" caption="Target ACoS, CPC and profit per unit at five retention levels.">
          <THead>
            <TR>
              <TH>Profit kept</TH>
              <TH numeric>Target ACoS</TH>
              <TH numeric>Max CPC</TH>
              <TH numeric>Ad cost per unit</TH>
              <TH numeric>Profit per unit</TH>
            </TR>
          </THead>
          <TBody>
            {model.levels.map((level) => (
              <TR key={level.retention} className={level.current ? "bg-brand-soft/60" : undefined}>
                <THRow>
                  {pct(level.retention, 0)}
                  {level.retention === 0 ? (
                    <span className="ml-1.5 text-xs font-normal text-muted">break-even</span>
                  ) : null}
                  {level.current ? (
                    <span className="ml-1.5 text-xs font-normal text-brand">your setting</span>
                  ) : null}
                </THRow>
                <TD numeric mono className="font-semibold">
                  {pct(level.acos)}
                </TD>
                <TD numeric mono>
                  {money(level.cpc)}
                </TD>
                <TD numeric mono className="text-muted">
                  {money(level.adCost)}
                </TD>
                <TD
                  numeric
                  mono
                  className={level.profitKept > 0 ? "text-good" : "text-muted"}
                >
                  {money(level.profitKept)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CalcPanel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <CalcPanel
          title="Where the price goes"
          description="Break-even ACoS is not a separate calculation from margin — it is the same subtraction, read as a percentage."
        >
          <Table caption="Per-unit cost stack and the profit that becomes the break-even ACoS.">
            <THead>
              <TR>
                <TH>Line</TH>
                <TH numeric>Per unit</TH>
                <TH numeric>Share</TH>
              </TR>
            </THead>
            <TBody>
              {[
                ["Selling price", price],
                ["Cost of goods", -cogs],
                ["Shipping to Amazon", -shipping],
                ["FBA fulfilment fee", -fbaFee],
                [`Referral fee (${pct(referralPct, 0)})`, -model.referralFee],
                ["Other costs", -otherCosts],
              ].map(([label, amount]) => (
                <TR key={String(label)}>
                  <THRow className={Number(amount) < 0 ? "font-normal text-muted" : undefined}>
                    {label}
                  </THRow>
                  <TD numeric mono className={Number(amount) < 0 ? "text-muted" : "font-semibold"}>
                    {Number(amount) < 0 ? `−${money(Math.abs(Number(amount)))}` : money(Number(amount))}
                  </TD>
                  <TD numeric mono className="text-muted">
                    {pct(div(Math.abs(Number(amount)), price) * 100)}
                  </TD>
                </TR>
              ))}
              <TR className="bg-surface-2/60">
                <THRow>Profit before ads</THRow>
                <TD
                  numeric
                  mono
                  className={model.profitPerUnit >= 0 ? "font-semibold text-good" : "font-semibold text-bad"}
                >
                  {money(model.profitPerUnit)}
                </TD>
                <TD
                  numeric
                  mono
                  className={model.profitPerUnit >= 0 ? "font-semibold text-good" : "font-semibold text-bad"}
                >
                  {pct(model.breakEvenAcos)}
                </TD>
              </TR>
            </TBody>
          </Table>
        </CalcPanel>

        <ChartCard
          title="Target ACoS and max CPC as you keep more margin"
          description="Bars are the target ACoS at each retention level, the line is the click price that goes with it."
          summary={`At break-even the target is ${pct(model.breakEvenAcos)} ACoS and ${money(model.breakEvenCpc)} a click. Keeping 40% of the margin drops that to ${pct(model.breakEvenAcos * 0.6)} and ${money(model.breakEvenCpc * 0.6)}. Keeping 80% leaves ${pct(model.breakEvenAcos * 0.2)} and ${money(model.breakEvenCpc * 0.2)}, which most competitive categories cannot buy a click at.`}
          height={260}
          table={{
            caption: "Target ACoS and max CPC at each profit retention level.",
            head: ["Profit kept", "Target ACoS", "Max CPC", "Profit per unit"],
            rows: model.levels.map((level) => ({
              label: pct(level.retention, 0),
              cells: [pct(level.acos), money(level.cpc), money(level.profitKept)],
            })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...CHART_A11Y} data={model.levels} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis
                dataKey="retention"
                tick={AXIS_TICK_SMALL}
                tickLine={false}
                axisLine={{ stroke: "var(--hairline)" }}
                tickFormatter={(value: number) => `${value}%`}
                height={26}
              />
              <YAxis
                yAxisId="acos"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(value: number) => `${Math.round(value)}%`}
              />
              <YAxis
                yAxisId="cpc"
                orientation="right"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_LABEL_STYLE}
                labelFormatter={(value) => `Keeping ${value}% of the margin`}
                formatter={(value: unknown, name: unknown) =>
                  name === "Max CPC"
                    ? [money(Number(value)), "Max CPC"]
                    : [pct(Number(value)), "Target ACoS"]
                }
              />
              <Legend wrapperStyle={LEGEND_STYLE} />
              <ReferenceLine
                yAxisId="acos"
                y={model.breakEvenAcos}
                stroke="var(--bad)"
                strokeDasharray="4 4"
              />
              <Bar yAxisId="acos" dataKey="acos" name="Target ACoS" radius={[3, 3, 0, 0]}>
                {model.levels.map((level) => (
                  <Cell
                    key={level.retention}
                    fill={TONE_VAR.brand}
                    opacity={level.current ? 1 : 0.42}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="cpc"
                type="monotone"
                dataKey="cpc"
                name="Max CPC"
                stroke="var(--ember)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <FormulaStack description="Three lines, and the third is the one that changes what you type into Campaign Manager.">
        <FormulaLine
          label="Profit per unit before advertising"
          formula="Price - COGS - Shipping - FBA - Referral - Other"
          substituted={`${money(price)} - ${money(cogs)} - ${money(shipping)} - ${money(fbaFee)} - ${money(model.referralFee)} - ${money(otherCosts)}`}
          result={money(model.profitPerUnit)}
          tone={model.profitPerUnit >= 0 ? "good" : "bad"}
        />
        <FormulaLine
          label="Break-even ACoS"
          formula="Profit per unit / Price x 100"
          substituted={`${money(model.profitPerUnit)} / ${money(price)} x 100`}
          result={pct(model.breakEvenAcos)}
          tone={marginTone}
          note="The ceiling. At this ACoS the advertising costs exactly the profit on the units it sells."
        />
        <FormulaLine
          label="Target ACoS"
          formula="Break-even ACoS x (1 - Profit to keep)"
          substituted={`${pct(model.breakEvenAcos)} x ${(1 - profitRetention / 100).toFixed(2)}`}
          result={pct(model.targetAcos)}
          tone="brand"
        />
        <FormulaLine
          label="Break-even CPC"
          formula="Break-even ACoS x Price x Conversion rate"
          substituted={`${(model.breakEvenAcos / 100).toFixed(3)} x ${money(price)} x ${(cvr / 100).toFixed(3)}`}
          result={money(model.breakEvenCpc)}
          tone="warn"
          note={`At ${pct(cvr)} conversion it takes ${num(model.clicksPerOrder, 1)} clicks to make a sale, so the ad budget per order is ${money(model.profitPerUnit)} at break-even.`}
        />
      </FormulaStack>

      <Interpretation
        tone={marginTone}
        title={`Break-even ACoS is ${pct(model.breakEvenAcos)} — target ${pct(model.targetAcos)}`}
        next={[
          `Set the campaign target to ${pct(model.targetAcos)} and the starting bid to ${money(model.targetCpc)}. Never let an automated rule bid past ${money(model.breakEvenCpc)}.`,
          `Anything running above ${pct(model.breakEvenAcos)} is selling units at a loss. Find those keywords first — the ACoS column sorted descending is the whole job.`,
          model.breakEvenAcos < 25
            ? `A ${pct(model.breakEvenAcos)} margin is thin for advertising. Before spending more, check whether ${money(model.totalCost)} of cost per unit can come down — the referral fee alone is ${money(model.referralFee)}.`
            : `A ${pct(model.breakEvenAcos)} margin gives real room. Use it during launch and pull back to ${pct(model.targetAcos)} once the product ranks.`,
        ]}
      >
        <p>
          A {money(price)} sale carries {money(model.totalCost)} of cost, leaving{" "}
          <strong>{money(model.profitPerUnit)}</strong>. Expressed against the price that is{" "}
          {pct(model.breakEvenAcos)} — the break-even ACoS. Spend exactly that on ads and the
          product sells units for nothing.
        </p>
        <p>
          Holding back {pct(profitRetention, 0)} of the margin gives a target of{" "}
          <strong>{pct(model.targetAcos)}</strong>, which is {money(model.adCostPerUnit)} of ad cost
          per unit and {money(model.profitKeptPerUnit)} of profit kept. At {pct(cvr)} conversion that
          target is a maximum bid of {money(model.targetCpc)}, against a break-even bid of{" "}
          {money(model.breakEvenCpc)}.
        </p>
      </Interpretation>
    </CalcShell>
  );
}
