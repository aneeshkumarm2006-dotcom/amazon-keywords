/**
 * Recommendation engine (SOP-02 / SOP-03 / Workflow 2 / Template 2).
 *
 * `recommend({ store, rows, bulk })` evaluates one store:
 *
 * Window — `lookbackDays` ending `lagDays` before the latest data date (or `asOf`).
 * Rows first go through `resolveOverlaps` (metrics.ts), so overlapping Summary /
 * Daily imports of a term count once. Every rec carries the window end (`windowTo`).
 *
 * SEARCH-TERM level (campaign + ad group + search term):
 * - harvest-exact: ≥ harvestMinOrders orders, ACoS < target, ≥ minClicksEvaluate
 *   clicks. ASIN-shaped terms → harvest-product. One harvest per term per store
 *   (the source with most orders; other qualifying sources become evidence).
 *   Skipped when the term is already a live exact keyword / product target
 *   anywhere in the store (bulk entities, or exact-match report rows whose
 *   keyword is not archived in the bulk file — rows the bulk file does not
 *   know count only inside the window).
 *   Optional harvest-phrase companion. Paired negate-exact (or negate-product)
 *   in the source ad group, linked both ways through `pairedWith`.
 * - negate-exact: 0 orders and ≥ negateClicks clicks (ASIN → negate-product).
 * - negate-phrase: an irrelevant word / phrase (token match, so "free" never
 *   matches "freezer"; substring match for CJK / Thai words, which have no
 *   spaces) in any term with ≥ 1 click and spend > 0 — one rec per ad group +
 *   word; the evidence lists the terms. Each term counts toward the first
 *   matching word in list order only ("free … recipe" → "free"), but the
 *   brand / converting safety checks cover every term in the ad group that
 *   contains the word (the negative would block all of them).
 * - Amazon text limits: keywords / negative exacts over 10 words, negative
 *   phrases over 4 words, or any over 80 characters are skipped (Amazon
 *   rejects them).
 * - expensive converting terms: ACoS ÷ break-even ≥ expensiveBidCutMultiple is
 *   evidence on the matching target's bid rec; > expensiveNegateMultiple with ≥
 *   expensiveNegateMinClicks clicks → negate-exact (medium).
 * - A term that is its own exact keyword is never negated (it is the keyword:
 *   target-level bid / pause handles it).
 * - Safety: never negate a term with orders elsewhere in the store (window);
 *   never negate brand / competitor terms; skip terms already negated.
 *
 * TARGET level (campaign + ad group + targeting + match type):
 * - Current bid from the bulk file (keyword / product-target bid, else ad group
 *   default bid); keywords fall back to average CPC. Product / auto targets
 *   only get bid or pause recs when the bulk file has them.
 * - Learning hold: the target needs ≥ minDaysHistory days of data, counted
 *   inclusively from its first appearance in all stored rows to the window end
 *   (applies to bid / pause, not to relevance).
 * - 0 orders: ≥ negateClicks clicks → pause (high); ≥ minClicksEvaluate → skipped
 *   "not enough data".
 * - Orders > 0: ladder on ACoS ÷ target; raises need ≥ minOrdersToRaise orders;
 *   starved winners (CVR ≥ starvedMinCvr, ≥ starvedMinOrders orders, ACoS <
 *   target, impressions < store median) get at least +starvedRaise; the top rung
 *   (flagPause) becomes a pause with the bid-down as evidence.
 * - Guardrails: ±maxMove, never above max CPC (target ACoS × AOV × smoothed CVR,
 *   prior = ad group → campaign → store CVR), floor / ceiling within those two,
 *   2 dp (whole yen for JPY). New stores get floor / ceiling in their currency
 *   (BID_LIMITS_BY_CURRENCY).
 * - relevance (low): ≥ relevanceMinImpressions impressions and CTR < relevanceMaxCtr.
 * - Brand keywords are never paused or cut (SOP-03: protect brand); raises are allowed.
 *
 * Conflicts: one rec per (level, subject, campaign, ad group; + match type for
 * target recs). Most destructive wins: negate-phrase > negate-exact /
 * negate-product > pause > bid-down > relevance > bid-up > harvest. A harvest
 * and its paired negative / phrase companion are one unit. Folded recs are
 * recorded in the winner's `evidence`. A negate-exact whose term is covered by
 * a negate-phrase in the same ad group folds into the phrase rec.
 *
 * Priority: high = 0-order negate-exact / negate-product (≥ negateClicks),
 * harvest with ≥ 3 orders (and its paired negative), pause; low = relevance;
 * everything else medium.
 *
 * Impact (store currency per 30 days; window values × 30 ÷ the days of data in
 * the window — from the later of window start and the first data date):
 * negatives and pauses = spend; harvests = sales; bid-down = spend × |change|;
 * bid-up = sales × change; paired negatives and relevance = 0 (traffic moves,
 * nothing is saved).
 *
 * Output is sorted by priority, then impact (desc), then id.
 *
 * Ids are `storeId|action|campaign|adGroup|subject` (lower-cased); target-level
 * recs append `|matchType`, because one ad group may hold the same keyword text
 * in two match types.
 */

import { applyGuardrails, bidDecimals, harvestBid, ladderChange, maxCpc, roundBid, smoothedCvr } from "./bidding";
import {
  archivedByName,
  archivedInBulk,
  buildBulkIndex,
  effectiveBid,
  findKeyword,
  findTarget,
  idsFor,
  inactiveState,
  type BulkIndex,
} from "./bulk-index";
import { daysBetween } from "./dates";
import { adGroupKey, asinFromExpression, isAsin, norm, normTargeting, recommendationId, targetKey, termKey } from "./keys";
import {
  acos as acosOf,
  addInto,
  aov as aovOf,
  countersOf,
  ctr as ctrOf,
  cvr as cvrOf,
  dateWindow,
  earliestDate,
  emptyCounters,
  filterByWindow,
  inWindow,
  latestDate,
  median,
  resolveOverlaps,
  round2,
  roundCounters,
  windowLength,
  type DateWindow,
} from "./metrics";
import type {
  ActionType,
  BulkEntity,
  Counters,
  Economics,
  LadderRung,
  MatchType,
  Priority,
  Recommendation,
  RuleConfig,
  SearchTermRow,
  SkippedTerm,
  Store,
} from "./types";

/* ---------------------------------------------------------------- defaults */

export const DEFAULT_LADDER: LadderRung[] = [
  { upTo: 0.5, change: 0.15 },
  { upTo: 0.8, change: 0.08 },
  { upTo: 1.2, change: 0 },
  { upTo: 1.5, change: -0.12 },
  { upTo: 2, change: -0.2 },
  { upTo: Infinity, change: -0.2, flagPause: true },
];

