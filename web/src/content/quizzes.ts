import type { Level, Quiz, QuizQuestion, ResourceRef, Tone } from "@/types/content";

/**
 * The PPC Academy question bank.
 *
 * Ported in full from `../ppc-tools-for-va/quizzes/ppc-quizzes.md` (50 source
 * questions across five levels) and expanded to 126. Every source answer is
 * preserved: where the original was a short-answer prompt, the correct choice
 * carries the source wording and the three distractors are authored to be
 * plausible-but-wrong rather than obviously silly.
 *
 * Rules this file keeps:
 *  - exactly four choices per question
 *  - every arithmetic answer is checked and internally consistent
 *  - every explanation says WHY, not just WHAT
 *  - `reference` always points at a route that exists on this site
 */

export const PASS_MARK = 70;

/** Controlled topic vocabulary — charts and filters group on these strings. */
export const QUIZ_TOPICS = [
  "Match types",
  "Ad types",
  "Targeting",
  "Metrics",
  "Profitability",
  "Search terms",
  "Negatives",
  "Bidding",
  "Placements",
  "Budgets",
  "Structure",
  "Launch",
  "Seasonality",
  "Reporting",
  "Client comms",
  "Troubleshooting",
] as const;

export type QuizTopic = (typeof QUIZ_TOPICS)[number];

export interface LevelMeta {
  level: Level;
  label: string;
  /** Ordinal shown on the hub card, e.g. "Level 1". */
  ordinal: string;
  tagline: string;
  description: string;
  tone: Tone;
  /** Suggested seconds per question when timing an exam at this level. */
  secondsPerQuestion: number;
}

export const LEVEL_META: Record<Level, LevelMeta> = {
  beginner: {
    level: "beginner",
    label: "Fundamentals",
    ordinal: "Level 1",
    tagline: "Match types, ad types, and the six metrics you must know cold",
    description:
      "The vocabulary and arithmetic of Amazon PPC. If you cannot answer these without thinking, no amount of optimisation technique will save you in an interview or on a client call.",
    tone: "good",
    secondsPerQuestion: 45,
  },
  intermediate: {
    level: "intermediate",
    label: "Optimisation",
    ordinal: "Level 2",
    tagline: "Search terms, bids, placements and budget decisions",
    description:
      "The weekly work of a PPC specialist: reading a search term report, moving a bid for a reason, choosing where the money goes, and knowing how much data is enough.",
    tone: "brand",
    secondsPerQuestion: 60,
  },
  advanced: {
    level: "advanced",
    label: "Strategy",
    ordinal: "Level 3",
    tagline: "Structure, TACoS, halo, negatives and account-level thinking",
    description:
      "Decisions that shape a whole account rather than a single keyword: how to structure, what TACoS is really telling you, and how to restructure someone else's mess without breaking it.",
    tone: "info",
    secondsPerQuestion: 75,
  },
  expert: {
    level: "expert",
    label: "Client management",
    ordinal: "Level 4",
    tagline: "Expectations, escalation, reporting and hard conversations",
    description:
      "The part of the job that decides whether you keep the account. Setting targets that are achievable, defending a strategy with numbers, and telling a client something they do not want to hear.",
    tone: "ember",
    secondsPerQuestion: 90,
  },
  scenario: {
    level: "scenario",
    label: "Scenario problem-solving",
    ordinal: "Level 5",
    tagline: "Broken accounts, sudden drops and Q4 under pressure",
    description:
      "Open-ended situations with no single obvious lever. Each one rewards diagnosis before action — the habit that separates a specialist from someone who changes bids and hopes.",
    tone: "warn",
    secondsPerQuestion: 90,
  },
};

export const LEVEL_ORDER: Level[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "scenario",
];

/* ================================================================== *
 * Level 1 — Fundamentals (38 questions)
 * ================================================================== */

