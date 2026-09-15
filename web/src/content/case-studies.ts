import type { CaseStudy, Level, ResourceRef } from "@/types/content";

/**
 * Account case studies.
 *
 * Studies 1-6 are ported from `../ppc-tools-for-va/case-studies/ppc-case-studies.md`
 * with their published before/after numbers intact. Studies 7-12 were written
 * for this site to cover the categories the source library never reached:
 * seasonal apparel, a 2,400-ASIN catalogue, Sponsored Brands video, a
 * subscribe-and-save consumable, an EU marketplace launch, and an emergency
 * rescue.
 *
 * Every `timeline` row is built by `point()`, which derives ACoS from spend
 * and revenue rather than letting an author type it. That guarantees the
 * charts, the tables and the metric tiles can never disagree: ACoS on any row
 * is exactly `spend / revenue * 100`, rounded to one decimal place, and the
 * first and last rows are chosen to land on the ACoS figures quoted in
 * `metrics`.
 *
 * Convention: where a study's timeline is weekly or fortnightly and its
 * metrics quote a monthly figure, that figure is the run rate implied by the
 * first and last timeline rows (row x 4 or row x 2), not a calendar-month
 * sum. Two studies compare year on year instead — Q4 toys and the sportswear
 * cycle — and say so in the metric label.
 */

export type CaseStudyResultType =
  | "turnaround"
  | "scale"
  | "launch"
  | "efficiency"
  | "expansion"
  | "rescue";

export interface PlaybookLink {
  /** Human label, e.g. "SOP-02 Weekly search term analysis". */
  label: string;
  /** Internal route to the SOP, workflow, template or cheat sheet. */
  href: string;
  /** One line on how this study used it. */
  note: string;
}

export interface CaseStudyDoc extends CaseStudy {
  resultType: CaseStudyResultType;
  /** Which marketplace(s) the account ran on. */
  marketplace: string;
  /** Where the numbers came from, when they came from a published account. */
  source?: string;
  level: Level;
  minutes: number;
  updated: string;
  /** The site resources a VA would actually open to run this play. */
  playbook: PlaybookLink[];
}

const UPDATED = "2026-06-29";

/** One timeline row. ACoS is derived, never authored. */
function point(period: string, spend: number, revenue: number) {
  return {
    period,
    spend,
    revenue,
    acos: Math.round((spend / revenue) * 1000) / 10,
  };
}

export const RESULT_TYPE_LABEL: Record<CaseStudyResultType, string> = {
  turnaround: "Turnaround",
  scale: "Scale-up",
  launch: "Launch",
  efficiency: "Efficiency",
  expansion: "Expansion",
  rescue: "Rescue",
};

export const RESULT_TYPE_DESCRIPTION: Record<CaseStudyResultType, string> = {
  turnaround: "A loss-making account made profitable without cutting revenue.",
  scale: "Revenue grown well ahead of spend.",
  launch: "Zero history to a ranked, self-sustaining product.",
  efficiency: "The same money made to do more work.",
  expansion: "New marketplace, new ad type or new catalogue coverage.",
  rescue: "An account bleeding money stabilised inside days.",
};

export const RESULT_TYPE_ORDER: CaseStudyResultType[] = [
  "turnaround",
  "scale",
  "launch",
  "efficiency",
  "expansion",
  "rescue",
];

