import {
  RESULT_TYPE_LABEL,
  caseStudies,
  type CaseStudyDoc,
  type CaseStudyResultType,
} from "@/content/case-studies";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { CaseStudyMetric, MetricDirection, Tone } from "@/types/content";

/**
 * Pure projections shared by the gallery, the detail route and the compare
 * view. Nothing here touches the DOM, so index pages can run it on the server
 * and ship only the small `GalleryItem` shape to the browser instead of
 * twelve full case studies with their markdown bodies.
 */

/* ------------------------------------------------------------------ *
 * Value formatting
 * ------------------------------------------------------------------ */

/**
 * Render a metric value with its unit. `$` is a prefix, `%` and `x` are tight
 * suffixes, everything else is a spaced suffix. Units authored with a leading
 * space (" hrs/week") keep exactly one.
 */
export function formatMetricValue(value: number | string, unit?: string): string {
  if (typeof value === "string") return value;
  if (unit === "$") {
    const decimals = Number.isInteger(value) ? 0 : 2;
    return formatCurrency(value, decimals);
  }
  const rendered = formatNumber(value, 2);
  if (!unit) return rendered;
  if (unit === "%" || unit === "x") return `${rendered}${unit}`;
  return `${rendered} ${unit.trim()}`;
}

/** Compact axis label: 1250 -> "$1.3k", 62000 -> "$62k". */
export function compactUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const thousands = value / 1000;
    const digits = abs < 10000 ? 1 : 0;
    return `$${thousands.toFixed(digits).replace(/\.0$/, "")}k`;
  }
  return `$${Math.round(value)}`;
}

/* ------------------------------------------------------------------ *
 * Metric deltas
 * ------------------------------------------------------------------ */

export interface MetricView {
  label: string;
  unit?: string;
  better: "higher" | "lower";
  before: number | string;
  after: number | string;
  beforeText: string;
  afterText: string;
  /** Both endpoints parsed as finite numbers. */
  numeric: boolean;
  /** True when the move went the way `better` wants. Null when not numeric. */
  improved: boolean | null;
  /** Raw movement, for the arrow glyph. */
  direction: MetricDirection;
  /** Semantic colour: good when improved, bad when worse, neutral when flat. */
  tone: Tone;
  /** "-24.0 pts", "+102%", "+214" or an empty string. */
  deltaText: string;
}

/** Percentage-point metrics read as points, everything else as a ratio. */
export function metricView(metric: CaseStudyMetric): MetricView {
  const before = typeof metric.before === "number" ? metric.before : Number.NaN;
  const after = typeof metric.after === "number" ? metric.after : Number.NaN;
  const numeric = Number.isFinite(before) && Number.isFinite(after);

  const base: Omit<MetricView, "improved" | "direction" | "tone" | "deltaText"> = {
    label: metric.label,
    unit: metric.unit,
    better: metric.better,
    before: metric.before,
    after: metric.after,
    beforeText: formatMetricValue(metric.before, metric.unit),
    afterText: formatMetricValue(metric.after, metric.unit),
    numeric,
  };

  if (!numeric) {
    return { ...base, improved: null, direction: "flat", tone: "neutral", deltaText: "" };
  }

  const direction: MetricDirection = after > before ? "up" : after < before ? "down" : "flat";
  const improved = metric.better === "lower" ? after < before : after > before;
  const tone: Tone = direction === "flat" ? "neutral" : improved ? "good" : "bad";

  let deltaText = "";
  if (direction === "flat") {
    deltaText = "no change";
  } else if (metric.unit === "%") {
    const points = after - before;
    deltaText = `${points > 0 ? "+" : "−"}${Math.abs(points).toFixed(1)} pts`;
  } else if (before === 0) {
    deltaText = `+${formatMetricValue(after, metric.unit)}`;
  } else {
    const change = ((after - before) / Math.abs(before)) * 100;
    const magnitude = Math.abs(change);
    const digits = magnitude < 10 ? 1 : 0;
    deltaText = `${change > 0 ? "+" : "−"}${magnitude.toFixed(digits)}%`;
  }

  return { ...base, improved, direction, tone, deltaText };
}