const beginnerQuestions: QuizQuestion[] = [
  {
    id: "beg-01",
    level: "beginner",
    topic: "Match types",
    question: "Amazon Sponsored Products keyword targeting offers which three match types?",
    choices: [
      "Broad, phrase and exact",
      "Broad, modified broad and exact",
      "Close, loose and exact",
      "Automatic, manual and negative",
    ],
    answerIndex: 0,
    explanation:
      "Amazon has exactly three keyword match types: broad, phrase and exact. Modified broad match is a Google Ads concept Amazon never adopted. Close match and loose match are auto-campaign targeting groups, not keyword match types, and automatic versus manual is a campaign targeting setting.",
    reference: "/cheat-sheets/match-types",
  },
  {
    id: "beg-02",
    level: "beginner",
    topic: "Match types",
    question:
      "Your keyword is 'bluetooth headphones' on phrase match. A shopper searches 'wireless bluetooth headphones'. Can your ad show?",
    choices: [
      "Yes — phrase match allows extra words before or after, as long as the phrase stays intact and in order",
      "No — any additional word breaks a phrase match",
      "Only if you also add the keyword on broad match",
      "Only if the word 'wireless' appears in your product title",
    ],
    answerIndex: 0,
    explanation:
      "Phrase match triggers when the search term contains your keyword as an unbroken sequence, with anything allowed before or after it. 'wireless bluetooth headphones' keeps 'bluetooth headphones' together and in order, so it qualifies. 'headphones bluetooth' would not, because the order is broken.",
    reference: "/cheat-sheets/match-types",
  },
  {
    id: "beg-03",
    level: "beginner",
    topic: "Match types",
    question: "Which match type gives you the MOST control over which searches trigger your ad?",
    choices: ["Broad match", "Phrase match", "Exact match", "Auto targeting"],
    answerIndex: 2,
    explanation:
      "Exact match only serves when the search term matches your keyword exactly, or is a close variant such as a plural or a common misspelling. That tight surface is why exact match campaigns hold your proven, highest-bid keywords.",
    reference: "/cheat-sheets/match-types",
  },
  {
    id: "beg-04",
    level: "beginner",
    topic: "Match types",
    question: "Which match type gives you the WIDEST reach but the least control?",
    choices: ["Broad match", "Phrase match", "Exact match", "Negative phrase"],
    answerIndex: 0,
    explanation:
      "Broad match serves on related searches including synonyms, misspellings, plurals and terms that only share intent with your keyword. That makes it excellent for discovery and dangerous for budget, which is why broad campaigns need the tightest negative keyword hygiene.",
    reference: "/cheat-sheets/match-types",
  },
  {
    id: "beg-05",
    level: "beginner",
    topic: "Targeting",
    question: "You are running an automatic campaign. Where does Amazon pull its targeting from?",
    choices: [
      "A list of category head terms Amazon maintains",
      "Your product listing — title, bullet points, description and backend search terms",
      "The keywords in your other manual campaigns",
      "Brand Analytics search query data",
    ],
    answerIndex: 1,
    explanation:
      "An auto campaign reads your own listing to decide what you are relevant for. That is why a thin or badly written listing produces a badly targeted auto campaign: fix the copy and the backend terms before blaming the campaign.",
    reference: "/glossary#auto-campaign",
  },
  {
    id: "beg-06",
    level: "beginner",
    topic: "Ad types",
    question: "What are the three main Amazon ad types?",
    choices: [
      "Sponsored Products, Sponsored Brands and Sponsored Posts",
      "Sponsored Products, Sponsored Search and Sponsored Video",
      "Sponsored Products, Sponsored Brands and Sponsored Display",
      "Sponsored Listings, Sponsored Stores and Sponsored Display",
    ],
    answerIndex: 2,
    explanation:
      "Sponsored Products (SP), Sponsored Brands (SB) and Sponsored Display (SD) are the three core ad types in the advertising console. Sponsored Brands video and Sponsored TV are formats inside those families, not separate ad types.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "beg-07",
    level: "beginner",
    topic: "Ad types",
    question: "Which ad type is available to ALL sellers, with no Brand Registry required?",
    choices: [
      "Sponsored Products",
      "Sponsored Brands",
      "Sponsored Display",
      "Sponsored Brands video",
    ],
    answerIndex: 0,
    explanation:
      "Sponsored Products is open to any seller with an eligible listing in a Professional account. Sponsored Brands and Sponsored Display are gated behind Brand Registry for sellers, which is why resellers and unregistered brands live entirely in SP.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "beg-08",
    level: "beginner",
    topic: "Ad types",
    question:
      "Which ad type lets you show your brand logo, a custom headline and several products in one unit?",
    choices: [
      "Sponsored Products",
      "Sponsored Brands",
      "Sponsored Display",
      "A Brand Store page",
    ],
    answerIndex: 1,
    explanation:
      "Sponsored Brands is the banner-style format: logo, editable headline, and either a multi-product carousel, a Store spotlight or a video. It is the only ad unit that sells the brand rather than a single ASIN.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "beg-09",
    level: "beginner",
    topic: "Ad types",
    question: "Where can Sponsored Display ads appear?",
    choices: [
      "Only on Amazon search results pages",
      "Only on Amazon product detail pages",
      "Only inside the Amazon shopping app",
      "On Amazon detail pages and search results, and off Amazon on third-party websites and apps",
    ],
    answerIndex: 3,
    explanation:
      "Sponsored Display is the only self-serve format that follows the shopper off Amazon, serving on third-party sites and apps as well as on detail pages and search results. That off-Amazon reach is what makes its view-through metrics look different from SP and SB.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "beg-10",
    level: "beginner",
    topic: "Targeting",
    question: "What is the difference between product targeting and keyword targeting?",
    choices: [
      "Product targeting bids on ASINs you own; keyword targeting bids on competitor ASINs",
      "Product targeting places your ad on specific ASINs or categories; keyword targeting places your ad against shopper search terms",
      "Product targeting is only available in Sponsored Display",
      "They are the same feature named differently in Seller Central and the ads console",
    ],
    answerIndex: 1,
    explanation:
      "Keyword targeting buys intent — what the shopper typed. Product targeting buys placement — the detail pages or categories where you want to appear. Most mature accounts run both: keywords to catch the search, product targeting to sit on the competitor pages the search leads to.",
    reference: "/glossary#product-targeting",
  },
  {
    id: "beg-11",
    level: "beginner",
    topic: "Metrics",
    question: "What does ACoS stand for?",
    choices: [
      "Average Cost of Sale",
      "Annual Cost of Selling",
      "Advertising Cost of Sale",
      "Ad Conversion of Sales",
    ],
    answerIndex: 2,
    explanation:
      "Advertising Cost of Sale: ad spend divided by ad revenue, expressed as a percentage. ACoS = (Ad Spend / Ad Revenue) x 100. It answers one question — what share of the revenue an ad produced went back to Amazon to buy the clicks.",
    reference: "/glossary#acos",
  },
  {
    id: "beg-12",
    level: "beginner",
    topic: "Metrics",
    question: "You spent $50 on ads and generated $200 in ad sales. What is your ACoS?",
    choices: ["12.5%", "25%", "40%", "400%"],
    answerIndex: 1,
    explanation:
      "ACoS = (50 / 200) x 100 = 25%. A quarter of the revenue those ads produced was spent buying the clicks. The 400% option is the same two numbers inverted — that is ROAS as a percentage, a common slip under interview pressure.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "beg-13",
    level: "beginner",
    topic: "Metrics",
    question: "What does ROAS stand for, and how is it calculated?",
    choices: [
      "Return on Ad Spend — ad revenue divided by ad spend",
      "Rate of Ad Sales — orders divided by clicks",
      "Revenue on Ad Sales — ad revenue divided by total revenue",
      "Return on Advertised Stock — units sold divided by units held",
    ],
    answerIndex: 0,
    explanation:
      "ROAS = Ad Revenue / Ad Spend, reported as a multiple such as 4.0x. It is the same relationship as ACoS turned upside down: agencies and Google-trained marketers prefer ROAS, Amazon reports ACoS, and you need to switch between them without a calculator.",
    reference: "/glossary#roas",
  },
  {
    id: "beg-14",
    level: "beginner",
    topic: "Metrics",
    question: "Using the same numbers — $50 spend, $200 ad sales — what is the ROAS?",
    choices: ["0.25x", "2.5x", "4.0x", "40x"],
    answerIndex: 2,
    explanation:
      "ROAS = 200 / 50 = 4.0x. Every advertising dollar returned four dollars of revenue. Note it says revenue, not profit: a 4.0x ROAS on a product with a 20% margin still loses money.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "beg-15",
    level: "beginner",
    topic: "Metrics",
    question: "What is CPC?",
    choices: [
      "Clicks per conversion",
      "Cost per click — total ad spend divided by total clicks",
      "Cost per conversion — total ad spend divided by orders",
      "Clicks per campaign",
    ],
    answerIndex: 1,
    explanation:
      "CPC = Total Ad Spend / Total Clicks: the average price you actually paid per click, which is almost always below your bid because Amazon runs a second-price auction. Cost per conversion is CPA, a different metric.",
    reference: "/glossary#cpc",
  },
  {
    id: "beg-16",
    level: "beginner",
    topic: "Metrics",
    question: "What is CTR?",
    choices: [
      "Conversion to revenue ratio",
      "Cost per thousand impressions",
      "Clicks divided by orders",
      "Click-through rate — clicks divided by impressions, as a percentage",
    ],
    answerIndex: 3,
    explanation:
      "CTR = (Clicks / Impressions) x 100. It measures whether the ad earns the click: main image, price, review count, rating and badge. A low CTR is almost never a bidding problem, so raising the bid to fix it just buys more expensive indifference.",
    reference: "/glossary#ctr",
  },
  {
    id: "beg-17",
    level: "beginner",
    topic: "Profitability",
    question: "What is a 'good' ACoS?",
    choices: [
      "Under 10% for every product",
      "Under 25% — the platform average",
      "It depends on margin: your target ACoS sits at or below break-even ACoS, and break-even ACoS equals your profit margin",
      "Whatever number the client puts in the brief",
    ],
    answerIndex: 2,
    explanation:
      "There is no universal good ACoS. If your contribution margin is 30%, spending 30% of revenue on ads breaks you even, so 30% is your break-even ACoS and anything below it is profit. A 45% ACoS can be excellent on a 60% margin product and ruinous on a 25% margin one.",
    reference: "/glossary#break-even-acos",
  },
  {
    id: "beg-18",
    level: "beginner",
    topic: "Match types",
    question: "Does an exact match keyword only ever serve on the exact words you typed?",
    choices: [
      "No — exact match also covers close variants such as plurals, misspellings and small word-order changes",
      "Yes, character for character",
      "Only if you switch close variants off in campaign settings",
      "Only for single-word keywords",
    ],
    answerIndex: 0,
    explanation:
      "Amazon's exact match includes close variants: singular and plural forms, common misspellings, acronyms and minor reorderings. This is why you still have to read the search term report on an exact campaign — you will find spend on terms you never typed.",
    reference: "/glossary#exact-match",
  },
  {
    id: "beg-19",
    level: "beginner",
    topic: "Match types",
    question: "Which set of searches could a broad match keyword 'yoga mat' legitimately trigger?",
    choices: [
      "'yoga mat' only",
      "'yoga mat' and 'yoga mats' only",
      "'yoga mat' and 'mat yoga' only",
      "'yoga mats for women', 'non slip exercise mat' and 'yoga matt' — synonyms, related terms and misspellings all qualify",
    ],
    answerIndex: 3,
    explanation:
      "Broad match reaches everything with related intent, including words that never appear in your keyword. That is the whole point of running it — you are paying Amazon to tell you what shoppers actually call your product — but it only pays off if you read the search term report weekly.",
    reference: "/glossary#broad-match",
  },
  {
    id: "beg-20",
    level: "beginner",
    topic: "Bidding",
    question:
      "You are setting starting bids for the same keyword on exact, phrase and broad. What is the usual order, highest bid first?",
    choices: [
      "Broad, then phrase, then exact",
      "Exact, then phrase, then broad",
      "All three identical, always",
      "Phrase, then broad, then exact",
    ],
    answerIndex: 1,
    explanation:
      "Exact traffic is the most qualified, so it earns the highest bid. A common starting ladder is phrase at roughly 80% of the exact bid and broad at roughly 60%, which also stops the discovery match types out-bidding your proven exact keyword for the same search term.",
    reference: "/sops/bid-optimization",
  },
  {
    id: "beg-21",
    level: "beginner",
    topic: "Search terms",
    question: "What is the difference between a keyword and a search term?",
    choices: [
      "They are two names for the same thing",
      "A keyword is what the shopper types; a search term is what you bid on",
      "A search term is what the shopper types; a keyword is what you bid on",
      "A search term is a keyword that has already converted",
    ],
    answerIndex: 2,
    explanation:
      "The shopper types a search term. You bid on a keyword. The search term report is the bridge between them, showing which real searches your keywords caught — which is why the report, not the keyword list, is where optimisation work starts.",
    reference: "/cheat-sheets/search-term-report",
  },
  {
    id: "beg-22",
    level: "beginner",
    topic: "Targeting",
    question: "What are the four targeting groups inside an automatic campaign?",
    choices: [
      "Close match, loose match, substitutes and complements",
      "Exact, phrase, broad and negative",
      "Top of search, product pages, rest of search and off Amazon",
      "Brand, category, competitor and generic",
    ],
    answerIndex: 0,
    explanation:
      "Close match and loose match are keyword-like groups; substitutes serve on similar competing products and complements on products bought alongside yours. You can set a separate bid for each group, so an auto campaign is far more controllable than most beginners assume.",
    reference: "/glossary#auto-campaign",
  },
  {
    id: "beg-23",
    level: "beginner",
    topic: "Negatives",
    question: "What does a negative keyword do?",
    choices: [
      "It lowers your bid on that term by 50%",
      "It blocks your ad from serving on searches that match that term",
      "It removes the term from your product listing",
      "It flags the term in the search term report but keeps serving",
    ],
    answerIndex: 1,
    explanation:
      "A negative keyword is a hard block, not a bid adjustment. Added as negative exact it stops that one search term; added as negative phrase it stops every search containing that phrase, which is powerful and easy to over-apply.",
    reference: "/cheat-sheets/negative-keywords",
  },
  {
    id: "beg-24",
    level: "beginner",
    topic: "Metrics",
    question: "What does the impressions metric count?",
    choices: [
      "The number of shoppers who clicked your ad",
      "The number of orders placed after seeing your ad",
      "The number of times your ad was displayed",
      "The number of times your listing appeared in organic results",
    ],
    answerIndex: 2,
    explanation:
      "Impressions count ad displays, not people and not clicks. They are the top of the funnel: no impressions means a bid, budget, eligibility or Buy Box problem, and no amount of listing work will fix it.",
    reference: "/glossary#impressions",
  },
  {
    id: "beg-25",
    level: "beginner",
    topic: "Metrics",
    question: "A keyword got 400 clicks and 20 orders. What is its conversion rate?",
    choices: ["2%", "5%", "20%", "50%"],
    answerIndex: 1,
    explanation:
      "CVR = (20 / 400) x 100 = 5%. Conversion rate is a listing metric far more than an ad metric: the ad bought the visit, the detail page decided the sale. Amazon-wide, 10% is a common benchmark, so 5% says look at price, images and reviews.",
    reference: "/glossary#cvr",
  },
  {
    id: "beg-26",
    level: "beginner",
    topic: "Metrics",
    question: "A campaign spent $180 and received 240 clicks. What is the CPC?",
    choices: ["$0.75", "$1.33", "$0.55", "$7.50"],
    answerIndex: 0,
    explanation:
      "CPC = 180 / 240 = $0.75. The $1.33 option is the calculation inverted (clicks divided by spend), which is not a metric anyone uses — check which number goes on top before you answer.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "beg-27",
    level: "beginner",
    topic: "Metrics",
    question: "An ad served 12,000 impressions and earned 60 clicks. What is the CTR?",
    choices: ["0.05%", "0.2%", "0.5%", "5%"],
    answerIndex: 2,
    explanation:
      "CTR = (60 / 12,000) x 100 = 0.5%. For Sponsored Products, roughly 0.3% to 0.5% is normal and anything under 0.2% signals a main image, price or review problem rather than a targeting problem.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "beg-28",
    level: "beginner",
    topic: "Metrics",
    question: "A client reports a ROAS of 5.0x. What is the equivalent ACoS?",
    choices: ["5%", "20%", "25%", "50%"],
    answerIndex: 1,
    explanation:
      "ACoS = 1 / ROAS = 1 / 5 = 0.20, so 20%. Learn the common pairs by heart: 2.0x is 50%, 2.5x is 40%, 3.0x is 33%, 4.0x is 25%, 5.0x is 20%, 10x is 10%.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "beg-29",
    level: "beginner",
    topic: "Metrics",
    question: "What is the relationship between ACoS and ROAS?",
    choices: [
      "They measure different things and cannot be converted",
      "ACoS = ROAS x 100",
      "ACoS = ROAS / 100",
      "They are reciprocals: ACoS = 1 / ROAS, expressed as a percentage",
    ],
    answerIndex: 3,
    explanation:
      "They are the same ratio read in opposite directions, so one always converts to the other. Amazon reports ACoS; agencies and clients from a Google or Meta background usually want ROAS. Being able to switch instantly in a meeting is a small skill with a large credibility payoff.",
    reference: "/glossary#roas",
  },
  {
    id: "beg-30",
    level: "beginner",
    topic: "Metrics",
    question: "A campaign received 320 clicks at an average CPC of $0.85. What did it spend?",
    choices: ["$27.20", "$37.65", "$272.00", "$376.50"],
    answerIndex: 2,
    explanation:
      "Spend = clicks x CPC = 320 x 0.85 = $272.00. This is the arithmetic behind every budget forecast: decide the clicks you need, multiply by the CPC you expect, and you have the budget you must ask for.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "beg-31",
    level: "beginner",
    topic: "Budgets",
    question: "What happens when a campaign uses up its daily budget?",
    choices: [
      "Amazon keeps serving and bills the overage next month",
      "The campaign stops serving for the rest of the day and resumes the next day",
      "Amazon automatically raises the budget by 25%",
      "Your bids are halved for the rest of the day",
    ],
    answerIndex: 1,
    explanation:
      "An out-of-budget campaign goes dark until midnight in the account's time zone. Amazon may spend up to 25% over your daily budget on a high-traffic day and balance it against under-spending days in the same calendar month, but it never bills you beyond your monthly equivalent.",
    reference: "/glossary#daily-budget",
  },
  {
    id: "beg-32",
    level: "beginner",
    topic: "Structure",
    question: "What is the correct hierarchy in the Amazon advertising console?",
    choices: [
      "Portfolio > campaign > ad group > keyword or product target",
      "Campaign > portfolio > ad group > keyword",
      "Account > ad group > campaign > keyword",
      "Campaign > keyword > ad group > product target",
    ],
    answerIndex: 0,
    explanation:
      "Portfolios group campaigns; campaigns hold the budget and the bidding strategy; ad groups hold the products plus their keywords or product targets. Knowing which level a setting lives on saves you from hunting for a budget field on an ad group that does not have one.",
    reference: "/cheat-sheets/campaign-structure",
  },
  {
    id: "beg-33",
    level: "beginner",
    topic: "Structure",
    question: "What is an ad group?",
    choices: [
      "A set of campaigns that share one budget",
      "A saved list of negative keywords",
      "A container inside a campaign holding the advertised products plus the keywords or targets that serve them",
      "The daily budget setting for a group of ASINs",
    ],
    answerIndex: 2,
    explanation:
      "The ad group is where products meet targeting. Keep one tight theme per ad group: the products in it should all be genuinely relevant to every keyword in it, or your click-through and conversion rates will average out into mush.",
    reference: "/glossary#ad-group",
  },
  {
    id: "beg-34",
    level: "beginner",
    topic: "Ad types",
    question: "A seller wants to run Sponsored Brands. What do they need first?",
    choices: [
      "Amazon Brand Registry — Sponsored Brands and Sponsored Display are gated behind it for sellers",
      "A minimum of 50 reviews on the advertised ASIN",
      "A Professional selling plan and nothing else",
      "A registered trademark in every marketplace they sell in",
    ],
    answerIndex: 0,
    explanation:
      "Brand Registry is the gate. It requires an active registered trademark for the brand, and it unlocks Sponsored Brands, Sponsored Display, A+ content, Brand Stores and Brand Analytics — which is why 'are you brand registered' is one of the first onboarding questions.",
    reference: "/sops/client-onboarding",
  },
  {
    id: "beg-35",
    level: "beginner",
    topic: "Ad types",
    question: "Sponsored Display offers two broad targeting approaches. What are they?",
    choices: [
      "Exact and phrase targeting",
      "Product and category (contextual) targeting, and audience targeting such as views remarketing",
      "Automatic and manual targeting",
      "Search targeting and Store targeting",
    ],
    answerIndex: 1,
    explanation:
      "Contextual targeting places your ad on chosen ASINs or categories, the way SP product targeting does. Audience targeting follows shoppers instead of pages — views remarketing, purchase remarketing and interest audiences — and it is the part of SD that reaches off Amazon.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "beg-36",
    level: "beginner",
    topic: "Ad types",
    question: "Where do Sponsored Products ads appear?",
    choices: [
      "Only at the top of search results",
      "Only on product detail pages",
      "Only inside the Amazon shopping app",
      "In search results and on product detail pages, across desktop and mobile",
    ],
    answerIndex: 3,
    explanation:
      "Sponsored Products serves in three placement buckets: top of search on the first page, the rest of search, and product detail pages. Each converts differently, which is why the placement report and placement bid adjustments exist.",
    reference: "/glossary#placement",
  },
  {
    id: "beg-37",
    level: "beginner",
    topic: "Placements",
    question: "What are the three Sponsored Products placements you can adjust bids for?",
    choices: [
      "Top of search (first page), rest of search, and product pages",
      "Top of search, bottom of search, and off Amazon",
      "Search results, Brand Store, and the shopping cart",
      "Above the fold, below the fold, and in-app",
    ],
    answerIndex: 0,
    explanation:
      "Top of search usually converts best and costs most; product pages behave completely differently and often deserve their own campaign rather than a shared bid. The placement report is where you find out which is carrying the account.",
    reference: "/glossary#placement-adjustment",
  },
  {
    id: "beg-38",
    level: "beginner",
    topic: "Metrics",
    question:
      "Which metric best answers the question 'is my listing converting the traffic I am paying for?'",
    choices: ["CTR", "CPC", "Conversion rate", "Impressions"],
    answerIndex: 2,
    explanation:
      "CTR grades the ad — image, price, rating, badge. Conversion rate grades the detail page after the click — copy, images, reviews, price, availability. When CTR is healthy and CVR is not, the problem is on the listing and no bid change will fix it.",
    reference: "/glossary#cvr",
  },
];