export const DEFAULT_RULES: RuleConfig = {
  lookbackDays: 30,
  lagDays: 2,
  minClicksEvaluate: 5,
  harvestMinOrders: 2,
  alsoHarvestPhrase: false,
  pairNegativeOnHarvest: true,
  negateClicks: 15,
  negatePhraseOnIrrelevant: true,
  expensiveBidCutMultiple: 2,
  expensiveNegateMultiple: 3,
  expensiveNegateMinClicks: 10,
  ladder: DEFAULT_LADDER,
  maxMove: 0.2,
  minOrdersToRaise: 3,
  minDaysHistory: 14,
  bidFloor: 0.3,
  bidCeiling: 5,
  starvedMinCvr: 0.1,
  starvedMinOrders: 2,
  starvedRaise: 0.2,
  relevanceMinImpressions: 1000,
  relevanceMaxCtr: 0.002,
  cvrPriorWeight: 15,
  harvestBidFactor: 0.8,
  matchMultipliers: { exact: 1, phrase: 0.85, broad: 0.7, auto: 0.6 },
};

export const DEFAULT_ECONOMICS: Economics = {
  breakEvenAcos: 0.32,
  targetAcos: 0.3,
  goal: "profit",
};

export const DEFAULT_IRRELEVANT_WORDS: string[] = [
  "free",
  "cheap",
  "used",
  "refurbished",
  "wholesale",
  "recipe",
  "how to",
  "diy",
  "template",
  "job",
  "jobs",
  "pdf",
  "repair",
  "manual",
  "second hand",
];

/**
 * Default bid floor / ceiling per store currency. The SOP's 0.30 / 5.00 are
 * USD-scale; applied as-is to a yen, rupee or peso store they cut a ¥40 bid to
 * ¥5. Currencies not listed are close enough to USD to keep 0.30 / 5.00.
 */
export const BID_LIMITS_BY_CURRENCY: Record<string, { bidFloor: number; bidCeiling: number }> = {
  JPY: { bidFloor: 10, bidCeiling: 750 },
  INR: { bidFloor: 1, bidCeiling: 300 },
  MXN: { bidFloor: 1, bidCeiling: 100 },
  BRL: { bidFloor: 0.5, bidCeiling: 25 },
  AED: { bidFloor: 0.5, bidCeiling: 20 },
  SAR: { bidFloor: 0.5, bidCeiling: 20 },
  SEK: { bidFloor: 2, bidCeiling: 50 },
  PLN: { bidFloor: 1, bidCeiling: 20 },
  TRY: { bidFloor: 2, bidCeiling: 150 },
  EGP: { bidFloor: 5, bidCeiling: 250 },
};

/** Fresh deep copy of the default rules (safe to mutate); floor / ceiling scaled to `currency` when given. */
export function defaultRules(currency?: string): RuleConfig {
  const limits = currency ? BID_LIMITS_BY_CURRENCY[currency.trim().toUpperCase()] : undefined;
  return {
    ...DEFAULT_RULES,
    ...limits,
    ladder: DEFAULT_LADDER.map((r) => ({ ...r })),
    matchMultipliers: { ...DEFAULT_RULES.matchMultipliers },
  };
}

/** Build a Store with defaults for everything not given (bid floor / ceiling in the store's currency). */
export function createStore(
  input: Pick<Store, "id" | "name" | "currency" | "marketplace"> & Partial<Omit<Store, "economics" | "rules">> & {
    economics?: Partial<Economics>;
    rules?: Partial<RuleConfig>;
  },
): Store {
  const { economics, rules, ...rest } = input;
  return {
    colorIndex: 0,
    createdAt: new Date().toISOString(),
    brandTerms: [],
    competitorTerms: [],
    irrelevantWords: [...DEFAULT_IRRELEVANT_WORDS],
    harvestDestination: { mode: "source" },
    ...rest,
    economics: { ...DEFAULT_ECONOMICS, ...economics },
    rules: { ...defaultRules(input.currency), ...rules },
  };
}

/* ------------------------------------------------------------ text helpers */

/** Lower-case word tokens: letters (any script, with their combining marks) and digits. */
export function tokenize(text: string): string[] {
  return norm(text)
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter(Boolean);
}

/** Scripts written without spaces between words (a whole Japanese query can be one token). */
const UNSPACED_SCRIPT_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/**
 * Word-sequence match; for a phrase in a script written without spaces (CJK,
 * Thai) also a substring match on the space-less text, since "無料" never
 * becomes its own token in "無料にんにく絞り".
 */
export function containsPhrase(tokens: string[], phrase: string[]): boolean {
  if (containsTokens(tokens, phrase)) return true;
  const p = phrase.join("");
  return p.length > 0 && UNSPACED_SCRIPT_RE.test(p) && tokens.join("").includes(p);
}