/**
 * The metric a card leads with. An ACoS-style metric wins, and among those
 * the one you want lower wins — the Subscribe & Save study reports an
 * *allowed* first-order ACoS that it deliberately raised, which is a terrible
 * headline for a card and a fine supporting number.
 */
export function headlineMetric(study: CaseStudyDoc): CaseStudyMetric {
  const acos = study.metrics.filter((metric) => metric.label.toLowerCase().includes("acos"));
  return acos.find((metric) => metric.better === "lower") ?? acos[0] ?? study.metrics[0];
}

/** Percentage points of ACoS improvement. Positive means it came down. */
export function acosDropPoints(study: CaseStudyDoc): number {
  const headline = metricView(headlineMetric(study));
  const drop =
    headline.numeric && headline.unit === "%" && headline.better === "lower"
      ? (headline.before as number) - (headline.after as number)
      : summarise(study).firstAcos - summarise(study).lastAcos;
  return Math.round(drop * 10) / 10;
}

/* ------------------------------------------------------------------ *
 * Timeline aggregates
 * ------------------------------------------------------------------ */

export interface TimelineSummary {
  points: number;
  firstPeriod: string;
  lastPeriod: string;
  firstAcos: number;
  lastAcos: number;
  acosChangePoints: number;
  firstSpend: number;
  lastSpend: number;
  firstRevenue: number;
  lastRevenue: number;
  revenueChangePct: number;
  spendChangePct: number;
  totalSpend: number;
  totalRevenue: number;
  blendedAcos: number;
  blendedRoas: number;
  peakAcos: number;
  troughAcos: number;
}

export function summarise(study: CaseStudyDoc): TimelineSummary {
  const rows = study.timeline;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const acosValues = rows.map((row) => row.acos);

  return {
    points: rows.length,
    firstPeriod: first.period,
    lastPeriod: last.period,
    firstAcos: first.acos,
    lastAcos: last.acos,
    acosChangePoints: Math.round((last.acos - first.acos) * 10) / 10,
    firstSpend: first.spend,
    lastSpend: last.spend,
    firstRevenue: first.revenue,
    lastRevenue: last.revenue,
    revenueChangePct: Math.round((last.revenue / first.revenue - 1) * 1000) / 10,
    spendChangePct: Math.round((last.spend / first.spend - 1) * 1000) / 10,
    totalSpend,
    totalRevenue,
    blendedAcos: Math.round((totalSpend / totalRevenue) * 1000) / 10,
    blendedRoas: Math.round((totalRevenue / totalSpend) * 100) / 100,
    peakAcos: Math.max(...acosValues),
    troughAcos: Math.min(...acosValues),
  };
}

/* ------------------------------------------------------------------ *
 * Presentation vocabulary
 * ------------------------------------------------------------------ */

export const RESULT_TYPE_TONE: Record<CaseStudyResultType, Tone> = {
  turnaround: "good",
  scale: "brand",
  launch: "info",
  efficiency: "warn",
  expansion: "ember",
  rescue: "bad",
};

/** ACoS band colouring, matching the metrics cheat sheet. */
export function acosTone(acos: number): Tone {
  if (acos <= 20) return "good";
  if (acos <= 30) return "brand";
  if (acos <= 45) return "warn";
  return "bad";
}

/** "Home decor brand: 42% to 18% ACoS…" -> "Home decor brand". */
export function shortTitle(title: string): string {
  const head = title.split(":")[0].trim();
  if (head.length > 0 && head.length <= 34) return head;
  return head.length > 34 ? `${head.slice(0, 31).trimEnd()}…` : title;
}

/* ------------------------------------------------------------------ *
 * Gallery projection
 * ------------------------------------------------------------------ */

export interface GalleryItem {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  category: string;
  resultType: CaseStudyResultType;
  resultLabel: string;
  marketplace: string;
  client: string;
  timeframe: string;
  adSpend: string;
  tags: string[];
  level: string;
  minutes: number;
  /** The ACoS (or first) metric, pre-computed for the card preview. */
  headline: MetricView;
  /** A second and third stat for the card's mini table. */
  support: MetricView[];
  summary_: TimelineSummary;
  /** ACoS per period, for the card sparkline. */
  acosSeries: number[];
  /** Percentage points of ACoS improvement, for sorting. Higher is better. */
  acosDropPoints: number;
  /** Lowercased text the gallery filter matches against. */
  haystack: string;
}

