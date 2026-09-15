import type { CalculatorField, CalculatorSpec, Level, ResourceRef } from "@/types/content";

/**
 * The interactive calculators.
 *
 * Ported from the five workbooks in `../ppc-tools-for-va/calculators/` and
 * specced in that repo's `EXPANSION-PLAN.md`. Every default value and every
 * formula below is the one the workbook uses — the web versions recalculate
 * live and add the sensitivity tables and charts a spreadsheet cell cannot,
 * but they never disagree with the source arithmetic.
 *
 * Defaults live here rather than inside the client islands so the input
 * metadata shown on the hub and the numbers the tool actually starts with are
 * the same constants.
 */

const UPDATED = "2026-06-29";

/* ------------------------------------------------------------------ *
 * Shipped defaults — one object per tool, imported by its island
 * ------------------------------------------------------------------ */

/** `ACoS-ROAS-Calculator.xlsx`, sheet "ACoS ROAS Calculator". */
export const acosRoasDefaults = {
  adSpend: 500,
  adRevenue: 2000,
  price: 29.99,
  cogs: 8,
  fbaFee: 5.5,
  /** Scenario: the workbook models 500 -> 750, a 50% increase. */
  spendChange: 50,
  /** ...against the 25% revenue increase the workbook expects from it. */
  revenueResponse: 25,
};

/** `Bid-Calculator.xlsx`, sheet "Bid Calculator". */
export const bidDefaults = {
  targetAcos: 30,
  price: 29.99,
  cvr: 10,
  currentCpc: 0.85,
  topOfSearchAdj: 50,
  productPageAdj: 0,
  /** Recommended bid as a share of max CPC. The workbook ships 80%. */
  bidAggression: 80,
};

/** `Profit-Margin-Calculator.xlsx`, sheet "Profit Calculator". */
export const profitDefaults = {
  price: 29.99,
  cogs: 8,
  shipping: 2,
  fbaFee: 5.5,
  referralPct: 15,
  otherCosts: 1,
  adSpend: 500,
  adRevenue: 2000,
};

/** `Budget-Planner.xlsx`, sheet "Budget Planner". */
export const budgetDefaults = {
  revenueTarget: 10000,
  targetAcos: 30,
  productCount: 5,
  averagePrice: 29.99,
  daysInMonth: 30,
};

/** `Keyword-ROI-Calculator.xlsx`, sheet "Keyword ROI". */
export const keywordRoiDefaults = {
  /** Contribution margin used for profit per click. */
  marginPct: 30,
  /** Rule thresholds — the workbook's HARVEST / OPTIMIZE / NEGATE bands. */
  harvestAcos: 30,
  optimiseAcos: 70,
  minCvr: 5,
  /** Clicks with zero orders before a term is negated (automation guide rule). */
  negateClicks: 15,
  /** Below this a row has not earned a verdict yet. */
  minClicks: 10,
};

/** Focused break-even tool. Same cost model as the profit workbook. */
export const breakEvenDefaults = {
  price: 29.99,
  cogs: 8,
  shipping: 2,
  fbaFee: 5.5,
  referralPct: 15,
  otherCosts: 1,
  cvr: 10,
  profitRetention: 40,
};

/** Focused TACoS tool: this month against last month. */
export const tacosDefaults = {
  adSpend: 3000,
  adRevenue: 9000,
  totalRevenue: 30000,
  priorAdSpend: 2800,
  priorAdRevenue: 8200,
  priorTotalRevenue: 24500,
};

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

export interface CalculatorWorkbook {
  /** File name under `public/downloads/`. */
  file: string;
  label: string;
  sheets: string[];
  bytes: number;
}

export interface CalculatorEntry extends CalculatorSpec {
  iconName: string;
  level: Level;
  minutes: number;
  /** The one question this tool answers. */
  question: string;
  outputs: string[];
  formulas: { label: string; expression: string }[];
  /** The spreadsheet this was ported from, where one exists. */
  workbook?: CalculatorWorkbook;
  /** Plain-text body for the search index. */
  body: string;
}

function field(
  id: string,
  label: string,
  defaultValue: number,
  unit: CalculatorField["unit"],
  help: string,
): CalculatorField {
  return { id, label, defaultValue, unit, help };
}

