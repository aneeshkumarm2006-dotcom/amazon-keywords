import { docRefs } from "@/components/doc/data";
import type { WorkflowStage } from "@/components/doc/workflow";
import type { DocResource, ResourceRef } from "@/types/content";

/**
 * Process maps and decision trees.
 *
 * Ported from `../ppc-tools-for-va/workflows/ppc-workflows.md`. The source
 * draws each flow as an ASCII box diagram; the same structure is modelled in
 * `stages` so it can be rendered responsively and read by a screen reader,
 * while `body` keeps the decision tables and rule lists verbatim.
 */

const UPDATED = "2026-06-29";

export interface WorkflowDoc extends DocResource {
  kind: "workflow";
  stages: WorkflowStage[];
  /** Heading rendered above the diagram. */
  diagramTitle: string;
}

export const workflows: WorkflowDoc[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "keyword-research-to-optimization",
    kind: "workflow",
    title: "Keyword research to campaign creation to the optimisation loop",
    summary:
      "The master loop every Amazon account runs on: three research sources feed one keyword list, the list becomes three campaigns, and the campaigns feed a weekly harvest-and-negate cycle that refills the list.",
    tags: ["keywords", "structure", "optimization", "weekly"],
    minutes: 7,
    level: "beginner",
    diagramTitle: "Research, build, then loop",
    meta: {
      Cycle: "Weekly, forever",
      "First data": "7-14 days",
      Campaigns: "3 per product",
      Budget: "$35-50 per day",
    },
    stages: [
      {
        id: "research",
        title: "Keyword research",
        summary:
          "Three sources, one deduplicated list. No single source sees the whole demand curve.",
        nodes: [
          {
            kind: "parallel",
            label: "Three inputs",
            columns: [
              {
                label: "Competitor ASIN analysis",
                detail: "Reverse-ASIN every competitor ranking on page one.",
                meta: "Cerebro",
              },
              {
                label: "Amazon auto campaign data",
                detail: "The terms real shoppers already typed and converted on.",
                meta: "Search terms",
              },
              {
                label: "Seed keyword expansion",
                detail: "Related terms and long tails around your head keyword.",
                meta: "Magnet",
              },
            ],
          },
          {
            kind: "outcome",
            tone: "brand",
            label: "Keyword list: 50-100 terms",
            detail:
              "Categorised into exact match (top 10), phrase match (20-30) and broad match (the remainder).",
          },
        ],
      },
      {
        id: "creation",
        title: "Campaign creation",
        summary: "One product, three campaigns, one job each.",
        nodes: [
          {
            kind: "parallel",
            label: "Build all three at once",
            columns: [
              {
                label: "Auto campaign",
                detail: "Discovery. Amazon matches against the listing.",
                meta: "$10-15/day",
              },
              {
                label: "Manual exact",
                detail: "The top 10 proven keywords, tightest control.",
                meta: "$15-20/day",
              },
              {
                label: "Manual phrase",
                detail: "20-30 expansion keywords, slightly lower bids.",
                meta: "$10-15/day",
              },
            ],
          },
          {
            kind: "step",
            label: "Collect data for 7-14 days",
            detail:
              "No bid changes, no negatives, no structure edits. A clean baseline is worth more than a fortnight of impatience.",
            meta: "Do nothing",
          },
        ],
      },
      {
        id: "loop",
        title: "Optimisation loop",
        summary:
          "Search terms in, decisions out, new keywords back into the manual campaigns.",
        repeats: "Repeat weekly — this week's harvest is next week's exact-match baseline",
        nodes: [
          {
            kind: "step",
            label: "Search term analysis",
            detail: "Sort by spend descending, filter to 5+ clicks.",
            meta: "15 min",
          },
          {
            kind: "decision",
            label: "What does each search term deserve?",
            branches: [
              {
                condition: "2+ orders, ACoS below target",
                result: "Harvest to manual exact",
                detail: "Bid it deliberately instead of inheriting an auto bid.",
                tone: "good",
              },
              {
                condition: "15+ clicks, 0 orders",
                result: "Negate exact",
                detail: "Stop paying to learn the same thing twice.",
                tone: "bad",
              },
              {
                condition: "Converts, but ACoS above target",
                result: "Reduce bid 15%",
                detail: "The term works; the price you are paying does not.",
                tone: "warn",
              },
              {
                condition: "CVR above 15%, low impressions",
                result: "Increase bid",
                detail: "You are winning the auction too rarely to matter.",
                tone: "info",
              },
            ],
          },
          {
            kind: "step",
            label: "Bid adjust, then budget review",
            detail:
              "Apply the SOP-03 ACoS bands, then check which campaigns capped before 6 PM and which never spent.",
          },
        ],
      },
    ],
    body: `## Decision points

Every arrow in the flow above is one of these six questions. If you can answer all
six from data rather than instinct, you can run the loop on any account.

| Step | Decision | Criteria |
|------|----------|----------|
| Keyword selection | Include or exclude? | Relevance above 7/10, search volume above 100 per month |
| Campaign type | Auto or manual? | Auto for discovery, manual for proven terms |
| Bid setting | Starting bid? | Target ACoS x Price x Estimated CVR |
| Harvest | Move to manual? | 2+ orders, ACoS below target |
| Negate | Add negative? | 15+ clicks and 0 orders, or ACoS above 2x break-even |
| Budget increase | Scale up? | ACoS below target for 7+ consecutive days |

## Why the loop closes

The auto campaign is not a discovery phase you graduate from. It is a permanent
sensor. Shopper language drifts, competitors launch, seasons turn, and the auto
campaign keeps surfacing terms your research never predicted. Accounts that pause
auto once the manual campaigns are performing stop discovering, and twelve months
later their keyword list is a fossil.

## Budget split as the loop matures

| Account age | Auto | Manual exact | Manual phrase | Rationale |
|---|---|---|---|---|
| Weeks 1-2 | 40% | 30% | 30% | Discovery is the whole job |
| Weeks 3-8 | 25% | 45% | 30% | Proven terms earn the budget |
| Month 3+ | 20% | 40% | 25% | Plus 15% product targeting |

The month 3+ row is the 70/20/10-style allocation used in the campaign build
template: 40% manual exact, 25% manual phrase, 20% auto, 15% product targeting.

## Where this goes wrong

- **Harvesting without negating in the source campaign.** If you promote "magnesium
  glycinate 400mg" to exact but never negate it in the auto campaign, the two now bid
  against each other and you pay for your own competition.
- **Harvesting single-order terms.** One order is noise. The rule is two, and it is
  two for a reason.
- **Running the loop monthly instead of weekly.** A term that takes 15 wasted clicks
  a week takes 60 before a monthly review catches it.`,
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "search-term-harvesting",
    kind: "workflow",
    title: "Search term harvesting flow",
    summary:
      "The decision tree that turns a search term report into three piles: harvest, negate, and adjust. Every branch has a numeric threshold, so two specialists reach the same answer.",
    tags: ["search terms", "keywords", "negatives", "weekly"],
    minutes: 6,
    level: "beginner",
    diagramTitle: "From report to three piles",
    meta: {
      Frequency: "Weekly",
      Input: "Search Term Report",
      Floor: "5 clicks",
      Output: "Harvest and negate lists",
    },
    stages: [
      {
        id: "prepare",
        title: "Download and prepare",
        summary: "Five minutes of preparation makes the next thirty minutes mechanical.",
        nodes: [
          {
            kind: "step",
            label: "Download the Search Term Report",
            detail: "Last 7 days, from the Amazon Advertising Console.",
          },
          {
            kind: "step",
            label: "Sort by spend, descending",
            detail:
              "Money first. The terms at the top of a spend-sorted list are where a decision is worth making.",
          },
          {
            kind: "step",
            label: "Filter to 5+ clicks",
            detail:
              "Below five clicks there is no signal, only variance. Ignore the tail this week; it will still be there next week with more data.",
            meta: "Relevance floor",
          },
        ],
      },
      {
        id: "split",
        title: "Split on conversion",
        summary: "One question decides which branch of the tree a term falls down.",
        nodes: [
          {
            kind: "decision",
            label: "Did the term produce an order?",
            branches: [
              {
                condition: "Orders 1 or more",
                result: "Go to the efficiency test",
                tone: "good",
              },
              {
                condition: "Orders = 0",
                result: "Go to the waste test",
                tone: "warn",
              },
            ],
          },
        ],
      },
      {
        id: "converting",
        title: "Converting terms: the efficiency test",
        nodes: [
          {
            kind: "decision",
            label: "Is ACoS below target?",
            branches: [
              {
                condition: "Yes, and 2+ orders",
                result: "Harvest to manual exact",
                detail:
                  "Add it as exact in the manual campaign, then negate it in the campaign that found it.",
                tone: "good",
              },
              {
                condition: "No, ACoS above target",
                result: "Reduce bid 15%",
                detail: "Keep the term. It converts. You are simply overpaying for it.",
                tone: "warn",
              },
            ],
          },
        ],
      },
      {
        id: "non-converting",
        title: "Non-converting terms: the waste test",
        nodes: [
          {
            kind: "decision",
            label: "Has it taken 15 or more clicks?",
            branches: [
              {
                condition: "Yes, 15+ clicks and 0 orders",
                result: "Negate exact",
                detail: "Fifteen clicks with nothing to show is a decision, not bad luck.",
                tone: "bad",
              },
              {
                condition: "No, 5-14 clicks",
                result: "Leave it, not enough data",
                detail: "Re-check next week. Do not negate a term you have barely tested.",
                tone: "neutral",
              },
            ],
          },
          {
            kind: "outcome",
            tone: "info",
            label: "Two lists leave this process",
            detail:
              "A harvest list for the campaign builder, and a negate list for the shared negative keyword list. Both get logged with the week's date.",
          },
        ],
      },
    ],
    body: `## Harvesting rules

1. **Harvest to exact match** when the term has 2+ orders **and** ACoS below target.
2. **Negate exact** when the term has 15+ clicks **and** 0 orders.
3. **Negate phrase** when the term is completely irrelevant to the product.
4. **Reduce bid** when ACoS is above target but the term does convert.
5. **Increase bid** when CVR is above 15% but impressions are low.

## Negative exact versus negative phrase

Getting this wrong is the single most expensive mistake in the whole workflow,
because negative phrase blocks far more than people expect.

| Situation | Use | Why |
|---|---|---|
| "magnesium citrate powder" wasted 31 clicks on a glycinate product | Negative **exact** | Only that exact term is blocked; "magnesium citrate capsules" may still be worth testing |
| Every term containing "recipe" is irrelevant | Negative **phrase** | One entry blocks the whole family |
| A competitor brand name you do not want to conquest | Negative **phrase** | Blocks all the misspellings and modifiers around it |
| A term that converts but at 3x target ACoS | Neither — cut the bid | Negating removes revenue you are still making |

## Why 15 clicks and not 10 or 20

Fifteen clicks at a 10% conversion rate means you expected roughly 1.5 orders and got
zero. That is a strong enough signal to act on for most categories. On a product with
a genuinely low conversion rate — high-ticket items, considered purchases — raise the
threshold: at 3% CVR, 15 clicks only predicts 0.45 orders, and zero is unremarkable.
Use 30 clicks there instead.

Work the threshold back from the product's own conversion rate:

    Clicks needed = 3 / CVR

At 10% CVR that is 30 clicks for a strong read, and 15 for a workable one. At 3% CVR
it is 100 and 50. The 15-click rule is a sensible default, not a law.

## Weekly cadence

| Day | Task | Time |
|---|---|---|
| Monday | Download and split the report | 10 min |
| Monday | Harvest list into manual exact | 15 min |
| Monday | Negate list into the shared list | 10 min |
| Thursday | Spot-check the harvested terms for early CTR | 5 min |`,
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "campaign-structure-decision-tree",
    kind: "workflow",
    title: "Campaign structure decision tree",
    summary:
      "How to decide what to build for a product: the Brand Registry gate, the four core Sponsored Products campaigns with their budget shares, and when Sponsored Brands and Display earn a slot.",
    tags: ["structure", "budget", "ad types", "launch"],
    minutes: 6,
    level: "intermediate",
    diagramTitle: "One product, one structure decision",
    meta: {
      Gate: "Brand Registry",
      Core: "4 SP campaigns",
      Split: "40/25/20/15",
      "Per campaign": "$10 per day minimum",
    },
    stages: [
      {
        id: "start",
        title: "A new product to advertise",
        nodes: [
          {
            kind: "step",
            label: "Confirm the listing is ready",
            detail:
              "Optimised title, bullets and images, competitive price, in stock. Structure decisions assume the listing can convert.",
          },
        ],
      },
      {
        id: "gate",
        title: "The Brand Registry gate",
        summary: "One yes-or-no question decides which ad types are even available.",
        nodes: [
          {
            kind: "decision",
            label: "Is the brand enrolled in Brand Registry?",
            branches: [
              {
                condition: "Yes",
                result: "SP + SB + SD available",
                detail: "Sponsored Products, Sponsored Brands and Sponsored Display.",
                tone: "good",
              },
              {
                condition: "No",
                result: "Sponsored Products only",
                detail: "Build the four core campaigns and revisit once registry lands.",
                tone: "neutral",
              },
            ],
          },
        ],
      },
      {
        id: "core",
        title: "Core structure, per product",
        summary:
          "Four campaigns, four jobs, four budget shares that add to 100% of the product's budget.",
        nodes: [
          {
            kind: "parallel",
            label: "Budget allocation",
            columns: [
              {
                label: "Manual exact",
                detail: "Top 10 proven keywords. Highest conversion, most efficient.",
                meta: "40%",
              },
              {
                label: "Manual phrase",
                detail: "Expansion and discovery around proven terms.",
                meta: "25%",
              },
              {
                label: "Auto campaign",
                detail: "Continuous discovery and harvesting.",
                meta: "20%",
              },
              {
                label: "Product targeting",
                detail: "Competitor ASIN conquesting.",
                meta: "15%",
              },
            ],
            detail:
              "Never go below $10 per day on an active campaign. Below that the campaign never gathers enough conversion data to be optimisable.",
          },
        ],
      },
      {
        id: "brand-layer",
        title: "If Brand Registry is available",
        summary: "These come out of separate budgets, not out of the product's 100%.",
        nodes: [
          {
            kind: "parallel",
            label: "Two more layers",
            columns: [
              {
                label: "Sponsored Brands",
                detail: "Brand defence and storefront traffic.",
                meta: "Brand budget",
              },
              {
                label: "Sponsored Display",
                detail: "Retargeting and competitor audiences.",
                meta: "Growth budget",
              },
            ],
          },
          {
            kind: "outcome",
            tone: "good",
            label: "Five to seven campaigns per product, no more",
            detail:
              "If a product needs more than seven campaigns, the problem is usually keyword segmentation rather than campaign count.",
          },
        ],
      },
    ],
    body: `## When to use each ad type

| Ad type | Use when | Goal |
|---------|----------|------|
| Sponsored Products | Always, it is the baseline | Direct sales, keyword ranking |
| Sponsored Brands | Brand Registry available | Brand awareness, storefront traffic |
| Sponsored Brands Video | Product needs demonstration | Higher CTR, stop the scroll |
| Sponsored Display | Retargeting, conquesting | Remarketing, competitor audiences |

## Naming convention

A naming convention is not admin. It is what lets you filter, sort and bulk-edit an
account you have not opened in three weeks.

    [Product]_[Targeting]_[MatchType]_[Qualifier]

    Widget_Exact_Top5      Exact match, top 5 keywords
    Widget_Phrase_Exp      Phrase match, expansion
    Widget_Auto_Auto       Auto campaign
    Widget_Prod_Comp1      Product targeting, competitor 1
    Brand_Widget_SB        Sponsored Brands, brand defence

## Worked allocation

A product with a $50 per day budget, using the four-way split:

| Campaign | Share | Daily budget | Monthly at 30 days |
|---|---|---|---|
| Manual exact | 40% | $20.00 | $600 |
| Manual phrase | 25% | $12.50 | $375 |
| Auto | 20% | $10.00 | $300 |
| Product targeting | 15% | $7.50 | $225 |
| **Total** | **100%** | **$50.00** | **$1,500** |

Note the last row: product targeting at $7.50 is below the $10 per day floor. On a
$50 budget you either fund product targeting properly by taking 5% from manual
phrase, or you do not run it yet. Splitting a small budget four ways to satisfy a
diagram is exactly how accounts end up with twenty campaigns that each learn nothing.

## Structure smells

| Symptom | What it usually means |
|---|---|
| 20+ campaigns under $5 per day | The account was built by addition, never by design |
| Auto and manual bidding on the same term | Nobody negates harvested terms in the source campaign |
| No naming convention | Bulk operations are impossible, so nothing gets bulk-fixed |
| Zero negative keywords | Nobody has ever read a search term report |
| One campaign, forty keywords | No segmentation, so one bad keyword eats the budget |`,
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "reporting-workflow",
    kind: "workflow",
    title: "Reporting workflow",
    summary:
      "Six stages from raw data to a delivered client report: pull, calculate, compare, analyse, recommend, deliver — plus the cadence that says which report is due when.",
    tags: ["reporting", "clients", "metrics", "monthly"],
    minutes: 5,
    level: "intermediate",
    diagramTitle: "Raw data to a decision the client can make",
    meta: {
      Cadence: "Daily to quarterly",
      Monthly: "2 hours",
      Delivery: "Report plus call",
      Sources: "4 systems",
    },
    stages: [
      {
        id: "collect",
        title: "Data collection",
        summary: "One pass, four sources, before any analysis starts.",
        nodes: [
          {
            kind: "parallel",
            label: "Pull from",
            columns: [
              { label: "Advertising Console", detail: "Campaign, keyword and search term data." },
              { label: "Seller Central", detail: "Total sales, so TACoS can be calculated." },
              { label: "Helium 10", detail: "Rank movement and market context." },
              { label: "GA4", detail: "Only where external traffic is in play." },
            ],
          },
        ],
      },
      {
        id: "calculate",
        title: "Calculate the KPIs",
        nodes: [
          {
            kind: "step",
            label: "The six numbers that carry the report",
            items: [
              "ACoS and ROAS — advertising efficiency",
              "TACoS — advertising as a share of total business",
              "CTR — whether the ad earns the click",
              "CVR — whether the listing earns the order",
              "CPC — what the auction is costing this month",
              "Impression share — how much of the demand you are even seeing",
            ],
          },
        ],
      },
      {
        id: "compare",
        title: "Compare",
        summary: "A number with no comparison is trivia.",
        nodes: [
          {
            kind: "parallel",
            label: "Three comparisons",
            columns: [
              { label: "Versus last month", detail: "Direction of travel." },
              { label: "Versus target", detail: "Whether the plan is working." },
              { label: "Versus category", detail: "Whether the market moved, not you." },
            ],
          },
        ],
      },
      {
        id: "analyse",
        title: "Analyse",
        nodes: [
          {
            kind: "decision",
            label: "Did the number move because of us or because of the market?",
            branches: [
              {
                condition: "CPC rose across every campaign",
                result: "Market, not you",
                detail: "Report it as context and check the category benchmark.",
                tone: "info",
              },
              {
                condition: "CPC rose in one campaign only",
                result: "You, or a new competitor on those terms",
                detail: "Investigate the specific auction before touching bids.",
                tone: "warn",
              },
            ],
          },
        ],
      },
      {
        id: "recommend",
        title: "Recommend",
        nodes: [
          {
            kind: "step",
            label: "Three recommendations, each with an expected impact",
            detail:
              "Specific actions, proposed budget changes, and the new strategy you want to test. If you cannot state the expected impact, it is not a recommendation yet.",
          },
        ],
      },
      {
        id: "deliver",
        title: "Deliver",
        nodes: [
          {
            kind: "outcome",
            tone: "good",
            label: "Report, call, action items",
            detail:
              "Email the report by the 5th, attach the full data spreadsheet, and offer a 30-minute call. Close the call with who is doing what by when.",
          },
        ],
      },
    ],
    body: `## Reporting cadence

| Report | Frequency | Time required | Content |
|--------|-----------|---------------|---------|
| Health check | Daily | 5 min | Anomalies, budget pacing |
| Search term review | Weekly | 30 min | Harvest, negate, adjust |
| Performance report | Monthly | 2 hrs | Full metrics, trends, strategy |
| Strategic review | Quarterly | Half day | Budget reallocation, goals |

## The metric set, with formulas

| Metric | Formula | What it answers |
|---|---|---|
| ACoS | Ad spend / Ad revenue x 100 | What share of ad revenue went to ads |
| ROAS | Ad revenue / Ad spend | How many dollars back per dollar in |
| TACoS | Ad spend / Total revenue x 100 | Whether ads are buying organic growth |
| CTR | Clicks / Impressions x 100 | Whether the ad earns attention |
| CVR | Orders / Clicks x 100 | Whether the listing closes |
| CPC | Spend / Clicks | What the auction costs today |

ACoS and ROAS are the same fact stated two ways: ROAS = 1 / ACoS when ACoS is
expressed as a ratio. A 25% ACoS is a 4.0x ROAS. Quote whichever one the client
thinks in, and never both in the same sentence.

## Reading TACoS against ACoS

This pair is the most useful diagnostic in a monthly report, and almost nobody uses
it.

| ACoS | TACoS | Reading |
|---|---|---|
| Flat | Falling | Ads are driving organic rank. This is the goal. |
| Flat | Rising | Organic sales are shrinking; ads are propping up the total. |
| Falling | Falling | Efficiency and organic both improving. Scale. |
| Rising | Falling | You scaled ads into a growing business. Usually fine. |

## What to cut from a report

- Screenshots of the Amazon interface. The client has the same login.
- Every campaign listed individually. Show the top three and the bottom three.
- Metrics with no target. If nobody agreed a target, do not grade against one.
- Jargon with no translation. Write "we lost money on 12 keywords and stopped",
  not "we pruned the long tail".`,
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: "seasonal-preparation",
    kind: "workflow",
    title: "Seasonal preparation",
    summary:
      "The eight-week ramp into a peak season: research at T-8, build at T-6, test at half budget at T-4, ramp to 75% at T-2, full deployment at T-0, and a controlled wind-down at T+2.",
    tags: ["seasonal", "q4", "budget", "planning"],
    minutes: 6,
    level: "advanced",
    diagramTitle: "Eight weeks out to two weeks after",
    meta: {
      Runway: "8 weeks",
      "Test budget": "50% of target",
      "Peak monitoring": "Hourly",
      "Wind down": "T+2 weeks",
    },
    stages: [
      {
        id: "t8",
        marker: "T-8",
        title: "Research",
        summary: "Eight weeks out. Nothing is live yet; everything is being decided.",
        nodes: [
          {
            kind: "step",
            label: "Build the seasonal picture",
            items: [
              "Keyword research on seasonal terms — gift, holiday and occasion modifiers",
              "Competitor analysis — who ramped last year, and when",
              "Historical data review — last year's CPC curve and conversion peak",
              "Budget planning — what the season is worth and what you can fund",
            ],
          },
        ],
      },
      {
        id: "t6",
        marker: "T-6",
        title: "Build",
        nodes: [
          {
            kind: "step",
            label: "Create the seasonal campaigns",
            items: [
              "Create seasonal campaigns, separate from evergreen",
              "Set up the campaign structure and naming",
              "Load keywords and opening bids",
              "Prepare ad creative for Sponsored Brands and Display",
            ],
            detail:
              "Keep seasonal campaigns separate. Merging them into evergreen destroys your ability to compare next year.",
          },
        ],
      },
      {
        id: "t4",
        marker: "T-4",
        title: "Test",
        summary: "Live, but deliberately underfunded.",
        nodes: [
          {
            kind: "step",
            label: "Run at 50% of target budget",
            meta: "Half budget",
            items: [
              "Gather conversion data on the seasonal terms",
              "Optimise bids against real auction prices, not last year's",
              "Refine targeting and cut the terms that clearly will not convert",
            ],
          },
        ],
      },
      {
        id: "t2",
        marker: "T-2",
        title: "Ramp",
        nodes: [
          {
            kind: "step",
            label: "Increase to 75% budget",
            meta: "75%",
            items: [
              "Final bid optimisation before prices spike",
              "Launch Sponsored Brands video",
              "Set up dayparting for the peak days",
            ],
          },
        ],
      },
      {
        id: "t0",
        marker: "T-0",
        title: "Peak season",
        summary: "The week you prepared for. Execution only, no new ideas.",
        nodes: [
          {
            kind: "step",
            label: "Full budget deployment",
            meta: "100%",
            items: [
              "Hourly monitoring on peak days",
              "Real-time bid adjustments as CPC moves",
              "Competitor monitoring — who is buying your brand terms",
            ],
          },
          {
            kind: "decision",
            label: "A campaign caps out at 11 AM on a peak day",
            branches: [
              {
                condition: "ACoS is at or below target",
                result: "Raise the budget immediately",
                detail: "A capped profitable campaign is the most expensive thing in the account.",
                tone: "good",
              },
              {
                condition: "ACoS is above target",
                result: "Leave it capped",
                detail: "The cap is doing the job your bids should have done.",
                tone: "warn",
              },
            ],
          },
        ],
      },
      {
        id: "tplus2",
        marker: "T+2",
        title: "Wind down",
        nodes: [
          {
            kind: "outcome",
            tone: "info",
            label: "Bank the learning before you archive",
            items: [
              "Gradual budget reduction, not a hard stop",
              "Harvest the winning seasonal terms into evergreen exact",
              "Archive the seasonal campaigns, never delete them",
              "Document the learnings while the season is still fresh",
            ],
          },
        ],
      },
    ],
    body: `## Why the ramp is gradual

Seasonal CPC does not step up on the first day of the season; it climbs for weeks as
every competitor's automation reacts to the same rising demand. If your first bid is
set in peak week, you are bidding against the top of the curve with no historical
data of your own. Starting at T-4 with half the budget buys you four weeks of
conversion data at prices nobody else has bid up yet.

## Budget curve

| Phase | Weeks out | Budget level | Purpose |
|---|---|---|---|
| Research | T-8 to T-7 | $0 | Decide what to build |
| Build | T-6 to T-5 | $0 | Build it |
| Test | T-4 to T-3 | 50% of target | Buy data cheaply |
| Ramp | T-2 to T-1 | 75% of target | Warm up the campaigns |
| Peak | T-0 | 100% | Harvest the demand |
| Wind down | T+1 to T+2 | Taper to evergreen | Keep the winners |

## Peak day operating rules

1. **Check every two hours, not continuously.** Continuous watching produces
   twitchy bid changes that fight each other.
2. **Change one thing at a time.** On a peak day you cannot attribute a result to a
   change if you made four changes in an hour.
3. **Protect brand terms first.** Competitors conquest hardest on the highest-traffic
   days, and losing your own brand term on the busiest day of the year is the most
   expensive impression you will not buy.
4. **Have the out-of-stock plan ready.** Decide in advance at what inventory level
   you pause, and who has authority to do it without a call.

## The T+2 harvest is the real prize

Peak season generates more search term data in two weeks than the rest of the quarter
combined. Terms that converted at volume during peak are the best evergreen exact
candidates you will find all year, because they were validated under the most
competitive auction conditions of the year. Harvest them before you archive.`,
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: "ab-testing-process",
    kind: "workflow",
    title: "A/B testing process",
    summary:
      "Six steps from hypothesis to documented result, with the discipline that makes the result trustworthy: two to four weeks minimum, an even budget split, and no touching it while it runs.",
    tags: ["testing", "listings", "cvr", "process"],
    minutes: 6,
    level: "advanced",
    diagramTitle: "Hypothesis to documented result",
    meta: {
      Duration: "2-4 weeks minimum",
      Split: "Even budget",
      Confidence: "95%+",
      Output: "Test tracker entry",
    },
    stages: [
      {
        id: "hypothesis",
        title: "Hypothesis",
        summary: "One sentence, with a number in it.",
        nodes: [
          {
            kind: "step",
            label: "Changing [element] will improve [metric] by [amount]",
            detail:
              "If you cannot fill in all three brackets, you have an idea rather than a hypothesis. \"A lifestyle main image will improve CTR from 0.35% to 0.50%\" is testable; \"better images will help\" is not.",
          },
        ],
      },
      {
        id: "design",
        title: "Test design",
        nodes: [
          {
            kind: "step",
            label: "Fix the rules before anything goes live",
            items: [
              "Control: the current version",
              "Variant: the proposed change",
              "Metric: one primary KPI, decided now",
              "Duration: 2-4 weeks minimum",
              "Budget: split evenly between the two",
            ],
          },
        ],
      },
      {
        id: "execution",
        title: "Execution",
        summary: "The hardest stage, because the work is restraint.",
        nodes: [
          {
            kind: "step",
            label: "Launch both versions, then leave them alone",
            meta: "2 weeks",
            items: [
              "Launch both versions at the same time",
              "Do not touch either for two weeks",
              "Monitor for external factors: price changes, stock-outs, competitor launches",
            ],
          },
        ],
      },
      {
        id: "analysis",
        title: "Analysis",
        nodes: [
          {
            kind: "decision",
            label: "Is the result real?",
            branches: [
              {
                condition: "Confidence 95% or higher",
                result: "The result stands",
                detail: "Record the size of the win, not just the direction.",
                tone: "good",
              },
              {
                condition: "Confidence below 95%",
                result: "Inconclusive so far",
                detail: "Extend the test rather than declaring a winner from noise.",
                tone: "warn",
              },
            ],
          },
          {
            kind: "step",
            label: "Check for confounders before you believe it",
            detail:
              "A price change, a stock-out, a competitor launch or a seasonal shift will all move a metric more than most listing changes do.",
          },
        ],
      },
      {
        id: "decision",
        title: "Decision",
        nodes: [
          {
            kind: "decision",
            label: "What happens to the variant?",
            branches: [
              {
                condition: "Variant won",
                result: "Implement it everywhere",
                tone: "good",
              },
              {
                condition: "Inconclusive",
                result: "Extend the test",
                tone: "info",
              },
              {
                condition: "Neither version won",
                result: "New hypothesis",
                detail: "The element you tested is not the constraint.",
                tone: "neutral",
              },
            ],
          },
        ],
      },
      {
        id: "document",
        title: "Document",
        nodes: [
          {
            kind: "outcome",
            tone: "brand",
            label: "Log it, even when it failed",
            items: [
              "Log the result in the test tracker with dates and sample size",
              "Update the SOPs if the process itself changed",
              "Share the learning with the team, including the null results",
            ],
            detail:
              "A tracker of failed tests is worth more than a folder of wins, because it stops the team re-running the same idea every six months.",
          },
        ],
      },
    ],
    body: `## What to A/B test

| Element | Example | Primary impact |
|---------|---------|--------|
| Main image | Lifestyle versus white background | CTR |
| Title | Short versus keyword-rich | CTR, CVR |
| Price | $29.99 versus $27.99 | CVR, ACoS |
| Bullet points | Feature-focused versus benefit-focused | CVR |
| A+ Content | With versus without | CVR |
| Bid strategy | Dynamic down versus up and down | ACoS, volume |

## Sample size, roughly

You do not need a statistics degree, but you do need to stop calling a result at 200
impressions. A workable rule of thumb for a CTR test:

| Baseline CTR | Improvement you want to detect | Impressions needed per version |
|---|---|---|
| 0.30% | +0.10 points (to 0.40%) | ~25,000 |
| 0.50% | +0.15 points (to 0.65%) | ~15,000 |
| 1.00% | +0.25 points (to 1.25%) | ~8,000 |

For a CVR test, work in clicks rather than impressions: detecting a move from 8% to
10% needs roughly 3,000 clicks per version. On a campaign delivering 100 clicks a
day, that is a 30-day test per version — which is exactly why the minimum duration is
two to four weeks and not two to four days.

## The confounder checklist

Before you accept any result, confirm none of these changed mid-test:

- [ ] Price, on either the product or a variation
- [ ] Inventory, including a lapse into "usually ships in 2-3 weeks"
- [ ] Review count or star rating crossing a psychological threshold
- [ ] A competitor launching, exiting, or running a deep promotion
- [ ] Any listing edit you did not make — clients edit listings
- [ ] A Prime Day, holiday or category-wide traffic event

## A worked example from the test tracker

| Test | Element | Control | Variant | Metric | Sample | Control | Variant | Winner | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| AB-001 | Main image | White bg | Lifestyle | CTR | 5,000 imp | 0.35% | 0.52% | Variant | 95% |
| AB-002 | Price | $29.99 | $27.99 | CVR | 3,000 clicks | 8.2% | 9.1% | Variant | 88% |

AB-001 ships. AB-002 does not — 88% confidence means roughly a one-in-eight chance
the difference is noise, and a permanent $2 price cut is too expensive a decision to
make on that. Extend it.`,
  },
];

export function resourceRefs(): ResourceRef[] {
  return docRefs(workflows, "/workflows", UPDATED);
}

export function findWorkflow(id: string): WorkflowDoc | undefined {
  return workflows.find((workflow) => workflow.id === id);
}