export const caseStudies: CaseStudyDoc[] = [
  /* ------------------------------------------------------------------ 01 */
  {
    id: "home-lifestyle-102-percent-growth",
    title: "Home decor brand: 42% to 18% ACoS and double the revenue in 100 days",
    category: "Home & Decor",
    resultType: "turnaround",
    marketplace: "Amazon.com (US)",
    source: "EcomManagers",
    level: "intermediate",
    minutes: 9,
    updated: UPDATED,
    summary:
      "An auto-campaign-only account with no negatives and no manual structure. A full audit, a keyword rebuild and a four-phase expansion into Sponsored Brands and Sponsored Display doubled ad revenue in fourteen weeks while spend actually fell.",
    client:
      "Home decor brand, 18 parent ASINs (wall art, storage baskets, table linen), roughly $40,000 a month in total sales, three years on Amazon, one in-house VA.",
    timeframe: "100 days (14 weeks)",
    adSpend: "$13,600 a month at the start, $11,780 a month at the end",
    tags: ["turnaround", "acos", "structure", "negatives", "sponsored brands"],
    challenge: `The account had never been structured. Everything ran through automatic campaigns, which is the fastest way to launch and the most expensive way to stay.

At a 42% ACoS against a 24% break-even, every advertised sale lost roughly 18 cents on the dollar, so growth was actively making the business poorer. The owner's instinct was to cut budgets. The audit showed the opposite: the money was fine, the targeting was not.

- **42% ACoS** account-wide, against a 24% break-even
- **Automatic campaigns only** — no manual exact, no phrase, no product targeting
- **60% of spend** on search terms with zero orders in 60 days
- **Zero negative keywords** at campaign or account level
- **No tracking system** — nobody could say which keyword paid for itself
- **No Sponsored Brands or Sponsored Display** at all`,
    approach: [
      "Week 1 — Pull 60 days of the Search Term Report and the Campaign Report into one sheet and pivot spend and orders by search term. This is the single exhibit that justifies everything else: 60% of the spend sat on terms with no orders at all.",
      "Week 1 — Catalogue every live campaign in an audit sheet: name, type, match type, daily budget, 30-day spend, sales, ACoS. Flag every campaign that spent with no orders, and every term appearing in more than one campaign.",
      "Week 2 — Build the negative list before touching a single bid. Add 180+ exact negatives for terms with clicks and no orders, plus phrase negatives for the four irrelevant themes the auto campaigns had latched onto (children's decor, commercial signage, wholesale lots, replacement parts).",
      "Week 2-3 — Harvest the converters. Every search term with two or more orders and an ACoS under the break-even moved into a manual exact campaign at its own bid, and was negated in the auto campaign so the two stopped bidding against each other.",
      "Week 2-3 — Rebuild the structure: one auto campaign per product group for discovery, one manual exact per product group for proven terms, one manual phrase for controlled discovery. Naming convention: [Product]_[Type]_[MatchType].",
      "Week 3-6 — Set bidding strategy by campaign job. Proven exact campaigns on Down Only; discovery campaigns on Up and Down. Adjust bids weekly against a 7-day rolling ACoS, moving no more than 15% in one step.",
      "Week 3-6 — Add placement modifiers. Top of Search +50% on the eleven exact keywords with a conversion rate above 12%, nothing on the rest until they earned it.",
      "Week 6-12 — Expand: Sponsored Brands on the three category head terms, Sponsored Display retargeting on views in the last 30 days, portfolios by product category with a hard monthly cap, and dayparting away from the 1am-6am window that converted at a third of the daily average.",
    ],
    metrics: [
      { label: "ACoS", before: 42, after: 18, unit: "%", better: "lower" },
      { label: "Monthly ad revenue", before: 32400, after: 65440, unit: "$", better: "higher" },
      { label: "ROAS", before: 2.38, after: 5.56, unit: "x", better: "higher" },
      { label: "Click-through rate", before: 0.3, after: 0.8, unit: "%", better: "higher" },
      { label: "Conversion rate", before: 8, after: 14, unit: "%", better: "higher" },
      { label: "Spend on zero-order terms", before: 60, after: 9, unit: "%", better: "lower" },
      { label: "Negative keywords in the account", before: 0, after: 214, better: "higher" },
    ],
    timeline: [
      point("Wk 1-2", 6800, 16200),
      point("Wk 3-4", 7120, 17900),
      point("Wk 5-6", 7240, 20600),
      point("Wk 7-8", 7050, 23900),
      point("Wk 9-10", 6740, 27400),
      point("Wk 11-12", 6400, 30300),
      point("Wk 13-14", 5890, 32720),
    ],
    results: `Ad revenue went from $32,400 a month to $65,440 — a 102% increase — while monthly spend fell from $13,600 to $11,780. The account did not buy its growth; it stopped paying for traffic that was never going to convert.

The shape of the recovery matters more than the endpoint. Spend rose slightly in weeks 3 to 8 while the manual campaigns were being trained, then fell once the exact-match campaigns were carrying the volume at half the cost per order. Anyone reporting weekly would have seen ACoS improve every single fortnight, which is what kept the client patient through the restructure.

Sponsored Brands and Sponsored Display contributed $9,100 of the final month's revenue at a 22% blended ACoS, and Sponsored Products revenue did not fall when they launched. That is the evidence against the cannibalisation argument clients always raise: the new placements found new shoppers.`,
    lessons: [
      "Structure comes before optimisation. There is no bid that rescues an account where one campaign is bidding against another on the same term.",
      "Negative keywords are half the job. The first 180 negatives on this account saved more money than every bid change combined.",
      "Auto campaigns are a research tool, not a strategy. Keep them running forever, but keep them small and negate everything they graduate.",
      "Expansion into Sponsored Brands and Sponsored Display added revenue without taking it from Sponsored Products — measure it before you believe the cannibalisation story.",
      "100 days is a realistic timeline for a full turnaround. Promise a client 30 and you will be optimising for the wrong horizon.",
    ],
    playbook: [
      {
        label: "SOP-05 Campaign restructuring",
        href: "/sops/campaign-restructuring",
        note: "The audit-consolidate-rebuild sequence used in weeks 1 to 3.",
      },
      {
        label: "SOP-02 Weekly search term analysis",
        href: "/sops/weekly-search-term-analysis",
        note: "The harvest-and-negate cycle that fed the manual campaigns.",
      },
      {
        label: "Negative keywords cheat sheet",
        href: "/cheat-sheets/negative-keywords",
        note: "Thresholds for when a term earns an exact or phrase negative.",
      },
      {
        label: "Campaign audit checklist",
        href: "/templates/campaign-audit-checklist",
        note: "The sheet the week-one audit was recorded in.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 02 */
  {
    id: "supplement-93-to-35-acos",
    title: "Supplement brand: 93% ACoS to 35% by unburying the branded keywords",
    category: "Supplements",
    resultType: "turnaround",
    marketplace: "Amazon.com (US)",
    source: "VAA Philippines",
    level: "intermediate",
    minutes: 9,
    updated: UPDATED,
    summary:
      "Nearly a dollar of spend for every dollar of ad revenue. The fix was not a bid cut: it was pulling the branded terms out of the campaigns that were smothering them, concentrating on five products, and letting the account spend 39% more to earn 48% more.",
    client:
      "Single-brand supplement seller (sleep, magnesium, electrolytes), 14 ASINs, about $62,000 a month in total sales, strong organic ranking on brand terms, five years on Amazon.",
    timeframe: "12 weeks",
    adSpend: "$5,515 a month at the start, $7,665 a month at the end",
    tags: ["turnaround", "acos", "branded keywords", "restructure", "search terms"],
    challenge: `The account was spending $0.93 to make $1.00 of ad revenue. On a supplement with a 34% contribution margin, every advertised sale was a loss.

The unusual part was where the money was going. Branded search terms — the cheapest, highest-converting traffic any account has — were sitting inside broad-match campaigns full of generic category terms. The branded clicks converted at 31%, the generic clicks at 3%, and both were being bid and reported on as one number, so nobody could see it.

- **93% ACoS** account-wide
- **Overlapping campaigns** bidding against each other on 34 shared keywords
- **Branded terms buried** inside three generic broad-match campaigns
- **No segmentation** by product, match type or intent
- **No optimisation history** — nobody knew what had already been tried`,
    approach: [
      "Week 1 — Export 90 days of search terms and split them into branded, competitor, generic and irrelevant buckets. Branded terms were 6% of spend and 41% of orders. That one table set the whole plan.",
      "Week 1 — Rank all 14 ASINs by contribution margin per unit, not by revenue. The top five products carried 78% of the profit; everything else was paused for the duration of the rebuild.",
      "Week 1 — Archive the eight campaigns that had spent in the last 60 days with fewer than two orders each, after exporting their search terms into the harvest sheet so the data was not lost.",
      "Week 2-3 — Create a dedicated branded exact campaign at a 12% ACoS target, and add the brand name as an exact negative in every other campaign so nothing else could buy that traffic.",
      "Week 2-3 — Build one manual exact and one manual phrase campaign per top-five product, with the naming convention [ASIN]_[SP]_[MatchType], and cross-negate every exact keyword out of the phrase campaigns.",
      "Week 4-8 — Run the daily bid routine: any keyword above 2x the target ACoS with 15+ clicks gets a 20% bid cut; any keyword below target with a conversion rate above 10% gets a 15% raise. Nothing moves more than once every three days.",
      "Week 4-8 — Fix the listings alongside the ads. Two of the top five had no A+ content and one had a 3-image gallery; conversion rate on those ASINs was the reason their ACoS would not come down.",
      "Week 9-12 — Scale: broad campaigns re-opened for discovery at 20% of budget, product targeting added on the four competitor ASINs that shared the brand's shelf, and a 70/20/10 split enforced across proven, growth and testing campaigns.",
    ],
    metrics: [
      { label: "ACoS", before: 93, after: 35, unit: "%", better: "lower" },
      { label: "Monthly ad revenue", before: 5930, after: 21900, unit: "$", better: "higher" },
      { label: "Monthly ad spend", before: 5515, after: 7665, unit: "$", better: "higher" },
      { label: "Total monthly sales", before: 62000, after: 91760, unit: "$", better: "higher" },
      { label: "TACoS", before: 8.9, after: 8.4, unit: "%", better: "lower" },
      { label: "ROAS", before: 1.08, after: 2.86, unit: "x", better: "higher" },
      { label: "Keywords duplicated across campaigns", before: 34, after: 0, better: "lower" },
    ],
    timeline: [
      point("Wk 1", 1379, 1483),
      point("Wk 2", 1379, 1510),
      point("Wk 3", 1420, 1745),
      point("Wk 4", 1455, 1940),
      point("Wk 5", 1590, 2385),
      point("Wk 6", 1650, 2750),
      point("Wk 7", 1710, 3240),
      point("Wk 8", 1770, 3690),
      point("Wk 9", 1820, 4150),
      point("Wk 10", 1870, 4675),
      point("Wk 11", 1905, 5150),
      point("Wk 12", 1917, 5477),
    ],
    results: `ACoS fell from 93% to 35% while monthly ad spend went **up** by 39%, from $5,515 to $7,665. Ad revenue went from $5,930 to $21,900 a month, and total sales — ads plus organic — rose 48% to $91,760.

The counter-intuitive move was spending more. Once the branded campaign was isolated at a 12% ACoS and the top five products had clean exact campaigns, more budget simply bought more profitable orders. Cutting spend in week one would have capped the recovery at the account's existing efficiency.

TACoS barely moved, from 8.9% to 8.4%, and that is the number to show the client. It says the extra advertising was not cannibalising organic sales: organic revenue grew 24.6% over the same twelve weeks as the increased velocity pushed the top five products up the rankings.`,
    lessons: [
      "A 93% ACoS is not a signal to pause everything. It is a signal that the account structure is hiding two different businesses inside one number.",
      "Branded keywords are the cheapest orders in the account. Give them their own campaign, their own target and their own negatives everywhere else.",
      "Focus beats coverage. Five products done properly outperformed fourteen products managed at 7% attention each.",
      "Spending 39% more to earn 48% more is a win. Judge the account on profit, not on the size of the invoice.",
      "Report TACoS next to ACoS. It is the only number that proves the ads are adding sales rather than buying the ones you already had.",
    ],
    playbook: [
      {
        label: "SOP-05 Campaign restructuring",
        href: "/sops/campaign-restructuring",
        note: "Used for the week 1-3 archive and rebuild.",
      },
      {
        label: "SOP-03 Bid optimisation",
        href: "/sops/bid-optimization",
        note: "The daily bid rules run through weeks 4 to 8.",
      },
      {
        label: "Search term analysis sheet",
        href: "/templates/search-term-analysis-sheet",
        note: "Where the branded / competitor / generic split was built.",
      },
      {
        label: "PPC metrics cheat sheet",
        href: "/cheat-sheets/ppc-metrics",
        note: "Break-even ACoS and TACoS maths used to set the targets.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 03 */
  {
    id: "product-launch-90-day-playbook",
    title: "Kitchen consumable launch: zero to page one in 90 days",
    category: "Kitchen & Housewares",
    resultType: "launch",
    marketplace: "Amazon.com (US)",
    level: "beginner",
    minutes: 10,
    updated: UPDATED,
    summary:
      "A new product with no reviews and no sales history, taken through four deliberate phases: pre-launch listing work, an intentionally unprofitable launch window, optimisation, then scale. ACoS 400% to 30% and page five to page one.",
    client:
      "New kitchen consumable (reusable silicone food covers), single parent ASIN with four size variations, no reviews, no sales history, first product for a two-person brand.",
    timeframe: "90 days",
    adSpend: "$50 a day rising to $100 a day",
    tags: ["launch", "new product", "vine", "organic rank", "budget"],
    challenge: `Nothing on Amazon is harder than the first 30 days. A new ASIN has no conversion history, so Amazon has no reason to show it, and no reviews, so shoppers have no reason to buy it. The launch has to buy both.

The brand's constraint was cash: $6,000 total for 90 days of advertising, which meant the plan had to be sequenced rather than improvised. Every dollar spent on the wrong keyword in week two was a dollar unavailable in week ten when the product could actually convert it.

- **Zero reviews, zero sales history, zero organic rank** on any commercial keyword
- **Ranked page 5** for the main keyword at launch
- **No conversion data** to bid from — every bid was a hypothesis
- **A fixed $6,000 budget** for the whole 90 days
- **A category with three entrenched competitors** each holding 2,000+ reviews`,
    approach: [
      "Days 1-14 — Finish the listing before spending a peso on ads. Five benefit-led bullets, seven images including a scale shot and an in-use shot, A+ content with a comparison module, and the main keyword in the title within the first 80 characters.",
      "Days 1-14 — Enrol in Vine and target 30 units. Reviews are the conversion input; without them every bid you place is 40% less efficient than it needs to be.",
      "Days 1-14 — Build the launch structure: one auto campaign for discovery, one manual exact with the five highest-relevance keywords, one manual phrase with ten related terms. Total $50 a day, split 40/40/20.",
      "Days 15-45 — Analyse search terms twice a week, not weekly. At this stage the data is thin and the losses compound fast. Harvest the fifteen terms that converted from auto into manual exact and negate them in auto.",
      "Days 15-45 — Add 30 negatives for the irrelevant themes the auto campaign found (cling film, freezer bags, bowl lids for specific brands). Accept an ACoS above 80% in this window: you are buying rank, not profit.",
      "Days 46-75 — Cut bids by 25% on any term above 100% ACoS with 20+ clicks; raise them 20% on the six terms converting above 12%. Add product targeting on the three competitor ASINs. Lift the budget to $75 a day only after two consecutive profitable weeks.",
      "Days 46-75 — Add dayparting once you have 45 days of hourly data: this product converted at half the daily average between midnight and 6am, so bids drop 40% in that window.",
      "Days 76-90 — Scale to $100 a day, expand the keyword list past 100 terms, launch Sponsored Display retargeting on 30-day viewers, and enforce the 70/20/10 split between proven, growth and testing spend.",
    ],
    metrics: [
      { label: "ACoS (10-day window)", before: 400, after: 30, unit: "%", better: "lower" },
      { label: "Total daily sales", before: 12, after: 415, unit: "$", better: "higher" },
      { label: "Conversion rate", before: 5, after: 16, unit: "%", better: "higher" },
      { label: "Reviews", before: 3, after: 45, better: "higher" },
      { label: "Organic page for the main keyword", before: 5, after: 1, better: "lower" },
      { label: "TACoS", before: 233, after: 24.1, unit: "%", better: "lower" },
      { label: "Daily ad budget", before: 50, after: 100, unit: "$", better: "higher" },
    ],
    timeline: [
      point("Days 1-10", 280, 70),
      point("Days 11-20", 420, 175),
      point("Days 21-30", 480, 320),
      point("Days 31-40", 500, 560),
      point("Days 41-50", 750, 1000),
      point("Days 51-60", 750, 1180),
      point("Days 61-70", 750, 1500),
      point("Days 71-80", 900, 2250),
      point("Days 81-90", 1000, 3330),
    ],
    results: `The product finished the 90 days at $333 a day in ad revenue and roughly $415 a day in total sales, at a 30% ACoS. It reached page one for the main keyword on day 78 and held it.

Read the chart honestly: the first 30 days lost money. Days 1-10 ran at a 400% ACoS on $280 of spend, and days 11-20 at 240%. That is $700 spent to generate $245 of revenue, and it was the correct decision — those clicks bought the conversion history and the review velocity that made every later click cheaper.

Total spend across the 90 days was $5,830 against $10,385 of ad revenue, a blended 56% ACoS. Nobody would accept 56% as a steady state, but as an acquisition cost for a page-one ranking and 45 reviews it is cheap. From day 91 the same product runs at 28-32%.`,
    lessons: [
      "Launch ACoS is an investment line, not a performance line. Budget for it explicitly so nobody panics in week two.",
      "Listing quality is the ceiling on every bid you will ever place. Fix images, bullets and A+ content before the first campaign goes live.",
      "Vine reviews are not optional for a new ASIN. Three reviews and 45 reviews are two completely different conversion rates on the same product.",
      "Analyse search terms twice a week during launch. Weekly is fine for a mature account and far too slow for a new one.",
      "Do not raise the budget on a good day. Raise it after two consecutive profitable weeks, and raise it by no more than 50%.",
      "90 days is the minimum honest timeline for organic rank movement. Anyone promising page one in 30 days is buying it with money they will not admit to.",
    ],
    playbook: [
      {
        label: "SOP-04 Campaign launch",
        href: "/sops/campaign-launch",
        note: "The pre-launch checklist and day-one campaign build.",
      },
      {
        label: "Keyword research to optimisation loop",
        href: "/workflows/keyword-research-to-optimization",
        note: "The research-build-harvest cycle run twice a week here.",
      },
      {
        label: "Campaign build sheet",
        href: "/templates/campaign-build-sheet",
        note: "The three-campaign launch structure, bid by bid.",
      },
      {
        label: "Keyword research sheet",
        href: "/templates/keyword-research-sheet",
        note: "Where the five exact and ten phrase seed terms came from.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 04 */
  {
    id: "q4-black-friday-toys",
    title: "Toy brand Q4: $62,000 of revenue on a $13,640 peak-season budget",
    category: "Toys & Games",
    resultType: "scale",
    marketplace: "Amazon.com (US)",
    level: "advanced",
    minutes: 9,
    updated: UPDATED,
    summary:
      "October preparation, a staged November ramp, hourly management on Black Friday, and a disciplined December wind-down. Revenue up 148% year on year with ACoS down from 35% to 22%.",
    client:
      "Toy and games brand, 9 ASINs (building sets and puzzles), heavily seasonal — 61% of annual revenue lands between 1 November and 24 December.",
    timeframe: "Q4 — 1 October to 31 December",
    adSpend: "$13,640 across the quarter, peaking at $1,020 on Black Friday",
    tags: ["seasonal", "q4", "budget", "sponsored brands", "dayparting"],
    challenge: `The previous Q4 had done $25,000 of ad revenue on $8,750 of spend — a 35% ACoS — and the account had run out of budget on Black Friday morning at 9:40am. Campaigns were capped for the highest-converting six hours of the year.

The brief for this quarter was simple to say and hard to execute: spend more, earlier, on a structure built in October, and never run out of budget on a peak day.

- **Ran out of budget** by mid-morning on the previous Black Friday
- **No seasonal campaigns** — the same evergreen keywords ran all year
- **No brand defence** while three competitors bid on the brand name every December
- **Bids raised reactively** in the last week of November, when CPCs had already doubled
- **No wind-down plan** — January spend ran at December levels into a dead market`,
    approach: [
      "October — Build 15 seasonal campaigns before the traffic arrives: gift-intent terms ('gift for 6 year old boy'), deal terms ('black friday building set', 'cyber monday puzzle'), and occasion terms. Launch them at low bids in week one of October so they have a conversion history before 1 November.",
      "October — Set the budget split for the quarter and write it down: brand defence 10%, competitor product targeting 20%, seasonal keywords 40%, evergreen 30%. Every mid-quarter decision gets checked against this.",
      "October — Drop baseline bids to 80% of their normal level. You need headroom to raise bids by 50-100% in November without doubling the account's cost per click.",
      "1-15 November — Ramp: daily budget from $150 to $300, bids up 15% a week, Top of Search modifier from 0% to +25%. Check budget utilisation every morning; any campaign hitting 100% before 6pm gets a raise the same day.",
      "16-24 November — Aggressive: $500 a day, bids +50% on the eleven keywords with a conversion rate above 14%, Top of Search +75%, and the Sponsored Brands video with holiday creative goes live.",
      "25 November (Black Friday) — Peak: $1,000 day budget, bids +100% on proven terms, and hourly checks from 6am to 11pm on budget utilisation and CPC. Two campaigns needed an in-day budget lift at 11am and 4pm.",
      "26 November - 1 December — Sustain through Cyber Monday at peak bids, then begin the taper on 2 December.",
      "2-31 December — Wind down 20% a week to 15 December, then hold brand defence only through to the 31st. Write the Q4 retrospective in the first week of January while the search term data is still fresh.",
    ],
    metrics: [
      { label: "Q4 ad revenue", before: 25000, after: 62000, unit: "$", better: "higher" },
      { label: "ACoS", before: 35, after: 22, unit: "%", better: "lower" },
      { label: "Q4 ad spend", before: 8750, after: 13640, unit: "$", better: "higher" },
      { label: "ROAS", before: 2.86, after: 4.55, unit: "x", better: "higher" },
      { label: "Black Friday revenue", before: 1900, after: 6000, unit: "$", better: "higher" },
      { label: "Peak daily budget", before: 150, after: 1000, unit: "$", better: "higher" },
      { label: "Top-of-search impression share", before: 18, after: 41, unit: "%", better: "higher" },
    ],
    timeline: [
      point("Oct 1-15", 900, 3600),
      point("Oct 16-31", 1000, 3850),
      point("Nov 1-15", 2250, 9000),
      point("Nov 16-24", 2600, 11300),
      point("Nov 25 (BF)", 1020, 6000),
      point("Nov 26-Dec 1", 2400, 12600),
      point("Dec 2-15", 2200, 10450),
      point("Dec 16-31", 1270, 5200),
    ],
    results: `Q4 ad revenue rose from $25,000 to $62,000 — up 148% — on $13,640 of spend, a 56% budget increase. Quarter ACoS came in at 22.0% against 35% the year before, and return on ad spend went from 2.86x to 4.55x.

Black Friday itself did $6,000 of ad revenue on $1,020 of spend, a 17.0% ACoS — the most efficient day of the entire quarter. That is the whole argument for October preparation: on the day when everyone else is raising bids into cold campaigns, the seasonal campaigns built in early October already had six weeks of conversion history and were being served cheaply.

The six days from 26 November to 1 December produced $12,600, more than Black Friday and Cyber Monday combined in the previous year. The wind-down held December ACoS at 21-24% instead of the 40%+ the account had posted the previous January.`,
    lessons: [
      "Q4 preparation starts in October. Campaigns launched on 1 November have no conversion history on the day it matters most.",
      "Drop baseline bids in October so you have somewhere to raise from. Doubling an already-high bid on Black Friday just buys the same clicks for twice the money.",
      "Budget needs to be 2-3x normal during the peak fortnight, and it needs an in-day escalation rule so nobody has to wait for approval at 11am on Black Friday.",
      "Brand defence is not optional in Q4. Competitor spend on your brand terms roughly doubles between 20 November and 5 December.",
      "Plan the wind-down at the same time as the ramp. December 26 to January 15 is where unmanaged accounts give back a third of the quarter's profit.",
      "Write the retrospective in the first week of January. Next year's October plan is built from this year's Q4 search term report.",
    ],
    playbook: [
      {
        label: "Seasonal preparation workflow",
        href: "/workflows/seasonal-preparation",
        note: "The October-to-January calendar this quarter followed.",
      },
      {
        label: "SOP-01 Daily health check",
        href: "/sops/daily-health-check",
        note: "Run hourly instead of daily on 25 and 26 November.",
      },
      {
        label: "Ad types cheat sheet",
        href: "/cheat-sheets/ad-types",
        note: "Sponsored Brands video specs used for the holiday creative.",
      },
      {
        label: "Monthly report template",
        href: "/templates/monthly-report-template",
        note: "Adapted into the Q4 retrospective delivered in January.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 05 */
  {
    id: "multi-product-account-restructure",
    title: "52 campaigns to 15: the restructure that halved ACoS on the same budget",
    category: "Home & Decor",
    resultType: "efficiency",
    marketplace: "Amazon.com (US)",
    level: "advanced",
    minutes: 8,
    updated: UPDATED,
    summary:
      "An account with 52 campaigns on $1.50 daily budgets, no naming convention and no negatives. Consolidating to 15 properly funded campaigns doubled sales on identical spend and cut management time by two thirds.",
    client:
      "Home decor seller, 12 products (mirrors, shelving, candle holders), $2,000 a month advertising budget, managed part-time by the owner before handover.",
    timeframe: "4 weeks of restructuring, measured at 14 weeks",
    adSpend: "$1,980 a month before, $1,988 a month after — deliberately unchanged",
    tags: ["restructure", "structure", "efficiency", "naming", "portfolios"],
    challenge: `Fifty-two campaigns, each with a $1-2 daily budget. At $0.95 a click that is one or two clicks a day per campaign — far below the volume needed for Amazon's algorithm to learn anything, and far below the volume a human needs to make a decision.

Worse, the same keywords appeared in six different campaigns. The account was its own competition, and every duplicate bid pushed its own CPC up.

- **52 campaigns** averaging $1.50 a day each
- **No naming convention** — campaigns called "Campaign 3 copy" and "test new"
- **Auto and manual mixed** inside the same campaign with no negatives between them
- **No portfolios**, so no way to cap spend by product line
- **8 campaigns** with zero impressions in the last 30 days, still technically live
- **15 hours a week** of management time for a $2,000 budget`,
    approach: [
      "Week 1 — Catalogue all 52 campaigns in one sheet: name, type, targeting, budget, 30-day impressions, clicks, spend, orders, sales, ACoS. Do not change anything yet; the sheet is the deliverable for week one.",
      "Week 1 — Classify each campaign: keep (12 with usable data), merge (32 with thin but relevant data), kill (8 with zero impressions in 30 days). Export the search terms from every campaign in the kill and merge lists before touching them.",
      "Week 1 — Write the restructuring proposal for the client: the target structure, the migration order, and the explicit statement that spend will not increase. Approval before execution is what stops a mid-restructure panic.",
      "Week 2 — Consolidate to 15 campaigns: three portfolios (top three sellers at 60% of budget, growth products at 30%, testing at 10%), each product group getting one auto, one exact and one phrase campaign.",
      "Week 2 — Apply the naming convention to every campaign: [Product]_[Type]_[MatchType], e.g. 'RoundMirror_SP_Exact'. A campaign you cannot identify from its name is a campaign you will misread in a report.",
      "Week 3 — Build two shared negative keyword lists — one for irrelevant themes, one for cross-campaign de-duplication — and attach them to every campaign so a single addition propagates account-wide.",
      "Week 3 — Set the bid rules against each portfolio's ACoS target (top sellers 25%, growth 35%, testing 60%) and set up the auto-to-manual harvest flow so graduating terms are negated in the source campaign automatically.",
      "Week 4 — Document everything: an SOP for the weekly routine, the naming convention, the negative list ownership, and a one-page weekly reporting template the client reads in two minutes.",
    ],
    metrics: [
      { label: "Active campaigns", before: 52, after: 15, better: "lower" },
      { label: "ACoS", before: 55, after: 28, unit: "%", better: "lower" },
      { label: "Monthly ad revenue", before: 3600, after: 7100, unit: "$", better: "higher" },
      { label: "Average daily budget per campaign", before: 1.5, after: 4.5, unit: "$", better: "higher" },
      { label: "ROAS", before: 1.82, after: 3.57, unit: "x", better: "higher" },
      { label: "Management time", before: 15, after: 5, unit: " hrs/week", better: "lower" },
      { label: "Campaigns with no impressions in 30 days", before: 8, after: 0, better: "lower" },
    ],
    timeline: [
      point("Wk 1-2", 990, 1800),
      point("Wk 3-4", 970, 1940),
      point("Wk 5-6", 980, 2180),
      point("Wk 7-8", 990, 2475),
      point("Wk 9-10", 995, 2845),
      point("Wk 11-12", 1000, 3230),
      point("Wk 13-14", 994, 3550),
    ],
    results: `Monthly ad revenue went from $3,600 to $7,100 on effectively identical spend — $1,980 before, $1,988 after. ACoS halved from 55% to 28% and ROAS went from 1.82x to 3.57x.

The mechanism is not mysterious. Fifteen campaigns at $4.50 a day each get four to five clicks a day, which is enough for Amazon's placement algorithm to optimise and enough for a human to see a pattern within a fortnight. Fifty-two campaigns at $1.50 a day get one click each and never leave the learning phase.

The number the client noticed most was the management time: 15 hours a week down to 5. That is not a soft benefit — at a VA rate of $8 an hour it is $320 a month, which is 16% of the ad budget recovered as labour.`,
    lessons: [
      "More campaigns is not more control. Below roughly $10 a day, a campaign never gathers enough data to be optimised.",
      "Consolidate before you optimise. Bid changes on a fragmented account move numbers that do not mean anything.",
      "A naming convention is worth an hour of setup and saves an hour a week forever. [Product]_[Type]_[MatchType] is enough.",
      "Shared negative lists beat per-campaign negatives. One addition, account-wide effect, no drift between campaigns.",
      "Get the restructure approved in writing with the explicit note that spend will not rise. Performance dips for the first ten days of any rebuild and the client needs to have agreed to that in advance.",
      "Kill campaigns with zero impressions. They cost nothing in spend and a great deal in attention.",
    ],
    playbook: [
      {
        label: "SOP-05 Campaign restructuring",
        href: "/sops/campaign-restructuring",
        note: "The four-week sequence this study follows step for step.",
      },
      {
        label: "Campaign structure decision tree",
        href: "/workflows/campaign-structure-decision-tree",
        note: "How the 15-campaign target structure was chosen.",
      },
      {
        label: "Campaign structure cheat sheet",
        href: "/cheat-sheets/campaign-structure",
        note: "Naming conventions and minimum viable budgets.",
      },
      {
        label: "Campaign audit checklist",
        href: "/templates/campaign-audit-checklist",
        note: "The week-one catalogue of all 52 campaigns.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 06 */
  {
    id: "competitor-conquesting-cosmetics",
    title: "Cosmetics brand: taking 7 points of category share with product targeting",
    category: "Beauty & Cosmetics",
    resultType: "scale",
    marketplace: "Amazon.com (US)",
    level: "advanced",
    minutes: 9,
    updated: UPDATED,
    summary:
      "Six months of deliberate conquesting: competitor ASIN targeting, Sponsored Brands headlines against competitor brand terms, and a brand defence layer to protect the flank. Market share 5% to 12% and new-to-brand orders from 30% to 55%.",
    client:
      "Colour cosmetics brand, 22 SKUs (lip and complexion), $18,000 a month in ad revenue at the start, competing against three entrenched brands in a category where the top three ASINs held 47% of page-one clicks.",
    timeframe: "6 months",
    adSpend: "$6,840 a month at the start, $11,960 a month at the end",
    tags: ["competitors", "product targeting", "sponsored brands", "market share"],
    challenge: `The brand had a genuinely better product — higher review rating, better ingredient list, comparable price — and 5% of the category. The three market leaders were not better; they were simply the default.

Conquesting is the only advertising play that changes that, and it is the slowest one. Product targeting on a competitor ASIN converts at roughly half the rate of a branded keyword because you are interrupting a shopper who has already chosen. It only works if your listing wins the comparison on the detail page.

- **5% category share** against three competitors holding 47% of page-one clicks
- **No product targeting** anywhere in the account
- **No brand defence** — competitors were bidding on the brand name unopposed
- **70% of orders** from existing customers; new-customer acquisition had stalled
- **Organic rank #8** on the category head term`,
    approach: [
      "Month 1 — Identify the top three competitor ASINs by search-volume-weighted page-one presence, then build a comparison sheet: price, review count, review rating, main image quality, A+ content, video. The gaps you find are the ad copy.",
      "Month 1 — Launch one Sponsored Products product-targeting campaign per competitor ASIN, kept separate so each can be judged on its own. Starting bid 20% above the category's average CPC, capped at a 60% ACoS for the first 60 days.",
      "Month 1 — Launch brand defence before conquesting goes live, not after. Exact-match campaign on every brand term and misspelling at a 10% ACoS target. Conquesting invites retaliation.",
      "Month 2-3 — Add Sponsored Brands headline campaigns targeting competitor brand terms, sending traffic to a curated Store page rather than a single product, so the comparison happens on ground you control.",
      "Month 2-3 — Rebuild the A+ content as a feature comparison against 'other leading brands' — never naming a competitor, which Amazon will reject — and add a 15-second product video to the gallery.",
      "Month 3-4 — Prune ruthlessly. Any competitor ASIN target above a 60% ACoS after 60 days and 40 clicks gets paused. Two of the original three targets survived; the third was replaced by two smaller competitors with weaker listings.",
      "Month 4-6 — Track the metric that actually proves conquesting works: new-to-brand order share, reported monthly. Ordinary ACoS will always make conquesting look mediocre because it ignores the customer you just took.",
      "Month 4-6 — Reinvest the organic rank gain. As the head term moved from #8 to #3, exact-match bids on that term were cut 30% because organic placement was already capturing the click.",
    ],
    metrics: [
      { label: "Category market share", before: 5, after: 12, unit: "%", better: "higher" },
      { label: "New-to-brand order share", before: 30, after: 55, unit: "%", better: "higher" },
      { label: "Organic rank, category head term", before: 8, after: 3, better: "lower" },
      { label: "ACoS", before: 38, after: 26, unit: "%", better: "lower" },
      { label: "Monthly ad revenue", before: 18000, after: 46000, unit: "$", better: "higher" },
      { label: "Share of spend on product targeting", before: 0, after: 34, unit: "%", better: "higher" },
      { label: "Average CPC on conquesting targets", before: 1.42, after: 1.18, unit: "$", better: "lower" },
    ],
    timeline: [
      point("Month 1", 6840, 18000),
      point("Month 2", 7420, 20600),
      point("Month 3", 8250, 25000),
      point("Month 4", 9300, 31000),
      point("Month 5", 10600, 38000),
      point("Month 6", 11960, 46000),
    ],
    results: `Category share went from 5% to 12% over six months, and new-to-brand orders went from 30% of the total to 55%. Ad revenue rose from $18,000 to $46,000 a month while ACoS fell from 38% to 26%.

The ACoS improvement is mostly not the conquesting campaigns — those settled at 41%. It comes from the organic rank move from #8 to #3 on the head term, which let the account cut its most expensive exact-match bid by 30% and still capture the click. Conquesting increased sales velocity, velocity moved rank, and rank paid for the conquesting.

The conquesting campaigns did not turn profitable on a first-order basis until month four. Anyone judging them on ACoS in month two would have shut them down before the mechanism had a chance to work.`,
    lessons: [
      "Conquesting needs six months and a client who has agreed to six months. Judge it monthly on new-to-brand share, not weekly on ACoS.",
      "A better listing beats a higher bid. If your detail page does not win the comparison, product targeting just pays to send shoppers back to the competitor.",
      "Launch brand defence before you start conquesting. The retaliation is real and it lands within a fortnight.",
      "Never name a competitor in your copy. Amazon rejects it, and 'other leading brands' converts just as well.",
      "Report new-to-brand order share every month. It is the only metric that shows conquesting doing its job.",
      "Cut the exact-match bid when organic rank arrives. Paying full price for a click you would have won for free is the most common leak in a successful account.",
    ],
    playbook: [
      {
        label: "Ad types cheat sheet",
        href: "/cheat-sheets/ad-types",
        note: "When Sponsored Brands beats Sponsored Products for conquesting.",
      },
      {
        label: "SOP-03 Bid optimisation",
        href: "/sops/bid-optimization",
        note: "The 60-day, 40-click pruning rule applied to ASIN targets.",
      },
      {
        label: "A/B testing process",
        href: "/workflows/ab-testing-process",
        note: "How the A+ comparison module and gallery video were tested.",
      },
      {
        label: "Monthly report template",
        href: "/templates/monthly-report-template",
        note: "Extended with a new-to-brand share row for this client.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 07 */
  {
    id: "sportswear-seasonal-scaling",
    title: "Sportswear: funding the January peak without bleeding through the summer",
    category: "Apparel & Sportswear",
    resultType: "scale",
    marketplace: "Amazon.com (US)",
    level: "advanced",
    minutes: 10,
    updated: UPDATED,
    summary:
      "A flat monthly budget on a violently seasonal catalogue: capped out by 11am every January, and burning 51% ACoS every July. Twelve months of seasonal budgeting and variation consolidation took off-season ACoS to 25% and doubled the January peak.",
    client:
      "Sportswear brand, 34 parent ASINs (compression wear, running tights, training tops) each with four sizes and three colours, $339,500 in ad revenue over the engagement year.",
    timeframe: "12 months (July to June, a full seasonal cycle)",
    adSpend: "$4,900 in the first month, $16,800 at the January peak, $105,800 for the year",
    tags: ["seasonal", "scaling", "variations", "budget", "apparel"],
    challenge: `Apparel demand is not smooth. This catalogue does 34% of its annual units in January and September combined, and barely covers its advertising costs in June and July.

The account was funded as if none of that were true: a flat $8,000-a-month budget, set once, never revisited. In January every campaign hit its cap before lunch and the brand spent the highest-converting fortnight of the year invisible after 11am. In July the same budget chased demand that did not exist, at 51% ACoS.

The second problem was the catalogue shape. Each style had twelve child ASINs, and the previous setup advertised child ASINs individually. Fifty-two variations were spending under $0.50 a day each — statistically meaningless, collectively 14% of the budget.

- **Flat monthly budget** on a catalogue with a 4:1 seasonal swing
- **Budget exhausted before noon** on 18 days of the January peak
- **51% ACoS in the off-season** against a 31% break-even
- **52 child ASINs** advertised individually below $0.50 a day
- **No demand forecast** — nobody had plotted the account's own unit history by month`,
    approach: [
      "Month 1 — Build the seasonality table before touching a campaign. Export 24 months of the Business Report 'Detail Page Sales and Traffic by Child Item', pivot units by month and by style, and label each month peak, shoulder or trough. This account: January and September peak, November and December shoulder, June and July trough.",
      "Month 1 — Reset the budget model from flat monthly to a seasonal index. Set the trough month as index 1.0 ($4,900) and scale every other month against its own unit history: September 2.0x, January 3.4x, shoulder months 1.8-2.3x. Load the whole twelve months into a sheet the client approves once.",
      "Month 1-2 — Consolidate the variations. Advertise at parent level for discovery campaigns and keep child-level targeting only for the six best-selling size-colour combinations that individually clear $10 a day. The other 46 variations still sell; they just stop having their own campaigns.",
      "Month 2 — Split the account into two portfolios: 'Evergreen' (year-round core styles, steady bids, 28% ACoS target) and 'Seasonal' (peak-only styles and gift-intent terms, active October to February, 34% target). Only the seasonal portfolio's budget moves with the index.",
      "Month 2-3 — Build the peak campaigns in the shoulder month, not the peak month. September's campaigns were built in July and ran at 20% bids through August so they entered September with conversion history instead of a cold start.",
      "Month 4-6 — Install the peak-day budget rule: any campaign at 90% budget utilisation before 2pm gets a 30% same-day lift, capped at the monthly index. Written down, pre-approved, executed by the VA without waiting for the client.",
      "Month 7-9 — Cut the trough hard. June and July budgets drop to index 1.0, all discovery campaigns pause, and only the top-quartile exact keywords stay live. Off-season is for defending profitable terms, not for finding new ones.",
      "Month 10-12 — Review the index against actuals and rewrite it for next year. Two styles had moved seasons (a running tight became a year-round seller); their index rows were rebuilt from the last twelve months rather than the previous plan.",
    ],
    metrics: [
      { label: "Off-season ACoS (July vs June)", before: 51, after: 25, unit: "%", better: "lower" },
      { label: "Monthly ad revenue (July vs June)", before: 9600, after: 21600, unit: "$", better: "higher" },
      { label: "Blended ACoS, first half vs second half", before: 35.7, after: 28, unit: "%", better: "lower" },
      { label: "January peak ad revenue, year on year", before: 31000, after: 56000, unit: "$", better: "higher" },
      { label: "Peak days with budget gone before noon", before: 18, after: 0, better: "lower" },
      { label: "Conversion rate on the hero style", before: 9.4, after: 13.1, unit: "%", better: "higher" },
      { label: "Variations advertised below $0.50 a day", before: 52, after: 0, better: "lower" },
    ],
    timeline: [
      point("Jul", 4900, 9600),
      point("Aug", 5600, 12700),
      point("Sep", 9800, 26500),
      point("Oct", 8200, 24100),
      point("Nov", 11400, 35600),
      point("Dec", 9600, 30000),
      point("Jan", 16800, 56000),
      point("Feb", 11200, 39300),
      point("Mar", 8600, 30700),
      point("Apr", 7400, 27400),
      point("May", 6900, 26000),
      point("Jun", 5400, 21600),
    ],
    results: `The cleanest read on this account is July against June: two trough months, twelve months apart. Ad revenue went from $9,600 to $21,600 and ACoS from 51% to 25%. Same season, same weather, same demand — different structure.

Across the year the account spent $105,800 to earn $339,500, a 31.2% blended ACoS. Split in halves it is 35.7% for July-December against 28.0% for January-June, and the second half includes the most expensive month of the year.

January did $56,000 of ad revenue against $31,000 the previous January, on a budget that never ran out. The 18 days of pre-noon budget exhaustion went to zero, which is where most of that $25,000 came from: the brand was simply present for the whole day.

The variation consolidation is the least glamorous change and possibly the most valuable. Reclaiming 14% of the budget from 52 campaigns that could never gather data funded most of the September ramp.`,
    lessons: [
      "Plot your own account's unit history by month before you plan a budget. Category seasonality articles are a poor substitute for 24 months of your own data.",
      "A flat budget on a seasonal catalogue loses money twice — capped in the peak, wasted in the trough.",
      "Build peak campaigns in the shoulder month at low bids. A campaign entering its peak with six weeks of history is served more cheaply than one launched on day one of the season.",
      "Advertise parent ASINs for discovery and child ASINs only where the child can carry $10 a day on its own. Anything below $0.50 a day is a rounding error with a management cost.",
      "Write the peak-day budget escalation rule in advance and give the VA authority to execute it. Approval delays on a peak day cost more than a wrong decision.",
      "Cut the trough properly. Off-season is for defending the keywords you already own, not for discovery.",
    ],
    playbook: [
      {
        label: "Seasonal preparation workflow",
        href: "/workflows/seasonal-preparation",
        note: "The peak / shoulder / trough calendar and the ramp sequence.",
      },
      {
        label: "SOP-01 Daily health check",
        href: "/sops/daily-health-check",
        note: "Budget utilisation check that triggers the peak-day rule.",
      },
      {
        label: "Campaign structure cheat sheet",
        href: "/cheat-sheets/campaign-structure",
        note: "Parent versus child ASIN targeting and portfolio design.",
      },
      {
        label: "Campaign build sheet",
        href: "/templates/campaign-build-sheet",
        note: "Used to bulk-build the September and January peak campaigns.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 08 */
  {
    id: "automotive-parts-catalogue-coverage",
    title: "2,412 automotive ASINs: one bulk template, from 6% coverage to 90%",
    category: "Automotive",
    resultType: "efficiency",
    marketplace: "Amazon.com (US)",
    level: "expert",
    minutes: 10,
    updated: UPDATED,
    summary:
      "A parts catalogue too large to manage ASIN by ASIN, with 94% of it unadvertised and one catch-all auto campaign eating 62% of the budget at 71% ACoS. A fitment-driven bulk template took coverage to 2,180 ASINs and halved ACoS.",
    client:
      "Aftermarket automotive parts distributor: 2,412 active ASINs (brake pads, oil and cabin filters, wiper blades) across 180 vehicle fitments, roughly $310,000 a month in total sales, three staff on the Amazon channel.",
    timeframe: "5 months",
    adSpend: "$21,000 a month at the start, $27,500 a month at the end",
    tags: ["catalogue", "bulk operations", "long tail", "structure", "product targeting"],
    challenge: `Every technique that works on a 20-ASIN account fails at 2,400. You cannot write a campaign per product, you cannot review search terms product by product, and you cannot make bid decisions on ASINs that get eleven clicks a month each.

The previous approach had been to advertise the 140 best sellers and leave the rest. That is defensible until you notice that automotive demand is almost entirely long tail: nobody searches "brake pads", they search "2014 Honda Civic front ceramic brake pads". Each of those terms has tiny volume and enormous intent, and there are thousands of them.

Meanwhile a single catch-all auto campaign covering the whole catalogue was absorbing 62% of the budget at a 71% ACoS, because it was bidding one price on everything from a $9 wiper blade to a $140 brake kit.

- **140 of 2,412 ASINs** had any ad coverage at all
- **62% of spend** in one catch-all auto campaign at 71% ACoS
- **One bid** applied across products ranging from $9 to $140
- **Fitment keywords** — year, make, model, position — were almost entirely untargeted
- **No bulk process**: adding 100 new ASINs took a full working day`,
    approach: [
      "Month 1 — Segment the catalogue by economics, not by product type. Pull unit price, contribution margin and 90-day units for all 2,412 ASINs and bucket them into four tiers: A (margin over $25), B ($12-25), C ($5-12), D (under $5). Each tier gets its own ACoS target: 18%, 26%, 34% and 'do not advertise'.",
      "Month 1 — Kill the catch-all auto campaign in stages. Split it into four auto campaigns, one per tier, each with its own bid and budget. Spend in the catch-all dropped from 62% of the account to 24% in three weeks with no loss of revenue.",
      "Month 2 — Build the fitment keyword generator in Sheets: a year column (2008-2026), a make and model column from the fitment table, and a part-type column, concatenated into exact keywords. 180 fitments x 6 part types x an average of four model years produced 4,320 candidate terms; volume filtering kept 1,240.",
      "Month 2 — Write the campaign template once and apply it 74 times with a bulk sheet: per part-type-and-tier, one auto, one manual exact carrying that tier's fitment keywords, and one product-targeting campaign on the equivalent competitor ASINs.",
      "Month 3 — Move to portfolio-level budget control. With 74 campaigns, per-campaign budget management is not feasible; four portfolios (one per tier) with monthly caps gave the same control in a tenth of the time.",
      "Month 3-4 — Automate the weekly search term harvest with a bulk-operations routine: download the report, filter for terms with 2+ orders and an ACoS below tier target, and generate the add-keyword bulk rows in the same sheet. Thirty minutes a week for the whole catalogue.",
      "Month 4 — Apply negatives at the portfolio level rather than the campaign level. One shared list per tier, one place to add a term, immediate effect across every campaign in that tier.",
      "Month 5 — Document the ASIN onboarding routine: a new ASIN is assigned a tier, appended to the fitment sheet, and added to the next weekly bulk upload. Time to full ad coverage for 100 new ASINs went from a working day to 45 minutes.",
    ],
    metrics: [
      { label: "ACoS", before: 57.1, after: 25, unit: "%", better: "lower" },
      { label: "ASINs with ad coverage", before: 140, after: 2180, better: "higher" },
      { label: "Monthly ad revenue", before: 36800, after: 110000, unit: "$", better: "higher" },
      { label: "Share of spend in the catch-all auto campaign", before: 62, after: 8, unit: "%", better: "lower" },
      { label: "Average CPC", before: 0.96, after: 0.71, unit: "$", better: "lower" },
      { label: "Fitment keywords targeted", before: 0, after: 1240, better: "higher" },
      { label: "Time to advertise 100 new ASINs", before: 8, after: 0.75, unit: " hrs", better: "lower" },
    ],
    timeline: [
      point("Mth 1a", 10500, 18400),
      point("Mth 1b", 10500, 19800),
      point("Mth 2a", 11200, 23300),
      point("Mth 2b", 11800, 27400),
      point("Mth 3a", 12400, 32600),
      point("Mth 3b", 12900, 37900),
      point("Mth 4a", 13200, 42600),
      point("Mth 4b", 13500, 46600),
      point("Mth 5a", 13700, 50700),
      point("Mth 5b", 13750, 55000),
    ],
    results: `Monthly ad revenue went from $36,800 to $110,000 — three times the volume — on a 31% budget increase, and ACoS came down from 57.1% to 25.0%.

Almost all of the new revenue came from ASINs that had never been advertised. Coverage went from 140 to 2,180 ASINs, and the tail ASINs converted at 11.8% against 7.2% for the head, because a shopper typing a year, make, model and part position is not browsing — they know exactly what they need and they are checking fitment.

Average CPC fell from $0.96 to $0.71 despite higher total spend. Long-tail fitment keywords are cheap precisely because they are specific; the previous structure had been buying broad category clicks at three times the price of the terms that actually convert.

The operational number matters as much as the financial one. Advertising 100 new ASINs went from eight hours to 45 minutes, which is what makes the structure survivable when the distributor adds 300 SKUs in a quarter.`,
    lessons: [
      "Segment a large catalogue by margin, not by product category. A $9 wiper blade and a $140 brake kit cannot share an ACoS target or a bid.",
      "One catch-all auto campaign over a big catalogue is always the most expensive line in the account. Split it by tier and the spend redistributes itself.",
      "In fitment-driven categories the long tail is the business. Generate keywords systematically — year x make x model x part type — rather than researching them one at a time.",
      "At 74 campaigns, manage budgets at portfolio level and negatives at shared-list level. Per-campaign management does not scale past about 25 campaigns.",
      "Write the campaign template once and apply it with bulk sheets. If onboarding 100 ASINs takes a day, the catalogue will always be under-advertised.",
      "Measure coverage as a metric in its own right. 'Percentage of revenue-generating ASINs with ad coverage' finds more money in a large account than any bid change.",
    ],
    playbook: [
      {
        label: "Search term harvesting workflow",
        href: "/workflows/search-term-harvesting",
        note: "Automated into a weekly bulk-sheet routine at this scale.",
      },
      {
        label: "Bulk operations and tooling cheat sheet",
        href: "/cheat-sheets/tools",
        note: "The bulk-sheet columns used to apply the template 74 times.",
      },
      {
        label: "DIY Sheets automation",
        href: "/automation/diy-sheets-automation",
        note: "The keyword generator and harvest sheet built for this account.",
      },
      {
        label: "Campaign structure decision tree",
        href: "/workflows/campaign-structure-decision-tree",
        note: "Tiering logic behind the four-portfolio structure.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 09 */
  {
    id: "supplement-sponsored-brands-video",
    title: "Sleep supplement: Sponsored Brands video as the account's second engine",
    category: "Supplements",
    resultType: "expansion",
    marketplace: "Amazon.com (US)",
    level: "intermediate",
    minutes: 9,
    updated: UPDATED,
    summary:
      "96% of spend sat in Sponsored Products while head-term CPCs climbed from $1.70 to $2.60 in a year. Adding Sponsored Brands video — three creatives, tested properly — took blended ACoS from 41% to 26% and new-to-brand orders from 22% to 48%.",
    client:
      "Single-brand sleep and magnesium supplement seller, 9 ASINs, $84,000 a month in total sales, 4.5 stars across 2,100 reviews, Brand Registry enrolled with an unused Store.",
    timeframe: "4 months",
    adSpend: "$18,400 a month at the start, $24,900 a month at the end",
    tags: ["sponsored brands", "video", "creative", "new to brand", "cpc"],
    challenge: `The account was not broken. It was stuck. Sponsored Products had been optimised for two years and there was nothing left to squeeze: the keyword list was clean, the negatives were current, the bids were correct.

The ceiling was the auction. Head-term CPCs in the sleep supplement category had gone from $1.70 to $2.60 in twelve months, and every extra dollar of budget bought a click that was slightly worse than the last. Impression share on the top ten keywords was already 71%; there was no more of that inventory to buy.

- **96% of ad spend** in Sponsored Products
- **Head-term CPC up 53%** year on year, from $1.70 to $2.60
- **Blended ACoS stuck at 41%** for three consecutive quarters
- **Zero video creative** anywhere in the account
- **A Brand Store built and never used** — no traffic, no campaign pointing at it
- **New-to-brand orders at 22%**, meaning most spend was buying repeat customers who would have returned anyway`,
    approach: [
      "Month 1 — Establish the baseline properly before adding anything. Record 90 days of Sponsored Products performance by keyword, and pull the new-to-brand order percentage, because that is the metric video is supposed to move.",
      "Month 1 — Produce three video creatives against three different jobs, all shot on a phone with a $0 budget: a 15-second problem-solution ('can't switch off at night'), a 20-second product demo showing the dose and the capsule size, and a 22-second social-proof edit built from review screenshots and B-roll.",
      "Month 1 — Launch one Sponsored Brands video campaign per creative on the same eight head keywords, equal budgets, Down Only bidding, so the creative is the only variable. Never test creative and targeting in the same campaign.",
      "Month 2 — Read the test at 5,000 impressions per creative, not before. The problem-solution video took a 1.68% CTR against 0.94% for the demo and 0.71% for social proof; the two losers were paused and their budget moved to the winner.",
      "Month 2 — Point the winning campaign at the Brand Store rather than a single product page. Shoppers arriving from video are earlier in the decision than shoppers arriving from an exact keyword, and a store page converts that intent better than a detail page.",
      "Month 2-3 — Rebalance the budget deliberately: hold Sponsored Products at its current spend rather than cutting it, and fund Sponsored Brands video with the increase. This keeps the test honest — any revenue gain is incremental, not moved.",
      "Month 3 — Add a Sponsored Brands video campaign on competitor brand terms, which is where video's cost advantage is largest: the video slot on a competitor term averaged $1.34 CPC against $2.60 for the Sponsored Products keyword.",
      "Month 4 — Layer Sponsored Display retargeting on video viewers. Video creates consideration; the retargeting closes it, and the two together lifted new-to-brand orders more than either did alone.",
    ],
    metrics: [
      { label: "Blended ACoS", before: 41.1, after: 26, unit: "%", better: "lower" },
      { label: "Share of spend in Sponsored Brands video", before: 0, after: 31, unit: "%", better: "higher" },
      { label: "Blended click-through rate", before: 0.41, after: 0.83, unit: "%", better: "higher" },
      { label: "New-to-brand order share", before: 22, after: 48, unit: "%", better: "higher" },
      { label: "Monthly ad revenue", before: 44800, after: 95800, unit: "$", better: "higher" },
      { label: "Average CPC, head terms", before: 2.6, after: 2.14, unit: "$", better: "lower" },
      { label: "ROAS", before: 2.43, after: 3.85, unit: "x", better: "higher" },
    ],
    timeline: [
      point("Mth 1a", 9200, 22400),
      point("Mth 1b", 9400, 23500),
      point("Mth 2a", 10100, 26600),
      point("Mth 2b", 10900, 30300),
      point("Mth 3a", 11500, 34800),
      point("Mth 3b", 12000, 39300),
      point("Mth 4a", 12300, 43900),
      point("Mth 4b", 12450, 47900),
    ],
    results: `Blended ACoS fell from 41.1% to 26.0% and monthly ad revenue more than doubled, from $44,800 to $95,800, on a 35% budget increase.

The mechanism is cost per click, not conversion rate. Sponsored Brands video on the same head keywords ran at a $1.51 average CPC against $2.60 for the Sponsored Products keyword — video inventory is simply less contested. Conversion rate on video traffic was slightly *worse* (7.9% against 9.4%), and it still won comfortably because the click cost 42% less.

New-to-brand orders went from 22% to 48% of the total. That is the number that changed the client's mind about the budget increase: the account was no longer mostly paying to reacquire people who already knew the brand.

Sponsored Products revenue did not fall. On flat Sponsored Products spend it actually grew, from $44,800 to $52,300 a month, as the video campaigns fed branded and semi-branded searches back into the keyword campaigns. Sponsored Brands video supplied the other $43,500 at a 17.7% ACoS. That split is the evidence the client asked for: the video revenue was incremental, not reallocated.`,
    lessons: [
      "When Sponsored Products is fully optimised, the next gain is a new placement, not a better bid. There is a ceiling on any single ad type.",
      "Video CPCs in most categories sit 30-50% below Sponsored Products CPCs on the same keyword. That gap is the whole opportunity.",
      "Test one variable at a time — three creatives, one keyword set, equal budgets — and read the result at 5,000 impressions per variant. Calling it at 800 is how accounts end up running the wrong video for a quarter.",
      "A phone-shot 15-second video beats no video. Production value matters far less than showing the problem in the first three seconds.",
      "Send video traffic to the Brand Store, not a detail page. The shopper is earlier in the decision and wants to see the range.",
      "Hold the existing ad type's budget flat while testing a new one. It is the only way to prove the new revenue is incremental.",
    ],
    playbook: [
      {
        label: "Ad types cheat sheet",
        href: "/cheat-sheets/ad-types",
        note: "Sponsored Brands video specs, placements and eligibility.",
      },
      {
        label: "A/B testing process",
        href: "/workflows/ab-testing-process",
        note: "The three-creative test design and the 5,000-impression rule.",
      },
      {
        label: "A/B test tracker",
        href: "/templates/ab-test-tracker",
        note: "Where the creative test was logged and called.",
      },
      {
        label: "SOP-06 Monthly performance report",
        href: "/sops/monthly-performance-report",
        note: "Extended with a new-to-brand and ad-type split for this client.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 10 */
  {
    id: "subscribe-and-save-coffee",
    title: "Subscribe & Save coffee: paying more for the first order, earning eleven more",
    category: "Grocery & Consumables",
    resultType: "scale",
    marketplace: "Amazon.com (US)",
    level: "expert",
    minutes: 10,
    updated: UPDATED,
    summary:
      "An account optimised to a 28% ACoS that ignored repeat purchase entirely. Raising the allowed first-order ACoS to 46% on subscription-prone SKUs looked worse for eight weeks, then took blended ACoS to 24% and the subscriber base from 1,840 to 4,610.",
    client:
      "Single-origin coffee roaster, 6 SKUs in 12oz and 2lb bags, $47,000 a month in total sales, 41% of units already shipping on Subscribe & Save.",
    timeframe: "6 months",
    adSpend: "$9,600 a month at the start, $15,300 a month at the end",
    tags: ["subscribe and save", "ltv", "consumables", "retention", "acos"],
    challenge: `The account had one rule — keep ACoS under 28% — and it was being followed perfectly. It was also the wrong rule.

Coffee is a consumable. A customer acquired onto Subscribe & Save orders roughly every five weeks and stays for an average of eleven deliveries. Judging that customer on the profit of their first bag is like judging a gym on the first month's membership.

The specific damage: the 2lb bag had a worse first-order ACoS than the 12oz bag, so the previous VA had cut its bids by 40%. The 2lb bag was also the SKU with by far the highest subscription attach rate. The account had systematically defunded its best customers.

- **A single 28% ACoS rule** applied to every SKU regardless of repeat behaviour
- **Bids cut 40% on the 2lb bag**, the highest-LTV SKU in the catalogue
- **No LTV number existed** — nobody could justify a higher bid because nobody had calculated the return
- **Subscribers lost to stock-outs**: 22 days of out-of-stock on subscription SKUs in the prior quarter
- **Subscribe & Save at 41% of units** and flat for three quarters`,
    approach: [
      "Month 1 — Calculate the number that unlocks everything else. Pull twelve months of Subscribe & Save order data, count deliveries per subscriber before cancellation, multiply by contribution margin per delivery. Result: $118 of lifetime contribution per subscriber against $34 for a one-off buyer.",
      "Month 1 — Convert LTV into an allowed acquisition cost and then into an ACoS ceiling. At $118 of lifetime contribution and a 50% payback rule, the account can pay $59 to acquire a subscriber — but that allowance is spread across all eleven deliveries, and the ad is only ever credited with the first one. Cap the day-one cash risk instead: $12.88 of spend on a $28 first order is a 46% first-order ACoS, not 28%, and the remaining $46 of the allowance is earned back from delivery two onward.",
      "Month 1-2 — Split the account by subscription propensity, not by product. SKUs and keywords with above-average subscription attach (2lb bags, 'monthly coffee', 'coffee subscription', 'bulk coffee beans') move into a 'Subscription' portfolio at the 46% target. Gift-intent and single-bag terms stay at 28%.",
      "Month 2 — Raise bids on the subscription portfolio in three steps of 15% rather than one step of 46%, checking impression share and CPC after each. Amazon's auction responds badly to sudden large bid moves and you will overpay for the first fortnight.",
      "Month 2-3 — Fix the stock problem before it eats the gains. A subscriber lost to an out-of-stock does not resubscribe; they buy a competitor's bag. Set a 45-day cover minimum on subscription SKUs and add an inventory row to the daily health check.",
      "Month 3-4 — Add a Sponsored Display retargeting campaign on 'purchased in the last 60 days' for the 12oz buyers, promoting the 2lb subscription. This is the cheapest subscriber acquisition in the account: a customer who already likes the coffee.",
      "Month 4-5 — Report on cohorts, not months. Build a sheet where each acquisition month is a row and each subsequent month is a column of repeat revenue, so the client can see month-one cohorts still paying in month five.",
      "Month 5-6 — Re-derive the ceiling. With better retention data the subscriber LTV had risen to $131, and the same day-one rule scaled to $14.28 of spend per first order — a 51% ceiling — on the two best SKUs. The rule is recalculated quarterly, not set once.",
    ],
    metrics: [
      { label: "Allowed first-order ACoS", before: 28, after: 46, unit: "%", better: "higher" },
      { label: "Blended ACoS", before: 28.1, after: 24, unit: "%", better: "lower" },
      { label: "Monthly ad revenue", before: 34200, after: 63800, unit: "$", better: "higher" },
      { label: "Subscribe & Save share of units", before: 41, after: 63, unit: "%", better: "higher" },
      { label: "Active subscribers", before: 1840, after: 4610, better: "higher" },
      { label: "Six-month repeat revenue per acquired customer", before: 38, after: 96, unit: "$", better: "higher" },
      { label: "Out-of-stock days on subscription SKUs", before: 22, after: 2, better: "lower" },
    ],
    timeline: [
      point("Mth 1a", 4800, 17100),
      point("Mth 1b", 4800, 16900),
      point("Mth 2a", 5300, 17700),
      point("Mth 2b", 5800, 18100),
      point("Mth 3a", 6300, 18500),
      point("Mth 3b", 6700, 19100),
      point("Mth 4a", 7000, 20600),
      point("Mth 4b", 7200, 22500),
      point("Mth 5a", 7400, 24700),
      point("Mth 5b", 7550, 26900),
      point("Mth 6a", 7650, 29400),
      point("Mth 6b", 7650, 31900),
    ],
    results: `Look at the ACoS line before you read anything else. It goes **up** for eight weeks — 28.1% to 35.1% — before it comes down, and it finishes at 24.0%, below where it started. That shape is the entire case study.

The rise is deliberate: the account was buying subscribers at a first-order loss. The fall has two sources, and only one of them shows up in the ad-attributed line.

The visible one is ad efficiency. The subscription keyword set converts at 14.1% against 8.3% for the general set, the Sponsored Display retargeting campaign closed warm 12oz buyers at a $6.40 cost per order, and rising organic rank on the head terms let the account cut its top-of-search premium from +60% to +20%. Monthly ad revenue went from $34,200 to $63,800.

The invisible one is bigger. A Subscribe & Save reorder arrives five weeks later, well outside the 7-day attribution window, so it is never credited to the ad that bought the customer — it lands in organic revenue. Organic went from $12,800 to $25,200 a month and total sales from $47,000 to $89,000. Judge this account on ad revenue alone and you miss nearly half of what the advertising did.

Subscribe & Save went from 41% to 63% of units, which also made demand forecasting dramatically easier: subscription volume is known 30 days ahead, and that is what fixed the stock-out problem for good.

The client had to be walked through the dip in weeks 3 to 10 twice. The cohort sheet is what carried those conversations — it showed month-one buyers still ordering in month five while the monthly ACoS number was still red.`,
    lessons: [
      "On a consumable, first-order ACoS is a cost of acquisition, not a measure of performance. Calculate lifetime value or you are optimising blind.",
      "Derive the ACoS ceiling from LTV and a payback rule, then write it down. 'Keep ACoS under 28%' is a rule nobody can defend once you ask where the 28 came from.",
      "Segment by subscription propensity rather than by product line. Some keywords bring subscribers and some bring one-off gift buyers, and they deserve different bids.",
      "Raise bids in 15% steps. A single large increase overpays for the first two weeks while the auction re-prices you.",
      "A stock-out does not delay a subscription order, it cancels a subscriber. Put inventory cover on the daily check before you scale acquisition.",
      "Report cohorts to the client during the investment window. A monthly ACoS chart will make a correct decision look like a mistake for two months.",
    ],
    playbook: [
      {
        label: "PPC metrics cheat sheet",
        href: "/cheat-sheets/ppc-metrics",
        note: "Break-even ACoS and payback maths behind the 46% ceiling.",
      },
      {
        label: "SOP-01 Daily health check",
        href: "/sops/daily-health-check",
        note: "Extended with the 45-day inventory cover check.",
      },
      {
        label: "SOP-06 Monthly performance report",
        href: "/sops/monthly-performance-report",
        note: "Rebuilt around cohorts for the investment window.",
      },
      {
        label: "Client communication templates",
        href: "/templates/client-communication-templates",
        note: "The 'ACoS will rise before it falls' briefing note.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 11 */
  {
    id: "international-marketplace-expansion",
    title: "Kitchenware into the UK and Germany: why the translated US account failed",
    category: "Kitchen & Housewares",
    resultType: "expansion",
    marketplace: "Amazon.co.uk and Amazon.de",
    level: "expert",
    minutes: 10,
    updated: UPDATED,
    summary:
      "The first attempt cloned the US campaigns with machine-translated keywords and burned $1,900 at a 117% ACoS. The rebuild treated each marketplace as a new account with its own language, CPCs and launch curve: 30% ACoS and $41,300 a month by month seven.",
    client:
      "Kitchenware brand, 11 ASINs (pour-over sets, grinders, storage), established on Amazon.com at $120,000 a month, expanding into the UK and Germany through Pan-EU FBA.",
    timeframe: "7 months",
    adSpend: "$1,900 in month one, $12,400 a month by month seven",
    tags: ["international", "germany", "uk", "translation", "launch"],
    challenge: `The brand's first attempt at Europe was a copy-paste. The US campaign structure was duplicated, the keyword list was run through machine translation, and the US target ACoS of 24% was applied on day one.

Every part of that was wrong. German search behaviour uses compound nouns — a shopper searches "kaffeemühle handbetrieben", not "kaffee mühle hand". UK English differs from US English in exactly the words that matter in this category (hob, kettle, cafetière). And a brand with no reviews and no organic rank in a new marketplace cannot hit the ACoS of an established one; it is a launch, and launches lose money first.

- **117% ACoS in month one** on a machine-translated keyword list
- **212 translated keywords** with clicks and zero conversions
- **The US ACoS target of 24%** applied to two zero-history marketplaces
- **No reviews in either marketplace** — the US review count does not carry across
- **UK and DE managed as one 'Europe' budget**, hiding that DE was working and UK was not`,
    approach: [
      "Month 1 — Stop the bleeding first: pause the translated campaigns entirely rather than trying to optimise them. A keyword list built by machine translation cannot be bid down into working; the terms are wrong, not expensive.",
      "Month 1 — Separate UK and DE into their own accounts, budgets, targets and reports. A combined 'Europe' number hides a working marketplace inside a failing one, and it is the single most common mistake in international expansion.",
      "Month 1-2 — Rebuild the keyword lists from marketplace-native sources: each marketplace's own auto-campaign search terms, the local Brand Analytics top search terms, and competitor reverse-ASIN run against DE and UK ASINs — never against the US catalogue.",
      "Month 2 — Have a native speaker review every German keyword before it goes live. Compound nouns, capitalisation of nouns, and the difference between 'Kaffeemühle' and 'Kaffeemuehle' (both are searched; both need targeting) are things translation software will not tell you.",
      "Month 2 — Set launch-appropriate targets: 90% ACoS for months one to two, 55% for months three to four, 35% for months five to six, 30% steady state. Write the schedule into the client report so the early numbers are expected rather than alarming.",
      "Month 3 — Localise the listings before scaling spend. UK: British spellings, kettle and hob terminology, VAT-inclusive pricing psychology. DE: DIN-standard measurements, formal register in the bullets, and a translated A+ module rather than an English one.",
      "Month 3-4 — Build the review base in each marketplace independently: UK Vine enrolment, and in Germany the Amazon 'Frühe Rezensenten' equivalent plus a product insert compliant with local rules. UK reached 30 reviews by month four, DE by month five.",
      "Month 5-7 — Scale on the marketplace-specific evidence. Germany's CPCs ran 22% below the UK's and its conversion rate 3 points higher, so DE took 58% of the combined budget by month seven despite being the later start.",
    ],
    metrics: [
      { label: "Combined ACoS (UK + DE)", before: 117.3, after: 30, unit: "%", better: "lower" },
      { label: "Monthly ad revenue", before: 1620, after: 41300, unit: "$", better: "higher" },
      { label: "Monthly ad spend", before: 1900, after: 12400, unit: "$", better: "higher" },
      { label: "Share of group revenue from outside the US", before: 0, after: 30, unit: "%", better: "higher" },
      { label: "Native-language exact keywords in the build", before: 0, after: 340, better: "higher" },
      { label: "Machine-translated keywords with zero orders", before: 212, after: 0, better: "lower" },
      { label: "UK conversion rate", before: 6.1, after: 11.4, unit: "%", better: "higher" },
    ],
    timeline: [
      point("Month 1", 1900, 1620),
      point("Month 2", 3400, 4250),
      point("Month 3", 5600, 9300),
      point("Month 4", 7900, 16100),
      point("Month 5", 9800, 24500),
      point("Month 6", 11300, 33200),
      point("Month 7", 12400, 41300),
    ],
    results: `Combined UK and DE ad revenue went from $1,620 in month one to $41,300 in month seven, and ACoS from 117.3% to 30.0%. Counting organic, the two European marketplaces went from nothing to $51,400 a month — 30% of group revenue.

The first two months lost money and were supposed to. Month one spent $1,900 to earn $1,620; month two spent $3,400 to earn $4,250. The published target schedule — 90%, then 55%, then 35%, then 30% — is what kept those months from being treated as a failure, because the client had agreed to the curve before the first campaign went live.

Germany outperformed the UK on every metric that mattered: 22% lower CPCs, three points higher conversion rate, and less competition on long-tail compound-noun keywords. That was not visible while the two were reported as one 'Europe' line, and it is the reason DE ended up with 58% of the budget.

The 212 machine-translated keywords were not salvageable. They were deleted, not optimised. Roughly $1,400 of the month-one spend was simply written off as the cost of learning that translation is not localisation.`,
    lessons: [
      "Never translate a keyword list. Rebuild it from the destination marketplace's own search term data, then have a native speaker check it.",
      "Report each marketplace separately from day one. A combined 'Europe' number will hide a winner inside a loser for months.",
      "A new marketplace is a launch, not an extension. Publish the ACoS target schedule in advance so the loss-making months are expected.",
      "Localise the listing before you scale the ads. In Germany, the A+ content and the measurements matter more than the bid.",
      "Reviews do not travel between marketplaces. Budget for a separate review-building programme in each one.",
      "Let the data reallocate the budget. The marketplace you assumed was secondary may have cheaper clicks and better conversion.",
    ],
    playbook: [
      {
        label: "SOP-04 Campaign launch",
        href: "/sops/campaign-launch",
        note: "Run once per marketplace rather than once for 'Europe'.",
      },
      {
        label: "Keyword research sheet",
        href: "/templates/keyword-research-sheet",
        note: "Rebuilt per marketplace from native search term data.",
      },
      {
        label: "SOP-07 Client onboarding",
        href: "/sops/client-onboarding",
        note: "Marketplace access, VAT and Brand Registry checks before launch.",
      },
      {
        label: "Client communication templates",
        href: "/templates/client-communication-templates",
        note: "The published ACoS target schedule sent in month one.",
      },
    ],
  },

  /* ------------------------------------------------------------------ 12 */
  {
    id: "runaway-auto-campaign-rescue",
    title: "Pet supplies rescue: $4,100 burned in nine days by three auto campaigns",
    category: "Pet Supplies",
    resultType: "rescue",
    marketplace: "Amazon.com (US)",
    level: "scenario",
    minutes: 9,
    updated: UPDATED,
    summary:
      "An account handed over mid-quarter after the previous VA left: three unmanaged auto campaigns on Up and Down bidding, no negatives, $4.10 CPCs on a $16 product, and one campaign advertising a discontinued ASIN. A 72-hour triage and six weeks of rebuilding took ACoS from 347% to 26%.",
    client:
      "Pet supplies seller, 23 ASINs (beds, bowls, grooming tools), $38,000 a month in total sales, handed over with no documentation after the previous VA left without notice.",
    timeframe: "6 weeks, with the first 72 hours critical",
    adSpend: "$456 a day at handover, $180 a day once stabilised",
    tags: ["rescue", "auto campaigns", "wasted spend", "negatives", "escalation"],
    challenge: `The client emailed on a Monday: "I think something is wrong with the ads." Something was very wrong. The account had spent $4,100 in nine days and generated $1,180 of ad revenue — a 347% ACoS on a business with a 31% margin.

The cause was three automatic campaigns, each with a $150 daily budget and Up and Down dynamic bidding, running with no negative keywords for eleven weeks. Up and Down lets Amazon raise a bid by up to 100% when it predicts a conversion; on broad, irrelevant traffic that prediction is frequently wrong, and the account was paying $4.10 a click on a $16 dog bowl.

One of the three campaigns had been advertising an ASIN discontinued in March. It had spent $610 sending traffic to an unavailable listing.

- **347% ACoS** over the nine days before handover
- **$456 a day** of spend with no daily monitoring in place
- **Three auto campaigns** on Up and Down bidding with zero negatives
- **$4.10 peak CPC** on a $16 product with a $5 contribution margin
- **One campaign live on a discontinued ASIN**, $610 spent sending clicks nowhere
- **No documentation, no naming convention, no reporting** from the previous VA`,
    approach: [
      "Hour 1 — Stop the bleeding before you diagnose anything. Set every auto campaign's daily budget to $10 and switch all three from Up and Down to Down Only. Do not pause outright: a pause loses the campaign's placement history, and you will want it back.",
      "Hour 2 — Check ASIN availability across every campaign. Any campaign or ad group pointing at a suppressed, out-of-stock or discontinued ASIN gets paused immediately. This found the $610 leak in eight minutes.",
      "Hours 3-24 — Export 60 days of search terms and sort by spend descending. The top 40 terms accounted for 61% of the waste. Add every one with 10+ clicks and zero orders as an exact negative, and negate the four irrelevant themes at phrase level.",
      "Day 1 — Write the client a one-page incident note the same day: what happened, what it cost, what has been done in the last 24 hours, and what the next seven days look like. Send it before they ask.",
      "Days 2-7 — Rebuild rather than restore. One auto campaign at $15 a day for discovery, and manual exact campaigns carrying the eleven search terms that had actually converted during the eleven weeks of chaos — expensive data, but it is real data and it should not be thrown away.",
      "Week 2 — Install the guardrails that make a repeat impossible: a maximum bid of 30% of the product's contribution margin, Down Only bidding as the default for every new campaign, and daily budgets no higher than 3x the campaign's average daily spend.",
      "Week 2 — Put the daily health check in place and actually schedule it: 15 minutes each morning covering spend versus budget, any campaign over 150% of its 7-day average spend, out-of-stock ASINs, and any CPC above the maximum-bid rule.",
      "Weeks 3-6 — Rebuild performance the ordinary way: weekly search term harvest, bids moved no more than 15% per adjustment, and a fortnightly report to the client showing the recovery curve against the handover baseline.",
    ],
    metrics: [
      { label: "ACoS", before: 347.5, after: 26, unit: "%", better: "lower" },
      { label: "Daily ad spend", before: 456, after: 180, unit: "$", better: "lower" },
      { label: "Weekly ad revenue", before: 918, after: 4846, unit: "$", better: "higher" },
      { label: "Highest CPC paid", before: 4.1, after: 1.05, unit: "$", better: "lower" },
      { label: "Negative keywords in the account", before: 0, after: 186, better: "higher" },
      { label: "Campaigns running on unavailable ASINs", before: 2, after: 0, better: "lower" },
      { label: "Spend on terms with no orders in 60 days", before: 71, after: 12, unit: "%", better: "lower" },
    ],
    timeline: [
      point("Handover (9 days)", 4100, 1180),
      point("Days 1-3", 780, 690),
      point("Days 4-7", 940, 1340),
      point("Week 2", 1290, 2470),
      point("Week 3", 1260, 3000),
      point("Week 4", 1240, 3650),
      point("Week 5", 1250, 4300),
      point("Week 6", 1260, 4846),
    ],
    results: `The first three days after handover still ran at a 113% ACoS, because negatives take a day or two to bite and the account had eleven weeks of bad targeting momentum. By the end of week two it was at 52%, and by week six at 26% — comfortably profitable on a 31% margin.

Weekly ad revenue went from $918 (the handover run rate) to $4,846, on 61% *less* daily spend. Nothing clever was done to achieve that. Bad traffic was removed, bids were capped at a defensible number, and the eleven search terms that had converted during the chaos were promoted into their own exact campaigns.

The $4,100 was not recoverable and the client was told so plainly on day one. What they got instead was a written guardrail set — maximum bid tied to contribution margin, Down Only by default, budget caps at 3x average spend, and a daily 15-minute check — which is the actual deliverable of a rescue. The account has not had an incident in the fourteen months since.`,
    lessons: [
      "In a runaway account, stop the spend before you diagnose it: budgets to $10 and bidding to Down Only takes ninety seconds and buys you a whole day of thinking time. Reduce rather than pause — a paused campaign loses its placement history and restarts cold.",
      "Check ASIN availability first. Advertising a discontinued or suppressed listing is the single most expensive silent failure in Amazon PPC.",
      "Up and Down bidding on an unmonitored auto campaign is the most dangerous setting in the console. Down Only should be the default for anything nobody is watching daily.",
      "Cap the maximum bid at a fixed share of contribution margin. It is one number, it is defensible to the client, and it makes a $4.10 CPC on a $16 product structurally impossible.",
      "Send the incident note before the client asks. A same-day one-pager saying what it cost and what you did buys more trust than a good month does.",
      "Keep the data the chaos produced. Eleven weeks of terrible spend still contained eleven converting search terms, and those were the foundation of the rebuild.",
    ],
    playbook: [
      {
        label: "SOP-08 Escalation procedures",
        href: "/sops/escalation-procedures",
        note: "The triage order and the same-day client incident note.",
      },
      {
        label: "SOP-01 Daily health check",
        href: "/sops/daily-health-check",
        note: "The 15-minute routine installed in week two.",
      },
      {
        label: "Automation rules and guardrails",
        href: "/automation/automation-rules",
        note: "Maximum-bid and budget-cap rules that prevent a repeat.",
      },
      {
        label: "Client communication templates",
        href: "/templates/client-communication-templates",
        note: "The incident note and the fortnightly recovery report.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Lookups and projections
 * ------------------------------------------------------------------ */

export function findCaseStudy(id: string): CaseStudyDoc | undefined {
  return caseStudies.find((study) => study.id === id);
}

/** Every category in use, sorted. */
export function caseStudyCategories(): string[] {
  return Array.from(new Set(caseStudies.map((study) => study.category))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Every tag in use with its frequency, most common first. */
export function caseStudyTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const study of caseStudies) {
    for (const tag of study.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

/**
 * Studies most like this one: same result type first, then shared tags,
 * then same category. Never returns the study itself.
 */
export function relatedCaseStudies(id: string, limit = 3): CaseStudyDoc[] {
  const study = findCaseStudy(id);
  if (!study) return [];

  return caseStudies
    .filter((candidate) => candidate.id !== id)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => study.tags.includes(tag)).length;
      const score =
        sharedTags * 3 +
        (candidate.resultType === study.resultType ? 4 : 0) +
        (candidate.category === study.category ? 2 : 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

/** Plain-text body for the search index. */
function searchBody(study: CaseStudyDoc): string {
  return [
    study.summary,
    study.client,
    study.category,
    study.marketplace,
    study.timeframe,
    study.adSpend,
    study.challenge,
    study.approach.join(" "),
    study.results,
    study.lessons.join(" "),
    study.metrics
      .map((metric) => `${metric.label} ${metric.before} to ${metric.after}`)
      .join(" "),
  ]
    .join("\n\n")
    .replace(/[*_`#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resourceRefs(): ResourceRef[] {
  return caseStudies.map((study) => ({
    id: study.id,
    kind: "case-study" as const,
    title: study.title,
    summary: study.summary,
    href: `/case-studies/${study.id}`,
    tags: study.tags,
    level: study.level,
    minutes: study.minutes,
    body: searchBody(study),
    updated: study.updated,
  }));
}