export const calculators: CalculatorEntry[] = [
  {
    id: "acos-roas",
    title: "ACoS & ROAS calculator",
    summary:
      "Turn ad spend and ad revenue into ACoS, ROAS, break-even ACoS and net profit, then sweep a spend change to see where the extra dollar stops paying for itself.",
    href: "/calculators/acos-roas",
    question: "Is this campaign profitable, and what happens if I spend more?",
    iconName: "Gauge",
    level: "beginner",
    minutes: 5,
    tags: ["acos", "roas", "profitability", "scenario", "metrics"],
    fields: [
      field("adSpend", "Ad spend", acosRoasDefaults.adSpend, "USD", "Total spend for the period."),
      field(
        "adRevenue",
        "Ad revenue",
        acosRoasDefaults.adRevenue,
        "USD",
        "Attributed sales for the same period.",
      ),
      field("price", "Product price", acosRoasDefaults.price, "USD", "Average selling price."),
      field("cogs", "Cost of goods", acosRoasDefaults.cogs, "USD", "Landed unit cost."),
      field("fbaFee", "FBA fees", acosRoasDefaults.fbaFee, "USD", "Fulfilment fee per unit."),
    ],
    outputs: [
      "ACoS and ROAS",
      "Break-even ACoS and profit margin",
      "Net profit after ads and per-dollar return",
      "Projected ACoS, ROAS and profit at a new spend level",
    ],
    formulas: [
      { label: "ACoS", expression: "Ad spend / Ad revenue x 100" },
      { label: "ROAS", expression: "Ad revenue / Ad spend" },
      { label: "Break-even ACoS", expression: "(Price - COGS - FBA fee) / Price x 100" },
      { label: "Net profit", expression: "Ad revenue - Ad spend - (COGS + FBA) x Units" },
    ],
    workbook: {
      file: "ACoS-ROAS-Calculator.xlsx",
      label: "ACoS / ROAS Calculator",
      sheets: ["ACoS ROAS Calculator", "Multi-Scenario"],
      bytes: 7185,
    },
    body: "ACoS is ad spend divided by ad revenue. ROAS is its reciprocal. Break-even ACoS is the profit margin before advertising, so an ACoS at or below break-even means the advertising paid for itself. The scenario sweep models a change in ad spend against a revenue response ratio, which is how much extra revenue each extra dollar of spend returns, and shows where net profit peaks and where it turns negative.",
  },
  {
    id: "bid",
    title: "Bid calculator",
    summary:
      "Work out max CPC from target ACoS, price and conversion rate, then get a recommended bid per match type, placement multipliers, and a CVR sensitivity table.",
    href: "/calculators/bid",
    question: "What is the most I can pay for a click and still hit target?",
    iconName: "Crosshair",
    level: "intermediate",
    minutes: 6,
    tags: ["bidding", "cpc", "match-types", "placements", "cvr"],
    fields: [
      field("targetAcos", "Target ACoS", bidDefaults.targetAcos, "%", "Where you want to land."),
      field("price", "Product price", bidDefaults.price, "USD", "Average selling price."),
      field("cvr", "Conversion rate", bidDefaults.cvr, "%", "Orders divided by clicks."),
      field("currentCpc", "Current CPC", bidDefaults.currentCpc, "USD", "What you pay today."),
      field(
        "topOfSearchAdj",
        "Top of search adjustment",
        bidDefaults.topOfSearchAdj,
        "%",
        "Placement multiplier on top of the base bid.",
      ),
      field(
        "productPageAdj",
        "Product pages adjustment",
        bidDefaults.productPageAdj,
        "%",
        "Placement multiplier for detail-page inventory.",
      ),
    ],
    outputs: [
      "Max CPC at target ACoS",
      "Conservative, recommended and aggressive bids",
      "Bid per match type: exact, phrase, broad, auto",
      "Effective bid after placement adjustments",
      "Max CPC across six conversion rates",
    ],
    formulas: [
      { label: "Max CPC", expression: "Target ACoS x Price x Conversion rate" },
      { label: "Recommended bid", expression: "Max CPC x Bid aggression" },
      { label: "Placement bid", expression: "Bid x (1 + Placement adjustment)" },
      { label: "Clicks per order", expression: "1 / Conversion rate" },
    ],
    workbook: {
      file: "Bid-Calculator.xlsx",
      label: "Bid Calculator",
      sheets: ["Bid Calculator"],
      bytes: 6100,
    },
    body: "Max CPC is target ACoS multiplied by price multiplied by conversion rate. It is the click price at which a keyword lands exactly on target, so bidding it leaves no margin for a bad week; the workbook recommends 80% of it. Match type multipliers are exact 1.0, phrase 0.85, broad 0.70 and auto 0.60, because a looser match converts worse on average. Placement adjustments multiply the base bid, so a 50% top-of-search adjustment on a 0.72 bid means paying up to 1.08 for that placement.",
  },
  {
    id: "profit-margin",
    title: "Profit margin calculator",
    summary:
      "Full unit economics: COGS, shipping, FBA, referral fee and other costs against price, giving net profit, margin, break-even ACoS and the maximum PPC spend that stays profitable.",
    href: "/calculators/profit-margin",
    question: "What does this product actually earn, and how much can ads cost?",
    iconName: "Receipt",
    level: "intermediate",
    minutes: 7,
    tags: ["margin", "unit-economics", "fees", "break-even", "variants"],
    fields: [
      field("price", "Selling price", profitDefaults.price, "USD", "List price before promos."),
      field("cogs", "Cost of goods", profitDefaults.cogs, "USD", "Manufacturing cost per unit."),
      field(
        "shipping",
        "Shipping to Amazon",
        profitDefaults.shipping,
        "USD",
        "Inbound freight per unit.",
      ),
      field("fbaFee", "FBA fulfilment fee", profitDefaults.fbaFee, "USD", "Pick, pack and ship."),
      field(
        "referralPct",
        "Amazon referral fee",
        profitDefaults.referralPct,
        "%",
        "Category commission, usually 8-15%.",
      ),
      field(
        "otherCosts",
        "Other costs",
        profitDefaults.otherCosts,
        "USD",
        "Storage, returns reserve, inserts.",
      ),
      field("adSpend", "Ad spend", profitDefaults.adSpend, "USD", "Spend for the period."),
      field("adRevenue", "Ad revenue", profitDefaults.adRevenue, "USD", "Attributed sales."),
    ],
    outputs: [
      "Referral fee in dollars and total cost per unit",
      "Profit per unit and margin percentage",
      "Break-even ACoS",
      "Profit and ROI on the current ad spend",
      "Max ad spend at break-even and at half the margin",
      "Margin and break-even ACoS for every variant",
    ],
    formulas: [
      { label: "Referral fee", expression: "Price x Referral %" },
      {
        label: "Total cost per unit",
        expression: "COGS + Shipping + FBA fee + Referral fee + Other",
      },
      { label: "Profit margin", expression: "(Price - Total cost) / Price x 100" },
      { label: "Max ad spend", expression: "Ad revenue x Break-even ACoS" },
    ],
    workbook: {
      file: "Profit-Margin-Calculator.xlsx",
      label: "Profit Margin Calculator",
      sheets: ["Profit Calculator"],
      bytes: 5914,
    },
    body: "Break-even ACoS equals profit margin before advertising. Every cost that is not advertising belongs in the per-unit stack: cost of goods, inbound shipping, the FBA fulfilment fee, the Amazon referral fee as a percentage of price, and a catch-all for storage, returns and inserts. The variant table repeats the calculation per size or colour, because a multi-pack usually carries a better margin than the single and can therefore afford a higher ACoS.",
  },
  {
    id: "budget-planner",
    title: "Budget planner",
    summary:
      "Back a monthly PPC budget out of a revenue target and target ACoS, split it 70/20/10 across winners, growth and testing, and get a daily cap for every product.",
    href: "/calculators/budget-planner",
    question: "How much should I spend a day, and on which products?",
    iconName: "Wallet",
    level: "intermediate",
    minutes: 6,
    tags: ["budget", "pacing", "allocation", "planning", "70-20-10"],
    fields: [
      field(
        "revenueTarget",
        "Monthly revenue target",
        budgetDefaults.revenueTarget,
        "USD",
        "Ad-attributed revenue you are planning for.",
      ),
      field(
        "targetAcos",
        "Target ACoS",
        budgetDefaults.targetAcos,
        "%",
        "The blended number you are managing to.",
      ),
      field(
        "productCount",
        "Number of products",
        budgetDefaults.productCount,
        "count",
        "ASINs carrying ad spend.",
      ),
      field(
        "averagePrice",
        "Average product price",
        budgetDefaults.averagePrice,
        "USD",
        "Used to convert revenue into units.",
      ),
    ],
    outputs: [
      "Maximum monthly and daily PPC budget",
      "Budget per product, monthly and daily",
      "70/20/10 split across winners, growth and testing",
      "Per-product daily caps and tier ACoS targets",
      "Budget at +25%, +50% and +100% revenue",
    ],
    formulas: [
      { label: "Monthly budget", expression: "Revenue target x Target ACoS" },
      { label: "Daily budget", expression: "Monthly budget / Days in month" },
      { label: "Tier budget", expression: "Monthly budget x Tier share" },
      { label: "Units needed", expression: "Revenue target / Average price" },
    ],
    workbook: {
      file: "Budget-Planner.xlsx",
      label: "Budget Planner",
      sheets: ["Budget Planner"],
      bytes: 6103,
    },
    body: "A PPC budget is not a number you pick, it is the consequence of a revenue target and a target ACoS: spend equals revenue multiplied by ACoS. Ten thousand dollars of ad-attributed revenue at a 30% target means three thousand dollars of ad spend, a hundred dollars a day. The 70/20/10 split puts seventy percent behind products already converting, twenty behind products being scaled, and ten into launches and tests, which is the only tier allowed to run above target ACoS.",
  },
  {
    id: "keyword-roi",
    title: "Keyword ROI calculator",
    summary:
      "Paste a search term report, get CTR, CVR, ACoS, ROAS and profit per click on every row, sort by any column, and export an auto-generated harvest list and negate list.",
    href: "/calculators/keyword-roi",
    question: "Which keywords do I scale, which do I fix, and which do I kill?",
    iconName: "ListFilter",
    level: "advanced",
    minutes: 10,
    tags: ["keywords", "search-terms", "harvesting", "negatives", "export"],
    fields: [
      field(
        "marginPct",
        "Contribution margin",
        keywordRoiDefaults.marginPct,
        "%",
        "Margin before ad cost — drives profit per click.",
      ),
      field(
        "harvestAcos",
        "Harvest below",
        keywordRoiDefaults.harvestAcos,
        "%",
        "ACoS under this and converting: promote to exact.",
      ),
      field(
        "optimiseAcos",
        "Optimise below",
        keywordRoiDefaults.optimiseAcos,
        "%",
        "Between the two thresholds: cut the bid, keep the term.",
      ),
      field(
        "minCvr",
        "Minimum conversion rate",
        keywordRoiDefaults.minCvr,
        "%",
        "Below this a cheap ACoS is luck, not a pattern.",
      ),
      field(
        "negateClicks",
        "Negate after",
        keywordRoiDefaults.negateClicks,
        "count",
        "Clicks with zero orders before a term is negated.",
      ),
    ],
    outputs: [
      "CTR, CVR, CPC, ACoS, ROAS, revenue per click and profit per click per row",
      "A HARVEST, OPTIMIZE, NEGATE or WATCH verdict per row",
      "Account totals and wasted spend",
      "A harvest list and a negate list, copyable or as CSV",
    ],
    formulas: [
      { label: "CTR", expression: "Clicks / Impressions x 100" },
      { label: "CVR", expression: "Orders / Clicks x 100" },
      { label: "Profit per click", expression: "(Revenue x Margin - Spend) / Clicks" },
      { label: "Verdict", expression: "ACoS and CVR against the rule thresholds" },
    ],
    workbook: {
      file: "Keyword-ROI-Calculator.xlsx",
      label: "Keyword ROI Calculator",
      sheets: ["Keyword ROI"],
      bytes: 7824,
    },
    body: "The search term report is the only report that tells you what shoppers actually typed. Every row gets a verdict from four rules: fewer clicks than the minimum is a watch, zero orders past the negate threshold is a negative exact, ACoS under the harvest threshold with a healthy conversion rate is a promotion to its own exact ad group, and everything up to the optimise threshold is a bid cut rather than a negative. Wasted spend is the sum of spend on rows the rules would negate.",
  },
  {
    id: "break-even-acos",
    title: "Break-even ACoS calculator",
    summary:
      "One number, done properly: the ACoS at which an ad pays for itself exactly, plus the target ACoS that keeps the profit share you choose and the CPC that goes with it.",
    href: "/calculators/break-even-acos",
    question: "At what ACoS does this product stop making money?",
    iconName: "Scale",
    level: "beginner",
    minutes: 4,
    tags: ["break-even", "acos", "margin", "targets", "cpc"],
    fields: [
      field("price", "Selling price", breakEvenDefaults.price, "USD", "List price before promos."),
      field("cogs", "Cost of goods", breakEvenDefaults.cogs, "USD", "Manufacturing cost per unit."),
      field(
        "shipping",
        "Shipping to Amazon",
        breakEvenDefaults.shipping,
        "USD",
        "Inbound freight per unit.",
      ),
      field("fbaFee", "FBA fulfilment fee", breakEvenDefaults.fbaFee, "USD", "Pick, pack and ship."),
      field(
        "referralPct",
        "Referral fee",
        breakEvenDefaults.referralPct,
        "%",
        "Category commission.",
      ),
      field(
        "otherCosts",
        "Other costs",
        breakEvenDefaults.otherCosts,
        "USD",
        "Storage and returns.",
      ),
      field("cvr", "Conversion rate", breakEvenDefaults.cvr, "%", "Used for break-even CPC."),
      field(
        "profitRetention",
        "Profit to keep",
        breakEvenDefaults.profitRetention,
        "%",
        "Share of the margin advertising is not allowed to eat.",
      ),
    ],
    outputs: [
      "Break-even ACoS and profit per unit",
      "Target ACoS at your chosen profit retention",
      "Break-even CPC and target CPC",
      "Target ACoS at five retention levels",
    ],
    formulas: [
      { label: "Break-even ACoS", expression: "Profit per unit / Price x 100" },
      { label: "Target ACoS", expression: "Break-even ACoS x (1 - Profit to keep)" },
      { label: "Break-even CPC", expression: "Break-even ACoS x Price x Conversion rate" },
    ],
    body: "Break-even ACoS is profit margin before advertising, expressed as a percentage of price. It is not a target, it is a ceiling: at break-even the advertising costs exactly the profit on the units it sells. The target ACoS is what is left after deciding how much of the margin advertising may consume, which is a business decision about growth against profit rather than a calculation.",
  },
  {
    id: "tacos",
    title: "TACoS calculator",
    summary:
      "Ad spend against total sales, this month next to last month, with the four-quadrant read on whether organic is compounding or the account is quietly buying its own revenue.",
    href: "/calculators/tacos",
    question: "Is advertising building the brand or just renting sales?",
    iconName: "TrendingUp",
    level: "advanced",
    minutes: 5,
    tags: ["tacos", "organic", "total-sales", "trend", "reporting"],
    fields: [
      field("adSpend", "Ad spend this month", tacosDefaults.adSpend, "USD", "All ad types."),
      field(
        "adRevenue",
        "Ad revenue this month",
        tacosDefaults.adRevenue,
        "USD",
        "Ad-attributed sales.",
      ),
      field(
        "totalRevenue",
        "Total revenue this month",
        tacosDefaults.totalRevenue,
        "USD",
        "Ad plus organic.",
      ),
      field(
        "priorAdSpend",
        "Ad spend last month",
        tacosDefaults.priorAdSpend,
        "USD",
        "Comparison period.",
      ),
      field(
        "priorAdRevenue",
        "Ad revenue last month",
        tacosDefaults.priorAdRevenue,
        "USD",
        "Comparison period.",
      ),
      field(
        "priorTotalRevenue",
        "Total revenue last month",
        tacosDefaults.priorTotalRevenue,
        "USD",
        "Comparison period.",
      ),
    ],
    outputs: [
      "TACoS and ACoS for both months",
      "Organic revenue and organic share",
      "Month-on-month movement in points and percent",
      "Which of the four TACoS patterns the account is in",
    ],
    formulas: [
      { label: "TACoS", expression: "Ad spend / Total revenue x 100" },
      { label: "ACoS", expression: "Ad spend / Ad revenue x 100" },
      { label: "Organic revenue", expression: "Total revenue - Ad revenue" },
      { label: "Organic share", expression: "Organic revenue / Total revenue x 100" },
    ],
    body: "TACoS is ad spend over total sales, ad and organic together. ACoS only sees the sales advertising can claim; TACoS sees whether the whole product is getting healthier. Falling TACoS with rising total sales is the outcome you want, because organic is growing faster than ad spend. Rising TACoS with flat sales means the account is buying revenue it used to get free.",
  },
];

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export function findCalculator(id: string): CalculatorEntry | undefined {
  return calculators.find((entry) => entry.id === id);
}