/* ================================================================== *
 * Level 2 — Optimisation (32 questions)
 * ================================================================== */

const intermediateQuestions: QuizQuestion[] = [
  {
    id: "int-01",
    level: "intermediate",
    topic: "Search terms",
    question:
      "Your search term report shows a term with 20 clicks, 0 orders and $40 of spend. What do you do?",
    choices: [
      "Raise the bid to gather more data",
      "Add it as a negative exact keyword — 20 clicks with no order at this spend is enough evidence",
      "Leave it for another 30 days",
      "Move it into a broad match campaign",
    ],
    answerIndex: 1,
    explanation:
      "Twenty clicks with zero orders is roughly twice the clicks a 10% converting product needs for one sale, so the term has failed a fair test. Negate it at exact match in that campaign and move the $40 to a term that has already proven it converts.",
    reference: "/sops/weekly-search-term-analysis",
  },
  {
    id: "int-02",
    level: "intermediate",
    topic: "Search terms",
    question:
      "An auto campaign shows a search term with 5 clicks, 3 orders and a 60% conversion rate. What is your next move?",
    choices: [
      "Add it as a negative in the manual campaign so the auto keeps it",
      "Raise the auto campaign's budget and leave the term where it is",
      "Harvest it: add it as an exact match keyword in a manual campaign, then negate it in the auto campaign",
      "Pause the auto campaign now that it has done its job",
    ],
    answerIndex: 2,
    explanation:
      "That is exactly what auto campaigns are for. Move the winner into a manual exact ad group where you control the bid, then negative-exact it in the auto campaign so the two stop bidding against each other on the same search term.",
    reference: "/workflows/search-term-harvesting",
  },
  {
    id: "int-03",
    level: "intermediate",
    topic: "Search terms",
    question:
      "In the four-quadrant search term framework, what do you do with a term showing HIGH clicks and LOW orders?",
    choices: [
      "Investigate the listing, then tighten or negate the term — you are paying for traffic that does not buy",
      "Raise the bid to capture more of that traffic",
      "Harvest it into an exact match campaign",
      "Leave it; it is building brand awareness",
    ],
    answerIndex: 0,
    explanation:
      "High clicks and low orders is the expensive quadrant. Either the term is genuinely irrelevant, in which case negate it, or it is relevant and the listing is losing the sale, in which case fix price, images or reviews before you spend another dollar on it.",
    reference: "/sops/weekly-search-term-analysis",
  },
  {
    id: "int-04",
    level: "intermediate",
    topic: "Search terms",
    question:
      "Same framework: a term with LOW clicks but a HIGH order rate on the clicks it does get. What is the move?",
    choices: [
      "Negate it — the volume is too small to matter",
      "Raise the bid to buy more of that traffic and gather more data",
      "Leave the bid alone and check again in 90 days",
      "Move it to Sponsored Display",
    ],
    answerIndex: 1,
    explanation:
      "Low clicks with a high order rate usually means you are under-bidding on something that works. Raise the bid, get it into a better placement, and see whether the conversion rate survives more volume — that is how a small winner becomes a core keyword.",
    reference: "/sops/weekly-search-term-analysis",
  },
  {
    id: "int-05",
    level: "intermediate",
    topic: "Search terms",
    question: "How often should you review search term reports?",
    choices: [
      "Once a quarter",
      "Once a month",
      "Weekly for active campaigns, and daily during a launch or a high-spend period",
      "Only when ACoS moves",
    ],
    answerIndex: 2,
    explanation:
      "Weekly is the working cadence: enough data to be meaningful, quick enough that waste does not compound. During a launch or Q4 the money moves faster than the weekly rhythm can catch, so you check daily until spend settles.",
    reference: "/sops/weekly-search-term-analysis",
  },
  {
    id: "int-06",
    level: "intermediate",
    topic: "Search terms",
    question: "What is keyword harvesting?",
    choices: [
      "Buying keyword lists from a research tool",
      "Copying a competitor's keywords out of a reverse-ASIN tool",
      "Adding every search term from the report as a keyword",
      "Pulling converting search terms out of auto and broad campaigns and adding them as exact keywords in a manual campaign",
    ],
    answerIndex: 3,
    explanation:
      "Harvesting is the engine of account growth: discovery campaigns find real converting language, and you promote those terms into controlled exact-match ad groups. It only works if you also negate the harvested term in the source campaign.",
    reference: "/workflows/search-term-harvesting",
  },
  {
    id: "int-07",
    level: "intermediate",
    topic: "Bidding",
    question:
      "A keyword has a 45% ACoS but drives 30% of the account's total sales. Should you pause it?",
    choices: [
      "Yes — 45% ACoS is too high to justify",
      "No — cut the bid gradually, 10-15% at a time, and watch position, orders and ACoS together",
      "Yes, but only for two weeks as a test",
      "No — move it to broad match to lower the CPC",
    ],
    answerIndex: 1,
    explanation:
      "Pausing a keyword that carries 30% of sales trades an ACoS problem for a revenue crisis. Step the bid down 10-15% at a time and let each change settle for several days: you usually recover most of the volume at a materially better ACoS.",
    reference: "/sops/bid-optimization",
  },
  {
    id: "int-08",
    level: "intermediate",
    topic: "Bidding",
    question: "What does dynamic bidding do on Amazon?",
    choices: [
      "Down only lowers your bid when a sale is less likely; up and down also raises it by up to 100% when a sale is more likely; fixed uses your bid as it is",
      "It resets your bid to Amazon's suggested bid every morning",
      "It changes your daily budget based on the hour of day",
      "It moves budget between the campaigns in a portfolio",
    ],
    answerIndex: 0,
    explanation:
      "Dynamic bidding is Amazon adjusting your bid in real time on its own conversion prediction. Down only can only reduce; up and down can raise by up to 100% (and by up to 50% for other placements); fixed switches the adjustment off entirely.",
    reference: "/glossary#dynamic-bids-up-and-down",
  },
  {
    id: "int-09",
    level: "intermediate",
    topic: "Bidding",
    question: "When should you use 'down only' rather than 'up and down' bidding?",
    choices: [
      "Always use up and down; it wins more auctions",
      "Always use down only; it is cheaper",
      "Down only while a campaign is new and unproven; up and down once it has real conversion history and the margin to absorb higher CPCs",
      "Down only for exact match and up and down for broad match",
    ],
    answerIndex: 2,
    explanation:
      "Up and down needs conversion data to be smart with; without it Amazon is doubling bids on a guess. Start conservative on a new campaign, then switch the proven ones to up and down where the extra CPC buys top-of-search placements that actually convert.",
    reference: "/sops/bid-optimization",
  },
  {
    id: "int-10",
    level: "intermediate",
    topic: "Metrics",
    question:
      "CPC has risen 20% over the past month while ACoS stayed flat. What does that tell you?",
    choices: [
      "Your ads got worse and you should cut bids",
      "Competition pushed CPCs up, but conversion rate or order value improved enough to hold ACoS steady",
      "Amazon changed your attribution window",
      "Your budget was set too low",
    ],
    answerIndex: 1,
    explanation:
      "ACoS is CPC divided by revenue per click, so a flat ACoS with a higher CPC means revenue per click rose by the same proportion — better conversion, a higher price, or a better placement mix. Keep watching: if CPC climbs again without a matching lift, ACoS will move.",
    reference: "/cheat-sheets/ppc-metrics",
  },
  {
    id: "int-11",
    level: "intermediate",
    topic: "Budgets",
    question: "What is the 70/20/10 budget allocation rule?",
    choices: [
      "70% to proven winners, 20% to testing and expansion, 10% to experiments",
      "70% to auto campaigns, 20% to manual, 10% to Sponsored Brands",
      "70% exact match, 20% phrase, 10% broad",
      "70% of the budget spent before noon, 20% in the afternoon, 10% overnight",
    ],
    answerIndex: 0,
    explanation:
      "Seventy per cent goes to exact-match, high-converting keywords that already pay; twenty per cent funds phrase and broad discovery; ten per cent buys experiments — new ASINs, new ad types, new audiences. It keeps an account profitable today without going blind to tomorrow.",
    reference: "/cheat-sheets/campaign-structure",
  },
  {
    id: "int-12",
    level: "intermediate",
    topic: "Budgets",
    question: "A campaign hits its daily budget by 2 p.m. every day. What should you do?",
    choices: [
      "Nothing — running out of budget means the campaign is working",
      "Immediately double the budget",
      "Pause the campaign until the next day",
      "Decide from ACoS: raise the budget if the campaign is profitable, otherwise lower bids to stretch the day, or use dayparting if certain hours convert better",
    ],
    answerIndex: 3,
    explanation:
      "Running out of budget is only good news if the spend was profitable. Profitable and capped means you are leaving money on the table, so raise the budget. Unprofitable and capped means you are buying expensive clicks faster, so lower bids instead.",
    reference: "/glossary#budget-pacing",
  },
  {
    id: "int-13",
    level: "intermediate",
    topic: "Profitability",
    question:
      "A product sells for $30 and costs $18 all-in to make, ship and fulfil. What is the break-even ACoS?",
    choices: ["20%", "40%", "60%", "167%"],
    answerIndex: 1,
    explanation:
      "Margin = 30 - 18 = $12, so margin percentage = 12 / 30 = 40%. Break-even ACoS equals the contribution margin: at 40% ACoS every advertising dollar is exactly repaid, above it you lose money on the ad-attributed sale, below it you profit.",
    reference: "/glossary#break-even-acos",
  },
  {
    id: "int-14",
    level: "intermediate",
    topic: "Budgets",
    question:
      "A campaign runs at 15% ACoS with strong sales and the client wants to scale. What is your approach?",
    choices: [
      "Triple the budget today and watch it closely",
      "Switch everything to broad match to find more volume",
      "Raise the budget 20-30% every 3-5 days, harvest new keywords from the search term report, and expand into phrase and broad for discovery",
      "Increase every bid by 50%",
    ],
    answerIndex: 2,
    explanation:
      "Scale in steps the account can absorb. Big jumps push you into worse placements and less qualified traffic all at once, and you cannot tell which change caused the ACoS drift. Twenty to thirty per cent every few days keeps cause and effect readable.",
    reference: "/sops/bid-optimization",
  },
  {
    id: "int-15",
    level: "intermediate",
    topic: "Placements",
    question:
      "Base bid $1.00, top-of-search placement adjustment +50%, strategy 'dynamic bids - down only'. What is the highest Amazon will bid for a top-of-search click?",
    choices: ["$1.00", "$1.50", "$2.00", "$3.00"],
    answerIndex: 1,
    explanation:
      "The placement adjustment is applied first: 1.00 x 1.5 = $1.50. Down only can then reduce that in real time but never raise it, so $1.50 is the ceiling. Get this order wrong and you will badly under-estimate what a placement modifier costs you.",
    reference: "/glossary#placement-adjustment",
  },
  {
    id: "int-16",
    level: "intermediate",
    topic: "Placements",
    question:
      "Your placement report shows top of search converting at 14% with a 28% ACoS, and product pages converting at 4% with a 71% ACoS. What is the cleanest fix?",
    choices: [
      "Add a top-of-search bid adjustment and drop the product-pages adjustment to zero, or split product-page targeting into its own campaign with its own bid",
      "Raise the base bid so the product-page placement performs better",
      "Pause the campaign",
      "Move the whole campaign to Sponsored Display",
    ],
    answerIndex: 0,
    explanation:
      "One base bid cannot serve two placements with a threefold gap in conversion rate. Bias the bid toward the placement that converts, and if you still want detail-page traffic, give it a separate campaign so its economics never drag on your search bid.",
    reference: "/glossary#placement-report",
  },
  {
    id: "int-17",
    level: "intermediate",
    topic: "Negatives",
    question:
      "An auto campaign keeps serving on a competitor ASIN that takes clicks and produces no orders. What blocks it?",
    choices: [
      "A negative exact keyword for the competitor's brand name",
      "A negative phrase keyword containing the ASIN",
      "A negative product target (negative ASIN) on the ad group",
      "Nothing — you cannot block an individual ASIN",
    ],
    answerIndex: 2,
    explanation:
      "Keyword negatives cannot stop a product placement, because no keyword was matched. Negative product targeting is the right instrument: add the ASIN as a negative target on the ad group, or negate the whole brand if several of its ASINs are wasting spend.",
    reference: "/glossary#negative-product-targeting",
  },
  {
    id: "int-18",
    level: "intermediate",
    topic: "Negatives",
    question: "What is the main risk of negating aggressively across every campaign?",
    choices: [
      "Amazon penalises accounts that carry too many negatives",
      "You block terms that would convert for other products, and you strangle the discovery that feeds harvesting",
      "Negatives slow campaign delivery down",
      "You lose your search term report history",
    ],
    answerIndex: 1,
    explanation:
      "A broad negative phrase is a blunt instrument: 'for kids' negated account-wide also kills 'gift for kids birthday' on the ASIN where it converts. Negate at the narrowest level that solves the problem, and keep account-wide negatives for terms that are wrong for everything you sell.",
    reference: "/cheat-sheets/negative-keywords",
  },
  {
    id: "int-19",
    level: "intermediate",
    topic: "Bidding",
    question:
      "Average order value $40, conversion rate 10%, target ACoS 25%. What is the highest CPC you can pay and still hit target?",
    choices: ["$0.40", "$0.65", "$1.00", "$4.00"],
    answerIndex: 2,
    explanation:
      "Revenue per click = 40 x 0.10 = $4.00. Max CPC = revenue per click x target ACoS = 4.00 x 0.25 = $1.00. This one formula sets your opening bid on every new keyword, so it is worth being able to do it in your head.",
    reference: "/glossary#max-cpc",
  },
  {
    id: "int-20",
    level: "intermediate",
    topic: "Bidding",
    question:
      "A $25 product converts at 8%. The client's target ACoS is 30%. What is your starting maximum bid?",
    choices: ["$0.60", "$0.75", "$2.00", "$7.50"],
    answerIndex: 0,
    explanation:
      "Revenue per click = 25 x 0.08 = $2.00, and 2.00 x 0.30 = $0.60. The $2.00 option is revenue per click before you apply the ACoS target — bidding it would put you at a 100% ACoS, which is the classic new-specialist mistake.",
    reference: "/glossary#max-cpc",
  },
  {
    id: "int-21",
    level: "intermediate",
    topic: "Profitability",
    question:
      "A $40 product carries a 35% contribution margin and converts at 12%. What is the break-even CPC?",
    choices: ["$0.48", "$1.40", "$1.68", "$4.80"],
    answerIndex: 2,
    explanation:
      "Profit per unit = 40 x 0.35 = $14.00. Profit per click = 14.00 x 0.12 = $1.68. Pay more than $1.68 a click and the ad-attributed sales lose money; the $4.80 option is revenue per click, which ignores cost of goods entirely.",
    reference: "/glossary#break-even-acos",
  },
  {
    id: "int-22",
    level: "intermediate",
    topic: "Bidding",
    question:
      "A category converts at roughly 10%. How many clicks should a new keyword get before you conclude it does not convert?",
    choices: [
      "Three to five clicks",
      "About 20-30 clicks — two to three times the ten clicks one order would normally take",
      "At least 100 clicks, always",
      "Clicks do not matter; judge it on impressions",
    ],
    answerIndex: 1,
    explanation:
      "At a 10% conversion rate you expect one order every ten clicks, so ten clicks with no sale proves nothing. Give it two to three times that before you negate, and scale the threshold with the category: a 5% converting category needs 40-60 clicks.",
    reference: "/sops/weekly-search-term-analysis",
  },
  {
    id: "int-23",
    level: "intermediate",
    topic: "Reporting",
    question:
      "Which combination of search term report columns tells you a term is wasting money right now?",
    choices: [
      "Impressions and CTR",
      "Keyword and match type",
      "Orders and ad sales",
      "Clicks, spend and orders together",
    ],
    answerIndex: 3,
    explanation:
      "Waste is spend with clicks and no orders. Impressions and CTR describe attention, not money; orders alone hide what they cost. Sort the report by spend descending, then scan the orders column — the wasted budget is always in the first twenty rows.",
    reference: "/cheat-sheets/search-term-report",
  },
  {
    id: "int-24",
    level: "intermediate",
    topic: "Reporting",
    question: "Why do experienced specialists work in bulk operations files?",
    choices: [
      "They unlock bid types the console does not offer",
      "They let you audit and change hundreds of bids, budgets, keywords and negatives in one upload instead of clicking through each one",
      "They are the only way to get the search term report",
      "Amazon discounts CPCs on bulk-managed campaigns",
    ],
    answerIndex: 1,
    explanation:
      "Bulk files are free, they show the whole account in one sheet, and they turn a two-hour clicking session into a ten-minute upload. They are also the fastest way to audit an inherited account, because every campaign, ad group, keyword and bid arrives in one place.",
    reference: "/glossary#bulk-operations",
  },
  {
    id: "int-25",
    level: "intermediate",
    topic: "Structure",
    question:
      "Why does a naming convention such as 'SP | ASIN123 | Exact | Core' matter?",
    choices: [
      "It makes filtering, reporting and bulk edits possible at a glance, and it survives handover to the next specialist",
      "Amazon gives well-named campaigns better placement",
      "It reduces CPC",
      "The advertising console requires a structured name",
    ],
    answerIndex: 0,
    explanation:
      "Naming is the account's index. With a convention you can filter a bulk sheet to every exact-match campaign in seconds; without one, a 60-campaign account is unreadable to anyone but the person who built it — including you, six months later.",
    reference: "/glossary#naming-convention",
  },
  {
    id: "int-26",
    level: "intermediate",
    topic: "Structure",
    question:
      "You harvested 'stainless steel dog bowl' into a manual exact campaign. Why negate it in the auto campaign that found it?",
    choices: [
      "To stop the two campaigns bidding against each other on the same search term, which inflates your CPC and splits the data",
      "Because Amazon charges twice when two of your campaigns match one term",
      "To free the auto campaign's budget for Sponsored Display",
      "Because auto campaigns are not allowed to serve on harvested terms",
    ],
    answerIndex: 0,
    explanation:
      "Only one of your ads can win a given auction, but both campaigns entering it pushes your own price up and splits performance history across two places. Negate the harvested term in the source campaign and the manual keyword gets clean data and a stable bid.",
    reference: "/workflows/search-term-harvesting",
  },
  {
    id: "int-27",
    level: "intermediate",
    topic: "Structure",
    question: "Where is the daily budget set in Sponsored Products?",
    choices: [
      "On each keyword",
      "On each ad group",
      "On the campaign, with optional portfolio budget caps above it",
      "On the account as a whole",
    ],
    answerIndex: 2,
    explanation:
      "Budget lives on the campaign, which is exactly why campaign structure is a budgeting decision: anything you want to fund or starve independently needs its own campaign. Portfolios add an optional cap across a group of campaigns.",
    reference: "/cheat-sheets/campaign-structure",
  },
  {
    id: "int-28",
    level: "intermediate",
    topic: "Budgets",
    question: "A campaign is set to $50 a day. Over a 30-day month it spent $600. What does that tell you?",
    choices: [
      "It is over budget and needs a cap",
      "It used 40% of its available budget — bids or targeting are limiting delivery, not budget",
      "It spent exactly on plan",
      "It was out of budget on most days",
    ],
    answerIndex: 1,
    explanation:
      "Available budget was 50 x 30 = $1,500 and it spent $600, so utilisation is 40%. Raising the budget would change nothing: the constraint is bids too low to win auctions, or targeting too narrow to find volume.",
    reference: "/glossary#budget-pacing",
  },
  {
    id: "int-29",
    level: "intermediate",
    topic: "Ad types",
    question:
      "A brand-registered client has $1,000 a month and three hero ASINs. Where does Sponsored Brands usually earn its place?",
    choices: [
      "Nowhere — SB never beats SP on efficiency",
      "On brand-defence terms and high-intent category head terms, where the headline and multi-product unit lift click share and new-to-brand orders",
      "On long-tail terms with under 100 monthly searches",
      "Only during Prime Day and Q4",
    ],
    answerIndex: 1,
    explanation:
      "Sponsored Brands buys real estate rather than a single ASIN slot, so it pays where the shopper is choosing between brands: your own brand terms and the big category head terms. On long-tail keywords the same money almost always works harder in Sponsored Products.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "int-30",
    level: "intermediate",
    topic: "Targeting",
    question:
      "When does targeting a competitor's ASIN with Sponsored Products product targeting actually work?",
    choices: [
      "Always — competitor detail pages are the cheapest traffic on Amazon",
      "Only when your price is higher and your review count is lower",
      "When you beat that ASIN on at least one visible axis — price, review count, rating or an obvious feature — so the shopper has a reason to switch",
      "Only in Sponsored Display, never in Sponsored Products",
    ],
    answerIndex: 2,
    explanation:
      "You are asking a shopper who is already looking at another product to change their mind. If your price, rating, review count and images are all weaker, you are buying clicks you cannot convert. Pick targets you genuinely out-compete on something the shopper can see in the ad.",
    reference: "/glossary#product-targeting",
  },
  {
    id: "int-31",
    level: "intermediate",
    topic: "Bidding",
    question:
      "A campaign burns its budget by noon and the account's evening hours convert best. What is the intermediate-level fix?",
    choices: [
      "Use dayparting — budget rules or a scheduling tool — to weight spend toward the hours that convert",
      "Raise bids across the board",
      "Switch to fixed bids",
      "Move the campaign to Sponsored Display",
    ],
    answerIndex: 0,
    explanation:
      "If the budget is gone before the best hours arrive, you are systematically buying your worst traffic. Dayparting shifts spend into the converting window; if your tooling cannot schedule, lowering bids to stretch coverage across the day is the manual version.",
    reference: "/glossary#dayparting",
  },
  {
    id: "int-32",
    level: "intermediate",
    topic: "Metrics",
    question: "What does top-of-search impression share tell you that ACoS does not?",
    choices: [
      "How profitable your top-of-search clicks are",
      "How much of the available first-page top-of-search inventory you are winning — your headroom to grow without adding new keywords",
      "Your organic rank for that keyword",
      "The share of your budget that went to top of search",
    ],
    answerIndex: 1,
    explanation:
      "ACoS tells you whether the traffic you bought paid. Impression share tells you how much traffic you did not buy. A keyword at 12% impression share and a comfortable ACoS is the clearest scaling signal in the account.",
    reference: "/glossary#top-of-search-is",
  },
];

