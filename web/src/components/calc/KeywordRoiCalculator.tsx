"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Plus,
  Scissors,
  Sprout,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

import { Badge, MetricChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Textarea";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { keywordRoiDefaults } from "@/content/calculators";
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
import { downloadCsv, todayStamp } from "./csv";
import { NumberField, PercentField } from "./fields";
import { FormulaLine, FormulaStack } from "./FormulaLine";
import { TONE_VAR, div, money, num, pct } from "./format";
import { Interpretation } from "./Interpretation";
import { ResultGrid, ResultTile } from "./ResultTile";
import { useCalcState } from "./useCalcState";

/**
 * Keyword ROI calculator.
 *
 * The search term report is the only report that tells you what shoppers
 * actually typed, and it is the report most VAs skim rather than work. This
 * turns a paste of it into a verdict per row and two lists: the terms to
 * promote into their own exact-match ad group, and the terms to negate.
 *
 * Ported from `Keyword-ROI-Calculator.xlsx`. The four rules are the workbook's
 * HARVEST / OPTIMIZE / NEGATE bands, with the 15-clicks-no-orders negative
 * rule from the automation guide.
 */

export type Verdict = "harvest" | "optimise" | "negate" | "watch";

interface VerdictMeta {
  label: string;
  tone: Tone;
  short: string;
}

const VERDICTS: Record<Verdict, VerdictMeta> = {
  harvest: { label: "Harvest", tone: "good", short: "Promote to its own exact ad group" },
  optimise: { label: "Optimise", tone: "warn", short: "Cut the bid, keep the term" },
  negate: { label: "Negate", tone: "bad", short: "Add as a negative exact" },
  watch: { label: "Watch", tone: "neutral", short: "Not enough clicks to judge" },
};

const VERDICT_ORDER: Verdict[] = ["harvest", "optimise", "negate", "watch"];

export interface KeywordRow {
  id: string;
  term: string;
  impressions: number;
  clicks: number;
  orders: number;
  spend: number;
  revenue: number;
}

const DEFAULT_ROWS: KeywordRow[] = [
  { id: "k1", term: "bamboo cutting board set", impressions: 18420, clicks: 412, orders: 51, spend: 349.2, revenue: 1529.49 },
  { id: "k2", term: "cutting board", impressions: 44310, clicks: 587, orders: 38, spend: 622.22, revenue: 1139.62 },
  { id: "k3", term: "wood cutting board with handle", impressions: 9120, clicks: 198, orders: 27, spend: 158.4, revenue: 809.73 },
  { id: "k4", term: "large cutting board for kitchen", impressions: 12680, clicks: 241, orders: 22, spend: 212.08, revenue: 659.78 },
  { id: "k5", term: "butcher block cutting board", impressions: 21450, clicks: 176, orders: 3, spend: 190.08, revenue: 89.97 },
  { id: "k6", term: "cheese board", impressions: 15230, clicks: 143, orders: 0, spend: 132.99, revenue: 0 },
  { id: "k7", term: "cutting board oil", impressions: 8940, clicks: 96, orders: 0, spend: 78.72, revenue: 0 },
  { id: "k8", term: "bamboo cutting boards for kitchen", impressions: 6210, clicks: 134, orders: 19, spend: 107.2, revenue: 569.81 },
  { id: "k9", term: "chopping board wooden", impressions: 4380, clicks: 71, orders: 6, spend: 62.48, revenue: 179.94 },
  { id: "k10", term: "plastic cutting board", impressions: 11200, clicks: 88, orders: 1, spend: 79.2, revenue: 29.99 },
  { id: "k11", term: "kitchen gifts for mom", impressions: 3120, clicks: 22, orders: 2, spend: 21.34, revenue: 59.98 },
  { id: "k12", term: "end grain cutting board", impressions: 2840, clicks: 9, orders: 1, spend: 8.91, revenue: 29.99 },
  { id: "k13", term: "cutting board set of 3", impressions: 5670, clicks: 112, orders: 17, spend: 94.08, revenue: 509.83 },
  { id: "k14", term: "walnut cutting board", impressions: 7340, clicks: 64, orders: 0, spend: 57.6, revenue: 0 },
];

const DEFAULTS = { ...keywordRoiDefaults, rows: DEFAULT_ROWS };

type SortKey =
  | "term"
  | "impressions"
  | "clicks"
  | "ctr"
  | "orders"
  | "cvr"
  | "spend"
  | "cpc"
  | "revenue"
  | "acos"
  | "roas"
  | "revenuePerClick"
  | "profitPerClick"
  | "verdict";

interface ColumnDef {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "term", label: "Search term", numeric: false },
  { key: "impressions", label: "Impr.", numeric: true },
  { key: "clicks", label: "Clicks", numeric: true },
  { key: "ctr", label: "CTR", numeric: true },
  { key: "orders", label: "Orders", numeric: true },
  { key: "cvr", label: "CVR", numeric: true },
  { key: "spend", label: "Spend", numeric: true },
  { key: "cpc", label: "CPC", numeric: true },
  { key: "revenue", label: "Revenue", numeric: true },
  { key: "acos", label: "ACoS", numeric: true },
  { key: "roas", label: "ROAS", numeric: true },
  { key: "revenuePerClick", label: "Rev/click", numeric: true },
  { key: "profitPerClick", label: "Profit/click", numeric: true },
  { key: "verdict", label: "Verdict", numeric: false },
];

