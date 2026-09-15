import { docRefs } from "@/components/doc/data";
import type { DocResource, ResourceRef } from "@/types/content";

/**
 * One-page references.
 *
 * New content, written to the brief in `../ppc-tools-for-va/EXPANSION-PLAN.md`
 * section 4. Every formula is stated in full and every worked example is
 * arithmetically checked, so a number quoted from here on a client call
 * survives being checked in the console afterwards.
 *
 * Benchmark tables are labelled as planning bands, not as measured
 * category data: an account's own trailing 90 days always outranks them.
 */

const UPDATED = "2026-09-15";

export const cheatSheets: DocResource[] = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: "ppc-metrics",
    kind: "cheat-sheet",
    title: "PPC metrics",
    summary:
      "Every Amazon Ads metric with its formula, what it actually answers, the planning band to judge it against, and the conversion table between ACoS and ROAS.",
    tags: ["metrics", "formulas", "acos", "benchmarks"],
    minutes: 7,
    level: "beginner",
    meta: {
      Metrics: "16",
      Formulas: "All stated",
      Print: "One page",
      Use: "Client calls",
    },
    body: `The whole metric set on one page. If you can derive any of these from the other
three inputs — impressions, clicks, orders, spend, sales — you can rebuild a report
from a raw export with nothing but a spreadsheet.

## The five raw inputs

Everything below is derived from these. Nothing else is needed.

| Input | What it counts |
|---|---|
| Impressions | Times your ad was served |
| Clicks | Times someone clicked it |
| Orders | Attributed orders within the attribution window |
| Spend | What the clicks cost |
| Sales | Attributed ad revenue |

## Efficiency metrics

| Metric | Formula | Answers |
|---|---|---|
| **ACoS** | Spend / Ad sales x 100 | What share of ad revenue went back into ads |
| **ROAS** | Ad sales / Spend | Dollars of ad revenue per dollar spent |
| **TACoS** | Spend / **Total** sales x 100 | What share of the whole business the ads cost |
| **Break-even ACoS** | Profit margin before ad spend, as a % | The ACoS at which an ad pays for itself exactly |
| **Target ACoS** | Break-even ACoS x desired profit retention | The number you actually optimise toward |

## Funnel metrics

| Metric | Formula | Answers |
|---|---|---|
| **CTR** | Clicks / Impressions x 100 | Does the ad earn the click? Image, title, price, rating |
| **CVR** | Orders / Clicks x 100 | Does the listing close the sale? |
| **CPC** | Spend / Clicks | What the auction costs today |
| **CPA** | Spend / Orders | What one order costs |
| **RPC** | Ad sales / Clicks | What one click is worth |
| **Profit per click** | (RPC x Margin) - CPC | Whether the click makes money |
| **AOV** | Ad sales / Orders | Average order value from ads |

## Volume and coverage metrics

| Metric | Formula | Answers |
|---|---|---|
| **Impression share** | Your impressions / Total available | How much of the demand you even see |
| **Top-of-search IS** | ToS impressions / Total ToS available | Coverage where conversion is highest |
| **Spend share** | Campaign spend / Account spend x 100 | Where the money is actually going |
| **New-to-brand orders** | Reported by Amazon | How much is genuinely incremental |

## ACoS to ROAS conversion

They are the same fact stated two ways. Quote whichever one the client thinks in.

    ROAS = 100 / ACoS%          ACoS% = 100 / ROAS

| ACoS | ROAS | Reading at a 40% break-even |
|---|---|---|
| 10% | 10.00x | Very profitable, almost certainly underspending |
| 15% | 6.67x | Highly profitable, scale |
| 20% | 5.00x | Profitable, scale |
| 25% | 4.00x | Profitable |
| 30% | 3.33x | Profitable |
| 33% | 3.03x | Comfortable |
| 40% | 2.50x | Break-even |
| 50% | 2.00x | Losing money on the ad, may still be worth it for rank |
| 60% | 1.67x | Losing money |
| 75% | 1.33x | Losing money badly |
| 100% | 1.00x | Every ad dollar returns exactly one dollar of revenue |

## Working out break-even ACoS

Break-even ACoS is simply your profit margin before advertising, expressed as a
percentage of the selling price.

Worked example, a $30.00 product:

| Line | Amount |
|---|---|
| Selling price | $30.00 |
| COGS | -$8.00 |
| Amazon referral fee at 15% | -$4.50 |
| FBA fulfilment fee | -$5.00 |
| **Profit before ad spend** | **$12.50** |
| **Break-even ACoS** | **41.7%** |

    Break-even ACoS = 12.50 / 30.00 = 0.4167 = 41.7%

At 41.7% ACoS the ad exactly pays for itself. At 30% ACoS the ad costs $9.00 per unit
and you keep $3.50. At 50% ACoS it costs $15.00 and you lose $2.50 a unit — which can
still be the right call for a launch, as long as you can say out loud why.

## Working out maximum CPC

    RPC     = Price x CVR
    Max CPC = RPC x Target ACoS

Same $30.00 product, converting at 10%, target ACoS 25%:

    RPC     = 30.00 x 0.10 = $3.00
    Max CPC = 3.00 x 0.25  = $0.75

And the break-even CPC, using the 41.7% break-even ACoS instead:

    Break-even CPC = 3.00 x 0.417 = $1.25

So $0.75 is your target bid and $1.25 is the point at which the keyword stops making
money. Anything between the two is a deliberate decision to buy rank or volume.

## Planning bands

Directional only. Sponsored Products, mature accounts. Your own trailing 90 days
always outranks this table — use it to sanity-check a new account, never to grade an
established one.

| Metric | Weak | Working | Strong |
|---|---|---|---|
| CTR | Below 0.25% | 0.30-0.45% | Above 0.50% |
| CVR | Below 6% | 8-12% | Above 15% |
| ACoS versus break-even | Above 1.2x | 0.7-1.0x | Below 0.6x |
| TACoS | Above 20% | 8-15% | Below 8% with growing sales |
| CPC versus break-even CPC | Above 0.9x | 0.5-0.7x | Below 0.5x |

## How to read a metric pair

Single metrics mislead. These four pairs are where the diagnosis lives.

| Pair | Pattern | Diagnosis |
|---|---|---|
| CTR low, CVR high | Few clicks, but they buy | Ad creative or rank problem, not a listing problem |
| CTR high, CVR low | Lots of clicks, few orders | Listing, price or relevance problem |
| ACoS flat, TACoS falling | Ads holding, organic growing | Ads are buying rank. This is the goal. |
| ACoS falling, TACoS rising | Ads efficient, total shrinking | Organic is collapsing under the ads |`,
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: "match-types",
    kind: "cheat-sheet",
    title: "Match types",
    summary:
      "Broad, phrase and exact side by side with a worked example of what each one catches, the bid ladder between them, and how the two negative match types differ.",
    tags: ["keywords", "match types", "negatives", "bids"],
    minutes: 6,
    level: "beginner",
    meta: {
      "Match types": "3 + 2 negative",
      Ladder: "100/80/65",
      Print: "One page",
      Use: "Every build",
    },
    body: `Three positive match types, two negative ones, one rule: the tighter the match, the
higher the bid and the higher the expected conversion rate.

## The three positive match types

| | Exact | Phrase | Broad |
|---|---|---|---|
| Word order | Must match | Must be preserved | Any order |
| Extra words | None | Allowed before and after | Allowed anywhere |
| Synonyms and related terms | No | No | Yes |
| Plurals and minor misspellings | Yes | Yes | Yes |
| Typical CVR | Highest | Middle | Lowest |
| Typical CPC | Highest | Middle | Lowest |
| Job in the account | Convert | Expand | Discover |

## Worked example: the keyword "organic green tea"

| Shopper search | Exact | Phrase | Broad |
|---|---|---|---|
| organic green tea | Match | Match | Match |
| organic green teas | Match | Match | Match |
| best organic green tea | No | Match | Match |
| organic green tea bags 100 count | No | Match | Match |
| green tea organic | No | No | Match |
| organic matcha tea powder | No | No | Match |
| green tea | No | No | Match |
| jasmine tea leaves | No | No | Possible |

The last row is the whole argument for negative keywords. Broad match is a discovery
tool, and discovery means paying to find out that some of what it finds is wrong.

## Bid ladder

Set the exact bid from the maximum-CPC calculation, then derive the other two.

| Match type | Share of exact bid | Example on a $1.00 exact bid |
|---|---|---|
| Exact | 100% | $1.00 |
| Phrase | 75-85% | $0.80 |
| Broad | 60-70% | $0.65 |

The logic is not that broad traffic is worth less per click in principle. It is that
broad traffic converts less often on average, so the same target ACoS supports a
lower bid. When a specific broad term proves it converts, you harvest it into exact
and it earns the full bid.

## The two negative match types

Sponsored Products offers negative exact and negative phrase. There is no negative
broad.

| | Negative exact | Negative phrase |
|---|---|---|
| Blocks | Only that exact term, plus plurals | Any search containing that phrase in order |
| Blast radius | Narrow | Wide |
| Use for | One term that wasted clicks | A whole family of irrelevant terms |
| Risk | Almost none | Blocking terms that would have converted |

### Worked example

You sell magnesium **glycinate**. The term "magnesium citrate powder" took 31 clicks
and zero orders.

| Choice | Effect |
|---|---|
| Negative exact "magnesium citrate powder" | Blocks that one term. "magnesium citrate capsules" can still be tested. |
| Negative phrase "magnesium citrate" | Blocks every citrate term at once — correct here, because you do not sell citrate at all |
| Negative phrase "magnesium" | Blocks your entire category. Never do this. |

## Where negatives live

| Level | Applies to | Use when |
|---|---|---|
| Ad group negative | One ad group only | Sculpting traffic between ad groups in the same campaign |
| Campaign negative | Every ad group in the campaign | The standard place for harvest-driven negatives |
| Negative product targeting | Blocks specific ASINs or brands | A competitor ASIN that never converts |

## Match type by campaign role

| Campaign | Match types | Why |
|---|---|---|
| Auto | Amazon's four targeting groups | Discovery with no keyword list to maintain |
| Manual exact | Exact only | Your proven terms, bid deliberately |
| Manual phrase | Phrase, sometimes broad | Expansion around the proven terms |
| Product targeting | ASIN and category targets | Conquesting, not keywords at all |

## The overlap trap

If the same term is live in your auto campaign and your exact campaign, you are
bidding against yourself and paying whichever price is higher. Every harvest has two
steps, and people only ever remember the first:

1. Add the term as exact in the manual campaign.
2. **Add it as a negative exact in the campaign that found it.**`,
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: "campaign-structure",
    kind: "cheat-sheet",
    title: "Campaign structure",
    summary:
      "The account hierarchy from portfolio down to keyword, the naming convention, the four-way budget split, Amazon's auto targeting groups, and the bidding strategy and placement controls.",
    tags: ["structure", "naming", "budget", "bidding"],
    minutes: 7,
    level: "beginner",
    meta: {
      Hierarchy: "5 levels",
      Split: "40/25/20/15",
      Floor: "$10 per day",
      Print: "One page",
    },
    body: `## The hierarchy

    Advertising account
      Portfolio            grouping and shared budget caps
        Campaign           budget, bidding strategy, placements
          Ad group         one theme, one bid baseline
            Target         keyword or product target
            Ad             the ASIN being advertised

Two rules that prevent most structural problems:

1. **One product theme per ad group.** Mixing ASINs in an ad group means one bid
   serves products with different prices and conversion rates.
2. **One job per campaign.** Discovery, conversion or conquesting — never two.

## Naming convention

    [Product]_[Targeting]_[MatchType]_[Qualifier]

    Widget_Exact_Top5      Exact match, top 5 keywords
    Widget_Phrase_Exp      Phrase match, expansion
    Widget_Auto_Auto       Auto campaign
    Widget_Prod_Comp1      Product targeting, competitor 1
    Brand_Widget_SB        Sponsored Brands, brand defence

Underscores, not spaces. Consistent field order. The convention exists so that a
filter on "Widget_Exact" returns exactly what you expect at 11 PM on a Friday.

## Budget allocation

| Campaign type | Share | Job |
|---|---|---|
| Manual exact | 40% | Convert the proven terms efficiently |
| Manual phrase | 25% | Expand around what already works |
| Auto | 20% | Keep discovering, forever |
| Product targeting | 15% | Take share from specific competitor ASINs |

**Floor:** $10 per day per active campaign. Below that a campaign accumulates too
little conversion data to be optimisable, and both you and Amazon's bidding are
guessing.

Worked at a $50 per day product budget:

| Campaign | Share | Daily | Above the $10 floor? |
|---|---|---|---|
| Manual exact | 40% | $20.00 | Yes |
| Manual phrase | 25% | $12.50 | Yes |
| Auto | 20% | $10.00 | Exactly at it |
| Product targeting | 15% | $7.50 | **No** |

At $50 per day you fund three campaigns properly, not four. Add product targeting
when the budget reaches roughly $67 per day, at which point 15% clears $10.

## Auto campaign targeting groups

An auto campaign has four targeting groups, each with its own bid. Most people leave
all four on one bid, which is the easiest 20 minutes of improvement in a new account.

| Group | Matches | Typical use |
|---|---|---|
| Close match | Searches very similar to your product | Highest bid, closest to exact intent |
| Loose match | Searches loosely related | Mid bid, genuine discovery |
| Substitutes | Detail pages of similar products | Conquesting, mid bid |
| Complements | Detail pages of products bought alongside yours | Lowest bid, most speculative |

## Bidding strategies

| Strategy | What Amazon does | Use when |
|---|---|---|
| Dynamic bids, down only | Lowers the bid when a conversion looks unlikely | Launches, tight ACoS targets, anything unproven |
| Dynamic bids, up and down | Raises up to +100% at top of search, lowers when unlikely | Proven converting campaigns you want to scale |
| Fixed bids | Uses your exact bid every time | Testing, and measuring true auction price |

Start every new campaign on **down only**. Move to up-and-down once the campaign has
14 days of data and is sitting inside its ACoS target.

## Placement adjustments

Three placements, each with its own multiplier, applied on top of the bid.

| Placement | Where the ad appears | Typical adjustment |
|---|---|---|
| Top of search, first page | The first row of results | +25 to +50% on exact |
| Product pages | Competitor and related detail pages | +0 to +25%, higher for product targeting |
| Rest of search | Lower down the results page | Usually left at 0% |

Top of search converts best and costs most. Check the placement report before
adjusting: if top-of-search CVR is more than twice the campaign average, the uplift
is earning its money.

## How many campaigns per product

Five to seven. If a product needs more than seven, the problem is almost always
keyword segmentation rather than campaign count.

| Campaign count per product | Reading |
|---|---|
| 1-2 | Under-built, no discovery or no control |
| 3-4 | Sound minimum: auto, exact, phrase |
| 5-7 | Full structure with product targeting and brand layers |
| 8+ | Over-segmented, budgets too thin |`,
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: "search-term-report",
    kind: "cheat-sheet",
    title: "Search term report",
    summary:
      "How to read the report, the four-quadrant framework that sorts every term into an action, the numeric thresholds for each quadrant, and the thirty-minute weekly checklist.",
    tags: ["search terms", "weekly", "keywords", "framework"],
    minutes: 6,
    level: "beginner",
    meta: {
      Quadrants: "4",
      Floor: "5 clicks",
      Cadence: "Weekly",
      Time: "30 min",
    },
    body: `The search term report is the only place Amazon tells you what shoppers actually
typed. Everything else in the console is what you asked for.

## Reading the report

| Column | What it is | Watch for |
|---|---|---|
| Customer search term | What the shopper typed | The whole point of the report |
| Targeting | The keyword or target that matched it | Reveals which campaign is spending |
| Match type | How it matched | Broad terms with odd matches |
| Impressions | Times served | High impressions, low clicks means poor relevance |
| Clicks | Times clicked | The denominator for every decision below |
| Spend | Cost of those clicks | Sort by this, always |
| 7-day orders | Attributed orders | The numerator |
| 7-day sales | Attributed revenue | For ACoS |
| ACoS | Spend / sales | Blank means zero sales, not zero problem |

**Sort by spend, descending. Filter to five or more clicks.** Below five clicks there
is no signal, only variance.

## The four-quadrant framework

Split on two axes: did it convert, and is it efficient?

|  | **Efficient (ACoS at or below target)** | **Inefficient (ACoS above target)** |
|---|---|---|
| **Converts (1+ orders)** | **Winners** — harvest to exact, raise the bid | **Bleeders** — keep the term, cut the bid |
| **No orders** | — (impossible, no sales means no ACoS) | **Wasters** — negate at 15+ clicks; **Testers** below that |

### Quadrant actions

| Quadrant | Test | Action |
|---|---|---|
| **Winners** | 2+ orders and ACoS below target | Harvest to manual exact, negate in the source campaign |
| **Bleeders** | 1+ orders and ACoS above target | Reduce bid 15%. Do not negate a term that converts. |
| **Wasters** | 15+ clicks and 0 orders | Negate exact. Negate phrase if the whole family is irrelevant. |
| **Testers** | 5-14 clicks and 0 orders | Leave it. Re-check next week. |

### Worked sort

A 7-day report on a $34.99 supplement, target ACoS 30%:

| Search term | Clicks | Orders | Spend | Sales | ACoS | Quadrant | Action |
|---|---|---|---|---|---|---|---|
| magnesium glycinate 400mg | 62 | 9 | $74.40 | $314.91 | 23.6% | Winner | Harvest to exact |
| magnesium for sleep | 44 | 5 | $57.20 | $174.95 | 32.7% | Bleeder | Cut bid 15% |
| magnesium citrate powder | 31 | 0 | $40.30 | $0.00 | -- | Waster | Negate exact |
| chelated magnesium capsules | 9 | 0 | $11.70 | $0.00 | -- | Tester | Leave, recheck |

Weekly waste removed: $40.30, or roughly $175 a month, from one negative.

## Adjusting the click threshold to your conversion rate

Fifteen clicks is a default, not a law. Work it back from the product's own CVR:

    Clicks for a workable read = 1.5 / CVR
    Clicks for a strong read   = 3 / CVR

| Product CVR | Workable | Strong |
|---|---|---|
| 15% | 10 clicks | 20 clicks |
| 10% | 15 clicks | 30 clicks |
| 5% | 30 clicks | 60 clicks |
| 3% | 50 clicks | 100 clicks |

On a high-ticket, low-CVR product, negating at 15 clicks throws away terms that were
always going to need 50 clicks to show their first order.

## Weekly checklist

- [ ] Download the last 7 days, all campaigns
- [ ] Sort by spend descending, filter to 5+ clicks
- [ ] Mark every row with a quadrant
- [ ] Build the harvest list — term, source campaign, proposed exact bid
- [ ] Build the negate list — term, match type, target campaign
- [ ] Add harvested terms to manual exact
- [ ] **Negate each harvested term in the campaign that found it**
- [ ] Add negatives to the shared list
- [ ] Cut bids 15% on every bleeder
- [ ] Log every change with the date and the reason
- [ ] Note the total weekly waste removed for the client report

## The three most common mistakes

1. **Negating a converting term** because the ACoS looked bad. It converts. Cut the
   bid instead.
2. **Harvesting on one order.** One order is noise. The rule is two.
3. **Forgetting step seven.** Harvesting without negating in the source campaign
   creates two campaigns bidding on the same term.`,
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: "negative-keywords",
    kind: "cheat-sheet",
    title: "Negative keywords",
    summary:
      "When to negate and at which match type, how negatives cascade across the three levels, a starter negative list by category, and the four ways teams get negatives badly wrong.",
    tags: ["negatives", "keywords", "waste", "search terms"],
    minutes: 6,
    level: "beginner",
    meta: {
      Types: "2 keyword + 1 product",
      Levels: "3",
      Trigger: "15+ clicks, 0 orders",
      Review: "Weekly",
    },
    body: `Negative keywords are the cheapest optimisation in Amazon advertising. They cost
nothing to add and they remove waste permanently.

## The two negative match types

| | Negative exact | Negative phrase |
|---|---|---|
| Blocks | That exact term and its plurals | Any search containing the phrase in order |
| Blast radius | One term | A whole family |
| Reversible | Yes, instantly | Yes, but you may never learn what you blocked |
| Default choice | **Yes** | Only when the family is clearly irrelevant |

There is no negative broad match for keywords in Sponsored Products. There is
negative product targeting, which blocks specific ASINs or brands.

## When to negate

| Condition | Match type | Confidence |
|---|---|---|
| 15+ clicks, 0 orders | Negative exact | High |
| ACoS above 3x break-even, few orders | Negative exact | High |
| Term is a different product entirely | Negative phrase | High |
| Term implies a price point you do not serve — "cheap", "wholesale" | Negative phrase | High |
| Term is a competitor brand, in a non-conquest campaign | Negative phrase | Medium |
| Term already runs as exact in another campaign | Negative exact, in the source | Certain |
| 5-14 clicks, 0 orders | **Do not negate yet** | Insufficient data |
| Converts but ACoS is high | **Do not negate** — cut the bid | Negating removes revenue |

## The three levels, and how they cascade

| Level | Scope | Typical contents |
|---|---|---|
| Ad group negatives | That ad group only | Sculpting between ad groups in one campaign |
| Campaign negatives | Every ad group in the campaign | Harvest-driven negatives, campaign-specific waste |
| Shared negative list | Every campaign it is attached to | The account-wide starter list below |

Attach the shared list to every campaign at build time. A negative added after
$300 of waste is a fix; a negative added at launch is a saving.

## Starter negative list

Attach these on day one of almost any account.

**Price and intent**

    free, cheap, cheapest, discount, coupon, clearance,
    wholesale, bulk lot, used, refurbished, second hand,
    knock off, dupe, replica

**Information seekers, not buyers**

    how to, what is, diy, homemade, recipe, tutorial,
    review, reviews, vs, versus, near me

**Wrong side of the transaction**

    parts, repair, replacement part, manual, instructions,
    warranty claim, return

### Category-specific starters

| Category | Add as negative phrase | Because |
|---|---|---|
| Supplements | for dogs, for cats, powder (if you sell capsules), gummies (if you sell tablets) | Format and species mismatches |
| Kitchen | commercial, industrial, restaurant grade | Different buyer, different price point |
| Electronics | charger only, case only, screen protector | Accessory searches for a main product |
| Apparel | mens (if you sell womens), plus size (if unstocked), costume | Wrong segment |
| Toys | educational (if purely a toy), adult, wooden (if plastic) | Material and intent mismatches |

Test before you commit any of these. A category negative that removes 3% of your
revenue is worse than the waste it prevented.

## What negatives are worth

A 15-click term at a $1.30 CPC that never converts costs $19.50 per cycle. Multiply
by how often it recurs:

| Term recurs | Cost per year if left alone |
|---|---|
| Once a week | $1,014 |
| Twice a month | $468 |
| Once a month | $234 |

That is one term. A weekly harvest routine typically finds two to five of them, which
is why the routine pays for itself in the first month of any neglected account.

## The four ways this goes wrong

1. **Negating too broadly.** A negative phrase on "magnesium" in a magnesium account
   turns the campaign off. Read the phrase back to yourself before saving it.
2. **Negating a converting term.** Check the orders column before the ACoS column.
   Bleeders get bid cuts, not negatives.
3. **Negating during a stock-out.** A term with 20 clicks and 0 orders while the
   product was unavailable proves nothing.
4. **Never auditing the list.** Review the shared negative list quarterly. Products
   change, ranges expand, and a negative added two years ago may now be blocking a
   product you sell.

## Auditing the list

Once a quarter, for each entry: is this still irrelevant to everything we sell? If
you cannot say yes immediately, remove it and let the search term report re-earn it.`,
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: "ad-types",
    kind: "cheat-sheet",
    title: "Amazon ad types",
    summary:
      "Sponsored Products, Sponsored Brands, Sponsored Brands Video and Sponsored Display compared on eligibility, placement, cost model, targeting and the metric each one is actually judged on.",
    tags: ["ad types", "sponsored brands", "sponsored display", "strategy"],
    minutes: 6,
    level: "intermediate",
    meta: {
      "Ad types": "4",
      Gate: "Brand Registry",
      "Cost models": "CPC and vCPM",
      Print: "One page",
    },
    body: `Four ad types, one eligibility gate, and four different definitions of success.

## At a glance

| | Sponsored Products | Sponsored Brands | SB Video | Sponsored Display |
|---|---|---|---|---|
| Brand Registry needed | No | Yes | Yes | Yes |
| Promotes | One ASIN | Brand plus 3+ ASINs, or a Store | One ASIN or a Store | One ASIN |
| Main placement | Search results, product pages | Top of search banner | In search results | Product pages, off Amazon |
| Cost model | CPC | CPC | CPC | CPC or vCPM |
| Targeting | Keywords, products, auto | Keywords, products | Keywords, products | Products, categories, audiences |
| Judged on | ACoS | New-to-brand, ACoS | ACoS, with CTR as a diagnostic | View-through and total sales |
| Share of a typical budget | 70-80% | 10-20% | Part of SB | 5-15% |

## Sponsored Products

The baseline. Always on, always the majority of spend.

- **Use for:** direct sales and keyword ranking. Every product, always.
- **Strengths:** the largest inventory of placements, the clearest attribution, the
  only type that works without Brand Registry.
- **Structure:** auto for discovery, manual exact for conversion, manual phrase for
  expansion, product targeting for conquesting.
- **Judged on:** ACoS against target, and the harvest it feeds back into itself.

## Sponsored Brands

The banner above the search results, carrying a logo, a headline and multiple
products or a Store link.

- **Use for:** brand awareness, defending your own brand terms, and pushing traffic
  into a Store page rather than one detail page.
- **Requires:** Brand Registry.
- **Strengths:** the most prominent real estate on the page, and multi-product
  exposure from a single click's cost.
- **Watch:** ACoS is a weaker signal here because the click may land on a Store and
  convert on a different ASIN. Read new-to-brand orders alongside it.

### Brand defence maths

Losing your own brand term is more expensive than winning it. A shopper searching
your brand name has already decided; if a competitor's ad sits above your organic
listing, you are paying for that in lost orders rather than in ad spend. Brand terms
usually run at very low ACoS precisely because intent is so high, which is why they
are worth protecting even when the incrementality argument is uncomfortable.

## Sponsored Brands Video

- **Use for:** products that need demonstrating — anything where a photo cannot show
  how it works, how big it is, or how it moves.
- **Strengths:** autoplays in the results feed, so it interrupts scrolling in a way a
  static ad cannot.
- **Judged on:** ACoS, with CTR and view rate as creative diagnostics. A video ad with
  a good view rate and a poor CTR is a creative problem, not a bidding problem.
- **Practical note:** keep it under 30 seconds, show the product in the first three
  seconds, and assume it plays without sound.

## Sponsored Display

- **Use for:** retargeting shoppers who viewed but did not buy, and conquesting
  audiences on competitor detail pages.
- **Requires:** Brand Registry for most targeting options.
- **Two cost models:**
  - **CPC** — pay per click, use for product and category targeting.
  - **vCPM** — pay per thousand viewable impressions, use for reach and awareness
    campaigns where clicks are not the goal.
- **Judged on:** view-through attribution and total sales lift, not click ACoS. A
  Display campaign with a 90% ACoS on clicks may still be profitable once
  view-through orders are counted.

## When to use which

| Situation | Ad type |
|---|---|
| Any product, any account | Sponsored Products |
| Brand Registry just approved | Add SB for brand defence first |
| Product needs demonstrating | SB Video |
| Detail page traffic converts poorly | SD retargeting |
| Competitor is taking your detail page traffic | SD product targeting on their ASINs |
| Building a new brand from zero | SP first for 90 days, then SB |
| Q4 with a defined budget | SP for volume, SB for defence, SD for retargeting |

## Budget allocation across types

| Account stage | SP | SB | SD |
|---|---|---|---|
| Launch, no registry | 100% | -- | -- |
| Launch, with registry | 85% | 15% | -- |
| Established | 75% | 15% | 10% |
| Peak season | 70% | 20% | 10% |

Sponsored Products stays the majority at every stage. SB and SD are leverage on top
of a working SP account, never a substitute for one.`,
  },

  /* ---------------------------------------------------------------- 07 */
  {
    id: "reporting",
    kind: "cheat-sheet",
    title: "Reporting",
    summary:
      "What goes in the daily, weekly, monthly and quarterly report, the plain-English translation for every metric, and the eight red flags that should never wait for the next scheduled report.",
    tags: ["reporting", "clients", "metrics", "communication"],
    minutes: 6,
    level: "intermediate",
    meta: {
      Cadences: "4",
      "Red flags": "8",
      Monthly: "2 hours",
      Print: "One page",
    },
    body: `## The four cadences

| Report | Frequency | Time | Audience | Content |
|---|---|---|---|---|
| Health check | Daily | 5 min | You | Anomalies, budget pacing, stock |
| Search term review | Weekly | 30 min | You, summarised for the client | Harvest, negate, bid adjustments |
| Performance report | Monthly | 2 hrs | Client | Full metrics, trends, recommendations |
| Strategic review | Quarterly | Half day | Client leadership | Budget reallocation, goals, category shifts |

## What goes in each one

### Daily, for you only

Four checks, in order: budget caps, anomaly signals, stock, pacing. Log the answer
even when the answer is "nothing". A log of quiet days is what makes the noisy day
obvious.

### Weekly, three lines to the client

    Spend $X of $Y budget. ACoS Z% against a target of T%.
    Done: harvested N terms, negated M terms, adjusted P bids.
    Next: [one specific thing].

Every line has a number. No number, no line.

### Monthly, the full report

| Block | Contents |
|---|---|
| Executive summary | Three bullets: overall, key win, next month's focus |
| Metrics dashboard | Spend, revenue, ACoS, ROAS, TACoS, clicks, impressions, CTR, CVR, CPC — this month, last month, target |
| What worked | Top 3 campaigns, top 5 keywords, the optimisations and their impact |
| What did not | Underperformers with the reason, negatives added with the saving |
| Recommendations | Three actions, each with an expected impact |
| Competitive landscape | New entrants, CPC direction, share estimate |

### Quarterly

Budget reallocation across products, target revisions, category benchmark
comparison, and the one strategic bet for the next quarter.

## Translating metrics into plain English

Clients do not think in ACoS. This table is the single most useful thing on this page.

| Metric | Do not say | Say |
|---|---|---|
| ACoS 28% | "ACoS is 28%" | "For every $100 of sales the ads generated, we spent $28 on advertising" |
| ROAS 3.6x | "ROAS is 3.6x" | "Every dollar of ad spend returned $3.60 in sales" |
| TACoS 9% | "TACoS is 9%" | "Advertising costs 9% of your total revenue, including the sales we did not pay for" |
| CTR 0.42% | "CTR is 0.42%" | "About 4 in every 1,000 people who saw the ad clicked it" |
| CVR 11% | "CVR is 11%" | "About 1 in 9 people who clicked went on to buy" |
| CPC $1.15 | "CPC is $1.15" | "Each click costs about $1.15 in this category right now" |
| Break-even ACoS 40% | "Break-even is 40%" | "Above 40% ACoS the advertising costs more than the profit on the units it sells" |

## Percentages versus percentage points

ACoS falling from 40% to 30% is a fall of **10 percentage points**, or a **25%
reduction**. Both are true, both sound different, and mixing them across months
destroys trust in your reporting. Pick one convention and use it all year.

Spend rising from $4,000 to $5,000 is **+25%**. No percentage points involved,
because spend is not itself a percentage.

## Eight red flags that do not wait for the report

| Flag | Threshold | Escalation level |
|---|---|---|
| ACoS spike | More than 20% above the 7-day average | L2, within 24 hours |
| CTR collapse | More than 30% drop | L2, check the listing first |
| Impression collapse | More than 50% drop | L2, suspect suppression |
| CPC spike | More than 25% in 7 days | L2, check the auction |
| Zero spend | 24 hours on an active campaign | L2 |
| Out of stock on an advertised ASIN | Any | L3, within 2 hours |
| Account or listing warning | Any | L4, immediately |
| Budget depleted before noon repeatedly | 3 days running | L3 |

## What to leave out of a client report

- Screenshots of the console. They have the same login.
- Every campaign listed individually. Show the top three and the bottom three.
- Metrics with no agreed target. If nobody set one, do not grade against one.
- Speculation dressed as analysis. "Amazon may have changed something" is not a
  finding.
- Vocabulary you have not translated. Every acronym earns one clause of explanation,
  every time, forever.`,
  },

  /* ---------------------------------------------------------------- 08 */
  {
    id: "tools",
    kind: "cheat-sheet",
    title: "Tools",
    summary:
      "The Helium 10 tool map, the Amazon console reports worth knowing by name, the bulk operations workflow that replaces most paid automation, and what free actually covers.",
    tags: ["tools", "helium 10", "bulk operations", "reports"],
    minutes: 6,
    level: "beginner",
    meta: {
      "Helium 10 tools": "8 mapped",
      Reports: "5",
      "Free stack": "3 tools",
      Print: "One page",
    },
    body: `## Helium 10, the tools a PPC role actually uses

| Tool | Does | Use it when |
|---|---|---|
| **Cerebro** | Reverse-ASIN: every keyword a given ASIN ranks for | Researching competitors before a launch |
| **Magnet** | Seed keyword expansion, volume and related terms | Building the keyword list from a head term |
| **Adtomic** | PPC automation: bid rules, harvesting, negatives | Managing more than three accounts |
| **Keyword Tracker** | Daily organic and sponsored rank tracking | Proving that ads moved organic rank |
| **Market Tracker** | Category share and competitor movement | Quarterly reviews and competitive sections |
| **Frankenstein** | Deduplicates and processes large keyword lists | After exporting from Cerebro and Magnet |
| **Xray** | Product research overlay on Amazon search pages | Vetting a product before agreeing to advertise it |
| **Index Checker** | Whether a listing is indexed for a keyword | A keyword gets impressions but no rank |

### The research sequence

    Cerebro (3-5 competitor ASINs)
      -> export
    Magnet (your head keyword)
      -> export
    Frankenstein
      -> deduplicate, remove single characters, sort by volume
    Score relevance 1-10 by hand
      -> assign each term to exact, phrase or auto

Frankenstein is the step most people skip, and it is the reason their keyword list
has "green tea" in it four times with different capitalisation.

## Amazon console reports worth knowing by name

| Report | Tells you | Cadence |
|---|---|---|
| **Search Term Report** | What shoppers actually typed | Weekly |
| **Targeting Report** | Performance per keyword or product target | Weekly |
| **Placement Report** | Top of search versus product pages versus rest | Monthly |
| **Advertised Product Report** | Performance per ASIN, including other-ASIN sales | Monthly |
| **Purchased Product Report** | Which ASINs were actually bought after a click | Monthly |

The last one surprises people: a click on ASIN A frequently results in an order for
ASIN B in the same brand. Campaigns that look unprofitable at the ASIN level are
sometimes carrying the range.

## Bulk operations: free automation

The download-edit-upload loop is free, fast, and replaces most of what a $49 per
month rules tool does.

    1. Campaign Manager -> Bulk operations
    2. Choose the date range and the data to include
    3. Download the spreadsheet
    4. Filter to the rows you want to change
    5. Edit ONLY the Bid, Budget, or State columns
    6. Set the Operation column to "Update"
    7. Upload, then check the results file for errors

### Rules that stop bulk uploads failing

| Rule | Why |
|---|---|
| Never delete or reorder columns | The parser matches on position and header |
| Never edit IDs | Campaign, ad group and keyword IDs are the join keys |
| Change one column type per upload | If it fails, you know which change caused it |
| Keep the untouched download as a backup | It is the only undo you have |
| Read the results file every time | Partial success is the normal outcome |

### What bulk operations is best at

- Changing hundreds of bids by a fixed percentage
- Adding a negative keyword list to every campaign at once
- Pausing every campaign for an out-of-stock ASIN
- Auditing the whole account structure in one spreadsheet

## The free stack

You can run a competent account for nothing:

| Need | Free tool |
|---|---|
| Campaign management | Amazon Campaign Manager |
| Bulk changes | Amazon Bulk Operations |
| Analysis and reporting | Google Sheets |
| Keyword ideas | Amazon search suggestions, plus your own auto campaign |
| Rank checking | Manual search in an incognito window |
| Seasonality | Google Trends |

What free does not cover: reverse-ASIN research, automated rules that fire overnight,
and rank tracking at scale. Those are the three things worth paying for, in that
order.

## Console navigation, the fast paths

| Task | Path |
|---|---|
| Search term report | Campaign Manager, Measurement and Reporting, Sponsored ads reports |
| Placement performance | Campaign, Settings, Placements |
| Negative keywords, campaign level | Campaign, Negative keywords tab |
| Shared negative list | Campaign Manager, Negative targeting lists |
| Budget rules | Campaign, Budget, Budget rules |
| Bulk operations | Campaign Manager, Bulk operations |
| Portfolio budgets | Campaign Manager, Portfolios |

## What to learn first

1. **The native console.** Every tool is a wrapper over it, and you cannot debug a
   wrapper you do not understand.
2. **Bulk operations.** It is free and it makes you faster than most people with a
   paid tool.
3. **Google Sheets to an intermediate level.** Lookups, pivot tables, conditional
   formatting.
4. **Helium 10 Cerebro.** The one paid tool most job postings name.
5. **Adtomic or an equivalent rules engine.** Last, once the manual work is instinct.`,
  },
];

export function resourceRefs(): ResourceRef[] {
  return docRefs(cheatSheets, "/cheat-sheets", UPDATED);
}

export function findCheatSheet(id: string): DocResource | undefined {
  return cheatSheets.find((sheet) => sheet.id === id);
}