export function toGalleryItem(study: CaseStudyDoc): GalleryItem {
  const headline = metricView(headlineMetric(study));
  const support = study.metrics
    .filter((metric) => metric.label !== headline.label)
    .slice(0, 2)
    .map(metricView);
  const summary = summarise(study);

  return {
    id: study.id,
    title: study.title,
    shortTitle: shortTitle(study.title),
    summary: study.summary,
    category: study.category,
    resultType: study.resultType,
    resultLabel: RESULT_TYPE_LABEL[study.resultType],
    marketplace: study.marketplace,
    client: study.client,
    timeframe: study.timeframe,
    adSpend: study.adSpend,
    tags: study.tags,
    level: study.level,
    minutes: study.minutes,
    headline,
    support,
    summary_: summary,
    acosSeries: study.timeline.map((row) => row.acos),
    acosDropPoints: acosDropPoints(study),
    haystack: [
      study.title,
      study.summary,
      study.category,
      study.client,
      study.marketplace,
      study.timeframe,
      RESULT_TYPE_LABEL[study.resultType],
      study.tags.join(" "),
      study.metrics.map((metric) => metric.label).join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export function galleryItems(): GalleryItem[] {
  return caseStudies.map(toGalleryItem);
}

/* ------------------------------------------------------------------ *
 * Compare projection
 * ------------------------------------------------------------------ */

export interface CompareItem {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  resultLabel: string;
  resultType: CaseStudyResultType;
  timeframe: string;
  client: string;
  marketplace: string;
  summary: TimelineSummary;
  metrics: MetricView[];
  headline: MetricView;
}

export function toCompareItem(study: CaseStudyDoc): CompareItem {
  return {
    id: study.id,
    title: study.title,
    shortTitle: shortTitle(study.title),
    category: study.category,
    resultLabel: RESULT_TYPE_LABEL[study.resultType],
    resultType: study.resultType,
    timeframe: study.timeframe,
    client: study.client,
    marketplace: study.marketplace,
    summary: summarise(study),
    metrics: study.metrics.map(metricView),
    headline: metricView(headlineMetric(study)),
  };
}

export function compareItems(): CompareItem[] {
  return caseStudies.map(toCompareItem);
}

/* ------------------------------------------------------------------ *
 * Library-wide roll-up, for the index page hero
 * ------------------------------------------------------------------ */

export interface LibraryStats {
  studies: number;
  categories: number;
  totalSpend: number;
  totalRevenue: number;
  blendedAcos: number;
  /**
   * Median rather than mean. Two studies start above 300% ACoS — a launch and
   * a rescue — and a mean would report an 80-point "typical" improvement that
   * describes none of the twelve accounts.
   */
  medianAcosDropPoints: number;
  timelinePoints: number;
}

export function libraryStats(): LibraryStats {
  const summaries = caseStudies.map(summarise);
  const totalSpend = summaries.reduce((sum, entry) => sum + entry.totalSpend, 0);
  const totalRevenue = summaries.reduce((sum, entry) => sum + entry.totalRevenue, 0);

  const drops = caseStudies.map(acosDropPoints).sort((a, b) => a - b);
  const middle = Math.floor(drops.length / 2);
  const median =
    drops.length === 0
      ? 0
      : drops.length % 2 === 0
        ? (drops[middle - 1] + drops[middle]) / 2
        : drops[middle];

  return {
    studies: caseStudies.length,
    categories: new Set(caseStudies.map((study) => study.category)).size,
    totalSpend,
    totalRevenue,
    blendedAcos: Math.round((totalSpend / totalRevenue) * 1000) / 10,
    medianAcosDropPoints: Math.round(median * 10) / 10,
    timelinePoints: summaries.reduce((sum, entry) => sum + entry.points, 0),
  };
}