/** True when `phrase` tokens occur consecutively in `tokens`. */
export function containsTokens(tokens: string[], phrase: string[]): boolean {
  if (!phrase.length || phrase.length > tokens.length) return false;
  outer: for (let i = 0; i + phrase.length <= tokens.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (tokens[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Brand / competitor match: word-sequence match always; substring match (spaces
 * ignored) for terms of 4+ characters so "kitchenco" matches brand "kitchen co",
 * and for terms of any length in scripts written without spaces (象印, キッチンコ).
 */
export function protectedMatch(
  term: string,
  store: Pick<Store, "brandTerms" | "competitorTerms">,
): { kind: "brand" | "competitor"; term: string } | null {
  const tokens = tokenize(term);
  const squashed = tokens.join("");
  const test = (list: string[], kind: "brand" | "competitor") => {
    for (const raw of list) {
      const bt = tokenize(raw);
      if (!bt.length) continue;
      if (containsTokens(tokens, bt)) return { kind, term: raw };
      const bs = bt.join("");
      if ((bs.length >= 4 || UNSPACED_SCRIPT_RE.test(bs)) && squashed.includes(bs)) return { kind, term: raw };
    }
    return null;
  };
  return test(store.brandTerms ?? [], "brand") ?? test(store.competitorTerms ?? [], "competitor");
}

/** Amazon Sponsored Products text limits: words per keyword type, characters for all. */
export const KEYWORD_LIMITS = { keyword: 10, negativeExact: 10, negativePhrase: 4, chars: 80 } as const;

/**
 * Why `text` cannot be uploaded as that keyword type (Amazon rejects keywords
 * and negative exacts over 10 words, negative phrases over 4 words, and any
 * of them over 80 characters), or null when it fits.
 */
export function keywordLengthProblem(text: string, kind: "keyword" | "negativeExact" | "negativePhrase"): string | null {
  const t = text.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const chars = [...t].length;
  const maxWords = KEYWORD_LIMITS[kind];
  const label = kind === "keyword" ? "keyword" : kind === "negativeExact" ? "negative exact" : "negative phrase";
  if (words > maxWords) return `too long for an Amazon ${label}: ${words} words (max ${maxWords})`;
  if (chars > KEYWORD_LIMITS.chars) return `too long for an Amazon ${label}: ${chars} characters (max ${KEYWORD_LIMITS.chars})`;
  return null;
}

const SYMBOLS: Record<string, string> = {
  USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$", INR: "₹", JPY: "¥", MXN: "MX$",
};

export function formatMoney(n: number, currency: string): string {
  const sym = SYMBOLS[currency?.toUpperCase()] ?? `${currency} `;
  const digits = currency?.toUpperCase() === "JPY" ? 0 : 2;
  return `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toFixed(digits)}`;
}

export function formatPct(r: number, digits = 1): string {
  if (!Number.isFinite(r)) return "n/a";
  return `${(r * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
}

function signedPct(r: number): string {
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${formatPct(Math.abs(r))}`;
}

function times(r: number): string {
  return `${r.toFixed(1)}×`;
}

/* ------------------------------------------------------------------ engine */

export interface RecommendInput {
  store: Store;
  /** All stored rows for the store (history is needed for the learning check). */
  rows: SearchTermRow[];
  bulk: BulkEntity[];
  /** Anchor date instead of the latest data date. */
  asOf?: string;
}

export interface RecommendResult {
  recommendations: Recommendation[];
  skipped: SkippedTerm[];
  /** Evaluated window; empty strings when there is no data. */
  window: DateWindow;
}

interface TermAgg {
  key: string;
  campaign: string;
  adGroup: string;
  term: string;
  normTerm: string;
  c: Counters;
  /** Target keys the term came through. */
  targets: Set<string>;
  /** At least one source row is the exact keyword equal to this term. */
  ownExact: boolean;
}

interface TargetAgg {
  key: string;
  campaign: string;
  adGroup: string;
  targeting: string;
  matchType: MatchType;
  c: Counters;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Lower = more destructive. A negate-phrase outranks a negate-exact with the
 * same subject: the phrase blocks that exact term and every longer term with
 * the word, so the exact rec folds into it (never the other way round).
 */
const DESTRUCTIVE_RANK: Record<ActionType, number> = {
  "negate-phrase": 0,
  "negate-exact": 1,
  "negate-product": 1,
  pause: 2,
  "bid-down": 3,
  relevance: 4,
  "bid-up": 5,
  "harvest-exact": 6,
  "harvest-phrase": 6,
  "harvest-product": 6,
};

export function recommend(input: RecommendInput): RecommendResult {
  const { store } = input;
  const R = store.rules;
  const E = store.economics;
  const cur = store.currency;
  // One series per term: overlapping Summary / Daily imports are never added together.
  const rows = resolveOverlaps(input.rows.filter((r) => r.storeId === store.id));
  const bulk = input.bulk.filter((b) => b.storeId === store.id);
  const anchor = input.asOf ?? latestDate(rows);
  const win = anchor ? dateWindow(anchor, R.lookbackDays, R.lagDays) : undefined;
  if (!win) return { recommendations: [], skipped: [], window: { from: "", to: "" } };

  const idx = buildBulkIndex(bulk);
  const wRows = filterByWindow(rows, win);
  // Monthly impact = window values × 30 ÷ the days the data actually covers
  // (a 7-day report in a 30-day window is 5–7 days of spend, not 30).
  const first = earliestDate(rows);
  const coveredFrom = first && first > win.from ? first : win.from;
  const scale = 30 / Math.max(1, Math.min(windowLength(win), daysBetween(coveredFrom, win.to) + 1));
  const decimals = bidDecimals(cur);
  const recs: Recommendation[] = [];
  const skipped: SkippedTerm[] = [];

  /* ------------------------------------------------------ aggregations */

  const terms = new Map<string, TermAgg>();
  const targets = new Map<string, TargetAgg>();
  const adGroups = new Map<string, Counters>();
  const campaigns = new Map<string, Counters>();
  const storeTotal = emptyCounters();
  /** norm term → termKey → orders (window, whole store). */
  const termOrders = new Map<string, Map<string, { orders: number; campaign: string; adGroup: string }>>();

  for (const r of wRows) {
    const tk = termKey(r.campaign, r.adGroup, r.searchTerm);
    const gk = targetKey(r.campaign, r.adGroup, r.targeting, r.matchType);
    let t = terms.get(tk);
    if (!t) {
      t = {
        key: tk,
        campaign: r.campaign.trim(),
        adGroup: r.adGroup.trim(),
        term: r.searchTerm.trim(),
        normTerm: norm(r.searchTerm),
        c: emptyCounters(),
        targets: new Set(),
        ownExact: false,
      };
      terms.set(tk, t);
    }
    addInto(t.c, r);
    t.targets.add(gk);
    // The term is its own target: an exact keyword on itself, or an ASIN term on its own product target.
    if (
      (r.matchType === "exact" && normTargeting(r.targeting) === t.normTerm) ||
      (r.matchType === "product" && (asinFromExpression(r.targeting) ?? "").toLowerCase() === t.normTerm)
    ) {
      t.ownExact = true;
    }

    let g = targets.get(gk);
    if (!g) {
      g = { key: gk, campaign: r.campaign.trim(), adGroup: r.adGroup.trim(), targeting: r.targeting.trim(), matchType: r.matchType, c: emptyCounters() };
      targets.set(gk, g);
    }
    addInto(g.c, r);

    const ak = adGroupKey(r.campaign, r.adGroup);
    addInto(adGroups.get(ak) ?? setGet(adGroups, ak, emptyCounters()), r);
    const ck = norm(r.campaign);
    addInto(campaigns.get(ck) ?? setGet(campaigns, ck, emptyCounters()), r);
    addInto(storeTotal, r);
  }
  for (const t of terms.values()) {
    let m = termOrders.get(t.normTerm);
    if (!m) termOrders.set(t.normTerm, (m = new Map()));
    m.set(t.key, { orders: t.c.orders, campaign: t.campaign, adGroup: t.adGroup });
  }

  /**
   * Already targeted, from report rows: exact keyword texts and product-target
   * ASINs. A target the bulk file knows counts only while it (and its campaign
   * / ad group) is not archived — an archived keyword can never serve again.
   * A target the bulk file does not know counts only with data in the window.
   */
  const rowExact = new Map<string, { campaign: string; adGroup: string }>();
  const rowAsins = new Map<string, { campaign: string; adGroup: string }>();
  const stillTargeted = (r: SearchTermRow, entity: BulkEntity | undefined): boolean => {
    if (entity) return !archivedInBulk(idx, entity);
    if (archivedByName(idx, r.campaign, r.adGroup)) return false;
    return inWindow(r, win);
  };
  /** First date each target appears in all stored rows. */
  const firstSeen = new Map<string, string>();
  for (const r of rows) {
    if (r.matchType === "exact") {
      const k = normTargeting(r.targeting);
      if (k && !rowExact.has(k) && stillTargeted(r, findKeyword(idx, r.campaign, r.adGroup, r.targeting, "exact"))) {
        rowExact.set(k, { campaign: r.campaign, adGroup: r.adGroup });
      }
    } else if (r.matchType === "product") {
      const a = asinFromExpression(r.targeting);
      if (a && !/expanded/i.test(r.targeting) && !rowAsins.has(a) && stillTargeted(r, findTarget(idx, r.campaign, r.adGroup, r.targeting))) {
        rowAsins.set(a, { campaign: r.campaign, adGroup: r.adGroup });
      }
    }
    const gk = targetKey(r.campaign, r.adGroup, r.targeting, r.matchType);
    const f = firstSeen.get(gk);
    if (!f || r.date < f) firstSeen.set(gk, r.date);
  }

  /** CVR prior: ad group → campaign → store, first level with orders > 0. */
  const priorCvr = (campaign: string, adGroup: string): { cvr: number; source: string } => {
    const g = adGroups.get(adGroupKey(campaign, adGroup));
    if (g && g.orders > 0 && g.clicks > 0) return { cvr: g.orders / g.clicks, source: "ad group" };
    const c = campaigns.get(norm(campaign));
    if (c && c.orders > 0 && c.clicks > 0) return { cvr: c.orders / c.clicks, source: "campaign" };
    if (storeTotal.orders > 0 && storeTotal.clicks > 0) return { cvr: storeTotal.orders / storeTotal.clicks, source: "store" };
    return { cvr: NaN, source: "none" };
  };
  /** AOV fallback chain for targets without orders of their own. */
  const aovFor = (c: Counters, campaign: string, adGroup: string): number => {
    const own = aovOf(c);
    if (Number.isFinite(own)) return own;
    const g = adGroups.get(adGroupKey(campaign, adGroup));
    if (g && Number.isFinite(aovOf(g))) return aovOf(g);
    const cc = campaigns.get(norm(campaign));
    if (cc && Number.isFinite(aovOf(cc))) return aovOf(cc);
    if (Number.isFinite(aovOf(storeTotal))) return aovOf(storeTotal);
    return E.price && E.price > 0 ? E.price : NaN;
  };

  const skip = (s: Omit<SkippedTerm, "storeId" | "counters"> & { counters: Counters }) => {
    skipped.push({ storeId: store.id, ...s, counters: roundCounters(countersOf(s.counters)) });
  };

  const ordersElsewhere = (t: TermAgg): { orders: number; campaign: string; adGroup: string } | null => {
    const m = termOrders.get(t.normTerm);
    if (!m) return null;
    let best: { orders: number; campaign: string; adGroup: string } | null = null;
    for (const [k, v] of m) {
      if (k === t.key || v.orders <= 0) continue;
      if (!best || v.orders > best.orders) best = v;
    }
    return best;
  };
  const alreadyNegated = (campaign: string, adGroup: string, term: string, kind: "exact" | "phrase" | "product"): boolean => {
    const c = norm(campaign);
    const g = norm(adGroup);
    if (kind === "product") {
      const a = term.toUpperCase();
      return idx.negativeProduct.has(`${c}|${g}|${a}`) || idx.negativeProduct.has(`${c}||${a}`);
    }
    const map = kind === "exact" ? idx.negativeExact : idx.negativePhrase;
    const t = norm(term);
    return map.has(`${c}|${g}|${t}`) || map.has(`${c}||${t}`);
  };

  /** Search-term evidence to attach to target-level recs. */
  const targetEvidence = new Map<string, string[]>();
  const addTargetEvidence = (t: TermAgg, text: string) => {
    for (const gk of t.targets) {
      const list = targetEvidence.get(gk) ?? setGet(targetEvidence, gk, []);
      list.push(text);
    }
  };

  const base = (
    action: ActionType,
    subject: string,
    campaign: string,
    adGroup: string,
    matchType: MatchType,
    c: Counters,
    level: "search-term" | "target",
    idSuffix = "",
  ): Recommendation => ({
    id: recommendationId(store.id, action, campaign, adGroup, subject) + idSuffix,
    storeId: store.id,
    action,
    priority: "medium",
    subject,
    campaign,
    adGroup,
    matchType,
    counters: roundCounters(countersOf(c)),
    reason: "",
    evidence: [],
    ids: {},
    level,
  });

  /* ------------------------------------------------ search-term: harvest */

  const harvestCandidates = new Map<string, TermAgg[]>();
  for (const t of terms.values()) {
    if (t.ownExact) continue; // the term is the exact keyword itself
    const a = acosOf(t.c);
    if (t.c.clicks >= R.minClicksEvaluate && t.c.orders >= R.harvestMinOrders && a < E.targetAcos) {
      const list = harvestCandidates.get(t.normTerm) ?? setGet(harvestCandidates, t.normTerm, []);
      list.push(t);
    }
  }

  for (const [nt, list] of harvestCandidates) {
    list.sort((x, y) => y.c.orders - x.c.orders || y.c.sales - x.c.sales || y.c.clicks - x.c.clicks || (x.key < y.key ? -1 : 1));
    const best = list[0];
    const others = list.slice(1).map((o) => `also qualifies in ${o.campaign} / ${o.adGroup} (${o.c.orders} orders, ${formatPct(acosOf(o.c))} ACoS)`);
    const asinTerm = isAsin(nt);
    const action: ActionType = asinTerm ? "harvest-product" : "harvest-exact";

    const existing = asinTerm ? existingProductTarget(idx, rowAsins, nt) : existingExact(idx, rowExact, nt);
    if (existing) {
      skip({
        subject: best.term,
        campaign: best.campaign,
        adGroup: best.adGroup,
        counters: best.c,
        action,
        reason: asinTerm
          ? `already a product target in ${existing.campaign} / ${existing.adGroup}`
          : `already an exact keyword in ${existing.campaign} / ${existing.adGroup}`,
      });
      continue;
    }

    const tooLong = asinTerm ? null : keywordLengthProblem(best.term, "keyword");
    if (tooLong) {
      skip({ subject: best.term, campaign: best.campaign, adGroup: best.adGroup, counters: best.c, action, reason: tooLong });
      continue;
    }

    const a = acosOf(best.c);
    const prior = priorCvr(best.campaign, best.adGroup);
    const sCvr = smoothedCvr(best.c.orders, best.c.clicks, prior.cvr, R.cvrPriorWeight);
    const avgOrder = aovOf(best.c);
    const mult = R.matchMultipliers.exact;
    const bid = harvestBid({
      targetAcos: E.targetAcos,
      aov: avgOrder,
      cvr: sCvr,
      harvestBidFactor: R.harvestBidFactor,
      matchMultiplier: mult,
      floor: R.bidFloor,
      ceiling: R.bidCeiling,
      decimals,
    });
    const mc = maxCpc(E.targetAcos, avgOrder, sCvr);
    const rec = base(action, best.term, best.campaign, best.adGroup, asinTerm ? "product" : "exact", best.c, "search-term");
    rec.priority = best.c.orders >= 3 ? "high" : "medium";
    rec.suggestedBid = Number.isFinite(bid) ? bid : undefined;
    rec.maxCpc = Number.isFinite(mc) ? round2(mc) : undefined;
    rec.reason = `${best.c.orders} orders at ${formatPct(a)} ACoS vs ${formatPct(E.targetAcos)} target`;
    rec.evidence.push(
      `rule: harvest (≥ ${R.harvestMinOrders} orders, ACoS < target, ≥ ${R.minClicksEvaluate} clicks)`,
      `bid = ${formatPct(E.targetAcos)} × AOV ${formatMoney(avgOrder, cur)} × smoothed CVR ${formatPct(sCvr, 2)} ` +
        `(prior ${prior.source} ${formatPct(prior.cvr, 2)}, weight ${R.cvrPriorWeight}) × ${R.harvestBidFactor} × ${mult}`,
      ...others,
    );
    rec.ids = idsFor(idx, best.campaign, best.adGroup);
    rec.impact = round2(best.c.sales * scale);
    recs.push(rec);

    if (R.alsoHarvestPhrase && !asinTerm) {
      if (existingPhrase(idx, nt)) {
        rec.evidence.push("phrase companion skipped: already a phrase keyword");
      } else {
        const pm = R.matchMultipliers.phrase;
        const pBid = harvestBid({
          targetAcos: E.targetAcos,
          aov: avgOrder,
          cvr: sCvr,
          harvestBidFactor: R.harvestBidFactor,
          matchMultiplier: pm,
          floor: R.bidFloor,
          ceiling: R.bidCeiling,
          decimals,
        });
        const phrase = base("harvest-phrase", best.term, best.campaign, best.adGroup, "phrase", best.c, "search-term");
        phrase.priority = rec.priority;
        phrase.suggestedBid = Number.isFinite(pBid) ? pBid : undefined;
        phrase.maxCpc = rec.maxCpc;
        phrase.reason = `Phrase companion to the exact harvest (× ${pm})`;
        phrase.evidence.push(`companion of ${rec.id}`);
        phrase.ids = { ...rec.ids };
        phrase.pairedWith = rec.id;
        phrase.impact = 0;
        recs.push(phrase);
      }
    }

    if (R.pairNegativeOnHarvest) {
      const prot = protectedMatch(best.term, store);
      const negAction: ActionType = asinTerm ? "negate-product" : "negate-exact";
      if (prot) {
        rec.evidence.push(`paired negative skipped: ${prot.kind} term “${prot.term}” is never negated`);
      } else if (alreadyNegated(best.campaign, best.adGroup, best.term, asinTerm ? "product" : "exact")) {
        rec.evidence.push("paired negative skipped: already negated in the source ad group");
      } else {
        const neg = base(negAction, best.term, best.campaign, best.adGroup, asinTerm ? "product" : "exact", best.c, "search-term");
        neg.priority = rec.priority;
        neg.reason = `Paired with the harvest: stops ${best.campaign} / ${best.adGroup} competing with the new ${asinTerm ? "product target" : "exact keyword"}`;
        neg.evidence.push(`paired negative for ${rec.id}`);
        neg.ids = { ...rec.ids };
        neg.pairedWith = rec.id;
        neg.impact = 0;
        rec.pairedWith = neg.id;
        recs.push(neg);
      }
    }
  }

  /* ------------------------------------- search-term: negate-exact / costly */

  for (const t of terms.values()) {
    const asinTerm = isAsin(t.normTerm);
    const negAction: ActionType = asinTerm ? "negate-product" : "negate-exact";
    let kind: "bleeder" | "expensive" | null = null;
    let reason = "";

    if (t.c.orders === 0 && t.c.clicks >= R.negateClicks) {
      kind = "bleeder";
      reason = `${t.c.clicks} clicks, ${formatMoney(t.c.spend, cur)} spend, 0 orders`;
    } else if (t.c.orders > 0 && t.c.clicks >= R.minClicksEvaluate && E.breakEvenAcos > 0) {
      const a = acosOf(t.c);
      const x = a / E.breakEvenAcos;
      if (x > R.expensiveNegateMultiple && t.c.clicks >= R.expensiveNegateMinClicks) {
        kind = "expensive";
        reason = `ACoS ${formatPct(a)} = ${times(x)} break-even (${formatPct(E.breakEvenAcos)}) on ${t.c.clicks} clicks, ${t.c.orders} order${t.c.orders === 1 ? "" : "s"}`;
      } else if (x >= R.expensiveBidCutMultiple) {
        addTargetEvidence(t, `search term “${t.term}” at ${formatPct(a)} ACoS (${times(x)} break-even) — handled by the bid ladder`);
      }
    }
    if (!kind) continue;

    if (t.ownExact) {
      // The term is its own exact keyword: leave it to the target-level bid / pause.
      addTargetEvidence(t, `search term “${t.term}”: ${reason} — handled at keyword level`);
      continue;
    }
    const prot = protectedMatch(t.term, store);
    if (prot) {
      skip({ subject: t.term, campaign: t.campaign, adGroup: t.adGroup, counters: t.c, action: negAction, reason: `${prot.kind} term (“${prot.term}”) — never negated` });
      continue;
    }
    const elsewhere = ordersElsewhere(t);
    if (elsewhere) {
      skip({
        subject: t.term,
        campaign: t.campaign,
        adGroup: t.adGroup,
        counters: t.c,
        action: negAction,
        reason: `negative would block a converting term (${elsewhere.orders} order${elsewhere.orders === 1 ? "" : "s"} in ${elsewhere.campaign} / ${elsewhere.adGroup})`,
      });
      continue;
    }
    const tooLong = asinTerm ? null : keywordLengthProblem(t.term, "negativeExact");
    if (tooLong) {
      skip({ subject: t.term, campaign: t.campaign, adGroup: t.adGroup, counters: t.c, action: negAction, reason: tooLong });
      continue;
    }
    if (alreadyNegated(t.campaign, t.adGroup, t.term, asinTerm ? "product" : "exact")) {
      skip({ subject: t.term, campaign: t.campaign, adGroup: t.adGroup, counters: t.c, action: negAction, reason: "already negated in this ad group / campaign" });
      continue;
    }
    const rec = base(negAction, t.term, t.campaign, t.adGroup, asinTerm ? "product" : "exact", t.c, "search-term");
    rec.priority = kind === "bleeder" ? "high" : "medium";
    rec.reason = reason;
    rec.evidence.push(
      kind === "bleeder"
        ? `rule: negate exact (0 orders, ≥ ${R.negateClicks} clicks)`
        : `rule: expensive converting term (> ${R.expensiveNegateMultiple}× break-even, ≥ ${R.expensiveNegateMinClicks} clicks)`,
    );
    rec.ids = idsFor(idx, t.campaign, t.adGroup);
    rec.impact = round2(t.c.spend * scale);
    recs.push(rec);
  }

  /* ------------------------------------------ search-term: negate-phrase */

  if (R.negatePhraseOnIrrelevant && store.irrelevantWords?.length) {
    const words = [...new Set(store.irrelevantWords.map((w) => tokenize(w).join(" ")).filter(Boolean))].map((w) => ({
      word: w,
      tokens: w.split(" "),
    }));
    const groups = new Map<string, { campaign: string; adGroup: string; word: string; wordTokens: string[]; terms: TermAgg[] }>();
    /**
     * Every term in the ad group that contains the word — whichever word it was
     * counted under. The negative blocks all of them, so the brand / converting
     * safety checks look at all of them ("free garlic press recipe" with orders
     * protects "recipe" too, although it counts toward "free").
     */
    const blockedBy = new Map<string, TermAgg[]>();
    for (const t of terms.values()) {
      const counts = t.c.clicks >= 1 && t.c.spend > 0;
      const tokens = tokenize(t.term);
      let assigned = false;
      for (const w of words) {
        if (!containsPhrase(tokens, w.tokens)) continue;
        const k = `${adGroupKey(t.campaign, t.adGroup)}|${w.word}`;
        (blockedBy.get(k) ?? setGet(blockedBy, k, [])).push(t);
        // Counters / evidence: one negative per term, the first matching word in
        // list order ("free garlic press recipe" → "free", not also "recipe").
        if (counts && !assigned) {
          const g = groups.get(k) ?? setGet(groups, k, { campaign: t.campaign, adGroup: t.adGroup, word: w.word, wordTokens: w.tokens, terms: [] });
          g.terms.push(t);
          assigned = true;
        }
      }
    }
    for (const [gk, g] of groups) {
      const c = emptyCounters();
      for (const t of g.terms) addInto(c, t.c);
      g.terms.sort((x, y) => y.c.spend - x.c.spend || (x.key < y.key ? -1 : 1));
      const blocked = blockedBy.get(gk) ?? g.terms;

      const protTerm = blocked.map((t) => ({ t, p: protectedMatch(t.term, store) })).find((x) => x.p);
      const protWord = protectedMatch(g.word, store);
      if (protWord || protTerm) {
        const p = protWord ?? protTerm!.p!;
        skip({
          subject: g.word,
          campaign: g.campaign,
          adGroup: g.adGroup,
          counters: c,
          action: "negate-phrase",
          reason: `${p.kind} term (“${p.term}”) would be blocked — never negated`,
        });
        continue;
      }
      // Converting anywhere in the store (window) → do not block it.
      let converting: { term: string; orders: number } | null = null;
      for (const t of blocked) {
        const m = termOrders.get(t.normTerm);
        let o = 0;
        if (m) for (const v of m.values()) o += v.orders;
        if (o > 0 && (!converting || o > converting.orders)) converting = { term: t.term, orders: o };
      }
      if (converting) {
        skip({
          subject: g.word,
          campaign: g.campaign,
          adGroup: g.adGroup,
          counters: c,
          action: "negate-phrase",
          reason: `negative would block a converting term (“${converting.term}” has ${converting.orders} order${converting.orders === 1 ? "" : "s"})`,
        });
        continue;
      }
      // A live keyword in this ad group containing the word would be blocked too.
      const kwTexts = idx.keywordTextsByAdGroup.get(adGroupKey(g.campaign, g.adGroup)) ?? [];
      const rowKw = [...targets.values()]
        .filter((x) => adGroupKey(x.campaign, x.adGroup) === adGroupKey(g.campaign, g.adGroup) && ["exact", "phrase", "broad"].includes(x.matchType))
        .map((x) => norm(x.targeting));
      const blockedKw = [...kwTexts, ...rowKw].find((k) => containsPhrase(tokenize(k), g.wordTokens));
      if (blockedKw) {
        skip({
          subject: g.word,
          campaign: g.campaign,
          adGroup: g.adGroup,
          counters: c,
          action: "negate-phrase",
          reason: `would block the keyword “${blockedKw}” in this ad group`,
        });
        continue;
      }
      const tooLong = keywordLengthProblem(g.word, "negativePhrase");
      if (tooLong) {
        skip({ subject: g.word, campaign: g.campaign, adGroup: g.adGroup, counters: c, action: "negate-phrase", reason: tooLong });
        continue;
      }
      if (alreadyNegated(g.campaign, g.adGroup, g.word, "phrase")) {
        skip({ subject: g.word, campaign: g.campaign, adGroup: g.adGroup, counters: c, action: "negate-phrase", reason: "already a negative phrase in this ad group / campaign" });
        continue;
      }
      const rec = base("negate-phrase", g.word, g.campaign, g.adGroup, "phrase", c, "search-term");
      rec.priority = "medium";
      rec.reason = `Irrelevant word “${g.word}” in ${g.terms.length} search term${g.terms.length === 1 ? "" : "s"}: ${c.clicks} clicks, ${formatMoney(c.spend, cur)} spend, 0 orders`;
      rec.evidence.push("rule: negate phrase (irrelevant word, whole-word match)");
      for (const t of g.terms.slice(0, 10)) rec.evidence.push(`term “${t.term}”: ${t.c.clicks} clicks, ${formatMoney(t.c.spend, cur)}`);
      if (g.terms.length > 10) rec.evidence.push(`…and ${g.terms.length - 10} more terms`);
      rec.ids = idsFor(idx, g.campaign, g.adGroup);
      rec.impact = round2(c.spend * scale);
      recs.push(rec);
    }
  }

  /* --------------------------------------------------------- target level */

  const medianImpr = median([...targets.values()].map((t) => t.c.impressions).filter((n) => n > 0));

  for (const g of targets.values()) {
    const mt = g.matchType;
    if (mt === "unknown") continue;
    const isKeyword = mt === "exact" || mt === "phrase" || mt === "broad";
    const entity = isKeyword ? findKeyword(idx, g.campaign, g.adGroup, g.targeting, mt) : findTarget(idx, g.campaign, g.adGroup, g.targeting);
    const c = g.c;
    const idSuffix = `|${mt}`;
    const extraEvidence = targetEvidence.get(g.key) ?? [];

    // Relevance (informational; not subject to the learning hold).
    const ctrV = ctrOf(c);
    if (c.impressions >= R.relevanceMinImpressions && ctrV < R.relevanceMaxCtr) {
      const rel = base("relevance", g.targeting, g.campaign, g.adGroup, mt, c, "target", idSuffix);
      rel.priority = "low";
      rel.reason = `${c.impressions.toLocaleString("en-US")} impressions at ${formatPct(ctrV, 2)} CTR — check listing relevance (image, title, price)`;
      rel.evidence.push(`rule: relevance (≥ ${R.relevanceMinImpressions} impressions, CTR < ${formatPct(R.relevanceMaxCtr, 2)})`);
      rel.ids = targetIds(idx, g, entity);
      rel.impact = 0;
      recs.push(rel);
    }

    // Decide the proposed action.
    let proposal: { action: "pause" | "bid-up" | "bid-down"; change: number; reason: string; evidence: string[] } | null = null;
    const a = acosOf(c);
    if (c.orders === 0) {
      if (c.clicks >= R.negateClicks) {
        proposal = {
          action: "pause",
          change: 0,
          reason: `${c.clicks} clicks, ${formatMoney(c.spend, cur)} spend, 0 orders`,
          evidence: [`rule: pause (0 orders, ≥ ${R.negateClicks} clicks)`],
        };
      } else if (c.clicks >= R.minClicksEvaluate) {
        skip({
          subject: g.targeting,
          campaign: g.campaign,
          adGroup: g.adGroup,
          counters: c,
          matchType: mt,
          reason: `not enough data: ${c.clicks} clicks, 0 orders (pause at ${R.negateClicks})`,
        });
      }
    } else {
      const lad = ladderChange(a, E.targetAcos, R.ladder);
      if (lad) {
        const ev = [`ladder: ACoS ÷ target = ${lad.ratio.toFixed(2)} → ${signedPct(lad.change)}${lad.flagPause ? " + pause flag" : ""}`];
        let change = lad.change;
        let raiseBlocked = false;
        if (change > 0 && c.orders < R.minOrdersToRaise) {
          change = 0;
          raiseBlocked = true;
        }
        const cvrV = cvrOf(c);
        const starved =
          cvrV >= R.starvedMinCvr && c.orders >= R.starvedMinOrders && a < E.targetAcos && Number.isFinite(medianImpr) && c.impressions < medianImpr;
        if (starved && R.starvedRaise > change) {
          change = R.starvedRaise;
          raiseBlocked = false;
          ev.push(`starved winner: CVR ${formatPct(cvrV)} with ${c.impressions} impressions < store median ${Math.round(medianImpr)} → ${signedPct(R.starvedRaise)}`);
        }
        const baseReason = `ACoS ${formatPct(a)} = ${lad.ratio.toFixed(2)}× target (${formatPct(E.targetAcos)}), ${c.orders} order${c.orders === 1 ? "" : "s"}`;
        if (lad.flagPause) {
          proposal = { action: "pause", change: lad.change, reason: `${baseReason} — over ${times(prevBound(R.ladder, lad.index))} target`, evidence: ev };
        } else if (change > 0) {
          proposal = { action: "bid-up", change, reason: baseReason, evidence: ev };
        } else if (change < 0) {
          proposal = { action: "bid-down", change, reason: baseReason, evidence: ev };
        } else if (raiseBlocked) {
          skip({
            subject: g.targeting,
            campaign: g.campaign,
            adGroup: g.adGroup,
            counters: c,
            matchType: mt,
            action: "bid-up",
            reason: `raise needs ≥ ${R.minOrdersToRaise} orders (has ${c.orders})`,
          });
        }
      }
    }
    if (!proposal) continue;

    const skipTarget = (reason: string) =>
      skip({ subject: g.targeting, campaign: g.campaign, adGroup: g.adGroup, counters: c, matchType: mt, action: proposal!.action, reason });

    // Learning hold: days of data, counted inclusively (first seen on win.to = 1 day).
    const seen = firstSeen.get(g.key) ?? win.from;
    const history = daysBetween(seen, win.to) + 1;
    if (history < R.minDaysHistory) {
      skipTarget(`learning: ${history} days of history (needs ${R.minDaysHistory})`);
      continue;
    }
    // Brand protection (SOP-03).
    if (isKeyword && proposal.action !== "bid-up") {
      const prot = protectedMatch(g.targeting, store);
      if (prot && prot.kind === "brand") {
        skipTarget(`brand keyword (“${prot.term}”) — maintain bids (SOP-03)`);
        continue;
      }
    }
    if (!entity && !isKeyword) {
      skipTarget("no bid for this target — import a bulk file");
      continue;
    }
    if (entity) {
      const inactive = inactiveState(idx, entity);
      if (inactive) {
        skipTarget(`${inactive} in the bulk file`);
        continue;
      }
    }

    const bulkBid = entity ? effectiveBid(idx, entity) : undefined;
    const avgCpc = c.clicks > 0 ? c.spend / c.clicks : NaN;
    const currentBid = bulkBid ?? (Number.isFinite(avgCpc) && avgCpc > 0 ? roundBid(avgCpc, decimals) : undefined);
    const currentBidSource: "bulk" | "avg-cpc" | undefined = bulkBid !== undefined ? "bulk" : currentBid !== undefined ? "avg-cpc" : undefined;

    const prior = priorCvr(g.campaign, g.adGroup);
    const sCvr = smoothedCvr(c.orders, c.clicks, prior.cvr, R.cvrPriorWeight);
    const mc = maxCpc(E.targetAcos, aovFor(c, g.campaign, g.adGroup), sCvr);
    const guard = (change: number) =>
      currentBid === undefined
        ? undefined
        : applyGuardrails(currentBid, currentBid * (1 + change), { maxMove: R.maxMove, floor: R.bidFloor, ceiling: R.bidCeiling, maxCpc: mc, decimals });

    if (proposal.action === "pause") {
      const rec = base("pause", g.targeting, g.campaign, g.adGroup, mt, c, "target", idSuffix);
      rec.priority = "high";
      rec.reason = proposal.reason;
      rec.evidence.push(...proposal.evidence);
      if (proposal.change < 0) {
        const alt = guard(proposal.change);
        if (alt && !alt.hold) rec.evidence.push(`bid-down alternative: ${signedPct(alt.change)} (${formatMoney(currentBid!, cur)} → ${formatMoney(alt.bid, cur)})`);
      }
      rec.evidence.push(...extraEvidence);
      rec.currentBid = currentBid;
      rec.currentBidSource = currentBidSource;
      if (Number.isFinite(mc)) rec.maxCpc = round2(mc);
      rec.ids = targetIds(idx, g, entity);
      rec.impact = round2(c.spend * scale);
      recs.push(rec);
      continue;
    }

    if (currentBid === undefined) {
      skipTarget("no current bid or CPC to adjust");
      continue;
    }
    const res = guard(proposal.change)!;
    const finalAction: "bid-up" | "bid-down" | null = res.hold ? null : res.bid > currentBid ? "bid-up" : "bid-down";
    if (!finalAction || finalAction !== proposal.action) {
      const caps = res.capped
        .map((k) =>
          k === "max-cpc" ? `max CPC ${formatMoney(mc, cur)}` : k === "floor" ? `floor ${formatMoney(R.bidFloor, cur)}` : k === "ceiling" ? `ceiling ${formatMoney(R.bidCeiling, cur)}` : "max move",
        )
        .join(", ");
      skipTarget(`held at ${formatMoney(currentBid, cur)}: capped by ${caps || "rounding"}`);
      continue;
    }
    const rec = base(finalAction, g.targeting, g.campaign, g.adGroup, mt, c, "target", idSuffix);
    rec.priority = "medium";
    rec.currentBid = currentBid;
    rec.currentBidSource = currentBidSource;
    rec.suggestedBid = res.bid;
    if (Number.isFinite(mc)) rec.maxCpc = round2(mc);
    rec.reason = `${proposal.reason} → ${signedPct(res.change)} (${formatMoney(currentBid, cur)} → ${formatMoney(res.bid, cur)})`;
    rec.evidence.push(...proposal.evidence);
    if (res.capped.length) rec.evidence.push(`guardrails: ${res.capped.join(", ")}`);
    rec.evidence.push(
      `max CPC = ${formatPct(E.targetAcos)} × AOV ${formatMoney(aovFor(c, g.campaign, g.adGroup), cur)} × smoothed CVR ${formatPct(sCvr, 2)} = ${formatMoney(mc, cur)}`,
    );
    if (currentBidSource === "avg-cpc") rec.evidence.push("current bid estimated from average CPC (no bulk file)");
    rec.evidence.push(...extraEvidence);
    rec.ids = targetIds(idx, g, entity);
    rec.impact = round2(finalAction === "bid-down" ? c.spend * scale * Math.abs(res.change) : c.sales * scale * res.change);
    recs.push(rec);
  }

  /* ------------------------------------------------------- conflict pass */

  const resolved = resolveConflicts(recs);

  // A negate-exact covered by a negate-phrase in the same ad group folds into it.
  const phraseByGroup = new Map<string, Recommendation[]>();
  for (const r of resolved) {
    if (r.action !== "negate-phrase") continue;
    const k = adGroupKey(r.campaign, r.adGroup);
    (phraseByGroup.get(k) ?? setGet(phraseByGroup, k, [])).push(r);
  }
  const final = resolved.filter((r) => {
    if (r.action !== "negate-exact" || r.pairedWith) return true;
    const phrases = phraseByGroup.get(adGroupKey(r.campaign, r.adGroup));
    if (!phrases) return true;
    const tokens = tokenize(r.subject);
    const cover = phrases.find((p) => containsPhrase(tokens, tokenize(p.subject)));
    if (!cover) return true;
    cover.evidence.push(`covers negate-exact “${r.subject}” (${r.reason})`);
    return false;
  });

  final.sort(
    (x, y) =>
      PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || (y.impact ?? 0) - (x.impact ?? 0) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
  );
  skipped.sort((x, y) => y.counters.spend - x.counters.spend || (x.subject < y.subject ? -1 : 1));
  for (const r of final) r.windowTo = win.to;
  return { recommendations: final, skipped, window: win };
}

/* ---------------------------------------------------------------- helpers */

function setGet<K, V>(map: Map<K, V>, key: K, value: V): V {
  map.set(key, value);
  return value;
}

function prevBound(ladder: LadderRung[], index: number): number {
  const b = index > 0 ? ladder[index - 1].upTo : 0;
  return Number.isFinite(b) ? b : 2;
}

function existingExact(
  idx: BulkIndex,
  rowExact: Map<string, { campaign: string; adGroup: string }>,
  term: string,
): { campaign: string; adGroup: string } | null {
  const e = idx.exactKeywords.get(term)?.[0];
  if (e) return { campaign: e.campaignName || e.campaignId, adGroup: e.adGroupName || e.adGroupId || "" };
  return rowExact.get(term) ?? null;
}

function existingPhrase(idx: BulkIndex, term: string): boolean {
  return idx.phraseKeywords.has(term);
}

function existingProductTarget(
  idx: BulkIndex,
  rowAsins: Map<string, { campaign: string; adGroup: string }>,
  term: string,
): { campaign: string; adGroup: string } | null {
  const asin = term.toUpperCase();
  const e = idx.productTargetAsins.get(asin)?.[0];
  if (e) return { campaign: e.campaignName || e.campaignId, adGroup: e.adGroupName || e.adGroupId || "" };
  return rowAsins.get(asin) ?? null;
}

function targetIds(idx: BulkIndex, g: { campaign: string; adGroup: string }, entity: BulkEntity | undefined) {
  const ids = idsFor(idx, g.campaign, g.adGroup);
  if (entity) {
    ids.campaignId = entity.campaignId;
    if (entity.adGroupId) ids.adGroupId = entity.adGroupId;
    if (entity.keywordId) ids.keywordId = entity.keywordId;
    if (entity.productTargetingId) ids.productTargetingId = entity.productTargetingId;
  }
  return ids;
}

/** Family root: a harvest and its companions / paired negative are one unit. */
function familyOf(r: Recommendation, byId: Map<string, Recommendation>): string {
  if (r.action === "harvest-exact" || r.action === "harvest-product") return r.id;
  if (r.pairedWith) {
    const p = byId.get(r.pairedWith);
    if (p && (p.action === "harvest-exact" || p.action === "harvest-product")) return p.id;
  }
  return r.id;
}

/**
 * One rec per (level, subject, campaign, ad group) — plus match type for target
 * recs, because "garlic press" exact and "garlic press" phrase in one ad group
 * are two keywords, not a conflict. Most destructive unit wins; the others are
 * folded into the winner's evidence.
 */
export function resolveConflicts(recs: Recommendation[]): Recommendation[] {
  const byId = new Map(recs.map((r) => [r.id, r] as const));
  const groups = new Map<string, Recommendation[]>();
  for (const r of recs) {
    const k = `${r.level ?? ""}|${norm(r.subject)}|${norm(r.campaign)}|${norm(r.adGroup)}|${r.level === "target" ? r.matchType : ""}`;
    (groups.get(k) ?? setGet(groups, k, [])).push(r);
  }
  const dropped = new Set<string>();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const units = new Map<string, Recommendation[]>();
    for (const r of list) {
      const f = familyOf(r, byId);
      (units.get(f) ?? setGet(units, f, [])).push(r);
    }
    if (units.size < 2) continue;
    const ranked = [...units.entries()]
      .map(([root, members]) => {
        const head = byId.get(root) ?? members[0];
        return { root, members, head, rank: DESTRUCTIVE_RANK[head.action] };
      })
      .sort((a, b) => a.rank - b.rank || (a.root < b.root ? -1 : 1));
    const winner = ranked[0];
    for (const loser of ranked.slice(1)) {
      for (const m of loser.members) {
        dropped.add(m.id);
        winner.head.evidence.push(`folded ${m.action}: ${m.reason}`);
      }
    }
  }
  // Drop orphaned family members whose root was folded elsewhere.
  for (const r of recs) {
    if (dropped.has(r.id)) continue;
    const f = familyOf(r, byId);
    if (f !== r.id && dropped.has(f)) dropped.add(r.id);
  }
  return recs.filter((r) => !dropped.has(r.id));
}
