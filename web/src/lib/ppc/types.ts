/**
 * PPC Console — shared type contract.
 *
 * Every file under `src/lib/ppc/`, `src/components/ppc/` and `src/app/dashboard/**`
 * builds against these types. Extend them (add optional fields) rather than reshaping
 * them; the IndexedDB records and the backup file are serialised from these shapes.
 *
 * Conventions:
 * - Money is a plain number in the store's own currency. Conversion to the base
 *   currency happens only at display/rollup time (`metrics.ts`, FX rates in settings).
 * - Rates (ACoS, CTR, CVR, target ACoS…) are ratios: 0.3 means 30%.
 * - Dates are ISO calendar days, "YYYY-MM-DD", in the report's own timezone.
 */

/* ------------------------------------------------------------------ stores */

export type GoalMode = "profit" | "growth" | "launch" | "liquidate";

export interface Economics {
  /** (price − all costs) ÷ price. Default 0.32. */
  breakEvenAcos: number;
  /** Must be ≤ breakEvenAcos. Default 0.30. */
  targetAcos: number;
  goal: GoalMode;
  /** Optional unit economics used to derive break-even in the Bids page. */
  price?: number;
  cogs?: number;
  fbaFee?: number;
  /** Referral fee as a ratio of price, e.g. 0.15. */
  referralPct?: number;
  otherCosts?: number;
}

/**
 * One rung of the SOP-03 bid ladder: applies when ACoS ÷ target ≤ `upTo` —
 * except the first rung, which is strict (< `upTo`: "below half target").
 * Bounds compare with a 1e-9 tolerance (see `ladderChange`).
 */
export interface LadderRung {
  /** Upper bound of ACoS as a share of target (Infinity for the last rung). */
  upTo: number;
  /** Relative bid change, e.g. 0.15 = +15%, -0.2 = −20%. */
  change: number;
  /** Also flag the target for pausing (top rung). */
  flagPause?: boolean;
}

export type BiddableMatch = "exact" | "phrase" | "broad" | "auto";

export interface RuleConfig {
  lookbackDays: number;          // 30
  lagDays: number;               // 2 — trailing days excluded for attribution lag
  minClicksEvaluate: number;     // 5
  harvestMinOrders: number;      // 2
  alsoHarvestPhrase: boolean;    // false
  pairNegativeOnHarvest: boolean;// true
  negateClicks: number;          // 15
  negatePhraseOnIrrelevant: boolean; // true
  expensiveBidCutMultiple: number;   // 2  (× break-even)
  expensiveNegateMultiple: number;   // 3  (× break-even)
  expensiveNegateMinClicks: number;  // 10
  ladder: LadderRung[];          // see DEFAULT_LADDER in rules.ts
  maxMove: number;               // 0.20
  minOrdersToRaise: number;      // 3
  minDaysHistory: number;        // 14 (days of data, counted inclusively)
  bidFloor: number;              // 0.30 (USD-scale; new stores get it in their currency — BID_LIMITS_BY_CURRENCY)
  bidCeiling: number;            // 5.00 (likewise)
  starvedMinCvr: number;         // 0.10
  starvedMinOrders: number;      // 2
  starvedRaise: number;          // 0.20
  relevanceMinImpressions: number; // 1000
  relevanceMaxCtr: number;       // 0.002
  cvrPriorWeight: number;        // 15 (clicks of prior weight)
  harvestBidFactor: number;      // 0.80
  matchMultipliers: Record<BiddableMatch, number>; // 1 / 0.85 / 0.70 / 0.60
}

export type HarvestDestination =
  | { mode: "existing"; campaignId: string; adGroupId: string; campaignName: string; adGroupName: string }
  | { mode: "new-campaign"; productLabel: string; dailyBudget: number }
  | { mode: "source" }; // same campaign/ad group the term came from (fallback)

export interface Store {
  id: string;
  name: string;
  /** Marketplace code, e.g. "US", "UK", "DE", "CA", "IN". */
  marketplace: string;
  /** ISO 4217, e.g. "USD". */
  currency: string;
  /** Index into the --series-1..6 chart tokens. */
  colorIndex: number;
  createdAt: string; // ISO timestamp
  economics: Economics;
  rules: RuleConfig;
  brandTerms: string[];
  competitorTerms: string[];
  irrelevantWords: string[];
  harvestDestination: HarvestDestination;
  /** Demo stores are created by "Load demo data" and can be removed in one click. */
  demo?: boolean;
}

