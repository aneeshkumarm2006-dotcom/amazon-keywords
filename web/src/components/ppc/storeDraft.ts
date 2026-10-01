/**
 * Store editor draft: every numeric field held as the string the user typed,
 * converted to and from a `Store` with validation. Percentages are shown as
 * percent ("30") and stored as ratios (0.3). Pure — no React.
 */

import { DEFAULT_LADDER, defaultRules } from "../../lib/ppc/rules";
import type { BiddableMatch, GoalMode, HarvestDestination, LadderRung, RuleConfig, Store } from "../../lib/ppc/types";

export type FieldKind = "int" | "pct" | "multiple" | "money" | "number";

export type NumericRuleKey = Exclude<
  keyof RuleConfig,
  "ladder" | "matchMultipliers" | "alsoHarvestPhrase" | "pairNegativeOnHarvest" | "negatePhraseOnIrrelevant"
>;

export type BoolRuleKey = "alsoHarvestPhrase" | "pairNegativeOnHarvest" | "negatePhraseOnIrrelevant";

export interface RuleFieldDef {
  key: NumericRuleKey;
  label: string;
  kind: FieldKind;
  unit?: string;
  min: number;
  max: number;
  /** One line: what it does and where the default comes from. */
  hint: string;
}

export interface RuleGroupDef {
  id: string;
  title: string;
  description: string;
  fields: RuleFieldDef[];
  toggles?: { key: BoolRuleKey; label: string; hint: string }[];
}