interface Thresholds {
  harvestAcos: number;
  optimiseAcos: number;
  minCvr: number;
  negateClicks: number;
  minClicks: number;
}

interface ComputedRow extends KeywordRow {
  ctr: number;
  cvr: number;
  cpc: number;
  acos: number;
  roas: number;
  revenuePerClick: number;
  profitPerClick: number;
  aov: number;
  verdict: Verdict;
  reason: string;
  suggestedBid: number;
}

function verdictFor(row: KeywordRow, cvr: number, acos: number, rules: Thresholds): {
  verdict: Verdict;
  reason: string;
} {
  if (row.clicks < rules.minClicks) {
    return {
      verdict: "watch",
      reason: `Only ${num(row.clicks)} clicks — under the ${num(rules.minClicks)}-click minimum, so any verdict would be noise.`,
    };
  }
  if (row.orders === 0) {
    if (row.clicks >= rules.negateClicks) {
      return {
        verdict: "negate",
        reason: `${num(row.clicks)} clicks and no orders, past the ${num(rules.negateClicks)}-click rule. ${money(row.spend)} spent for nothing.`,
      };
    }
    return {
      verdict: "watch",
      reason: `No orders yet, but only ${num(row.clicks)} clicks — wait for ${num(rules.negateClicks)} before negating.`,
    };
  }
  if (acos <= rules.harvestAcos && cvr >= rules.minCvr) {
    return {
      verdict: "harvest",
      reason: `${pct(acos)} ACoS at ${pct(cvr)} conversion. Proven demand — give it its own exact-match ad group and its own bid.`,
    };
  }
  if (acos <= rules.harvestAcos) {
    return {
      verdict: "optimise",
      reason: `${pct(acos)} ACoS looks good, but ${pct(cvr)} conversion is under the ${pct(rules.minCvr)} floor. Cheap ACoS on a weak converter is luck, not a pattern.`,
    };
  }
  if (acos <= rules.optimiseAcos) {
    return {
      verdict: "optimise",
      reason: `${pct(acos)} ACoS, above the ${pct(rules.harvestAcos)} harvest line but inside the ${pct(rules.optimiseAcos)} ceiling. Cut the bid rather than the term.`,
    };
  }
  return {
    verdict: "negate",
    reason: `${pct(acos)} ACoS is past the ${pct(rules.optimiseAcos)} ceiling. ${num(row.orders)} order${row.orders === 1 ? "" : "s"} does not justify ${money(row.spend)}.`,
  };
}

function computeRow(row: KeywordRow, marginPct: number, rules: Thresholds): ComputedRow {
  const ctr = div(row.clicks, row.impressions) * 100;
  const cvr = div(row.orders, row.clicks) * 100;
  const cpc = div(row.spend, row.clicks);
  const acos = row.revenue > 0 ? div(row.spend, row.revenue) * 100 : Number.POSITIVE_INFINITY;
  const roas = div(row.revenue, row.spend);
  const revenuePerClick = div(row.revenue, row.clicks);
  const profitPerClick = div(row.revenue * (marginPct / 100) - row.spend, row.clicks);
  const aov = div(row.revenue, row.orders);
  const { verdict, reason } = verdictFor(row, cvr, acos, rules);
  const suggestedBid =
    Number.isFinite(aov) && row.clicks > 0
      ? (rules.harvestAcos / 100) * aov * (row.orders / row.clicks) * 0.8
      : Number.NaN;

  return {
    ...row,
    ctr,
    cvr,
    cpc,
    acos,
    roas,
    revenuePerClick,
    profitPerClick,
    aov,
    verdict,
    reason,
    suggestedBid,
  };
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[$,%\s"]/g, "").replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parse a pasted search-term report. Tab or comma separated, header optional. */
export function parseSearchTermPaste(text: string, startIndex: number): KeywordRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const split = (line: string) => line.split(delimiter).map((cell) => cell.trim());

  let index = { term: 0, impressions: 1, clicks: 2, orders: 3, spend: 4, revenue: 5 };
  let body = lines;

  const header = split(lines[0]).map((cell) => cell.toLowerCase());
  const looksLikeHeader = header.some((cell) => /term|keyword|query|impress|click/.test(cell));
  if (looksLikeHeader) {
    const find = (pattern: RegExp, fallback: number) => {
      const found = header.findIndex((cell) => pattern.test(cell));
      return found === -1 ? fallback : found;
    };
    index = {
      term: find(/term|keyword|query|targeting/, 0),
      impressions: find(/impress/, 1),
      clicks: find(/^clicks|clicks$|clicks/, 2),
      orders: find(/order|purchase|conversions?$/, 3),
      spend: find(/spend|cost/, 4),
      revenue: find(/sales|revenue/, 5),
    };
    body = lines.slice(1);
  }

  const rows: KeywordRow[] = [];
  body.forEach((line, offset) => {
    const cells = split(line);
    const term = (cells[index.term] ?? "").replace(/^"|"$/g, "").trim();
    if (!term) return;
    rows.push({
      id: `p${startIndex + offset}-${Math.random().toString(36).slice(2, 7)}`,
      term,
      impressions: parseNumber(cells[index.impressions] ?? "0"),
      clicks: parseNumber(cells[index.clicks] ?? "0"),
      orders: parseNumber(cells[index.orders] ?? "0"),
      spend: parseNumber(cells[index.spend] ?? "0"),
      revenue: parseNumber(cells[index.revenue] ?? "0"),
    });
  });
  return rows;
}

function acosCell(value: number): string {
  return Number.isFinite(value) ? pct(value) : "∞";
}

function CellInput({
  label,
  value,
  onChange,
  text,
  width = "w-20",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  text?: boolean;
  width?: string;
}) {
  return (
    <input
      type={text ? "text" : "number"}
      inputMode={text ? "text" : "decimal"}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "min-h-9 rounded-md border border-hairline bg-surface px-2 text-[0.8125rem] text-ink",
        "transition-colors hover:border-hairline-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        text ? "w-full min-w-[11rem]" : cn("tabular text-right", width),
      )}
    />
  );
}

