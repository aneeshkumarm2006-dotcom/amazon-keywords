import { docRefs } from "@/components/doc/data";
import type { DocResource, ResourceRef } from "@/types/content";

/**
 * Automation guides and the tool comparison.
 *
 * Ported from `../ppc-tools-for-va/automation/ppc-automation.md`. Prices,
 * tiers, rule thresholds and the cost-benefit arithmetic are the source's.
 */

const UPDATED = "2026-06-29";

export const automationGuides: DocResource[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "what-automation-automates",
    kind: "automation",
    title: "What PPC automation actually automates",
    summary:
      "An honest map of the eight core PPC tasks: which two fully automate, which three partly automate with human review, and which three never should.",
    tags: ["fundamentals", "strategy", "tools"],
    minutes: 4,
    level: "beginner",
    meta: {
      Tasks: "8 mapped",
      "Fully automatable": "2",
      "Never automate": "3",
      Verdict: "Automate execution",
    },
    body: `Automation vendors sell a story where the tool runs the account. It does not. It runs
the mechanical half of the account, which is genuinely worth paying for, and leaves
the half that clients are actually paying you for.

## The task map

| Task | Automatable? | Tool |
|------|-------------|------|
| Bid adjustments | Yes | Adtomic, Ad Badger, rules-based tools |
| Budget pacing | Yes | Most PPC tools, Amazon rules |
| Negative keyword harvesting | Partial | Adtomic, with manual review |
| Keyword harvesting | Partial | Adtomic, with manual verification |
| Search term analysis | No, needs judgement | Manual, the VA's expertise |
| Campaign strategy | No, needs expertise | Manual, the specialist's value |
| Client communication | No, needs a relationship | Manual, the VA's professionalism |
| Reporting | Partial | Automated dashboards plus human analysis |

## The key insight

Automation handles the *mechanical* work. You handle the *strategic* work. The VA who
can do both is worth two to three times more than one who only automates.

That is not a motivational line, it is a pricing observation. A rules engine costs
$49 a month and any seller can buy one. Judgement about whether a 62% ACoS on a brand
term is a problem or a defence cannot be bought at any price, which is why it is the
part clients pay a person for.

## Why "partial" is the interesting column

The three partial rows are where most of the value and most of the risk live.

- **Negative keyword harvesting.** A rule that negates on 15 clicks and 0 orders is
  right most of the time and catastrophically wrong occasionally — on a term that is
  seasonal, on a term that was out of stock during the window, on a term that
  converts at a 40-day lag. Let the tool build the list, then approve it.
- **Keyword harvesting.** Automated harvesting will promote terms that are near
  duplicates of what you already run, and will happily create three campaigns bidding
  on the same phrase. Verify before you accept.
- **Reporting.** Data collection automates perfectly. The paragraph explaining why
  ACoS moved does not, and that paragraph is the report.

## The test for whether to automate a task

Ask: if this rule fires wrongly at 3 AM on a Saturday, what does it cost, and how
long before anyone notices? A bid cut of 15% is recoverable by Monday. A negative
phrase on your best-converting term is not.`,
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "tool-comparison",
    kind: "automation",
    title: "Tool comparison: twelve Amazon PPC tools",
    summary:
      "Twelve tools across four tiers, from the free native console to enterprise AI platforms, each with pricing, automation level, the account size it fits and an honest verdict.",
    tags: ["tools", "pricing", "comparison", "helium 10"],
    minutes: 9,
    level: "intermediate",
    meta: {
      Tools: "12",
      Tiers: "4",
      From: "Free",
      To: "$500+ per month",
    },
    body: `Prices are 2026 list prices. Every tool below is real, and the verdicts are written
for a VA choosing what to learn, not for a seller choosing what to buy.

## At a glance

| # | Tool | From | Automation level | Best for |
|---|---|---|---|---|
| 1 | Amazon Campaign Manager | Free | None | Learning the fundamentals |
| 2 | Helium 10 Adtomic | $79/mo | Rules plus AI | Helium 10 users |
| 3 | Helium 10 full suite | $79/mo | Rules plus AI | All-round Amazon work |
| 4 | Perpetua | Custom | Full AI | Large accounts, agencies |
| 5 | Quartile | Custom | Full AI | $100K+/mo ad spend |
| 6 | Teikametrics | Free tier | AI-driven | Amazon plus Walmart |
| 7 | PPC Entourage | $50/mo | Rules-based | Budget-conscious sellers |
| 8 | BidX | $49/mo | Rules-based | Small to mid-size sellers |
| 9 | Ad Badger | $99/mo | Rules plus some AI | Negative keyword automation |
| 10 | Zon.Tools | $9/mo | Rules-based | Beginners, tiny budgets |
| 11 | Amazon Bulk Operations | Free | Manual, at scale | Anyone who knows Excel |
| 12 | Google Sheets plus API | Free (DIY) | Whatever you build | Technical sellers |

## Tier 1: essential, everyone should know these

### 1. Amazon Campaign Manager (native)

- **Price:** free, included with Seller Central
- **Best for:** learning fundamentals, small accounts
- **Features:** basic campaign creation, bid adjustments, search term reports
- **Limitations:** no automation, no AI, clunky interface, manual everything
- **Verdict:** a good starting point that you will outgrow fast — but learn it first.
  Every tool below is a wrapper over this, and you cannot debug a wrapper you do not
  understand.

### 2. Helium 10 Adtomic

- **Price:** $79-$229/mo, included in Helium 10 plans
- **Best for:** sellers already inside the Helium 10 ecosystem
- **Features:** AI-powered bid optimisation, keyword harvesting, negative keyword
  automation, rule-based automation
- **Automation level:** rules-based plus AI learning
- **Key advantage:** integrates with Cerebro and Magnet for keyword research
- **Key limitation:** a 2% ad spend fee on some plans
- **Verdict:** the best all-in-one for mid-size sellers

The 2% fee matters at scale. On $20,000 of monthly ad spend that is $400 a month on
top of the subscription, which changes the comparison against Perpetua entirely.

### 3. Helium 10 (full suite)

- **Price:** $79-$229/mo
- **Key tools:**
  - **Cerebro** — competitor keyword research
  - **Magnet** — keyword discovery
  - **Adtomic** — PPC automation
  - **Keyword Tracker** — rank monitoring
  - **Market Tracker** — market share tracking
- **Verdict:** the Swiss Army knife of Amazon selling. If you learn one paid tool as a
  VA, learn this one — it is the one most job postings name.

## Tier 2: professional, agency and advanced

### 4. Perpetua (formerly Sellics)

- **Price:** custom, based on ad spend
- **Best for:** large accounts, agencies
- **Features:** AI-driven optimisation, cross-channel across Amazon and Walmart,
  advanced analytics
- **Automation level:** full AI
- **Verdict:** enterprise-grade, and the price reflects it

### 5. Quartile

- **Price:** custom, based on ad spend
- **Best for:** enterprise brands
- **Features:** AI-powered, cross-marketplace, advanced attribution
- **Automation level:** full AI
- **Verdict:** best for $100K+ per month in ad spend

### 6. Teikametrics

- **Price:** free tier available, paid plans scale
- **Best for:** multi-marketplace sellers
- **Features:** AI bid optimisation, Walmart integration, analytics
- **Automation level:** AI-driven
- **Verdict:** good for sellers running Amazon and Walmart together

## Tier 3: budget-friendly

### 7. PPC Entourage (Carbon6)

- **Price:** from $50/mo
- **Best for:** budget-conscious sellers
- **Features:** dayparting, automated bid rules, keyword harvesting
- **Automation level:** rules-based
- **Verdict:** an affordable entry point into automation

### 8. BidX

- **Price:** from $49/mo
- **Best for:** small to mid-size sellers
- **Features:** bid automation, keyword management, bulk operations
- **Automation level:** rules-based
- **Verdict:** simple, affordable, gets the job done

### 9. Ad Badger

- **Price:** from $99/mo
- **Best for:** sellers who want strong negative keyword automation
- **Features:** bid optimisation, negative keyword automation, dayparting
- **Automation level:** rules-based plus some AI
- **Verdict:** strongest of the mid-tier on negatives specifically

### 10. Zon.Tools

- **Price:** from $9/mo
- **Best for:** beginners and very small budgets
- **Features:** basic bid automation, campaign management
- **Automation level:** rules-based
- **Verdict:** the cheapest option, with the feature set that implies

## Tier 4: free and low-cost

### 11. Amazon Bulk Operations

- **Price:** free
- **Features:** download a CSV, make changes in Excel, upload it back
- **Best for:** budget management, bulk bid changes
- **Verdict:** free and genuinely powerful if you know Excel. Most VAs skip this and
  then pay $49 a month for a tool that does the same job more slowly.

### 12. Google Sheets plus the Amazon API

- **Price:** free, DIY
- **Features:** custom reporting, data analysis, automation scripts
- **Best for:** technically confident sellers who want a bespoke solution
- **Verdict:** maximum flexibility, requires technical skill

## Which one should a VA learn?

| Situation | Learn |
|---|---|
| First PPC job, no tool budget | Native console plus Bulk Operations |
| Agency role, most common stack | Helium 10 including Adtomic |
| Client wants negatives under control | Ad Badger |
| Client runs Amazon and Walmart | Teikametrics |
| $100K+ monthly spend account | Perpetua or Quartile, but you will be operating it, not choosing it |`,
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "tool-selection-guide",
    kind: "automation",
    title: "Choosing a tool: budget tree and cost-benefit maths",
    summary:
      "A budget-first selection tree from free to $500+ per month, plus the ROI formula that decides whether a tool pays for itself at your hourly rate.",
    tags: ["tools", "pricing", "roi", "decision"],
    minutes: 5,
    level: "intermediate",
    meta: {
      Bands: "5",
      Formula: "Hours x rate - cost",
      "Break-even": "Roughly 3 hrs/wk",
      Pairs: "Tool comparison",
    },
    body: `Tool choice is a budget question first and a feature question second. Work down the
tree, then check the arithmetic.

## Selection tree

    START: what is your monthly tool budget?

    $0 (free only)
      Amazon Console + Bulk Operations + Google Sheets

    $50-100 per month
      Zon.Tools ($9)        basics
      BidX ($49)            good value
      PPC Entourage ($50)   solid features

    $100-200 per month
      Helium 10 ($149)      best all-in-one
      Ad Badger ($99)       strong negation

    $200-500 per month
      Helium 10 Premium ($229)
      Teikametrics (custom)

    $500+ per month
      Perpetua (enterprise)
      Quartile (enterprise)
      Custom API solutions

## Cost versus time saved

| Tool | Monthly cost | Time saved per week | Value at $15/hr | Net value |
|------|-------------|-----------------|-------------|-----------|
| Amazon Console (free) | $0 | 0 hrs | -- | Baseline |
| BidX | $49 | 3 hrs | $45/wk | +$131/mo |
| Ad Badger | $99 | 5 hrs | $75/wk | +$201/mo |
| Helium 10 | $149 | 8 hrs | $120/wk | +$331/mo |
| Perpetua | $500+ | 15 hrs | $225/wk | +$400/mo |

## The ROI formula

    ROI = (Hours saved x Hourly rate x 4 weeks) - Tool cost

Worked for Helium 10 at a $15 per hour VA rate:

    (8 x 15 x 4) - 149 = 480 - 149 = +$331 per month

## Where the break-even sits

At a $15 hourly rate, a tool has to save about one hour per week for every $60 of
monthly cost just to break even:

| Monthly cost | Hours per week to break even |
|---|---|
| $9 | 0.2 |
| $49 | 0.8 |
| $99 | 1.7 |
| $149 | 2.5 |
| $229 | 3.8 |
| $500 | 8.3 |

Every row assumes 4 weeks at $15 per hour, so break-even hours = cost / 60.

## The two adjustments this table does not make

1. **Your rate is not fixed.** At $25 per hour the break-even for Helium 10 drops
   from 2.5 hours to 1.5. Every raise makes tooling more obviously worth it, which is
   the opposite of how most people reason about it.
2. **Time saved is not the only return.** A tool that catches a runaway campaign at
   2 AM saves money you never had to spend, which never shows up in an hours-saved
   column. Weigh that qualitatively; do not try to fake a number for it.

## When the answer is "no tool"

- The account spends under about $1,000 a month. Automation overhead exceeds the
  waste it could remove.
- You have been managing PPC for under three months. Learn the manual work first, or
  you will not be able to tell when the tool is wrong.
- The client will not pay for it and your rate is fixed. A tool you buy out of a
  $450 monthly retainer is a pay cut.`,
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "automation-rules",
    kind: "automation",
    title: "The automation rule library",
    summary:
      "Fifteen production rules across bids, budgets and negative keywords, each with its condition, action and run frequency — the rule set you configure on day one of any tool.",
    tags: ["rules", "bids", "budget", "negatives"],
    minutes: 6,
    level: "intermediate",
    meta: {
      Rules: "15",
      Categories: "3",
      "Max change": "20% per run",
      Review: "Weekly",
    },
    body: `These are the rules to configure first, in every tool, on every account. They encode
the same thresholds as SOP-02 and SOP-03, which is the point: the automation should
do exactly what a competent specialist would do, just faster and at 3 AM.

## Bid automation rules

| Rule | Condition | Action | Frequency |
|------|-----------|--------|-----------|
| ACoS too high | ACoS above target x 1.5 | Reduce bid by 15% | Daily |
| ACoS perfect | ACoS within 20% of target either way | No change | Daily |
| ACoS too low | ACoS below target x 0.5 and orders above 3 | Increase bid by 10% | Daily |
| No conversions | 20+ clicks, 0 orders | Negate keyword | Weekly |
| New keyword | Under 14 days of data | No changes | Wait |
| CPC spike | CPC increased more than 25% in 7 days | Investigate, reduce if needed | Weekly |

## Budget automation rules

| Rule | Condition | Action |
|------|-----------|--------|
| Budget hit early | Campaign hits budget before 5 PM | Increase by 20%, if profitable |
| Budget not spent | Under 50% of budget spent by end of day | Check: paused? Low bids? OOS? |
| Weekly scale | Campaign ACoS below target for 7 days | Increase budget by 15% |
| Monthly review | Monthly ACoS above target | Reduce budget by 10% |

## Negative keyword rules

| Rule | Condition | Action |
|------|-----------|--------|
| Waste detector | 15+ clicks, 0 orders | Add negative exact |
| High cost waste | ACoS above 3x break-even | Add negative exact |
| Irrelevant term | Term has nothing to do with the product | Add negative phrase |
| Brand leak | Non-branded term in a brand campaign | Add negative phrase |
| Competitor term | Competitor brand in a non-conquest campaign | Consider negating |

## Guardrails that go around all fifteen

No rule set is safe without limits. Configure these before you switch anything on:

| Guardrail | Value | Why |
|---|---|---|
| Minimum bid | $0.30 | Below this you win no auctions and learn nothing |
| Maximum bid | $5.00 | Anything above this needs a human decision |
| Maximum daily change | 20% | Larger moves make the next day's data unreadable |
| Learning period | 14 days | New keywords are exempt from every rule |
| Approval queue | Negatives | Let the tool propose, you approve |

## The two rules people get wrong

**"No conversions" at 20 clicks versus the manual rule at 15.** The automated
threshold is deliberately more conservative than the one you use by hand, because
the rule has no context. When you negate at 15 clicks you have also glanced at
relevance, stock and the listing. The rule has not.

**"ACoS too low" requires orders above 3.** Without that clause, a keyword with one
lucky order at a 4% ACoS triggers a bid increase on a sample size of one. The orders
floor is what stops the rule from chasing noise upward.

## Reviewing what the automation did

Once a week, before you do anything else:

1. Open the change log and read every automated change from the last seven days.
2. Find the three largest bid moves and ask whether you would have made them.
3. Check the negatives queue and approve or reject each one.
4. Note any rule that fired more than ten times — it is probably mistuned.`,
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: "adtomic-setup",
    kind: "automation",
    title: "Helium 10 Adtomic: setup guide",
    summary:
      "Five steps to a safe Adtomic configuration: connect, set ACoS targets, configure four starting rules, set the bid and change guardrails, then the daily five-minute monitoring loop.",
    tags: ["helium 10", "adtomic", "setup", "tools"],
    minutes: 5,
    level: "intermediate",
    meta: {
      Steps: "5",
      "Min bid": "$0.30",
      "Max bid": "$5.00",
      "Daily check": "5 min",
    },
    body: `Adtomic is the automation layer most agencies expect a VA to know. The setup is
quick; the guardrails are what make it safe.

## Step 1: connect the account

1. Go to the Adtomic dashboard.
2. Connect the Amazon Advertising Console.
3. Select the campaigns to manage.

Start with two or three campaigns, not the whole account. You want to see how the
rules behave against a small blast radius first.

## Step 2: set ACoS targets

- Set a target ACoS per campaign, not one global figure.
- Default: use break-even ACoS as the starting point.
- Adjust from there: lower for profit, higher for growth.

Break-even ACoS is the profit margin before ad spend. A product with a 35% margin has
a 35% break-even ACoS: at that ACoS the ad pays for itself and nothing more.

## Step 3: configure the rules

Four rules, in this order:

    Rule 1: If ACoS > Target x 1.5 for 3+ days
            -> Reduce bid by 15%

    Rule 2: If ACoS < Target x 0.5 AND Orders > 5 for 7 days
            -> Increase bid by 10%

    Rule 3: If Clicks > 20 AND Orders = 0
            -> Add as negative keyword

    Rule 4: If new keyword < 14 days
            -> No changes (learning phase)

Rule 4 is not optional and it is not last in importance. Without it, rules 1 to 3
fire on keywords that have not had a chance to produce data, and the account
oscillates.

## Step 4: set guardrails

- **Minimum bid:** $0.30 — do not go below this.
- **Maximum bid:** $5.00 — do not go above this without approval.
- **Maximum daily change:** 20% — prevents volatility.

## Step 5: monitor

- Check the Adtomic dashboard daily, five minutes.
- Review the changes the automation made.
- Override where needed, and document why.
- Weekly: review the overall performance trend, not individual changes.

## The first two weeks

| Day | What to do |
|---|---|
| 1-3 | Rules on, notifications on, override nothing unless something is clearly wrong |
| 4-7 | Read every change daily. You are auditing the rules, not the account. |
| 8-14 | Tune the thresholds that fired too often or never fired at all |
| 15+ | Move to the weekly review cadence and add more campaigns |

## When to override

Override, and write down why, when:

- The product went out of stock during the measurement window.
- A price change invalidated the conversion rate the rule was reading.
- The keyword is a brand defence term where efficiency is not the goal.
- A seasonal peak makes the trailing seven days unrepresentative.

An override with no note is indistinguishable from a mistake three weeks later.`,
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: "diy-sheets-automation",
    kind: "automation",
    title: "DIY automation with Google Sheets",
    summary:
      "Two working Google Apps Scripts — an anomaly flagger and a weekly report generator — plus how to schedule them and what to build before you pay for a tool.",
    tags: ["scripts", "google sheets", "free", "reporting"],
    minutes: 5,
    level: "advanced",
    meta: {
      Cost: "Free",
      Scripts: "2",
      Runtime: "Google Apps Script",
      Trigger: "Daily or weekly",
    },
    body: `Before you spend $49 a month on a rules engine, note that a spreadsheet and thirty
lines of script will flag the same anomalies. This is also the fastest way to prove
to an employer that you can automate.

## Anomaly flagger

Reads an ACoS column and a target column, writes a recommendation into column H.

    // Auto-pull Amazon data and flag anomalies
    function checkPPCAnomalies() {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      var data = sheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        var acos = data[i][3];    // Column D = ACoS
        var target = data[i][4];  // Column E = Target ACoS

        if (acos > target * 1.5) {
          // ACoS too high
          sheet.getRange(i + 1, 8).setValue("REDUCE BID");
        } else if (acos < target * 0.5) {
          // ACoS very low, room to scale
          sheet.getRange(i + 1, 8).setValue("INCREASE BID");
        } else {
          sheet.getRange(i + 1, 8).setValue("OK");
        }
      }
    }

The thresholds are the same 1.5x and 0.5x multipliers used by the paid tools, because
they come from the same SOP.

## Weekly report generator

Totals the raw data tab and writes the headline numbers into a report tab.

    // Generate a weekly report from raw data
    function generateWeeklyReport() {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var raw = ss.getSheetByName("Raw Data");
      var report = ss.getSheetByName("Weekly Report");

      // Calculate totals
      var totalSpend = sumColumn(raw, "Spend");
      var totalRevenue = sumColumn(raw, "Revenue");
      var acos = (totalSpend / totalRevenue * 100).toFixed(1);

      // Write to report
      report.getRange("B2").setValue(totalSpend);
      report.getRange("B3").setValue(totalRevenue);
      report.getRange("B4").setValue(acos + "%");
    }

## Scheduling them

In the Apps Script editor, open Triggers and add a time-driven trigger:

| Script | Trigger | When |
|---|---|---|
| checkPPCAnomalies | Day timer | 7-8 AM, before your health check |
| generateWeeklyReport | Week timer, Monday | 6-7 AM, before the search term review |

## What to build in what order

1. **A clean import tab.** Paste the bulk export, nothing else. Never edit it.
2. **A derived tab** with the six formulas: CTR, CVR, ACoS, ROAS, CPC and revenue per
   click.
3. **The anomaly flagger** above, pointed at the derived tab.
4. **A change log tab**, filled in by hand. Automating this defeats its purpose.
5. **The report generator**, last, once the numbers upstream are trustworthy.

## Limits worth knowing before you commit

- Apps Script has an execution time limit per run; very large accounts need the work
  split into batches.
- Nothing here writes back to Amazon. These scripts read, calculate and flag; a human
  or a real tool makes the change.
- If the sheet structure moves, the column indexes in the script break silently.
  Reference columns by header name once the sheet stabilises.`,
  },

  /* ---------------------------------------------------------------- 07 */
  {
    id: "automate-vs-manual",
    kind: "automation",
    title: "When to automate and when to stay manual",
    summary:
      "Five tasks that should always be automated, six that should never be, and the hybrid principle that resolves every case in between: automate the execution, keep the decision.",
    tags: ["strategy", "risk", "process"],
    minutes: 4,
    level: "intermediate",
    meta: {
      Automate: "5 tasks",
      Manual: "6 tasks",
      Principle: "Automate execution",
      Risk: "Low to high",
    },
    body: `## Automate these

| Task | Why automate | Risk level |
|------|-------------|------------|
| Bid adjustments on proven campaigns | Consistent and data-driven | Low |
| Budget pacing | Prevents overspend | Low |
| Negative keyword harvesting on clear rules | Saves time, reduces waste | Low |
| Reporting data collection | Consistent and fast | Low |
| Alert monitoring for anomalies | Catches issues early | Low |

Notice every row is low risk. That is not a coincidence — it is the selection
criterion.

## Keep these manual

| Task | Why manual | Risk if automated wrong |
|------|-----------|------------------------|
| Campaign strategy | Requires business judgement | Wrong direction wastes the whole budget |
| New product launches | Unique per product | Generic rules do not fit |
| Client communication | Relationship-driven | Tone and expectation mismatches |
| Search term analysis on edge cases | Needs context and nuance | False positives and negatives |
| Seasonal adjustments | Requires market knowledge | Rules cannot predict trends |
| Competitor response | Strategic decision | Over-reaction or under-reaction |

## The hybrid approach

**Automate the *execution*, keep the *decision*.**

Worked through one keyword:

1. **Manual:** you decide to reduce bids on keyword X. That is a strategic call based
   on margin, stock, seasonality and what the client wants this quarter.
2. **Automated:** the tool executes the 15% bid reduction, applies it across all
   match types, and logs it. That is a mechanical task.
3. **Manual:** you review the result after seven days and decide the next step.

Steps 1 and 3 are why you are employed. Step 2 is why you can manage ten accounts
instead of three.

## The escalating-risk test

For any task you are unsure about, score it:

| Question | Low risk | High risk |
|---|---|---|
| How fast is the mistake reversible? | Same day | Weeks |
| How visible is the mistake? | Dashboard flags it | Nobody notices for a month |
| How much does one wrong firing cost? | Under a day of budget | A converting keyword permanently blocked |
| Does the rule have all the context a human would? | Yes | No |

Three or more answers in the right-hand column means keep it manual, or put it behind
an approval queue.`,
  },

  /* ---------------------------------------------------------------- 08 */
  {
    id: "automation-maturity-model",
    kind: "automation",
    title: "The automation maturity model",
    summary:
      "Five levels from all-manual to full stack, with the hours per week and account count each one supports, and the six-month training path that moves a VA up the ladder.",
    tags: ["career", "capacity", "training", "strategy"],
    minutes: 5,
    level: "advanced",
    meta: {
      Levels: "5",
      "Level 1": "15-20 hrs/wk",
      "Level 5": "2-3 hrs/wk",
      Path: "6 months",
    },
    body: `Your income per account is capped by the hours each account costs you. This ladder is
the mechanism by which a VA goes from three accounts to fifteen without working more
hours.

## Level 1: manual (starting)

- All work done by hand in the Amazon Console.
- No automation tools.
- **Time:** 15-20 hours per week per account.
- **Best for:** learning, one or two small accounts.

## Level 2: basic rules

- Bulk operations for bid changes.
- Basic negative keyword rules.
- Spreadsheet tracking.
- **Time:** 10-15 hours per week per account.
- **Best for:** two to five accounts.

## Level 3: tool-assisted

- Helium 10 Adtomic or equivalent.
- Automated bid rules active.
- Automated reporting dashboards.
- **Time:** 5-10 hours per week per account.
- **Best for:** five to ten accounts.

## Level 4: smart automation

- AI-driven bid optimisation.
- Automated harvesting and negation.
- Predictive budget allocation.
- **Time:** 3-5 hours per week per account.
- **Best for:** ten or more accounts, agency level.

## Level 5: full stack

- Custom automation via API and scripts.
- Cross-marketplace optimisation.
- Automated client reporting.
- Predictive analytics.
- **Time:** 2-3 hours per week per account.
- **Best for:** enterprise and large agencies.

## What the ladder is worth

| Level | Hours per account | Accounts at 40 hrs/wk | Capacity multiple |
|---|---|---|---|
| 1 | 15-20 | 2 | 1.0x |
| 2 | 10-15 | 3 | 1.5x |
| 3 | 5-10 | 5 | 2.5x |
| 4 | 3-5 | 10 | 5.0x |
| 5 | 2-3 | 15 | 7.5x |

Accounts are calculated at 40 hours per week against the midpoint of each range, then
rounded down for the coordination overhead that comes with more clients.

## Progressive training path

| Months | Focus |
|---|---|
| 1-2 | Manual only. Learn the fundamentals with no tooling. |
| 3 | Introduce bulk operations, Excel-based. |
| 4 | Set up basic automation rules for bids. |
| 5 | Introduce Helium 10 Adtomic, where available. |
| 6 | Full automation management with manual oversight. |

Months 1 and 2 are not a formality. A specialist who reaches level 3 without ever
having done the manual work cannot tell when the tool is wrong, and the tool is wrong
often enough to matter.

## Assessment questions

Three questions that separate someone who understands automation from someone who
has merely switched it on:

1. **"When should you not rely on automation?"** — edge cases, new products, strategy
   decisions.
2. **"How do you verify automation is working correctly?"** — daily dashboard check,
   weekly review of every override.
3. **"What is the risk of set-and-forget automation?"** — market changes, competitor
   actions, listing changes. The rules keep executing a strategy that stopped being
   correct.`,
  },
];

export function resourceRefs(): ResourceRef[] {
  return docRefs(automationGuides, "/automation", UPDATED);
}

export function findAutomationGuide(id: string): DocResource | undefined {
  return automationGuides.find((guide) => guide.id === id);
}