export const RULE_GROUPS: RuleGroupDef[] = [
  {
    id: "window",
    title: "Window",
    description: "Which days every rule reads.",
    fields: [
      { key: "lookbackDays", label: "Lookback", kind: "int", unit: "days", min: 7, max: 365, hint: "Default 30 · console window; SOP-02 reviews the report weekly." },
      { key: "lagDays", label: "Skip newest", kind: "int", unit: "days", min: 0, max: 14, hint: "Default 2 · attribution lag: the last days are still collecting sales." },
      { key: "minClicksEvaluate", label: "Minimum clicks to judge", kind: "int", unit: "clicks", min: 1, max: 1000, hint: "Default 5 · SOP-02 filter for statistical relevance." },
    ],
  },
  {
    id: "harvest",
    title: "Harvest",
    description: "Promote converting search terms to exact keywords.",
    fields: [
      { key: "harvestMinOrders", label: "Minimum orders", kind: "int", unit: "orders", min: 1, max: 100, hint: "Default 2 · SOP-02: 2+ orders and ACoS below target." },
      { key: "harvestBidFactor", label: "Bid factor", kind: "pct", unit: "%", min: 1, max: 200, hint: "Default 80% · Bid-Calculator.xlsx recommends 80% of max CPC." },
      { key: "cvrPriorWeight", label: "CVR smoothing weight", kind: "number", unit: "clicks", min: 0, max: 1000, hint: "Default 15 · shrinks small-sample CVR toward the ad group's rate." },
    ],
    toggles: [
      { key: "pairNegativeOnHarvest", label: "Negate the term in its source ad group", hint: "SOP-02 · keeps the harvested term from competing with itself." },
      { key: "alsoHarvestPhrase", label: "Also add a phrase keyword", hint: "Template 2 · optional phrase companion for extra reach." },
    ],
  },
  {
    id: "negatives",
    title: "Negatives",
    description: "Stop paying for terms that do not sell.",
    fields: [
      { key: "negateClicks", label: "Negate after (0 orders)", kind: "int", unit: "clicks", min: 1, max: 1000, hint: "Default 15 · SOP-02: 15+ clicks and 0 orders → negative exact." },
      { key: "expensiveBidCutMultiple", label: "Expensive: cut bid at", kind: "multiple", unit: "× BE", min: 1, max: 20, hint: "Default 2× · SOP-02: ACoS above 2× break-even." },
      { key: "expensiveNegateMultiple", label: "Expensive: negate above", kind: "multiple", unit: "× BE", min: 1, max: 50, hint: "Default 3× · converting but far too expensive → negative exact." },
      { key: "expensiveNegateMinClicks", label: "…with at least", kind: "int", unit: "clicks", min: 1, max: 1000, hint: "Default 10 · enough clicks that the ACoS is not a fluke." },
    ],
    toggles: [
      { key: "negatePhraseOnIrrelevant", label: "Negative phrase for irrelevant words", hint: "SOP-02 · uses the irrelevant-word list below (whole words only)." },
    ],
  },
  {
    id: "bids",
    title: "Bids",
    description: "Guardrails around the SOP-03 ladder.",
    fields: [
      { key: "maxMove", label: "Largest single move", kind: "pct", unit: "%", min: 1, max: 100, hint: "Default 20% · SOP-03: never move a bid more than 20% per pass." },
      { key: "minOrdersToRaise", label: "Orders needed to raise", kind: "int", unit: "orders", min: 0, max: 100, hint: "Default 3 · raises need proof, cuts do not." },
      { key: "minDaysHistory", label: "Learning period", kind: "int", unit: "days", min: 0, max: 90, hint: "Default 14 · SOP-03: under 14 days of data, do not adjust." },
      { key: "bidFloor", label: "Bid floor", kind: "money", min: 0.02, max: 1000, hint: "Default 0.30 (scaled for JPY, INR, MXN and similar) · Bid-Calculator.xlsx floor, in store currency." },
      { key: "bidCeiling", label: "Bid ceiling", kind: "money", min: 0.02, max: 10000, hint: "Default 5.00 (scaled for JPY, INR, MXN and similar) · hard cap, in store currency." },
    ],
  },
  {
    id: "starved",
    title: "Starved winners",
    description: "Good converters that barely get impressions.",
    fields: [
      { key: "starvedMinCvr", label: "Minimum CVR", kind: "pct", unit: "%", min: 0, max: 100, hint: "Default 10% · SOP-02: high CVR, low impressions." },
      { key: "starvedMinOrders", label: "Minimum orders", kind: "int", unit: "orders", min: 0, max: 100, hint: "Default 2." },
      { key: "starvedRaise", label: "Raise by at least", kind: "pct", unit: "%", min: 0, max: 100, hint: "Default 20% · SOP-02 suggests +20–30%." },
    ],
  },
  {
    id: "relevance",
    title: "Relevance check",
    description: "Seen a lot, clicked rarely: a listing or relevance problem.",
    fields: [
      { key: "relevanceMinImpressions", label: "Minimum impressions", kind: "int", unit: "impr.", min: 0, max: 10_000_000, hint: "Default 1,000 · SOP-02." },
      { key: "relevanceMaxCtr", label: "CTR below", kind: "pct", unit: "%", min: 0, max: 100, hint: "Default 0.2% · SOP-02: CTR below 0.2%." },
    ],
  },
];

export const MATCH_KEYS: BiddableMatch[] = ["exact", "phrase", "broad", "auto"];

export interface LadderDraft {
  upTo: string;
  change: string;
  flagPause: boolean;
}

export interface StoreDraft {
  name: string;
  marketplace: string;
  currency: string;
  colorIndex: number;
  breakEven: string;
  target: string;
  goal: GoalMode;
  price: string;
  cogs: string;
  fbaFee: string;
  referralPct: string;
  otherCosts: string;
  rules: Record<NumericRuleKey, string>;
  toggles: Record<BoolRuleKey, boolean>;
  multipliers: Record<BiddableMatch, string>;
  ladder: LadderDraft[];
  brandTerms: string;
  competitorTerms: string;
  irrelevantWords: string;
  destMode: HarvestDestination["mode"];
  /** `${campaignId}|${adGroupId}` of the chosen existing ad group. */
  destAdGroup: string;
  /** The saved existing destination, kept even when no bulk file lists it any more. */
  destSaved?: Extract<HarvestDestination, { mode: "existing" }>;
  destProductLabel: string;
  destBudget: string;
}

export interface AdGroupOption {
  value: string;
  campaignId: string;
  adGroupId: string;
  campaignName: string;
  adGroupName: string;
}

/* ------------------------------------------------------------- formatting */