/* ================================================================== *
 * Level 3 — Strategy (26 questions)
 * ================================================================== */

const advancedQuestions: QuizQuestion[] = [
  {
    id: "adv-01",
    level: "advanced",
    topic: "Structure",
    question:
      "Explain the difference between single-keyword and multi-keyword campaign structures.",
    choices: [
      "Single-keyword campaigns are always better",
      "Multi-keyword campaigns are always better because they gather data faster",
      "Single keyword or target per ad group gives maximum bid control and clean per-term data; grouped ad groups are cheaper to manage but blur attribution. Use single for proven winners and grouped for discovery",
      "The two structures perform identically; the choice is cosmetic",
    ],
    answerIndex: 2,
    explanation:
      "One keyword per ad group means one bid, one budget line and one clean performance history — worth the management overhead for the terms that carry the account. Grouped ad groups are the right home for the long tail, where per-term control is not worth the admin.",
    reference: "/workflows/campaign-structure-decision-tree",
  },
  {
    id: "adv-02",
    level: "advanced",
    topic: "Structure",
    question: "What is a portfolio in Amazon Advertising?",
    choices: [
      "A saved bidding strategy applied to several campaigns",
      "An organisational container that groups campaigns for reporting, with optional budget caps and date ranges",
      "A shared negative keyword list",
      "A group of ASINs advertised together in one ad group",
    ],
    answerIndex: 1,
    explanation:
      "Portfolios group campaigns by brand, category, client or objective so you can report and cap spend at that level. The optional portfolio budget cap is genuinely useful for seasonal windows: set an end date and a total, and the whole group stops when it is reached.",
    reference: "/glossary#portfolio",
  },
  {
    id: "adv-03",
    level: "advanced",
    topic: "Structure",
    question:
      "You inherit an account with 50 auto campaigns and zero manual campaigns. What is your restructuring approach?",
    choices: [
      "Pause all 50 and rebuild the account from scratch this week",
      "Convert each auto campaign into a manual campaign by copying every search term across",
      "Leave the autos alone and build manual campaigns on top of them",
      "Audit at least two weeks of data, harvest proven converters into exact manuals, build phrase and broad for discovery, negate harvested terms in the autos, then archive the weakest autos after a 2-4 week transition",
    ],
    answerIndex: 3,
    explanation:
      "The autos are the only performance history the account has, so you mine them before you touch them. Move winners into manual campaigns, negate those terms in the source autos to stop cannibalisation, and transition over weeks so you never take rank and velocity down in one step.",
    reference: "/sops/campaign-restructuring",
  },
  {
    id: "adv-04",
    level: "advanced",
    topic: "Structure",
    question: "What is campaign cannibalisation?",
    choices: [
      "Two or more of your own campaigns competing for the same search term, inflating your CPC and splitting the conversion data",
      "Advertising eating into organic sales you would have won anyway",
      "A competitor bidding on your brand terms",
      "One ASIN taking sales from a variation of itself",
    ],
    answerIndex: 0,
    explanation:
      "Only one of your ads can win an auction, so overlapping campaigns do not double your reach — they raise your own price and scatter your data across two histories. Negative keywords between discovery and exact campaigns are the standard fix.",
    reference: "/glossary#keyword-cannibalisation",
  },
  {
    id: "adv-05",
    level: "advanced",
    topic: "Metrics",
    question: "What is TACoS and why does it matter more than ACoS?",
    choices: [
      "Target ACoS — the ACoS number you are aiming at",
      "Trailing ACoS over the last 30 days",
      "Total ACoS: ad spend divided by TOTAL sales, ad plus organic. It measures the ad programme's weight on the whole business rather than only on ad-attributed revenue",
      "Total ad clicks divided by total sales",
    ],
    answerIndex: 2,
    explanation:
      "ACoS grades the ads in isolation, which lets an account look healthy while the business shrinks. TACoS = Ad Spend / Total Sales exposes the relationship between advertising and everything you sell, so a falling TACoS with rising revenue is the signal that organic is compounding.",
    reference: "/glossary#tacos",
  },
  {
    id: "adv-06",
    level: "advanced",
    topic: "Metrics",
    question: "ACoS is falling but TACoS is rising. What does that mean?",
    choices: [
      "The account is improving on both measures",
      "The ads are getting more efficient while total sales fall — usually organic is sliding because ad-driven velocity was pulled back too hard",
      "Organic sales are growing faster than ad sales",
      "Your attribution window changed",
    ],
    answerIndex: 1,
    explanation:
      "Falling ACoS with rising TACoS means the ad spend is buying its own sales more cheaply, but it now represents a bigger share of a shrinking total. Nine times out of ten the account cut spend on terms that were feeding organic rank, and the organic sales went with them.",
    reference: "/glossary#tacos",
  },
  {
    id: "adv-07",
    level: "advanced",
    topic: "Metrics",
    question: "What is the halo effect in Amazon PPC?",
    choices: [
      "Sponsored Brands lifting Sponsored Products click-through rate",
      "Advertising one ASIN lifting sales of its variations",
      "A temporary CPC drop after Prime Day",
      "Ad-driven sales velocity improving organic rank, which brings organic sales the ad report never gets credit for",
    ],
    answerIndex: 3,
    explanation:
      "Amazon ranks on sales velocity and relevance, and paid sales count toward both. Ads that push velocity lift organic position, which produces sales at zero ad cost — visible in TACoS and total revenue, invisible in ACoS.",
    reference: "/glossary#tacos",
  },
  {
    id: "adv-08",
    level: "advanced",
    topic: "Profitability",
    question: "How do you assess the true profitability of a campaign including halo effect?",
    choices: [
      "Combine ad-attributed profit with the organic lift the ad velocity created, the ranking value gained, and the new-to-brand and repeat-purchase value — then judge against TACoS rather than ACoS",
      "Take ad revenue minus ad spend and stop there",
      "Divide ad revenue by total revenue",
      "Request the halo attribution report from Amazon Advertising",
    ],
    answerIndex: 0,
    explanation:
      "Four inputs: direct ad-attributed revenue, estimated organic lift from higher velocity, the value of holding a better organic position, and brand or remarketing value including new-to-brand orders. There is no Amazon report that does this for you — you build it from total sales and TACoS trends.",
    reference: "/glossary#new-to-brand",
  },
  {
    id: "adv-09",
    level: "advanced",
    topic: "Negatives",
    question: "What is the difference between negative exact and negative phrase?",
    choices: [
      "Negative exact blocks any search containing the words; negative phrase blocks only the identical search",
      "Negative exact blocks only that exact search term and its close variants; negative phrase blocks any search containing that phrase in order",
      "They are identical; only the reporting label differs",
      "Negative phrase only works in automatic campaigns",
    ],
    answerIndex: 1,
    explanation:
      "Negative exact is a scalpel for one bad search term. Negative phrase is a net that catches every search containing the phrase, so 'for dogs' as a negative phrase also blocks 'raincoat for dogs xl'. Use exact by default and phrase only when you mean to block a whole family.",
    reference: "/cheat-sheets/negative-keywords",
  },
  {
    id: "adv-10",
    level: "advanced",
    topic: "Negatives",
    question: "When do you negate at campaign level versus across the whole account?",
    choices: [
      "Always at account level; it is faster",
      "Always at campaign level; account-wide negatives are not supported",
      "Campaign or ad group level when the term is only wrong for that product; a shared negative keyword list applied across campaigns when the term is wrong for everything you sell",
      "Ad group level for exact negatives and campaign level for phrase negatives",
    ],
    answerIndex: 2,
    explanation:
      "Amazon has no single account-level negative switch — the equivalent is a shared negative targeting list applied to many campaigns. Reserve it for universal disqualifiers such as 'free', 'used' or a competitor brand you never want to appear against; keep product-specific blocks local.",
    reference: "/cheat-sheets/negative-keywords",
  },
  {
    id: "adv-11",
    level: "advanced",
    topic: "Metrics",
    question:
      "Ad spend $3,000, ad sales $12,000, total sales (ad plus organic) $40,000. What is TACoS?",
    choices: ["25%", "7.5%", "30%", "12.5%"],
    answerIndex: 1,
    explanation:
      "TACoS = 3,000 / 40,000 = 7.5%. ACoS on the same month is 3,000 / 12,000 = 25%, and the gap between the two numbers is the point: ads are 25% of ad-attributed revenue but only 7.5% of the business, so organic is carrying most of the sales.",
    reference: "/glossary#tacos",
  },
  {
    id: "adv-12",
    level: "advanced",
    topic: "Metrics",
    question:
      "Over six months total sales rose 40% and TACoS fell from 12% to 8%. What is the honest read?",
    choices: [
      "The brand is compounding: organic is carrying more of the growth, so each ad dollar now supports more total revenue",
      "The advertising stopped working",
      "The client must have cut prices",
      "ACoS must also have fallen",
    ],
    answerIndex: 0,
    explanation:
      "Rising revenue with falling TACoS is the healthiest pattern on Amazon: the ad programme is buying rank that keeps paying after the click. Note that ACoS could have risen over the same period — the two metrics can move in opposite directions and both be fine.",
    reference: "/glossary#tacos",
  },
  {
    id: "adv-13",
    level: "advanced",
    topic: "Profitability",
    question:
      "Price $34.99, COGS $8.20, FBA fee $5.45, referral fee 15%. What is the contribution margin per unit and the break-even ACoS?",
    choices: [
      "$21.34 and 61%",
      "$13.09 and 37%",
      "$16.09 and 46%",
      "$26.79 and 77%",
    ],
    answerIndex: 2,
    explanation:
      "Referral fee = 34.99 x 0.15 = $5.25. Contribution = 34.99 - 8.20 - 5.45 - 5.25 = $16.09, and 16.09 / 34.99 = 46%. That 46% is the break-even ACoS: the number the client's 'keep it under 20%' target has to be argued against.",
    reference: "/glossary#contribution-margin",
  },
  {
    id: "adv-14",
    level: "advanced",
    topic: "Bidding",
    question:
      "You raise a keyword's bid. Spend goes from $500 to $700 and ad sales from $2,000 to $2,400. Blended ACoS is still about 29%. Do you keep the increase?",
    choices: [
      "Yes — ACoS is comfortably under 30%",
      "No, unless the incremental ACoS clears your bar: the extra $200 bought $400 of sales, which is a 50% marginal ACoS",
      "Yes — more sales is always better",
      "It depends only on whether impression share improved",
    ],
    answerIndex: 1,
    explanation:
      "Blended numbers hide the decision. The average moved to 700 / 2,400 = 29%, but the money you actually chose to spend performed at 200 / 400 = 50%. Judge every increase on its marginal return, not on the average it disappears into.",
    reference: "/sops/bid-optimization",
  },
  {
    id: "adv-15",
    level: "advanced",
    topic: "Placements",
    question:
      "Base bid $1.00, top-of-search adjustment +100%, strategy 'dynamic bids - up and down'. What is the theoretical maximum bid for a top-of-search click?",
    choices: ["$1.00", "$2.00", "$3.00", "$4.00"],
    answerIndex: 3,
    explanation:
      "Placement adjustment first: 1.00 x 2 = $2.00. Then up-and-down can raise that by up to a further 100%: 2.00 x 2 = $4.00. Stacking a big placement modifier on up-and-down bidding is how accounts quietly end up paying four times the bid the specialist thinks they set.",
    reference: "/glossary#placement-adjustment",
  },
  {
    id: "adv-16",
    level: "advanced",
    topic: "Budgets",
    question:
      "A client's category spikes for two weeks each quarter. What is the cleanest way to lift spend without touching every campaign by hand?",
    choices: [
      "Schedule a rule-based budget increase, or a portfolio budget with an end date, for the window and let it revert automatically",
      "Raise every campaign budget manually and remember to lower them afterwards",
      "Switch all campaigns to up-and-down bidding for the fortnight",
      "Turn on additional auto campaigns for the period",
    ],
    answerIndex: 0,
    explanation:
      "Anything that depends on you remembering to undo it will eventually not get undone. Budget rules and dated portfolio budgets make the reversion automatic, which matters most in exactly the weeks you are busiest.",
    reference: "/glossary#budget-rule",
  },
  {
    id: "adv-17",
    level: "advanced",
    topic: "Structure",
    question: "How should a brand-defence campaign be structured?",
    choices: [
      "Broad match on the brand name inside the main generic campaign",
      "One ad group holding brand terms and competitor terms together",
      "Its own campaign, exact match on brand and brand-plus-product terms, tight negatives, and bids high enough to hold position one",
      "Sponsored Display only, targeting your own ASINs",
    ],
    answerIndex: 2,
    explanation:
      "Brand terms convert several times better than generics, so mixing them into a generic campaign flatters that campaign's numbers and hides what your real acquisition cost is. Isolate them, keep them exact, and treat the bid as the price of not letting a competitor sit above you on your own name.",
    reference: "/workflows/campaign-structure-decision-tree",
  },
  {
    id: "adv-18",
    level: "advanced",
    topic: "Launch",
    question:
      "A brand-new ASIN with three reviews is launching. What structure gets it to data fastest without wasting the budget?",
    choices: [
      "One broad match campaign with a high bid on every keyword you can find",
      "An auto campaign plus a small exact-match campaign on 5-10 researched primary keywords, both funded enough to actually get clicks, with the auto feeding the manual",
      "Sponsored Brands only, to build awareness first",
      "Wait until the listing has 15 reviews before advertising at all",
    ],
    answerIndex: 1,
    explanation:
      "You need two things at launch: discovery (the auto campaign, which reads your listing and finds language you did not think of) and a controlled bet on the keywords you already believe in. Under-funding either one just produces two campaigns with no statistical power.",
    reference: "/sops/campaign-launch",
  },
  {
    id: "adv-19",
    level: "advanced",
    topic: "Launch",
    question: "Why do launch campaigns accept an ACoS well above break-even in the first weeks?",
    choices: [
      "Ad-driven sales velocity builds organic rank and review volume, so the early loss buys a cheaper cost per sale later",
      "Amazon rewards high spend with lower CPCs",
      "Break-even ACoS does not apply to new products",
      "There is no other way to earn reviews",
    ],
    answerIndex: 0,
    explanation:
      "Launch spend is an investment in rank, not a purchase of profitable sales. It only works if it is deliberate and time-boxed: agree the window, the total, and the ACoS you will step down to, in writing, before the first dollar goes out.",
    reference: "/sops/campaign-launch",
  },
  {
    id: "adv-20",
    level: "advanced",
    topic: "Search terms",
    question: "How do you confirm two campaigns are cannibalising the same search term?",
    choices: [
      "Compare their daily budgets",
      "Check the account's overall impression share",
      "Filter the search term report for that term and check whether it appears with spend under more than one campaign in the same period",
      "Check whether both campaigns use the same bidding strategy",
    ],
    answerIndex: 2,
    explanation:
      "The search term report carries the campaign and ad group name on every row, so filtering by the term shows you exactly who is bidding on it. If two campaigns both show clicks on it in the same week, add a negative in the one that should not have it.",
    reference: "/cheat-sheets/search-term-report",
  },
  {
    id: "adv-21",
    level: "advanced",
    topic: "Ad types",
    question:
      "Which Sponsored Display audience is usually the first one worth funding for a mid-size brand?",
    choices: [
      "Purchase remarketing on your own ASINs",
      "Views remarketing — shoppers who viewed your detail page or a similar product and did not buy",
      "Broad interest audiences across the whole category",
      "Amazon audiences from an adjacent category",
    ],
    answerIndex: 1,
    explanation:
      "Views remarketing addresses people who already showed intent on your page, so it is the smallest and warmest audience in the set. Purchase remarketing makes sense for consumables and refills; broad interest audiences are a prospecting spend that needs budget you can afford to lose.",
    reference: "/cheat-sheets/ad-types",
  },
  {
    id: "adv-22",
    level: "advanced",
    topic: "Structure",
    question:
      "A parent ASIN has eight colour variations and only two of them sell. How should the ads be structured?",
    choices: [
      "Advertise the parent only and let Amazon choose the child",
      "Advertise all eight equally so the catalogue gets fair coverage",
      "Fund the two proven children in their own campaigns, keep the rest in one small discovery campaign, and let the shared review count carry the listing",
      "Pause all ads until the slow colours start selling organically",
    ],
    answerIndex: 2,
    explanation:
      "Reviews and sales history sit at the parent level, so the winners' momentum already helps the whole family. Spending equally across eight children just buys clicks on six colours shoppers do not want; concentrate the money and let the discovery campaign tell you if that changes.",
    reference: "/glossary#asin-variation",
  },
  {
    id: "adv-23",
    level: "advanced",
    topic: "Seasonality",
    question: "When does Q4 preparation actually start for an Amazon PPC account?",
    choices: [
      "Late September to early October — structure, keyword research, bid baselines and inventory checks, before CPCs inflate",
      "1 November",
      "Black Friday week",
      "It needs no preparation; you raise bids on the day",
    ],
    answerIndex: 0,
    explanation:
      "By November CPCs are already elevated and every test you run costs more and reads noisier. October is when you build structure, establish baselines you can compare against, confirm stock cover, and decide the ACoS you are willing to tolerate in the peak week.",
    reference: "/workflows/seasonal-preparation",
  },
  {
    id: "adv-24",
    level: "advanced",
    topic: "Metrics",
    question:
      "Sponsored Products reports on a 7-day attribution window by default. What does that mean for a report you pull today?",
    choices: [
      "Only sales from the last seven days are shown",
      "An order counts against the ad if the shopper clicked and then bought within seven days, so the most recent days under-report and fill in later",
      "Clicks older than seven days are removed from the report",
      "The attribution window changes what you are charged per click",
    ],
    answerIndex: 1,
    explanation:
      "Attribution lags. Yesterday's ACoS is always worse than it will look in a week, which is why you never make bid decisions on one or two days of data, and why a Monday report and a Thursday report of the same period disagree.",
    reference: "/glossary#attribution-window",
  },
  {
    id: "adv-25",
    level: "advanced",
    topic: "Reporting",
    question:
      "You need to know which of your products people bought after clicking an ad for a different product. Which report?",
    choices: [
      "Search term report",
      "Placement report",
      "Targeting report",
      "Purchased product report",
    ],
    answerIndex: 3,
    explanation:
      "The purchased product report pairs the advertised ASIN with the ASIN actually bought. It is how you find cross-purchase patterns, spot variations soaking up the credit, and justify advertising a hero product that pulls sales for the rest of the range.",
    reference: "/glossary#purchased-product-report",
  },
  {
    id: "adv-26",
    level: "advanced",
    topic: "Negatives",
    question:
      "An account has 4,000 negative keywords accumulated over two years and impressions are falling. What do you do?",
    choices: [
      "Delete them all and start again",
      "Audit the list: remove negatives added on thin data, strip blanket phrase negatives that block viable long-tail, and keep the ones with real click evidence behind them",
      "Add more negatives to tighten targeting further",
      "Move them to a shared list and leave them as they are",
    ],
    answerIndex: 1,
    explanation:
      "Negative lists rot. Terms negated at four clicks two years ago, or broad phrase negatives added during one bad week, quietly shrink the surface the account can serve on. Audit against the evidence that justified each one, and treat negatives as a list you maintain rather than a list you grow.",
    reference: "/cheat-sheets/negative-keywords",
  },
];

