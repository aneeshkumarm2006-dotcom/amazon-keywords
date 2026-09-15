"use client";

import { Coins, Percent, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { profitDefaults } from "@/content/calculators";

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
import { acosTone, acosVerdict, div, money, num, pct } from "./format";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { useCalcState } from "./useCalcState";

/**
 * Profit margin calculator.
 *
 * Break-even ACoS is not a separate idea from margin — it is the same number
 * seen from the ad side. Everything that is not advertising goes into the
 * per-unit cost stack, what is left is the margin, and the margin is exactly
 * how much of the sale price advertising may consume before the unit stops
 * making money.
 *
 * Ported from `Profit-Margin-Calculator.xlsx`, plus the variant table the
 * workbook keeps on a second tab: a multi-pack almost always carries a better
 * margin than the single, which means it can afford a higher ACoS, which means
 * it should not be managed to the same target.
 */

export interface ProfitVariant {
  id: string;
  label: string;
  price: number;
  cogs: number;
  fbaFee: number;
}

const DEFAULT_VARIANTS: ProfitVariant[] = [
  { id: "single", label: "Single", price: 29.99, cogs: 8, fbaFee: 5.5 },
  { id: "twin", label: "2-pack", price: 49.99, cogs: 14.5, fbaFee: 7.25 },
  { id: "family", label: "4-pack", price: 89.99, cogs: 27, fbaFee: 9.8 },
];

const DEFAULTS = { ...profitDefaults, variants: DEFAULT_VARIANTS };

const COST_KEYS = [
  { key: "cogs", label: "COGS", fill: "var(--info)" },
  { key: "shipping", label: "Shipping", fill: "var(--brand)" },
  { key: "fba", label: "FBA fee", fill: "var(--warn)" },
  { key: "referral", label: "Referral fee", fill: "var(--ember)" },
  { key: "other", label: "Other", fill: "var(--hairline-strong)" },
  { key: "profit", label: "Profit", fill: "var(--good)" },
] as const;

interface UnitEconomics {
  referralFee: number;
  totalCost: number;
  profitPerUnit: number;
  marginPct: number;
  breakEvenAcos: number;
}

function unitEconomics(
  price: number,
  cogs: number,
  shipping: number,
  fbaFee: number,
  referralPct: number,
  otherCosts: number,
): UnitEconomics {
  const referralFee = price * (referralPct / 100);
  const totalCost = cogs + shipping + fbaFee + referralFee + otherCosts;
  const profitPerUnit = price - totalCost;
  const marginPct = div(profitPerUnit, price) * 100;
  return { referralFee, totalCost, profitPerUnit, marginPct, breakEvenAcos: marginPct };
}

function nextVariantId(existing: ProfitVariant[]): string {
  let index = existing.length + 1;
  const taken = new Set(existing.map((variant) => variant.id));
  while (taken.has(`variant-${index}`)) index += 1;
  return `variant-${index}`;
}

export function ProfitMarginCalculator() {
  const { values, set, replace, reset } = useCalcState("profit-margin", DEFAULTS);
  const { price, cogs, shipping, fbaFee, referralPct, otherCosts, adSpend, adRevenue, variants } =
    values;

  const model = useMemo(() => {
    const base = unitEconomics(price, cogs, shipping, fbaFee, referralPct, otherCosts);
    const units = div(adRevenue, price);
    const grossProfitFromAds = base.profitPerUnit * units;
    const netProfitAfterAds = grossProfitFromAds - adSpend;
    const roi = div(netProfitAfterAds, adSpend) * 100;
    const acos = div(adSpend, adRevenue) * 100;
    const maxAdSpendBreakEven = adRevenue * (base.breakEvenAcos / 100);
    const maxAdSpendHalfMargin = maxAdSpendBreakEven / 2;
    const headroom = maxAdSpendBreakEven - adSpend;

    const variantRows = variants.map((variant) => {
      const economics = unitEconomics(
        variant.price,
        variant.cogs,
        shipping,
        variant.fbaFee,
        referralPct,
        otherCosts,
      );
      return { ...variant, ...economics };
    });

    const chartRows = [
      {
        name: "Base",
        cogs,
        shipping,
        fba: fbaFee,
        referral: base.referralFee,
        other: otherCosts,
        profit: Math.max(0, base.profitPerUnit),
        price,
        margin: base.marginPct,
      },
      ...variantRows.map((row) => ({
        name: row.label,
        cogs: row.cogs,
        shipping,
        fba: row.fbaFee,
        referral: row.referralFee,
        other: otherCosts,
        profit: Math.max(0, row.profitPerUnit),
        price: row.price,
        margin: row.marginPct,
      })),
    ];

    return {
      ...base,
      units,
      grossProfitFromAds,
      netProfitAfterAds,
      roi,
      acos,
      maxAdSpendBreakEven,
      maxAdSpendHalfMargin,
      headroom,
      variantRows,
      chartRows,
    };
  }, [
    price,
    cogs,
    shipping,
    fbaFee,
    referralPct,
    otherCosts,
    adSpend,
    adRevenue,
    variants,
  ]);

  const tone = acosTone(model.acos, model.breakEvenAcos);

  const updateVariant = useCallback(
    (id: string, patch: Partial<ProfitVariant>) => {
      replace((previous) => ({
        ...previous,
        variants: previous.variants.map((variant) =>
          variant.id === id ? { ...variant, ...patch } : variant,
        ),
      }));
    },
    [replace],
  );

  const addVariant = useCallback(() => {
    replace((previous) => ({
      ...previous,
      variants: [
        ...previous.variants,
        {
          id: nextVariantId(previous.variants),
          label: `Variant ${previous.variants.length + 1}`,
          price: Number((previous.price * 1.6).toFixed(2)),
          cogs: Number((previous.cogs * 1.6).toFixed(2)),
          fbaFee: Number((previous.fbaFee * 1.15).toFixed(2)),
        },
      ],
    }));
  }, [replace]);

  const removeVariant = useCallback(
    (id: string) => {
      replace((previous) => ({
        ...previous,
        variants: previous.variants.filter((variant) => variant.id !== id),
      }));
    },
    [replace],
  );

  const report = buildReport("Profit margin", [
    {
      heading: "Unit costs",
      lines: [
        ["Selling price", money(price)],
        ["Cost of goods", money(cogs)],
        ["Shipping to Amazon", money(shipping)],
        ["FBA fulfilment fee", money(fbaFee)],
        [`Referral fee (${pct(referralPct, 0)})`, money(model.referralFee)],
        ["Other costs", money(otherCosts)],
        ["Total cost per unit", money(model.totalCost)],
      ],
    },
    {
      heading: "Margin",
      lines: [
        ["Profit per unit", money(model.profitPerUnit)],
        ["Profit margin", pct(model.marginPct)],
        ["Break-even ACoS", pct(model.breakEvenAcos)],
      ],
    },
    {
      heading: "Advertising",
      lines: [
        ["Ad spend", money(adSpend)],
        ["Ad revenue", money(adRevenue)],
        ["ACoS", pct(model.acos)],
        ["Units from ads", num(model.units, 1)],
        ["Gross profit on those units", money(model.grossProfitFromAds)],
        ["Net profit after ad spend", money(model.netProfitAfterAds)],
        ["Return on ad spend invested", pct(model.roi)],
        ["Max ad spend at break-even", money(model.maxAdSpendBreakEven)],
        ["Max ad spend keeping half the margin", money(model.maxAdSpendHalfMargin)],
      ],
    },
    {
      heading: "Variants",
      lines: model.variantRows.map(
        (row) =>
          [
            row.label,
            `${money(row.price)} · margin ${pct(row.marginPct)} · break-even ACoS ${pct(row.breakEvenAcos)}`,
          ] as [string, string],
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
            id="pm-price"
            label="Selling price"
            value={price}
            onChange={(next) => set("price", next)}
            hint="List price before promotions and coupons."
            min={0.01}
          />
          <CurrencyField
            id="pm-cogs"
            label="Cost of goods"
            value={cogs}
            onChange={(next) => set("cogs", next)}
            hint="Manufacturing cost per unit, ex-works."
          />
          <CurrencyField
            id="pm-shipping"
            label="Shipping to Amazon"
            value={shipping}
            onChange={(next) => set("shipping", next)}
            hint="Inbound freight and prep, per unit."
          />
          <CurrencyField
            id="pm-fba"
            label="FBA fulfilment fee"
            value={fbaFee}
            onChange={(next) => set("fbaFee", next)}
            hint="Pick, pack and ship for this size tier."
          />
          <PercentField
            id="pm-referral"
            label="Amazon referral fee"
            value={referralPct}
            onChange={(next) => set("referralPct", next)}
            hint="Category commission, usually 8-15% of price."
            max={50}
            step={0.5}
          />
          <CurrencyField
            id="pm-other"
            label="Other costs"
            value={otherCosts}
            onChange={(next) => set("otherCosts", next)}
            hint="Storage, returns reserve, inserts, packaging."
          />
          <CurrencyField
            id="pm-ad-spend"
            label="Ad spend"
            value={adSpend}
            onChange={(next) => set("adSpend", next)}
            hint="Spend for the period you are reviewing."
            step={10}
          />
          <CurrencyField
            id="pm-ad-revenue"
            label="Ad revenue"
            value={adRevenue}
            onChange={(next) => set("adRevenue", next)}
            hint="Ad-attributed sales for the same period."
            step={10}
          />
        </>
      }
    >
      <ResultGrid>
        <ResultTile
          label="Profit per unit"
          value={money(model.profitPerUnit)}
          tone={model.profitPerUnit > 0 ? "good" : "bad"}
          emphasis
          icon={Coins}
          hint={`${money(price)} price less ${money(model.totalCost)} of cost`}
        />
        <ResultTile
          label="Profit margin"
          value={pct(model.marginPct)}
          tone={model.marginPct >= 25 ? "good" : model.marginPct >= 15 ? "warn" : "bad"}
          emphasis
          icon={Percent}
          hint="Before any advertising"
        />
        <ResultTile
          label="Break-even ACoS"
          value={pct(model.breakEvenAcos)}
          tone="brand"
          emphasis
          icon={Receipt}
          hint="The same number as the margin, seen from the ad side"
        />
        <ResultTile
          label="Max ad spend"
          value={money(model.maxAdSpendBreakEven)}
          tone={model.headroom >= 0 ? "good" : "bad"}
          emphasis
          icon={Wallet}
          hint={`On ${money(adRevenue)} of ad revenue · ${model.headroom >= 0 ? `${money(model.headroom)} of headroom left` : `${money(Math.abs(model.headroom))} over`}`}
        />
      </ResultGrid>

      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <CalcPanel
          title="Where each sale goes"
          description="Every cost that is not advertising, taken out of the price in the order Amazon takes it."
        >
          <Table caption="Per-unit cost stack and what is left as profit.">
            <THead>
              <TR>
                <TH>Line</TH>
                <TH numeric>Per unit</TH>
                <TH numeric>Share of price</TH>
              </TR>
            </THead>
            <TBody>
              <TR>
                <THRow>Selling price</THRow>
                <TD numeric mono className="font-semibold">
                  {money(price)}
                </TD>
                <TD numeric mono className="text-muted">
                  100%
                </TD>
              </TR>
              {[
                ["Cost of goods", cogs],
                ["Shipping to Amazon", shipping],
                ["FBA fulfilment fee", fbaFee],
                [`Referral fee (${pct(referralPct, 0)})`, model.referralFee],
                ["Other costs", otherCosts],
              ].map(([label, amount]) => (
                <TR key={String(label)}>
                  <THRow className="font-normal text-muted">{label}</THRow>
                  <TD numeric mono className="text-muted">
                    −{money(Number(amount))}
                  </TD>
                  <TD numeric mono className="text-muted">
                    {pct(div(Number(amount), price) * 100)}
                  </TD>
                </TR>
              ))}
              <TR className="bg-surface-2/60">
                <THRow>Total cost</THRow>
                <TD numeric mono className="font-semibold">
                  {money(model.totalCost)}
                </TD>
                <TD numeric mono>
                  {pct(div(model.totalCost, price) * 100)}
                </TD>
              </TR>
              <TR>
                <THRow>Profit per unit</THRow>
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
                  {pct(model.marginPct)}
                </TD>
              </TR>
            </TBody>
          </Table>
        </CalcPanel>

        <CalcPanel
          title="What the advertising did"
          description="The same unit economics applied to the ad-attributed sales you entered."
          actions={<MetricChip label="ACoS" value={pct(model.acos)} tone={tone} />}
        >
          <ResultGrid columns={2}>
            <ResultTile
              label="Units from ads"
              value={num(model.units, 1)}
              hint={`${money(adRevenue)} / ${money(price)}`}
            />
            <ResultTile
              label="Gross profit on those units"
              value={money(model.grossProfitFromAds)}
              hint={`${num(model.units, 1)} x ${money(model.profitPerUnit)}`}
            />
            <ResultTile
              label="Net profit after ad spend"
              value={money(model.netProfitAfterAds)}
              tone={model.netProfitAfterAds >= 0 ? "good" : "bad"}
              hint={`${money(model.grossProfitFromAds)} less ${money(adSpend)} of ads`}
            />
            <ResultTile
              label="Return on ad spend invested"
              value={pct(model.roi)}
              tone={model.roi >= 0 ? "good" : "bad"}
              hint="Net profit as a percentage of the ad budget"
            />
            <ResultTile
              label="Max ad spend at break-even"
              value={money(model.maxAdSpendBreakEven)}
              hint={`${money(adRevenue)} x ${pct(model.breakEvenAcos)}`}
            />
            <ResultTile
              label="Max spend keeping half the margin"
              value={money(model.maxAdSpendHalfMargin)}
              tone="brand"
              hint={`A ${pct(model.breakEvenAcos / 2)} target ACoS`}
            />
          </ResultGrid>
        </CalcPanel>
      </div>

      <CalcPanel
        title="Variants"
        description="Shipping, referral percentage and other costs are shared; price, cost of goods and the FBA fee change per size or pack. A multi-pack usually carries a better margin than the single, so it can afford a higher ACoS."
        actions={
          <Button variant="secondary" size="sm" icon={Plus} onClick={addVariant}>
            Add variant
          </Button>
        }
      >
        <div className="grid gap-4">
          {variants.map((variant) => {
            const row = model.variantRows.find((entry) => entry.id === variant.id);
            return (
              <div
                key={variant.id}
                className="rounded-xl border border-hairline bg-canvas p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    id={`pm-variant-label-${variant.id}`}
                    label="Variant"
                    value={variant.label}
                    onChange={(event) =>
                      updateVariant(variant.id, { label: event.target.value })
                    }
                  />
                  <CurrencyField
                    id={`pm-variant-price-${variant.id}`}
                    label="Price"
                    value={variant.price}
                    onChange={(next) => updateVariant(variant.id, { price: next })}
                    min={0.01}
                  />
                  <CurrencyField
                    id={`pm-variant-cogs-${variant.id}`}
                    label="Cost of goods"
                    value={variant.cogs}
                    onChange={(next) => updateVariant(variant.id, { cogs: next })}
                  />
                  <CurrencyField
                    id={`pm-variant-fba-${variant.id}`}
                    label="FBA fee"
                    value={variant.fbaFee}
                    onChange={(next) => updateVariant(variant.id, { fbaFee: next })}
                  />
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <MetricChip label="Cost" value={money(row?.totalCost ?? Number.NaN)} />
                  <MetricChip
                    label="Profit"
                    value={money(row?.profitPerUnit ?? Number.NaN)}
                    tone={(row?.profitPerUnit ?? 0) >= 0 ? "good" : "bad"}
                  />
                  <MetricChip
                    label="Margin"
                    value={pct(row?.marginPct ?? Number.NaN)}
                    tone={(row?.marginPct ?? 0) >= 25 ? "good" : (row?.marginPct ?? 0) >= 15 ? "warn" : "bad"}
                  />
                  <MetricChip
                    label="Break-even ACoS"
                    value={pct(row?.breakEvenAcos ?? Number.NaN)}
                    tone="brand"
                  />
                  {variants.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      className="ml-auto"
                      onClick={() => removeVariant(variant.id)}
                      aria-label={`Remove the ${variant.label} variant`}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CalcPanel>

      <ChartCard
        title="Where the price goes, variant by variant"
        description="Each bar is one unit of revenue split into the costs it has to cover. The green segment is what is left to pay for advertising and profit."
        summary={`Cost stack for the base product and ${variants.length} variant${variants.length === 1 ? "" : "s"}. The base product keeps ${money(model.profitPerUnit)} of its ${money(price)} price, a ${pct(model.marginPct)} margin. ${model.variantRows
          .map((row) => `${row.label} keeps ${money(row.profitPerUnit)} of ${money(row.price)}, a ${pct(row.marginPct)} margin`)
          .join(". ")}.`}
        height={70 + model.chartRows.length * 52}
        table={{
          caption: "Per-unit cost stack, profit and break-even ACoS for every variant.",
          head: ["Variant", "Price", "COGS", "Shipping", "FBA", "Referral", "Other", "Profit", "Margin"],
          rows: model.chartRows.map((row) => ({
            label: row.name,
            cells: [
              money(row.price),
              money(row.cogs),
              money(row.shipping),
              money(row.fba),
              money(row.referral),
              money(row.other),
              money(row.price - row.cogs - row.shipping - row.fba - row.referral - row.other),
              pct(row.margin),
            ],
          })),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            {...CHART_A11Y}
            data={model.chartRows}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid horizontal={false} stroke="var(--hairline)" />
            <XAxis
              type="number"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              tickFormatter={(value: number) => `$${Math.round(value)}`}
              height={26}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              formatter={(value: unknown, name: unknown) => [money(Number(value)), String(name)]}
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
            {COST_KEYS.map((entry) => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                name={entry.label}
                stackId="unit"
                fill={entry.fill}
                radius={entry.key === "profit" ? [0, 3, 3, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <FormulaStack description="Four lines of arithmetic, with the numbers you entered.">
        <FormulaLine
          label="Referral fee"
          formula="Price x Referral %"
          substituted={`${money(price)} x ${(referralPct / 100).toFixed(3)}`}
          result={money(model.referralFee)}
          tone="ember"
        />
        <FormulaLine
          label="Total cost per unit"
          formula="COGS + Shipping + FBA fee + Referral fee + Other"
          substituted={`${money(cogs)} + ${money(shipping)} + ${money(fbaFee)} + ${money(model.referralFee)} + ${money(otherCosts)}`}
          result={money(model.totalCost)}
          tone="info"
        />
        <FormulaLine
          label="Profit margin (= break-even ACoS)"
          formula="(Price - Total cost) / Price x 100"
          substituted={`(${money(price)} - ${money(model.totalCost)}) / ${money(price)} x 100`}
          result={pct(model.marginPct)}
          tone={model.marginPct >= 25 ? "good" : "warn"}
          note="Margin and break-even ACoS are the same number. At that ACoS the ad costs exactly the profit on the unit it sold."
        />
        <FormulaLine
          label="Max ad spend"
          formula="Ad revenue x Break-even ACoS"
          substituted={`${money(adRevenue)} x ${(model.breakEvenAcos / 100).toFixed(3)}`}
          result={money(model.maxAdSpendBreakEven)}
          tone={model.headroom >= 0 ? "good" : "bad"}
        />
      </FormulaStack>

      <Interpretation
        tone={tone}
        title={acosVerdict(model.acos, model.breakEvenAcos)}
        next={
          tone === "good"
            ? [
                `You have ${money(model.headroom)} of spend headroom before this product stops paying for itself. Use it on the campaigns already under ${pct(model.breakEvenAcos)}.`,
                `Manage the base product to ${pct(model.breakEvenAcos / 2)} ACoS if the client wants profit, ${pct(model.breakEvenAcos * 0.8)} if they want share.`,
                model.variantRows.length > 0
                  ? `Set a separate target for each variant: ${model.variantRows.map((row) => `${row.label} at ${pct(row.breakEvenAcos)}`).join(", ")}.`
                  : "Add your pack sizes as variants — they rarely share the same break-even ACoS.",
              ]
            : [
                `Ad spend is ${money(Math.abs(model.headroom))} over the ${money(model.maxAdSpendBreakEven)} that this margin supports. Cut the bids on everything above ${pct(model.breakEvenAcos)} ACoS first.`,
                `Check the cost stack before the campaigns: the referral fee alone takes ${money(model.referralFee)} and the FBA fee ${money(fbaFee)}, which is ${pct(div(model.referralFee + fbaFee, price) * 100)} of the price.`,
                model.variantRows.some((row) => row.marginPct > model.marginPct)
                  ? `Push the ad budget toward ${model.variantRows.reduce((best, row) => (row.marginPct > best.marginPct ? row : best)).label}, which carries the better margin.`
                  : "A price rise of one dollar adds roughly a point of margin — worth testing before cutting spend further.",
              ]
        }
      >
        <p>
          A {money(price)} sale leaves <strong>{money(model.profitPerUnit)}</strong> after{" "}
          {money(model.totalCost)} of cost, a <strong>{pct(model.marginPct)} margin</strong>. That
          margin is the break-even ACoS: advertising can consume up to {pct(model.breakEvenAcos)} of
          the sale price before the unit loses money.
        </p>
        <p>
          On {money(adRevenue)} of ad revenue that allows {money(model.maxAdSpendBreakEven)} of ad
          spend. You are spending {money(adSpend)}, which is {pct(model.acos)} ACoS and leaves{" "}
          <strong>{money(model.netProfitAfterAds)}</strong> of net profit on the{" "}
          {num(model.units, 1)} units the ads sold.
        </p>
      </Interpretation>
    </CalcShell>
  );
}