function trimNum(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "";
  return String(Number(n.toFixed(decimals)));
}

export function fmtField(value: number | undefined, kind: FieldKind): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "";
  if (kind === "pct") return trimNum(value * 100, 4);
  if (kind === "money") return trimNum(value, 2);
  if (kind === "int") return String(Math.round(value));
  return trimNum(value, 4);
}

/** Accepts "1,234.5", " 30 ", "30%". Blank → NaN. */
export function parseLoose(raw: string): number {
  const s = raw.trim().replace(/%$/, "").replace(/,/g, "").trim();
  if (!s) return Number.NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

function lines(list: string[]): string {
  return list.join("\n");
}

/** One entry per line, trimmed, blank lines dropped, case-insensitive de-dupe (first spelling kept). */
export function parseLines(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const v = raw.replace(/\s+/g, " ").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/* ------------------------------------------------------------ conversion */

export function rulesToDraft(rules: RuleConfig): Pick<StoreDraft, "rules" | "toggles" | "multipliers" | "ladder"> {
  const r = {} as Record<NumericRuleKey, string>;
  for (const g of RULE_GROUPS) for (const f of g.fields) r[f.key] = fmtField(rules[f.key] as number, f.kind);
  const ladder = (rules.ladder?.length ? rules.ladder : DEFAULT_LADDER).map((rung) => ({
    upTo: Number.isFinite(rung.upTo) ? trimNum(rung.upTo, 4) : "",
    change: trimNum(rung.change * 100, 2),
    flagPause: Boolean(rung.flagPause),
  }));
  return {
    rules: r,
    toggles: {
      alsoHarvestPhrase: rules.alsoHarvestPhrase,
      pairNegativeOnHarvest: rules.pairNegativeOnHarvest,
      negatePhraseOnIrrelevant: rules.negatePhraseOnIrrelevant,
    },
    multipliers: {
      exact: fmtField(rules.matchMultipliers?.exact, "pct"),
      phrase: fmtField(rules.matchMultipliers?.phrase, "pct"),
      broad: fmtField(rules.matchMultipliers?.broad, "pct"),
      auto: fmtField(rules.matchMultipliers?.auto, "pct"),
    },
    ladder,
  };
}

/** Toolkit default rules as a draft; bid floor / ceiling scaled to `currency` when given. */
export function defaultRulesDraft(currency?: string): Pick<StoreDraft, "rules" | "toggles" | "multipliers" | "ladder"> {
  return rulesToDraft(defaultRules(currency));
}

export function adGroupValue(campaignId: string, adGroupId: string): string {
  return `${campaignId}|${adGroupId}`;
}

export function storeToDraft(store: Store): StoreDraft {
  const e = store.economics;
  const d = store.harvestDestination ?? { mode: "source" };
  return {
    name: store.name,
    marketplace: store.marketplace,
    currency: store.currency,
    colorIndex: store.colorIndex,
    breakEven: fmtField(e.breakEvenAcos, "pct"),
    target: fmtField(e.targetAcos, "pct"),
    goal: e.goal,
    price: fmtField(e.price, "money"),
    cogs: fmtField(e.cogs, "money"),
    fbaFee: fmtField(e.fbaFee, "money"),
    referralPct: fmtField(e.referralPct, "pct"),
    otherCosts: fmtField(e.otherCosts, "money"),
    ...rulesToDraft(store.rules),
    brandTerms: lines(store.brandTerms ?? []),
    competitorTerms: lines(store.competitorTerms ?? []),
    irrelevantWords: lines(store.irrelevantWords ?? []),
    destMode: d.mode,
    destAdGroup: d.mode === "existing" ? adGroupValue(d.campaignId, d.adGroupId) : "",
    destSaved: d.mode === "existing" ? d : undefined,
    destProductLabel: d.mode === "new-campaign" ? d.productLabel : "",
    destBudget: d.mode === "new-campaign" ? fmtField(d.dailyBudget, "money") : "",
  };
}

export type DraftErrors = Record<string, string>;

export interface DraftResult {
  store?: Store;
  errors: DraftErrors;
}

function checkNumber(
  errors: DraftErrors,
  path: string,
  raw: string,
  kind: FieldKind,
  min: number,
  max: number,
  label: string,
  opts: { optional?: boolean } = {},
): number | undefined {
  const n = parseLoose(raw);
  if (Number.isNaN(n)) {
    if (opts.optional && !raw.trim()) return undefined;
    errors[path] = raw.trim() ? `${label}: “${raw}” is not a number.` : `${label} is required.`;
    return undefined;
  }
  if (kind === "int" && !Number.isInteger(n)) {
    errors[path] = `${label} must be a whole number.`;
    return undefined;
  }
  if (n < min || n > max) {
    const unit = kind === "pct" ? "%" : "";
    errors[path] = `${label} must be between ${min}${unit} and ${max.toLocaleString("en-US")}${unit}.`;
    return undefined;
  }
  return kind === "pct" ? n / 100 : n;
}

/** Validate a draft and build the Store it describes (on top of `base` for untouched fields). */
export function draftToStore(draft: StoreDraft, base: Store, adGroups: AdGroupOption[]): DraftResult {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the store a name.";
  else if (name.length > 60) errors.name = "Keep the name under 60 characters.";
  const currency = draft.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.currency = "Use a 3-letter currency code, e.g. USD.";

  const breakEvenAcos = checkNumber(errors, "breakEven", draft.breakEven, "pct", 1, 100, "Break-even ACoS");
  const targetAcos = checkNumber(errors, "target", draft.target, "pct", 1, 100, "Target ACoS");
  const price = checkNumber(errors, "price", draft.price, "money", 0, 1_000_000, "Price", { optional: true });
  const cogs = checkNumber(errors, "cogs", draft.cogs, "money", 0, 1_000_000, "COGS", { optional: true });
  const fbaFee = checkNumber(errors, "fbaFee", draft.fbaFee, "money", 0, 1_000_000, "FBA fee", { optional: true });
  const referralPct = checkNumber(errors, "referralPct", draft.referralPct, "pct", 0, 100, "Referral fee", { optional: true });
  const otherCosts = checkNumber(errors, "otherCosts", draft.otherCosts, "money", 0, 1_000_000, "Other costs", { optional: true });

  const rules = { ...base.rules } as RuleConfig;
  const numeric = rules as unknown as Record<NumericRuleKey, number>;
  for (const g of RULE_GROUPS) {
    for (const f of g.fields) {
      const v = checkNumber(errors, `rules.${f.key}`, draft.rules[f.key] ?? "", f.kind, f.min, f.max, f.label);
      if (v !== undefined) numeric[f.key] = v;
    }
  }
  if (!errors["rules.bidCeiling"] && !errors["rules.bidFloor"] && rules.bidCeiling <= rules.bidFloor) {
    errors["rules.bidCeiling"] = "Bid ceiling must be above the bid floor.";
  }
  if (
    !errors["rules.expensiveNegateMultiple"] &&
    !errors["rules.expensiveBidCutMultiple"] &&
    rules.expensiveNegateMultiple < rules.expensiveBidCutMultiple
  ) {
    errors["rules.expensiveNegateMultiple"] = "The negate threshold must be at or above the bid-cut threshold.";
  }
  rules.alsoHarvestPhrase = draft.toggles.alsoHarvestPhrase;
  rules.pairNegativeOnHarvest = draft.toggles.pairNegativeOnHarvest;
  rules.negatePhraseOnIrrelevant = draft.toggles.negatePhraseOnIrrelevant;

  const multipliers = { ...base.rules.matchMultipliers };
  for (const m of MATCH_KEYS) {
    const v = checkNumber(errors, `multipliers.${m}`, draft.multipliers[m], "pct", 1, 200, `${m[0].toUpperCase()}${m.slice(1)} multiplier`);
    if (v !== undefined) multipliers[m] = v;
  }
  rules.matchMultipliers = multipliers;

  // Ladder: ascending bounds, last rung open-ended.
  const ladder: LadderRung[] = [];
  if (!draft.ladder.length) errors.ladder = "The ladder needs at least one rung.";
  let prev = 0;
  draft.ladder.forEach((rung, i) => {
    const last = i === draft.ladder.length - 1;
    let upTo = Infinity;
    if (!last) {
      const u = checkNumber(errors, `ladder.${i}.upTo`, rung.upTo, "number", 0.01, 100, `Rung ${i + 1} bound`);
      if (u !== undefined) {
        if (u <= prev) errors[`ladder.${i}.upTo`] = `Rung ${i + 1} must end above ${trimNum(prev, 2)}× target.`;
        upTo = u;
        prev = u;
      }
    }
    const c = checkNumber(errors, `ladder.${i}.change`, rung.change, "number", -100, 100, `Rung ${i + 1} change`);
    ladder.push({ upTo, change: c !== undefined ? c / 100 : 0, ...(rung.flagPause ? { flagPause: true } : {}) });
  });
  rules.ladder = ladder;

  let harvestDestination: HarvestDestination = { mode: "source" };
  if (draft.destMode === "existing") {
    const opt = adGroups.find((g) => g.value === draft.destAdGroup);
    if (opt) {
      harvestDestination = {
        mode: "existing",
        campaignId: opt.campaignId,
        adGroupId: opt.adGroupId,
        campaignName: opt.campaignName,
        adGroupName: opt.adGroupName,
      };
    } else if (draft.destSaved && draft.destAdGroup === adGroupValue(draft.destSaved.campaignId, draft.destSaved.adGroupId)) {
      harvestDestination = draft.destSaved;
    } else {
      errors.destAdGroup = "Choose the ad group harvested keywords go to.";
    }
  } else if (draft.destMode === "new-campaign") {
    const label = draft.destProductLabel.trim();
    if (!label) errors.destProductLabel = "Name the product, e.g. Garlic Press — it becomes part of the campaign name.";
    const budget = checkNumber(errors, "destBudget", draft.destBudget, "money", 1, 1_000_000, "Daily budget");
    if (label && budget !== undefined) harvestDestination = { mode: "new-campaign", productLabel: label, dailyBudget: budget };
  }

  if (Object.keys(errors).length) return { errors };

  const store: Store = {
    ...base,
    name,
    marketplace: draft.marketplace,
    currency,
    colorIndex: draft.colorIndex,
    economics: {
      breakEvenAcos: breakEvenAcos as number,
      targetAcos: targetAcos as number,
      goal: draft.goal,
      ...(price !== undefined ? { price } : {}),
      ...(cogs !== undefined ? { cogs } : {}),
      ...(fbaFee !== undefined ? { fbaFee } : {}),
      ...(referralPct !== undefined ? { referralPct } : {}),
      ...(otherCosts !== undefined ? { otherCosts } : {}),
    },
    rules,
    brandTerms: parseLines(draft.brandTerms),
    competitorTerms: parseLines(draft.competitorTerms),
    irrelevantWords: parseLines(draft.irrelevantWords),
    harvestDestination,
  };
  return { store, errors };
}

/** Ad groups from a bulk file, for the harvest destination picker. Enabled first, then by name. */
export function adGroupOptions(bulk: { entity: string; campaignId: string; adGroupId?: string; campaignName: string; adGroupName?: string; state?: string }[]): (AdGroupOption & { state?: string })[] {
  const seen = new Set<string>();
  const out: (AdGroupOption & { state?: string })[] = [];
  for (const e of bulk) {
    if (e.entity !== "Ad Group" || !e.adGroupId) continue;
    const value = adGroupValue(e.campaignId, e.adGroupId);
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({
      value,
      campaignId: e.campaignId,
      adGroupId: e.adGroupId,
      campaignName: e.campaignName,
      adGroupName: e.adGroupName ?? "",
      state: e.state,
    });
  }
  const rank = (s?: string) => (s === "enabled" || !s ? 0 : s === "paused" ? 1 : 2);
  return out.sort(
    (a, b) => rank(a.state) - rank(b.state) || a.campaignName.localeCompare(b.campaignName) || a.adGroupName.localeCompare(b.adGroupName),
  );
}