/* ================================================================== *
 * Level 4 — Client management (16 questions)
 * ================================================================== */

const expertQuestions: QuizQuestion[] = [
  {
    id: "exp-01",
    level: "expert",
    topic: "Client comms",
    question:
      "A client says 'my ACoS is 50%, that is terrible — pause everything.' How do you respond?",
    choices: [
      "Pause everything as instructed; the client is paying",
      "Explain that ACoS is not a metric worth watching",
      "Ask three questions first — is 50% above or below break-even, is the account in launch, what is TACoS doing — then bring the total-business numbers and a staged optimisation plan instead of a blackout",
      "Cut every bid by half immediately as a compromise",
    ],
    answerIndex: 2,
    explanation:
      "Fifty per cent is only bad against a margin. Assess break-even ACoS, whether ad velocity is holding organic rank, and whether the account is still in its launch window, then present total business impact. Recommend optimisation with a timeline, not a pause that costs rank you will pay to rebuild.",
    reference: "/sops/monthly-performance-report",
  },
  {
    id: "exp-02",
    level: "expert",
    topic: "Profitability",
    question:
      "A new client has never advertised. The product sells for $25, costs $8, and they want ACoS under 20%. Is that realistic?",
    choices: [
      "Yes, if you only use exact match",
      "No, not yet: break-even ACoS is 68%, and a product with no history needs 40-50% ACoS to build data before it can be optimised toward 20% over three to six months",
      "Yes — 20% is a standard target for any product",
      "No, and it never will be",
    ],
    answerIndex: 1,
    explanation:
      "Margin is $17 on $25, so break-even ACoS is 68% and there is a great deal of room before advertising loses money. Under 20% is achievable eventually but not on day one with no reviews and no conversion data: set the expectation of 40-50% now, stepping down as the data arrives.",
    reference: "/sops/client-onboarding",
  },
  {
    id: "exp-03",
    level: "expert",
    topic: "Client comms",
    question: "How do you handle a client who wants to approve every bid change?",
    choices: [
      "Set a weekly reporting cadence, explain the reasoning behind each change, agree decision thresholds in writing, and show before-and-after evidence until trust replaces approvals",
      "Refuse to explain your changes; you are the specialist",
      "Give the client console access and let them adjust bids themselves",
      "Stop making changes until the client stops asking",
    ],
    answerIndex: 0,
    explanation:
      "Micromanagement is usually unfamiliarity, not distrust. A fixed reporting rhythm, an explained why, and an agreed threshold such as 'I adjust bids when ACoS moves more than 10%' converts approval requests into a standing mandate — and gives you cover when a change does not work.",
    reference: "/templates/client-communication-templates",
  },
  {
    id: "exp-04",
    level: "expert",
    topic: "Client comms",
    question: "A competitor is bidding on your client's brand terms. What is the defence?",
    choices: [
      "Ignore it; brand traffic is loyal",
      "Retaliate by bidding on the competitor's brand terms and nothing else",
      "Ask Amazon to block the competitor from the auction",
      "Run a dedicated brand-defence campaign on exact brand terms, hold position one, add Sponsored Brands for SERP dominance, monitor weekly, and escalate through Brand Registry only if there is genuine trademark misuse",
    ],
    answerIndex: 3,
    explanation:
      "You cannot stop a competitor entering the auction on a generic brand word, so you make it expensive and unrewarding for them. Own position one on your own name, take the top banner slot with Sponsored Brands, and keep the legal route for real trademark infringement rather than ordinary competition.",
    reference: "/workflows/campaign-structure-decision-tree",
  },
  {
    id: "exp-05",
    level: "expert",
    topic: "Client comms",
    question: "How do you explain PPC performance to a non-technical client?",
    choices: [
      "Send the raw bulk file and let the numbers speak for themselves",
      "Use a concrete analogy — rent on a busy street — and tie each metric to a business question: are the right people walking past (targeting), do they come in (CTR), do they buy (CVR), does it pay (ACoS against margin)",
      "Explain second-price auctions and impression share in detail so they understand the mechanics",
      "Avoid metrics entirely and report revenue only",
    ],
    answerIndex: 1,
    explanation:
      "Analogy first, metric second, decision third. PPC is rent on a busy street: targeting decides who walks past, the listing decides who comes in, and margin decides whether the rent was worth paying. Every number you report should attach to one of those three questions.",
    reference: "/templates/client-communication-templates",
  },
  {
    id: "exp-06",
    level: "expert",
    topic: "Client comms",
    question:
      "On 20 November a client tells you to cut the budget 40% because their card is near its limit. What do you do?",
    choices: [
      "Cut every campaign by 40% evenly today",
      "Refuse — Q4 is too important to cut",
      "Ask what the real constraint is and when it lifts, then protect what carries rank: cut discovery and low-margin ASINs first, hold brand defence and top converters, and confirm the plan in writing",
      "Pause everything until December",
    ],
    answerIndex: 2,
    explanation:
      "An even 40% cut takes 40% off your best campaigns too. A cash-flow limit is a constraint to design around, not a strategy: find out how long it lasts, cut the spend with the weakest marginal return, and document the trade-off so the December conversation is about the plan, not the surprise.",
    reference: "/workflows/seasonal-preparation",
  },
  {
    id: "exp-07",
    level: "expert",
    topic: "Reporting",
    question: "What belongs in a monthly PPC report a client will actually read?",
    choices: [
      "Headline numbers against target, what changed and why, what you will do next month, and one honest risk — with the detail tables behind it for anyone who wants them",
      "Every keyword's bid history for the month",
      "A screenshot of the campaign manager dashboard",
      "Only the metrics that improved",
    ],
    answerIndex: 0,
    explanation:
      "A report is a decision document, not a data dump. Four things on page one: where we are against target, what I changed and why, what I will do next, and what worries me. The tables go behind it so the client can verify without being buried.",
    reference: "/sops/monthly-performance-report",
  },
  {
    id: "exp-08",
    level: "expert",
    topic: "Client comms",
    question:
      "A PPC-only client keeps asking you to rewrite listing copy, chase suppressed listings and answer customer messages. How do you handle it?",
    choices: [
      "Do it quietly; it keeps the client happy",
      "Name it: show what the current scope covers, quantify the extra hours, offer either a scoped add-on at a price or a referral — and get the change in writing",
      "Refuse and suggest they hire someone else",
      "Do it for free but complain about it in the monthly report",
    ],
    answerIndex: 1,
    explanation:
      "Unpriced work is the fastest route to resentment on both sides. Make the scope visible, put hours and a number on the extra, and give the client a real choice. Most clients say yes to one of the options; the ones who do not were never going to pay for it.",
    reference: "/career/salary-negotiation",
  },
  {
    id: "exp-09",
    level: "expert",
    topic: "Client comms",
    question: "What has to be agreed during onboarding before you touch a single bid?",
    choices: [
      "Nothing; start optimising immediately and report afterwards",
      "The monthly budget only",
      "The target ACoS only",
      "Margin and break-even ACoS per ASIN, the target ACoS or TACoS, the budget, the launch-versus-harvest posture, the reporting cadence, and who approves spend changes",
    ],
    answerIndex: 3,
    explanation:
      "Without margin you cannot set a target, and without a target every ACoS conversation becomes an argument about opinion. Get the numbers, the posture and the decision rights agreed in writing in week one — it is the single highest-leverage hour of the engagement.",
    reference: "/sops/client-onboarding",
  },
  {
    id: "exp-10",
    level: "expert",
    topic: "Client comms",
    question:
      "You paused the wrong campaign and it stayed dark for three days, costing roughly $1,800 in sales. What do you do?",
    choices: [
      "Tell the client the same day with the number, the cause, the fix already applied, and the control that stops it happening again",
      "Say nothing; the numbers will recover on their own",
      "Mention it in a footnote in the monthly report",
      "Attribute it to an Amazon console glitch",
    ],
    answerIndex: 0,
    explanation:
      "Clients forgive mistakes and do not forgive discovering them. Same-day disclosure with a quantified impact and a control — a change log, a second pair of eyes on bulk uploads, a daily health check — usually ends up strengthening the relationship rather than damaging it.",
    reference: "/sops/escalation-procedures",
  },
  {
    id: "exp-11",
    level: "expert",
    topic: "Troubleshooting",
    question:
      "A hero ASIN goes out of stock mid-month with $180 a day of ad spend on it. What is the correct sequence?",
    choices: [
      "Leave the campaigns running so the rank is not lost",
      "Pause the entire account until stock returns",
      "Reduce that ASIN's campaigns to a small rank-holding level or pause them the same day, tell the client with the restock date, move the freed budget to in-stock ASINs, and plan a staged bid ramp for the relaunch",
      "Switch the campaigns to Sponsored Display in the meantime",
    ],
    answerIndex: 2,
    explanation:
      "Paying for clicks on an unbuyable listing wastes money and damages conversion rate, which is a ranking input. Cut the spend, redeploy it where it can convert, and ramp bids back gradually on restock rather than switching everything on at full price on day one.",
    reference: "/sops/escalation-procedures",
  },
  {
    id: "exp-12",
    level: "expert",
    topic: "Client comms",
    question:
      "You have run an account for 14 months: ACoS fell from 48% to 26% and revenue tripled. How do you raise your rate?",
    choices: [
      "Send the next invoice at the higher amount and see whether anyone notices",
      "Present the record first — the numbers, the hours, the scope that has grown — then name the new rate, the date it takes effect, and what stays the same",
      "Say you will leave unless the rate goes up",
      "Wait for the client to offer an increase",
    ],
    answerIndex: 1,
    explanation:
      "Rate conversations go well when the evidence arrives before the number. Show what the account looked like when you took it, what it looks like now, and how the scope has widened; then make the ask specific and dated, so the client has a decision rather than a negotiation.",
    reference: "/career/salary-negotiation",
  },
  {
    id: "exp-13",
    level: "expert",
    topic: "Reporting",
    question: "November was worse than October on every metric. How do you open the report call?",
    choices: [
      "Lead with the one metric that improved",
      "Blame seasonality and move on quickly",
      "Skip the call and send the file",
      "Lead with the number, name the cause you can evidence, separate what you controlled from what you did not, and bring the corrective plan with dates",
    ],
    answerIndex: 3,
    explanation:
      "Opening with the bad number is what buys you credibility for the explanation that follows. Distinguish controllable causes (a bid change, a negative that was too broad) from uncontrollable ones (a stock-out, a competitor's price drop), and never arrive without the plan.",
    reference: "/sops/monthly-performance-report",
  },
  {
    id: "exp-14",
    level: "expert",
    topic: "Client comms",
    question:
      "You want to test Sponsored Display views remarketing but the client guards the budget carefully. What is the ask?",
    choices: [
      "A ring-fenced test budget, a fixed window, one success metric agreed in advance, and a written stop rule",
      "An open-ended budget increase to see what happens",
      "Move budget quietly out of Sponsored Products",
      "Run the test first and report it if it works",
    ],
    answerIndex: 0,
    explanation:
      "A cautious client is not refusing tests, they are refusing unbounded risk. Bound it: this much money, this many weeks, this metric, and this is the number at which I stop. That framing gets approved far more often than a general request to try something.",
    reference: "/workflows/ab-testing-process",
  },
  {
    id: "exp-15",
    level: "expert",
    topic: "Reporting",
    question: "Why keep a dated change log of every optimisation?",
    choices: [
      "Amazon requires one for account audits",
      "It is the only way to attribute a later performance shift to a specific action, and it answers 'what changed on the 14th?' without guesswork",
      "It replaces the monthly report",
      "It lets you roll changes back automatically",
    ],
    answerIndex: 1,
    explanation:
      "Amazon's own change history is thin and hard to read across campaigns. A dated log — what changed, where, why, expected effect — turns a mysterious ACoS jump into a two-minute lookup, and it is the artefact that protects you when a client asks who did what.",
    reference: "/templates/campaign-audit-checklist",
  },
  {
    id: "exp-16",
    level: "expert",
    topic: "Client comms",
    question: "When is it right to tell a client to stop advertising an ASIN entirely?",
    choices: [
      "Whenever ACoS goes above 30%",
      "Never — that is your income",
      "When the unit economics cannot work at any achievable CPC: negative contribution margin, a listing that cannot convert, or stock that will not last the cycle — and you say so with the numbers",
      "When the client becomes difficult to work with",
    ],
    answerIndex: 2,
    explanation:
      "Some products cannot be advertised profitably, and pretending otherwise costs the client money and costs you the relationship when they work it out. Show the break-even CPC against the category's actual CPC, and recommend the fix — price, cost, listing — that would make advertising viable.",
    reference: "/glossary#contribution-margin",
  },
];