export interface ConsoleSettings {
  baseCurrency: string; // "USD"
  /** Units of base currency per 1 unit of the key currency, e.g. { GBP: 1.27 }. */
  fxRates: Record<string, number>;
  /** Selected scope in the switcher: a store id or "all". */
  activeStoreId: string | "all";
}

/* ----------------------------------------------------------------- imports */

export type ReportKind = "search-term" | "bulk";

/** Normalised match type. "product" = product/category targeting (ASIN, category, auto sub-targets). */
export type MatchType = "exact" | "phrase" | "broad" | "auto" | "product" | "unknown";

export interface ImportError {
  row: number;      // 1-based data row in the source file
  message: string;
}

export interface ImportBatch {
  id: string;
  storeId: string;
  kind: ReportKind;
  fileName: string;
  importedAt: string;   // ISO timestamp
  rowCount: number;     // data rows read
  inserted: number;
  updated: number;
  skipped: number;
  dateFrom?: string;
  dateTo?: string;
  /** Capped at 200 entries. */
  errors: ImportError[];
  /** Report attribution window in days (7 for SP, 14 for SB), when detectable. */
  attributionDays?: number;
}

/** Additive performance counters — everything else is derived (see metrics.ts). */
export interface Counters {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
}

export interface SearchTermRow extends Counters {
  /** Natural key: store|date|endDate|campaign|adGroup|targeting|matchType|searchTerm (lower-cased). */
  key: string;
  storeId: string;
  batchId: string;
  /** Day for daily reports; period start for summary reports. */
  date: string;
  /** Present only for summary (non-daily) reports. */
  endDate?: string;
  portfolio?: string;
  campaign: string;
  adGroup: string;
  /** The keyword / target that matched ("Targeting" column), e.g. "garlic press" or "asin=\"B0…\"" or "close-match". */
  targeting: string;
  matchType: MatchType;
  searchTerm: string;
  currency?: string;
  /**
   * Other imports that also hold this row, oldest first (db.ts; `batchId` is
   * the owner). An entry without `counters` had the row's current counters.
   * Deleting the owning import falls back to the newest of these instead of
   * leaving a hole in the other import's period. Capped (see db.ts).
   */
  versions?: RowVersion[];
}

/** One other import that holds a search-term row (see `SearchTermRow.versions`). */
export interface RowVersion {
  batchId: string;
  /** Counters as that import had them; omitted when equal to the row's current counters. */
  counters?: Counters;
}

export type BulkEntityType =
  | "Campaign"
  | "Ad Group"
  | "Product Ad"
  | "Keyword"
  | "Negative Keyword"
  | "Campaign Negative Keyword"
  | "Product Targeting"
  | "Negative Product Targeting"
  | "Bidding Adjustment"
  | "Other";

/** One row from an Amazon bulk operations file (Sponsored Products sheet). */
export interface BulkEntity {
  key: string; // store|entity|campaignId|adGroupId|keywordId|productTargetingId|adId
  storeId: string;
  batchId: string;
  entity: BulkEntityType;
  campaignId: string;
  adGroupId?: string;
  adId?: string;
  keywordId?: string;
  productTargetingId?: string;
  campaignName: string;
  adGroupName?: string;
  state?: string;          // enabled | paused | archived
  targetingType?: string;  // Auto | Manual
  dailyBudget?: number;
  defaultBid?: number;     // Ad Group Default Bid
  bid?: number;            // Keyword / Product Targeting bid
  keywordText?: string;
  matchType?: string;      // as written in the file (exact, negativeExact, …)
  expression?: string;     // Product Targeting Expression
  sku?: string;
  asin?: string;
  /** Bidding Adjustment rows: "Placement Top", "Placement Product Page", … */
  placement?: string;
  /** Bidding Adjustment rows: percentage as written in the file (e.g. 50 = +50%). */
  percentage?: number;
  portfolioId?: string;
  /** Campaign rows: bidding strategy as written in the file. */
  biddingStrategy?: string;
}

