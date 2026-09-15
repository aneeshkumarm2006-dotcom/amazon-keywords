import { docRefs } from "@/components/doc/data";
import type { DocResource, ResourceRef } from "@/types/content";

/**
 * Ready-to-use templates.
 *
 * Ported from `../ppc-tools-for-va/templates/ppc-templates.md`. Column sets,
 * action rules and worked example rows are the source's; the emoji status
 * markers in the client emails are replaced with plain text so the templates
 * paste cleanly into any client's inbox.
 */

const UPDATED = "2026-06-29";

export const templates: DocResource[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "campaign-build-sheet",
    kind: "template",
    title: "Campaign build spreadsheet",
    summary:
      "The twelve-column sheet you fill in before you touch the Advertising Console, plus the naming convention and the budget allocation rule that decide what goes in it.",
    tags: ["launch", "structure", "budget", "spreadsheet"],
    minutes: 5,
    level: "beginner",
    meta: {
      Columns: "12",
      Use: "Before every build",
      Pairs: "SOP-04",
      Rule: "40/25/20/15",
    },
    body: `Build the campaign on paper first. Every field below has to be decided anyway;
deciding them in a sheet takes twenty minutes and deciding them live in the console
takes two hours and produces mistakes.

## Columns

| Column | What goes in it |
|---|---|
| Campaign Name | Follows the naming convention below |
| Product | Which ASIN or product line |
| Ad Type | SP, SB or SD |
| Targeting | Auto, Keyword or Product |
| Keyword | The term, or "(auto)" |
| Match Type | Exact, Phrase, Broad, Auto or Product |
| Max Bid | Target ACoS x Price x Estimated CVR |
| Daily Budget | Never below $10 on an active campaign |
| Placement Adj (Top of Search) | Percentage uplift |
| Placement Adj (Product Pages) | Percentage uplift |
| Start Date | So you can date the first review |
| Status | Active, Paused or Draft |

## Worked example rows

| Campaign Name | Product | Ad Type | Targeting | Keyword | Match | Max Bid | Budget | ToS Adj | PP Adj | Start | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Widget_Auto_Auto | Widget X | SP | Auto | (auto) | Auto | $0.75 | $15 | +25% | +0% | 2026-07-01 | Active |
| Widget_Exact_Top5 | Widget X | SP | Keyword | bluetooth widget | Exact | $1.25 | $20 | +50% | +0% | 2026-07-01 | Active |
| Widget_Phrase_Exp | Widget X | SP | Keyword | wireless widget | Phrase | $0.90 | $15 | +25% | +0% | 2026-07-01 | Active |
| Widget_Prod_Comp1 | Widget X | SP | Product | ASIN B0XXXXX | Product | $0.85 | $10 | +0% | +25% | 2026-07-01 | Active |
| Brand_Widget_SB | Widget X | SB | Keyword | widget brand | Phrase | $1.00 | $15 | +50% | +0% | 2026-07-01 | Active |

Total daily budget across the five rows is $75. Note the placement logic: exact match
carries the biggest Top of Search uplift because that is where a proven term converts
best, and product targeting is the only row with a Product Pages uplift because that
is literally where the ad appears.

## Naming convention

    [Product]_[Targeting]_[MatchType]_[Qualifier]

    Widget_Exact_Top5      Exact match, top 5 keywords
    Widget_Phrase_Exp      Phrase match, expansion
    Widget_Auto_Auto       Auto campaign
    Widget_Prod_Comp1      Product targeting, competitor 1
    Brand_Widget_SB        Sponsored Brands, brand defence

Underscores rather than spaces, because bulk operations and spreadsheet filters both
choke on inconsistent spacing.

## Budget allocation rule

| Campaign type | Budget share | Rationale |
|---------------|----------|-----------|
| Manual Exact (proven) | 40% | Highest conversion, most efficient |
| Manual Phrase (expansion) | 25% | Discovery, growing keywords |
| Auto (harvesting) | 20% | Continuous discovery |
| Product Targeting | 15% | Competitor conquesting |

Apply the shares to the product's budget, then check the floor: any campaign that
lands below $10 per day either gets funded properly by taking share from another
campaign, or does not launch yet.

## Pre-flight check

- [ ] Every campaign has a name that matches the convention
- [ ] Every bid is calculated, not guessed
- [ ] Shares add to 100% and no campaign is under $10 per day
- [ ] Negative keyword list is attached to every campaign
- [ ] Start date recorded, and a 14-day review is in the calendar`,
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "search-term-analysis-sheet",
    kind: "template",
    title: "Search term report analysis sheet",
    summary:
      "The twelve-column analysis grid with an Action column, the five action rules that populate it, and worked rows showing harvest, negate, maintain and bid-reduce decisions side by side.",
    tags: ["search terms", "weekly", "keywords", "spreadsheet"],
    minutes: 5,
    level: "beginner",
    meta: {
      Columns: "12",
      Use: "Weekly",
      Pairs: "SOP-02",
      Floor: "5 clicks",
    },
    body: `The point of the sheet is the last column. Everything to its left exists so that
the Action column can be filled in without an argument.

## Analysis sheet

| Search Term | Campaign | Match Type | Impressions | Clicks | CTR | Orders | CVR | ACoS | Spend | Revenue | Action |
|-------------|----------|------------|-------------|--------|-----|--------|-----|------|-------|---------|--------|
| bluetooth widget | Widget_Exact | Exact | 5,000 | 150 | 3.0% | 12 | 8.0% | 22% | $180 | $818 | MAINTAIN |
| wireless audio widget | Widget_Auto | Auto | 3,200 | 85 | 2.7% | 8 | 9.4% | 18% | $102 | $567 | HARVEST to Exact |
| cheap widget | Widget_Phrase | Phrase | 1,800 | 45 | 2.5% | 0 | 0% | n/a | $54 | $0 | NEGATE |
| widget repair kit | Widget_Auto | Auto | 2,100 | 62 | 3.0% | 1 | 1.6% | 85% | $62 | $73 | BID REDUCE -15% |

Read the four rows as a set. They are the four outcomes the whole weekly analysis
produces, and every term in your report is one of them.

- **bluetooth widget** — already exact, 22% ACoS against target, converting at 8%.
  Nothing to do. Most of the report should look like this.
- **wireless audio widget** — found by the auto campaign, converting at 9.4% with an
  18% ACoS. Promote to exact and negate it in the auto campaign so they stop
  competing.
- **cheap widget** — 45 clicks, zero orders, $54 gone. Well past the 15-click rule.
  Negate exact, and consider a negative phrase on "cheap" across the account.
- **widget repair kit** — one order in 62 clicks at 85% ACoS. It converts, barely, so
  a negative is premature; a 15% bid cut is the right first move.

## Action rules

| Condition | Action | Priority |
|-----------|--------|----------|
| 2+ orders, ACoS below target | Harvest to manual exact | HIGH |
| 15+ clicks, 0 orders | Negate exact | HIGH |
| ACoS above 2x break-even | Negate or reduce bid | HIGH |
| CVR above 10%, low impressions | Increase bid +20% | MEDIUM |
| CTR below 0.2%, high impressions | Check relevance, consider negate | MEDIUM |

## Derived columns

Set these as formulas, not typed values, so a corrected input fixes everything
downstream:

    CTR     = Clicks / Impressions
    CVR     = Orders / Clicks
    ACoS    = Spend / Revenue
    ROAS    = Revenue / Spend
    CPC     = Spend / Clicks
    RPC     = Revenue / Clicks

Revenue per click is the underrated one. It converts every term to a single
comparable number: what one click from this term is worth. On the rows above,
"bluetooth widget" returns $5.45 per click and "widget repair kit" returns $1.18.

## Weekly log

Keep a second tab with one row per change:

| Date | Term | Change made | Campaign | Reason | Reviewed on |
|---|---|---|---|---|---|
| 2026-07-06 | cheap widget | Negative exact added | Widget_Phrase | 45 clicks, 0 orders | 2026-07-20 |
| 2026-07-06 | wireless audio widget | Harvested to exact at $0.90 | Widget_Exact_Top5 | 8 orders, 18% ACoS | 2026-07-20 |

Without this tab you cannot answer the only question a client ever asks about last
month: what did you actually change?`,
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "monthly-report-template",
    kind: "template",
    title: "Monthly performance report",
    summary:
      "The full client report skeleton: executive summary, an eleven-row metrics table with targets and status, what worked, what did not, recommendations and the competitive picture.",
    tags: ["reporting", "clients", "monthly", "metrics"],
    minutes: 5,
    level: "intermediate",
    meta: {
      Sections: "6",
      Use: "Monthly",
      Pairs: "SOP-06",
      Delivery: "By the 5th",
    },
    body: `Paste this into a document, fill the brackets, delete the guidance lines. The
structure is fixed on purpose: a client who receives the same six sections every
month learns where to look and stops asking you where to look.

## The report skeleton

    ACCOUNT: [Client Name]
    PERIOD: [Month Year]
    PREPARED BY: [Your Name]

    EXECUTIVE SUMMARY
    -------------------------------------------------------------
    - Overall: [Revenue increased/decreased] [X]% month over month
    - Key win: [Specific achievement, e.g. "Reduced ACoS from 35% to
      25% on the top product"]
    - Focus next month: [Specific goal, e.g. "Expand to Sponsored
      Display for retargeting"]

    KEY METRICS
    -------------------------------------------------------------
    Metric              Last month   This month   Change   Target
    Total Ad Spend      $X,XXX       $X,XXX       +X%      $X,XXX
    Total Ad Revenue    $X,XXX       $X,XXX       +X%      $X,XXX
    ACoS                XX%          XX%          -X pts   XX%
    ROAS                X.Xx         X.Xx         +X%      X.Xx
    TACoS               XX%          XX%          -X pts   XX%
    Total Sales (all)   $X,XXX       $X,XXX       +X%      --
    Clicks              X,XXX        X,XXX        +X%      --
    Impressions         XX,XXX       XX,XXX       +X%      --
    CTR                 X.XX%        X.XX%        +X%      --
    CVR                 X.XX%        X.XX%        +X%      --
    CPC                 $X.XX        $X.XX        -X%      --

    WHAT WORKED
    -------------------------------------------------------------
    1. [Campaign or keyword that performed] - [metric improvement]
    2. [Optimisation made and its impact]
    3. [New opportunity discovered]

    WHAT DID NOT WORK
    -------------------------------------------------------------
    1. [Underperforming area] - [what was tried, what happened]
    2. [Keywords negated] - [total savings: $X]
    3. [Lesson learned]

    RECOMMENDATIONS FOR NEXT MONTH
    -------------------------------------------------------------
    1. [Specific action] - [expected impact]
    2. [Budget adjustment] - [rationale]
    3. [New strategy] - [test plan]

    COMPETITIVE LANDSCAPE
    -------------------------------------------------------------
    - New competitors: [observations]
    - CPC trends: [increasing / decreasing / stable]
    - Market share: [estimate]

## Status markers

Use three states, not five. More granularity invites debate about whether something
is amber or red instead of about what to do next.

| Marker | Meaning | Threshold |
|---|---|---|
| On target | Within 10% of the agreed number | Report and move on |
| Watch | 10-25% off target | Named action in the recommendations |
| Off target | More than 25% off target | Leads the executive summary |

## Filling in the change column correctly

Percentages and percentage points are different, and mixing them is the fastest way
to lose a client's trust in your numbers.

- ACoS moving from 40% to 30% is a fall of **10 percentage points**, or a **25%
  reduction**. Both are true. Pick one convention and hold it all year.
- Spend moving from $4,000 to $5,000 is **+25%**. There are no percentage points
  involved, because spend is not itself a percentage.

## Attachments

- Full data spreadsheet, one tab per campaign
- Search term change log for the month
- Any test results that closed during the month`,
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "client-communication-templates",
    kind: "template",
    title: "Client communication templates",
    summary:
      "Three messages you will send hundreds of times: the weekly update, the monthly review email, and the escalation notice with its five mandatory lines.",
    tags: ["clients", "communication", "email", "escalation"],
    minutes: 5,
    level: "beginner",
    meta: {
      Messages: "3",
      Use: "Weekly and ad hoc",
      Pairs: "SOP-08",
      Tone: "Plain, specific",
    },
    body: `Consistency is the whole point. A client who gets the same shape of message every
Friday reads it in fifteen seconds; a client who gets a different shape every week
reads none of them.

## Weekly update

    Subject: PPC Weekly Update - [Client Name] - [Date Range]

    Hi [Client Name],

    Quick weekly update.

    PERFORMANCE
    - Spend: $[X] ([X]% of budget)
    - Revenue: $[X]
    - ACoS: [X]% (target: [X]%)
    - Status: On track / Needs attention

    DONE THIS WEEK
    - [Action 1, e.g. "Harvested 8 new keywords from the search term
      report"]
    - [Action 2, e.g. "Reduced bids on 12 keywords to improve ACoS"]
    - [Action 3, e.g. "Added 15 negative keywords, $[X] of weekly
      waste removed"]

    NEXT WEEK
    - [Planned action 1]
    - [Planned action 2]

    Let me know if you have any questions.

    [Your Name]

Every "done" line needs a number in it. "Optimised the campaigns" tells the client
nothing and is indistinguishable from having done nothing.

## Monthly review

    Subject: Monthly PPC Report - [Client Name] - [Month Year]

    Hi [Client Name],

    Attached is your monthly PPC performance report.

    KEY HIGHLIGHTS
    - [Top achievement]
    - [Biggest improvement]
    - [Opportunity identified]

    MONTH AT A GLANCE
    - Revenue: $[X] (+[X]% vs last month)
    - ACoS: [X]% (target: [X]%)
    - TACoS: [X]%

    FULL REPORT: [Attached / link]

    Can we schedule 30 minutes this week to discuss? I have some
    recommendations for next month.

    [Your Name]

## Escalation notice

    Subject: URGENT: PPC Alert - [Client Name]

    Hi [Client Name],

    I noticed an issue that needs your attention.

    ISSUE: [Brief description, e.g. "Product X is out of stock in FBA"]
    IMPACT: [What is affected, e.g. "PPC campaigns for this product
            are paused; roughly $50/day in potential sales affected"]
    TIMELINE: [When it started, e.g. "Started this morning at 9 AM"]
    ACTION TAKEN: [What you did, e.g. "Paused all campaigns for this
            product to prevent wasted spend"]
    NEXT STEP: [What the client needs to do, e.g. "Please restock FBA
            inventory or switch to FBM"]

    Let me know how you would like to proceed.

    [Your Name]

## Rules for all three

| Rule | Why |
|---|---|
| Numbers in every claim | "Improved performance" is not a report |
| One subject line format per message type | The client can filter and search |
| Action taken before action needed | Shows you moved first, then ask |
| No jargon without a translation | TACoS needs one clause of explanation, every time |
| Send on a schedule, even when flat | Silence reads as neglect, not as calm |

## What never goes in a client message

- Blame. Not the client's, not Amazon's, not a previous agency's.
- Speculation presented as fact. "Amazon probably changed the algorithm" is not an
  explanation, it is an absence of one.
- A problem with no recommendation attached.
- Screenshots as a substitute for a sentence.`,
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: "keyword-research-sheet",
    kind: "template",
    title: "Keyword research sheet",
    summary:
      "The eight-column research grid, the five-source research process, and the priority rules that map search volume and relevance onto a specific campaign assignment.",
    tags: ["keywords", "research", "launch", "spreadsheet"],
    minutes: 5,
    level: "beginner",
    meta: {
      Columns: "8",
      Sources: "5",
      Use: "Per product",
      Target: "50-100 terms",
    },
    body: `The output of research is not a list of keywords. It is a list of keywords with a
campaign already assigned to each one.

## Research sheet

| Keyword | Source | Search Volume | Competition | Relevance (1-10) | CPC Est. | Priority | Campaign Assignment |
|---------|--------|---------------|-------------|-------------------|----------|----------|---------------------|
| bluetooth widget | Cerebro | 12,000/mo | High | 10 | $1.20 | TOP 5 | Manual Exact |
| wireless widget | Magnet | 8,500/mo | Medium | 9 | $0.95 | TOP 10 | Manual Exact |
| widget for home | Cerebro | 3,200/mo | Low | 8 | $0.60 | EXPAND | Manual Phrase |
| best widget 2026 | Magnet | 2,100/mo | Medium | 7 | $0.85 | EXPAND | Manual Phrase |
| widget accessories | Cerebro | 1,500/mo | Low | 6 | $0.45 | TEST | Auto |

## Research process

1. **Cerebro** — reverse-ASIN a competitor. Find the keywords they already rank for.
2. **Magnet** — seed keyword expansion. Find the related terms and long tails.
3. **Amazon auto** — let Amazon discover terms you would never have guessed.
4. **Manual search** — type the seed keyword into Amazon and read the suggestions.
5. **Google Trends** — check the seasonal demand pattern before you commit budget.

Run all five. Each one is blind to something the others see: Cerebro cannot see
demand that no competitor has captured, Magnet cannot see how shoppers actually
phrase things, and the auto campaign cannot see anything until you have spent money.

## Priority rules

| Priority | Criteria | Campaign |
|----------|----------|----------|
| TOP 5 | Volume above 5K, relevance 9-10 | Manual Exact |
| TOP 10 | Volume above 2K, relevance 7-8 | Manual Exact |
| EXPAND | Volume above 1K, relevance 6-7 | Manual Phrase |
| TEST | Volume above 500, relevance 5-6 | Auto |

Relevance is scored by you, by hand, and it outranks volume every time. A 40,000
per month keyword scored 4 for relevance will take your budget and return nothing,
because the shoppers typing it want a different product.

## Scoring relevance honestly

| Score | Test |
|---|---|
| 10 | Someone typing this wants exactly your product |
| 8-9 | They want your product category and yours qualifies |
| 6-7 | Your product is a plausible answer among several |
| 4-5 | Your product is a stretch; the click may still convert |
| 1-3 | They want something else. Do not bid. |

## Estimating the opening bid

Once relevance and volume have chosen the campaign, the bid comes from arithmetic,
not from the tool's suggestion:

    Opening bid = Target ACoS x Product Price x Estimated CVR

For a $34.99 product with a 30% ACoS target and an estimated 10% conversion rate:

    0.30 x 34.99 x 0.10 = $1.05

Compare that to the CPC estimate in the sheet. If your calculated bid is well below
the category CPC estimate, the keyword is unaffordable at your current conversion
rate and price — which is a listing or pricing conversation, not a bidding one.`,
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: "campaign-audit-checklist",
    kind: "template",
    title: "Campaign audit checklist",
    summary:
      "Six audit blocks covering structure, keywords, bids and budgets, listings, reporting and security — the checklist that turns a vague sense that an account is messy into a scored list of fixes.",
    tags: ["audit", "structure", "onboarding", "checklist"],
    minutes: 5,
    level: "intermediate",
    meta: {
      Blocks: "6",
      Use: "Onboarding and quarterly",
      Pairs: "SOP-05",
      Time: "1-2 hours",
    },
    body: `Run this at onboarding, then quarterly. It takes an hour or two and it is the single
most persuasive document you can put in front of a prospective client.

## Structure

- [ ] Campaign naming convention is consistent
- [ ] Portfolio organisation is logical
- [ ] No more than 5-7 campaigns per product
- [ ] Budget allocation follows the 40/25/20/15 rule
- [ ] Minimum $10 per day on every active campaign

## Keywords

- [ ] Auto campaigns are running for discovery
- [ ] Manual exact match exists for proven terms
- [ ] Phrase or broad exists for expansion
- [ ] Negative keywords are implemented
- [ ] No keyword overlap between campaigns

## Bids and budgets

- [ ] Bids are aligned with ACoS targets
- [ ] No campaigns hitting daily budget before end of day
- [ ] Placement adjustments are optimised
- [ ] Dynamic bidding strategy is set correctly

## Listings

- [ ] Main image is optimised for click-through
- [ ] Title includes the primary keywords
- [ ] Bullet points highlight benefits, not just features
- [ ] A+ Content is live, if Brand Registry allows it
- [ ] Price is competitive within the category

## Reporting

- [ ] Search term reports downloaded weekly
- [ ] Performance tracked over time
- [ ] Client reports delivered on schedule
- [ ] Changes documented

## Security

- [ ] Account access is limited to authorised users
- [ ] Two-factor authentication is enabled
- [ ] Billing information is secure

## Scoring the audit

Twenty-six checks across six blocks. Score each block as a percentage and total them
into a single headline number the client can hold on to:

| Score | Reading | What it implies |
|---|---|---|
| 90-100% | Well run | Optimise, do not restructure |
| 70-89% | Sound with gaps | Targeted fixes, one block at a time |
| 50-69% | Drifting | Restructure one product line as a pilot |
| Below 50% | Unstructured | Full restructure per SOP-05 |

## Turning the audit into a proposal

For every unchecked box, write one line with three parts: what is wrong, what it
costs, and what you would do. For example:

> **Zero negative keywords.** Last month 31% of spend ($1,240) went to search terms
> with no orders. Adding a shared negative list and running the weekly harvest routine
> would recover most of that within two reporting cycles.

Three lines like that are worth more than a forty-slide deck, because each one names
a number the client can verify in their own console.`,
  },

  /* ---------------------------------------------------------------- 07 */
  {
    id: "ab-test-tracker",
    kind: "template",
    title: "A/B test tracker",
    summary:
      "The fifteen-column test log that stops a team from re-running the same experiment twice a year, with worked entries showing a shipped winner and an inconclusive test.",
    tags: ["testing", "listings", "cvr", "spreadsheet"],
    minutes: 4,
    level: "advanced",
    meta: {
      Columns: "15",
      Use: "Per test",
      Pairs: "Workflow 6",
      Bar: "95% confidence",
    },
    body: `One row per test, added the day the test launches rather than the day it ends. Tests
logged after the fact are always logged optimistically.

## Tracker columns

| Column | Notes |
|---|---|
| Test ID | Sequential: AB-001, AB-002 |
| Product | ASIN or product line |
| Element | Image, title, price, bullets, A+ Content, bid strategy |
| Control | The current version |
| Variant | The proposed change |
| Metric | One primary KPI, chosen before launch |
| Start Date | |
| End Date | Planned, then actual |
| Sample Size | Impressions for CTR tests, clicks for CVR tests |
| Control Result | |
| Variant Result | |
| Winner | Control, Variant, or None |
| Confidence | Ship at 95%+ |
| Notes | Confounders observed, decisions made |
| Shipped | Yes, No, or Pending |

## Worked entries

| Test ID | Product | Element | Control | Variant | Metric | Start | End | Sample | Control | Variant | Winner | Confidence | Notes |
|---------|---------|---------|---------|---------|--------|------------|----------|-------------|----------------|----------------|--------|------------|-------|
| AB-001 | Widget X | Main image | White bg | Lifestyle | CTR | 2026-07-01 | 2026-07-15 | 5,000 imp. | 0.35% | 0.52% | Variant | 95% | Lifestyle won, shipped |
| AB-002 | Widget X | Price | $29.99 | $27.99 | CVR | 2026-07-15 | 2026-07-29 | 3,000 clicks | 8.2% | 9.1% | Variant | 88% | Extend test |
| AB-003 | Gadget Y | Title | Short | Keyword-rich | CTR | 2026-08-01 | 2026-08-15 | 4,000 imp. | -- | -- | -- | -- | In progress |

## Reading AB-001 and AB-002 together

AB-001 moved CTR from 0.35% to 0.52%, a relative lift of 48.6%, at 95% confidence. It
ships.

AB-002 moved CVR from 8.2% to 9.1%, a relative lift of 11.0%, but only at 88%
confidence. That means roughly a one-in-eight chance the difference is noise, against
a permanent $2.00 price cut on every unit. On 500 units a month that is $1,000 of
margin wagered on a coin that lands wrong one time in eight. Extend the test.

## Reporting a test to a client

Three sentences, in this order:

1. What you changed and why you thought it would work.
2. What happened, with both numbers and the confidence level.
3. What you are doing about it.

## Housekeeping rules

- **Never delete a row.** A failed test is a result. Deleting it guarantees someone
  re-runs it next year.
- **One variable per test.** Changing the image and the title together tells you that
  something worked, which is not actionable.
- **Log the confounders in Notes as they happen**, not in retrospect. Nobody
  remembers in week four that the price changed in week two.`,
  },
];

export function resourceRefs(): ResourceRef[] {
  return docRefs(templates, "/templates", UPDATED);
}

export function findTemplate(id: string): DocResource | undefined {
  return templates.find((template) => template.id === id);
}