/* ================================================================== *
 * Level 5 — Scenario problem-solving (14 questions)
 * ================================================================== */

const scenarioQuestions: QuizQuestion[] = [
  {
    id: "scn-01",
    level: "scenario",
    topic: "Troubleshooting",
    question:
      "SCENARIO: You launch a new product with no reviews. Ads are running but CTR is 0.1%. What is wrong and how do you fix it?",
    choices: [
      "Bids are too low — raise them until CTR improves",
      "Diagnose the click decision, not the bid: review count and rating, main image, price against the comparison set, badges and coupons — then fix the listing, add a coupon, enrol in Vine, and use Sponsored Brands video for visual pull",
      "Pause the campaign and relaunch next month",
      "Switch every keyword to broad match for more reach",
    ],
    answerIndex: 1,
    explanation:
      "CTR is decided in the search results, before anyone reaches your page: image, price, rating, review count, badge. A 0.1% CTR against a 0.3-0.5% norm says shoppers are seeing you and choosing someone else, and no bid increase changes that — it just buys more impressions that get skipped.",
    reference: "/sops/campaign-launch",
  },
  {
    id: "scn-02",
    level: "scenario",
    topic: "Troubleshooting",
    question:
      "SCENARIO: A product was profitable at 25% ACoS. It suddenly jumps to 55% with no changes on your side. Investigate.",
    choices: [
      "Cut all bids by half immediately",
      "Pause the campaign and wait a week for it to settle",
      "Increase the budget so the campaign can average out",
      "Investigate before acting: stock and Buy Box status, listing suppression, review count and rating changes, price against competitors, new expensive search terms in the report, a new competitor bidding, and category CPC inflation",
    ],
    answerIndex: 3,
    explanation:
      "An ACoS that doubles overnight has a cause, and the cause decides the fix. Work the list in order of how quickly you can check it: listing status and stock take a minute, price and reviews another minute, then the search term report for new expensive terms, then competitor activity.",
    reference: "/sops/daily-health-check",
  },
  {
    id: "scn-03",
    level: "scenario",
    topic: "Budgets",
    question:
      "SCENARIO: You have $500 a month across 10 products. How do you allocate it?",
    choices: [
      "Concentrate it: 60% ($300) on the top three sellers, 30% ($150) on three growth ASINs, 10% ($50) on testing the rest",
      "Split it evenly — $50 per product",
      "Put it all behind the newest product to launch it properly",
      "Spend it all in the first week to gather data quickly",
    ],
    answerIndex: 0,
    explanation:
      "Fifty dollars a month per product is roughly one click a day: not enough to learn anything or to move rank on any of the ten. Concentrate spend where conversion data already exists, dominate three products, and use the remaining tenth to keep a small discovery loop open.",
    reference: "/glossary#budget-pacing",
  },
  {
    id: "scn-04",
    level: "scenario",
    topic: "Seasonality",
    question:
      "SCENARIO: The client wants to launch into Q4 with $5,000 for November and December. Plan the approach.",
    choices: [
      "Spend $2,500 in November and $2,500 in December, evenly by day",
      "Hold everything back for Black Friday and Cyber Monday",
      "Build structure, keyword research and bid baselines in October; ramp spend about 20% a week through 1-15 November; bid aggressively (+30-50%) 16-24 November; hold through Cyber Monday while monitoring closely; scale back to sustainable bids and harvest winners 2-15 December; run holiday maintenance and cut experimental spend from 16 December",
      "Run everything on auto campaigns and let Amazon optimise the peak",
    ],
    answerIndex: 2,
    explanation:
      "Q4 rewards a schedule, not a lump sum. October builds the structure and baselines, early November builds data while CPCs are still reasonable, the peak week takes the aggressive bids, and December turns the peak's search terms into the keyword list you will run in January.",
    reference: "/workflows/seasonal-preparation",
  },
  {
    id: "scn-05",
    level: "scenario",
    topic: "Reporting",
    question:
      "SCENARIO: You manage three accounts at once. How do you structure your week?",
    choices: [
      "Work whichever account is loudest that day",
      "One deep-dive day per account Monday to Wednesday, Thursday for reporting and client calls, Friday for weekly review, planning and keyword research — plus a 15-minute health check on all three every morning",
      "Batch all three accounts into one long Friday session",
      "Check each account once a week in no fixed order",
    ],
    answerIndex: 1,
    explanation:
      "Rotating deep dives give each account real attention without context-switching all day, and the daily 15-minute health check catches the things that cannot wait — budget pacing, anomalies, stock-outs. Reactive scheduling means the quiet account is the one that quietly breaks.",
    reference: "/sops/daily-health-check",
  },
  {
    id: "scn-06",
    level: "scenario",
    topic: "Troubleshooting",
    question:
      "SCENARIO: A campaign running 40,000 impressions a day drops to 300 overnight. Nothing was changed in the console. What do you check first?",
    choices: [
      "Whether the bid is too low",
      "What competitors are bidding",
      "Serving eligibility first: is the ASIN in stock, is it winning the Buy Box, is the listing suppressed, is the campaign out of budget or past its end date",
      "The search term report for new terms",
    ],
    answerIndex: 2,
    explanation:
      "A collapse that steep is almost never an auction problem. Sponsored Products stops serving entirely when you lose the Buy Box or the listing goes inactive, and an ended campaign or exhausted budget produces the same silence. Check eligibility before you touch a single bid.",
    reference: "/sops/daily-health-check",
  },
  {
    id: "scn-07",
    level: "scenario",
    topic: "Troubleshooting",
    question:
      "SCENARIO: 600 clicks over two weeks, $520 spent, zero orders. The search terms in the report look genuinely on-target. What is the most likely problem?",
    choices: [
      "The listing, not the ads: price, images, reviews, stock or a broken variation is losing the sale after the click",
      "The bids are too low to reach good placements",
      "The match types are too narrow",
      "Amazon is failing to report the orders",
    ],
    answerIndex: 0,
    explanation:
      "Relevant traffic that never converts is a detail-page problem. Six hundred clicks is far past the point where zero orders could be noise, so open the listing as a shopper would: is the price competitive, is the main image doing its job, how many reviews, is the size or colour the ad implies actually in stock.",
    reference: "/sops/escalation-procedures",
  },
  {
    id: "scn-08",
    level: "scenario",
    topic: "Budgets",
    question:
      "SCENARIO: A $60-a-day campaign spends out by 8 a.m. every day, at a 62% ACoS against a 35% break-even. What do you do first?",
    choices: [
      "Raise the budget so the campaign lasts the whole day",
      "Cut bids — the campaign is buying expensive clicks quickly; lower bids stretch the day and attack the ACoS problem at the same time — then re-check the placement adjustments",
      "Pause the campaign entirely",
      "Switch to up-and-down bidding to let Amazon optimise",
    ],
    answerIndex: 1,
    explanation:
      "Raising the budget on a campaign that loses money at 62% ACoS just loses money faster. Lower bids do two jobs at once: they reduce the cost per click that is driving the ACoS, and they make the budget last into the hours you were never reaching. Check placement modifiers next — an aggressive top-of-search adjustment is a common hidden cause.",
    reference: "/sops/bid-optimization",
  },
  {
    id: "scn-09",
    level: "scenario",
    topic: "Troubleshooting",
    question:
      "SCENARIO: You add an exact match keyword with a $2.50 bid, well above the suggested range, and it gets zero impressions for five days. Why?",
    choices: [
      "The keyword has too many words in it",
      "Exact match keywords take about 30 days to activate",
      "Check for a conflicting negative in the campaign or a shared list, the term already being served by another of your campaigns, a paused ad group or ad, or an ASIN that is not eligible to advertise",
      "The bid is still too low for that term",
    ],
    answerIndex: 2,
    explanation:
      "Zero impressions at an above-market bid is a blocking problem, not a pricing one. The usual culprits in order: a negative keyword you or a predecessor added, another campaign of yours already winning the term, a paused ad group or ad, or an ineligible ASIN — out of stock, suppressed, or without the Buy Box.",
    reference: "/cheat-sheets/negative-keywords",
  },
  {
    id: "scn-10",
    level: "scenario",
    topic: "Metrics",
    question:
      "SCENARIO: ACoS improved from 34% to 19%, but total revenue is flat and TACoS rose. What happened?",
    choices: [
      "The account improved on every measure",
      "Organic sales grew and replaced ad sales",
      "The attribution window changed",
      "Ad sales grew but total sales did not: the ads are now taking credit for orders organic was already winning, and the higher TACoS says spend grew relative to the whole business",
    ],
    answerIndex: 3,
    explanation:
      "Work it through: ACoS down means ad sales rose faster than spend; TACoS up with flat total sales means spend rose against an unchanged business. The only way both are true is that ad-attributed sales displaced organic ones. Check whether new spend went onto brand terms that were already converting organically.",
    reference: "/glossary#tacos",
  },
  {
    id: "scn-11",
    level: "scenario",
    topic: "Seasonality",
    question:
      "SCENARIO: Prime Day is three weeks away and the client has an approved deal on two ASINs. What is your plan?",
    choices: [
      "Build and warm the campaigns now so they carry history into the event, lift budgets and bids from the day before, defend brand terms hardest during the event, and hold budget in reserve for the 48 hours afterwards when CPCs fall and intent is still high",
      "Do nothing until the day, then raise bids",
      "Spend the entire budget on day one of the event",
      "Pause everything during the event to avoid expensive clicks",
    ],
    answerIndex: 0,
    explanation:
      "Campaigns with no recent history perform badly in a spike, so warm them in advance. During the event the deal badge lifts conversion, which makes brand defence unusually valuable. The overlooked opportunity is the two days after: CPCs drop while deal-primed shoppers are still buying.",
    reference: "/workflows/seasonal-preparation",
  },
  {
    id: "scn-12",
    level: "scenario",
    topic: "Seasonality",
    question:
      "SCENARIO: January sales fall 45% from December and ACoS rises from 22% to 38%. The client panics. What is the correct read?",
    choices: [
      "The account broke in December and needs rebuilding",
      "Post-holiday demand fell while CPCs stayed elevated: compare against last January rather than against December, cut discovery spend, protect the terms that hold rank, and reset the seasonal target ACoS",
      "Competitors have taken over the category",
      "Amazon changed the auction mechanics",
    ],
    answerIndex: 1,
    explanation:
      "December is the wrong baseline for January in almost every category. The right comparison is the same month last year, or the pre-Q4 October baseline you recorded. Then manage the season you are actually in: less discovery, tighter targets, and protection for the keywords carrying organic rank.",
    reference: "/workflows/seasonal-preparation",
  },
  {
    id: "scn-13",
    level: "scenario",
    topic: "Troubleshooting",
    question:
      "SCENARIO: You take over an account today. What are the first five things you look at?",
    choices: [
      "Bids, budgets, negatives, bids again, and the client's competitors",
      "The previous agency's most recent monthly report",
      "Account structure and naming, spend and ACoS by campaign over 60 days, search term waste, negative keyword coverage and conflicts, and stock plus Buy Box status on the top ASINs",
      "The client's competitors' listings and pricing",
    ],
    answerIndex: 2,
    explanation:
      "Audit in the order that finds money fastest. Structure tells you what you inherited, 60 days of campaign-level spend shows where it goes, the search term report shows what is wasted, the negative list shows what has been strangled, and stock and Buy Box tell you whether any of it can convert at all.",
    reference: "/templates/campaign-audit-checklist",
  },
  {
    id: "scn-14",
    level: "scenario",
    topic: "Budgets",
    question:
      "SCENARIO: Mid-month, your top ASIN — 40% of ad spend — will be out of stock for 12 days. What do you do with its budget?",
    choices: [
      "Leave the campaigns running to protect its rank",
      "Return the unspent budget to the client",
      "Move all of it behind the newest ASIN to launch it quickly",
      "Cut that ASIN's spend to a small rank-holding level or pause it, move the freed budget to in-stock ASINs that are already profitable and budget-capped, and plan the restock ramp",
    ],
    answerIndex: 3,
    explanation:
      "Money should move to where it can convert today. Budget-capped profitable campaigns are the obvious destination because you already know the return; a brand-new ASIN is the worst destination, because you would be learning on the biggest budget the account has ever given a single product.",
    reference: "/sops/escalation-procedures",
  },
];