/* --------------------------------------------------------- recommendations */

export type ActionType =
  | "harvest-exact"      // add the search term as an exact keyword
  | "harvest-phrase"     // optional companion phrase keyword
  | "harvest-product"    // ASIN search term → product targeting
  | "negate-exact"
  | "negate-phrase"
  | "negate-product"     // ASIN search term with no orders → negative product targeting
  | "bid-up"
  | "bid-down"
  | "pause"
  | "relevance";         // informational: check listing relevance

export type Priority = "high" | "medium" | "low";

export interface EntityIds {
  campaignId?: string;
  adGroupId?: string;
  keywordId?: string;
  productTargetingId?: string;
}

export interface Recommendation {
  /** Deterministic: storeId|action|campaign|adGroup|termOrTarget (lower-cased). Stable across recomputes. */
  id: string;
  storeId: string;
  action: ActionType;
  priority: Priority;
  /** Search term for harvest/negate actions; keyword/target text for bid actions. */
  subject: string;
  campaign: string;
  adGroup: string;
  matchType: MatchType;
  /** Performance the decision is based on (lookback window, lag excluded). */
  counters: Counters;
  /** Current bid and where it came from. */
  currentBid?: number;
  currentBidSource?: "bulk" | "avg-cpc";
  /** Suggested bid for harvests and bid changes. */
  suggestedBid?: number;
  /** Max affordable CPC used to cap the bid. */
  maxCpc?: number;
  /** Short human sentence, e.g. "3 orders at 18% ACoS vs 30% target". */
  reason: string;
  /** Rule ids and extra facts that folded into this action (conflict resolution). */
  evidence: string[];
  /** IDs from the bulk file; missing ⇒ export marks the row "needs IDs". */
  ids: EntityIds;
  /** Id of the paired recommendation (harvest ↔ source negative). */
  pairedWith?: string;
  /** Estimated monthly effect in store currency (wasted spend saved or sales gained). */
  impact?: number;
  /** Rule family: "search-term" (harvest / negate) or "target" (bids / pause / relevance). */
  level?: "search-term" | "target";
  /** Last day of the evaluated window (`recommend()` sets it). Decisions remember it in their `basis`. */
  windowTo?: string;
}

export interface SkippedTerm {
  storeId: string;
  subject: string;
  campaign: string;
  adGroup: string;
  counters: Counters;
  reason: string; // e.g. "already an exact keyword in Widget_Exact", "negative would block a converting term"
  /** The action that was withheld, when there was one. */
  action?: ActionType;
  /** Match type of the target for target-level skips. */
  matchType?: MatchType;
}

export type DecisionStatus = "approved" | "rejected" | "snoozed";

/**
 * The recommendation a decision was made for. Rec ids are stable across
 * recomputes (a bid-up on one keyword keeps its id), so this tells a later,
 * different suggestion under the same id apart from the decided one
 * (`components/ppc/work/decisions.ts` `isOutdated`).
 */
export interface DecisionBasis {
  currentBid?: number;
  currentBidSource?: "bulk" | "avg-cpc";
  suggestedBid?: number;
  /** `Recommendation.windowTo` at decision time. */
  windowTo?: string;
  /** `Recommendation.pairedWith` at decision time ("" = standalone). */
  pairedWith?: string;
}

export interface Decision {
  recId: string;
  storeId: string;
  status: DecisionStatus;
  /** Bid the user typed before approving. */
  editedBid?: number;
  /** Harvest destination override for this row. */
  destination?: HarvestDestination;
  decidedAt: string;
  snoozeUntil?: string;
  /**
   * ISO timestamp set by "Mark as applied" after the approved change was
   * exported and uploaded to Amazon. Applied decisions stay "approved" but
   * are never exported again (Keywords page → Applied history).
   */
  appliedAt?: string;
  /** The rec this decision was made for (absent on decisions saved before 2026-10). */
  basis?: DecisionBasis;
}

/* ------------------------------------------------------------------ backup */

export interface ConsoleBackup {
  app: "ppc-console";
  version: 1;
  exportedAt: string;
  settings: ConsoleSettings;
  stores: Store[];
  batches: ImportBatch[];
  rows: SearchTermRow[];
  bulk: BulkEntity[];
  decisions: Decision[];
}
