"use client";

import { CalendarDays, Package, Rocket, Wallet } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricChip } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { budgetDefaults } from "@/content/calculators";
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
import { CurrencyField, NumberField, PercentField } from "./fields";
import { FormulaLine, FormulaStack } from "./FormulaLine";
import { TONE_VAR, div, money, num, pct, signedPct } from "./format";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { ScenarioSlider } from "./ScenarioSlider";
import { useCalcState } from "./useCalcState";

/**
 * Budget planner.
 *
 * A PPC budget is not a number you pick. It is the consequence of two numbers
 * you already have: spend equals revenue target multiplied by target ACoS.
 * Everything below that is allocation — the 70/20/10 split across products
 * that are working, products being scaled, and products being tested.
 *
 * Ported from `Budget-Planner.xlsx`. The workbook applies 70/20/10 to the
 * monthly budget; this version also assigns each product to a tier, because
 * a daily cap is only useful once you know which campaigns it applies to.
 */

export type BudgetTier = "maintain" | "growth" | "launch";

interface TierMeta {
  id: BudgetTier;
  label: string;
  share: number;
  /** Multiplier applied to the blended target ACoS for this tier. */
  acosFactor: number;
  tone: Tone;
  brief: string;
}

const TIERS: TierMeta[] = [
  {
    id: "maintain",
    label: "Maintain — proven winners",
    share: 0.7,
    acosFactor: 0.75,
    tone: "good",
    brief:
      "Products already converting at or under target. This tier pays for the account, so it gets the tightest ACoS and the biggest share.",
  },
  {
    id: "growth",
    label: "Growth — scaling",
    share: 0.2,
    acosFactor: 1,
    tone: "info",
    brief:
      "Products with proof but not yet at their ceiling. Managed to the blended target: enough room to buy volume, not enough to hide waste.",
  },
  {
    id: "launch",
    label: "Launch & test",
    share: 0.1,
    acosFactor: 2,
    tone: "ember",
    brief:
      "New ASINs, new keywords, new match types. The only tier allowed to run above target, because you are buying data rather than profit.",
  },
];

const TIER_OPTIONS = TIERS.map((tier) => ({ value: tier.id, label: tier.label.split(" — ")[0] }));

interface BudgetProduct {
  id: string;
  name: string;
  tier: BudgetTier;
}

const DEFAULT_PRODUCTS: BudgetProduct[] = [
  { id: "p1", name: "Bamboo board — single", tier: "maintain" },
  { id: "p2", name: "Bamboo board — 2-pack", tier: "maintain" },
  { id: "p3", name: "Cheese & charcuterie board", tier: "growth" },
  { id: "p4", name: "Carving board with juice groove", tier: "growth" },
  { id: "p5", name: "Serving tray — new listing", tier: "launch" },
];

const DEFAULTS = {
  ...budgetDefaults,
  growthScenario: 0,
  products: DEFAULT_PRODUCTS,
};

const SCENARIOS = [0, 25, 50, 100];

function resizeRoster(products: BudgetProduct[], count: number): BudgetProduct[] {
  const target = Math.max(1, Math.min(60, Math.round(count)));
  if (products.length === target) return products;
  if (products.length > target) return products.slice(0, target);

  const next = [...products];
  let index = products.length;
  while (next.length < target) {
    index += 1;
    next.push({ id: `p${index}-${next.length}`, name: `Product ${next.length + 1}`, tier: "growth" });
  }
  return next;
}