/* ================================================================== *
 * Quizzes
 * ================================================================== */

const QUESTIONS_BY_LEVEL: Record<Level, QuizQuestion[]> = {
  beginner: beginnerQuestions,
  intermediate: intermediateQuestions,
  advanced: advancedQuestions,
  expert: expertQuestions,
  scenario: scenarioQuestions,
};

/** Every question in the bank, in level order. */
export const allQuizQuestions: QuizQuestion[] = LEVEL_ORDER.flatMap(
  (level) => QUESTIONS_BY_LEVEL[level],
);

const QUESTION_INDEX = new Map(allQuizQuestions.map((question) => [question.id, question]));

/**
 * The mock exam: a fixed 40-question spread across all five levels, weighted
 * the way a real competency check is — heavier on the work you do weekly,
 * lighter on the rare judgement calls.
 */
const MOCK_EXAM_IDS = [
  "beg-03", "beg-05", "beg-09", "beg-12", "beg-14",
  "beg-17", "beg-21", "beg-26", "beg-31", "beg-37",
  "int-01", "int-02", "int-05", "int-08", "int-13",
  "int-15", "int-19", "int-23", "int-28", "int-32",
  "adv-03", "adv-05", "adv-09", "adv-11", "adv-13",
  "adv-15", "adv-20", "adv-23",
  "exp-01", "exp-02", "exp-07", "exp-09", "exp-11", "exp-16",
  "scn-02", "scn-06", "scn-08", "scn-10", "scn-12", "scn-14",
];

