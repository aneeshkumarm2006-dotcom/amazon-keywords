import { docRefs } from "@/components/doc/data";
import type { DocResource, ResourceRef } from "@/types/content";

/**
 * Standard operating procedures.
 *
 * Ported from `../ppc-tools-for-va/sops/ppc-sops.md`. Every threshold,
 * timing and decision rule is the source's — nothing here invents a number.
 */

const UPDATED = "2026-06-29";

export const sops: DocResource[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "daily-health-check",
    kind: "sop",
    title: "SOP-01: Daily PPC Health Check",
    summary:
      "The 15-minute morning routine that catches budget caps, ACoS spikes, out-of-stock products and pacing problems before they cost a day of spend.",
    tags: ["daily", "monitoring", "budget", "anomalies"],
    minutes: 6,
    level: "beginner",
    meta: {
      Frequency: "Daily (every workday)",
      Time: "15 min per account",
      Owner: "PPC Specialist / VA",
      Escalation: "L2 to L4",
    },
    body: `**Objective:** ensure all campaigns are running correctly and catch anomalies early.

This is the first thing you do every workday, before any optimisation work. Fifteen
minutes of structured looking beats an hour of reacting after the damage is done.

## Inputs

- Amazon Advertising Console access
- Campaign performance dashboard

## Steps

### 1. Budget check — 3 minutes

- Review daily spend for each campaign.
- Flag: any campaign that hit budget before end of day.
- Flag: any campaign with 0 spend (potential suppression).
- Action: increase budget if profitable, investigate if 0 spend.

### 2. Anomaly scan — 5 minutes

Check every account for these four signatures:

| Signal | Threshold | Why it matters |
|---|---|---|
| ACoS spike | More than 20% increase from the 7-day average | Efficiency is slipping before revenue shows it |
| CTR drop | More than 30% decrease | Usually a listing change: image, title or price |
| Impression drop | More than 50% decrease | Suppression, budget cap, or a lost auction |
| CPC spike | More than 25% increase | Competitor entered, or a bid rule over-fired |

Action: investigate root cause **before** making changes. A bid cut on a CPC spike
caused by a competitor launch is a different decision to a bid cut on a genuine
efficiency problem.

### 3. Out-of-stock check — 3 minutes

- Verify all advertised products are in stock.
- Flag: any product with fewer than 7 days of inventory.
- Action: pause ads for OOS products, alert client.

### 4. Budget pacing — 4 minutes

- Calculate: is spend tracking toward the daily budget?
- Spending too fast: review bid adjustments.
- Spending too slow: check keyword bids and auction competitiveness.

## Decision rules

| Condition | Action |
|-----------|--------|
| Campaign hit budget before 6 PM | Increase budget by 20% if ACoS is profitable |
| Campaign has $0 spend for 24+ hours | Check: paused? OOS? Bid too low? |
| ACoS increased more than 20% from the 7-day average | Investigate: new keywords? competitor? CPC spike? |
| Product OOS | Pause campaign immediately, notify client |
| CTR dropped more than 30% | Check: listing changed? Main image? Price? |

## Outputs

- Daily health check log (spreadsheet or Notion)
- Anomaly alerts sent to client, if critical
- Budget adjustments documented

## Escalation

- If ACoS exceeds 2x break-even: escalate to senior specialist.
- If product suppressed: notify client immediately.
- If account access issues: escalate to client within 1 hour.

## Common mistakes

- **Changing bids during the scan.** The scan is for looking. Fix what is broken
  (OOS, suppressed, budget-capped); schedule everything else for the bid SOP.
- **Treating a single day as a trend.** Compare against the 7-day average, which is
  what every threshold above is written against.
- **Skipping the log.** Without a log you cannot tell a client what changed and when,
  and you cannot tell yourself which change caused which result.`,
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "weekly-search-term-analysis",
    kind: "sop",
    title: "SOP-02: Weekly Search Term Report Analysis",
    summary:
      "The harvest-and-negate routine: pull the 7-day search term report, promote converting terms to exact match, and cut the terms burning clicks with no orders.",
    tags: ["weekly", "search terms", "keywords", "negatives"],
    minutes: 7,
    level: "beginner",
    meta: {
      Frequency: "Weekly (Monday)",
      Time: "30-45 min per account",
      Owner: "PPC Specialist / VA",
      Window: "Last 7 days",
    },
    body: `**Objective:** identify harvesting opportunities and negative keyword candidates.

This is where the money is. Every week the auto and broad campaigns hand you a list
of what real shoppers typed. Your job is to promote the winners and stop paying for
the losers.

## Inputs

- Search Term Report, last 7 days
- Campaign performance data
- Current negative keyword list

## Steps

### 1. Download and sort — 5 minutes

- Download the Search Term Report from the Amazon Advertising Console.
- Sort by spend, descending.
- Filter: minimum 5 clicks, for statistical relevance.

A term with 3 clicks and no orders tells you nothing. A term with 30 clicks and no
orders tells you everything.

### 2. Identify harvesting candidates — 15 minutes

- Look for: search terms with 2+ orders **and** ACoS below target.
- These are winning terms. Add them as exact match in manual campaigns.
- Check: is this term already targeted? If yes, skip it.
- Action: add to the manual campaign with an appropriate bid.

### 3. Identify negative candidates — 15 minutes

- Look for: search terms with 15+ clicks **and** 0 orders.
- Look for: search terms with ACoS above 2x break-even.
- Check relevance first. Sometimes a high ACoS is a listing problem, not a keyword
  problem — negating it hides the symptom and keeps the disease.
- Action: add as negative exact, or negative phrase if the term is completely
  irrelevant.

### 4. Identify bid adjustment candidates — 5 minutes

- Look for: terms with high impressions but CTR below 0.2%.
- Look for: terms with high CVR but low impressions — the bid is too low.
- Action: adjust bids accordingly.

### 5. Document and update — 5 minutes

- Log every change you made.
- Update the negative keyword list.
- Note any trends or patterns for the client report.

## Decision rules

| Condition | Action |
|-----------|--------|
| 2+ orders, ACoS below target | Harvest to manual exact match |
| 15+ clicks, 0 orders | Add as negative exact |
| ACoS above 2x break-even | Add as negative exact, unless CVR is high |
| CTR below 0.2%, impressions above 1,000 | Check listing relevance, consider negating |
| High CVR, low impressions | Increase bid by 20-30% |

## Outputs

- Updated campaign structure, with new keywords added
- Updated negative keyword list
- Weekly analysis log
- Client report section

## Worked example

A supplement account, 7-day report, sorted by spend:

| Search term | Clicks | Orders | Spend | Sales | ACoS | Action |
|---|---|---|---|---|---|---|
| magnesium glycinate 400mg | 62 | 9 | $74.40 | $269.91 | 27.6% | Harvest to exact (target 35%) |
| magnesium supplement | 48 | 4 | $62.40 | $119.96 | 52.0% | Reduce bid 15%, keep |
| magnesium citrate powder | 31 | 0 | $40.30 | $0.00 | n/a | Negate exact, 15+ clicks and 0 orders |
| cheap magnesium pills | 18 | 0 | $19.80 | $0.00 | n/a | Negate exact |

Total waste removed: $60.10 in one week, or roughly $260 per month, on two negatives
that took thirty seconds to add.`,
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "bid-optimization",
    kind: "sop",
    title: "SOP-03: Bid Optimization",
    summary:
      "The ACoS-banded bid ladder: compare 7-day keyword ACoS against target, move bids by the band, and never move a bid more than 20% in one pass.",
    tags: ["bids", "acos", "optimization", "placements"],
    minutes: 6,
    level: "intermediate",
    meta: {
      Frequency: "2-3x per week",
      Time: "20-30 min per account",
      Owner: "PPC Specialist / VA",
      Guardrail: "Max 20% change",
    },
    body: `**Objective:** adjust bids to hit target ACoS while maximising volume.

Bid work is arithmetic, not intuition. The ladder below turns "this keyword feels
expensive" into a repeatable decision anyone on the team can audit.

## Inputs

- Campaign performance data, 7-day rolling
- Target ACoS per campaign
- Current bid levels

## Steps

### 1. Pull data — 3 minutes

- Export keyword-level performance for the last 7 days.
- Calculate 7-day ACoS per keyword.
- Compare each keyword to its campaign's target ACoS.

### 2. Apply bid rules — 15 minutes

Use the decision rules below. Make changes in bulk operations or manually. Maximum
bid change is **20% per adjustment** — larger moves make the data unreadable because
you can no longer tell whether performance changed or your bid did.

### 3. Review placement adjustments — 5 minutes

- Check Top of Search performance.
- If Top of Search CVR is more than 2x the average: increase the placement bid.
- If Rest of Search is performing better: decrease the placement bid.

### 4. Document changes — 5 minutes

- Log all bid changes with reasoning.
- Note any patterns: CPC inflation, competition changes.

## Decision rules

| 7-day ACoS vs target | Action | Bid change |
|------------|--------|------------|
| Below 50% of target | Increase bid, there is room for more volume | +15% |
| 50-80% of target | Maintain or slight increase | +5-10% |
| 80-120% of target | Maintain, you are at target | 0% |
| 120-150% of target | Decrease bid | -10 to -15% |
| 150-200% of target | Decrease bid significantly | -20 to -25% |
| Above 200% of target | Evaluate: negate or major reduction | -30% or negate |

Read the table against the target, not against an absolute number. A 45% ACoS is
excellent on a 60% target and a disaster on a 20% target.

## Special rules

- **New keywords, under 14 days of data:** do not adjust. Let data accumulate.
- **Seasonal keywords:** adjust based on historical seasonal patterns.
- **Brand keywords:** maintain competitive bids. You are protecting the brand, and
  losing your own brand term to a competitor costs more than the click.
- **Competitor keywords:** aggressive bids if CVR is strong.

## Worked example

Target ACoS is 30%. A keyword ran 7 days at 51% ACoS with a $1.20 bid.

- 51% / 30% = 170% of target, which lands in the 150-200% band.
- Band action: decrease 20-25%.
- New bid: $1.20 x 0.78 = $0.94 (round to $0.94, a 21.7% cut).
- Next review in 3 days, not tomorrow — the keyword needs impressions at the new bid
  before the number means anything.`,
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "campaign-launch",
    kind: "sop",
    title: "SOP-04: Campaign Launch (New Product)",
    summary:
      "Two to three hours from keyword research to live campaigns: the pre-launch gate, the three-campaign structure, bid maths and the 30-day review timeline.",
    tags: ["launch", "structure", "keywords", "new product"],
    minutes: 8,
    level: "intermediate",
    meta: {
      Frequency: "As needed",
      Time: "2-3 hrs per product",
      Owner: "PPC Specialist / VA",
      Budget: "$35-50 per day",
    },
    body: `**Objective:** set up PPC campaigns for a new product from scratch.

A launch is the one moment where structure decisions are cheap. Every hour you spend
on structure now saves a restructuring project later.

## Pre-launch checklist

Do not spend a peso until every box is ticked. Ads amplify a listing; they do not
fix one.

- [ ] Product listing optimised: title, bullets, images, A+ Content
- [ ] Product in stock: FBA, or FBM with Prime
- [ ] Competitive pricing set
- [ ] Review strategy in place: Vine, early reviews
- [ ] Brand Registry confirmed, if running SB or SD

## Steps

### 1. Keyword research — 30 minutes

- Use Helium 10 Cerebro or Magnet, or manual research.
- Identify 50-100 relevant keywords.
- Categorise: exact match (top 10), phrase match (20-30), broad match (the rest).
- Check search volume and competition.

### 2. Campaign structure setup — 30 minutes

- Create a portfolio: [Product Name] PPC.
- Campaign 1: Auto (discovery), $10-15 per day.
- Campaign 2: Manual Exact (proven terms), $15-20 per day.
- Campaign 3: Manual Phrase (expansion), $10-15 per day.
- Total daily budget: $35-50 per day.

### 3. Keyword loading — 20 minutes

- Auto campaign: let Amazon use the listing data.
- Manual Exact: add the top 10 keywords with calculated bids.
- Manual Phrase: add 20-30 keywords at slightly lower bids.
- Set match types correctly — this is the step people get wrong at 11 PM.

### 4. Bid setting — 15 minutes

Calculate the initial bid:

    Initial bid = Target ACoS x Product Price x Estimated CVR

Start conservative, below the calculated figure. Add placement adjustments: +25% Top
of Search for exact match.

Worked example — a $34.99 product, 30% target ACoS, 10% estimated CVR:

    0.30 x $34.99 x 0.10 = $1.05

Open at $0.85-0.95 and let the data pull the bid up, rather than opening at $1.30 and
discovering the CVR estimate was optimistic after $400 of spend.

### 5. Negative keywords — 15 minutes

- Add common negatives: "free", "cheap", "DIY", "repair".
- Add category-specific negatives.
- Set up a shared negative keyword list so every campaign inherits it.

### 6. Naming convention — 5 minutes

    [Product]_[Type]_[MatchType]_[Date]

    Example: KitchenWidget_Auto_Auto_20260629

### 7. Documentation — 15 minutes

- Screenshot the initial setup.
- Document the keyword list and bids.
- Set a review date 14 days from launch.

## Post-launch timeline

| Day | Action |
|-----|--------|
| Day 1-3 | Monitor only, no changes |
| Day 4-7 | First search term review, identify early patterns |
| Day 7-14 | First bid adjustments based on data |
| Day 14 | Full review: harvest, negate, restructure if needed |
| Day 30 | Comprehensive performance review, client report |

The hardest part of a launch is the first three days, because doing nothing feels
like negligence. It is not. Changing bids on day two destroys the only clean baseline
you will ever have.`,
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: "campaign-restructuring",
    kind: "sop",
    title: "SOP-05: Campaign Restructuring",
    summary:
      "How to rebuild an account that has drifted: the five restructure triggers, the audit-first sequence, archiving instead of deleting, and the 14-day change freeze.",
    tags: ["restructure", "audit", "structure", "senior"],
    minutes: 6,
    level: "advanced",
    meta: {
      Frequency: "As needed",
      Time: "4-8 hrs",
      Owner: "Senior PPC Specialist",
      Freeze: "14 days after cutover",
    },
    body: `**Objective:** reorganise a poorly performing or unstructured account.

Restructuring is the most dangerous thing a specialist does. You are deleting history
in exchange for clarity. Do it deliberately, document everything, and then leave it
alone long enough to find out whether it worked.

## When to restructure

Any one of these is a reason to consider it. Two or more is a reason to schedule it.

- ACoS consistently above 2x break-even despite optimisation.
- More than 20 campaigns with under $5 per day of budget each.
- No clear campaign hierarchy or naming convention.
- Auto and manual campaigns mixed without a strategy.
- Zero negative keywords.

## Steps

### 1. Audit and document — 1-2 hours

- Screenshot everything before changes.
- Catalog all campaigns, ad groups and keywords.
- Identify: dead campaigns, winners, losers.
- Calculate current ACoS, CVR and CTR per campaign.
- Document current budget allocation.

### 2. Design the new structure — 1 hour

- Define the portfolio hierarchy.
- Set the campaign naming convention.
- Plan which campaigns to keep, merge and archive.
- Plan the new campaigns to create.

### 3. Create new campaigns — 1-2 hours

- Build the new campaign structure.
- Migrate winning keywords from the old campaigns.
- Set appropriate bids and budgets.
- Add negative keywords.

### 4. Archive old campaigns — 30 minutes

- Archive, do not delete. Deleting destroys the historical data you will need to
  prove the restructure worked.
- Preserve historical data.
- Document what was archived and why.

### 5. Monitor the transition — 2-4 weeks

- Daily health checks.
- Weekly performance comparison, old versus new.
- Adjust as needed, but make no further structural changes for 14 days.

## Why consolidation works

Twenty campaigns at $5 per day is $100 of daily budget split so thin that no single
campaign ever accumulates enough conversion data for Amazon's bidding to learn.
Twelve campaigns at the same total budget clear the data threshold, and you spend
your week on twelve decisions instead of forty.

The supplement turnaround in the portfolio guide is the canonical version of this
trade: 40 campaigns became 12, ACoS fell from 75% to 28%, revenue rose from $10,500
to $18,200 per month, and weekly management time dropped from 20 hours to 8.`,
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: "monthly-performance-report",
    kind: "sop",
    title: "SOP-06: Monthly Performance Report",
    summary:
      "The six-block client report: executive summary, the ten-metric dashboard, what worked, what did not, recommendations and the competitive picture.",
    tags: ["reporting", "clients", "metrics", "monthly"],
    minutes: 5,
    level: "intermediate",
    meta: {
      Frequency: "Monthly (1st)",
      Time: "1-2 hrs per account",
      Owner: "PPC Specialist / VA",
      Delivery: "By the 5th",
    },
    body: `**Objective:** provide clients with clear, actionable performance insights.

A report is not a data dump. The client is paying you to have already done the
thinking; the numbers are your evidence, not your conclusion.

## Report structure

### 1. Executive summary — three bullets maximum

- Overall performance: up, down or flat.
- The key win from last month.
- The key focus for next month.

If it takes more than three bullets, you have not decided what mattered yet.

### 2. Metrics dashboard

| Metric | Last month | This month | Target | Trend |
|--------|-----------|------------|--------|-------|
| Total Ad Spend | | | | |
| Total Ad Revenue | | | | |
| ACoS | | | | |
| ROAS | | | | |
| TACoS | | | | |
| Clicks | | | | |
| Impressions | | | | |
| CTR | | | | |
| CVR | | | | |
| CPC | | | | |

### 3. What worked

- Top 3 performing campaigns.
- Top 5 performing keywords.
- Key optimisations made and their impact.

### 4. What did not work

- Underperforming campaigns, and why.
- Keywords negated, and total savings.
- Lessons learned.

Include this section every month. A report with no failures reads as a report with
no honesty, and clients notice.

### 5. Recommendations

- Specific actions for next month.
- Budget adjustments proposed.
- New opportunities identified.

### 6. Competitive landscape

- Any new competitors observed.
- CPC trends in the category.
- Market share changes.

## Delivery

- Send by email by the 5th of each month.
- Include a spreadsheet with the full data.
- Schedule a 30-minute call to discuss (optional).

## Quality bar

Before you send, check the report answers these three questions without the client
having to ask:

1. Did we make or lose money against target, and by how much?
2. What is the single biggest lever available next month?
3. What do you need from the client to pull it?`,
  },

  /* ---------------------------------------------------------------- 07 */
  {
    id: "client-onboarding",
    kind: "sop",
    title: "SOP-07: Client Onboarding",
    summary:
      "Three to five hours from discovery call to kickoff: goals, access, audit, a written strategy the client approves, and the expectation that weeks one and two are data collection.",
    tags: ["clients", "onboarding", "strategy", "access"],
    minutes: 5,
    level: "intermediate",
    meta: {
      Frequency: "Per new client",
      Time: "3-5 hrs total",
      Owner: "PPC Specialist / VA",
      Ramp: "2 weeks of data first",
    },
    body: `**Objective:** set up a new PPC client for success.

Most client relationships fail in the first month, and almost never because of the
advertising. They fail because nobody wrote down what success looks like.

## Steps

### 1. Discovery call — 1 hour

- **Goals:** revenue target, ACoS target, timeline.
- **Budget:** monthly PPC budget, and how flexible it is.
- **Products:** which products to advertise, and in what priority.
- **Competition:** who the main competitors are.
- **Past performance:** any historical PPC data.

### 2. Account access — 30 minutes

- Request Seller Central access with user permissions.
- Request Advertising Console access.
- Verify Brand Registry status.
- Verify the product catalog and inventory.

Never accept a shared login. User permissions give you an audit trail, and an audit
trail is what protects you when something changes that you did not change.

### 3. Audit — 1-2 hours

- Full account audit, if existing campaigns are running.
- Or product and keyword research, if the client is new to PPC.
- Document findings in the audit template.

### 4. Strategy proposal — 1 hour

- Write a strategy document.
- Include campaign structure, budget allocation, timeline and KPIs.
- Present it to the client for approval.

### 5. Implementation — 1-2 hours

- Build campaigns per the approved strategy.
- Set up reporting templates.
- Set up the communication cadence.

### 6. Kickoff — 30 minutes

- Walk the client through what was set up.
- Confirm the reporting schedule.
- Set expectations: the first two weeks are data collection, not optimisation.

## The expectation conversation

Say this out loud on the kickoff call, in these words or close to them:

> For the first 14 days I am buying information, not sales. The numbers in week one
> will look worse than the numbers in week six, and that is the plan working, not the
> plan failing. The first optimisation pass lands on day 14.

Clients who hear this on day zero do not panic on day four.`,
  },

  /* ---------------------------------------------------------------- 08 */
  {
    id: "escalation-procedures",
    kind: "sop",
    title: "SOP-08: Escalation Procedures",
    summary:
      "The four escalation levels, what triggers each one, how fast you have to move, and the six-line message template that makes an escalation useful instead of alarming.",
    tags: ["escalation", "clients", "risk", "communication"],
    minutes: 4,
    level: "beginner",
    meta: {
      Frequency: "Continuous",
      Time: "Varies by level",
      Owner: "Whoever sees it first",
      Levels: "L1 to L4",
    },
    body: `**Objective:** define when and how to escalate issues to the client or a senior
specialist.

Escalation is a skill, not an admission. The specialist who escalates an L3 in two
hours is worth more than the one who quietly hopes it resolves overnight.

## Escalation levels

| Level | Condition | Action | Timeline |
|-------|-----------|--------|----------|
| **L1 — Monitor** | Minor ACoS fluctuation, under 20% | Log and monitor | No escalation |
| **L2 — Alert** | Significant ACoS spike above 20%, CTR drop, CPC increase | Investigate, prepare report, alert client next business day | Within 24 hours |
| **L3 — Urgent** | Product suppressed, account warning, budget depletion | Notify client immediately by phone or Slack | Within 2 hours |
| **L4 — Critical** | Account suspension, policy violation, billing issue | Contact client immediately, escalate to Amazon support | Immediately |

## Escalation message template

    Subject: [L2/L3/L4] PPC Alert — [Account Name]

    Issue: [Brief description]
    Impact: [What is affected — campaigns, metrics, revenue]
    Timeline: [When it started, how long ongoing]
    Investigation: [What I have checked so far]
    Recommendation: [What I suggest doing]
    Action needed: [Client decision required? Or will I proceed?]

## Why the template works

Six lines, in that order, answer the six questions a client asks in the first thirty
seconds of a bad message. The last line matters most: it tells the client whether
they need to do something or whether you have it, which is the difference between a
message that creates calm and one that creates a phone call.

## Judgement calls

- **When in doubt, escalate one level up.** An unnecessary L3 costs a two-minute
  message. A missed L3 costs a week of suppressed sales.
- **Escalate facts, not fears.** "ACoS is 68% against a 30% target, up from 31% on
  Monday" is an escalation. "Something feels wrong with the account" is not.
- **Never escalate without a recommendation.** If you genuinely do not have one, say
  what you would need in order to form one.`,
  },
];

export function resourceRefs(): ResourceRef[] {
  return docRefs(sops, "/sops", UPDATED);
}

export function findSop(id: string): DocResource | undefined {
  return sops.find((sop) => sop.id === id);
}
