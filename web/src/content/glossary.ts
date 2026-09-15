import type { GlossaryTerm, ResourceRef } from "@/types/content";

/**
 * Amazon PPC glossary.
 *
 * A structured domain of its own rather than a `DocResource`: each entry is a
 * term, a plain-English definition, the formula where one exists, a worked
 * example and its neighbours, so the A-Z page can filter, cross-link and jump
 * without parsing markdown.
 *
 * Written to the brief in `../ppc-tools-for-va/EXPANSION-PLAN.md` section 8.1.
 */

export type Term = GlossaryTerm;

export const GLOSSARY_CATEGORIES = [
  "Metrics",
  "Economics",
  "Structure",
  "Targeting",
  "Bidding",
  "Ad types",
  "Account",
  "Tools",
] as const;

export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export const terms: Term[] = [
  /* ------------------------------------------------------------ Metrics */
  {
    id: "acos",
    term: "ACoS",
    abbreviation: "Advertising Cost of Sale",
    category: "Metrics",
    definition:
      "The share of advertising-attributed revenue that was spent on the advertising itself. The default efficiency metric on Amazon and the one every client asks about first.",
    formula: "ACoS = (Ad spend / Ad sales) x 100",
    example: "$280 of spend producing $1,000 of ad sales is a 28% ACoS.",
    related: ["roas", "tacos", "break-even-acos", "target-acos"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "roas",
    term: "ROAS",
    abbreviation: "Return on Ad Spend",
    category: "Metrics",
    definition:
      "Advertising revenue divided by advertising spend. The same fact as ACoS, stated as a multiple instead of a percentage — most non-Amazon marketers think in ROAS.",
    formula: "ROAS = Ad sales / Ad spend, and ROAS = 100 / ACoS%",
    example: "A 25% ACoS is a 4.0x ROAS. A 40% ACoS is a 2.5x ROAS.",
    related: ["acos", "tacos"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "tacos",
    term: "TACoS",
    abbreviation: "Total Advertising Cost of Sale",
    category: "Metrics",
    definition:
      "Ad spend as a share of total revenue, organic sales included. It answers whether advertising is buying organic growth or merely replacing it.",
    formula: "TACoS = (Ad spend / Total sales) x 100",
    example:
      "Falling TACoS while ACoS holds steady means organic sales are growing faster than ad spend — the outcome you want.",
    related: ["acos", "organic-sales", "total-sales"],
    seeAlso: ["/cheat-sheets/ppc-metrics", "/workflows/reporting-workflow"],
  },
  {
    id: "ctr",
    term: "CTR",
    abbreviation: "Click-Through Rate",
    category: "Metrics",
    definition:
      "The share of impressions that became clicks. It measures whether the ad earns attention: main image, title, price and star rating.",
    formula: "CTR = (Clicks / Impressions) x 100",
    example: "150 clicks from 30,000 impressions is a 0.50% CTR.",
    related: ["impressions", "clicks", "cvr"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "cvr",
    term: "CVR",
    abbreviation: "Conversion Rate",
    category: "Metrics",
    definition:
      "The share of clicks that became orders. It measures the listing rather than the ad: price, reviews, images, availability and relevance.",
    formula: "CVR = (Orders / Clicks) x 100",
    example: "12 orders from 150 clicks is an 8% conversion rate.",
    related: ["ctr", "clicks", "cpa"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "cpc",
    term: "CPC",
    abbreviation: "Cost Per Click",
    category: "Metrics",
    definition:
      "What one click actually cost, averaged over the period. It is an outcome of the auction, not a setting — your bid is the ceiling, the CPC is the price.",
    formula: "CPC = Spend / Clicks",
    example: "$180 across 150 clicks is a $1.20 average CPC.",
    related: ["bid", "max-cpc", "second-price-auction"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "cpa",
    term: "CPA",
    abbreviation: "Cost Per Acquisition",
    category: "Metrics",
    definition:
      "What one order cost in advertising. Useful when comparing across products at different prices, where ACoS alone hides the absolute cost.",
    formula: "CPA = Spend / Orders",
    example: "$180 of spend producing 12 orders is a $15.00 CPA.",
    related: ["cvr", "cpc", "aov"],
  },
  {
    id: "rpc",
    term: "RPC",
    abbreviation: "Revenue Per Click",
    category: "Metrics",
    definition:
      "What a single click from a given keyword is worth in revenue. The bridge between conversion rate and the bid you can afford.",
    formula: "RPC = Ad sales / Clicks, or Price x CVR",
    example: "A $30 product converting at 10% has an RPC of $3.00.",
    related: ["max-cpc", "profit-per-click", "cvr"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "profit-per-click",
    term: "Profit per click",
    category: "Metrics",
    definition:
      "The margin a click generates after the click itself is paid for. The only click metric that tells you whether a keyword makes money.",
    formula: "Profit per click = (RPC x Margin) - CPC",
    example:
      "RPC $3.00, margin 41.7%, CPC $0.75: (3.00 x 0.417) - 0.75 = $0.50 of profit per click.",
    related: ["rpc", "cpc", "contribution-margin"],
  },
  {
    id: "aov",
    term: "AOV",
    abbreviation: "Average Order Value",
    category: "Metrics",
    definition:
      "Average revenue per attributed order. A rising AOV alongside a flat ACoS usually means bundles or multi-packs are being bought.",
    formula: "AOV = Ad sales / Orders",
    example: "$1,000 of ad sales from 25 orders is a $40.00 AOV.",
    related: ["cpa", "ad-sales"],
  },
  {
    id: "impressions",
    term: "Impressions",
    category: "Metrics",
    definition:
      "The number of times an ad was served. Not the number of times it was seen — an impression can be counted below the fold.",
    related: ["ctr", "impression-share"],
  },
  {
    id: "clicks",
    term: "Clicks",
    category: "Metrics",
    definition:
      "The number of times shoppers clicked the ad. This is what you pay for on every Amazon ad format except Sponsored Display bought on vCPM.",
    related: ["cpc", "ctr", "cvr"],
  },
  {
    id: "ad-sales",
    term: "Ad sales",
    category: "Metrics",
    definition:
      "Revenue attributed to advertising within the attribution window. Includes sales of other ASINs from your brand that followed the click.",
    related: ["total-sales", "attribution-window", "acos"],
  },
  {
    id: "total-sales",
    term: "Total sales",
    category: "Metrics",
    definition:
      "All revenue for the product or account, whether it came from an ad or from organic search. The denominator in TACoS.",
    related: ["tacos", "organic-sales", "ad-sales"],
  },
  {
    id: "organic-sales",
    term: "Organic sales",
    category: "Metrics",
    definition:
      "Sales that did not follow an ad click. Growing organic sales is the long-term point of advertising: rank bought with ad spend keeps selling after the spend stops.",
    formula: "Organic sales = Total sales - Ad sales",
    related: ["total-sales", "tacos"],
  },
  {
    id: "impression-share",
    term: "Impression share",
    abbreviation: "IS",
    category: "Metrics",
    definition:
      "The share of available impressions your ads actually received for a given search term. Low impression share with strong efficiency means you are leaving volume on the table.",
    formula: "Impression share = Your impressions / Total available impressions",
    related: ["top-of-search-is", "impressions"],
  },
  {
    id: "top-of-search-is",
    term: "Top-of-search impression share",
    category: "Metrics",
    definition:
      "Your share of the impressions available in the first row of search results, where conversion rates are highest and competition is fiercest.",
    related: ["impression-share", "top-of-search", "placement-adjustment"],
  },
  {
    id: "new-to-brand",
    term: "New-to-brand",
    abbreviation: "NTB",
    category: "Metrics",
    definition:
      "Orders from customers who have not bought from your brand in the previous twelve months. The clearest available measure of whether advertising is genuinely acquiring customers rather than re-buying existing ones.",
    example:
      "Sponsored Brands campaigns are judged on new-to-brand orders as much as on ACoS.",
    related: ["sponsored-brands", "sponsored-display"],
    seeAlso: ["/cheat-sheets/ad-types"],
  },
  {
    id: "attribution-window",
    term: "Attribution window",
    category: "Metrics",
    definition:
      "The period after a click during which a resulting order is credited to the ad. Sponsored Products uses a 7-day window; Sponsored Brands and Sponsored Display use 14 days. Sponsored Display also reports view-through attribution.",
    example:
      "A click on 1 March that converts on 6 March is still attributed to that click.",
    related: ["ad-sales", "view-through-attribution"],
  },
  {
    id: "view-through-attribution",
    term: "View-through attribution",
    category: "Metrics",
    definition:
      "Credit given for an order that followed a viewed but unclicked ad. Specific to Sponsored Display, and the reason a Display campaign's click-based ACoS understates its contribution.",
    related: ["sponsored-display", "vcpm", "attribution-window"],
  },
  {
    id: "spend-share",
    term: "Spend share",
    category: "Metrics",
    definition:
      "What proportion of account spend a campaign, product or match type consumes. The fastest way to find where money is actually going in an unfamiliar account.",
    formula: "Spend share = (Campaign spend / Account spend) x 100",
    related: ["daily-budget", "spend"],
  },
  {
    id: "spend",
    term: "Spend",
    category: "Metrics",
    definition:
      "Total advertising cost for the period. On Amazon this is the sum of the click prices actually charged, which is always at or below the sum of your bids.",
    related: ["cpc", "second-price-auction", "daily-budget"],
  },

  /* ---------------------------------------------------------- Economics */
  {
    id: "break-even-acos",
    term: "Break-even ACoS",
    category: "Economics",
    definition:
      "The ACoS at which an advertised sale contributes exactly zero profit. It equals your profit margin before advertising, expressed as a percentage of the selling price.",
    formula:
      "Break-even ACoS = ((Price - COGS - Referral fee - Fulfilment fee) / Price) x 100",
    example:
      "A $30.00 product with $8.00 COGS, a $4.50 referral fee and a $5.00 FBA fee leaves $12.50, so break-even ACoS is 41.7%.",
    related: ["target-acos", "contribution-margin", "acos"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },
  {
    id: "target-acos",
    term: "Target ACoS",
    category: "Economics",
    definition:
      "The ACoS you actually optimise toward, set below break-even so each sale keeps some profit. Growth strategies set it near or above break-even deliberately, to buy rank.",
    example:
      "With a 41.7% break-even, a 30% target keeps roughly 28% of the pre-ad margin on every advertised sale.",
    related: ["break-even-acos", "acos"],
    seeAlso: ["/sops/bid-optimization"],
  },
  {
    id: "contribution-margin",
    term: "Contribution margin",
    category: "Economics",
    definition:
      "What is left of the selling price after variable costs — COGS, referral fee, fulfilment — but before advertising. Identical in value to break-even ACoS, expressed as money instead of a percentage.",
    formula: "Contribution margin = Price - COGS - Referral fee - Fulfilment fee",
    related: ["break-even-acos", "cogs", "referral-fee", "fba-fee"],
  },
  {
    id: "cogs",
    term: "COGS",
    abbreviation: "Cost of Goods Sold",
    category: "Economics",
    definition:
      "The landed unit cost of the product: manufacture, freight and duty. The first line to come off the selling price in any break-even calculation.",
    related: ["contribution-margin", "break-even-acos"],
  },
  {
    id: "referral-fee",
    term: "Referral fee",
    category: "Economics",
    definition:
      "Amazon's commission on each sale, charged as a percentage of the total price. It is 15% in most categories, with some categories higher or lower.",
    example: "A $30.00 sale in a 15% category carries a $4.50 referral fee.",
    related: ["fba-fee", "contribution-margin"],
  },
  {
    id: "fba-fee",
    term: "FBA fee",
    category: "Economics",
    definition:
      "The per-unit fulfilment fee for picking, packing and shipping an FBA order. It scales with size and weight tier, not with price.",
    related: ["fba", "contribution-margin", "referral-fee"],
  },
  {
    id: "max-cpc",
    term: "Maximum CPC",
    category: "Economics",
    definition:
      "The highest click price a keyword can carry and still hit its target ACoS. The arithmetic starting point for every bid.",
    formula: "Max CPC = Price x CVR x Target ACoS",
    example: "$30.00 x 10% x 25% = $0.75 as the target bid.",
    related: ["rpc", "bid", "target-acos"],
    seeAlso: ["/cheat-sheets/ppc-metrics"],
  },

  /* ---------------------------------------------------------- Structure */
  {
    id: "portfolio",
    term: "Portfolio",
    category: "Structure",
    definition:
      "A grouping layer above campaigns, used to organise by product line, brand or client and to apply a shared budget cap across several campaigns.",
    related: ["campaign", "daily-budget"],
    seeAlso: ["/cheat-sheets/campaign-structure"],
  },
  {
    id: "campaign",
    term: "Campaign",
    category: "Structure",
    definition:
      "The level that owns the daily budget, the bidding strategy, the placement adjustments and the start date. One campaign should have exactly one job.",
    related: ["ad-group", "daily-budget", "bidding-strategy"],
    seeAlso: ["/cheat-sheets/campaign-structure"],
  },
  {
    id: "ad-group",
    term: "Ad group",
    category: "Structure",
    definition:
      "The level inside a campaign that holds the targets and the advertised products, and sets the default bid. Keep one product theme per ad group so a single bid makes sense.",
    related: ["campaign", "default-bid", "keyword"],
  },
  {
    id: "daily-budget",
    term: "Daily budget",
    category: "Structure",
    definition:
      "The maximum a campaign can spend in a day, averaged across the month so a high-traffic day can overspend and a quiet one can under-spend. Below roughly $10 per day a campaign gathers too little data to optimise.",
    related: ["budget-rule", "campaign", "budget-pacing"],
    seeAlso: ["/sops/daily-health-check"],
  },
  {
    id: "budget-rule",
    term: "Budget rule",
    category: "Structure",
    definition:
      "An automated schedule or performance condition that raises a campaign's budget — for example a fixed uplift on a peak shopping day, or an increase while ACoS stays below target.",
    related: ["daily-budget", "dayparting"],
  },
  {
    id: "budget-pacing",
    term: "Budget pacing",
    category: "Structure",
    definition:
      "Whether spend through the day is on track to use the budget without exhausting it early. A campaign that caps at 11 AM is invisible for the rest of the day.",
    related: ["daily-budget"],
    seeAlso: ["/sops/daily-health-check"],
  },
  {
    id: "naming-convention",
    term: "Naming convention",
    category: "Structure",
    definition:
      "A fixed field order for campaign names so they can be filtered, sorted and bulk-edited. Without one, bulk operations on a large account are impractical.",
    example: "Widget_Exact_Top5, Widget_Auto_Auto, Brand_Widget_SB",
    related: ["campaign", "bulk-operations"],
    seeAlso: ["/cheat-sheets/campaign-structure"],
  },
  {
    id: "placement",
    term: "Placement",
    category: "Structure",
    definition:
      "Where on Amazon an ad can appear. Sponsored Products reports three: top of search, product pages, and rest of search.",
    related: ["top-of-search", "product-pages", "rest-of-search", "placement-adjustment"],
  },
  {
    id: "top-of-search",
    term: "Top of search",
    abbreviation: "ToS",
    category: "Structure",
    definition:
      "The first row of sponsored results on page one. The highest converting and most expensive placement on Amazon.",
    related: ["placement-adjustment", "top-of-search-is"],
  },
  {
    id: "product-pages",
    term: "Product pages placement",
    category: "Structure",
    definition:
      "Ad slots on detail pages, including competitors' pages. The natural home of product targeting campaigns.",
    related: ["product-targeting", "placement"],
  },
  {
    id: "rest-of-search",
    term: "Rest of search",
    category: "Structure",
    definition:
      "Sponsored slots further down the results page and on later pages. Cheaper than top of search and usually left at a 0% adjustment.",
    related: ["placement", "top-of-search"],
  },
  {
    id: "placement-adjustment",
    term: "Placement adjustment",
    category: "Structure",
    definition:
      "A percentage uplift applied to your bid for a specific placement, from 0% up to 900%. Check the placement report before setting one.",
    example: "A $1.00 bid with a +50% top-of-search adjustment bids $1.50 there.",
    related: ["placement", "top-of-search", "bid"],
    seeAlso: ["/cheat-sheets/campaign-structure"],
  },
  {
    id: "dayparting",
    term: "Dayparting",
    category: "Structure",
    definition:
      "Varying bids or budgets by hour or day of week, to concentrate spend when the audience converts best. Requires a third-party tool or budget rules.",
    related: ["budget-rule", "bid"],
  },

  /* ---------------------------------------------------------- Targeting */
  {
    id: "keyword",
    term: "Keyword",
    category: "Targeting",
    definition:
      "A term you choose to bid on. Distinct from a search term, which is what the shopper actually typed.",
    related: ["search-term", "exact-match", "phrase-match", "broad-match"],
  },
  {
    id: "search-term",
    term: "Search term",
    category: "Targeting",
    definition:
      "The exact text a shopper typed into Amazon. Your keywords are matched against it; the search term report is where you see it.",
    related: ["keyword", "search-term-report"],
    seeAlso: ["/cheat-sheets/search-term-report"],
  },
  {
    id: "search-term-report",
    term: "Search term report",
    abbreviation: "STR",
    category: "Targeting",
    definition:
      "The console report listing every search term that triggered an ad, with impressions, clicks, spend and attributed orders. The single most valuable report in the account.",
    related: ["search-term", "keyword-harvesting", "negative-exact"],
    seeAlso: ["/sops/weekly-search-term-analysis", "/cheat-sheets/search-term-report"],
  },
  {
    id: "exact-match",
    term: "Exact match",
    category: "Targeting",
    definition:
      "A keyword that matches only the term itself plus plurals and close misspellings. The tightest control, the highest expected conversion rate and the highest bid.",
    example: "The keyword \"organic green tea\" matches \"organic green teas\" but not \"best organic green tea\".",
    related: ["phrase-match", "broad-match", "keyword"],
    seeAlso: ["/cheat-sheets/match-types"],
  },
  {
    id: "phrase-match",
    term: "Phrase match",
    category: "Targeting",
    definition:
      "A keyword that matches searches containing the phrase in the same word order, with words allowed before and after.",
    example: "\"organic green tea\" matches \"best organic green tea bags\" but not \"green tea organic\".",
    related: ["exact-match", "broad-match"],
    seeAlso: ["/cheat-sheets/match-types"],
  },
  {
    id: "broad-match",
    term: "Broad match",
    category: "Targeting",
    definition:
      "A keyword that matches searches containing the words in any order, plus synonyms and related terms. A discovery tool, not a conversion tool.",
    example: "\"organic green tea\" can match \"green tea organic\" and \"organic matcha tea powder\".",
    related: ["exact-match", "phrase-match", "negative-exact"],
    seeAlso: ["/cheat-sheets/match-types"],
  },
  {
    id: "negative-exact",
    term: "Negative exact",
    category: "Targeting",
    definition:
      "Blocks one specific search term and its plurals. The default choice when a term has spent without converting, because the blast radius is a single term.",
    related: ["negative-phrase", "negative-keyword-list"],
    seeAlso: ["/cheat-sheets/negative-keywords"],
  },
  {
    id: "negative-phrase",
    term: "Negative phrase",
    category: "Targeting",
    definition:
      "Blocks any search containing the phrase in order. Powerful and dangerous: use it when an entire family of terms is irrelevant, never as a default.",
    example:
      "Negative phrase \"citrate\" on a glycinate-only product blocks every citrate variant at once.",
    related: ["negative-exact", "negative-keyword-list"],
    seeAlso: ["/cheat-sheets/negative-keywords"],
  },
  {
    id: "negative-keyword-list",
    term: "Negative keyword list",
    category: "Targeting",
    definition:
      "A shared, reusable set of negatives attached to many campaigns at once, so a term blocked in one place is blocked everywhere it should be.",
    related: ["negative-exact", "negative-phrase"],
    seeAlso: ["/cheat-sheets/negative-keywords"],
  },
  {
    id: "negative-product-targeting",
    term: "Negative product targeting",
    category: "Targeting",
    definition:
      "Excludes specific ASINs or brands from a campaign's product targeting. Used to stop spending on detail pages that never convert.",
    related: ["product-targeting", "asin"],
  },
  {
    id: "auto-campaign",
    term: "Auto campaign",
    category: "Targeting",
    definition:
      "A campaign where Amazon chooses the targets from your listing content. The cheapest source of genuinely new search terms, and a permanent sensor rather than a launch phase.",
    related: ["close-match", "loose-match", "substitutes", "complements"],
    seeAlso: ["/workflows/keyword-research-to-optimization"],
  },
  {
    id: "close-match",
    term: "Close match",
    category: "Targeting",
    definition:
      "An auto-campaign targeting group that matches searches very similar to your product. Usually the highest-intent and highest-bid group of the four.",
    related: ["auto-campaign", "loose-match"],
  },
  {
    id: "loose-match",
    term: "Loose match",
    category: "Targeting",
    definition:
      "An auto-campaign targeting group that matches searches loosely related to your product. The main source of genuinely unexpected discoveries.",
    related: ["auto-campaign", "close-match"],
  },
  {
    id: "substitutes",
    term: "Substitutes",
    category: "Targeting",
    definition:
      "An auto-campaign targeting group that places ads on detail pages of products similar to yours. Conquesting, chosen by Amazon rather than by you.",
    related: ["auto-campaign", "complements", "product-targeting"],
  },
  {
    id: "complements",
    term: "Complements",
    category: "Targeting",
    definition:
      "An auto-campaign targeting group that places ads on detail pages of products bought alongside yours. The most speculative of the four groups and usually the lowest bid.",
    related: ["auto-campaign", "substitutes"],
  },
  {
    id: "product-targeting",
    term: "Product targeting",
    category: "Targeting",
    definition:
      "Bidding on specific ASINs or on product categories rather than on keywords, so your ad appears on chosen detail pages.",
    related: ["asin", "category-targeting", "negative-product-targeting"],
    seeAlso: ["/cheat-sheets/campaign-structure"],
  },
  {
    id: "category-targeting",
    term: "Category targeting",
    category: "Targeting",
    definition:
      "Product targeting applied to a whole browse category, optionally refined by price band, star rating, brand or Prime eligibility.",
    related: ["product-targeting", "asin"],
  },
  {
    id: "keyword-harvesting",
    term: "Keyword harvesting",
    category: "Targeting",
    definition:
      "Promoting a converting search term from a discovery campaign into a manual exact campaign, so it can be bid deliberately. Always paired with a negative in the source campaign.",
    example: "Rule of thumb: harvest at two or more orders with ACoS below target.",
    related: ["search-term-report", "negative-exact", "keyword-cannibalisation"],
    seeAlso: ["/workflows/search-term-harvesting"],
  },
  {
    id: "keyword-cannibalisation",
    term: "Keyword cannibalisation",
    category: "Targeting",
    definition:
      "Two of your own campaigns bidding on the same search term, so you compete against yourself and pay the higher price. Almost always caused by harvesting without negating.",
    related: ["keyword-harvesting", "negative-exact"],
  },
  {
    id: "long-tail-keyword",
    term: "Long-tail keyword",
    category: "Targeting",
    definition:
      "A specific, multi-word search term with low volume and high intent. Individually small, collectively the majority of profitable traffic on most accounts.",
    example: "\"organic green tea bags caffeine free 100 count\"",
    related: ["head-term", "keyword"],
  },
  {
    id: "head-term",
    term: "Head term",
    category: "Targeting",
    definition:
      "A short, high-volume, low-specificity search term. Expensive, competitive, and usually a poorer converter than the long tail beneath it.",
    example: "\"green tea\"",
    related: ["long-tail-keyword", "keyword"],
  },
  {
    id: "indexed",
    term: "Indexed",
    category: "Targeting",
    definition:
      "Whether Amazon associates a listing with a keyword at all. An unindexed listing can still be advertised on that term but will never rank organically for it.",
    related: ["organic-sales", "keyword"],
    seeAlso: ["/cheat-sheets/tools"],
  },
  {
    id: "asin",
    term: "ASIN",
    abbreviation: "Amazon Standard Identification Number",
    category: "Targeting",
    definition:
      "The ten-character identifier for a product on Amazon. The unit of product targeting, reporting and most conversations about an account.",
    related: ["product-targeting", "asin-variation"],
  },
  {
    id: "asin-variation",
    term: "Variation",
    category: "Targeting",
    definition:
      "A parent listing grouping child ASINs that differ by size, colour or count. Reviews are shared across the family, which makes variations a launch lever.",
    related: ["asin"],
  },

  /* ------------------------------------------------------------ Bidding */
  {
    id: "bid",
    term: "Bid",
    category: "Bidding",
    definition:
      "The maximum you are willing to pay for one click on a target. It is a ceiling, not a price — the auction settles below it.",
    related: ["cpc", "default-bid", "max-cpc", "second-price-auction"],
  },
  {
    id: "default-bid",
    term: "Default bid",
    category: "Bidding",
    definition:
      "The ad-group-level bid used by any target without its own bid. Setting per-keyword bids and leaving a sensible default is standard practice.",
    related: ["bid", "ad-group"],
  },
  {
    id: "suggested-bid",
    term: "Suggested bid",
    category: "Bidding",
    definition:
      "Amazon's estimated bid range for a target, based on recent winning bids. A market signal, not a recommendation tuned to your margin.",
    related: ["bid", "max-cpc"],
  },
  {
    id: "second-price-auction",
    term: "Second-price auction",
    category: "Bidding",
    definition:
      "The auction model Amazon Ads uses: the winner pays just above the next highest competing bid rather than their own bid. This is why your average CPC sits below your bid.",
    example: "Bidding $1.50 against a next-best bid of $0.90 costs you about $0.91.",
    related: ["bid", "cpc"],
  },
  {
    id: "dynamic-bids-down-only",
    term: "Dynamic bids, down only",
    category: "Bidding",
    definition:
      "Amazon lowers your bid in real time when a click looks unlikely to convert, and never raises it. The safest strategy, and the right default for launches.",
    related: ["dynamic-bids-up-and-down", "fixed-bids", "bidding-strategy"],
    seeAlso: ["/cheat-sheets/campaign-structure"],
  },
  {
    id: "dynamic-bids-up-and-down",
    term: "Dynamic bids, up and down",
    category: "Bidding",
    definition:
      "Amazon raises the bid by up to 100% for top-of-search placements when conversion looks likely, and up to 50% elsewhere, lowering it when conversion looks unlikely.",
    related: ["dynamic-bids-down-only", "fixed-bids"],
  },
  {
    id: "fixed-bids",
    term: "Fixed bids",
    category: "Bidding",
    definition:
      "Amazon uses your exact bid on every auction with no real-time adjustment. Useful for measuring the true auction price of a term during a test.",
    related: ["dynamic-bids-down-only", "bid"],
  },
  {
    id: "bidding-strategy",
    term: "Bidding strategy",
    category: "Bidding",
    definition:
      "The campaign-level choice between fixed bids, dynamic down only, and dynamic up and down. It changes what Amazon is allowed to do with the number you set.",
    related: ["fixed-bids", "dynamic-bids-down-only", "dynamic-bids-up-and-down"],
  },
  {
    id: "bid-guardrail",
    term: "Bid guardrail",
    category: "Bidding",
    definition:
      "A hard limit configured in an automation tool — a minimum bid, a maximum bid, and a maximum percentage change per run — so a misfiring rule cannot do unbounded damage.",
    example: "A common set: minimum $0.30, maximum $5.00, maximum change 20% per adjustment.",
    related: ["bid"],
    seeAlso: ["/automation/automation-rules"],
  },

  /* ----------------------------------------------------------- Ad types */
  {
    id: "sponsored-products",
    term: "Sponsored Products",
    abbreviation: "SP",
    category: "Ad types",
    definition:
      "Cost-per-click ads promoting a single ASIN in search results and on detail pages. Available without Brand Registry and the majority of nearly every account's spend.",
    related: ["sponsored-brands", "sponsored-display"],
    seeAlso: ["/cheat-sheets/ad-types"],
  },
  {
    id: "sponsored-brands",
    term: "Sponsored Brands",
    abbreviation: "SB",
    category: "Ad types",
    definition:
      "Banner ads carrying a logo, a custom headline and several products or a Store link, usually above the search results. Requires Brand Registry.",
    related: ["sponsored-brands-video", "brand-registry", "brand-store", "new-to-brand"],
    seeAlso: ["/cheat-sheets/ad-types"],
  },
  {
    id: "sponsored-brands-video",
    term: "Sponsored Brands Video",
    category: "Ad types",
    definition:
      "An autoplaying video ad in the search results feed. The strongest format for products that need demonstrating, and judged on ACoS, with CTR and view rate as creative diagnostics.",
    related: ["sponsored-brands", "ctr"],
  },
  {
    id: "sponsored-display",
    term: "Sponsored Display",
    abbreviation: "SD",
    category: "Ad types",
    definition:
      "Ads targeting products, categories or audiences, shown on and off Amazon. The only format with retargeting audiences and view-through reporting.",
    related: ["vcpm", "view-through-attribution", "brand-registry"],
    seeAlso: ["/cheat-sheets/ad-types"],
  },
  {
    id: "vcpm",
    term: "vCPM",
    abbreviation: "Viewable Cost Per Thousand Impressions",
    category: "Ad types",
    definition:
      "A Sponsored Display cost model where you pay per thousand viewable impressions rather than per click. Suited to reach and awareness rather than direct response.",
    related: ["sponsored-display", "cpc"],
  },
  {
    id: "brand-store",
    term: "Brand Store",
    category: "Ad types",
    definition:
      "A multi-page storefront on Amazon for a registered brand. A common Sponsored Brands destination, and the only ad landing page you fully control.",
    related: ["sponsored-brands", "brand-registry"],
  },

  /* ------------------------------------------------------------ Account */
  {
    id: "brand-registry",
    term: "Brand Registry",
    category: "Account",
    definition:
      "Amazon's programme for verified brand owners. It unlocks Sponsored Brands, Sponsored Display, A+ Content, Brand Stores and Brand Analytics.",
    related: ["sponsored-brands", "sponsored-display", "a-plus-content", "brand-analytics"],
  },
  {
    id: "seller-central",
    term: "Seller Central",
    category: "Account",
    definition:
      "The dashboard third-party sellers use to manage listings, inventory, orders and advertising. Where a PPC VA usually needs user-permission access.",
    related: ["vendor-central", "advertising-console"],
    seeAlso: ["/sops/client-onboarding"],
  },
  {
    id: "vendor-central",
    term: "Vendor Central",
    category: "Account",
    definition:
      "The portal for first-party suppliers who sell to Amazon wholesale. Advertising options and reporting differ from Seller Central in important ways.",
    related: ["seller-central"],
  },
  {
    id: "advertising-console",
    term: "Advertising Console",
    category: "Account",
    definition:
      "Amazon's advertising interface, also called Campaign Manager. Where campaigns are built, bids are set and every report in this glossary is downloaded.",
    related: ["seller-central", "bulk-operations"],
  },
  {
    id: "buy-box",
    term: "Buy Box",
    abbreviation: "Featured Offer",
    category: "Account",
    definition:
      "The default add-to-cart offer on a detail page. Sponsored Products ads only serve while you hold it, so losing the Buy Box silently stops your ads.",
    related: ["fba", "listing-suppression"],
  },
  {
    id: "fba",
    term: "FBA",
    abbreviation: "Fulfilment by Amazon",
    category: "Account",
    definition:
      "Amazon stores, picks, packs and ships your inventory. Confers Prime eligibility, which materially improves conversion rate.",
    related: ["fbm", "fba-fee", "buy-box"],
  },
  {
    id: "fbm",
    term: "FBM",
    abbreviation: "Fulfilment by Merchant",
    category: "Account",
    definition:
      "You ship orders yourself. Prime eligibility requires Seller Fulfilled Prime, and conversion rates are typically lower than FBA without it.",
    related: ["fba", "buy-box"],
  },
  {
    id: "a-plus-content",
    term: "A+ Content",
    category: "Account",
    definition:
      "Enhanced brand-owner content in the detail page description: comparison charts, lifestyle imagery, richer copy. A recognised conversion-rate lever.",
    related: ["brand-registry", "cvr"],
  },
  {
    id: "listing-suppression",
    term: "Listing suppression",
    category: "Account",
    definition:
      "Amazon hiding a listing from search for a policy, content or compliance reason. Impressions collapse to near zero, which is why the daily health check watches for it.",
    related: ["buy-box", "impressions"],
    seeAlso: ["/sops/daily-health-check", "/sops/escalation-procedures"],
  },
  {
    id: "out-of-stock",
    term: "Out of stock",
    abbreviation: "OOS",
    category: "Account",
    definition:
      "No sellable inventory. Ads on an out-of-stock ASIN spend without converting and damage the rank the spend previously bought, so campaigns are paused immediately.",
    related: ["fba", "listing-suppression"],
    seeAlso: ["/sops/daily-health-check"],
  },
  {
    id: "vine",
    term: "Amazon Vine",
    category: "Account",
    definition:
      "A programme where enrolled sellers give units to trusted reviewers in exchange for honest reviews. Commonly used before a launch, because reviews drive conversion rate.",
    related: ["cvr", "brand-registry"],
    seeAlso: ["/sops/campaign-launch"],
  },
  {
    id: "prime-day",
    term: "Prime Day",
    category: "Account",
    definition:
      "Amazon's members-only sales event. Traffic, CPC and conversion all spike, which is why the seasonal workflow starts eight weeks out rather than the week before.",
    related: ["dayparting", "budget-rule"],
    seeAlso: ["/workflows/seasonal-preparation"],
  },

  /* -------------------------------------------------------------- Tools */
  {
    id: "bulk-operations",
    term: "Bulk operations",
    category: "Tools",
    definition:
      "Amazon's download-edit-upload workflow for changing campaigns at scale in a spreadsheet. Free, and a genuine substitute for much of what paid rule engines do.",
    related: ["advertising-console", "naming-convention"],
    seeAlso: ["/cheat-sheets/tools"],
  },
  {
    id: "helium-10",
    term: "Helium 10",
    category: "Tools",
    definition:
      "The Amazon seller software suite most commonly named in PPC job postings. Bundles keyword research, rank tracking, listing tools and the Adtomic PPC automation module.",
    related: ["cerebro", "magnet", "adtomic"],
    seeAlso: ["/automation/tool-comparison"],
  },
  {
    id: "cerebro",
    term: "Cerebro",
    category: "Tools",
    definition:
      "Helium 10's reverse-ASIN tool: enter a competitor ASIN and get every keyword it ranks for. The starting point of most keyword research.",
    related: ["magnet", "helium-10", "asin"],
  },
  {
    id: "magnet",
    term: "Magnet",
    category: "Tools",
    definition:
      "Helium 10's seed-keyword expansion tool. Enter a head term and get related keywords with volume estimates.",
    related: ["cerebro", "helium-10", "head-term"],
  },
  {
    id: "adtomic",
    term: "Adtomic",
    category: "Tools",
    definition:
      "Helium 10's PPC automation module: rule-based bid changes, keyword harvesting suggestions and negative keyword automation, with guardrails you configure.",
    related: ["helium-10", "bid-guardrail"],
    seeAlso: ["/automation/adtomic-setup"],
  },
  {
    id: "brand-analytics",
    term: "Brand Analytics",
    category: "Tools",
    definition:
      "A Brand Registry reporting suite. Its Search Query Performance report shows your brand's share of impressions, clicks and purchases for individual search queries.",
    related: ["brand-registry", "impression-share"],
  },
  {
    id: "targeting-report",
    term: "Targeting report",
    category: "Tools",
    definition:
      "The console report showing performance for each keyword or product target you chose, as opposed to the search terms that matched them.",
    related: ["search-term-report", "keyword", "product-targeting"],
    seeAlso: ["/cheat-sheets/tools"],
  },
  {
    id: "placement-report",
    term: "Placement report",
    category: "Tools",
    definition:
      "The console report breaking performance down by top of search, product pages and rest of search. The only sound basis for setting placement adjustments.",
    related: ["placement-adjustment", "top-of-search"],
  },
  {
    id: "purchased-product-report",
    term: "Purchased Product report",
    category: "Tools",
    definition:
      "Shows which ASINs were actually bought after a click, including ASINs other than the advertised one. Frequently reveals that a campaign is carrying the wider range.",
    related: ["ad-sales", "asin"],
    seeAlso: ["/cheat-sheets/tools"],
  },
];

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export function findTerm(id: string): Term | undefined {
  return terms.find((entry) => entry.id === id);
}

/** Terms grouped under their initial letter, A-Z, each group sorted. */
export function termsByLetter(): { letter: string; entries: Term[] }[] {
  const groups = new Map<string, Term[]>();

  for (const entry of [...terms].sort((a, b) => a.term.localeCompare(b.term))) {
    const letter = entry.term.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    const bucket = groups.get(key);
    if (bucket) bucket.push(entry);
    else groups.set(key, [entry]);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, entries]) => ({ letter, entries }));
}

/** Every category actually in use, in the canonical display order. */
export function categoriesInUse(): string[] {
  const present = new Set(terms.map((entry) => entry.category));
  return GLOSSARY_CATEGORIES.filter((category) => present.has(category));
}

/**
 * One `ResourceRef` per term, deep-linked to its anchor on `/glossary`.
 *
 * Deliberately no umbrella ref for the page itself: it would make
 * `resourceCount("glossary")` disagree by one with the term count the page
 * reports, and every term already carries the "glossary" tag, so the page is
 * reachable from any definition that matches.
 */
export function resourceRefs(): ResourceRef[] {
  return terms.map((entry) => ({
    id: `glossary-${entry.id}`,
    kind: "glossary",
    title: entry.abbreviation ? `${entry.term} (${entry.abbreviation})` : entry.term,
    summary: entry.definition,
    href: `/glossary#${entry.id}`,
    tags: ["glossary", entry.category.toLowerCase()],
    minutes: 1,
    body: [entry.definition, entry.formula, entry.example].filter(Boolean).join(" "),
    updated: "2026-09-15",
  }));
}