const mockExamQuestions: QuizQuestion[] = MOCK_EXAM_IDS.map((id) => {
  const question = QUESTION_INDEX.get(id);
  if (!question) throw new Error(`Mock exam references an unknown question id: ${id}`);
  return question;
});

function minutesFor(questions: QuizQuestion[]): number {
  const seconds = questions.reduce(
    (total, question) => total + LEVEL_META[question.level].secondsPerQuestion,
    0,
  );
  return Math.max(5, Math.round(seconds / 60));
}

export const quizzes: Quiz[] = [
  {
    id: "beginner",
    title: "Level 1 — Fundamentals",
    summary:
      "Match types, the three ad types, targeting basics and the six metrics every PPC specialist is expected to compute without a calculator.",
    level: "beginner",
    topic: "Fundamentals",
    minutes: minutesFor(beginnerQuestions),
    questions: beginnerQuestions,
  },
  {
    id: "intermediate",
    title: "Level 2 — Optimisation",
    summary:
      "Search term analysis, harvesting, bid maths, placement adjustments and the budget decisions that fill a specialist's week.",
    level: "intermediate",
    topic: "Optimisation",
    minutes: minutesFor(intermediateQuestions),
    questions: intermediateQuestions,
  },
  {
    id: "advanced",
    title: "Level 3 — Strategy",
    summary:
      "Account structure, TACoS and halo effect, negative keyword strategy, restructuring an inherited account and the arithmetic behind marginal decisions.",
    level: "advanced",
    topic: "Strategy",
    minutes: minutesFor(advancedQuestions),
    questions: advancedQuestions,
  },
  {
    id: "expert",
    title: "Level 4 — Client management",
    summary:
      "Setting achievable targets, defending a strategy with numbers, escalation, reporting a bad month and the conversations that decide whether you keep the account.",
    level: "expert",
    topic: "Client management",
    minutes: minutesFor(expertQuestions),
    questions: expertQuestions,
  },
  {
    id: "scenario",
    title: "Level 5 — Scenario problem-solving",
    summary:
      "Broken accounts, sudden metric swings, Q4 under pressure and inherited messes. Every one rewards diagnosis before action.",
    level: "scenario",
    topic: "Problem solving",
    minutes: minutesFor(scenarioQuestions),
    questions: scenarioQuestions,
  },
  {
    id: "mock-exam",
    title: "Mock certification exam",
    summary:
      "Forty questions drawn across all five levels, weighted like a real competency check. Sit it in exam mode with the timer on before an interview.",
    level: "advanced",
    topic: "Mixed",
    minutes: minutesFor(mockExamQuestions),
    questions: mockExamQuestions,
  },
];

/** Ids that the runner resolves dynamically rather than from `quizzes`. */
export const DYNAMIC_QUIZ_IDS = ["custom"] as const;

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export function findQuiz(id: string): Quiz | undefined {
  return quizzes.find((quiz) => quiz.id === id);
}

export function findQuestion(id: string): QuizQuestion | undefined {
  return QUESTION_INDEX.get(id);
}

/** Resolve a list of ids to questions, silently dropping any that vanished. */
export function questionsByIds(ids: readonly string[]): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const id of ids) {
    const question = QUESTION_INDEX.get(id);
    if (question) out.push(question);
  }
  return out;
}

export function questionsForLevel(level: Level): QuizQuestion[] {
  return QUESTIONS_BY_LEVEL[level];
}

/** Every question matching any of the given levels and topics. */
export function filterQuestions(levels: readonly Level[], topics: readonly string[]): QuizQuestion[] {
  const levelSet = new Set(levels);
  const topicSet = new Set(topics);
  return allQuizQuestions.filter(
    (question) =>
      (levelSet.size === 0 || levelSet.has(question.level)) &&
      (topicSet.size === 0 || topicSet.has(question.topic)),
  );
}

/** Topics present in the bank, in the controlled order, with counts. */
export function topicCounts(): { topic: string; count: number }[] {
  return QUIZ_TOPICS.map((topic) => ({
    topic,
    count: allQuizQuestions.filter((question) => question.topic === topic).length,
  })).filter((entry) => entry.count > 0);
}

/** Topics used by at least one question at the given levels. */
export function topicsForLevels(levels: readonly Level[]): string[] {
  const levelSet = new Set(levels);
  const present = new Set(
    allQuizQuestions
      .filter((question) => levelSet.size === 0 || levelSet.has(question.level))
      .map((question) => question.topic),
  );
  return QUIZ_TOPICS.filter((topic) => present.has(topic));
}

export function levelCounts(): Record<Level, number> {
  return {
    beginner: beginnerQuestions.length,
    intermediate: intermediateQuestions.length,
    advanced: advancedQuestions.length,
    expert: expertQuestions.length,
    scenario: scenarioQuestions.length,
  };
}

export const TOTAL_QUESTIONS = allQuizQuestions.length;

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

const UPDATED = "2026-09-15";

/**
 * One ref per quiz, not per question: individual questions have no page of
 * their own to land on. The full question text goes into `body` so a search
 * for a phrase inside a question still surfaces the quiz that holds it.
 */
export function resourceRefs(): ResourceRef[] {
  return quizzes.map((quiz) => ({
    id: `quiz-${quiz.id}`,
    kind: "quiz" as const,
    title: quiz.title,
    summary: quiz.summary,
    href: `/quizzes/${quiz.id}`,
    tags: [
      "quiz",
      quiz.level,
      quiz.topic.toLowerCase(),
      ...Array.from(new Set(quiz.questions.map((question) => question.topic.toLowerCase()))),
    ],
    level: quiz.level,
    minutes: quiz.minutes,
    body: quiz.questions
      .map((question) => `${question.question} ${question.choices[question.answerIndex]} ${question.explanation}`)
      .join(" "),
    updated: UPDATED,
  }));
}
