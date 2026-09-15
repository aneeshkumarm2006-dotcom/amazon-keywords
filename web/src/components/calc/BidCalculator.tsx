"use client";

import { Crosshair, Gauge as GaugeIcon, MousePointerClick, Target } from "lucide-react";
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
import { bidDefaults } from "@/content/calculators";
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
import { CurrencyField, PercentField } from "./fields";
import { FormulaLine, FormulaStack } from "./FormulaLine";
import { TONE_VAR, div, money, num, pct, signedPct } from "./format";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { ScenarioSlider } from "./ScenarioSlider";
import { useCalcState } from "./useCalcState";

/**
 * Bid calculator.
 *
 * Max CPC is the whole tool: target ACoS x price x conversion rate is the click
 * price at which a keyword lands exactly on target. Everything else is a
 * discount or a multiplier on that one number — the aggression setting that
 * buys a margin for a bad week, the match-type factors, and the placement
 * modifiers Amazon applies on top of the base bid.
 *
 * Ported from `Bid-Calculator.xlsx`. The match-type factors are the workbook
 * defaults: a looser match converts worse on average, so it earns a lower bid
 * for the same target.
 */

interface MatchTypeRow {
  id: string;
  label: string;
  factor: number;
  note: string;
}

const MATCH_TYPES: MatchTypeRow[] = [
  {
    id: "exact",
    label: "Exact",
    factor: 1,
    note: "Shopper typed this term. Highest intent, so it carries the full bid.",
  },
  {
    id: "phrase",
    label: "Phrase",
    factor: 0.85,
    note: "Term is contained in the query. Slightly looser, slightly cheaper.",
  },
  {
    id: "broad",
    label: "Broad",
    factor: 0.7,
    note: "Any word order plus variants. Use it to discover, not to convert.",
  },
  {
    id: "auto",
    label: "Auto",
    factor: 0.6,
    note: "Amazon picks the targets. Keep it cheap — it is a research budget.",
  },
];

/** The conversion rates the sensitivity table sweeps. */
const CVR_SWEEP = [2, 4, 6, 8, 10, 12, 15, 20];

const CONSERVATIVE_FACTOR = 0.65;
const AGGRESSIVE_FACTOR = 0.95;

function cpcTone(acos: number, target: number): Tone {
  if (!Number.isFinite(acos) || target <= 0) return "neutral";
  if (acos <= target) return "good";
  if (acos <= target * 1.25) return "warn";
  return "bad";
}