function SortHeader({
  column,
  sortKey,
  direction,
  onSort,
}: {
  column: ColumnDef;
  sortKey: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column.key;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  return (
    <TH numeric={column.numeric} aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={cn(
          "inline-flex min-h-8 items-center gap-1 rounded px-0.5 transition-colors hover:text-ink",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          column.numeric && "flex-row-reverse",
          active && "text-ink",
        )}
      >
        <Icon className={cn("size-3 shrink-0", active ? "text-brand" : "text-faint")} aria-hidden="true" />
        <span>{column.label}</span>
      </button>
    </TH>
  );
}

export function KeywordRoiCalculator() {
  const { values, set, replace, reset } = useCalcState("keyword-roi", DEFAULTS);
  const { marginPct, harvestAcos, optimiseAcos, minCvr, negateClicks, minClicks, rows } = values;

  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const rules = useMemo<Thresholds>(
    () => ({ harvestAcos, optimiseAcos, minCvr, negateClicks, minClicks }),
    [harvestAcos, optimiseAcos, minCvr, negateClicks, minClicks],
  );

  const computed = useMemo(
    () => rows.map((row) => computeRow(row, marginPct, rules)),
    [rows, marginPct, rules],
  );

  const totals = useMemo(() => {
    const sum = computed.reduce(
      (acc, row) => ({
        impressions: acc.impressions + row.impressions,
        clicks: acc.clicks + row.clicks,
        orders: acc.orders + row.orders,
        spend: acc.spend + row.spend,
        revenue: acc.revenue + row.revenue,
      }),
      { impressions: 0, clicks: 0, orders: 0, spend: 0, revenue: 0 },
    );
    const wasted = computed
      .filter((row) => row.verdict === "negate")
      .reduce((total, row) => total + row.spend, 0);
    const counts = VERDICT_ORDER.reduce<Record<Verdict, number>>(
      (acc, verdict) => {
        acc[verdict] = computed.filter((row) => row.verdict === verdict).length;
        return acc;
      },
      { harvest: 0, optimise: 0, negate: 0, watch: 0 },
    );
    return {
      ...sum,
      ctr: div(sum.clicks, sum.impressions) * 100,
      cvr: div(sum.orders, sum.clicks) * 100,
      cpc: div(sum.spend, sum.clicks),
      acos: div(sum.spend, sum.revenue) * 100,
      roas: div(sum.revenue, sum.spend),
      profit: sum.revenue * (marginPct / 100) - sum.spend,
      wasted,
      wastedShare: div(wasted, sum.spend) * 100,
      counts,
    };
  }, [computed, marginPct]);

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1;
    return [...computed].sort((a, b) => {
      if (sortKey === "term") return factor * a.term.localeCompare(b.term);
      if (sortKey === "verdict") {
        return (
          factor * (VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict)) ||
          b.spend - a.spend
        );
      }
      const left = a[sortKey];
      const right = b[sortKey];
      const safeLeft = Number.isFinite(left) ? (left as number) : Number.MAX_SAFE_INTEGER;
      const safeRight = Number.isFinite(right) ? (right as number) : Number.MAX_SAFE_INTEGER;
      return factor * (safeLeft - safeRight);
    });
  }, [computed, sortKey, direction]);

  const harvestList = useMemo(
    () => computed.filter((row) => row.verdict === "harvest").sort((a, b) => b.revenue - a.revenue),
    [computed],
  );
  const negateList = useMemo(
    () => computed.filter((row) => row.verdict === "negate").sort((a, b) => b.spend - a.spend),
    [computed],
  );

  const chartRows = useMemo(
    () =>
      [...computed]
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10)
        .map((row) => ({
          term: row.term.length > 22 ? `${row.term.slice(0, 21)}…` : row.term,
          fullTerm: row.term,
          spend: row.spend,
          revenue: row.revenue,
          acos: Number.isFinite(row.acos) ? Math.min(row.acos, 300) : 300,
          verdict: row.verdict,
        })),
    [computed],
  );

  // Both pieces of state are set from the event handler, never from inside a
  // setState updater: an updater must stay pure, and React calls it twice in
  // development, which would toggle the direction back to where it started.
  const onSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setDirection((previous) => (previous === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(key);
      setDirection(key === "term" || key === "verdict" ? "asc" : "desc");
    },
    [sortKey],
  );

  const updateRow = useCallback(
    (id: string, patch: Partial<KeywordRow>) => {
      replace((previous) => ({
        ...previous,
        rows: previous.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      }));
    },
    [replace],
  );

  const removeRow = useCallback(
    (id: string) => {
      replace((previous) => ({
        ...previous,
        rows: previous.rows.filter((row) => row.id !== id),
      }));
    },
    [replace],
  );

  const addRow = useCallback(() => {
    replace((previous) => ({
      ...previous,
      rows: [
        ...previous.rows,
        {
          id: `new-${previous.rows.length}-${Math.random().toString(36).slice(2, 7)}`,
          term: "",
          impressions: 0,
          clicks: 0,
          orders: 0,
          spend: 0,
          revenue: 0,
        },
      ],
    }));
  }, [replace]);

  const importPaste = useCallback(
    (mode: "replace" | "append") => {
      const parsed = parseSearchTermPaste(paste, rows.length);
      if (parsed.length === 0) {
        setPasteNote("Nothing recognisable in there. Check the columns are separated by tabs or commas.");
        return;
      }
      replace((previous) => ({
        ...previous,
        rows: mode === "replace" ? parsed : [...previous.rows, ...parsed],
      }));
      setPaste("");
      setPasteNote(
        `${mode === "replace" ? "Replaced the table with" : "Added"} ${parsed.length} row${parsed.length === 1 ? "" : "s"}.`,
      );
    },
    [paste, replace, rows.length],
  );

  const exportAll = useCallback(() => {
    downloadCsv(`keyword-roi-${todayStamp()}.csv`, [
      [
        "Search term",
        "Impressions",
        "Clicks",
        "CTR %",
        "Orders",
        "CVR %",
        "Spend",
        "CPC",
        "Revenue",
        "ACoS %",
        "ROAS",
        "Revenue per click",
        "Profit per click",
        "Verdict",
        "Reason",
      ],
      ...sorted.map((row) => [
        row.term,
        row.impressions,
        row.clicks,
        row.ctr.toFixed(2),
        row.orders,
        row.cvr.toFixed(2),
        row.spend.toFixed(2),
        Number.isFinite(row.cpc) ? row.cpc.toFixed(2) : "",
        row.revenue.toFixed(2),
        Number.isFinite(row.acos) ? row.acos.toFixed(2) : "",
        Number.isFinite(row.roas) ? row.roas.toFixed(2) : "",
        Number.isFinite(row.revenuePerClick) ? row.revenuePerClick.toFixed(2) : "",
        Number.isFinite(row.profitPerClick) ? row.profitPerClick.toFixed(2) : "",
        VERDICTS[row.verdict].label,
        row.reason,
      ]),
    ]);
  }, [sorted]);

  const exportHarvest = useCallback(() => {
    downloadCsv(`harvest-list-${todayStamp()}.csv`, [
      ["Keyword", "Match type", "Suggested bid", "Orders", "CVR %", "ACoS %", "Revenue"],
      ...harvestList.map((row) => [
        row.term,
        "exact",
        Number.isFinite(row.suggestedBid) ? row.suggestedBid.toFixed(2) : "",
        row.orders,
        row.cvr.toFixed(2),
        row.acos.toFixed(2),
        row.revenue.toFixed(2),
      ]),
    ]);
  }, [harvestList]);

  const exportNegate = useCallback(() => {
    downloadCsv(`negate-list-${todayStamp()}.csv`, [
      ["Keyword", "Match type", "Clicks", "Orders", "Wasted spend", "Reason"],
      ...negateList.map((row) => [
        row.term,
        "negative exact",
        row.clicks,
        row.orders,
        row.spend.toFixed(2),
        row.reason,
      ]),
    ]);
  }, [negateList]);

  const harvestText = harvestList.map((row) => row.term).join("\n");
  const negateText = negateList.map((row) => row.term).join("\n");

  const report = buildReport("Keyword ROI", [
    {
      heading: "Account totals",
      lines: [
        ["Search terms", num(rows.length)],
        ["Impressions", num(totals.impressions)],
        ["Clicks", num(totals.clicks)],
        ["CTR", pct(totals.ctr, 2)],
        ["Orders", num(totals.orders)],
        ["CVR", pct(totals.cvr)],
        ["Spend", money(totals.spend)],
        ["Revenue", money(totals.revenue)],
        ["ACoS", pct(totals.acos)],
        ["ROAS", `${totals.roas.toFixed(2)}x`],
        ["Wasted spend", `${money(totals.wasted)} (${pct(totals.wastedShare)})`],
      ],
    },
    {
      heading: `Harvest (${harvestList.length})`,
      lines: harvestList.map(
        (row) =>
          [row.term, `${pct(row.acos)} ACoS · bid ${money(row.suggestedBid)} exact`] as [
            string,
            string,
          ],
      ),
    },
    {
      heading: `Negate (${negateList.length})`,
      lines: negateList.map(
        (row) => [row.term, `${money(row.spend)} wasted · ${num(row.clicks)} clicks`] as [string, string],
      ),
    },
  ]);

  return (
    <CalcShell
      onReset={reset}
      copyText={report}
      inputsTitle="Rules"
      inputsNote="Thresholds and rows are saved in this browser."
      actions={
        <Button variant="secondary" size="sm" icon={Download} onClick={exportAll}>
          Export CSV
        </Button>
      }
      inputs={
        <>
          <PercentField
            id="kr-margin"
            label="Contribution margin"
            value={marginPct}
            onChange={(next) => set("marginPct", next)}
            hint="Margin before ad cost. Drives profit per click."
            max={100}
            step={1}
          />
          <PercentField
            id="kr-harvest"
            label="Harvest below"
            value={harvestAcos}
            onChange={(next) => set("harvestAcos", next)}
            hint="ACoS under this, and converting, means promote to exact."
            max={200}
            step={1}
          />
          <PercentField
            id="kr-optimise"
            label="Optimise below"
            value={optimiseAcos}
            onChange={(next) => set("optimiseAcos", next)}
            hint="Between the two thresholds: cut the bid, keep the term."
            max={400}
            step={5}
          />
          <PercentField
            id="kr-min-cvr"
            label="Minimum conversion rate"
            value={minCvr}
            onChange={(next) => set("minCvr", next)}
            hint="Below this a cheap ACoS is luck, not a pattern."
            max={100}
            step={0.5}
          />
          <NumberField
            id="kr-negate-clicks"
            label="Negate after"
            value={negateClicks}
            onChange={(next) => set("negateClicks", next)}
            hint="Clicks with zero orders before a term is negated."
            min={1}
            max={200}
            step={1}
            decimals={0}
            unit="clicks"
          />
          <NumberField
            id="kr-min-clicks"
            label="Minimum clicks to judge"
            value={minClicks}
            onChange={(next) => set("minClicks", next)}
            hint="Fewer than this and the row is a watch, not a decision."
            min={1}
            max={100}
            step={1}
            decimals={0}
            unit="clicks"
          />
        </>
      }
    >
      <ResultGrid>
        <ResultTile
          label="Account ACoS"
          value={pct(totals.acos)}
          tone={totals.acos <= harvestAcos ? "good" : totals.acos <= optimiseAcos ? "warn" : "bad"}
          emphasis
          hint={`${money(totals.spend)} spend on ${money(totals.revenue)} revenue`}
        />
        <ResultTile
          label="Wasted spend"
          value={money(totals.wasted)}
          tone={totals.wastedShare >= 15 ? "bad" : totals.wastedShare >= 5 ? "warn" : "good"}
          emphasis
          icon={TriangleAlert}
          hint={`${pct(totals.wastedShare)} of spend on terms the rules would negate`}
        />
        <ResultTile
          label="Harvest candidates"
          value={num(harvestList.length)}
          tone="good"
          emphasis
          icon={Sprout}
          hint={`${money(harvestList.reduce((total, row) => total + row.revenue, 0))} of revenue to protect`}
        />
        <ResultTile
          label="Negate candidates"
          value={num(negateList.length)}
          tone="bad"
          emphasis
          icon={Scissors}
          hint={`${num(negateList.reduce((total, row) => total + row.clicks, 0))} clicks that went nowhere`}
        />
      </ResultGrid>

      <ChartCard
        title="Where the money goes, top ten terms by spend"
        description="Bars are spend and revenue side by side. The line is ACoS, capped at 300% so a zero-order term does not flatten the rest."
        summary={`The ten highest-spending search terms account for ${money(chartRows.reduce((total, row) => total + row.spend, 0))} of the ${money(totals.spend)} total. ${
          negateList.length > 0
            ? `${negateList[0].term} is the worst offender at ${money(negateList[0].spend)} spent for ${num(negateList[0].orders)} orders.`
            : "No term in the set breaks the negate rules."
        }`}
        height={310}
        table={{
          caption: "Spend, revenue, ACoS and verdict for the ten highest-spending terms.",
          head: ["Search term", "Spend", "Revenue", "ACoS", "Verdict"],
          rows: chartRows.map((row) => ({
            label: row.fullTerm,
            cells: [
              money(row.spend),
              money(row.revenue),
              row.acos >= 300 ? "300%+" : pct(row.acos),
              VERDICTS[row.verdict as Verdict].label,
            ],
          })),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart {...CHART_A11Y} data={chartRows} margin={{ top: 4, right: 4, bottom: 44, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="term"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              angle={-32}
              textAnchor="end"
              height={56}
              interval={0}
            />
            <YAxis
              yAxisId="money"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(value: number) => `$${Math.round(value)}`}
            />
            <YAxis
              yAxisId="acos"
              orientation="right"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={(value: number) => `${Math.round(value)}%`}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              formatter={(value: unknown, name: unknown) =>
                name === "ACoS"
                  ? [Number(value) >= 300 ? "300%+" : pct(Number(value)), "ACoS"]
                  : [money(Number(value)), String(name)]
              }
            />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <ReferenceLine
              yAxisId="acos"
              y={harvestAcos}
              stroke="var(--good)"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              yAxisId="acos"
              y={optimiseAcos}
              stroke="var(--bad)"
              strokeDasharray="4 4"
            />
            <Bar yAxisId="money" dataKey="spend" name="Spend" radius={[3, 3, 0, 0]}>
              {chartRows.map((row) => (
                <Cell key={row.fullTerm} fill={TONE_VAR[VERDICTS[row.verdict as Verdict].tone]} />
              ))}
            </Bar>
            <Bar
              yAxisId="money"
              dataKey="revenue"
              name="Revenue"
              fill="var(--hairline-strong)"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="acos"
              type="monotone"
              dataKey="acos"
              name="ACoS"
              stroke="var(--ember)"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <CalcPanel
        title="Every term, scored"
        description="Click any column heading to sort. The verdict comes from the four rules in the panel on the left."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {VERDICT_ORDER.map((verdict) => (
              <MetricChip
                key={verdict}
                label={VERDICTS[verdict].label}
                value={num(totals.counts[verdict])}
                tone={VERDICTS[verdict].tone}
              />
            ))}
          </div>
        }
      >
        <Table
          caption="Search terms with CTR, conversion rate, CPC, ACoS, ROAS, revenue per click, profit per click and a verdict."
          stickyFirstColumn
        >
          <THead>
            <TR>
              {COLUMNS.map((column) => (
                <SortHeader
                  key={column.key}
                  column={column}
                  sortKey={sortKey}
                  direction={direction}
                  onSort={onSort}
                />
              ))}
            </TR>
          </THead>
          <TBody>
            {sorted.map((row) => (
              <TR key={row.id}>
                <TD className="max-w-[16rem] min-w-[11rem]">
                  <span className="block leading-snug">{row.term || "(empty row)"}</span>
                </TD>
                <TD numeric mono className="text-muted">
                  {num(row.impressions)}
                </TD>
                <TD numeric mono>
                  {num(row.clicks)}
                </TD>
                <TD numeric mono className="text-muted">
                  {pct(row.ctr, 2)}
                </TD>
                <TD numeric mono>
                  {num(row.orders)}
                </TD>
                <TD numeric mono className={row.cvr >= minCvr ? "text-good" : "text-muted"}>
                  {pct(row.cvr)}
                </TD>
                <TD numeric mono>
                  {money(row.spend)}
                </TD>
                <TD numeric mono className="text-muted">
                  {money(row.cpc)}
                </TD>
                <TD numeric mono>
                  {money(row.revenue)}
                </TD>
                <TD
                  numeric
                  mono
                  className={cn(
                    "font-semibold",
                    !Number.isFinite(row.acos) || row.acos > optimiseAcos
                      ? "text-bad"
                      : row.acos <= harvestAcos
                        ? "text-good"
                        : "text-warn",
                  )}
                >
                  {acosCell(row.acos)}
                </TD>
                <TD numeric mono className="text-muted">
                  {Number.isFinite(row.roas) ? `${row.roas.toFixed(2)}x` : "—"}
                </TD>
                <TD numeric mono className="text-muted">
                  {money(row.revenuePerClick)}
                </TD>
                <TD numeric mono className={row.profitPerClick >= 0 ? "text-good" : "text-bad"}>
                  {money(row.profitPerClick)}
                </TD>
                <TD>
                  <Badge tone={VERDICTS[row.verdict].tone} size="sm">
                    {VERDICTS[row.verdict].label}
                  </Badge>
                </TD>
              </TR>
            ))}
            <TR className="bg-surface-2/70">
              <TD className="font-semibold">Total · {num(rows.length)} terms</TD>
              <TD numeric mono className="font-semibold">
                {num(totals.impressions)}
              </TD>
              <TD numeric mono className="font-semibold">
                {num(totals.clicks)}
              </TD>
              <TD numeric mono>
                {pct(totals.ctr, 2)}
              </TD>
              <TD numeric mono className="font-semibold">
                {num(totals.orders)}
              </TD>
              <TD numeric mono>
                {pct(totals.cvr)}
              </TD>
              <TD numeric mono className="font-semibold">
                {money(totals.spend)}
              </TD>
              <TD numeric mono>
                {money(totals.cpc)}
              </TD>
              <TD numeric mono className="font-semibold">
                {money(totals.revenue)}
              </TD>
              <TD numeric mono className="font-semibold">
                {pct(totals.acos)}
              </TD>
              <TD numeric mono>
                {`${totals.roas.toFixed(2)}x`}
              </TD>
              <TD numeric mono>
                {money(div(totals.revenue, totals.clicks))}
              </TD>
              <TD numeric mono className={totals.profit >= 0 ? "text-good" : "text-bad"}>
                {money(div(totals.profit, totals.clicks))}
              </TD>
              <TD />
            </TR>
          </TBody>
        </Table>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {VERDICT_ORDER.map((verdict) => (
            <li key={verdict} className="flex items-start gap-2">
              <Badge tone={VERDICTS[verdict].tone} size="sm" className="mt-px shrink-0">
                {VERDICTS[verdict].label}
              </Badge>
              <span className="text-xs leading-relaxed text-muted">
                {VERDICTS[verdict].short}
              </span>
            </li>
          ))}
        </ul>
      </CalcPanel>

      <div className="grid gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <CalcPanel
          title={`Harvest list — ${harvestList.length} term${harvestList.length === 1 ? "" : "s"}`}
          description="Proven converters below the harvest threshold. Build each one its own exact-match ad group, then negate it in the campaign that found it so the two do not bid against each other."
          actions={
            <div className="flex items-center gap-2">
              <CopyButton value={harvestText} label="Copy" />
              <Button variant="secondary" size="sm" icon={Download} onClick={exportHarvest}>
                CSV
              </Button>
            </div>
          }
        >
          {harvestList.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">
              Nothing clears the {pct(harvestAcos)} ACoS and {pct(minCvr)} conversion bar yet. Either
              the terms need more data or the thresholds are tighter than this account can hit —
              check the account ACoS of {pct(totals.acos)} before loosening them.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {harvestList.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-good/30 bg-good-soft px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[0.8125rem] font-medium text-ink">
                      {row.term}
                    </span>
                    <MetricChip label="Bid" value={money(row.suggestedBid)} tone="good" />
                  </div>
                  <p className="mt-1.5 tabular text-xs text-muted">
                    {num(row.orders)} orders · {pct(row.cvr)} CVR · {pct(row.acos)} ACoS ·{" "}
                    {money(row.revenue)} revenue · {money(row.profitPerClick)} profit per click
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CalcPanel>

        <CalcPanel
          title={`Negate list — ${negateList.length} term${negateList.length === 1 ? "" : "s"}`}
          description="Terms failing the click or ACoS rules. Add them as negative exact in the ad group that served them, not account-wide, unless the term is irrelevant to every product."
          actions={
            <div className="flex items-center gap-2">
              <CopyButton value={negateText} label="Copy" />
              <Button variant="secondary" size="sm" icon={Download} onClick={exportNegate}>
                CSV
              </Button>
            </div>
          }
        >
          {negateList.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">
              No term breaks the rules — nothing has {num(negateClicks)} clicks without an order, and
              nothing sits above {pct(optimiseAcos)} ACoS. Re-check weekly; this list is rarely empty
              for long.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {negateList.map((row) => (
                <li key={row.id} className="rounded-lg border border-bad/30 bg-bad-soft px-3.5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[0.8125rem] font-medium text-ink">
                      {row.term}
                    </span>
                    <MetricChip label="Wasted" value={money(row.spend)} tone="bad" />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{row.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </CalcPanel>
      </div>

      <CalcPanel
        title="The data"
        description="Paste a search term report straight out of Campaign Manager or Helium 10, or edit the rows by hand. Columns are matched by header where one is present, otherwise by position: term, impressions, clicks, orders, spend, revenue."
        actions={
          <Button variant="secondary" size="sm" icon={Plus} onClick={addRow}>
            Add row
          </Button>
        }
      >
        <div className="grid gap-4">
          <div>
            <Textarea
              id="kr-paste"
              label="Paste rows"
              rows={4}
              value={paste}
              onChange={(event) => {
                setPaste(event.target.value);
                setPasteNote(null);
              }}
              placeholder={"bamboo cutting board set\t18420\t412\t51\t349.20\t1529.49"}
              hint="Tab or comma separated. Dollar signs, percent signs and thousands separators are stripped."
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => importPaste("replace")} disabled={paste.trim() === ""}>
                Replace table
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => importPaste("append")}
                disabled={paste.trim() === ""}
              >
                Add to table
              </Button>
              {pasteNote ? (
                <span className="text-xs text-muted" role="status">
                  {pasteNote}
                </span>
              ) : null}
            </div>
          </div>

          <div className="scroll-well overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Editable search term rows: term, impressions, clicks, orders, spend and revenue.
              </caption>
              <thead>
                <tr>
                  {["Search term", "Impressions", "Clicks", "Orders", "Spend", "Revenue", ""].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        // `relative` keeps the sr-only label's containing block inside
                        // the scroll well; absolutely positioned inside a 1,300px table
                        // it would otherwise stretch the page scroll area.
                        className="relative px-2 pb-2 text-[0.6875rem] font-semibold tracking-[0.06em] whitespace-nowrap text-muted uppercase"
                      >
                        {heading || <span className="sr-only">Remove</span>}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-1">
                      <CellInput
                        text
                        label={`Search term for row ${row.term || "new"}`}
                        value={row.term}
                        onChange={(value) => updateRow(row.id, { term: value })}
                      />
                    </td>
                    {(
                      [
                        ["impressions", "Impressions", "w-24"],
                        ["clicks", "Clicks", "w-20"],
                        ["orders", "Orders", "w-20"],
                        ["spend", "Spend", "w-24"],
                        ["revenue", "Revenue", "w-24"],
                      ] as const
                    ).map(([field, label, width]) => (
                      <td key={field} className="px-2 py-1">
                        <CellInput
                          label={`${label} for ${row.term || "new row"}`}
                          value={row[field]}
                          width={width}
                          onChange={(value) =>
                            updateRow(row.id, { [field]: Number(value) || 0 } as Partial<KeywordRow>)
                          }
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        aria-label={`Remove ${row.term || "this row"}`}
                        className="flex size-9 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-bad focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-hairline-strong px-3.5 py-6 text-center text-sm text-muted">
              No rows. Paste a report above, add a row by hand, or reset to load the sample account.
            </p>
          ) : null}
        </div>
      </CalcPanel>

      <FormulaStack description="Per-row arithmetic, shown with the highest-spending term in the table.">
        {sorted.length > 0
          ? (() => {
              const row = [...computed].sort((a, b) => b.spend - a.spend)[0];
              return (
                <>
                  <FormulaLine
                    label={`CTR — ${row.term}`}
                    formula="Clicks / Impressions x 100"
                    substituted={`${num(row.clicks)} / ${num(row.impressions)} x 100`}
                    result={pct(row.ctr, 2)}
                    tone="info"
                  />
                  <FormulaLine
                    label={`CVR — ${row.term}`}
                    formula="Orders / Clicks x 100"
                    substituted={`${num(row.orders)} / ${num(row.clicks)} x 100`}
                    result={pct(row.cvr)}
                    tone={row.cvr >= minCvr ? "good" : "warn"}
                  />
                  <FormulaLine
                    label={`ACoS — ${row.term}`}
                    formula="Spend / Revenue x 100"
                    substituted={`${money(row.spend)} / ${money(row.revenue)} x 100`}
                    result={acosCell(row.acos)}
                    tone={VERDICTS[row.verdict].tone}
                  />
                  <FormulaLine
                    label={`Profit per click — ${row.term}`}
                    formula="(Revenue x Margin - Spend) / Clicks"
                    substituted={`(${money(row.revenue)} x ${(marginPct / 100).toFixed(2)} - ${money(row.spend)}) / ${num(row.clicks)}`}
                    result={money(row.profitPerClick)}
                    tone={row.profitPerClick >= 0 ? "good" : "bad"}
                    note={`At a ${pct(marginPct, 0)} contribution margin, each click on this term ${row.profitPerClick >= 0 ? "adds" : "costs"} ${money(Math.abs(row.profitPerClick))}.`}
                  />
                </>
              );
            })()
          : null}
      </FormulaStack>

      <Interpretation
        tone={totals.wastedShare >= 15 ? "bad" : totals.wastedShare >= 5 ? "warn" : "good"}
        title={`${money(totals.wasted)} of ${money(totals.spend)} is going to terms that do not convert`}
        next={[
          negateList.length > 0
            ? `Add the ${negateList.length} negate-list term${negateList.length === 1 ? "" : "s"} as negative exact in the ad group that served them. That is ${money(totals.wasted)} a period back.`
            : "Nothing to negate this week. Re-run it next week — the list refills.",
          harvestList.length > 0
            ? `Build exact-match ad groups for the ${harvestList.length} harvest term${harvestList.length === 1 ? "" : "s"}, starting bids at the suggested figures, and negate each one in its source campaign.`
            : "No harvest candidates yet. Let the converting terms accumulate more clicks before promoting them.",
          `Cut bids 15% on the ${totals.counts.optimise} optimise row${totals.counts.optimise === 1 ? "" : "s"} rather than negating them — they convert, they are just paying too much per click.`,
          `Leave the ${totals.counts.watch} watch row${totals.counts.watch === 1 ? "" : "s"} alone until ${num(minClicks)} clicks. Acting on thin data is how accounts get over-negated.`,
        ]}
      >
        <p>
          Across {num(rows.length)} search terms the account spent {money(totals.spend)} to earn{" "}
          {money(totals.revenue)}, a <strong>{pct(totals.acos)} ACoS</strong> and{" "}
          {totals.roas.toFixed(2)}x ROAS. {num(totals.clicks)} clicks produced {num(totals.orders)}{" "}
          orders, a {pct(totals.cvr)} conversion rate at {money(totals.cpc)} a click.
        </p>
        <p>
          The rules split those terms into {totals.counts.harvest} to harvest,{" "}
          {totals.counts.optimise} to optimise, {totals.counts.negate} to negate and{" "}
          {totals.counts.watch} to watch. Negating the failing terms alone recovers{" "}
          <strong>{money(totals.wasted)}</strong>, which is {pct(totals.wastedShare)} of spend — and
          would take the account ACoS from {pct(totals.acos)} to{" "}
          {pct(div(totals.spend - totals.wasted, totals.revenue) * 100)} with no other change.
        </p>
      </Interpretation>
    </CalcShell>
  );
}