/** Every workbook the source repo ships, in catalogue order. */
export function calculatorWorkbooks(): {
  calculator: CalculatorEntry;
  workbook: CalculatorWorkbook;
}[] {
  const out: { calculator: CalculatorEntry; workbook: CalculatorWorkbook }[] = [];
  for (const calculator of calculators) {
    if (calculator.workbook) out.push({ calculator, workbook: calculator.workbook });
  }
  return out;
}

export function resourceRefs(): ResourceRef[] {
  return calculators.map((entry) => ({
    id: `calculator-${entry.id}`,
    kind: "calculator" as const,
    title: entry.title,
    summary: entry.summary,
    href: entry.href,
    tags: entry.tags,
    level: entry.level,
    minutes: entry.minutes,
    body: [
      entry.question,
      entry.body,
      entry.outputs.join(". "),
      entry.formulas.map((formula) => `${formula.label}: ${formula.expression}`).join(". "),
      entry.fields.map((entryField) => entryField.label).join(", "),
    ].join(" "),
    updated: UPDATED,
  }));
}

/** Resolve a calculator by id, throwing at build time if the id is wrong. */
export function requireCalculator(id: string): CalculatorEntry {
  const entry = findCalculator(id);
  if (!entry) throw new Error(`Unknown calculator id: ${id}`);
  return entry;
}