export function BidCalculator() {
  const { values, set, reset } = useCalcState("bid", bidDefaults);
  const { targetAcos, price, cvr, currentCpc, topOfSearchAdj, productPageAdj, bidAggression } =
    values;

  const model = useMemo(() => {
    const cvrRatio = cvr / 100;
    const maxCpc = (targetAcos / 100) * price * cvrRatio;
    const recommended = maxCpc * (bidAggression / 100);
    const conservative = maxCpc * CONSERVATIVE_FACTOR;
    const aggressive = maxCpc * AGGRESSIVE_FACTOR;

    const clicksPerOrder = div(100, cvr);
    const revenuePerClick = price * cvrRatio;
    const costPerOrder = recommended * clicksPerOrder;
    const acosAtRecommended = div(costPerOrder, price) * 100;
    const acosAtCurrent = div(currentCpc * clicksPerOrder, price) * 100;
    const cpcGap = div(recommended - currentCpc, currentCpc) * 100;

    const topOfSearchBid = recommended * (1 + topOfSearchAdj / 100);
    const productPageBid = recommended * (1 + productPageAdj / 100);
    const headroom = div(maxCpc - recommended, recommended) * 100;

    const matchRows = MATCH_TYPES.map((entry) => {
      const bid = recommended * entry.factor;
      return {
        ...entry,
        bid,
        maxBid: maxCpc * entry.factor,
        acos: div(bid * clicksPerOrder, price) * 100,
      };
    });

    const sensitivity = CVR_SWEEP.map((rate) => {
      const rowMax = (targetAcos / 100) * price * (rate / 100);
      return {
        cvr: rate,
        maxCpc: rowMax,
        recommended: rowMax * (bidAggression / 100),
        clicksPerOrder: div(100, rate),
        acosAtCurrent: div(currentCpc * div(100, rate), price) * 100,
        current: Math.abs(rate - cvr) < 0.001,
      };
    });

    return {
      maxCpc,
      recommended,
      conservative,
      aggressive,
      clicksPerOrder,
      revenuePerClick,
      costPerOrder,
      acosAtRecommended,
      acosAtCurrent,
      cpcGap,
      topOfSearchBid,
      productPageBid,
      headroom,
      matchRows,
      sensitivity,
    };
  }, [targetAcos, price, cvr, currentCpc, topOfSearchAdj, productPageAdj, bidAggression]);

  const verdictTone = cpcTone(model.acosAtCurrent, targetAcos);
  const overspending = currentCpc > model.maxCpc;
  const placementOver = model.topOfSearchBid > model.maxCpc;

  const lowCvr = CVR_SWEEP[0];
  const highCvr = CVR_SWEEP[CVR_SWEEP.length - 1];

  const report = buildReport("Bid calculator", [
    {
      heading: "Inputs",
      lines: [
        ["Target ACoS", pct(targetAcos)],
        ["Product price", money(price)],
        ["Conversion rate", pct(cvr)],
        ["Current CPC", money(currentCpc)],
        ["Bid aggression", pct(bidAggression, 0)],
        ["Top of search adjustment", signedPct(topOfSearchAdj)],
        ["Product pages adjustment", signedPct(productPageAdj)],
      ],
    },
    {
      heading: "Bids",
      lines: [
        ["Max CPC at target", money(model.maxCpc)],
        ["Conservative bid (65%)", money(model.conservative)],
        ["Recommended bid", money(model.recommended)],
        ["Aggressive bid (95%)", money(model.aggressive)],
        ...model.matchRows.map(
          (row) => [`${row.label} match bid`, money(row.bid)] as [string, string],
        ),
        ["Top of search effective bid", money(model.topOfSearchBid)],
        ["Product pages effective bid", money(model.productPageBid)],
      ],
    },
    {
      heading: "Unit economics per click",
      lines: [
        ["Clicks per order", num(model.clicksPerOrder, 1)],
        ["Revenue per click", money(model.revenuePerClick)],
        ["Cost per order at recommended bid", money(model.costPerOrder)],
        ["ACoS at recommended bid", pct(model.acosAtRecommended)],
        ["ACoS at current CPC", pct(model.acosAtCurrent)],
      ],
    },
  ]);

  return (
    <CalcShell
      onReset={reset}
      copyText={report}
      inputs={
        <>
          <PercentField
            id="bid-target-acos"
            label="Target ACoS"
            value={targetAcos}
            onChange={(next) => set("targetAcos", next)}
            hint="Where you want this campaign to land. Break-even is the ceiling, not the target."
            max={200}
            step={1}
          />
          <CurrencyField
            id="bid-price"
            label="Product price"
            value={price}
            onChange={(next) => set("price", next)}
            hint="Average selling price after promotions."
            min={0.01}
          />
          <PercentField
            id="bid-cvr"
            label="Conversion rate"
            value={cvr}
            onChange={(next) => set("cvr", next)}
            hint="Orders divided by clicks, from the last 30 days."
            max={100}
            step={0.5}
          />
          <CurrencyField
            id="bid-current-cpc"
            label="Current CPC"
            value={currentCpc}
            onChange={(next) => set("currentCpc", next)}
            hint="What you are actually paying today."
          />
          <PercentField
            id="bid-tos"
            label="Top of search adjustment"
            value={topOfSearchAdj}
            onChange={(next) => set("topOfSearchAdj", next)}
            hint="Placement multiplier applied on top of the base bid."
            max={900}
            step={5}
          />
          <PercentField
            id="bid-pdp"
            label="Product pages adjustment"
            value={productPageAdj}
            onChange={(next) => set("productPageAdj", next)}
            hint="Multiplier for detail-page inventory."
            max={900}
            step={5}
          />
        </>
      }
    >
      <ResultGrid>
        <ResultTile
          label="Max CPC at target"
          value={money(model.maxCpc)}
          tone="brand"
          emphasis
          icon={Target}
          hint={`Lands exactly on ${pct(targetAcos)} ACoS — no margin for a bad week`}
        />
        <ResultTile
          label="Recommended bid"
          value={money(model.recommended)}
          tone="good"
          emphasis
          icon={Crosshair}
          hint={`${pct(bidAggression, 0)} of max CPC · expected ACoS ${pct(model.acosAtRecommended)}`}
        />
        <ResultTile
          label="ACoS at your current CPC"
          value={pct(model.acosAtCurrent)}
          tone={verdictTone}
          emphasis
          icon={GaugeIcon}
          hint={`${money(currentCpc)} x ${num(model.clicksPerOrder, 1)} clicks per order`}
        />
        <ResultTile
          label="Bid change needed"
          value={signedPct(model.cpcGap, 1)}
          tone={Math.abs(model.cpcGap) <= 10 ? "good" : overspending ? "bad" : "info"}
          emphasis
          icon={MousePointerClick}
          hint={`From ${money(currentCpc)} to ${money(model.recommended)}`}
        />
      </ResultGrid>

      <CalcPanel
        title="How hard do you want to push?"
        description="Max CPC is the ceiling. The recommended bid is a deliberate discount on it, because a keyword bid at its ceiling has nowhere to go when the auction gets more expensive."
        actions={
          <MetricChip
            label="Headroom"
            value={signedPct(model.headroom, 0)}
            tone={model.headroom >= 15 ? "good" : "warn"}
          />
        }
      >
        <ScenarioSlider
          id="bid-aggression"
          label="Bid at this share of max CPC"
          value={bidAggression}
          onChange={(next) => set("bidAggression", next)}
          min={50}
          max={100}
          step={5}
          format={(value) => `${value}%`}
          hint={`Bid ${money(model.recommended)} · ACoS ${pct(model.acosAtRecommended)}`}
          marks={[50, 65, 80, 95, 100]}
        />

        <ResultGrid columns={3} className="mt-5">
          <ResultTile
            label="Conservative (65%)"
            value={money(model.conservative)}
            hint="New keywords, thin data, or a client who hates surprises"
          />
          <ResultTile
            label="Recommended"
            value={money(model.recommended)}
            tone="good"
            hint="The workbook default is 80% of max CPC"
          />
          <ResultTile
            label="Aggressive (95%)"
            value={money(model.aggressive)}
            tone="warn"
            hint="A proven converter you are defending, watched daily"
          />
        </ResultGrid>
      </CalcPanel>

      <CalcPanel
        title="Bid per match type"
        description="Same target, different intent. A broad match sees looser queries, converts worse, and therefore cannot pay the same price for a click."
      >
        <Table caption="Recommended bid, ceiling bid and expected ACoS for each match type.">
          <THead>
            <TR>
              <TH>Match type</TH>
              <TH numeric>Factor</TH>
              <TH numeric>Bid</TH>
              <TH numeric>Ceiling</TH>
              <TH numeric>Expected ACoS</TH>
            </TR>
          </THead>
          <TBody>
            {model.matchRows.map((row) => (
              <TR key={row.id}>
                <THRow>
                  <span className="block">{row.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed font-normal text-muted">
                    {row.note}
                  </span>
                </THRow>
                <TD numeric mono>
                  {row.factor.toFixed(2)}x
                </TD>
                <TD numeric mono className="font-semibold">
                  {money(row.bid)}
                </TD>
                <TD numeric mono className="text-muted">
                  {money(row.maxBid)}
                </TD>
                <TD numeric mono>
                  {pct(row.acos)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CalcPanel>

      <CalcPanel
        title="Placement adjustments"
        description="Placement modifiers multiply the base bid, so a 50% top-of-search adjustment on a $0.72 bid means paying up to $1.08 for that click. The base bid has to be low enough that the multiplied bid still clears your target."
      >
        <ResultGrid columns={3}>
          <ResultTile
            label="Top of search"
            value={money(model.topOfSearchBid)}
            tone={placementOver ? "warn" : "good"}
            hint={`${signedPct(topOfSearchAdj)} on ${money(model.recommended)}`}
          />
          <ResultTile
            label="Rest of search"
            value={money(model.recommended)}
            hint="No modifier applies — this is the base bid"
          />
          <ResultTile
            label="Product pages"
            value={money(model.productPageBid)}
            tone={model.productPageBid > model.maxCpc ? "warn" : "neutral"}
            hint={`${signedPct(productPageAdj)} on ${money(model.recommended)}`}
          />
        </ResultGrid>

        <div className="mt-4 rounded-lg border border-hairline bg-surface-2 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-muted">
          <p>
            At {pct(bidAggression, 0)} aggression your base bid has{" "}
            <strong className="text-ink">{signedPct(model.headroom, 0)}</strong> of headroom before
            the multiplied bid passes the {money(model.maxCpc)} ceiling. That is the largest
            placement adjustment this bid can carry and still hit {pct(targetAcos)} ACoS.{" "}
            {placementOver
              ? `Your ${signedPct(topOfSearchAdj)} top-of-search adjustment puts the effective bid at ${money(model.topOfSearchBid)}, over the ceiling — profitable only if top of search converts better than ${pct(cvr)}, which it usually does. Verify it in the placement report before you leave it there.`
              : `Your ${signedPct(topOfSearchAdj)} top-of-search adjustment stays inside it.`}
          </p>
        </div>
      </CalcPanel>

      <ChartCard
        title="What a change in conversion rate does to the bid"
        description="Bars are the max CPC you can afford at each conversion rate. The line is the ACoS your current CPC would produce there, against the dashed target."
        summary={`Max CPC rises in a straight line with conversion rate: at ${pct(lowCvr, 0)} conversion the ceiling is ${money((targetAcos / 100) * price * (lowCvr / 100))}, at ${pct(highCvr, 0)} it is ${money((targetAcos / 100) * price * (highCvr / 100))}. Holding the current CPC of ${money(currentCpc)}, ACoS falls from ${pct(div(currentCpc * div(100, lowCvr), price) * 100)} to ${pct(div(currentCpc * div(100, highCvr), price) * 100)} across the same range.`}
        height={290}
        table={{
          caption: "Max CPC, recommended bid, clicks per order and ACoS at the current CPC.",
          head: [
            "Conversion rate",
            "Max CPC",
            "Recommended",
            "Clicks / order",
            "ACoS at current CPC",
          ],
          rows: model.sensitivity.map((row) => ({
            label: pct(row.cvr, 0),
            cells: [
              money(row.maxCpc),
              money(row.recommended),
              num(row.clicksPerOrder, 1),
              pct(row.acosAtCurrent),
            ],
          })),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart {...CHART_A11Y} data={model.sensitivity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="cvr"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tickFormatter={(value: number) => `${value}%`}
              height={26}
            />
            <YAxis
              yAxisId="cpc"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={(value: number) => `$${value.toFixed(2)}`}
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
              labelFormatter={(value) => `Conversion rate ${value}%`}
              formatter={(value: unknown, name: unknown) =>
                name === "ACoS at current CPC"
                  ? [pct(Number(value)), "ACoS at current CPC"]
                  : [money(Number(value)), "Max CPC"]
              }
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <ReferenceLine
              yAxisId="acos"
              y={targetAcos}
              stroke="var(--brand)"
              strokeDasharray="4 4"
            />
            <Bar yAxisId="cpc" dataKey="maxCpc" name="Max CPC" radius={[3, 3, 0, 0]}>
              {model.sensitivity.map((row) => (
                <Cell key={row.cvr} fill={TONE_VAR.brand} opacity={row.current ? 1 : 0.42} />
              ))}
            </Bar>
            <Line
              yAxisId="acos"
              type="monotone"
              dataKey="acosAtCurrent"
              name="ACoS at current CPC"
              stroke="var(--ember)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <FormulaStack description="The bid maths, worked through with the numbers in the panel on the left.">
        <FormulaLine
          label="Max CPC"
          formula="Target ACoS x Price x Conversion rate"
          substituted={`${(targetAcos / 100).toFixed(2)} x ${money(price)} x ${(cvr / 100).toFixed(3)}`}
          result={money(model.maxCpc)}
          note="A ceiling, not a target. Bid it and every click costs exactly the margin it earns."
        />
        <FormulaLine
          label="Recommended bid"
          formula="Max CPC x Bid aggression"
          substituted={`${money(model.maxCpc)} x ${(bidAggression / 100).toFixed(2)}`}
          result={money(model.recommended)}
          tone="good"
        />
        <FormulaLine
          label="Clicks per order"
          formula="1 / Conversion rate"
          substituted={`1 / ${(cvr / 100).toFixed(3)}`}
          result={`${num(model.clicksPerOrder, 1)} clicks`}
          tone="info"
          note={`At ${money(model.recommended)} a click that is ${money(model.costPerOrder)} of ad cost per order on a ${money(price)} product.`}
        />
        <FormulaLine
          label="ACoS at your current CPC"
          formula="CPC x Clicks per order / Price x 100"
          substituted={`${money(currentCpc)} x ${num(model.clicksPerOrder, 1)} / ${money(price)} x 100`}
          result={pct(model.acosAtCurrent)}
          tone={verdictTone}
        />
        <FormulaLine
          label="Top of search effective bid"
          formula="Bid x (1 + Placement adjustment)"
          substituted={`${money(model.recommended)} x ${(1 + topOfSearchAdj / 100).toFixed(2)}`}
          result={money(model.topOfSearchBid)}
          tone={placementOver ? "warn" : "neutral"}
        />
      </FormulaStack>

      <Interpretation
        tone={verdictTone}
        title={
          overspending
            ? `You are paying ${money(currentCpc)} for a click worth ${money(model.maxCpc)}`
            : Math.abs(model.cpcGap) <= 10
              ? "Your current CPC is already close to the right bid"
              : `There is room to bid up to ${money(model.recommended)}`
        }
        next={
          overspending
            ? [
                `Set the keyword bid to ${money(model.recommended)} — a ${signedPct(model.cpcGap, 0)} change — and leave it for seven days.`,
                `If the placement report shows top of search carrying the conversions, keep the ${signedPct(topOfSearchAdj)} modifier and cut the base bid instead of the modifier.`,
                `Anything still above ${pct(targetAcos * 1.5)} ACoS after a week with 15+ clicks and no orders goes on the negative exact list.`,
              ]
            : Math.abs(model.cpcGap) <= 10
              ? [
                  "Leave the bid alone — you are within 10% of the calculated bid, and a week of data carries more noise than that.",
                  `Spend the effort on conversion rate instead: every extra point of CVR above ${pct(cvr)} raises the ceiling by ${money((targetAcos / 100) * price * 0.01)}.`,
                  "Re-run this when the price changes, when a promotion ends, or after any listing edit.",
                ]
              : [
                  `Raise the bid to ${money(model.recommended)} in one step — bid changes below 10% get lost in auction noise.`,
                  "Watch impressions rather than ACoS for the first 48 hours: if impressions do not move, the bid was not the constraint.",
                  `Keep the base bid at or under ${money(model.maxCpc)} so the ${signedPct(topOfSearchAdj)} placement modifier still has somewhere to go.`,
                ]
        }
      >
        <p>
          At {pct(cvr)} conversion it takes <strong>{num(model.clicksPerOrder, 1)} clicks</strong> to
          make one {money(price)} sale. To keep ad cost at {pct(targetAcos)} of that sale you have{" "}
          {money((targetAcos / 100) * price)} to spend across those clicks, which is{" "}
          <strong>{money(model.maxCpc)} a click</strong>. Bidding {pct(bidAggression, 0)} of the
          ceiling puts you at {money(model.recommended)} and an expected{" "}
          {pct(model.acosAtRecommended)} ACoS.
        </p>
        <p>
          Your current {money(currentCpc)} CPC produces {pct(model.acosAtCurrent)} ACoS at this
          conversion rate, {overspending ? "above" : "at or below"} the {pct(targetAcos)} target.
          Each click earns {money(model.revenuePerClick)} of revenue and costs {money(currentCpc)},
          so the gross contribution per click is{" "}
          {money(model.revenuePerClick - currentCpc)} before product cost.
        </p>
      </Interpretation>
    </CalcShell>
  );
}