export function BudgetPlannerCalculator() {
  const { values, set, replace, reset } = useCalcState("budget-planner", DEFAULTS);
  const { revenueTarget, targetAcos, productCount, averagePrice, daysInMonth, growthScenario, products } =
    values;

  const model = useMemo(() => {
    const monthlyBudget = revenueTarget * (targetAcos / 100);
    const dailyBudget = div(monthlyBudget, daysInMonth);
    const unitsNeeded = div(revenueTarget, averagePrice);
    const ordersPerDay = div(unitsNeeded, daysInMonth);
    const perProductMonthly = div(monthlyBudget, products.length);
    const perProductDaily = div(dailyBudget, products.length);

    const tiers = TIERS.map((tier) => {
      const members = products.filter((product) => product.tier === tier.id);
      const monthly = monthlyBudget * tier.share;
      const daily = div(monthly, daysInMonth);
      return {
        ...tier,
        members,
        monthly,
        daily,
        perProductDaily: members.length > 0 ? div(daily, members.length) : Number.NaN,
        perProductMonthly: members.length > 0 ? div(monthly, members.length) : Number.NaN,
        targetAcos: targetAcos * tier.acosFactor,
        revenueShare: div(monthly * 100, targetAcos),
      };
    });

    const rows = products.map((product) => {
      const tier = tiers.find((entry) => entry.id === product.tier) ?? tiers[0];
      return {
        ...product,
        tierLabel: tier.label.split(" — ")[0],
        tone: tier.tone,
        daily: tier.perProductDaily,
        monthly: tier.perProductMonthly,
        acos: tier.targetAcos,
      };
    });

    const unallocated = tiers
      .filter((tier) => tier.members.length === 0)
      .reduce((total, tier) => total + tier.monthly, 0);

    const scenarioRows = SCENARIOS.map((change) => {
      const revenue = revenueTarget * (1 + change / 100);
      const monthly = revenue * (targetAcos / 100);
      return {
        change,
        label: change === 0 ? "Today" : signedPct(change),
        revenue,
        monthly,
        daily: div(monthly, daysInMonth),
        units: div(revenue, averagePrice),
      };
    });

    const scenarioRevenue = revenueTarget * (1 + growthScenario / 100);
    const scenarioMonthly = scenarioRevenue * (targetAcos / 100);

    const sweep: { change: number; monthly: number; daily: number }[] = [];
    for (let change = 0; change <= 200; change += 20) {
      const monthly = revenueTarget * (1 + change / 100) * (targetAcos / 100);
      sweep.push({ change, monthly, daily: div(monthly, daysInMonth) });
    }

    return {
      monthlyBudget,
      dailyBudget,
      unitsNeeded,
      ordersPerDay,
      perProductMonthly,
      perProductDaily,
      tiers,
      rows,
      unallocated,
      scenarioRows,
      scenarioRevenue,
      scenarioMonthly,
      scenarioDaily: div(scenarioMonthly, daysInMonth),
      sweep,
    };
  }, [revenueTarget, targetAcos, averagePrice, daysInMonth, growthScenario, products]);

  const setCount = useCallback(
    (count: number) => {
      replace((previous) => ({
        ...previous,
        productCount: Math.max(1, Math.min(60, Math.round(count))),
        products: resizeRoster(previous.products, count),
      }));
    },
    [replace],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<BudgetProduct>) => {
      replace((previous) => ({
        ...previous,
        products: previous.products.map((product) =>
          product.id === id ? { ...product, ...patch } : product,
        ),
      }));
    },
    [replace],
  );

  const report = buildReport("Budget planner", [
    {
      heading: "Inputs",
      lines: [
        ["Monthly revenue target", money(revenueTarget, 0)],
        ["Target ACoS", pct(targetAcos)],
        ["Products", num(products.length)],
        ["Average price", money(averagePrice)],
        ["Days in month", num(daysInMonth)],
      ],
    },
    {
      heading: "Budget",
      lines: [
        ["Monthly PPC budget", money(model.monthlyBudget, 0)],
        ["Daily PPC budget", money(model.dailyBudget)],
        ["Budget per product, monthly", money(model.perProductMonthly)],
        ["Budget per product, daily", money(model.perProductDaily)],
        ["Units needed", num(model.unitsNeeded)],
        ["Orders per day", num(model.ordersPerDay, 1)],
      ],
    },
    {
      heading: "70 / 20 / 10 allocation",
      lines: model.tiers.map(
        (tier) =>
          [
            tier.label.split(" — ")[0],
            `${money(tier.monthly, 0)}/mo · ${money(tier.daily)}/day · ${tier.members.length} product${tier.members.length === 1 ? "" : "s"} · target ACoS ${pct(tier.targetAcos)}`,
          ] as [string, string],
      ),
    },
    {
      heading: "Daily caps per product",
      lines: model.rows.map(
        (row) => [row.name, `${money(row.daily)}/day · ${row.tierLabel}`] as [string, string],
      ),
    },
  ]);

  return (
    <CalcShell
      onReset={reset}
      copyText={report}
      inputs={
        <>
          <CurrencyField
            id="bp-revenue-target"
            label="Monthly revenue target"
            value={revenueTarget}
            onChange={(next) => set("revenueTarget", next)}
            hint="Ad-attributed revenue you are planning for, not total sales."
            step={500}
          />
          <PercentField
            id="bp-target-acos"
            label="Target ACoS"
            value={targetAcos}
            onChange={(next) => set("targetAcos", next)}
            hint="The blended number you are managing the account to."
            max={200}
            step={1}
          />
          <NumberField
            id="bp-product-count"
            label="Number of products"
            value={productCount}
            onChange={setCount}
            hint="ASINs carrying ad spend. Changing this adds or removes rows below."
            min={1}
            max={60}
            step={1}
            decimals={0}
            unit="ASINs"
          />
          <CurrencyField
            id="bp-average-price"
            label="Average product price"
            value={averagePrice}
            onChange={(next) => set("averagePrice", next)}
            hint="Converts the revenue target into units and orders per day."
            min={0.01}
          />
          <NumberField
            id="bp-days"
            label="Days in month"
            value={daysInMonth}
            onChange={(next) => set("daysInMonth", next)}
            hint="28, 30 or 31 — it changes the daily cap by a few percent."
            min={1}
            max={31}
            step={1}
            decimals={0}
            unit="days"
          />
        </>
      }
    >
      <ResultGrid>
        <ResultTile
          label="Monthly PPC budget"
          value={money(model.monthlyBudget, 0)}
          tone="brand"
          emphasis
          icon={Wallet}
          hint={`${money(revenueTarget, 0)} revenue at ${pct(targetAcos)} ACoS`}
        />
        <ResultTile
          label="Daily PPC budget"
          value={money(model.dailyBudget)}
          tone="good"
          emphasis
          icon={CalendarDays}
          hint={`Across ${num(daysInMonth)} days`}
        />
        <ResultTile
          label="Per product, per day"
          value={money(model.perProductDaily)}
          emphasis
          icon={Package}
          hint={`Flat split across ${num(products.length)} ASINs, before tiering`}
        />
        <ResultTile
          label="Units to sell"
          value={num(model.unitsNeeded)}
          tone="ember"
          emphasis
          icon={Rocket}
          hint={`${num(model.ordersPerDay, 1)} orders a day at ${money(averagePrice)}`}
        />
      </ResultGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] [&>*]:min-w-0">
        <ChartCard
          title="The 70 / 20 / 10 split"
          description="Seventy percent behind what already works, twenty behind what is being scaled, ten into launches and tests."
          summary={model.tiers
            .map(
              (tier) =>
                `${tier.label.split(" — ")[0]} takes ${pct(tier.share * 100, 0)} of the budget, ${money(tier.monthly, 0)} a month or ${money(tier.daily)} a day, across ${tier.members.length} product${tier.members.length === 1 ? "" : "s"}, managed to ${pct(tier.targetAcos)} ACoS`,
            )
            .join(". ")}
          height={230}
          table={{
            caption: "Monthly and daily budget, product count and target ACoS for each tier.",
            head: ["Tier", "Share", "Monthly", "Daily", "Products", "Target ACoS"],
            rows: model.tiers.map((tier) => ({
              label: tier.label.split(" — ")[0],
              cells: [
                pct(tier.share * 100, 0),
                money(tier.monthly, 0),
                money(tier.daily),
                num(tier.members.length),
                pct(tier.targetAcos),
              ],
            })),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart {...CHART_A11Y}>
              {/* The pie layer carries a tab stop of its own, separate from the
                  chart surface's, so it needs its own opt-out. */}
              <Pie
                rootTabIndex={-1}
                data={model.tiers}
                dataKey="monthly"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={2}
                stroke="var(--surface)"
                strokeWidth={2}
              >
                {model.tiers.map((tier) => (
                  <Cell key={tier.id} fill={TONE_VAR[tier.tone]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_LABEL_STYLE}
                formatter={(value: unknown, name: unknown) => [
                  `${money(Number(value), 0)} / month`,
                  String(name).split(" — ")[0],
                ]}
              />
              <Legend
                wrapperStyle={LEGEND_STYLE}
                formatter={(value: string) => value.split(" — ")[0]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <CalcPanel
          title="What each tier is for"
          description="The split is a spending rule and a risk rule at the same time: only the smallest tier is allowed to run above target."
        >
          <ul className="grid gap-3">
            {model.tiers.map((tier) => (
              <li
                key={tier.id}
                className="rounded-lg border border-hairline bg-canvas px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TONE_VAR[tier.tone] }}
                    aria-hidden="true"
                  />
                  <span className="font-display text-[0.875rem] font-semibold text-ink">
                    {tier.label}
                  </span>
                  <MetricChip value={`${money(tier.daily)}/day`} tone={tier.tone} />
                  <MetricChip label="ACoS" value={pct(tier.targetAcos)} />
                </div>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{tier.brief}</p>
                <p className="mt-1.5 tabular text-xs text-faint">
                  {money(tier.monthly, 0)} a month ·{" "}
                  {tier.members.length === 0
                    ? "no products assigned — this budget is unallocated"
                    : `${tier.members.length} product${tier.members.length === 1 ? "" : "s"} at ${money(tier.perProductDaily)} a day each`}
                </p>
              </li>
            ))}
          </ul>
        </CalcPanel>
      </div>

      <CalcPanel
        title="Daily cap per product"
        description="Assign every ASIN to a tier. The tier budget splits evenly across the products in it, and that is the number you type into the campaign's daily budget field."
        actions={
          model.unallocated > 0 ? (
            <MetricChip
              label="Unallocated"
              value={`${money(model.unallocated, 0)}/mo`}
              tone="warn"
            />
          ) : (
            <MetricChip label="Allocated" value="100%" tone="good" />
          )
        }
      >
        <div className="grid gap-3">
          {model.rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 rounded-lg border border-hairline bg-canvas p-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-start"
            >
              <Input
                id={`bp-name-${row.id}`}
                label="Product"
                value={row.name}
                onChange={(event) => updateProduct(row.id, { name: event.target.value })}
              />
              <Select
                id={`bp-tier-${row.id}`}
                label="Tier"
                options={TIER_OPTIONS}
                value={row.tier}
                onChange={(event) =>
                  updateProduct(row.id, { tier: event.target.value as BudgetTier })
                }
              />
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <MetricChip label="Daily cap" value={money(row.daily)} tone={row.tone} />
                <MetricChip label="Monthly" value={money(row.monthly, 0)} />
                <MetricChip label="Target ACoS" value={pct(row.acos)} />
              </div>
            </div>
          ))}
        </div>

        {model.unallocated > 0 ? (
          <p className="mt-4 rounded-lg border border-warn/35 bg-warn-soft px-3.5 py-3 text-[0.8125rem] leading-relaxed text-ink">
            {money(model.unallocated, 0)} a month sits in tiers with no products assigned. Either
            move a product into that tier or accept that the real budget is{" "}
            {money(model.monthlyBudget - model.unallocated, 0)} and the blended ACoS target moves
            with it.
          </p>
        ) : null}
      </CalcPanel>

      <CalcPanel
        title="What if the target moves?"
        description="Budget scales linearly with the revenue target, so the interesting question is whether the account can absorb the extra spend at the same ACoS."
        actions={
          <MetricChip
            label="Scenario"
            value={`${money(model.scenarioMonthly, 0)}/mo`}
            tone={growthScenario > 0 ? "ember" : "neutral"}
          />
        }
      >
        <ScenarioSlider
          id="bp-growth"
          label="Change the revenue target by"
          value={growthScenario}
          onChange={(next) => set("growthScenario", next)}
          min={-50}
          max={200}
          step={5}
          format={(value) => signedPct(value)}
          hint={`${money(model.scenarioRevenue, 0)} revenue · ${money(model.scenarioDaily)} a day`}
          marks={[-50, 0, 25, 50, 100, 200]}
        />

        <Table
          className="mt-5"
          caption="Monthly budget, daily budget and units at each revenue scenario."
        >
          <THead>
            <TR>
              <TH>Scenario</TH>
              <TH numeric>Revenue target</TH>
              <TH numeric>Monthly budget</TH>
              <TH numeric>Daily budget</TH>
              <TH numeric>Units</TH>
            </TR>
          </THead>
          <TBody>
            {model.scenarioRows.map((row) => (
              <TR key={row.change}>
                <THRow>{row.label}</THRow>
                <TD numeric mono>
                  {money(row.revenue, 0)}
                </TD>
                <TD numeric mono className="font-semibold">
                  {money(row.monthly, 0)}
                </TD>
                <TD numeric mono>
                  {money(row.daily)}
                </TD>
                <TD numeric mono className="text-muted">
                  {num(row.units)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CalcPanel>

      <ChartCard
        title="Budget against revenue target"
        description="A straight line, because ACoS is a ratio. What is not straight is the ACoS you actually achieve as spend grows — that is why the tiers exist."
        summary={`Monthly budget rises from ${money(model.sweep[0].monthly, 0)} at today's target to ${money(model.sweep[model.sweep.length - 1].monthly, 0)} at triple the revenue, holding ${pct(targetAcos)} ACoS.`}
        height={250}
        table={{
          caption: "Monthly and daily budget at each revenue growth level.",
          head: ["Revenue change", "Monthly budget", "Daily budget"],
          rows: model.sweep
            .filter((row) => row.change % 40 === 0)
            .map((row) => ({
              label: signedPct(row.change),
              cells: [money(row.monthly, 0), money(row.daily)],
            })),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...CHART_A11Y} data={model.sweep} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="change"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tickFormatter={(value: number) => signedPct(value)}
              height={26}
              minTickGap={12}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={(value: number) =>
                Math.abs(value) >= 1000 ? `$${Math.round(value / 1000)}k` : `$${Math.round(value)}`
              }
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              labelFormatter={(value) => `Revenue ${signedPct(Number(value))}`}
              formatter={(value: unknown) => [money(Number(value), 0), "Monthly budget"]}
            />
            <Bar dataKey="monthly" name="Monthly budget" radius={[3, 3, 0, 0]}>
              {model.sweep.map((row) => (
                <Cell
                  key={row.change}
                  fill={TONE_VAR.brand}
                  opacity={row.change === Math.round(growthScenario / 20) * 20 ? 1 : 0.45}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <FormulaStack description="Four lines and the whole plan falls out of them.">
        <FormulaLine
          label="Monthly budget"
          formula="Revenue target x Target ACoS"
          substituted={`${money(revenueTarget, 0)} x ${(targetAcos / 100).toFixed(2)}`}
          result={money(model.monthlyBudget, 0)}
        />
        <FormulaLine
          label="Daily budget"
          formula="Monthly budget / Days in month"
          substituted={`${money(model.monthlyBudget, 0)} / ${num(daysInMonth)}`}
          result={money(model.dailyBudget)}
          tone="good"
        />
        <FormulaLine
          label="Maintain tier"
          formula="Monthly budget x 70%"
          substituted={`${money(model.monthlyBudget, 0)} x 0.70`}
          result={money(model.tiers[0].monthly, 0)}
          tone="good"
          note={`Split across ${model.tiers[0].members.length} product${model.tiers[0].members.length === 1 ? "" : "s"}, that is ${money(model.tiers[0].perProductDaily)} a day each.`}
        />
        <FormulaLine
          label="Units needed"
          formula="Revenue target / Average price"
          substituted={`${money(revenueTarget, 0)} / ${money(averagePrice)}`}
          result={`${num(model.unitsNeeded)} units`}
          tone="ember"
          note={`That is ${num(model.ordersPerDay, 1)} orders a day, every day, for the whole month.`}
        />
      </FormulaStack>

      <Interpretation
        tone={model.unallocated > 0 ? "warn" : "brand"}
        title={`${money(model.dailyBudget)} a day across ${num(products.length)} product${products.length === 1 ? "" : "s"}`}
        next={[
          `Set the daily budget on every maintain-tier campaign to ${money(model.tiers[0].perProductDaily)} and the tier's target ACoS to ${pct(model.tiers[0].targetAcos)}.`,
          `Give the launch tier ${money(model.tiers[2].daily)} a day in total and accept up to ${pct(model.tiers[2].targetAcos)} ACoS there — that budget is buying search-term data, not profit.`,
          `Check pacing on the 10th: if month-to-date spend is not near ${money(model.dailyBudget * 10, 0)}, something is budget-capped or bid-starved.`,
          model.unallocated > 0
            ? `Assign a product to every tier — ${money(model.unallocated, 0)} a month is currently allocated to a tier with nothing in it.`
            : `Re-tier at the start of each month: a launch product that hit ${pct(targetAcos)} ACoS for four weeks belongs in growth.`,
        ]}
      >
        <p>
          A {money(revenueTarget, 0)} monthly revenue target at {pct(targetAcos)} ACoS means{" "}
          <strong>{money(model.monthlyBudget, 0)} of ad spend</strong>, which is{" "}
          {money(model.dailyBudget)} a day. To get there the account has to sell{" "}
          {num(model.unitsNeeded)} units at {money(averagePrice)}, about{" "}
          {num(model.ordersPerDay, 1)} orders a day.
        </p>
        <p>
          The 70/20/10 split puts {money(model.tiers[0].daily)} a day behind the{" "}
          {model.tiers[0].members.length} maintain product
          {model.tiers[0].members.length === 1 ? "" : "s"},{" "}
          {money(model.tiers[1].daily)} behind growth and {money(model.tiers[2].daily)} into
          launches. Only the launch tier is allowed above target, which is what keeps the blended
          number honest while you still test.
        </p>
      </Interpretation>
    </CalcShell>
  );
}
