import type { InterviewQuestion, Level, ResourceRef, Tone } from "@/types/content";

/**
 * The PPC Academy interview question bank.
 *
 * Every question from `../ppc-tools-for-va/interview-questions/ppc-interview-questions.md`
 * (60 questions across five source categories) is ported here with its answer
 * guidance intact — each entry names the original category and number in its
 * `source` field. The bank is then expanded and re-cut into the nine
 * competencies a hiring manager actually screens for.
 *
 * Rules this file keeps:
 *  - every ideal answer is markdown: two to five short paragraphs, or a tight
 *    bullet structure, never a wall of text
 *  - every entry carries the key points an interviewer listens for, the red
 *    flags that lose the job, and the follow-ups a good interviewer asks next
 *  - every number is arithmetically correct and internally consistent
 *  - the voice assumes a Filipino VA interviewing for a remote Amazon PPC
 *    specialist role: practical, specific, no hype
 */

export const UPDATED = "2026-09-15";

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export const INTERVIEW_CATEGORIES = [
  "Fundamentals",
  "Campaign Structure",
  "Optimization",
  "Reporting & Analysis",
  "Tools & Automation",
  "Client Management",
  "Troubleshooting Scenarios",
  "Behavioral",
  "Situational & Role-play",
] as const;

export type InterviewCategory = (typeof INTERVIEW_CATEGORIES)[number];

export interface CategoryMeta {
  category: InterviewCategory;
  /** Short label for tabs and chips. */
  short: string;
  /** lucide-react export name, resolved by the UI layer. */
  iconName: string;
  tone: Tone;
  /** One line under the tab. */
  blurb: string;
  /** Two or three sentences for the category panel. */
  description: string;
  /** Who asks these, and when they come up in a hiring process. */
  whenAsked: string;
}

export const CATEGORY_META: Record<InterviewCategory, CategoryMeta> = {
  Fundamentals: {
    category: "Fundamentals",
    short: "Fundamentals",
    iconName: "BookOpen",
    tone: "good",
    blurb: "Ad types, match types, the metrics and the maths behind them.",
    description:
      "The vocabulary screen. Almost every process opens here because it is cheap to run and it filters hard: a candidate who fumbles ACoS, match types, or the difference between a keyword and a search term rarely reaches the second call.",
    whenAsked: "Screening call, first ten minutes. Often read off a sheet by a recruiter.",
  },
  "Campaign Structure": {
    category: "Campaign Structure",
    short: "Structure",
    iconName: "LayoutGrid",
    tone: "brand",
    blurb: "How you lay an account out, and why it survives contact with reality.",
    description:
      "Structure questions separate people who have run accounts from people who have read about them. The interviewer is checking whether you build something another specialist could pick up on Monday morning without a handover call.",
    whenAsked: "Technical interview, usually with the account lead or the agency owner.",
  },
  Optimization: {
    category: "Optimization",
    short: "Optimization",
    iconName: "SlidersHorizontal",
    tone: "info",
    blurb: "Bids, negatives, placements, and the thresholds you act on.",
    description:
      "The day job. Expect numbers in the question and numbers in the answer: how many clicks before you judge a keyword, how far you move a bid, what you do when conversion rate is high but ACoS is above break-even.",
    whenAsked: "Technical interview and paid test tasks. Frequently framed as a mini case.",
  },
  "Reporting & Analysis": {
    category: "Reporting & Analysis",
    short: "Reporting",
    iconName: "ChartColumn",
    tone: "brand",
    blurb: "Pulling the data, reading it honestly, and presenting it.",
    description:
      "Agencies live and die on reporting. These questions test whether you can move from a raw export to a decision, and whether you can say what a number means to a seller who does not care about pivot tables.",
    whenAsked: "Technical interview, and often a take-home task built on a real export.",
  },
  "Tools & Automation": {
    category: "Tools & Automation",
    short: "Tools",
    iconName: "Wrench",
    tone: "info",
    blurb: "Helium 10, bulk files, rules, scripts, and knowing when not to automate.",
    description:
      "Tool questions are really scope questions: can you work fast without a 400-dollar-a-month stack, and do you understand that a rule engine executes judgement rather than replacing it?",
    whenAsked: "Technical interview. Agencies press hardest here because tool seats cost them money.",
  },
  "Client Management": {
    category: "Client Management",
    short: "Clients",
    iconName: "Users",
    tone: "ember",
    blurb: "Expectations, bad news, scope, and being the calm one on the call.",
    description:
      "For a remote VA this is usually the deciding round. The work is only half the job; the other half is a client who trusts you enough to stop checking the account at midnight.",
    whenAsked: "Final round, often with the person who would be your day-to-day contact.",
  },
  "Troubleshooting Scenarios": {
    category: "Troubleshooting Scenarios",
    short: "Troubleshooting",
    iconName: "Stethoscope",
    tone: "warn",
    blurb: "Something broke overnight. Walk me through the diagnosis.",
    description:
      "Diagnostic questions with no single right answer. The interviewer is grading your order of operations: do you check the cheap, common causes before the exotic ones, and do you look outside the ads console before blaming the bids?",
    whenAsked: "Technical interview and live screen-shares. The most common format for senior roles.",
  },
  Behavioral: {
    category: "Behavioral",
    short: "Behavioral",
    iconName: "MessageSquareQuote",
    tone: "neutral",
    blurb: "How you work, learn, organise, and own mistakes.",
    description:
      "Standard behavioural ground, tuned to remote contract work. Answers should be short, concrete and anchored to something you actually did, with a number in them wherever a number exists.",
    whenAsked: "Every round. Usually the opener and the closer.",
  },
  "Situational & Role-play": {
    category: "Situational & Role-play",
    short: "Role-play",
    iconName: "Drama",
    tone: "ember",
    blurb: "You are on the call now. Say the words you would actually say.",
    description:
      "Live simulations: pitch the plan, defend the spend, explain a metric to a founder who has never opened the ads console. Graded on plain language, structure, and whether you land on a recommendation.",
    whenAsked: "Final round. Increasingly common for agency and in-house brand roles.",
  },
};

export const CATEGORY_ORDER: InterviewCategory[] = [...INTERVIEW_CATEGORIES];

/**
 * Provenance for the 60 questions carried over from the source bank, so the
 * original categorisation is never lost in the re-cut.
 */
export interface SourceCategory {
  label: string;
  count: number;
  note: string;
}

export const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    label: "Technical Knowledge",
    count: 15,
    note: "Now split across Fundamentals and Optimization.",
  },
  {
    label: "Scenario-Based",
    count: 15,
    note: "Now split across Troubleshooting Scenarios and Situational & Role-play.",
  },
  {
    label: "Tool Proficiency",
    count: 10,
    note: "Now Tools & Automation, with the reporting questions in Reporting & Analysis.",
  },
  { label: "Client Communication", count: 10, note: "Now Client Management." },
  {
    label: "VA-Specific",
    count: 10,
    note: "Now Behavioral, with the account-rescue questions in Situational & Role-play.",
  },
];

/* ------------------------------------------------------------------ *
 * Levels
 * ------------------------------------------------------------------ */

export interface InterviewLevelMeta {
  level: Level;
  label: string;
  blurb: string;
  tone: Tone;
}

export const LEVEL_META: Record<Level, InterviewLevelMeta> = {
  beginner: {
    level: "beginner",
    label: "Screening",
    blurb: "Definitional. You either know it or you do not.",
    tone: "good",
  },
  intermediate: {
    level: "intermediate",
    label: "Working",
    blurb: "The weekly job: thresholds, process and judgement calls.",
    tone: "brand",
  },
  advanced: {
    level: "advanced",
    label: "Strategy",
    blurb: "Account-level thinking, trade-offs and second-order effects.",
    tone: "info",
  },
  expert: {
    level: "expert",
    label: "Senior",
    blurb: "Client-facing judgement where the wrong answer costs the account.",
    tone: "ember",
  },
  scenario: {
    level: "scenario",
    label: "Live case",
    blurb: "Something is broken or ambiguous. Diagnose it out loud.",
    tone: "warn",
  },
};

export const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "advanced", "expert", "scenario"];

/* ------------------------------------------------------------------ *
 * The bank
 * ------------------------------------------------------------------ */

export interface InterviewEntry extends InterviewQuestion {
  category: InterviewCategory;
  /** Lower-case topic tags, used by search, related questions and filters. */
  tags: string[];
  /** Original bank reference, e.g. "Technical Knowledge Q1". */
  source?: string;
  /** Roughly how long a strong spoken answer runs, in seconds. */
  answerSeconds: number;
}

export const interviewQuestions: InterviewEntry[] = [
  /* ---------------------------------------------------------------- *
   * Fundamentals
   * ---------------------------------------------------------------- */
  {
    id: "three-ad-types",
    category: "Fundamentals",
    level: "beginner",
    source: "Technical Knowledge Q1",
    tags: ["ad types", "sponsored products", "sponsored brands", "sponsored display"],
    answerSeconds: 90,
    question: "Walk me through the three Amazon ad types and when you would use each.",
    idealAnswer: `**Sponsored Products** promote a single listing in search results and on product pages. Available to every seller, cost-per-click, and the workhorse — in most accounts it carries 70 to 85 percent of ad spend because it captures people who are already searching for the product.

**Sponsored Brands** puts a headline, a logo and three products, or a video, at the top of search. It needs Brand Registry. Use it to own the top of a branded or category search, to push traffic into a Storefront, and to keep competitors out of the space above your own listing.

**Sponsored Display** targets audiences and products rather than searches, and it runs both on and off Amazon. Use it to retarget shoppers who viewed the detail page and did not buy, to defend your own product pages, and to conquest competitor ASINs.

The short version I would give a client: SP captures demand, SB shapes how the brand looks when demand arrives, SD chases the people who did not buy the first time.`,
    keyPoints: [
      "Names all three correctly and does not confuse Sponsored Brands with Sponsored Display",
      "Knows Brand Registry gates Sponsored Brands",
      "Gives a use case, not just a definition",
      "Mentions that Sponsored Products normally takes the majority of spend",
    ],
    redFlags: [
      "Calls Sponsored Display a search ad type",
      "Does not know Brand Registry is required for Sponsored Brands",
      "Recites definitions with no sense of how budget splits in a real account",
    ],
    followUps: [
      "Which of the three would you launch first for a brand-new ASIN, and why?",
      "When would you deliberately spend nothing on Sponsored Brands?",
    ],
  },
  {
    id: "match-types-broad-phrase-exact",
    category: "Fundamentals",
    level: "beginner",
    source: "Technical Knowledge Q2",
    tags: ["match types", "keywords", "broad", "phrase", "exact"],
    answerSeconds: 90,
    question: "Explain broad, phrase and exact match with examples.",
    idealAnswer: `**Broad** is the widest net. The keyword *bluetooth headphones* can trigger on *wireless audio headset* or *earbuds for running* — synonyms, related terms and reordered words. Cheap per click, dirtiest traffic, best used for discovery.

**Phrase** requires the phrase in order, with words allowed before or after. *bluetooth headphones* triggers on *best bluetooth headphones 2026*, but not on *headphones with bluetooth and mic* where the words are split.

**Exact** triggers only on that term and its close variants — plurals, small misspellings, *bluetooth headphone* singular. Highest intent, highest CPC, and the match type a search term gets promoted into once it has proven it converts.

In practice I run auto and broad to find search terms, harvest the converting ones into exact, then negate them back out of the discovery campaigns so the two are not bidding against each other.`,
    keyPoints: [
      "Correct behaviour for all three, with a concrete keyword example",
      "Mentions close variants under exact match",
      "Connects match type to campaign role: discovery versus scaling",
      "Negates harvested terms out of the source campaign",
    ],
    redFlags: [
      "Thinks exact match means literally only that string, with no variants",
      "Believes broad match is cheaper per order rather than just cheaper per click",
      "Cannot give an example when asked for one",
    ],
    followUps: [
      "What counts as a close variant?",
      "Would you ever scale a broad-match keyword instead of harvesting it?",
    ],
  },
  {
    id: "acos-and-roas-maths",
    category: "Fundamentals",
    level: "beginner",
    source: "Technical Knowledge Q3",
    tags: ["acos", "roas", "metrics", "maths"],
    answerSeconds: 60,
    question: "How do you calculate ACoS and ROAS? Give me a real example.",
    idealAnswer: `**ACoS** is ad spend divided by ad revenue, times 100. **ROAS** is ad revenue divided by ad spend. They are the same relationship expressed two ways — ROAS is one divided by ACoS.

Worked example: I spent 200 dollars and the ads produced 800 dollars in sales. ACoS is 200 over 800, so 25 percent. ROAS is 800 over 200, so 4.0x.

The number only means something next to the margin. If the product nets 35 percent after cost of goods, Amazon fees and shipping, then 25 percent ACoS is profitable with ten points of headroom. The same 25 percent on a 20 percent margin product loses money on every order.

That is why the first thing I ask on a new account is the break-even ACoS per ASIN, before I touch a single bid.`,
    keyPoints: [
      "Both formulas correct and stated as reciprocals",
      "Runs the arithmetic out loud without hesitating",
      "Immediately ties the number to margin and break-even",
      "Does not describe a low ACoS as good in isolation",
    ],
    redFlags: [
      "Inverts the ACoS formula",
      "Says lower ACoS is always better, with no mention of margin or volume",
      "Cannot do the division without a calculator",
    ],
    followUps: [
      "Spend 340 dollars, sales 1,190 dollars. ACoS and ROAS?",
      "Your client says they want ACoS under 10 percent. What do you say?",
    ],
  },
  {
    id: "tacos-vs-acos",
    category: "Fundamentals",
    level: "intermediate",
    source: "Technical Knowledge Q4",
    tags: ["tacos", "acos", "metrics", "organic"],
    answerSeconds: 90,
    question: "What is TACoS and why do you prefer it over ACoS for overall performance?",
    idealAnswer: `**TACoS** is ad spend divided by *total* sales — organic plus ad-attributed — rather than by ad sales alone. It answers the question the seller actually cares about: what share of the whole business is going to Amazon advertising.

ACoS can look excellent while the business quietly gets worse. Cut spend back to safe branded keywords and ACoS drops to 12 percent, the report looks great, but organic velocity falls, rank slips and total revenue is down. TACoS catches that; ACoS does not.

The reading I use. TACoS falling while total sales rise means ads are buying organic rank and the flywheel is turning. TACoS flat while sales rise means ads are scaling proportionally, which is fine. TACoS rising while sales are flat means we are paying for sales we were already getting.

Example: 2,000 dollars spend, 6,000 dollars ad sales, 20,000 dollars total sales. ACoS is 33 percent, TACoS is 10 percent.`,
    keyPoints: [
      "Correct formula, using total sales as the denominator",
      "Explains the specific failure mode ACoS hides",
      "Gives the three-way reading of the TACoS trend",
      "Produces a worked example with consistent numbers",
    ],
    redFlags: [
      "Uses ad sales in the TACoS denominator, making it identical to ACoS",
      "Treats TACoS as a number to minimise rather than a trend to read",
      "Has never pulled a Business Report to get total sales",
    ],
    followUps: [
      "Where in Seller Central do you get the total sales figure?",
      "TACoS went from 9 to 14 percent this month. Is that bad?",
    ],
  },
  {
    id: "break-even-acos",
    category: "Fundamentals",
    level: "beginner",
    tags: ["break-even", "acos", "margin", "profitability"],
    answerSeconds: 75,
    question: "What is break-even ACoS and how do you work it out for a product?",
    idealAnswer: `Break-even ACoS is the ACoS at which one extra ad-driven order makes exactly zero profit. It equals the contribution margin as a percentage of the selling price.

Worked example on a 40 dollar product: cost of goods 10 dollars, referral fee 6 dollars, FBA fulfilment 5 dollars, inbound shipping and packaging 2 dollars, a 3 dollar allowance for returns. Total cost 26 dollars, contribution 14 dollars, margin 35 percent — so break-even ACoS is 35 percent.

Above 35 percent I am paying for the order. Below it the order contributes. I set the working target below break-even to leave room for overheads: on this product, 25 to 28 percent in a steady state, and 45 to 60 percent during a launch where I am deliberately buying rank instead of profit.

I get the inputs from the seller or from the Fee Preview report. I never assume a margin, because a two-point error changes every bid decision that follows.`,
    keyPoints: [
      "Break-even ACoS equals contribution margin percent",
      "Lists the real cost stack, not just cost of goods",
      "Distinguishes break-even from target ACoS",
      "Asks the seller for the numbers instead of guessing",
    ],
    redFlags: [
      "Confuses margin on cost with margin on price",
      "Forgets Amazon fees or returns in the cost stack",
      "Treats break-even ACoS as the number to run at permanently",
    ],
    followUps: [
      "Price 24.99, all-in cost 17.49. What is break-even ACoS?",
      "When is running above break-even the correct decision?",
    ],
  },
  {
    id: "ctr-cvr-cpc-benchmarks",
    category: "Fundamentals",
    level: "beginner",
    tags: ["ctr", "cvr", "cpc", "benchmarks", "metrics"],
    answerSeconds: 75,
    question: "Define CTR, CVR and CPC, and tell me what good looks like on Amazon.",
    idealAnswer: `**CTR** is clicks divided by impressions — how compelling the ad looks in the result. **CVR** is orders divided by clicks — how well the listing and the price close. **CPC** is spend divided by clicks — what the auction charges.

Rough Amazon benchmarks I work from, always caveated as category dependent. CTR of 0.3 to 0.5 percent is typical for Sponsored Products, and above 0.5 percent is strong. CVR of 8 to 12 percent is healthy for most physical goods, and a good listing on a high-intent exact keyword often runs 15 to 25 percent. CPC ranges from about 0.40 dollars in quiet categories to 3 dollars or more in supplements and electronics.

The reason the three matter together: ACoS is CPC divided by price times CVR. If ACoS is bad, one of those three caused it, and each has a different fix — CTR is an image, title and price problem, CVR is a listing, review and price problem, CPC is a bidding and relevance problem.`,
    keyPoints: [
      "All three definitions correct",
      "Gives ranges and flags them as category dependent",
      "Connects the three metrics to the ACoS outcome",
      "Maps each metric to a different remedy",
    ],
    redFlags: [
      "Quotes Google Ads benchmarks such as 2 to 5 percent CTR as if they applied to Amazon",
      "States benchmarks with no caveat about category",
      "Cannot say which metric a listing fix would move",
    ],
    followUps: [
      "CTR is 0.9 percent and CVR is 2 percent. What do you look at first?",
      "How many clicks do you need before CVR means anything?",
    ],
  },
  {
    id: "auto-vs-manual-campaigns",
    category: "Fundamentals",
    level: "beginner",
    source: "Technical Knowledge Q6",
    tags: ["auto campaign", "manual campaign", "structure", "discovery"],
    answerSeconds: 75,
    question: "What is the difference between auto and manual campaigns?",
    idealAnswer: `An **auto campaign** lets Amazon match the ad to searches and products using the listing itself. You control budget and bids, and you can split the four targeting groups — close match, loose match, substitutes and complements — but you do not choose the terms.

A **manual campaign** is the opposite: you pick the keywords or ASINs, the match type and the bid.

They are not alternatives, they are a pipeline. Auto is the discovery engine, surfacing search terms you would never have thought of, cheaply. Manual is where proven terms go to be controlled and scaled. Every account I run has both, with auto kept on a modest budget and a lower bid, and a weekly harvest that promotes converting search terms into manual exact and then negates them in auto.

If a client can only fund one at launch, I run auto for two to three weeks to buy the data.`,
    keyPoints: [
      "Correct definitions, and knows the four auto targeting groups",
      "Frames them as a harvest pipeline rather than a choice",
      "Mentions negating harvested terms out of auto",
      "Has a view on which to run first with a small budget",
    ],
    redFlags: [
      "Says auto campaigns are only for beginners",
      "Never negates harvested terms, so auto and manual compete",
      "Cannot name any of the auto targeting groups",
    ],
    followUps: [
      "What bid do you set on an auto campaign relative to your manual bids?",
      "Would you ever keep an auto campaign running at scale? Why?",
    ],
  },
  {
    id: "how-the-auction-works",
    category: "Fundamentals",
    level: "intermediate",
    source: "Technical Knowledge Q7",
    tags: ["auction", "second price", "relevance", "cpc"],
    answerSeconds: 75,
    question: "Explain how Amazon's ad auction decides placement.",
    idealAnswer: `Amazon runs a second-price auction. You submit a maximum bid but pay only what is needed to beat the next eligible advertiser, plus a cent. That is why actual CPC is nearly always below the bid.

Placement is not decided by bid alone. Ads are ranked on bid combined with a relevance and performance signal — historical click-through rate, conversion rate, how relevant the keyword is to the listing, and listing quality. A well-converting listing can outrank a higher bidder and pay less for the same slot.

The practical consequences: raising a bid is the slowest and most expensive way to win more impressions, improving CTR and CVR is the cheapest, and two advertisers on the same keyword can pay very different CPCs.

I also tell clients the bid is a ceiling, not a price. Setting it to 2.50 dollars does not mean paying 2.50 dollars.`,
    keyPoints: [
      "Names it as a second-price auction and explains the pricing consequence",
      "Includes relevance and performance, not just bid, in ad rank",
      "Draws the practical lesson: improve relevance before raising bids",
      "Explains a bid as a ceiling",
    ],
    redFlags: [
      "Describes a first-price auction where you always pay your bid",
      "Thinks the highest bid always wins the top slot",
      "No concept of relevance affecting cost",
    ],
    followUps: [
      "Your CPC is exactly your bid on one keyword. What does that suggest?",
      "How would you lower CPC without lowering the bid?",
    ],
  },
  {
    id: "keyword-vs-search-term",
    category: "Fundamentals",
    level: "beginner",
    tags: ["search terms", "keywords", "reporting", "basics"],
    answerSeconds: 60,
    question: "What is the difference between a keyword and a search term?",
    idealAnswer: `A **keyword** is what I bid on. A **search term** is what the shopper actually typed. They are only identical in exact match, and even there close variants blur it.

That difference is the whole reason the search term report exists. I might bid on the broad keyword *dog nail clipper* and pay for search terms like *dog nail grinder quiet*, *cat claw trimmer* and *nail clippers for thick nails*. Two of those are worth harvesting, one is worth negating, and none of them are visible if I only look at the keyword report.

So the weekly loop is: read the search term report, promote converting terms into exact-match keywords, negate the wasteful ones, and leave the discovery campaign to keep finding new terms.

Juniors who miss this distinction end up tuning bids on keywords while the money quietly leaks out through search terms they have never looked at.`,
    keyPoints: [
      "Clean definition of both, and which one you bid on",
      "Concrete example of one keyword pulling unrelated search terms",
      "Links it to the weekly search term report routine",
      "Mentions close variants",
    ],
    redFlags: [
      "Uses the two words interchangeably",
      "Does not know the search term report exists",
      "Thinks exact match guarantees the search term equals the keyword",
    ],
    followUps: [
      "Which report shows search terms, and what date range do you pull?",
      "An ASIN appears as a search term in an auto campaign. What does that mean?",
    ],
  },
  {
    id: "product-vs-keyword-targeting",
    category: "Fundamentals",
    level: "beginner",
    source: "Technical Knowledge Q8",
    tags: ["product targeting", "keyword targeting", "asin targeting", "conquesting"],
    answerSeconds: 75,
    question: "What is the difference between product targeting and keyword targeting?",
    idealAnswer: `**Keyword targeting** puts the ad in front of a search, so intent is in the words the shopper typed. **Product targeting** puts the ad on a detail page or in a category browse, so intent comes from the page the shopper is already on.

I use product targeting three ways. Conquesting: target competitor ASINs that are weaker than mine on price, rating or review count. Defence: target my own ASINs so a competitor cannot own the carousel under my listing. Complementary: target products bought alongside mine, like targeting phone cases from a screen protector.

Product targeting usually runs a lower CTR and CVR than a matched exact keyword, so I hold it to a slightly looser ACoS target and judge it over a longer window.

Category targeting with refinements is the underused version. Targeting a category filtered to products priced above mine and rated below 4.0 stars is far sharper than targeting the category flat.`,
    keyPoints: [
      "Clear distinction between search intent and page context",
      "Names conquesting, defence and complementary use cases",
      "Knows product targeting converts differently and judges it accordingly",
      "Mentions category targeting with refinements",
    ],
    redFlags: [
      "Thinks product targeting is just another keyword match type",
      "Targets strong competitors with better price and reviews",
      "Never defends own detail pages",
    ],
    followUps: [
      "Which competitor ASINs would you pick, and how would you find them?",
      "Would you bid the same on a competitor ASIN as on your top exact keyword?",
    ],
  },
  {
    id: "negative-match-types",
    category: "Fundamentals",
    level: "beginner",
    tags: ["negatives", "match types", "wasted spend"],
    answerSeconds: 60,
    question: "Negative phrase versus negative exact — when do you use each?",
    idealAnswer: `**Negative exact** blocks one search term and its close variants, and nothing else. **Negative phrase** blocks any search term containing that phrase in order.

Negative exact is for surgery: block *free dog nail clippers* while keeping *dog nail clippers for large dogs* running.

Negative phrase is for whole families of wrong traffic: negating the phrase *for cats* on a dog product kills dozens of variants in one line.

Two rules I stick to. First, negative phrase is powerful enough to be dangerous, so I check what it would block before adding it — negating *for dogs* on a dog product is the classic self-inflicted wound. Second, ad-group negatives are surgical and campaign negatives are broad, so account-wide junk like *free*, *used* and *wholesale* belongs in a shared negative list applied everywhere.

There are also negative product targets, which block a specific ASIN or brand rather than a search term.`,
    keyPoints: [
      "Correct behaviour of both negative match types",
      "Gives a case for each, not just definitions",
      "Warns about over-broad negative phrases",
      "Knows ad group versus campaign level, and negative ASIN targets",
    ],
    redFlags: [
      "Adds negative phrases without checking what they would block",
      "Negates a term that has converted, purely because its ACoS looked high",
      "Does not know negative product targeting exists",
    ],
    followUps: [
      "Where would you put the negative *cheap*, and why?",
      "How do you avoid negating a term that is holding organic rank?",
    ],
  },
  {
    id: "bid-vs-budget",
    category: "Fundamentals",
    level: "beginner",
    tags: ["bids", "budget", "pacing", "basics"],
    answerSeconds: 60,
    question:
      "A client asks why raising the daily budget did not get them more sales. Explain bid versus budget.",
    idealAnswer: `The **bid** decides whether you enter and win the auction. The **budget** decides how long you can keep entering it that day. They fix different problems.

If the campaign is not spending its current budget, budget is not the constraint and raising it changes nothing. The ad is losing auctions, or the keywords have no volume — the fix is the bid, the targeting or the listing.

If the campaign runs out of budget by 2pm, budget is the constraint, and the campaign is invisible for the rest of the day. In most US categories that means going dark through the evening, which is when conversion rate is highest.

So the first thing I check is spend against budget. Under budget means a bid or targeting problem. Capped out means a budget or efficiency problem — and even then I would rather cut the wasteful keywords than pour more money into the same leak.`,
    keyPoints: [
      "Bid wins auctions, budget sets duration — stated plainly",
      "Diagnoses using whether the campaign hits its cap",
      "Mentions the cost of going dark during high-converting hours",
      "Prefers fixing waste before adding budget",
    ],
    redFlags: [
      "Says raise both whenever performance is poor",
      "Does not check budget utilisation before recommending a change",
      "Cannot explain what happens when a campaign exhausts its budget",
    ],
    followUps: [
      "The campaign spends 60 percent of its budget daily. What do you change?",
      "How do you set the daily budget for a brand-new campaign?",
    ],
  },
  {
    id: "organic-rank-and-ppc",
    category: "Fundamentals",
    level: "intermediate",
    tags: ["organic rank", "flywheel", "velocity", "tacos"],
    answerSeconds: 75,
    question: "How does PPC affect organic ranking on Amazon?",
    idealAnswer: `Indirectly, through sales velocity and keyword relevance. Amazon ranks organically on what converts for a search term — units sold, conversion rate, click-through, and the history of that keyword against that ASIN. Ads do not buy rank directly, but they buy the sales and the keyword association that rank is calculated from.

The practical shape: run ads on a keyword, take orders on that keyword, the ASIN starts appearing organically for it, and organic gradually absorbs some of the volume. That is when ACoS looks worse and TACoS gets better, which is exactly the pattern I want during a launch.

Two honest caveats. A poor listing makes this backfire — paid clicks that do not convert teach Amazon the ASIN is a bad answer for that term. And the effect decays: rank bought purely with ads does not always stay bought once spend stops.

So I track organic rank on the top ten keywords separately from ACoS. ACoS up while organic rank climbs is a win, not a problem.`,
    keyPoints: [
      "Mechanism is velocity and relevance, not a direct payment for rank",
      "Describes the launch pattern of ACoS rising while TACoS falls",
      "Flags that a poor listing makes paid traffic counterproductive",
      "Tracks organic rank as its own KPI",
    ],
    redFlags: [
      "Claims Amazon directly rewards ad spend with organic rank",
      "Recommends heavy spend before the listing converts",
      "Has no way to measure organic rank at all",
    ],
    followUps: [
      "How do you track organic rank week to week without a paid tool?",
      "Would you run a keyword at 80 percent ACoS to hold page one? When?",
    ],
  },
  {
    id: "sponsored-display-audiences",
    category: "Fundamentals",
    level: "intermediate",
    tags: ["sponsored display", "retargeting", "audiences", "contextual"],
    answerSeconds: 75,
    question: "What can Sponsored Display target, and which setting would you start with?",
    idealAnswer: `Sponsored Display has two families. **Contextual targeting** places the ad against products and categories, much like product targeting in Sponsored Products, but it can also serve off Amazon. **Audience targeting** reaches people by behaviour: views remarketing for shoppers who looked at the detail page and did not buy, purchases remarketing for repeat and complementary buying, and Amazon-built in-market and lifestyle segments.

For most accounts I start with **views remarketing**. It is usually the cheapest incremental sale in the account — the shopper has already seen the product, the audience is small, and ROAS beats cold targeting. I run a 30-day lookback and keep the budget deliberately capped.

Second priority is defending my own detail pages with contextual targeting so competitors do not own the placements under my listing.

I treat Sponsored Display as an accelerator once Sponsored Products is healthy, not a first move. On a brand-new ASIN there is no audience to remarket to yet.`,
    keyPoints: [
      "Separates contextual from audience targeting correctly",
      "Names views remarketing as the highest-return starting point",
      "Mentions defending own detail pages",
      "Sequences Sponsored Display after Sponsored Products is working",
    ],
    redFlags: [
      "Thinks Sponsored Display is keyword targeted",
      "Launches remarketing on an ASIN with no traffic history",
      "Cannot name a single audience type",
    ],
    followUps: [
      "How do you judge whether retargeting is incremental rather than stealing organic sales?",
      "What lookback window do you use, and why?",
    ],
  },
  {
    id: "sponsored-brands-video",
    category: "Fundamentals",
    level: "beginner",
    source: "Technical Knowledge Q15",
    tags: ["sponsored brands", "video", "creative", "ctr"],
    answerSeconds: 60,
    question: "How does Sponsored Brands Video differ from a standard Sponsored Products ad?",
    idealAnswer: `Sponsored Brands Video is an auto-playing, muted video inside the search results that links straight to the detail page. It needs Brand Registry and a video asset, and it usually carries a higher CTR than a static ad because motion stops the scroll.

It earns its place when the product needs demonstration — anything a shopper has to see working to believe — or when the search page is a wall of near-identical images where a static ad simply blends in.

What I check before recommending it: the first two seconds must show the product in use with no logo intro, there must be on-screen text because the video plays muted, and the length should sit between 15 and 30 seconds.

Cost-wise, CPC is often lower than Sponsored Products on the same term while CTR runs higher, so it can be one of the more efficient placements in the account. It is still judged on sales and ACoS, though, never on views.`,
    keyPoints: [
      "Auto-plays in search, muted, requires Brand Registry",
      "Names the product types where video earns its place",
      "Knows the creative rules: fast hook, on-screen text, short length",
      "Judges it on sales metrics rather than video metrics",
    ],
    redFlags: [
      "Thinks video ads are judged on view count",
      "Does not know it plays without sound",
      "Recommends it for an account with no Brand Registry",
    ],
    followUps: [
      "What would you put in the first three seconds for a kitchen gadget?",
      "How would you test two videos against each other on the same keywords?",
    ],
  },
  {
    id: "amazon-attribution-basics",
    category: "Fundamentals",
    level: "intermediate",
    source: "Technical Knowledge Q9",
    tags: ["amazon attribution", "external traffic", "measurement"],
    answerSeconds: 75,
    question: "How does Amazon Attribution work, and when would you use it?",
    idealAnswer: `Amazon Attribution issues tracking tags for traffic sent to Amazon from outside it — Google Ads, Meta, email, influencers, a blog. You append the tag to the destination URL and Amazon reports clicks, detail page views, add-to-carts, purchases and sales for that source.

Without it, external traffic is a black hole. The seller sees spend on the Google side and sales on the Amazon side, and nobody can join the two.

Two reasons I push for it. Measurement first: it is the only way to say whether a Meta campaign at a 12 dollar cost per acquisition is actually profitable. Then the Brand Referral Bonus, which credits back roughly ten percent of sales driven by tagged external traffic and materially changes the maths on off-Amazon spend.

It needs Brand Registry, and setup is per channel and per campaign, so I insist on a naming convention before the first tag is created. Without one the reporting is unusable inside a month.`,
    keyPoints: [
      "Tracks off-Amazon traffic via tagged URLs and reports the funnel",
      "Explains why external spend and Amazon sales cannot otherwise be joined",
      "Mentions the Brand Referral Bonus",
      "Raises naming conventions and Brand Registry as prerequisites",
    ],
    redFlags: [
      "Thinks Amazon Attribution is an ad type you buy",
      "Believes it reports on Sponsored Products performance",
      "No awareness of the Brand Referral Bonus on a brand-registered account",
    ],
    followUps: [
      "A client runs Google Shopping to their Amazon listing. What do you set up first?",
      "How would you structure tags for three channels and six ASINs?",
    ],
  },
  {
    id: "new-to-brand-metric",
    category: "Fundamentals",
    level: "intermediate",
    source: "Technical Knowledge Q12",
    tags: ["new to brand", "metrics", "brand growth"],
    answerSeconds: 60,
    question: "What is the New-to-Brand metric, and when does it matter?",
    idealAnswer: `New-to-Brand counts orders from customers who have not bought anything from that brand on Amazon in the previous twelve months. It reports as orders, sales and a percentage of total, and it is available on Sponsored Brands, Sponsored Display and DSP.

It matters whenever the goal is growth rather than harvesting. On a launch or a category expansion, a campaign at 45 percent ACoS with 80 percent new-to-brand is doing a completely different job from one at 20 percent ACoS that is mostly repeat buyers. Judging them on ACoS alone kills the wrong one.

It is also the honest test of brand-name bidding. If branded campaigns show a low new-to-brand share, most of those sales were coming anyway and the spend is defensive rather than incremental.

For consumables I pair it with repeat purchase rate: an expensive first order can still be profitable once the second and third orders are counted.`,
    keyPoints: [
      "Defines it as a first purchase from the brand in a twelve-month window",
      "Uses it to protect growth campaigns that ACoS alone would condemn",
      "Applies it to test whether branded spend is incremental",
      "Connects it to lifetime value on consumables",
    ],
    redFlags: [
      "Thinks it means customers who are new to Amazon",
      "Ignores it and optimises every campaign to one ACoS target",
      "Cannot say which ad types report it",
    ],
    followUps: [
      "Branded search shows 15 percent new-to-brand. What do you conclude?",
      "How would you use this metric in a monthly client report?",
    ],
  },
  {
    id: "dsp-versus-sponsored-ads",
    category: "Fundamentals",
    level: "advanced",
    tags: ["dsp", "programmatic", "sponsored ads", "strategy"],
    answerSeconds: 75,
    question: "What is Amazon DSP, and how is it different from Sponsored Ads?",
    idealAnswer: `Sponsored Ads are self-service, cost-per-click and demand-capture: somebody searches, you bid, you pay per click. **DSP** is programmatic display and video bought on a cost-per-thousand-impressions basis using Amazon's shopping and streaming audience data, running across Amazon, Fire TV, Twitch, IMDb and third-party exchanges.

The differences that matter operationally: DSP is priced per impression rather than per click, it reaches people who are not searching yet, it retargets at a much finer grain than Sponsored Display, and access has historically required either a managed-service minimum in the tens of thousands or an agency seat.

When I would push for it: an established brand whose Sponsored Ads programme has saturated search, or a brand that needs upper-funnel reach before a launch. I would not recommend it to a seller doing 20,000 dollars a month who still has obvious waste in Sponsored Products.

As a VA I would expect to support DSP reporting and audience briefs rather than own the buying.`,
    keyPoints: [
      "CPM and upper funnel versus CPC and demand capture",
      "Names inventory beyond Amazon search results",
      "Realistic about minimum spend and access",
      "Sequences DSP after Sponsored Ads are efficient",
    ],
    redFlags: [
      "Describes DSP as just another Sponsored ad type",
      "Recommends DSP to a small seller as a fix for high ACoS",
      "Claims DSP experience that collapses after one follow-up question",
    ],
    followUps: [
      "How would you measure DSP when most of its value is not last-click?",
      "What would you want in place before a brand spends its first DSP dollar?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Campaign Structure
   * ---------------------------------------------------------------- */
  {
    id: "skag-vs-themed-ad-groups",
    category: "Campaign Structure",
    level: "advanced",
    tags: ["skag", "ad groups", "structure", "bidding"],
    answerSeconds: 90,
    question: "Single-keyword ad groups or themed ad groups? Defend your choice.",
    idealAnswer: `It depends on spend, and I would say so rather than picking a side on principle.

**Single keyword ad groups** give one bid per keyword, clean attribution and clean negatives. They are right for the top ten to twenty terms that carry most of the revenue, because those deserve individual bids and individual placement multipliers.

**Themed ad groups** of five to fifteen closely related keywords are right for the long tail. With a 600 dollar monthly budget, splitting 200 keywords into 200 ad groups means every one of them gathers three clicks a month and never accumulates enough data to make a decision on.

So the structure I actually build: one manual exact campaign holding SKAG-style ad groups for the proven head terms, one manual phrase or broad campaign with themed ad groups for the mid-tail, and an auto campaign feeding both.

The thing I will not do is build 200 ad groups because a blog post said SKAG is best practice, then spend an hour a week maintaining a structure that produces no statistically usable data.`,
    keyPoints: [
      "Answers with a trade-off rather than dogma",
      "Ties the choice to budget and data volume per ad group",
      "Proposes a hybrid: SKAG for head terms, themed for the tail",
      "Mentions the maintenance cost of over-splitting",
    ],
    redFlags: [
      "Insists SKAG is always correct, regardless of budget",
      "Cannot explain why data volume per ad group matters",
      "Has no opinion at all and waits to be told",
    ],
    followUps: [
      "At what monthly spend would you start splitting head terms out?",
      "How do the negatives change between the two structures?",
    ],
  },
  {
    id: "auto-to-manual-harvest-structure",
    category: "Campaign Structure",
    level: "intermediate",
    tags: ["harvesting", "auto campaign", "structure", "search terms"],
    answerSeconds: 90,
    question: "Draw me the campaign structure you would build for one new product.",
    idealAnswer: `Four campaigns, in this order.

**1. Auto — discovery.** Low bid, modest budget, all four targeting groups on, ideally split so close match can be bid separately from complements. Its only job is to surface search terms.

**2. Manual broad or phrase — research.** The twenty to thirty keywords from keyword research that I am confident about, at a bid around 75 percent of the suggested bid. This is the second discovery net.

**3. Manual exact — performance.** Empty at launch. Everything that converts twice in auto or research gets promoted here with its own bid, and gets negated back in the campaign it came from.

**4. Product targeting — conquest and defence.** Competitor ASINs I can beat on price or rating, plus my own ASINs for defence.

Budget flows toward campaign three over time: it starts near zero and ends up holding 50 to 70 percent of spend. Naming is strict so bulk-file work is possible later, something like SP-Exact-ProductA-Performance.`,
    keyPoints: [
      "Names four campaigns with distinct jobs",
      "Describes the promotion rule from discovery into exact",
      "Negates harvested terms in the source campaign",
      "Mentions naming conventions and the shift of budget over time",
    ],
    redFlags: [
      "Builds one campaign with everything in it",
      "No promotion criteria — harvests whatever looks interesting",
      "Never negates, so campaigns cannibalise each other",
    ],
    followUps: [
      "What is your promotion threshold — clicks, orders, or both?",
      "How would this change for a product with 400 relevant keywords?",
    ],
  },
  {
    id: "campaign-naming-convention",
    category: "Campaign Structure",
    level: "intermediate",
    tags: ["naming", "structure", "bulk files", "process"],
    answerSeconds: 60,
    question: "What naming convention do you use, and why does it matter?",
    idealAnswer: `I use a fixed order of fields separated by a single delimiter, for example SP-EX-NAILCLIPPER-PERF-US, reading as ad type, match type, product, campaign role, marketplace.

It matters for three concrete reasons. Filtering: in a 90-campaign account I can pull every exact-match performance campaign in one search. Bulk files: consistent names let me sort and slice a 5,000-row bulk sheet in Excel without reading every line. Handover: the next person, or the client, can understand the account without a call.

Two rules. Decide the convention before the first campaign is built, because renaming later breaks saved reports and any automation keyed on names. And never encode anything that changes, such as a bid or a date, in the name.

On inherited accounts I do not rename everything on day one. I document the existing convention, use it for anything new, and propose a migration once I have earned enough trust to touch 60 campaigns at once.`,
    keyPoints: [
      "Gives an actual concrete pattern, not just the idea of one",
      "Justifies it with filtering, bulk work and handover",
      "Sets the convention before building",
      "Cautious about renaming an inherited account",
    ],
    redFlags: [
      "No convention, names campaigns ad hoc",
      "Puts bids or dates in campaign names",
      "Would rename 60 campaigns on day one without telling anyone",
    ],
    followUps: [
      "How do you name ad groups inside a themed campaign?",
      "What breaks when you rename a campaign?",
    ],
  },
  {
    id: "portfolios-and-budget-control",
    category: "Campaign Structure",
    level: "intermediate",
    tags: ["portfolios", "budget", "structure", "pacing"],
    answerSeconds: 60,
    question: "How do you use portfolios, and how do they help with budget control?",
    idealAnswer: `Portfolios are grouping containers for campaigns, with an optional budget cap across the group and date ranges. I group them the way the client thinks about the business — usually by product line or brand, sometimes by campaign role.

Where they genuinely earn their place: a monthly budget cap across a whole product line. If a client says product line A gets 3,000 dollars this month, a portfolio cap enforces it even if fifteen individual campaign budgets add up to more. That has saved me from an overspend more than once during Q4 when bids were moving daily.

They also make reporting simple: performance by portfolio maps straight onto the way the client sees their catalogue, so the monthly report writes itself.

What they do not do is optimise anything or move budget between campaigns. A portfolio cap that hits stops every campaign in the group, so I set alerts before the cap rather than discovering it in the morning.`,
    keyPoints: [
      "Knows portfolios are grouping plus an optional budget cap",
      "Groups them the way the client thinks about the catalogue",
      "Gives a concrete overspend-prevention use case",
      "Knows the failure mode when a cap is reached",
    ],
    redFlags: [
      "Thinks portfolios redistribute budget automatically",
      "Never uses them, so the account has no grouping at all",
      "Sets a portfolio cap and never monitors it",
    ],
    followUps: [
      "Portfolio cap versus campaign budgets — which do you set first?",
      "How do you group portfolios for a seller with three brands and 40 ASINs?",
    ],
  },
  {
    id: "structure-for-catalogue-of-forty",
    category: "Campaign Structure",
    level: "advanced",
    tags: ["structure", "catalogue", "prioritisation", "budget"],
    answerSeconds: 90,
    question: "A client has 40 ASINs and 4,000 dollars a month. How do you structure the account?",
    idealAnswer: `I would not advertise 40 ASINs on 4,000 dollars. That is 100 dollars per product per month, roughly three dollars a day, which buys two or three clicks in most categories and never produces a decision.

First I segment the catalogue. Pull 90 days of Business Reports and rank ASINs by units, conversion rate and margin. That usually yields three tiers: five to eight **heroes** that already convert, ten or so **contenders** with potential, and the rest, which are **long tail**.

Then I allocate. Roughly 70 percent to heroes with full structure — auto, research, exact, product targeting. Around 20 percent to contenders with a slimmer build, usually auto plus exact. Ten percent as a rotating test budget where two long-tail ASINs at a time get 30 days to prove something.

The rest get no ads and rely on organic and halo. I would say that to the client directly, with the numbers, because the alternative is 40 underfunded campaigns and no insight anywhere.`,
    keyPoints: [
      "Refuses to spread the budget evenly and explains the arithmetic",
      "Segments the catalogue on real data before structuring",
      "Gives a concrete allocation split with campaign builds per tier",
      "Commits to telling the client which ASINs get nothing",
    ],
    redFlags: [
      "Splits 4,000 dollars across 40 ASINs evenly",
      "No data-driven segmentation, picks favourites by gut",
      "Will not tell the client that some products should not be advertised",
    ],
    followUps: [
      "How do you pick the rotating test ASINs each month?",
      "The client insists every ASIN gets ads. What do you do?",
    ],
  },
  {
    id: "two-hundred-campaigns-one-dollar-budgets",
    category: "Campaign Structure",
    level: "scenario",
    source: "Scenario-Based Q24",
    tags: ["audit", "consolidation", "budget", "inherited account"],
    answerSeconds: 90,
    question:
      "A new client shows you their account: 200 campaigns, most on a one dollar daily budget. Your reaction?",
    idealAnswer: `This is the classic over-fragmentation failure. Two hundred campaigns at a dollar a day is 200 dollars of theoretical spend producing no usable data anywhere, because no single campaign gets enough clicks to judge.

What I would do, in order. **Audit first**: export 90 days of campaign data and sort by spend. Typically 15 campaigns carry 80 percent of the spend and 120 have had zero impressions in 30 days. **Kill the dead ones** — zero impressions, zero spend, no reason to exist. **Consolidate** related campaigns into properly themed ones, keeping the keywords and negatives. **Fund what is left**: a meaningful campaign needs enough budget for ten or more clicks a day, which at a one dollar CPC means ten to twenty dollars a day, not one.

I would target something like 12 to 20 live campaigns for a catalogue this size.

And I would not do it in one night. I would document the plan, get sign-off, screenshot the before state, and migrate in phases so anything that goes wrong is traceable.`,
    keyPoints: [
      "Names the real problem: no campaign accumulates enough data",
      "Audits and sorts by spend before touching anything",
      "Gives a concrete minimum daily budget with the reasoning",
      "Phases the change, documents it, and gets sign-off",
    ],
    redFlags: [
      "Deletes campaigns immediately with no export or screenshots",
      "Rebuilds the account from scratch in one sitting",
      "Cannot say what a minimum viable campaign budget is",
    ],
    followUps: [
      "Which campaigns would you keep untouched during the migration?",
      "How do you preserve the keyword history when consolidating?",
    ],
  },
  {
    id: "sp-sb-cannibalisation",
    category: "Campaign Structure",
    level: "advanced",
    source: "Scenario-Based Q28",
    tags: ["cannibalisation", "sponsored brands", "sponsored products", "overlap"],
    answerSeconds: 90,
    question:
      "You run Sponsored Brands and Sponsored Products on the same product. How do you prevent cannibalisation?",
    idealAnswer: `First, I would be precise about what cannibalisation means here. Two of my own ads on the same search page do not bid against each other in the same auction — Amazon takes the stronger one per placement — but they do compete for the same budget and can duplicate demand I would have captured anyway.

How I separate them. Give each a distinct job: Sponsored Products takes exact match on high-intent converting terms; Sponsored Brands takes category and upper-funnel terms plus brand defence, where the headline and Storefront actually add value. Use different match types where they overlap. Check the search term reports side by side monthly for terms both are paying for, and choose a home for each.

Then I measure rather than assume. New-to-brand share on Sponsored Brands is the key number — if it is high, SB is buying new customers rather than re-buying SP's sales.

The test that settles it: pause SB on the overlapping terms for two weeks and watch total sales, not SB sales. If total holds, SB was duplicating. If total drops, it was incremental.`,
    keyPoints: [
      "Corrects the premise: your own ads do not outbid each other in one auction",
      "Assigns distinct roles and match types to each ad type",
      "Uses new-to-brand share as the incrementality signal",
      "Proposes a holdout test measured on total sales",
    ],
    redFlags: [
      "Believes the two campaigns bid against each other and raises bids to compensate",
      "Never compares the two search term reports",
      "Measures the test on the paused campaign's own sales",
    ],
    followUps: [
      "How long would you run that holdout, and what would change your mind?",
      "Same question for Sponsored Display retargeting versus Sponsored Products.",
    ],
  },
  {
    id: "restructure-inherited-account",
    category: "Campaign Structure",
    level: "scenario",
    source: "VA-Specific Q56",
    tags: ["inherited account", "audit", "restructure", "process"],
    answerSeconds: 90,
    question:
      "A client gives you access and you find 50-plus campaigns with no structure. What do you do?",
    idealAnswer: `I do not panic and I do not start changing things.

**Capture the before state.** Export bulk files and 90 days of campaign, keyword, search term and placement reports. Screenshot the campaign manager. If anything goes wrong later I need to prove what it looked like when I arrived.

**Audit.** Classify every campaign as performing, salvageable or dead. Dead means no impressions or no spend in 30 days. I also list what exists that should not, and what does not exist that should — usually no negatives, no exact-match performance campaigns, no brand defence.

**Write the plan.** A one-page document: current state, proposed structure, migration order, expected disruption, timeline. I send it to the client before anything changes.

**Migrate in phases** over three to four weeks. Week one, negatives and dead campaign cleanup, which is low risk and shows an immediate saving. Week two, build the new exact-match structure alongside the old. Week three, shift budget across. Week four, retire what is left.

Never turn everything off at once. The account still has to earn while it is being rebuilt.`,
    keyPoints: [
      "Exports and screenshots before changing anything",
      "Classifies campaigns instead of reacting to the mess",
      "Writes a plan the client signs off on",
      "Phases the migration and keeps revenue running throughout",
    ],
    redFlags: [
      "Rebuilds the account overnight without a backup or approval",
      "Pauses everything while the new structure is built",
      "No documentation, so nobody can tell what changed or why",
    ],
    followUps: [
      "What exactly do you do in week one to show an early win?",
      "The client says just fix it, do not send me a plan. Now what?",
    ],
  },
  {
    id: "variations-parent-child-structure",
    category: "Campaign Structure",
    level: "advanced",
    tags: ["variations", "parent child", "structure", "catalogue"],
    answerSeconds: 75,
    question: "How do you advertise a product with twelve size and colour variations?",
    idealAnswer: `I do not advertise all twelve. Amazon shows the ad for the child ASIN I target, but reviews and much of the ranking signal sit at the parent, so the practical approach is to concentrate spend and let the variation picker do the rest.

The structure I use: identify the two or three children that actually sell — from Business Reports by child ASIN — and advertise those. They inherit the parent's reviews, so they convert far better than an obscure variant. Shoppers who want a different colour switch on the detail page, and that sale still counts.

Where I do split: when variations have genuinely different search intent or a different price point. *Kitchen scale black* and *kitchen scale stainless steel* are different searches, so they get their own ad groups with matching keywords.

I also watch for the trap: advertising a size that is chronically out of stock. Every click lands on a page defaulting to an unavailable variant, and the money is gone.`,
    keyPoints: [
      "Concentrates spend on the best-selling children rather than all variants",
      "Knows the variation picker recaptures sales of other children",
      "Splits only where search intent or price genuinely differs",
      "Flags the out-of-stock variant trap",
    ],
    redFlags: [
      "Builds twelve identical campaigns, one per child ASIN",
      "Does not know which child ASIN the ad actually points at",
      "Ignores stock status when choosing what to advertise",
    ],
    followUps: [
      "How do you pick which children get the budget?",
      "The best-selling child goes out of stock on Friday. What do you do?",
    ],
  },
  {
    id: "brand-defence-campaign-build",
    category: "Campaign Structure",
    level: "intermediate",
    tags: ["brand defence", "branded keywords", "structure"],
    answerSeconds: 75,
    question: "How do you build a brand defence campaign, and how do you justify its cost?",
    idealAnswer: `The build is simple. One campaign, exact match on the brand name, brand-plus-product combinations and the common misspellings. Bids high enough to hold top of search, usually with a top-of-search placement multiplier, because being second on your own name is worse than not showing at all. Then a Sponsored Brands campaign on the same terms to own the banner, and Sponsored Display on my own detail pages.

Justifying it is the harder half, because branded terms show a flattering ACoS — often eight to fifteen percent — which looks like a win but partly rebuys organic sales.

So I frame it honestly. Part of that spend is insurance: competitors bid on your brand name and without a defence they intercept traffic you already paid to create. I would size it as a small fixed percentage of budget, typically five to ten percent, rather than scaling it just because the ACoS looks good.

The test if the client pushes back: pause it for two weeks and watch total branded sales and competitor presence on the search page.`,
    keyPoints: [
      "Concrete build: exact brand terms, misspellings, placement multiplier, SB and SD layers",
      "Honest that branded ACoS overstates incrementality",
      "Caps branded spend as a share of budget",
      "Offers a holdout test to settle the argument",
    ],
    redFlags: [
      "Scales branded spend aggressively because its ACoS looks best in the account",
      "Claims brand defence is pure profit",
      "Has no way to test whether it is incremental",
    ],
    followUps: [
      "A competitor is not bidding on your brand. Do you still defend?",
      "What new-to-brand share would you expect on branded search?",
    ],
  },
  {
    id: "keywords-per-ad-group",
    category: "Campaign Structure",
    level: "intermediate",
    tags: ["ad groups", "keywords", "structure", "relevance"],
    answerSeconds: 60,
    question: "How many keywords do you put in one ad group, and why?",
    idealAnswer: `Between five and fifteen for a themed ad group, and one for a head-term ad group. The number itself matters less than the rule behind it: every keyword in an ad group must be well served by the same ad copy, the same landing ASIN and roughly the same bid.

The reason is budget and attribution. All keywords in an ad group share the ad and compete for the same campaign budget, so a broad keyword with heavy volume will eat the budget of the eight precise keywords sitting next to it. Splitting by intent keeps that from happening.

Signs an ad group is too big: one keyword takes more than half the spend, the keywords need different bids to hit the same ACoS, or the ad group has both research and performance terms in it.

Signs it is too small: ad groups with fewer than ten clicks a month, and an hour a week spent maintaining a structure that has not produced a decision in two months.`,
    keyPoints: [
      "Gives a number and the principle behind it",
      "Explains budget competition within an ad group",
      "Lists symptoms of an ad group that is too big",
      "Lists symptoms of over-splitting",
    ],
    redFlags: [
      "Dumps 200 keywords into one ad group",
      "Cannot explain why keywords in an ad group should be related",
      "Splits so finely that nothing accumulates data",
    ],
    followUps: [
      "One keyword takes 70 percent of the ad group's spend. What do you do?",
      "Would you mix match types in one ad group?",
    ],
  },
  {
    id: "isolating-a-test",
    category: "Campaign Structure",
    level: "advanced",
    tags: ["testing", "experiments", "structure", "measurement"],
    answerSeconds: 75,
    question: "How do you structure an account so you can actually test something?",
    idealAnswer: `The rule is one variable, one window, one place to read the result.

Structurally that means a dedicated test campaign rather than a change made inside a campaign that is doing three other jobs. If I am testing whether a 30 percent top-of-search multiplier pays for itself, I need a campaign where nothing else moves for the test period, with its own budget so it is not starved by a neighbour.

Then I fix the window before I start: fourteen days minimum for a bid or placement test, longer if daily clicks are low. I write down the hypothesis, the metric that decides it, and the threshold, before I see any data. Otherwise I will find a way to read whatever happened as a success.

Two practical cautions. Do not test during Prime Day, Black Friday or a stock-out, because the baseline is meaningless. And stack nothing else onto the campaign mid-test, including the tempting small bid tweak on day four.

Where a proper split is available, such as Manage Your Experiments for listing content, I use that instead of a before-and-after, because before-and-after confounds the change with seasonality.`,
    keyPoints: [
      "One variable, isolated campaign, fixed window",
      "Hypothesis and success threshold written before the test runs",
      "Avoids testing during distorted periods",
      "Prefers a real split test to before-and-after where available",
    ],
    redFlags: [
      "Changes bids, budget and keywords at once and calls it a test",
      "Stops a test early because the first three days looked good",
      "Runs a before-and-after across Black Friday and reports the lift",
    ],
    followUps: [
      "Fourteen days in, the test is ahead but not clearly. What do you do?",
      "How many clicks would you want before calling a CVR difference real?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Optimization
   * ---------------------------------------------------------------- */
  {
    id: "keyword-eighty-acos-thirty-five-margin",
    category: "Optimization",
    level: "intermediate",
    source: "Technical Knowledge Q5",
    tags: ["bids", "acos", "decision rules", "negatives"],
    answerSeconds: 90,
    question:
      "A keyword has 50 clicks, 2 orders and 80 percent ACoS. The product margin is 35 percent. What do you do?",
    idealAnswer: `First the maths. Two orders in 50 clicks is a 4 percent conversion rate — below average but not dead. At 80 percent ACoS against a 35 percent break-even, this keyword loses about 45 cents of every sales dollar.

So it needs to change, but I do not pause it yet. Fifty clicks is thin, and the keyword may be relevant enough to fix rather than kill.

My sequence. Cut the bid by 25 to 30 percent — at 80 percent ACoS with some conversion happening, the bid is the most likely culprit. Check the placement report: if the spend is concentrated in top of search, a placement adjustment may be cheaper than a bid cut. Check the search term report if this is not exact match, because the keyword may be fine while the terms it pulls are not. And check whether the listing actually matches the keyword's intent.

Then I give it two weeks or another 40 to 50 clicks. If ACoS is trending toward 40 percent, keep going. If it is still above 70, negate it and move the budget to something that works.`,
    keyPoints: [
      "Calculates CVR from the given numbers before deciding",
      "Compares ACoS to break-even rather than to an abstract target",
      "Reduces the bid instead of pausing on 50 clicks",
      "Sets an explicit review window and an exit rule",
    ],
    redFlags: [
      "Pauses immediately on 50 clicks",
      "Raises the bid to get more data",
      "Never states a follow-up window, so the decision is never revisited",
    ],
    followUps: [
      "Same numbers, but it is your top organic ranking keyword. Change anything?",
      "How would 50 clicks and zero orders change your answer?",
    ],
  },
  {
    id: "high-cvr-high-acos",
    category: "Optimization",
    level: "intermediate",
    source: "Scenario-Based Q23",
    tags: ["bids", "cvr", "acos", "placements"],
    answerSeconds: 75,
    question:
      "A keyword converts at 20 percent but ACoS is 45 percent, above break-even. What do you do?",
    idealAnswer: `High conversion rate with high ACoS is almost always a price problem, not a relevance problem. The keyword works — people who click, buy. I am simply paying too much per click.

So I cut the bid 15 to 20 percent and watch two things: whether ACoS falls toward break-even, and whether order volume holds. If both hold, repeat once. If volume collapses, the bid was buying placement rather than just clicks, and I have found the edge of the profitable range — I move back up halfway.

Before the second cut I check placements. A 20 percent conversion rate at top of search often justifies its premium, while the same keyword in rest of search may be carrying the cost. Trimming the top-of-search multiplier can be smarter than cutting the base bid.

The judgement call: if this is a keyword that holds organic rank, I will accept slightly above break-even and report it as a deliberate rank investment rather than a leak.`,
    keyPoints: [
      "Diagnoses high CVR plus high ACoS as a CPC problem",
      "Cuts the bid in measured steps and checks volume, not just ACoS",
      "Checks placement data before cutting again",
      "Allows for a deliberate above-break-even decision on a rank keyword",
    ],
    redFlags: [
      "Pauses a keyword converting at 20 percent",
      "Cuts the bid by 60 percent in one move",
      "Only watches ACoS and misses the volume collapse",
    ],
    followUps: [
      "You cut 20 percent and orders halved. What now?",
      "How do you know whether the keyword is holding organic rank?",
    ],
  },
  {
    id: "search-term-harvest-rules",
    category: "Optimization",
    level: "intermediate",
    tags: ["search terms", "harvesting", "negatives", "thresholds"],
    answerSeconds: 90,
    question: "What are your exact rules for harvesting and negating search terms?",
    idealAnswer: `I keep them written down so they are consistent week to week and anyone can audit them.

**Harvest** when a search term has two or more orders, or one order with ACoS below target, and it is genuinely relevant to the listing. It moves to manual exact with a bid around the current CPC plus ten to fifteen percent, and it gets negated as exact in the campaign it came from.

**Negate** when a term has spent more than twice the target cost per acquisition with no orders, or ten or more clicks with no orders and no relevance. Negative exact for a single bad term, negative phrase for a whole wrong family such as *for cats* on a dog product.

**Leave alone** anything with fewer than five clicks. That is noise, and reacting to it is how accounts end up with 400 pointless negatives.

I run this weekly on the seven-day report and monthly on the 30-day report, because weekly catches spikes and monthly catches the slow bleed that never looks urgent.`,
    keyPoints: [
      "States numeric thresholds rather than vague judgement",
      "Harvest rule includes the negation step in the source campaign",
      "Has an explicit do-nothing band for low click counts",
      "Runs two cadences: weekly and monthly",
    ],
    redFlags: [
      "Negates on one or two clicks with no spend",
      "Harvests everything that got a single order",
      "Has no written rules, so decisions change week to week",
    ],
    followUps: [
      "Cost per acquisition target is 12 dollars. A term has spent 19 dollars, no orders. Act?",
      "How do you handle a term that converts but at triple the target ACoS?",
    ],
  },
  {
    id: "bid-change-size-and-cadence",
    category: "Optimization",
    level: "intermediate",
    tags: ["bids", "cadence", "process", "optimisation"],
    answerSeconds: 75,
    question: "How much do you move a bid, and how often?",
    idealAnswer: `Ten to twenty percent per move as a default, up to 30 percent when the evidence is strong, and I avoid anything larger because a 50 percent swing makes the result unreadable — I cannot tell whether performance changed because of my bid or because the auction moved.

Cadence: weekly for most keywords, every three or four days for high-volume keywords in a launch, monthly for the long tail. What matters more than the interval is waiting for enough data between moves. A bid changed on Monday and changed again on Wednesday has told me nothing.

The one exception is damage control. If a keyword spends 40 dollars overnight with no orders, I cut hard the same day and investigate afterwards.

I also keep a change log with date, keyword, old bid, new bid and reason. It costs thirty seconds and it is the only way to answer the question every client eventually asks: what did you change before this happened?`,
    keyPoints: [
      "Gives a percentage range and explains why large swings are unreadable",
      "Different cadences for different keyword volumes",
      "Waits for data between moves on the same keyword",
      "Keeps a change log with reasons",
    ],
    redFlags: [
      "Adjusts every bid daily",
      "Doubles or halves bids as a first response",
      "No record of what changed, so nothing can be traced",
    ],
    followUps: [
      "How many clicks do you want between two bid changes on one keyword?",
      "What is in your change log, and where does it live?",
    ],
  },
  {
    id: "how-much-data-before-deciding",
    category: "Optimization",
    level: "intermediate",
    tags: ["data", "thresholds", "statistics", "decision rules"],
    answerSeconds: 75,
    question: "How much data do you need before you judge a keyword?",
    idealAnswer: `I work from clicks, not days, because a keyword with three clicks a week is not ready on day fourteen just because two weeks passed.

Rough thresholds. For a pause or negate decision on a zero-order keyword: at least ten clicks, and I prefer to see spend of two to three times the target cost per acquisition. For a bid change on a converting keyword: 20 to 30 clicks. For a confident conversion rate read: 100 clicks or more, which most long-tail keywords never reach.

The reason is simple probability. If a product converts at ten percent, then across ten clicks there is roughly a 35 percent chance of seeing zero orders purely by luck. Pausing on that is throwing away a good keyword a third of the time.

Where clicks are scarce I roll up: judge the ad group or the match type rather than the individual keyword, and accept that tail decisions are made in batches.

I also apply a floor of seven days regardless of clicks, so weekday and weekend behaviour are both represented.`,
    keyPoints: [
      "Thinks in clicks rather than elapsed days",
      "Different thresholds for different decisions",
      "Explains the probability of a false negative at low click counts",
      "Rolls up to ad group level when clicks are scarce",
    ],
    redFlags: [
      "Judges keywords after two or three clicks",
      "Uses a fixed number of days regardless of traffic",
      "Cannot explain why small samples mislead",
    ],
    followUps: [
      "Eight clicks, zero orders, 14 dollars spent, target CPA 10 dollars. Decision?",
      "How does your threshold change on a 90 dollar product?",
    ],
  },
  {
    id: "dynamic-bidding-strategies",
    category: "Optimization",
    level: "advanced",
    tags: ["bidding strategy", "dynamic bids", "placements"],
    answerSeconds: 90,
    question: "Down only, up and down, or fixed bids? When do you use each?",
    idealAnswer: `**Dynamic down only** lowers the bid in real time when Amazon predicts a click is unlikely to convert. It is my default for anything new, anything broad, and any account where protecting spend matters more than volume.

**Dynamic up and down** can raise the bid by up to 100 percent for top of search when conversion looks likely, and lower it otherwise. I move a campaign here once it has a proven conversion history and I want more volume on terms that already work. The caution is that CPC can spike well above the nominal bid, so I lower the base bid by 20 to 30 percent when switching, otherwise spend jumps overnight.

**Fixed** bids exactly what you set, no prediction. I use it for controlled tests where I need a stable input, and occasionally for brand defence where I always want to show regardless of Amazon's prediction.

The pattern in a real account: launch everything on down only, migrate proven exact-match performance campaigns to up and down with a lowered base bid, keep test campaigns fixed.`,
    keyPoints: [
      "Correct behaviour of all three strategies",
      "Knows up and down can raise the bid substantially for top of search",
      "Lowers the base bid when switching to up and down",
      "Maps each strategy to a campaign role",
    ],
    redFlags: [
      "Switches a whole account to up and down without lowering base bids",
      "Thinks dynamic bidding replaces manual bid management",
      "Cannot say which strategy a new campaign should launch on",
    ],
    followUps: [
      "You switched to up and down and CPC rose 60 percent. What do you do?",
      "How does the choice interact with placement multipliers?",
    ],
  },
  {
    id: "placement-vs-bid-adjustments",
    category: "Optimization",
    level: "intermediate",
    source: "Technical Knowledge Q11",
    tags: ["placements", "bid adjustments", "top of search"],
    answerSeconds: 75,
    question: "Explain the difference between placement adjustments and bid adjustments.",
    idealAnswer: `A **bid** is set per keyword or target: this term is worth 1.20 dollars to me. A **placement adjustment** is a percentage multiplier applied to every bid in the campaign for a specific placement — top of search, product pages, or rest of search.

They stack. A 1.00 dollar bid in a campaign with a 50 percent top-of-search multiplier bids up to 1.50 dollars for that placement, and with dynamic up and down on top it can go higher again.

How I use them. The keyword bid expresses the value of the intent. The placement multiplier expresses where that intent converts best, which I read from the placement report: if top of search converts at 14 percent against 6 percent in rest of search, the premium is justified and I push the multiplier. If they convert the same, I do not pay the premium.

The common mistake is raising keyword bids to chase top of search across the board. That inflates the cost of every placement, including the ones that were fine.`,
    keyPoints: [
      "Keyword-level bid versus campaign-level placement multiplier",
      "Explains that the two multiply together, with dynamic bidding on top",
      "Reads the placement report before setting a multiplier",
      "Warns against raising base bids to chase top of search",
    ],
    redFlags: [
      "Thinks placement adjustments are set per keyword",
      "Applies a 100 percent top-of-search multiplier with no placement data",
      "Does not know the three placement buckets",
    ],
    followUps: [
      "Top of search: 18 percent ACoS. Rest of search: 52 percent. What do you do?",
      "How do placement multipliers interact with dynamic up and down?",
    ],
  },
  {
    id: "top-of-search-premium",
    category: "Optimization",
    level: "advanced",
    tags: ["top of search", "placements", "share of voice"],
    answerSeconds: 75,
    question: "When is paying the top-of-search premium worth it?",
    idealAnswer: `Top of search typically costs 30 to 100 percent more per click and typically converts one and a half to three times better. Whether that trade pays depends entirely on the ratio, and the placement report gives it to me directly.

The arithmetic I run per campaign: compare ACoS at top of search with ACoS at rest of search. If top of search is 22 percent and rest of search is 38 percent, top of search is the efficient placement even though the clicks cost more, and the multiplier should go up. If top of search is 60 percent against 30 percent, I am paying a premium for traffic that does not close, and it comes down.

Three cases where I pay the premium even when it is marginally worse: a launch where I am buying rank and visibility, brand defence where second place on my own name is unacceptable, and Q4 peaks where the alternative is being invisible on the highest-traffic days of the year.

I review multipliers monthly, not weekly. Placement data needs volume to be stable.`,
    keyPoints: [
      "Knows the rough cost and conversion premium of top of search",
      "Decides using ACoS by placement, not intuition",
      "Names the strategic exceptions where the premium is worth overpaying",
      "Reviews on a monthly cadence because the data is noisy",
    ],
    redFlags: [
      "Sets a large multiplier by default on every campaign",
      "Never opens the placement report",
      "Adjusts multipliers weekly on tiny samples",
    ],
    followUps: [
      "What minimum click volume do you want before trusting placement ACoS?",
      "How would you use the top-of-search impression share metric here?",
    ],
  },
  {
    id: "high-impressions-low-ctr",
    category: "Optimization",
    level: "intermediate",
    source: "Technical Knowledge Q13",
    tags: ["ctr", "creative", "listing", "diagnosis"],
    answerSeconds: 90,
    question: "A campaign has high impressions but very low CTR. How do you fix it?",
    idealAnswer: `High impressions with low CTR means the ad is being shown and ignored. The auction is not the problem, the offer on the search page is.

I check the search page as a shopper would, on mobile, and compare my result to the ones around it. The usual causes, in the order I find them: the main image is weak or busy at thumbnail size; the price is visibly above the competing results; the review count or star rating is far below neighbours; the title does not contain the words the shopper typed; or the targeting is pulling searches this product does not answer.

The order of fixes matters. Listing and image work first, because a better image lifts CTR on every keyword at once. Then relevance — pull the search term report and negate the terms that are dragging impressions with no clicks. Only after those would I touch bids, and often the right move is down, because impressions with no clicks at top of search are worth less than the same impressions lower on the page.

I also sanity-check that the product is in stock and holding the Buy Box, because losing it changes the ad in ways that kill CTR.`,
    keyPoints: [
      "Reads it as an offer and relevance problem, not a bidding problem",
      "Inspects the live search page and compares to competitors",
      "Orders the fixes: listing, then targeting, then bids",
      "Checks stock and Buy Box status",
    ],
    redFlags: [
      "Raises bids to fix low CTR",
      "Never looks at the live search result page",
      "Blames Amazon rather than the offer",
    ],
    followUps: [
      "Which single listing change usually moves CTR most?",
      "CTR is fine on mobile and poor on desktop. What does that tell you?",
    ],
  },
  {
    id: "impression-share",
    category: "Optimization",
    level: "advanced",
    source: "Technical Knowledge Q14",
    tags: ["impression share", "share of voice", "growth"],
    answerSeconds: 75,
    question: "What is impression share, and how do you improve it?",
    idealAnswer: `Impression share is the impressions you received divided by the impressions you were eligible for. Amazon reports top-of-search impression share on search term data, which is the version I use most because the top slots are where the volume is.

A low share on a keyword that converts well is the clearest growth signal in the account: the demand exists and I am simply not showing up for it.

Levers, from cheapest to most expensive. Improve relevance and conversion rate, which raises ad rank at the same bid. Lift the top-of-search placement multiplier, which is targeted rather than raising every placement. Raise the bid. Raise the budget if the campaign is capping out before the day ends. Expand match types so the keyword is eligible in more auctions.

The discipline is only chasing share where it pays. Impression share on a 90 percent ACoS keyword is a target I do not want. I pull the list of keywords with below-target ACoS and below 40 percent top-of-search impression share — that is the growth list.`,
    keyPoints: [
      "Correct definition, and knows the top-of-search variant is the usable one",
      "Frames low share on profitable keywords as the growth opportunity",
      "Orders the levers from cheapest to most expensive",
      "Only pursues share where the economics already work",
    ],
    redFlags: [
      "Chases impression share regardless of ACoS",
      "Thinks the only lever is the bid",
      "Does not know Amazon reports it at all",
    ],
    followUps: [
      "Where in the reporting do you find top-of-search impression share?",
      "Share is 12 percent and ACoS is 18 percent. What is your move?",
    ],
  },
  {
    id: "negative-keyword-thresholds",
    category: "Optimization",
    level: "intermediate",
    tags: ["negatives", "wasted spend", "thresholds"],
    answerSeconds: 60,
    question: "How do you decide what to negate, and what do you refuse to negate?",
    idealAnswer: `I negate on spend without return, not on ACoS alone. My default rule is ten or more clicks with zero orders, or spend above twice the target cost per acquisition with zero orders. Irrelevant terms get negated immediately regardless of click count — a cat product pulling dog searches does not need data.

What I refuse to negate. Anything that has converted, unless it is losing money badly and consistently: high ACoS with orders is a bid problem first. Terms with fewer than five clicks, which are noise. And any term that is the exact phrase my organic rank depends on, because negating it in paid can cost visibility that is worth more than the wasted clicks.

I also keep a shared negative list for account-wide junk — *free*, *used*, *replacement*, competitor brand names where the client has asked me to stay out — so a new campaign inherits the lessons from day one instead of relearning them.

Every negative goes in the change log with the reason, because an unexplained negative is impossible to review six months later.`,
    keyPoints: [
      "Numeric threshold based on clicks and spend, not ACoS alone",
      "Immediate negation for irrelevance",
      "Explicit list of what not to negate, including converting terms",
      "Uses shared negative lists and logs the reason",
    ],
    redFlags: [
      "Negates any term with an ACoS above target",
      "Negates converting terms because one week looked bad",
      "Adds dozens of negatives with no record of why",
    ],
    followUps: [
      "A term converts at 90 percent ACoS every month. Negate or manage?",
      "How do you audit negatives that were added a year ago?",
    ],
  },
  {
    id: "scaling-a-winning-campaign",
    category: "Optimization",
    level: "advanced",
    tags: ["scaling", "budget", "growth", "bids"],
    answerSeconds: 90,
    question: "A campaign is at 18 percent ACoS with a 30 percent break-even. How do you scale it?",
    idealAnswer: `Twelve points of headroom means there is room to buy more volume, and the goal is to spend into that headroom without wrecking the efficiency.

Order of moves. **Budget first** if the campaign is capping out — that is free volume at the current efficiency, and no bid change is needed. **Impression share next**: pull the converting keywords with low top-of-search share and lift those specific bids by 15 to 20 percent, rather than raising everything. **Placement multiplier** on top of search if the placement data supports it. **Then expansion**: harvest more search terms, add close variants and related products, because at some point the existing keyword set is genuinely saturated.

I scale in steps of roughly 20 percent of spend per week and watch ACoS after each step. Expect it to rise — going from 18 to 24 percent while sales grow 60 percent is a good trade, and I say that to the client in advance so a rising ACoS is not read as failure.

I stop when the marginal spend crosses break-even, and I would rather find the ceiling deliberately than guess at it.`,
    keyPoints: [
      "Checks budget cap before touching bids",
      "Targets bid increases at low impression share on converting terms",
      "Scales in measured weekly steps and expects ACoS to rise",
      "Pre-frames the rising ACoS with the client",
    ],
    redFlags: [
      "Doubles all bids and the budget at once",
      "Treats rising ACoS during a scale-up as automatic failure",
      "Has no stopping rule",
    ],
    followUps: [
      "ACoS hits 29 percent and sales are still climbing. Continue?",
      "How do you tell saturation from a temporary competitive spike?",
    ],
  },
  {
    id: "profit-versus-rank-tradeoff",
    category: "Optimization",
    level: "advanced",
    tags: ["strategy", "rank", "profitability", "tacos"],
    answerSeconds: 90,
    question: "How do you decide between optimising for profit and optimising for rank?",
    idealAnswer: `It is a decision about the product's stage, and it belongs to the client, not to me. My job is to lay out the trade and then execute one of them properly.

**Rank mode** fits a launch, a relaunch after a stock-out, or a push into a keyword the brand must own. Accept ACoS above break-even, target a narrow set of keywords rather than everything, track organic rank weekly as the real KPI, and fix an end date and a maximum loss up front.

**Profit mode** fits a mature product with steady rank. Trim to keywords below break-even, tighten placements, cut the tail, and accept that total volume may fall.

The mistake is drifting between them: a bit of extra spend without a rank goal, then a bit of cutting when the invoice looks large, which achieves neither.

So I put it in writing. For example: eight weeks, up to 2,500 dollars of planned loss, success is top-ten organic on three keywords, and after eight weeks we switch to profit mode whatever happens.`,
    keyPoints: [
      "Frames it as a client decision with a recommendation attached",
      "Defines what each mode actually changes in the account",
      "Sets an end date, a loss cap and a measurable success condition",
      "Names drift between the two modes as the real failure",
    ],
    redFlags: [
      "Decides the brand strategy unilaterally",
      "Runs a rank push with no budget cap or end date",
      "Cannot articulate what would be done differently in each mode",
    ],
    followUps: [
      "Six weeks in, rank has not moved. Do you keep going?",
      "How do you report a deliberate loss without it looking like failure?",
    ],
  },
  {
    id: "day-parting",
    category: "Optimization",
    level: "intermediate",
    source: "Technical Knowledge Q10",
    tags: ["day parting", "scheduling", "budget", "automation"],
    answerSeconds: 75,
    question: "What is day parting and when would you use it?",
    idealAnswer: `Day parting is scheduling spend toward the hours and days that convert best, and away from the ones that do not. Amazon's native controls are limited, so in practice it means either a rules-based tool or a scheduled bid and budget change.

Three situations where it earns its keep. When hourly data shows a real pattern — for example a US account where 11pm to 6am Eastern produces eight percent of clicks and two percent of orders. When budget is tight enough that a campaign exhausts before evening, so concentrating spend into the converting window is the only way to be present when it matters. And around events, such as pulling back the hour before a Lightning Deal ends.

What I check before recommending it: at least 30 days of hourly data, a pattern that repeats across weeks rather than one odd Tuesday, and enough spend that the saving is worth the added complexity.

I also warn clients that turning ads off for hours can affect impression share and ranking momentum, so I start by reducing bids in weak hours rather than going dark.`,
    keyPoints: [
      "Defines it and notes Amazon's native controls are limited",
      "Names concrete situations where it pays",
      "Requires 30 days of repeating hourly data before acting",
      "Prefers bid reduction to going fully dark",
    ],
    redFlags: [
      "Recommends day parting on a week of data",
      "Ignores the ranking cost of going dark for hours",
      "Thinks Amazon has full native hourly scheduling for everything",
    ],
    followUps: [
      "Where would you get the hourly data without a paid tool?",
      "Client is in Manila, account is US. How do you handle the time zones?",
    ],
  },
  {
    id: "product-targeting-optimisation",
    category: "Optimization",
    level: "advanced",
    tags: ["product targeting", "asin targeting", "optimisation", "conquesting"],
    answerSeconds: 75,
    question: "How do you optimise an ASIN-targeting campaign?",
    idealAnswer: `Differently from keywords, because the unit of optimisation is a competitor's detail page rather than a search.

What I look at per target ASIN: spend, orders, ACoS, and then the page itself. A target losing money usually fails for a structural reason — their price is lower, their rating is higher, they have 4,000 reviews against my 200, or they are Prime and I am not. No bid will fix being the worse offer on someone else's page.

So the optimisation loop is: cut targets where I am clearly the weaker product, keep and scale the ones where I win on price or rating, and refresh the target list monthly because competitors change price and stock constantly.

I use category targeting with refinements to find new candidates — filter to competitors priced above mine and rated below four stars, then promote the individual ASINs that convert into their own targets.

I also always run defensive targets on my own ASINs, and I check the placement report, because product-page placement behaves very differently from search.`,
    keyPoints: [
      "Judges targets on competitive position, not only on ACoS",
      "Refreshes the target list because competitor pricing moves",
      "Uses refined category targeting to discover new ASINs",
      "Runs defensive targeting on own detail pages",
    ],
    redFlags: [
      "Targets the category leader with 10,000 reviews and wonders why it fails",
      "Sets a target list once and never revisits it",
      "Applies keyword logic unchanged to ASIN targets",
    ],
    followUps: [
      "How would you build a list of 50 conquest ASINs for a new client?",
      "A competitor drops their price by 30 percent. What changes in your account?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Reporting & Analysis
   * ---------------------------------------------------------------- */
  {
    id: "search-term-report-process",
    category: "Reporting & Analysis",
    level: "intermediate",
    source: "Tool Proficiency Q34",
    tags: ["search terms", "reporting", "process", "weekly"],
    answerSeconds: 90,
    question: "What is your process for using the Search Term Report?",
    idealAnswer: `I pull it weekly at minimum, on a rolling seven-day window, plus a 30-day pull once a month to catch slow leaks.

The pass I run, in order. **Sort by spend descending** and work top down, because that is where the money is. **High spend, no orders** goes on the negate list. **High conversion, low impressions** goes on the bid-up list — these are the hidden winners. **Converting terms not yet in a manual exact campaign** go on the harvest list. **Terms revealing intent I had not considered** go into keyword research, because sometimes the search term report tells you the product has a second use case.

Then I apply everything in one bulk upload rather than clicking through the console, and log what changed.

Two habits that matter. I compare against last week rather than reading each week in isolation, because a term creeping from 4 dollars to 19 dollars of weekly spend is invisible in a single snapshot. And I always check the report reflects the attribution window before I treat recent days as final.`,
    keyPoints: [
      "Weekly cadence with a monthly longer window",
      "Sorts by spend and has a defined pass with four outputs",
      "Applies changes in bulk and logs them",
      "Compares week over week and understands attribution lag",
    ],
    redFlags: [
      "Reads the report only when performance drops",
      "Works alphabetically or randomly instead of by spend",
      "Treats the last two days of data as final",
    ],
    followUps: [
      "How far back do you pull, and why does the recent data keep changing?",
      "Show me how you would find the hidden winners in a 4,000-row export.",
    ],
  },
  {
    id: "build-custom-report",
    category: "Reporting & Analysis",
    level: "intermediate",
    source: "Tool Proficiency Q33",
    tags: ["excel", "google sheets", "reporting", "pivot tables"],
    answerSeconds: 90,
    question: "How do you build a custom PPC report in Excel or Google Sheets?",
    idealAnswer: `I build it once as a template and then only refresh the data, because a report rebuilt by hand every month is a report that eventually gets skipped.

Structure. A raw data tab that I paste bulk and report exports into, untouched. A calculations tab with derived metrics — ACoS, ROAS, CVR, CPC, cost per acquisition, TACoS where I have total sales. A pivot layer grouping by campaign, ad group, match type and week. A summary tab that is the only thing the client sees.

Techniques that do the work: pivot tables for grouping, XLOOKUP or INDEX and MATCH to join the ad data against a margin table by ASIN, conditional formatting for red and green bands against break-even, and sparklines or a simple line chart for the trend.

The rule I hold to is that the summary tab must answer three questions without scrolling: what happened, why, and what I am doing next. Everything else is an appendix.

Once it is stable I connect it to a scheduled export or the Ads API so the raw tab refreshes itself.`,
    keyPoints: [
      "Separates raw data, calculations and the client-facing summary",
      "Names real spreadsheet techniques rather than saying make a pivot table",
      "Joins ad data to margin data by ASIN",
      "Summary answers what happened, why, and what next",
    ],
    redFlags: [
      "Rebuilds the whole report by hand each month",
      "Pastes raw exports straight into a client deck",
      "No derived metrics beyond what Amazon already displays",
    ],
    followUps: [
      "How would you calculate TACoS in that sheet?",
      "What formula joins ad spend to the margin table?",
    ],
  },
  {
    id: "reporting-cadence",
    category: "Reporting & Analysis",
    level: "intermediate",
    source: "Tool Proficiency Q40",
    tags: ["cadence", "process", "sops", "reporting"],
    answerSeconds: 75,
    question: "What reporting cadence do you follow, and what goes in each?",
    idealAnswer: `Four layers, each with a fixed time box.

**Daily, about five minutes per account.** Budget pacing, anomalies, out-of-stock alerts, and any campaign that stopped delivering. Checking, not optimising.

**Weekly, about 30 minutes.** Search term analysis, harvest and negate, bid adjustments, week-over-week trend. This is where most of the actual work happens.

**Monthly, about two hours.** Full performance review, the client report, what worked and what did not, and the plan for next month.

**Quarterly, half a day.** Strategy review, budget reallocation across products, competitive analysis, and a structural audit of whether the account layout still fits the catalogue.

The cadence matters because PPC data is noisy. Optimising daily means reacting to randomness, and reviewing only monthly means a leak runs for four weeks. Weekly is the interval where the signal is real and the damage is still small.`,
    keyPoints: [
      "Four distinct cadences with time boxes and different jobs",
      "Daily is monitoring, not optimisation",
      "Weekly is where the substantive work happens",
      "Justifies the cadence with signal versus noise",
    ],
    redFlags: [
      "Optimises bids every day",
      "Only looks at the account when the client asks",
      "No quarterly or strategic layer at all",
    ],
    followUps: [
      "What exactly is on your five-minute daily checklist?",
      "Which of these would you drop first if you took on three more accounts?",
    ],
  },
  {
    id: "monthly-report-structure",
    category: "Reporting & Analysis",
    level: "expert",
    source: "Client Communication Q48",
    tags: ["client reporting", "presentation", "monthly"],
    answerSeconds: 90,
    question: "How do you present a monthly performance report to a client?",
    idealAnswer: `Six sections, in this order, and it fits on two pages.

**Executive summary** — three bullets. Spend, sales and the one thing that matters this month. Most clients read only this.

**Key metrics** — this month, last month, and target, in a small table. Spend, ad sales, total sales, ACoS, TACoS, CVR and average CPC. Numbers next to a comparison, never alone.

**What worked** — the top campaigns and keywords, with the decision behind each, so the client can see the work rather than just the outcome.

**What did not** — the underperformers and what I already did about them. Naming these first is what builds trust; a report with no problems in it reads as a report that was not really written.

**Next month** — three specific actions with expected impact.

**Context** — competitor moves, seasonality, stock issues, anything outside the ads console that shaped the numbers.

Charts over paragraphs, and I always walk through it live on a 20-minute call rather than emailing it and hoping.`,
    keyPoints: [
      "Executive summary first, because it is what actually gets read",
      "Every metric shown against a comparison",
      "Names underperformance and the action taken",
      "Ends on specific next actions, and presents it live",
    ],
    redFlags: [
      "Sends a raw data dump with no narrative",
      "Reports only the good news",
      "No forward-looking section",
    ],
    followUps: [
      "The month was bad. How does the structure change?",
      "Client never opens the report. What do you do differently?",
    ],
  },
  {
    id: "metrics-that-matter",
    category: "Reporting & Analysis",
    level: "intermediate",
    tags: ["metrics", "dashboard", "kpis"],
    answerSeconds: 75,
    question: "If you could only show a client six metrics, which six and why?",
    idealAnswer: `**Total sales** first, because it is the business. **Ad spend**, because it is the invoice. **TACoS**, because it is the honest efficiency number across organic and paid together. **ACoS**, because it is the number clients already know and removing it creates suspicion. **Conversion rate**, because it is the early warning system for listing, price and stock problems. And **organic rank on the top five keywords**, because it is the leading indicator that the other five will move next month.

What I deliberately leave out of the headline: impressions and clicks. They are diagnostic metrics for me, not decision metrics for the client, and they invite conversations about volume when the conversation should be about profit.

Everything is shown against last month and against target, because a bare number is unreadable. Sixteen percent ACoS means nothing until you know last month was 24 and the target is 25.`,
    keyPoints: [
      "Leads with total sales and spend, not ad-only metrics",
      "Includes TACoS and keeps ACoS because clients expect it",
      "Includes a leading indicator such as CVR or organic rank",
      "Always shown against a comparison and a target",
    ],
    redFlags: [
      "Leads with impressions and clicks",
      "Omits total sales entirely",
      "Presents numbers with no comparison or target",
    ],
    followUps: [
      "Client only cares about ACoS. How do you get TACoS into the conversation?",
      "Which metric would you add as the seventh?",
    ],
  },
  {
    id: "attribution-window-effects",
    category: "Reporting & Analysis",
    level: "advanced",
    tags: ["attribution", "reporting", "data lag"],
    answerSeconds: 75,
    question: "Why do last week's numbers change after you have already reported them?",
    idealAnswer: `Because Sponsored Products attributes a sale to the click for a window after that click — commonly 7 days for Sponsored Products and 14 days for Sponsored Brands and Display. A click on Monday that converts on Thursday is credited back to Monday, so Monday's ACoS improves days after Monday ended.

The practical consequences. Yesterday's data is always the worst it will ever look, so judging a bid change on one day of data is judging incomplete information. Any report pulled before the window closes will disagree with the same report pulled later, and if the client pulls their own numbers on a different day, the two will not match — which is a trust problem, not a data problem.

How I handle it. I never make decisions on data less than three days old. Monthly reports are pulled at least seven days after month end, and I state the pull date on the report. If a client compares an older figure, I explain the window rather than arguing about the number.

It also means a campaign paused today keeps recording sales for a week, which catches people out.`,
    keyPoints: [
      "Names the attribution window and the different lengths by ad type",
      "Explains why recent data understates performance",
      "Sets a rule about data age before making decisions",
      "Stamps the pull date on reports to avoid mismatch disputes",
    ],
    redFlags: [
      "Judges performance on yesterday's numbers",
      "Cannot explain why two pulls of the same period disagree",
      "Tells the client the tool is broken",
    ],
    followUps: [
      "You paused a campaign yesterday and it still shows sales. Explain.",
      "How does this change how you run a 14-day test?",
    ],
  },
  {
    id: "statistical-significance-ppc",
    category: "Reporting & Analysis",
    level: "advanced",
    tags: ["statistics", "testing", "sample size"],
    answerSeconds: 75,
    question: "How do you know a difference in performance is real and not noise?",
    idealAnswer: `I start by asking how many conversions each side has, not how many days the test ran. Conversions are the scarce thing in Amazon PPC, and a comparison built on six orders each way is a coin flip.

My practical rules. Under ten orders per side, I do not draw a conclusion. Around 25 to 30 orders per side, I will accept a large difference, meaning something like 30 percent or more. For a small difference of five or ten percent, I need hundreds of orders, which most keyword-level tests will never produce — so at keyword level I stop pretending and make the call on direction plus judgement.

I also protect against the classic errors: reading a test that ran across a weekend against one that did not, comparing periods with different stock or price, and stopping the moment the result looks favourable.

When the volume genuinely is not there, I roll up. Ad group, match type or campaign level often has enough conversions to say something real, even when no single keyword does.`,
    keyPoints: [
      "Counts conversions rather than days or clicks",
      "Gives concrete thresholds and admits where certainty is unreachable",
      "Names confounders: seasonality, price, stock, stopping early",
      "Rolls up to a higher level when volume is thin",
    ],
    redFlags: [
      "Declares a winner on two orders versus one",
      "Stops the test as soon as it looks good",
      "Claims statistical significance without any notion of sample size",
    ],
    followUps: [
      "Variant A: 14 orders, 22 percent ACoS. Variant B: 9 orders, 31 percent. Call it?",
      "How would you design the test to need less data?",
    ],
  },
  {
    id: "week-over-week-versus-year-over-year",
    category: "Reporting & Analysis",
    level: "intermediate",
    tags: ["trends", "seasonality", "comparison", "reporting"],
    answerSeconds: 60,
    question: "Which comparison do you use — week over week, month over month, or year over year?",
    idealAnswer: `All three, for different jobs, and using the wrong one is how people misread a perfectly normal month.

**Week over week** is for operations: did the change I made last Tuesday do anything? Short, noisy, only useful with a specific action attached.

**Month over month** is the default client comparison, but it is contaminated by the number of days and by seasonality. December against November flatters everything and January against December looks like a catastrophe in every account on Amazon.

**Year over year** is the honest one for a seasonal business. January 2026 against January 2025 strips out the seasonal shape and shows whether the business actually grew.

So my report shows month over month with the seasonal caveat stated, plus year over year where at least a year of history exists. I also normalise for days when a month is short, because a 28-day February against a 31-day January is a ten percent difference before anything real has happened.`,
    keyPoints: [
      "Assigns a distinct job to each comparison",
      "Flags seasonality contamination in month over month",
      "Prefers year over year for seasonal businesses",
      "Normalises for the number of days in the period",
    ],
    redFlags: [
      "Only ever reports month over month",
      "Reports a January decline as a performance failure",
      "Never normalises for period length",
    ],
    followUps: [
      "The account is nine months old. What do you compare against?",
      "How do you present a genuinely bad month without spin?",
    ],
  },
  {
    id: "business-reports-versus-ad-reports",
    category: "Reporting & Analysis",
    level: "advanced",
    tags: ["business reports", "sessions", "tacos", "seller central"],
    answerSeconds: 75,
    question: "What do you get from Seller Central Business Reports that the ads console cannot give you?",
    idealAnswer: `Everything about the shopper who did not come from an ad, which is most of them.

The columns I use. **Sessions and page views** per ASIN, which give real traffic volume including organic. **Unit session percentage**, which is the true conversion rate of the whole listing rather than just ad clicks — the single best early warning that a listing, price or review problem has appeared. **Total ordered product sales**, which is the denominator for TACoS. And **Buy Box percentage**, which explains a sudden performance collapse faster than any ad metric.

The comparison that matters is ad CVR against overall unit session percentage. If ads convert at 11 percent and the listing overall converts at 5, the paid traffic is better qualified than the organic traffic, which is normal. If it is reversed, my targeting is pulling the wrong people.

So my monthly pull is always both: ads data for what I control, Business Reports for what the customer actually experienced.`,
    keyPoints: [
      "Names the specific columns and what each answers",
      "Uses unit session percentage as the listing health signal",
      "Needs total sales from here to compute TACoS",
      "Compares ad CVR against overall conversion rate",
    ],
    redFlags: [
      "Never opens Seller Central beyond the ads console",
      "Cannot source total sales for TACoS",
      "Does not know Buy Box loss affects ad delivery",
    ],
    followUps: [
      "Sessions flat, unit session percentage down 40 percent. What happened?",
      "Which report gives you Buy Box percentage by ASIN?",
    ],
  },
  {
    id: "finding-wasted-spend-fast",
    category: "Reporting & Analysis",
    level: "intermediate",
    tags: ["wasted spend", "audit", "quick wins"],
    answerSeconds: 75,
    question: "You have 30 minutes and a new account. Find the wasted spend.",
    idealAnswer: `Four pulls, in this order, because each one finds a different kind of leak.

**Search term report, 60 days, sorted by spend with zero orders.** This is usually the biggest single pot — irrelevant terms nobody ever negated. In a neglected account it is commonly ten to twenty percent of total spend.

**Keyword report, filtered to ACoS above twice break-even with more than fifteen clicks.** Real keywords being bid far too high.

**Campaign report, filtered to zero impressions in 30 days.** Not spending, but they hide the real structure and make everything harder to read.

**Placement report.** Often reveals a top-of-search multiplier applied everywhere without the conversion data to support it.

Then I check the boring things that are not in any report: products advertised while out of stock, ads running on ASINs without the Buy Box, and duplicate keywords across campaigns bidding against each other.

I present it as one number — here is the monthly spend that produced no orders — because that is the number that gets me approval to act.`,
    keyPoints: [
      "Prioritised sequence of specific report pulls with filters",
      "Realistic about how much waste sits in the search term report",
      "Checks stock and Buy Box, which sit outside the ad reports",
      "Packages the finding as a single number for approval",
    ],
    redFlags: [
      "Starts by browsing the campaign manager with no filters",
      "Only looks at ACoS and misses zero-order spend",
      "Presents raw findings with no dollar total attached",
    ],
    followUps: [
      "You find 1,800 dollars a month of zero-order spend. What do you do first?",
      "How do you find duplicate keywords across 40 campaigns?",
    ],
  },
  {
    id: "explaining-a-bad-month",
    category: "Reporting & Analysis",
    level: "expert",
    tags: ["client reporting", "bad news", "analysis"],
    answerSeconds: 90,
    question: "Sales are down 22 percent this month. Walk me through the report you write.",
    idealAnswer: `I do the analysis before I write a word, because a report that cannot name the cause reads like an excuse.

**Segment the decline.** Is it all ASINs or one? Ads or organic? Traffic or conversion? Down 22 percent because sessions fell is a completely different story from down 22 percent because conversion fell, and the actions are unrelated.

**Find the cause.** The usual ones: a stock-out, a price change by us or a competitor, lost Buy Box, a listing suppression, a new competitor, or plain seasonality. I check organic rank on the head keywords too.

**Quantify each contributor.** Something like: nine points from a six-day stock-out on the hero ASIN, seven points from seasonal decline also visible last year, six points from a competitor entering at a lower price.

Then the report leads with the cause, not the number. Headline: sales down 22 percent, driven mainly by a stock-out and a new competitor. Then what is recoverable, what is not, and the three actions for next month with expected impact.

No blame, no hiding, and never a surprise — if I saw this coming mid-month, the client heard about it mid-month.`,
    keyPoints: [
      "Segments the decline before explaining it",
      "Attributes the drop to specific causes with rough magnitudes",
      "Separates recoverable from structural",
      "No surprises: the client was warned before the report",
    ],
    redFlags: [
      "Blames Amazon or the algorithm with no evidence",
      "Presents the drop with no cause analysis",
      "Lets the client discover a bad month from the report",
    ],
    followUps: [
      "The cause was your own bid change. Does the report change?",
      "How would you have flagged this mid-month?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Tools & Automation
   * ---------------------------------------------------------------- */
  {
    id: "tools-you-use",
    category: "Tools & Automation",
    level: "beginner",
    source: "Tool Proficiency Q31",
    tags: ["tools", "stack", "helium 10"],
    answerSeconds: 75,
    question: "What tools do you use for Amazon PPC, and why?",
    idealAnswer: `**Amazon Advertising Console** for everything that changes the account, plus bulk operations for anything above about twenty edits.

**Helium 10** for keyword research and competitive work — Cerebro for reverse-ASIN lookups, Magnet for keyword expansion, and Adtomic where the client pays for it.

**Excel or Google Sheets** for anything the console will not show me: joining ad data to margin by ASIN, week-over-week comparisons, and the client report template.

**Seller Central Business Reports** for sessions, unit session percentage and total sales, which is where TACoS comes from.

**Amazon Attribution** when there is external traffic to measure.

I am deliberate about the stack because tools cost the client money. Cerebro plus bulk files plus a well-built sheet covers 90 percent of the job; the expensive automation layer is worth adding once the account is large enough that manual bid work stops scaling, usually somewhere north of 15,000 dollars a month in spend.`,
    keyPoints: [
      "Names specific tools and what each is actually used for",
      "Includes bulk operations and spreadsheets, not only paid tools",
      "Knows where TACoS data comes from",
      "Cost-aware about when a paid stack is justified",
    ],
    redFlags: [
      "Lists tool names with no idea what they do",
      "Claims to need a 500-dollar-a-month stack for a small account",
      "Does not mention bulk operations or spreadsheets at all",
    ],
    followUps: [
      "Client has no tool budget. What is your process?",
      "Which of these could you drop and still do the job?",
    ],
  },
  {
    id: "helium10-cerebro",
    category: "Tools & Automation",
    level: "intermediate",
    source: "Tool Proficiency Q32",
    tags: ["helium 10", "cerebro", "keyword research", "reverse asin"],
    answerSeconds: 90,
    question: "Walk me through how you use Helium 10 Cerebro for keyword research.",
    idealAnswer: `Cerebro is a reverse-ASIN lookup: give it an ASIN and it returns the keywords that ASIN ranks and advertises for.

My process. Pick three to five competitor ASINs that are genuinely comparable — similar price, similar review count, same use case. Run them together so the output shows overlap rather than one competitor's quirks.

Then filter. Search volume above a floor suited to the category, competing products to gauge difficulty, and the ranking columns to find where competitors rank organically. The gold is in two places: keywords where several competitors rank well and my client does not, and keywords with decent volume where competitors rank organically but run no ads, which means cheap clicks.

Export, then prune by hand. Cerebro returns plenty of terms that are technically related and commercially useless, and no filter replaces reading the list.

The output is a prioritised sheet — keyword, volume, relevance rating, target match type, opening bid — which becomes the manual campaign build.`,
    keyPoints: [
      "Knows Cerebro is a reverse-ASIN tool",
      "Selects genuinely comparable competitor ASINs and runs several at once",
      "Names the filters and what the gaps mean",
      "Manually prunes and turns the export into a build sheet",
    ],
    redFlags: [
      "Exports 2,000 keywords and uploads them all",
      "Picks competitor ASINs that are nothing like the product",
      "Cannot explain what a reverse-ASIN lookup does",
    ],
    followUps: [
      "How do you judge relevance beyond what the tool scores?",
      "No Helium 10 seat. How do you do the same job?",
    ],
  },
  {
    id: "bulk-operations",
    category: "Tools & Automation",
    level: "intermediate",
    source: "Tool Proficiency Q35",
    tags: ["bulk operations", "efficiency", "process"],
    answerSeconds: 75,
    question: "How do you use bulk operations, and what precautions do you take?",
    idealAnswer: `Bulk files are how the job scales. Anything past roughly twenty changes, I do in a spreadsheet rather than in the console.

The flow: download the bulk file for the date range, filter to the rows I want, set the Operation column to Update, change the values — bids, budgets, states, adding keywords or negatives — and upload. Amazon returns a result file listing errors row by row, which I always open.

Precautions, learned the hard way. Keep the untouched download as a backup, so a bad upload can be reversed by re-uploading the original values. Never edit the ID columns. Change one type of thing per upload, so a failure is diagnosable. Test with five rows before running 500. And check the result file rather than assuming success, because partial failures are silent.

What I use it for most: mass bid adjustments from a calculated column, bulk negatives from a search term analysis, budget changes ahead of Prime Day, and cloning a campaign structure to a new ASIN.`,
    keyPoints: [
      "Uses bulk beyond a threshold of manual edits",
      "Describes the actual download, edit, upload, result-file flow",
      "Keeps the original file as a rollback",
      "Tests small before running large, and reads the result file",
    ],
    redFlags: [
      "Uploads 500 rows with no backup or test batch",
      "Never checks the result file",
      "Edits ID columns",
    ],
    followUps: [
      "Your upload reports 40 errors. What do you do?",
      "How would you roll back a bad bulk upload?",
    ],
  },
  {
    id: "ams-versus-seller-central-ads",
    category: "Tools & Automation",
    level: "beginner",
    source: "Tool Proficiency Q36",
    tags: ["advertising console", "seller central", "vendor central"],
    answerSeconds: 60,
    question: "What is the difference between the Advertising Console and ads inside Seller Central?",
    idealAnswer: `They are increasingly the same thing, and being precise about that matters more than reciting old product names.

The **Advertising Console** is the full advertising platform: all three Sponsored ad types, portfolios, bulk operations, the full reporting suite, placement controls, and API access. It is where professional PPC management happens, and it serves both Seller Central and Vendor Central accounts.

The **Seller Central advertising area** is the same platform reached from inside Seller Central. Historically the in-Seller-Central view was a cut-down campaign manager, and what people usually mean by the distinction is that older, simpler interface versus the full console.

What I care about practically: whichever door I come in through, I need bulk operations, the full report suite and portfolios. If a client has only ever used the simplified view, my first onboarding step is getting them into the full console and showing them the reports they have never pulled.

For a vendor account the same console applies, with different reporting and Amazon Retail Analytics alongside it.`,
    keyPoints: [
      "Knows the console is the full platform and the two have converged",
      "Names what the full console gives: bulk, reports, portfolios, API",
      "Practical onboarding step for a client on the simplified view",
      "Aware that vendor accounts differ in reporting",
    ],
    redFlags: [
      "Confidently describes AMS as a separate current product",
      "Cannot name anything the full console offers",
      "Has never used bulk operations or the report suite",
    ],
    followUps: [
      "Which reports do you pull first on a new account?",
      "What changes if the client is on Vendor Central?",
    ],
  },
  {
    id: "adtomic-rules",
    category: "Tools & Automation",
    level: "advanced",
    source: "Tool Proficiency Q37",
    tags: ["automation", "rules", "adtomic", "bid management"],
    answerSeconds: 90,
    question: "How would you set up rule-based bid automation?",
    idealAnswer: `Rules execute a policy I have already decided. They do not decide it, which is why I write the policy before touching the tool.

A working rule set looks like this. Target ACoS per campaign, derived from that product's break-even. If ACoS over the last 30 days exceeds target by more than 20 percent and clicks are above 15, reduce the bid by 15 percent. If ACoS is below target and orders are above three, raise the bid by ten percent. Pause nothing automatically — flag it for me instead.

Guardrails matter more than the rules. Minimum and maximum bid per campaign. A cap on how much any bid can move per week, typically 30 percent. A minimum click threshold so nothing fires on noise. A lookback window long enough to cover the attribution lag, so at least 14 days. And no rule that changes budgets during Q4 without approval.

Then I review weekly. Automation is not set and forget; what it buys me is that the boring 80 percent happens on schedule, so my time goes to the 20 percent that needs judgement.`,
    keyPoints: [
      "Writes the policy before configuring rules",
      "Gives concrete conditions, actions and thresholds",
      "Guardrails: bid floors and ceilings, change caps, minimum data",
      "Reviews weekly and keeps pauses manual",
    ],
    redFlags: [
      "Enables aggressive automation and stops looking",
      "Rules fire on two clicks of data",
      "No minimum or maximum bid, so bids can run away overnight",
    ],
    followUps: [
      "Your rule cut bids on a keyword that was holding organic rank. How do you prevent that?",
      "What would you never automate?",
    ],
  },
  {
    id: "google-analytics-for-amazon",
    category: "Tools & Automation",
    level: "advanced",
    source: "Tool Proficiency Q38",
    tags: ["google analytics", "external traffic", "attribution", "utm"],
    answerSeconds: 75,
    question: "How do you use Google Analytics alongside Amazon PPC?",
    idealAnswer: `Google Analytics cannot see inside Amazon, so it is only useful for the journey before the click reaches Amazon. I use it for the brand's own site, and I pair it with Amazon Attribution for the part on Amazon.

The setup. UTM parameters on every external link that ends on an Amazon listing, with a consistent naming scheme. Amazon Attribution tags on the same destinations, which is what gives detail page views, add-to-carts and purchases. GA4 then tells me traffic quality and behaviour on the brand site, and Attribution tells me what that traffic did on Amazon.

What I do with it. Compare channels on the same basis: a Meta campaign at 0.60 dollars a click that converts at two percent on Amazon is worse than Sponsored Products at 1.10 dollars converting at eleven. Identify content pages that send buyers rather than browsers. And where the Brand Referral Bonus applies, factor that ten percent back into the channel maths.

If there is no brand site and no external traffic, Google Analytics adds nothing and I say so rather than setting it up for appearances.`,
    keyPoints: [
      "Knows GA cannot track behaviour on Amazon itself",
      "Pairs UTM tagging with Amazon Attribution for the full path",
      "Compares channels on landed conversion rate, not just cost per click",
      "Willing to say the tool is unnecessary when there is no external traffic",
    ],
    redFlags: [
      "Claims GA can track Amazon conversions directly",
      "Sets up tracking with no naming convention",
      "Recommends it for an account with no off-Amazon traffic",
    ],
    followUps: [
      "Design the UTM scheme for three channels and six ASINs.",
      "How would you prove external traffic was worth it?",
    ],
  },
  {
    id: "bulk-keyword-negation",
    category: "Tools & Automation",
    level: "intermediate",
    source: "Tool Proficiency Q39",
    tags: ["negatives", "bulk operations", "shared lists"],
    answerSeconds: 75,
    question: "How do you handle bulk keyword negation across multiple campaigns?",
    idealAnswer: `First I decide the level, because that decision is what makes it manageable later.

**Account-wide junk** — *free*, *used*, *cheap*, *wholesale*, *replacement*, plus competitor brands the client has asked me to avoid — goes into a negative keyword list applied to every campaign. One place to maintain, and new campaigns inherit it.

**Campaign-specific negatives** — terms wrong for this product but fine for another in the catalogue — go at campaign level.

**Harvest negatives** — the exact terms promoted into a performance campaign — go at ad group level in the source campaign, so the discovery campaign stops paying for a term the exact campaign now owns.

The mechanics: build the list in a sheet from the search term analysis, format it as bulk rows with the right campaign and ad group ids and the negative match type, upload, then check the result file for rejected rows. Duplicates are the usual rejection and they are harmless.

Then I re-read the list quarterly, because negatives accumulate and some of them stop making sense.`,
    keyPoints: [
      "Chooses the right level: shared list, campaign, or ad group",
      "Explains why harvest negatives go in the source campaign",
      "Describes the bulk mechanics and checking the result file",
      "Audits the negative list periodically",
    ],
    redFlags: [
      "Puts everything at ad group level and maintains it by hand",
      "Applies a shared list without checking what it blocks per campaign",
      "Never revisits negatives once added",
    ],
    followUps: [
      "Which negatives would you never put in a shared list?",
      "How do you avoid negating a term another campaign depends on?",
    ],
  },
  {
    id: "rule-based-versus-ai-bidding",
    category: "Tools & Automation",
    level: "advanced",
    tags: ["automation", "ai bidding", "tools", "evaluation"],
    answerSeconds: 75,
    question: "A client wants to buy an AI bidding tool. How do you evaluate it?",
    idealAnswer: `Four questions, and I would want them answered before any trial starts.

**What does it actually optimise?** Most tools optimise to a target ACoS. If the client's real goal is rank or new-to-brand growth, an ACoS optimiser will fight the strategy every night.

**Can I see and override its decisions?** A tool with a change log I can read and reverse is a colleague. A black box that moved 300 bids last night with no explanation is a liability when the client asks what changed.

**What does it cost against what it saves?** At 5,000 dollars a month in spend, a 300 dollar tool needs to find six percent of efficiency just to break even. At 60,000 dollars it pays for itself on a rounding error.

**What happens on the edge cases?** Stock-outs, launches, Prime Day, a price change. Tools that keep bidding hard on an out-of-stock ASIN are common.

My recommendation is usually: run it on a subset of campaigns for 30 days against a manually managed control set, then compare. Not on the whole account on faith.`,
    keyPoints: [
      "Asks what objective the tool optimises and whether it matches the strategy",
      "Requires transparency and an override path",
      "Runs the cost-versus-saving arithmetic at the client's spend level",
      "Proposes a controlled trial on a subset rather than a full switch",
    ],
    redFlags: [
      "Enthusiastic about automation with no evaluation criteria",
      "Rejects all tools on principle",
      "No plan to measure whether the tool helped",
    ],
    followUps: [
      "The tool beat your control set by four percent. Do you adopt it?",
      "How would you pick the control campaigns?",
    ],
  },
  {
    id: "sheets-automation-scripts",
    category: "Tools & Automation",
    level: "advanced",
    tags: ["google sheets", "apps script", "automation", "reporting"],
    answerSeconds: 75,
    question: "What have you automated in a spreadsheet, and what did it save?",
    idealAnswer: `The highest-value automation I build is the reporting pipeline, because it is the task that repeats every single week for every single client.

What it does. A Google Sheet with an Apps Script that pulls the scheduled report exports, appends them to a raw tab with a date stamp, recalculates the derived metrics, refreshes the pivots, and flags exceptions — any campaign whose ACoS moved more than 30 percent week over week, anything that stopped spending, anything above break-even for two weeks running. It emails me the exception list every Monday at 7am.

What it saved: roughly four hours a week of copying and pasting across five accounts, and more importantly it catches the slow problems I used to miss between reviews.

Other small ones: a bid calculator that takes target ACoS, current CVR and price and outputs a suggested bid per keyword, formatted as a bulk upload; and a search term classifier that pre-sorts an export into harvest, negate and watch using the thresholds I work to.

I keep them simple. An automation nobody else can fix is a liability when I am on leave.`,
    keyPoints: [
      "Describes a specific automation with concrete inputs and outputs",
      "Quantifies the time saved and the errors caught",
      "Includes exception flagging, not just data movement",
      "Keeps it maintainable by someone else",
    ],
    redFlags: [
      "Has automated nothing and does everything by hand every week",
      "Cannot explain what their own script does",
      "Builds fragile automation nobody else can maintain",
    ],
    followUps: [
      "What would you automate first on a new account?",
      "Your script breaks while you are on leave. What did you leave behind?",
    ],
  },
  {
    id: "amazon-ads-api-basics",
    category: "Tools & Automation",
    level: "advanced",
    tags: ["api", "reporting", "automation", "integration"],
    answerSeconds: 75,
    question: "What do you know about the Amazon Ads API, and when is it worth using?",
    idealAnswer: `The Ads API exposes campaign management and reporting programmatically: create and update campaigns, keywords, bids and negatives, and request reports that get generated asynchronously and downloaded when ready. Access needs an application and an approved developer account, and requests are authenticated per advertiser profile.

When it is worth it: managing enough accounts that manual exports eat a day a week, building a dashboard that has to be current every morning, or feeding an internal bid model. Below that, scheduled report emails plus bulk files do the same job for zero engineering.

What I would honestly say in an interview: I have worked with API-fed data and I understand the report request, poll, download pattern and the profile scoping, but I am not the person who builds the integration. I would spec what the report needs to contain and work with whoever owns the code.

Claiming to be an API developer when you are not is a fast way to fail a technical follow-up, and an agency does not usually need their PPC VA to be one.`,
    keyPoints: [
      "Knows what the API does and the asynchronous report pattern",
      "Has a clear threshold for when it is worth building",
      "Honest about depth of own experience",
      "Positions self as a specifier rather than the engineer, if that is true",
    ],
    redFlags: [
      "Claims deep API development experience that cannot survive a follow-up",
      "Thinks the API is required for normal PPC management",
      "Has never heard of it at a senior level",
    ],
    followUps: [
      "What would you want in a daily automated pull?",
      "Sponsored Products reports and Sponsored Brands reports differ. How?",
    ],
  },
  {
    id: "when-not-to-automate",
    category: "Tools & Automation",
    level: "expert",
    tags: ["automation", "judgement", "risk"],
    answerSeconds: 75,
    question: "What would you never automate?",
    idealAnswer: `Anything where the cost of a wrong decision is high and the signal is thin.

Specifically. **Pausing keywords** — I automate the flag, never the pause, because the rule cannot see that the keyword holds organic rank or that the product was out of stock for four days. **Budget increases** beyond a small percentage, because automation plus a competitive spike is how an account spends a month of budget in a weekend. **Anything during a launch**, where the strategy is deliberately above break-even and every efficiency rule will fight it. **Anything client-facing**, including automated reports sent without a human reading them first. **Negatives from broad rules**, because one bad negative phrase can silently kill a top term.

The general principle: automate the repetitive collection and calculation, keep the judgement. A rule cannot see a stock-out, a new competitor, a price change, or the client's plan for next quarter.

And whatever is automated needs a kill switch and a weekly review. Automation that runs unattended for three months is not efficiency, it is an unmonitored liability.`,
    keyPoints: [
      "Names specific things not to automate with a reason for each",
      "Distinguishes automating collection from automating judgement",
      "Points out the context a rule cannot see",
      "Insists on a kill switch and regular review",
    ],
    redFlags: [
      "Would automate everything including pausing and budgets",
      "Would automate nothing at all",
      "Automated reports sent to clients unread",
    ],
    followUps: [
      "Client asks you to fully automate so they can pay less. Your answer?",
      "How do you review what the automation did last week?",
    ],
  },
  {
    id: "tool-stack-on-a-budget",
    category: "Tools & Automation",
    level: "intermediate",
    tags: ["tools", "budget", "process", "resourcefulness"],
    answerSeconds: 75,
    question: "The client has no tool budget. How do you do the job?",
    idealAnswer: `Most of the job needs no paid tool, and I would rather prove that than lose the account over a subscription.

What is free and sufficient. The Advertising Console reports cover search terms, keywords, placements, targeting and budgets. Bulk operations handle mass changes. Seller Central Business Reports give sessions, unit session percentage and total sales for TACoS. Brand Analytics, on a brand-registered account, gives search frequency rank and click and conversion share for the top ASINs on a term — which is genuinely good keyword data at no cost. Google Sheets does the analysis. Amazon's own suggested bids and the auto campaigns do the discovery a keyword tool would otherwise do.

What I lose: fast reverse-ASIN research, historical rank tracking, and automated bid rules. So I compensate with process — a disciplined weekly search term routine finds most of what Cerebro would have handed me, just more slowly.

Then I put a number on the gap. If a 99 dollar tool would save me three hours a month on a 6,000 dollar account, I make that case with the arithmetic rather than asking for it as a preference.`,
    keyPoints: [
      "Knows the free stack in detail, including Brand Analytics",
      "Honest about what is lost without paid tools",
      "Compensates with process discipline",
      "Makes a costed case rather than demanding tools",
    ],
    redFlags: [
      "Says the job cannot be done without Helium 10",
      "Does not know Brand Analytics exists",
      "Asks for tools without justifying the spend",
    ],
    followUps: [
      "Which single paid tool would you buy first, and at what account size?",
      "How do you do reverse-ASIN research without a tool?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Client Management
   * ---------------------------------------------------------------- */
  {
    id: "explain-acos-to-client",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q41",
    tags: ["client comms", "acos", "plain language"],
    answerSeconds: 60,
    question: "How do you explain ACoS to a non-technical client?",
    idealAnswer: `I use their money, not my vocabulary.

Here is roughly what I say. ACoS is the share of your sales revenue that went to advertising. If we spend one dollar on ads and get four dollars in sales, ACoS is 25 percent — twenty-five cents of every sales dollar paid for the ad. Your product keeps 35 cents of every dollar after costs, so at 25 percent we are ahead by ten cents on each ad-driven sale.

Then the important part, because most clients arrive believing lower is always better. A lower ACoS is not automatically a better month. I can take ACoS to ten percent tomorrow by advertising only your brand name, and your total sales will fall. What we are actually managing is profitable growth, and ACoS is one dial on that, not the score.

Then I show it once, in their numbers, in a chart — the same month at 25 percent with 40,000 dollars of sales against 15 percent with 22,000 dollars — and ask which one they want.`,
    keyPoints: [
      "Plain language with no jargon, framed in the client's own money",
      "Uses a concrete example with real numbers",
      "Explicitly corrects the lower-is-better assumption",
      "Shows the trade-off visually rather than arguing it",
    ],
    redFlags: [
      "Recites the formula and stops",
      "Uses ACoS, TACoS, ROAS and CVR in the same breath to a beginner",
      "Agrees that ACoS should always be minimised",
    ],
    followUps: [
      "Now explain TACoS to the same person.",
      "The client says their friend runs at 8 percent ACoS. What do you say?",
    ],
  },
  {
    id: "client-wants-daily-reports",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q42",
    tags: ["client comms", "reporting", "expectations"],
    answerSeconds: 75,
    question: "A client demands daily reports. How do you handle it?",
    idealAnswer: `I start by finding out what the request is really about, because daily reports are almost never about data. It is usually anxiety after a bad experience with a previous manager, or fear of a budget running away.

Then I offer something better than what was asked for. A live dashboard or a scheduled automated export they can open any time, so they are never locked out. Automated alerts for the things that would actually justify a daily look: budget depletion, an ACoS spike above a threshold, a campaign that stopped delivering. A short weekly note with the decisions I made, and the full monthly review.

I explain why daily commentary would hurt them: Amazon attribution means yesterday's numbers are incomplete, and reacting to one noisy day is how accounts get over-managed into the ground.

Then I commit in writing. And for the first month I over-communicate deliberately — a two-line message each morning — because trust is cheapest to build early, and after a few weeks most clients stop needing it.`,
    keyPoints: [
      "Diagnoses the anxiety behind the request rather than refusing it",
      "Offers self-serve access plus alerts as a better substitute",
      "Explains the attribution reason daily numbers mislead",
      "Over-communicates early, then tapers",
    ],
    redFlags: [
      "Flatly refuses, or agrees to a daily report they will not sustain",
      "Does not address the underlying worry",
      "Sends raw daily data with no interpretation",
    ],
    followUps: [
      "Two weeks in they still want a daily call. Now what?",
      "What three alerts would you set up first?",
    ],
  },
  {
    id: "client-upset-acos-increased",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q43",
    tags: ["client comms", "difficult conversations", "acos"],
    answerSeconds: 90,
    question: "A client is upset because ACoS increased last week. How do you respond?",
    idealAnswer: `I do not answer immediately with reassurance. I acknowledge, then investigate, then come back with the cause.

The reply within the hour is short: I have seen it, I am looking into it, you will have the answer by 3pm your time. That alone defuses most of the heat, because the fear is being ignored.

Then I actually find the cause. Was it a deliberate change I made — a scale-up, a rank push, a new campaign? Was it external — a competitor, a price change, a stock-out, seasonality? Or is it a reporting artefact, attribution still filling in, or a week that included Prime Day?

The answer follows one structure. What happened, in one sentence. Why, with the evidence. What it means for the money, because ACoS up with total sales up is a different conversation from ACoS up with sales flat. What I am doing about it, with a date.

And if I caused it, I say so plainly. Clients forgive a mistake explained quickly far more easily than one they discover themselves.`,
    keyPoints: [
      "Acknowledges fast, investigates before explaining",
      "Distinguishes deliberate, external and artefact causes",
      "Reframes around total sales and profit, not ACoS alone",
      "Owns their own mistakes without hedging",
    ],
    redFlags: [
      "Immediately reassures with no data",
      "Blames Amazon or the client with no evidence",
      "Goes quiet for a day while investigating",
    ],
    followUps: [
      "The cause was your bid increase and it is working. How do you say that?",
      "How would you have prevented this conversation?",
    ],
  },
  {
    id: "zero-volume-keyword-request",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q44",
    tags: ["client comms", "pushback", "keyword research"],
    answerSeconds: 75,
    question: "A client insists on targeting keywords with no search volume. What do you do?",
    idealAnswer: `I find out why they want them first. Often there is a real reason hiding behind it: a term used in their industry, a phrase from their packaging, a competitor's new product name that has not built volume yet. Sometimes they are right and the tool is wrong.

Then I show the data rather than asserting it. Search frequency rank from Brand Analytics or volume from a keyword tool, side by side with the terms the product actually ranks for. Concrete, not theoretical.

Then I give a costed answer. Adding them costs almost nothing if volume really is zero, because zero searches means zero impressions and zero spend. The real risk is not the money, it is that we believe we are covered on a term that is not being searched.

So my usual proposal: add them to an exact-match ad group, cap it at 20 dollars a month, review in 30 days. If they deliver, I was wrong and we scale. If they deliver nothing, the conversation is settled by evidence rather than by opinion, and I have not spent the relationship arguing about 20 dollars.`,
    keyPoints: [
      "Asks why before pushing back",
      "Shows volume data rather than asserting it",
      "Points out the real cost is low because zero volume means zero spend",
      "Proposes a capped test with a review date",
    ],
    redFlags: [
      "Refuses outright and lectures the client",
      "Adds them silently and complains about it later",
      "Cannot show any evidence of search volume",
    ],
    followUps: [
      "They convert, at three orders a month. What now?",
      "How do you check volume without a paid tool?",
    ],
  },
  {
    id: "client-onboarding-process",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q45",
    tags: ["onboarding", "process", "expectations"],
    answerSeconds: 90,
    question: "Describe your process for onboarding a new PPC client.",
    idealAnswer: `Eight steps over the first month.

**Discovery call.** Goals, margins per ASIN, budget, stock position, what happened with the previous manager, and what success looks like in 90 days.

**Access.** Advertising Console at the right permission level, Seller Central reporting access, and any tool seats. I ask for named user access rather than shared passwords.

**Audit, one to two weeks.** Structure, wasted spend, search terms, placements, listing quality, stock and competitive position.

**Findings and strategy.** A short document: what I found, what I recommend, what it should do to the numbers, and what I need from them.

**Approval.** Nothing structural changes before the client has seen the plan.

**Implementation in phases.** Quick wins first — negatives, dead campaigns, obvious overbidding — then the structural work.

**First report at two weeks**, deliberately early, so they see progress before the month ends.

**Monthly reviews thereafter**, with a quarterly strategy session.

The step people skip is margins. Without break-even ACoS per ASIN, every optimisation decision after that is guesswork.`,
    keyPoints: [
      "Structured sequence with realistic timings",
      "Collects margins and stock position, not just access",
      "Audit before changes, approval before structural work",
      "Early first report to build confidence",
    ],
    redFlags: [
      "Starts changing bids on day one",
      "Never asks for margin data",
      "Accepts a shared login instead of proper access",
    ],
    followUps: [
      "The client will not share margins. How do you proceed?",
      "What are your quick wins in week one?",
    ],
  },
  {
    id: "handling-scope-creep",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q46",
    tags: ["scope", "boundaries", "contracts"],
    answerSeconds: 75,
    question: "How do you handle scope creep?",
    idealAnswer: `Prevent it at the start, then handle each instance the same way.

Prevention is a written scope in the first week: what is included, how many ASINs, what cadence of reporting, what response time, and explicitly what is not included — listing copy, image design, inventory planning, Vendor Central work, other marketplaces.

When a request lands outside it, I never say that is not my job. I say something like: happy to take that on. It sits outside our current scope, so it would be an extra four hours a month, or we can swap it for the weekly competitor report you are not reading. Shall I proceed?

That does three things. It says yes. It makes the cost visible. And it puts the decision back with them.

Small requests I absorb without comment — a five-minute favour buys goodwill. The pattern I watch for is repetition: three small requests in a week is a scope conversation, not three favours. Then I raise it once, calmly, with the hours written down.`,
    keyPoints: [
      "Written scope up front, including exclusions",
      "Says yes and attaches a cost rather than refusing",
      "Offers a trade-off so the client chooses",
      "Absorbs small one-offs, escalates the pattern",
    ],
    redFlags: [
      "Says that is not in my contract",
      "Silently absorbs everything until resentment or burnout",
      "Never documented the scope in the first place",
    ],
    followUps: [
      "They say the previous VA did all this. Your response?",
      "How do you raise it when the extra work has already gone on for two months?",
    ],
  },
  {
    id: "pause-ads-slow-season",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q47",
    tags: ["seasonality", "budget", "client comms"],
    answerSeconds: 75,
    question: "A client wants to pause all ads during the slow season. What is your advice?",
    idealAnswer: `I understand the instinct — sales are slow and the ad invoice is the easiest thing to cancel. But a full stop costs more than it saves.

What actually happens when everything pauses: organic rank on the head keywords decays over a few weeks because velocity drops, competitors take the placements, and restarting costs more than staying in — new bids on cold campaigns, no recent conversion history, and weeks to climb back.

So my recommendation is a reduction, not a stop. Keep brand defence at full strength, because it is the cheapest traffic and the most damaging to lose. Keep the top five to ten converting keywords at reduced bids. Pause discovery, experiments and everything above break-even. In practice that is a 50 to 70 percent budget cut with maybe 80 percent of the profitable volume retained.

Then I set the ramp back up four to six weeks before the season, because coming back in cold at the start of peak means paying premium CPCs while rebuilding history.

If they insist on zero, I document the expected impact and the recovery timeline so the restart conversation has a baseline.`,
    keyPoints: [
      "Names the concrete cost of pausing: rank decay, lost placements, expensive restart",
      "Recommends a structured reduction with what stays and what goes",
      "Gives the percentage cut and what it preserves",
      "Plans the ramp-up before the season starts",
    ],
    redFlags: [
      "Agrees to pause everything with no comment",
      "Refuses and argues without offering an alternative",
      "No plan for restarting",
    ],
    followUps: [
      "They insist on zero. What do you do in the account?",
      "How long does organic rank take to decay after ads stop?",
    ],
  },
  {
    id: "why-pay-you-when-tool-exists",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q49",
    tags: ["value", "positioning", "client comms"],
    answerSeconds: 75,
    question: "The client asks: why should I pay you when I can just buy an automation tool?",
    idealAnswer: `It is a fair question and I would not get defensive about it.

A tool executes rules. It will adjust bids toward a target ACoS overnight, faster and more consistently than I can. I would probably recommend one for an account this size.

What it does not do: decide the target in the first place, which requires your margins and your goals. Notice that ACoS spiked because a competitor dropped their price. Know that a keyword losing money is holding page-one rank we spent three months buying. Stop bidding when you go out of stock. Restructure an account. Or tell you that the real problem this month is the listing, not the bids.

So the honest framing is that the tool is the executor and I am the strategist — and the two together beat either alone.

Then I would make it concrete: here are three decisions from the last 90 days a rule engine would have got wrong, and what they were worth. If I cannot produce that list, the client has a point.`,
    keyPoints: [
      "Concedes what the tool genuinely does better",
      "Names specific judgement calls a rule engine cannot make",
      "Positions tool and specialist as complementary",
      "Backs it with concrete examples and value, not assertion",
    ],
    redFlags: [
      "Dismisses tools as useless",
      "Vague appeals to experience with no examples",
      "Gets defensive or offended by the question",
    ],
    followUps: [
      "They buy the tool anyway. How does your role change?",
      "Give me one of those three decisions.",
    ],
  },
  {
    id: "strategy-disagreement-with-client",
    category: "Client Management",
    level: "expert",
    source: "Client Communication Q50",
    tags: ["conflict", "client comms", "testing"],
    answerSeconds: 75,
    question: "How do you handle a disagreement with a client about strategy?",
    idealAnswer: `Listen all the way to the end first. Most disagreements I have had turned out to be about information I did not have — a supplier problem, a cash position, a plan for the brand I had not been told about.

Then present the data behind my recommendation, once, clearly, and without repeating it three times in different words.

Then acknowledge what is right in their view, because there usually is something.

Then propose a test rather than a winner: split the budget, run both approaches for 30 days, and agree in advance what result decides it. Data resolves arguments that opinion cannot, and it lets both of us change position without losing face.

If they still want their way, it is their money and their business. I execute it properly, I do not sabotage it by half-trying, and I document the decision and the expected outcome in one neutral line in the report.

The one place I will not move is anything that breaks Amazon's terms of service — incentivised reviews, manipulating the ranking, trademark issues in ad copy. That is not a disagreement, it is a boundary.`,
    keyPoints: [
      "Listens fully before responding",
      "Presents evidence once, then acknowledges their point",
      "Proposes a split test with a pre-agreed decision rule",
      "Executes the client's choice properly, and names the terms-of-service boundary",
    ],
    redFlags: [
      "Digs in and repeats the same argument louder",
      "Executes a decision they disagree with half-heartedly",
      "Would break Amazon's terms of service if the client insisted",
    ],
    followUps: [
      "The test says you were wrong. What do you say?",
      "They ask you to bid on a competitor's trademark in ad copy. Response?",
    ],
  },
  {
    id: "client-cuts-budget-fifty-percent",
    category: "Client Management",
    level: "expert",
    source: "Scenario-Based Q22",
    tags: ["budget", "client comms", "prioritisation"],
    answerSeconds: 90,
    question: "A client wants to cut the PPC budget by 50 percent immediately. What is your response?",
    idealAnswer: `First I ask why, because the right answer is completely different depending on the reason. Cash flow is a different problem from lost confidence, and lost confidence is a different problem from a stock shortage.

Then I set expectations honestly. A 50 percent cut typically costs more than 50 percent of ad sales in the medium term, because organic rank softens too. I would tell them to expect ad sales down roughly in line with spend immediately, and total sales down maybe 20 to 40 percent within two to four weeks as rank drifts.

Then I make the cut surgical rather than across the board. Keep brand defence. Keep the top converting keywords at slightly lower bids. Cut discovery, experiments, product targeting that is not paying, and anything above break-even. Done well, half the money keeps 70 to 80 percent of the profitable sales.

And I agree a review date, because a cut framed as permanent is much harder to reverse than one framed as six weeks.

If the reason is cash flow, I say plainly that this is the right call and I will make it work.`,
    keyPoints: [
      "Asks why before reacting",
      "Quantifies the expected impact, including the lagged organic effect",
      "Cuts surgically with a stated priority order",
      "Sets a review date and validates a genuine cash-flow reason",
    ],
    redFlags: [
      "Argues against the cut without asking the reason",
      "Halves every campaign budget uniformly",
      "Promises no impact on sales",
    ],
    followUps: [
      "Six weeks later sales are down 35 percent. What do you say?",
      "Which campaign do you cut first, and which do you never cut?",
    ],
  },
  {
    id: "setting-expectations-week-one",
    category: "Client Management",
    level: "expert",
    tags: ["expectations", "onboarding", "client comms"],
    answerSeconds: 75,
    question: "What do you promise a new client in week one, and what do you refuse to promise?",
    idealAnswer: `What I promise is process, not outcomes.

I promise a full audit within two weeks with specific findings. A weekly note every Monday whether or not there is news. A response within one business day. Nothing structural changed without approval. A monthly report with the numbers and the reasoning behind them. And that they will hear bad news from me first, not from their own dashboard.

What I refuse to promise: a specific ACoS by a specific date, a sales figure, page-one ranking, or results in the first 30 days. PPC has a learning period, attribution lags, and I do not control their price, their stock, their reviews or their competitors.

What I offer instead of a promise is a range with reasoning: given 22 percent current ACoS, a 35 percent break-even and the waste I can see in the search terms, I would expect 26 to 30 percent ACoS with higher volume within 90 days. That is a forecast with its assumptions on display, and if an assumption breaks I can say which one.

Clients who want a guaranteed ACoS are usually the ones who fire the person who gave them one.`,
    keyPoints: [
      "Promises process and communication, not numbers",
      "Explicitly refuses to guarantee ACoS, rank or sales",
      "Offers a reasoned forecast range with stated assumptions",
      "Commits to surfacing bad news first",
    ],
    redFlags: [
      "Guarantees a specific ACoS to win the client",
      "Promises results within 30 days",
      "Has no communication commitments at all",
    ],
    followUps: [
      "A competing agency guaranteed 15 percent ACoS. How do you respond?",
      "You miss your own forecast. What happens on that call?",
    ],
  },
  {
    id: "delivering-bad-news-own-mistake",
    category: "Client Management",
    level: "expert",
    tags: ["mistakes", "accountability", "client comms"],
    answerSeconds: 75,
    question:
      "You set a budget to 500 dollars a day instead of 50 and it ran all weekend. What do you do?",
    idealAnswer: `Fix it, then tell them, in that order and within minutes of finding it.

Fix: correct the budget immediately, pause anything still bleeding, and screenshot the state so the damage can be quantified exactly.

Quantify: how much was spent, how much was spent above plan, what it returned. A 450 dollar overspend that produced 900 dollars of sales is a very different message from a 1,200 dollar overspend with 200 dollars of sales, and I need to know which before I write.

Tell them the same day, and lead with it rather than burying it in a weekly update. Something like: I made an error on Friday, the daily budget on campaign X was set to 500 instead of 50. It spent 1,350 dollars over the weekend against a plan of 150. It returned 380 dollars in sales, so the net cost of my mistake is about 970 dollars. It is fixed as of 9am. Here is what I am changing so it cannot happen again — a second check on any budget change above 100 dollars, and an alert at 150 percent of planned daily spend.

Then I would offer to absorb part of it if the relationship and the amount warrant it. What I would never do is hope they do not notice. They always notice, and then the problem is not the money.`,
    keyPoints: [
      "Fixes first, then reports the same day",
      "Quantifies the net cost honestly, including any revenue",
      "States the specific prevention, not just an apology",
      "Never hides it or waits for the weekly report",
    ],
    redFlags: [
      "Hides the error and hopes it is missed",
      "Apologises with no numbers and no prevention",
      "Blames the interface or Amazon",
    ],
    followUps: [
      "The client asks you to refund it. What do you say?",
      "What alert would have caught this on Friday night?",
    ],
  },
  {
    id: "async-communication-timezones",
    category: "Client Management",
    level: "intermediate",
    tags: ["remote work", "communication", "time zones", "va"],
    answerSeconds: 75,
    question:
      "You are in Manila, your client is in California. How do you run communication across 15 hours?",
    idealAnswer: `I treat the time difference as an advantage and design around it rather than apologising for it.

The practical setup. I work a shift that overlaps their morning — typically 11pm to 7am Manila time gives me their early afternoon, or I take an early-morning Manila slot for their previous evening — and I state my hours plainly so nobody guesses. One fixed live call a week inside that overlap, 30 minutes, agenda sent the day before.

Everything else is async and designed to need no reply. My end-of-day message says what I did, what I found, what I need a decision on, and by when. Questions are batched into one message rather than trickled through the day, and anything needing a decision names a default: if I do not hear back by Thursday, I will proceed with option B.

Then the advantage: the reports and analysis they ask for at 5pm are on their desk at 8am. That gap is worth something, and I say so.

For genuine emergencies — budget runaway, account suspension, stock-out on the hero ASIN — there is one agreed channel that I check outside my hours.`,
    keyPoints: [
      "States working hours explicitly and builds a deliberate overlap",
      "One scheduled live call, everything else async",
      "Async updates that do not require a reply, with named defaults on decisions",
      "One agreed emergency channel with a definition of emergency",
    ],
    redFlags: [
      "Vague about availability, or claims to be available 24 hours",
      "Trickles questions all day and waits idle for answers",
      "No defined emergency path",
    ],
    followUps: [
      "What counts as an emergency worth waking up for?",
      "A decision is blocked for two days. How do you keep moving?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Troubleshooting Scenarios
   * ---------------------------------------------------------------- */
  {
    id: "acos-jumped-twenty-five-to-sixty",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    source: "Scenario-Based Q16",
    tags: ["diagnosis", "acos spike", "investigation"],
    answerSeconds: 90,
    question: "A client's ACoS jumped from 25 to 60 percent in one week. Walk me through the investigation.",
    idealAnswer: `I work from the cheapest checks to the most expensive, and from outside the ads console inward, because the cause is usually not the bids.

**Did the denominator break or the numerator?** ACoS is spend over sales. Check whether spend rose or sales fell. Sales falling is a listing, price, stock or competitor problem. Spend rising is an auction or a change I made.

**Our own changes.** The change log first. A bid increase, a new campaign, a budget change, a bidding strategy switch.

**Product side.** Out of stock, Buy Box lost, listing suppressed, price raised, a bad review landing, image changed.

**Search term report.** Almost always the answer when spend rose: a broad keyword started pulling a new expensive term. This is the single most common cause.

**Competitive and seasonal.** A competitor launched or cut price, or the category is in a seasonal dip.

**Attribution.** If it is only the last few days, part of the spike may be sales that have not been attributed yet.

Then I quantify: this much of the 35-point jump came from each cause. A diagnosis without proportions is a guess.`,
    keyPoints: [
      "Splits the problem into spend up versus sales down first",
      "Checks own change log before blaming externals",
      "Looks outside the ads console: stock, Buy Box, price, reviews",
      "Names the search term report as the most common cause and allows for attribution lag",
    ],
    redFlags: [
      "Immediately cuts all bids without diagnosing",
      "Never checks stock or Buy Box",
      "Blames the algorithm",
    ],
    followUps: [
      "Spend is flat and sales halved. Where do you look?",
      "It was one search term that spent 400 dollars. How did that happen?",
    ],
  },
  {
    id: "best-keyword-zero-impressions",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    source: "Scenario-Based Q21",
    tags: ["diagnosis", "impressions", "delivery"],
    answerSeconds: 75,
    question: "Your best-performing keyword suddenly has zero impressions. Investigate.",
    idealAnswer: `Zero impressions means not eligible or not competitive. I check eligibility first because it is binary and fast.

**Eligibility.** Is the product in stock? Does it hold the Buy Box? Ads do not serve without it. Is the listing suppressed or the ASIN inactive? Is the campaign or ad group paused, or outside its end date? Has the campaign hit its budget, or the portfolio its cap?

**Competitiveness.** If everything is live, the bid is below the market. A competitor may have entered, or a seasonal surge lifted CPCs across the category. Compare my bid to the current suggested range, and test a 20 to 30 percent increase to see whether impressions return.

**Account level.** Payment failure, a policy warning, or a category restriction can stop delivery across the board. If other campaigns also went quiet on the same day, it is account-level, not keyword-level.

**Reporting.** Confirm it is real and not a report pulled mid-day or a filter left applied.

Order matters: I have seen people spend an afternoon on bids when the answer was an out-of-stock variant.`,
    keyPoints: [
      "Checks eligibility before competitiveness",
      "Knows Buy Box loss stops ad delivery",
      "Checks budget and portfolio caps",
      "Looks for an account-wide pattern to distinguish scope",
    ],
    redFlags: [
      "Raises the bid as the first and only action",
      "Does not know losing the Buy Box stops ads",
      "Never checks whether other campaigns are also affected",
    ],
    followUps: [
      "Every campaign went to zero at the same time. What is your first check?",
      "Stock is fine, Buy Box is held, bid is at the suggested range. Now what?",
    ],
  },
  {
    id: "great-acos-declining-organic",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    source: "Scenario-Based Q18",
    tags: ["organic", "tacos", "diagnosis", "rank"],
    answerSeconds: 90,
    question: "A product has 15 percent ACoS but organic sales are declining. What is happening?",
    idealAnswer: `A 15 percent ACoS with falling organic usually means the account has been optimised into a corner: spend concentrated on the safest, mostly branded and bottom-funnel terms, which look efficient and do nothing for rank.

I would check three things. **TACoS**, because if ACoS is falling while TACoS rises, ads are taking a bigger share of a shrinking business. **Organic rank** on the head keywords over the last 60 to 90 days, which tells me whether this is a ranking slide or a demand slide. And **sessions and unit session percentage** from Business Reports, which separates a traffic problem from a conversion problem.

If sessions are down and conversion is stable, it is a ranking or demand problem. If conversion is down, it is a listing, price, review or competitor problem and no amount of bidding fixes it.

Assuming it is ranking: the fix is to deliberately re-invest in the non-branded head terms, accepting an ACoS above break-even on a defined list for six to eight weeks, and measuring on organic rank rather than on ACoS. I would put a budget cap and an end date on it, and agree both with the client before starting.`,
    keyPoints: [
      "Recognises efficient ACoS can mean under-investment in rank",
      "Checks TACoS, organic rank and Business Report conversion data",
      "Separates traffic problems from conversion problems",
      "Proposes a capped, time-boxed rank investment measured on rank",
    ],
    redFlags: [
      "Celebrates the 15 percent ACoS and ignores the decline",
      "Cuts spend further to protect ACoS",
      "Has no way to measure organic rank",
    ],
    followUps: [
      "Conversion rate is down 40 percent. Does your answer change?",
      "Which keywords would you re-invest in first?",
    ],
  },
  {
    id: "organic-seller-seventy-acos",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    source: "Scenario-Based Q26",
    tags: ["incrementality", "tacos", "diagnosis"],
    answerSeconds: 90,
    question:
      "A product sells well organically but its PPC runs at 70 percent ACoS. Should you keep advertising?",
    idealAnswer: `Not as it stands, but I would not switch it all off either. The question is which part of that spend is incremental.

First I segment the campaigns. Branded and defensive terms on a strong organic seller are largely rebuying sales that would arrive anyway — that is where a 70 percent ACoS is least defensible. Non-branded discovery terms may be genuinely bringing new customers, so I check new-to-brand share where the ad type reports it.

Then I look at whether the ads are supporting rank on terms where the organic position is fragile, meaning page one but not top three.

Then I test rather than argue. Pause the weakest segment for two weeks, keep everything else constant, and watch total sales — not ad sales. If total holds, the spend was cannibalising. If total falls, it was doing work nobody could see in ACoS.

My likely recommendation: cut 60 to 70 percent of that spend, keep a defensive floor on branded, keep the non-branded terms that show new-to-brand volume, and re-measure in a month.`,
    keyPoints: [
      "Reframes the question as incrementality rather than ACoS",
      "Segments branded, non-branded and rank-supporting spend",
      "Designs a holdout test measured on total sales",
      "Lands on a specific recommendation with a review point",
    ],
    redFlags: [
      "Pauses everything immediately",
      "Keeps spending because ads always help ranking",
      "Measures the test on ad sales alone",
    ],
    followUps: [
      "Total sales dropped eight percent during the pause. Interpretation?",
      "How long would you hold the test before deciding?",
    ],
  },
  {
    id: "good-acos-flat-sales",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    source: "Scenario-Based Q29",
    tags: ["incrementality", "diagnosis", "growth"],
    answerSeconds: 75,
    question: "The campaign has great ACoS but the client says sales are not increasing. Diagnose.",
    idealAnswer: `Two possibilities, and they need different answers.

**The ads are cannibalising organic.** Total sales flat while ad sales grow means we are paying for sales that were already happening. I would check the split between ad-attributed and organic sales month over month, check TACoS, and look at how much of the ad spend sits on branded terms. If TACoS is climbing while total sales are flat, that is the diagnosis.

**The ads are efficient but too small to matter.** A 15 percent ACoS on 400 dollars a month cannot move a 30,000 dollar business. Efficient and irrelevant at the same time. Here the answer is not optimisation, it is scale: expand into new keywords, new products or new ad types, and deliberately accept a higher ACoS to buy incremental volume.

Distinguishing them takes one look at ad spend as a share of total sales. Under about five percent, it is almost always the second.

Either way I would reframe the conversation with the client around total sales and TACoS, because an ACoS-only view is what produced an efficient account that does not grow.`,
    keyPoints: [
      "Offers two distinct hypotheses and how to tell them apart",
      "Uses TACoS and the ad share of total sales as the discriminator",
      "Recognises an efficient but sub-scale account",
      "Reframes the client conversation around total business impact",
    ],
    redFlags: [
      "Tries to lower ACoS further",
      "Cannot distinguish cannibalisation from insufficient scale",
      "Never looks at total sales",
    ],
    followUps: [
      "Ad spend is 3 percent of total sales. What do you propose?",
      "How would you prove cannibalisation to a sceptical client?",
    ],
  },
  {
    id: "cpc-higher-than-competitors",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    source: "Scenario-Based Q27",
    tags: ["cpc", "relevance", "diagnosis", "client comms"],
    answerSeconds: 75,
    question: "The client asks why their CPC is so much higher than competitors. What do you say?",
    idealAnswer: `I would start by asking how they know, because competitor CPC is not public. Usually they have heard a number at a conference or from a seller group, comparing a different category, marketplace and month.

Then the real answer. CPC is set by category competition, by your ad rank relative to other bidders, and by your bid. Ad rank includes relevance and expected conversion, so two sellers on the same keyword genuinely pay different prices — the one whose listing converts better pays less for the same position.

So the fixes, in order of leverage. Improve the listing so CTR and CVR rise, which raises ad rank and lowers CPC at the same bid — the only lever that makes clicks cheaper rather than fewer. Tighten targeting so we are not paying head-term prices for loose traffic. Shift weight toward long-tail keywords where competition is thinner. Then, and only then, adjust bids.

And I would set a realistic frame: in a category where the average CPC is 2.20 dollars, we are not going to run at 0.60. The goal is not the lowest CPC, it is the best cost per order.`,
    keyPoints: [
      "Questions the comparison before accepting the premise",
      "Explains relevance and ad rank as the cause of CPC differences",
      "Orders fixes by leverage, with listing quality first",
      "Redirects the goal from lowest CPC to best cost per order",
    ],
    redFlags: [
      "Accepts the comparison uncritically and promises to cut CPC",
      "Only lever offered is lowering the bid",
      "Cannot explain what determines CPC",
    ],
    followUps: [
      "How would you actually estimate a category's typical CPC?",
      "Lowering bids cut CPC but sales fell more. What next?",
    ],
  },
  {
    id: "budget-exhausted-by-noon",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["budget", "pacing", "diagnosis"],
    answerSeconds: 75,
    question: "A campaign spends its entire daily budget by 11am. Is that a problem?",
    idealAnswer: `It depends entirely on what the money bought, so I check efficiency before I change anything.

If that spend is profitable, the campaign is budget-constrained and I am leaving money on the table for the rest of the day, including the evening when most US categories convert best. The fix is more budget, in steps of 20 to 30 percent, watching whether efficiency holds as the extra hours are bought.

If that spend is unprofitable, spending it faster is worse, not better. Then the budget is acting as an accidental safety net and the real fix is bids, negatives or targeting.

What I check first: hourly spend if I have it, and ACoS on the campaign over the last 14 days against break-even. Then the search term report, because early exhaustion often means one broad term is eating the budget before the rest of the campaign gets a chance.

The trap to avoid is simply raising the budget because the campaign looks busy. Busy is not the same as profitable.`,
    keyPoints: [
      "Checks profitability before deciding whether it is a problem",
      "Knows early exhaustion means going dark during good hours",
      "Looks for one term eating the budget",
      "Raises budget in measured steps, watching efficiency",
    ],
    redFlags: [
      "Automatically raises the budget",
      "Automatically calls it a problem with no efficiency check",
      "Does not consider which hours are being lost",
    ],
    followUps: [
      "ACoS on that campaign is 55 percent against a 30 percent break-even. Now what?",
      "How would you find out which hours you are missing?",
    ],
  },
  {
    id: "clicks-but-no-conversions",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["conversion", "listing", "diagnosis"],
    answerSeconds: 90,
    question: "A campaign has 400 clicks this month and three orders. Where do you start?",
    idealAnswer: `A 0.75 percent conversion rate against a normal 8 to 12 percent is not a bidding problem. Something is wrong between the click and the checkout, and that is where I look.

**Is the traffic right?** Search term report first. Four hundred clicks on terms that do not match the product converts at exactly this rate. This is the most common cause on broad and auto campaigns.

**Is the offer right?** Open the listing as a shopper. Price against the top competing results, review count and star rating, main image, whether the title answers the search, whether the bullets address the obvious objection.

**Is it buyable?** In stock, Buy Box held, delivery estimate reasonable, no suppressed variant, correct variant being advertised.

**Is it measured right?** Attribution lag on very recent data, and whether the product is bought in a way the ad window misses.

The order matters because the fixes cost different amounts. Negatives take ten minutes. A price change is the client's decision. New images take two weeks. I would come back with a ranked list and the estimated impact of each, not just the observation that the listing is weak.`,
    keyPoints: [
      "Calculates the conversion rate and compares it to a benchmark",
      "Checks traffic relevance before blaming the listing",
      "Inspects the live listing and buyability, not only the reports",
      "Ranks the fixes by cost and speed to implement",
    ],
    redFlags: [
      "Lowers bids and declares it solved",
      "Never opens the actual product page",
      "Blames the listing with no specific evidence",
    ],
    followUps: [
      "Search terms are all relevant and the listing looks fine. Now what?",
      "The competitor at the top is 30 percent cheaper. What do you recommend?",
    ],
  },
  {
    id: "ads-not-eligible-to-serve",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["eligibility", "buy box", "suppression", "diagnosis"],
    answerSeconds: 75,
    question: "The campaign is live but the ad is not serving. What are the usual causes?",
    idealAnswer: `I work through an eligibility checklist, because almost all of these are binary and quick.

**Buy Box.** No Buy Box, no Sponsored Products ad. This is the most common cause and it can flip if another seller wins it on price or stock.

**Stock.** Out of stock, or a variant out of stock where the ad points at that child.

**Listing status.** Suppressed for a missing image or attribute, inactive, or flagged as a policy violation such as a restricted claim in the title.

**Category and content restrictions.** Some categories and claim types cannot be advertised, and creative can be rejected in Sponsored Brands for a keyword in the headline or a punctuation rule.

**Campaign settings.** Paused, end date passed, budget exhausted, portfolio cap reached, or a bid far below the floor.

**Account level.** Payment method failed or the advertising account is on hold.

The fastest signal: does the console show an eligibility warning on the ad or product, and did every campaign stop at once or only this one? That distinguishes an account problem from an ASIN problem in about thirty seconds.`,
    keyPoints: [
      "Buy Box named first as the most common cause",
      "Covers stock, suppression, policy and category restrictions",
      "Includes campaign settings and account-level payment issues",
      "Uses scope — one campaign or all — to narrow it fast",
    ],
    redFlags: [
      "Only considers bids and budget",
      "Does not know the Buy Box requirement",
      "No systematic checklist, just guesses",
    ],
    followUps: [
      "The Buy Box is being lost to a third-party seller. What do you advise?",
      "A Sponsored Brands creative was rejected. What do you check?",
    ],
  },
  {
    id: "overnight-spend-spike",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["spend spike", "diagnosis", "controls"],
    answerSeconds: 75,
    question: "You log in and yesterday's spend was triple normal. First five minutes?",
    idealAnswer: `**Stop the bleeding first, diagnose second.** If spend is still running at that rate, I cap the budgets on the affected campaigns right away. A wrong pause costs a few hours of sales; an uncapped runaway costs a month of budget.

Then the fastest diagnostic path. Sort campaigns by yesterday's spend against the prior seven-day average to find where it came from — it is usually one campaign, sometimes one keyword. Check the change log for anything I or the client altered: a budget edit, a bidding strategy switch to up and down, a new campaign launched with a high suggested bid, an automation rule firing.

If nothing changed on our side, check the search term report for that campaign. A broad keyword catching a suddenly trending term will do exactly this.

Then check whether it was actually bad. Triple spend with quadruple sales is a good day, not an incident.

Then I write to the client the same morning with what happened, what it cost, what I did, and the control I am adding — usually a spend alert at 150 percent of the daily plan.`,
    keyPoints: [
      "Caps spend before completing the diagnosis",
      "Isolates the source by comparing against a recent average",
      "Checks the change log and automation before external causes",
      "Verifies whether the spike was actually unprofitable, and reports proactively",
    ],
    redFlags: [
      "Spends an hour analysing while the spend continues",
      "Pauses the entire account indiscriminately",
      "Waits for the client to notice",
    ],
    followUps: [
      "The spike came from your own automation rule. What changes?",
      "What alert would have caught this at 2am?",
    ],
  },
  {
    id: "ad-sales-do-not-match-seller-central",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["reporting", "attribution", "data", "client comms"],
    answerSeconds: 75,
    question: "The client says your ad sales number does not match their Seller Central total. Explain.",
    idealAnswer: `They should not match, and being able to explain why calmly is the whole answer here.

The reasons. **Attribution window**: ad sales are credited to the click date, so a click on the 30th converting on the 2nd lands in the previous month's ad report but in this month's Seller Central sales. **Scope**: ad sales count only sales attributed to ads, while Seller Central counts everything including organic. **Halo**: Sponsored Products credits sales of the advertised ASIN plus, in some reports, other ASINs from the same brand, so the two figures count different baskets. **Timing and time zone**: reports pulled on different days, or in different time zones, will differ. **Returns and cancellations**: Seller Central nets them out over time while the ad report may not have caught up.

What I do about it. I state the pull date and the window on every report, I show ad sales and total sales side by side so the gap is visible and expected rather than suspicious, and if the difference is large and unexplained, I reconcile a single day line by line and show the working.

The worst response is to argue about which number is right. Both are right; they measure different things.`,
    keyPoints: [
      "Names attribution window, scope, halo, timing and returns",
      "Understands the two numbers measure different things",
      "Prevents the problem by showing both figures and the pull date",
      "Offers a line-by-line reconciliation for a large gap",
    ],
    redFlags: [
      "Says one of the reports is broken",
      "Cannot explain the attribution window",
      "Gets defensive about the discrepancy",
    ],
    followUps: [
      "Ad sales are 40 percent higher than total sales. Possible?",
      "How do you reconcile a single day?",
    ],
  },
  {
    id: "impressions-collapsed-after-listing-edit",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["listing", "relevance", "diagnosis", "impressions"],
    answerSeconds: 75,
    question:
      "The client updated the listing title on Monday and impressions collapsed by Wednesday. What happened?",
    idealAnswer: `Most likely the edit broke keyword relevance, indexing, or the listing's status, and all three are checkable.

**Indexing.** If the new title dropped the main keywords, the ASIN can stop being indexed for those terms, and ads lose relevance and eligibility on them. I would search the exact phrase plus the ASIN to see whether it still appears.

**Suppression or review.** Title edits can push a listing into review or suppression if they break a category rule, a character limit or a prohibited claim. Suppressed listings do not serve ads.

**Relevance score.** Even without suppression, a title that no longer matches the targeted keywords lowers ad rank, so the same bid wins far fewer auctions.

**Coincidence.** I would still check stock, Buy Box, budget and whether a competitor moved, because the timing may be a red herring.

The fix if it is the title: revert first, confirm impressions recover, then reintroduce the intended change in smaller steps with the head keywords preserved. And the process fix is more important than the incident — listing changes need to be flagged to me before they go live, because I cannot diagnose an account I do not know changed.`,
    keyPoints: [
      "Names indexing, suppression and relevance as the three mechanisms",
      "Verifies indexing rather than assuming",
      "Still checks the mundane causes despite the obvious timing",
      "Reverts, confirms, then re-applies in steps, and fixes the process",
    ],
    redFlags: [
      "Raises bids to recover impressions without diagnosing",
      "Does not know listing content affects ad relevance",
      "No process change to catch the next listing edit",
    ],
    followUps: [
      "How do you check whether an ASIN is indexed for a keyword?",
      "The client refuses to revert. What do you do?",
    ],
  },
  {
    id: "hero-asin-out-of-stock",
    category: "Troubleshooting Scenarios",
    level: "scenario",
    tags: ["stock", "inventory", "rank", "crisis"],
    answerSeconds: 90,
    question: "The hero ASIN goes out of stock with ten days of restock lead time. What do you do?",
    idealAnswer: `Protect the money first, protect the rank second, and plan the comeback third.

**Immediately.** Pause or heavily reduce campaigns pointing at the out-of-stock ASIN. Ads on an unbuyable product spend on clicks that cannot convert, and they teach Amazon the ASIN converts badly on those keywords, which hurts after restock.

**Redirect.** Shift the budget to in-stock products, especially anything in the same category that can absorb the demand. A variant in stock, an alternative size, a second product line.

**Protect what can be protected.** If a small quantity remains, I lower bids rather than pausing, so the listing keeps some velocity without selling out in an afternoon.

**Prepare the restock.** Do not switch everything back on at full bid on day one. Re-enter with bids around 20 percent below the previous level and build back over a week, because campaigns restart with cold recent history and a full-throttle restart in a competitive category is expensive.

**Tell the client** the expected rank impact and the recovery window — typically two to four weeks to return to previous rank after a ten-day gap — so the following month's numbers are not a surprise.`,
    keyPoints: [
      "Pauses spend on the unbuyable ASIN immediately and explains why",
      "Reallocates budget rather than banking it",
      "Plans a graduated restart rather than full bids on day one",
      "Sets client expectations on rank recovery time",
    ],
    redFlags: [
      "Leaves campaigns running on an out-of-stock product",
      "Turns everything back on at full bid the day stock lands",
      "Does not warn the client about the rank effect",
    ],
    followUps: [
      "Stock lands early, on day four. Does the restart change?",
      "How do you avoid this happening again?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Behavioral
   * ---------------------------------------------------------------- */
  {
    id: "tell-me-about-yourself",
    category: "Behavioral",
    level: "beginner",
    tags: ["opener", "positioning", "interview craft"],
    answerSeconds: 90,
    question: "Tell me about yourself.",
    idealAnswer: `Ninety seconds, three parts, ending where the job starts.

**Now.** One line on what I do and for whom. For example: I manage Amazon PPC for three private-label sellers in the home and kitchen category, about 18,000 dollars a month in combined ad spend.

**How I got here.** The short path, with a number in it. I started as a general VA doing listings and customer service, noticed the ads were the part nobody could explain, took the PPC work on, and cut one client's ACoS from 48 to 29 percent over four months while holding sales flat.

**Why this role.** Something specific to them, which means I have read their site and their listings. For example: you manage supplement brands, which is a high-CPC category where search term discipline matters more than anywhere else, and that is the part of the job I am strongest at.

What I leave out: where I was born, my whole CV in order, and anything I would be embarrassed to be asked about next. This is a positioning statement, not a life story, and it should invite exactly the follow-up question I want.`,
    keyPoints: [
      "Structured and under two minutes",
      "Contains at least one concrete number from real work",
      "Ends on why this specific employer, showing preparation",
      "Invites the follow-up rather than exhausting the topic",
    ],
    redFlags: [
      "Chronological life story from school onwards",
      "No numbers or specifics anywhere",
      "Clearly generic and reusable for any job",
    ],
    followUps: [
      "You mentioned cutting ACoS from 48 to 29. How exactly?",
      "Why Amazon PPC rather than Google or Meta?",
    ],
  },
  {
    id: "why-specialise-in-ppc",
    category: "Behavioral",
    level: "beginner",
    source: "VA-Specific Q51",
    tags: ["motivation", "career", "positioning"],
    answerSeconds: 60,
    question: "Why do you want to specialise in Amazon PPC instead of general VA work?",
    idealAnswer: `Three honest reasons.

**It is measurable.** In general VA work my value is hard to prove — inbox handled, listings updated. In PPC I can say I took this account from 52 to 31 percent ACoS while growing sales 18 percent. That is a number a client can act on, and it is the reason a specialist earns two to three times a general VA rate.

**It compounds.** Every account teaches me something that transfers to the next one. Patterns in search term reports, category CPC ranges, what a broken structure looks like. General VA work is broad but does not stack in the same way.

**It is genuinely in demand.** Sellers can find someone to answer emails. Finding someone who can read a search term report and make a defensible bid decision is much harder, and that gap is where a career is.

I would not pretend the money is irrelevant. It is part of it. But the part that keeps me interested is that PPC is a problem with a right answer somewhere in the data.`,
    keyPoints: [
      "Names measurability as the core reason",
      "Mentions the rate difference without making money the only motive",
      "Talks about skill compounding across accounts",
      "Shows genuine interest in the work itself",
    ],
    redFlags: [
      "Only reason given is higher pay",
      "Generic passion language with nothing specific behind it",
      "Disparages general VA work",
    ],
    followUps: [
      "What was the last thing about PPC you found genuinely hard?",
      "Where do you want to be in two years?",
    ],
  },
  {
    id: "manage-time-multiple-accounts",
    category: "Behavioral",
    level: "intermediate",
    source: "VA-Specific Q52",
    tags: ["time management", "process", "multiple clients"],
    answerSeconds: 75,
    question: "How do you manage your time across multiple Amazon accounts?",
    idealAnswer: `By batching by task rather than switching by client, because context-switching between accounts is where the hours disappear.

My week. Every morning, a 15-minute health check across all accounts — budget pacing, anomalies, stock, anything that stopped delivering. Monday is search term day: every account's search term report, harvest and negate, in one block. Tuesday is bid day. Wednesday is reporting and client communication. Thursday is deep work — restructures, new campaigns, research. Friday is buffer, because something always breaks.

What makes it hold together. An SOP for every repeatable task, so the work is identical whether I am fresh or tired. A shared tracker with the status of each account. Alerts for the things that cannot wait until their scheduled slot.

Capacity is honest too. I can carry four to six accounts at this depth, depending on size. Past that, quality drops before my calendar does, and I would rather say that than take a seventh and do all of them badly.`,
    keyPoints: [
      "Batches by task rather than switching between clients",
      "Describes a specific weekly structure",
      "Uses SOPs and alerts to protect consistency",
      "Honest about capacity limits",
    ],
    redFlags: [
      "Works reactively, whoever shouts loudest",
      "Claims unlimited capacity",
      "No documented process at all",
    ],
    followUps: [
      "Two clients both have an emergency on Monday morning. What happens?",
      "How long does a weekly review take per account?",
    ],
  },
  {
    id: "learning-new-features",
    category: "Behavioral",
    level: "intermediate",
    source: "VA-Specific Q53",
    tags: ["learning", "development", "amazon updates"],
    answerSeconds: 60,
    question: "How do you keep up with new Amazon advertising features?",
    idealAnswer: `A small number of sources I actually read, plus a rule about testing.

Sources: the Amazon Ads announcements and the console's own release notes, which are the primary source and where everything else is downstream of. One or two practitioner communities — the PPC subreddits and a couple of seller groups — for the unfiltered experience of people who tried it first. A webinar or two a quarter from the tool vendors, where I take the technique and discount the sales pitch.

The rule: I never test a new feature on a client's main campaign. New features get a small budget on a secondary ASIN for two to four weeks, and I write down what happened. Amazon's beta features are often genuinely unfinished, and the reporting for them is usually the last part to arrive.

Then I document it in my own notes — what it is, when to use it, what it cost to find out. Those notes are what make me faster on the next account, and it is also what I hand over if somebody else picks up the work.`,
    keyPoints: [
      "Names primary sources, not just influencers",
      "Tests new features on low-risk campaigns first",
      "Documents learnings for reuse and handover",
      "Sceptical about vendor webinars and beta reporting",
    ],
    redFlags: [
      "Learns only from YouTube and follows whatever is trending",
      "Tests new features on a client's top campaign",
      "Has no learning routine at all",
    ],
    followUps: [
      "What is the most recent Amazon Ads change you noticed?",
      "How would you evaluate a new beta placement?",
    ],
  },
  {
    id: "daily-routine",
    category: "Behavioral",
    level: "intermediate",
    source: "VA-Specific Q55",
    tags: ["routine", "process", "daily"],
    answerSeconds: 75,
    question: "Describe your daily routine as an Amazon PPC VA.",
    idealAnswer: `Roughly this shape, on a shift that overlaps the client's morning.

**First 30 minutes — health check across all accounts.** Budget pacing, campaigns that stopped delivering, out-of-stock alerts, anything that spent abnormally overnight. Monitoring only; no optimisation at this hour.

**Next hour — the day's scheduled block.** Search terms on Monday, bids on Tuesday, reporting Wednesday, deep work Thursday. Batched across accounts so I am in one mental mode.

**Mid-shift — client communication.** Replies, questions batched into single messages, and the end-of-day update for whoever is about to start their day.

**Later — project work.** Campaign builds, restructures, keyword research, anything requiring uninterrupted attention.

**Last 20 minutes — log and plan.** Update the change log, note anything for tomorrow, flag anything a client needs to decide.

The part I protect is the first 30 minutes. Everything else can slip by a day; an unnoticed budget runaway cannot.`,
    keyPoints: [
      "Opens with monitoring, not optimisation",
      "Scheduled deep-work blocks rather than reactive drift",
      "Includes client communication as a planned slot",
      "Ends with logging and planning",
    ],
    redFlags: [
      "Describes checking the account all day with no structure",
      "No daily monitoring routine",
      "No time set aside for documentation",
    ],
    followUps: [
      "Which part of that routine would break first under load?",
      "What is on the 30-minute health check, exactly?",
    ],
  },
  {
    id: "staying-organised",
    category: "Behavioral",
    level: "intermediate",
    source: "VA-Specific Q57",
    tags: ["organisation", "tools", "process"],
    answerSeconds: 60,
    question: "How do you stay organised across multiple clients and deadlines?",
    idealAnswer: `Four things, and they are boring on purpose.

**One board for everything.** Trello, Asana or Notion, with a card per recurring task per account and a due date. If it is not on the board it does not exist, which also means I stop holding things in my head at 2am.

**A calendar with the recurring blocks already in it**, so weekly and monthly work is scheduled rather than remembered.

**SOPs for every repeatable process** — the daily health check, the search term routine, the monthly report. Written once, followed identically, and they are what makes the work handover-ready.

**A change log per account**, with date, what changed, and why.

Then a weekly review on Friday: what got done, what slipped, what next week looks like, and one message to each client so nothing goes a week without contact.

The test of a system is what happens when I get sick. If somebody else can pick up my accounts from the board and the SOPs, it works. If it only lives in my head, it does not.`,
    keyPoints: [
      "Names a specific system, not just the intention to be organised",
      "Recurring work is scheduled rather than remembered",
      "SOPs and a change log make the work auditable",
      "Weekly review, and the handover test as the standard",
    ],
    redFlags: [
      "Keeps it all in their head",
      "No documentation of changes made",
      "Reactive to whoever emails most recently",
    ],
    followUps: [
      "Show me what a card for a weekly search term review contains.",
      "What happens to your accounts if you are sick for a week?",
    ],
  },
  {
    id: "dont-know-the-answer",
    category: "Behavioral",
    level: "intermediate",
    source: "VA-Specific Q58",
    tags: ["honesty", "client comms", "learning"],
    answerSeconds: 60,
    question: "What do you do when you do not know the answer to a client's question?",
    idealAnswer: `I say so, with a deadline attached.

The wording I use: that is a good question and I do not want to guess at it. Let me check and come back to you by 3pm today. Then I come back by 3pm, even if the answer is that it is more complicated than expected and here is what I know so far.

Where I check, in order: Amazon Ads documentation and the help pages, because they are authoritative; my own notes from previous accounts; practitioner communities for the practical reality; and occasionally another specialist I know.

If it is still uncertain after that, I say that too, with a recommendation attached: the documentation is not explicit on this, here is what I have seen in other accounts, and here is a small test that would settle it in two weeks.

Then I write it down, because a question asked once will be asked again by the next client.

The failure mode I avoid is confident guessing. A wrong answer delivered fluently costs far more than an hour of not knowing, and clients remember it.`,
    keyPoints: [
      "Admits it directly and commits to a specific deadline",
      "Names a research order starting with authoritative sources",
      "Offers a recommendation plus a test when the answer stays uncertain",
      "Documents the answer for reuse",
    ],
    redFlags: [
      "Guesses confidently rather than admitting the gap",
      "Says I will get back to you and does not",
      "Treats not knowing as something to hide",
    ],
    followUps: [
      "Tell me about a time you had to say you did not know.",
      "The client needs an answer in the next ten minutes. What do you do?",
    ],
  },
  {
    id: "micromanaging-client",
    category: "Behavioral",
    level: "expert",
    source: "VA-Specific Q59",
    tags: ["client comms", "trust", "boundaries"],
    answerSeconds: 75,
    question: "How do you handle a client who micromanages your work?",
    idealAnswer: `I treat it as a trust deficit rather than a personality problem, because that is usually what it is — often inherited from the last person who managed their account badly.

My response is more transparency, not less. A short structured update at a predictable time, so they never have to ask. A visible change log they can open whenever they like. Explaining the reasoning behind a decision rather than just the decision, so they can see the thinking rather than having to audit the outcome.

Then boundaries, stated warmly and specifically: I will update you every Monday and Thursday, I will reply within one business day, and for anything urgent this channel reaches me. That is a commitment, not a brush-off, and it works because it is more reliable than what they were doing.

Then patience. Trust is bought with three or four cycles of doing exactly what I said I would do, and most micromanaging fades once the client stops expecting surprises.

If it does not fade after a couple of months, I would raise it directly and ask what would make them comfortable. Sometimes the honest answer is that the relationship is not a fit.`,
    keyPoints: [
      "Reads micromanagement as a trust problem with a cause",
      "Responds with proactive transparency rather than resistance",
      "Sets specific, generous communication boundaries",
      "Willing to raise it directly if it persists",
    ],
    redFlags: [
      "Gets defensive or goes quiet",
      "Complains about the client rather than adapting",
      "Sets boundaries as an ultimatum on day one",
    ],
    followUps: [
      "They want approval on every bid change. Is that workable?",
      "How long before you raise it directly?",
    ],
  },
  {
    id: "biggest-mistake-new-ppc-vas",
    category: "Behavioral",
    level: "advanced",
    source: "VA-Specific Q60",
    tags: ["mistakes", "judgement", "coaching"],
    answerSeconds: 75,
    question: "What is the biggest mistake you see new PPC VAs make?",
    idealAnswer: `Changing too much, too fast, on too little data.

The pattern is always the same: a new VA takes over, wants to show value in week one, and changes 80 bids, adds 30 negatives and pauses six campaigns. Two weeks later performance has moved and nobody can say which change did it — including them.

A close second is ignoring the search term report. It is the highest-value hour in the week and it is the one juniors skip because it is tedious and nothing in the console prompts you to do it.

Third is optimising to ACoS with no idea of the margin. Driving ACoS from 35 to 22 percent sounds like a win right up until you learn break-even was 40 and you just cut profitable volume.

Fourth is silence. Clients do not panic because performance dipped; they panic because nobody told them.

What I do instead: change a limited number of things per cycle, write down what and why, wait for data, and tell the client before they ask.`,
    keyPoints: [
      "Names over-changing without data as the primary error",
      "Includes ignoring search term reports",
      "Includes optimising blind to margin",
      "Includes poor communication, and states the counter-practice",
    ],
    redFlags: [
      "Cannot name a single common mistake",
      "Describes only technical mistakes and none about communication",
      "Describes mistakes they clearly still make",
    ],
    followUps: [
      "How many changes per week is reasonable on a new account?",
      "Which of those have you made yourself?",
    ],
  },
  {
    id: "tell-me-about-a-mistake",
    category: "Behavioral",
    level: "intermediate",
    tags: ["mistakes", "accountability", "star"],
    answerSeconds: 90,
    question: "Tell me about a time you made a mistake that cost a client money.",
    idealAnswer: `Answer it with a real one, in four parts, and do not pick a fake weakness.

**Situation.** Early on I was managing a kitchen products account and added a negative phrase rather than negative exact, trying to block one bad search term.

**What went wrong.** The phrase I negated appeared inside the account's best-converting keyword, so I silently killed its top keyword. Impressions on it went to zero. I did not notice for five days because I was watching ACoS, which actually improved — the most expensive keyword had stopped running.

**The cost and the fix.** Roughly 1,400 dollars in lost sales over five days. I found it on the weekly check, removed the negative, told the client the same morning with the number, and rebuilt the bid over the following week.

**What changed permanently.** Two things. I check what a negative phrase would block before adding it. And my daily check now includes campaigns whose impressions dropped more than 50 percent, not only spend and ACoS, because a metric improving can hide a problem.

The point is not the mistake. It is that the monitoring gap it revealed is closed.`,
    keyPoints: [
      "Uses a real, specific mistake with a genuine cost",
      "Owns it without blaming anyone else",
      "Explains how it was detected and how quickly the client was told",
      "Names a permanent process change that prevents a recurrence",
    ],
    redFlags: [
      "Cannot think of any mistake",
      "Chooses a fake weakness such as caring too much",
      "Blames the client, the tool or Amazon",
    ],
    followUps: [
      "How long did the client stay with you afterwards?",
      "What else does your daily check catch now that it did not before?",
    ],
  },
  {
    id: "rate-expectations",
    category: "Behavioral",
    level: "intermediate",
    tags: ["rate", "negotiation", "career"],
    answerSeconds: 75,
    question: "What are your rate expectations?",
    idealAnswer: `I answer with a range tied to scope, and I try to get their band first without being evasive about it.

Something like: for managing PPC on three to five accounts at this size, with weekly optimisation and monthly reporting, I am looking at X to Y per month. Do you have a band in mind for this role, so I can tell you whether the scope fits it?

Two things make that work. Anchoring on scope rather than hours, because a rate quoted per hour invites a conversation about hours instead of results. And knowing the market: a general VA and a PPC specialist are different roles with different rates, and an experienced Filipino PPC specialist managing real spend sits well above general VA rates.

If the number comes back below my range, I do not immediately concede. I ask what scope their number covers, and either adjust the scope to fit the budget or explain what the difference buys — for example, weekly optimisation instead of fortnightly.

What I never do is name a low number to seem safe. It is very hard to renegotiate upward later, and a client who chose you purely on price will replace you on price.`,
    keyPoints: [
      "Gives a range anchored to scope, not to hours",
      "Asks for their band without dodging the question",
      "Prepared to adjust scope rather than just discount",
      "Does not undersell to seem safe",
    ],
    redFlags: [
      "Says whatever you think is fair",
      "Names an hourly rate with no scope attached",
      "Undercuts dramatically to win the role",
    ],
    followUps: [
      "Our budget is 30 percent below your range. What can you do?",
      "How would your rate change if we added two more accounts?",
    ],
  },
  {
    id: "where-do-you-see-yourself",
    category: "Behavioral",
    level: "beginner",
    tags: ["career", "motivation", "growth"],
    answerSeconds: 60,
    question: "Where do you see yourself in two years?",
    idealAnswer: `Specific, and pointed at something the employer can actually offer.

My answer: still in Amazon advertising, managing larger accounts with more autonomy. Concretely, I want to be running accounts in the 50,000 dollar a month spend range rather than the 15,000 range, owning strategy rather than only execution, and ideally training one or two juniors, because teaching the search term routine to somebody else is the fastest way to find the holes in your own thinking.

I would also want to be deeper in the areas I am currently weakest — DSP and the analysis side, particularly building the reporting layer properly rather than maintaining spreadsheets.

What I deliberately do not say: that I plan to start my own agency in eighteen months, even if it is true. And I do not claim to want to stay in exactly the same seat forever, because nobody believes it.

The honest framing is growth inside the discipline, which is what an employer is hoping to hear from someone they are about to train.`,
    keyPoints: [
      "Concrete and measurable, not vague ambition",
      "Growth stays inside the discipline the employer is hiring for",
      "Names a genuine development gap",
      "Realistic rather than performative loyalty",
    ],
    redFlags: [
      "Announces plans to leave and compete",
      "No ambition at all",
      "Ambition unrelated to the role being offered",
    ],
    followUps: [
      "What would you need from us to get there?",
      "Which part of PPC are you weakest at right now?",
    ],
  },

  /* ---------------------------------------------------------------- *
   * Situational & Role-play
   * ---------------------------------------------------------------- */
  {
    id: "launch-product-zero-reviews",
    category: "Situational & Role-play",
    level: "scenario",
    source: "Scenario-Based Q17",
    tags: ["launch", "new product", "strategy", "reviews"],
    answerSeconds: 90,
    question: "You are launching a new product with zero reviews. How do you approach PPC?",
    idealAnswer: `Before any ads: the listing has to be finished. Seven images including infographics, a title with the main keyword, bullets that answer the obvious objections, A-plus content if Brand Registry allows. Paid traffic into an unfinished listing wastes money and teaches Amazon the ASIN converts badly.

Then the plan. **Set expectations first**: 40 to 60 percent ACoS for the first four to eight weeks is normal, and profitability is a phase-two goal. A client who is not told this will fire you in week three.

**Week one to two**: auto campaign plus a manual exact campaign on the five to ten keywords I am most confident in, bids at or slightly above suggested to actually win impressions, modest budgets.

**Week two to four**: harvest from auto into exact, negate the noise, add product targeting against weaker competitors.

**Throughout**: enrol in Vine for the first reviews, because conversion rate is the binding constraint and no bid fixes zero reviews.

**Week four onwards**: start tightening. Once 15 to 20 reviews land and CVR stabilises, bring ACoS down toward break-even deliberately rather than all at once.`,
    keyPoints: [
      "Fixes the listing before spending",
      "Sets the client expectation of high early ACoS explicitly",
      "Phased plan with a specific week-by-week shape",
      "Addresses reviews as the real conversion constraint",
    ],
    redFlags: [
      "Expects profitability in week one",
      "Launches ads on an incomplete listing",
      "No mention of reviews or conversion rate",
    ],
    followUps: [
      "Four weeks in, ACoS is 85 percent. Continue or stop?",
      "What budget would you ask for to launch properly?",
    ],
  },
  {
    id: "three-hundred-budget-eight-products",
    category: "Situational & Role-play",
    level: "scenario",
    source: "Scenario-Based Q19",
    tags: ["budget", "allocation", "prioritisation"],
    answerSeconds: 90,
    question: "You have 300 dollars a month across eight products. How do you allocate it?",
    idealAnswer: `Not evenly. Three hundred dollars split eight ways is 37 dollars per product per month, about a dollar a day, which buys roughly one click. That produces no sales and no data.

So I concentrate. **Identify the two or three products that already convert** — best conversion rate and best margin from the Business Reports, not the client's favourite. **Put 70 percent, around 210 dollars, on those.** Enough to run real campaigns with enough clicks to make weekly decisions.

**Twenty percent, around 60 dollars, on one growth product** that shows promise but needs data.

**Ten percent, around 30 dollars, as a rotating test** — one product a month gets a 30-day trial, and if it cannot produce a sale at that level it goes back in the queue.

The other four or five products get no ads and rely on organic and category browse. I would say that to the client directly, with the arithmetic, because the alternative is eight failures instead of two or three successes.

Then the goal is to earn a bigger budget: prove 3.5x ROAS on 300 dollars and asking for 600 is an easy conversation.`,
    keyPoints: [
      "Refuses to spread evenly and shows the per-product arithmetic",
      "Selects winners from conversion and margin data",
      "Concrete percentage split with a rotating test slot",
      "Frames the goal as earning a larger budget with proof",
    ],
    redFlags: [
      "Splits it evenly across eight products",
      "Picks products by the client's preference with no data",
      "Will not tell the client that some products get nothing",
    ],
    followUps: [
      "The client's favourite product is not in your top three. How does that call go?",
      "What ROAS would you need to justify doubling the budget?",
    ],
  },
  {
    id: "competitor-bidding-on-brand",
    category: "Situational & Role-play",
    level: "scenario",
    source: "Scenario-Based Q20",
    tags: ["brand defence", "competitors", "strategy"],
    answerSeconds: 75,
    question: "A competitor is running ads on your client's brand name. How do you respond?",
    idealAnswer: `Calmly, because this is normal and mostly legal.

**Defend first.** Make sure we own our own brand terms: exact match on the brand name and brand-plus-product variants, bids high enough to hold top of search, plus Sponsored Brands for the banner and Sponsored Display on our own detail pages. Being outbid on your own name is the actual damage; the competitor's presence is secondary.

**Quantify it.** How much traffic are they actually intercepting? Brand Analytics click share on the brand term tells us whether this is a real leak or an irritation.

**Check for a legal line.** Bidding on a trademarked brand name as a keyword is allowed. Using it in the ad copy or headline is not, and that is reportable to Amazon.

**Consider the counter.** If they are targeting our brand, their brand terms are often cheap and their customers are reachable. I would test a small conquest campaign rather than escalate a bidding war on our own name, which only raises our costs on traffic we were getting anyway.

**Tell the client** what it is costing and what we are doing, before they discover it themselves and panic.`,
    keyPoints: [
      "Defends own brand terms first",
      "Quantifies the actual traffic loss rather than reacting emotionally",
      "Knows trademark in ad copy is the reportable line, keyword bidding is not",
      "Considers a measured counter rather than an escalation",
    ],
    redFlags: [
      "Claims bidding on a competitor brand name is illegal",
      "Escalates into an expensive bidding war immediately",
      "Ignores it entirely",
    ],
    followUps: [
      "Client wants to spend whatever it takes to push them off. Your advice?",
      "How would you measure whether the defence is working?",
    ],
  },
  {
    id: "inherit-ninety-acos-account",
    category: "Situational & Role-play",
    level: "scenario",
    source: "Scenario-Based Q25",
    tags: ["rescue", "audit", "30-day plan", "turnaround"],
    answerSeconds: 120,
    question: "You inherit an account at 90 percent ACoS and the seller is losing money. Your 30-day plan?",
    idealAnswer: `**Week one — stop the bleeding and audit.** Pause anything above 100 percent ACoS with under one percent conversion after a real click threshold. Add the obvious negatives from a 60-day search term pull. Export everything and get margins per ASIN so I know what break-even actually is. Tell the client what I found and what the first month will look like.

**Week two — restructure.** Build proper campaign hierarchy: auto for discovery, manual exact for proven terms, product targeting for conquest. Migrate the keywords that already convert into the new exact campaigns. Aggressive negatives across the board.

**Week three — bids.** Rebuild bids from target ACoS and actual conversion rate rather than the inherited numbers. Focus on the keywords with 20 to 40 percent ACoS potential. Set placement multipliers from the placement report instead of guesswork.

**Week four — consolidate.** Scale what works, cut what does not, and report.

The realistic target: 50 to 60 percent by day 30. Still above break-even, but trending hard in the right direction, with the structure in place to reach 30 to 35 percent by day 90.

I would state that trajectory up front. Promising 30 percent in 30 days on an account this broken is how you lose the client in month two.`,
    keyPoints: [
      "Week-by-week plan with different work in each",
      "Stops obvious losses immediately, then restructures",
      "Gets margins before rebuilding bids",
      "Sets a realistic 30-day target and a 90-day trajectory",
    ],
    redFlags: [
      "Promises break-even in 30 days",
      "Pauses everything in week one",
      "Rebuilds bids before knowing the margins",
    ],
    followUps: [
      "Day 30 and you are at 72 percent, not 55. What do you tell the client?",
      "Which campaigns do you refuse to touch in week one?",
    ],
  },
  {
    id: "q4-black-friday-plan",
    category: "Situational & Role-play",
    level: "scenario",
    source: "Scenario-Based Q30",
    tags: ["q4", "black friday", "seasonality", "planning"],
    answerSeconds: 120,
    question: "It is October and the client wants a Q4 plan for Black Friday. Walk me through it.",
    idealAnswer: `**October — build.** Structure and keyword research done now, not in November. Baseline bids established, budgets confirmed, stock position checked against forecast, and any new campaigns launched early so they exit the learning period before traffic arrives. I also agree the daily budget ceilings in writing, because nobody wants that conversation at 2am on Black Friday.

**Early November — ramp.** Increase spend around 20 percent a week to build conversion history at rising volume. Harvest aggressively; Q4 search terms differ from the rest of the year, with gift intent showing up in the data.

**16 to 24 November — aggressive.** Bids up 30 to 50 percent on proven converters, budgets two to three times normal. CPCs across the category rise sharply, and holding position matters more than holding ACoS. I expect ACoS to rise and I have already told the client it will.

**Black Friday to Cyber Monday — monitor hourly.** Watch budget caps, stock and top-of-search share. The single biggest risk is a winning campaign capping out at noon.

**December — taper** back to sustainable levels, and keep the winners running through the post-Christmas gift-card surge, which is underrated.

**January — analyse**, harvest everything Q4 taught us, and write the plan for next year while it is fresh.`,
    keyPoints: [
      "Starts preparation in October, not November",
      "Ramps gradually to build conversion history before the peak",
      "Expects and pre-communicates higher ACoS and CPC during peak",
      "Names budget cap and stock-out as the top operational risks",
    ],
    redFlags: [
      "Starts increasing bids on Black Friday itself",
      "Keeps normal budget caps through the peak",
      "Treats rising Q4 ACoS as a failure",
    ],
    followUps: [
      "Stock runs low on 22 November. What changes?",
      "How do you handle the first week of January?",
    ],
  },
  {
    id: "negative-reviews-hurting-ppc",
    category: "Situational & Role-play",
    level: "scenario",
    source: "VA-Specific Q54",
    tags: ["reviews", "conversion", "client comms"],
    answerSeconds: 90,
    question: "Negative reviews are killing the conversion rate on the client's main product. What do you do?",
    idealAnswer: `Ads cannot fix a review problem, so my first job is to make sure the client knows that quickly and with evidence.

**Quantify it.** Show conversion rate before and after the reviews landed, and the effect on cost per order. Something like: CVR fell from 11 to 6 percent, so the same bids now cost nearly twice as much per order.

**Read the reviews properly** and group them. Product defect, shipping damage, expectation mismatch from the listing, or a competitor attack. The response differs for each — a defect is the client's manufacturing problem, but an expectation mismatch is often a listing problem I can help with directly.

**Adjust the spend** while the underlying issue is fixed. Reduce, do not stop: I would cut spend on the affected ASIN by something like half, pull back the expensive head terms, keep the long-tail terms where intent is specific, and shift the freed budget to the client's better-reviewed products.

**Recommend the fixes** outside advertising: address the defect, update the listing if the expectation mismatch is ours, Vine for fresh reviews, and follow-up sequences within Amazon's rules.

Then re-measure in two weeks. If CVR recovers, scale back up.`,
    keyPoints: [
      "Quantifies the conversion damage in cost-per-order terms",
      "Categorises the reviews to find the actual cause",
      "Reduces rather than stops, and reallocates the budget",
      "Recommends the non-advertising fixes and sets a re-measure date",
    ],
    redFlags: [
      "Keeps spending at full rate and hopes it recovers",
      "Suggests anything that breaks Amazon's review policies",
      "Treats it purely as a bidding problem",
    ],
    followUps: [
      "The client asks you to get the reviews removed. What do you say?",
      "How much would you cut, exactly, and for how long?",
    ],
  },
  {
    id: "roleplay-explain-tacos-to-founder",
    category: "Situational & Role-play",
    level: "expert",
    tags: ["role-play", "client comms", "tacos", "plain language"],
    answerSeconds: 90,
    question:
      "Role-play: I am the founder, I have never opened the ads console. Explain why my ACoS went up and why that is good.",
    idealAnswer: `Here is roughly what I would say, out loud, in their words.

Your ACoS went from 22 to 29 percent this month, and I want to explain why I did that on purpose.

Last month we were advertising mostly to people already searching for your brand. Cheap clicks, great ACoS, but those were largely customers who would have found you anyway. It looked efficient and it was not growing anything.

This month we moved money to people searching for the product without knowing your brand. Those clicks cost more and convert less often, so ACoS went up. But look at the other line: total sales went from 41,000 to 53,000 dollars, and the share of your total revenue going to advertising — that is TACoS — went from 11 percent to 10.2 percent. You are spending a smaller share of your business on ads and selling more.

The third line is the one I care about most: you are now ranking organically on two keywords you were not on last month, and organic sales are free.

So the trade was a worse-looking ACoS for more sales, better overall efficiency, and rank we keep. If you would rather optimise for the lowest ACoS, I can do that, and I will show you what it costs in sales first.`,
    keyPoints: [
      "Actually speaks the words rather than describing the approach",
      "Leads with the decision being deliberate",
      "Uses total sales and TACoS, both explained in plain language",
      "Ends by handing the choice back to the founder with a trade-off attached",
    ],
    redFlags: [
      "Describes what they would say instead of saying it",
      "Uses unexplained jargon to a non-technical listener",
      "Defensive, or hides the ACoS increase",
    ],
    followUps: [
      "The founder says he does not care about rank, only profit. Continue.",
      "Now do the same explanation in three sentences.",
    ],
  },
  {
    id: "roleplay-first-client-call",
    category: "Situational & Role-play",
    level: "expert",
    tags: ["role-play", "discovery", "onboarding", "client comms"],
    answerSeconds: 120,
    question: "Role-play: it is our first call and I am a seller considering hiring you. Run the call.",
    idealAnswer: `I would run 30 minutes in four blocks and take notes visibly.

**Their business, ten minutes.** What are you selling, how many ASINs, what is monthly revenue and ad spend, what is the margin after fees, which products matter most, and what is your stock position? I would ask about margin explicitly, because everything I do later depends on break-even ACoS.

**Their history, five minutes.** Who managed this before, what worked, what went wrong, and what made you start looking. This is where I learn what they are actually afraid of.

**Their goal, five minutes.** What does good look like in 90 days — profit, growth, launching something, or rescuing something? And how would you know we succeeded?

**My side, ten minutes.** How I work, my cadence, what I need from them, what I will not promise, and what the first two weeks look like. Then one honest observation about their account from the public listing, which shows I looked before the call.

I close by naming the next step and a date, not by saying I will send something over.

The thing I would not do is pitch for 25 minutes. The seller should be talking for most of the call.`,
    keyPoints: [
      "Structured call with time boxes and the seller doing most of the talking",
      "Asks for margin, stock and history, not just goals",
      "States what will not be promised as well as what will",
      "Comes prepared with one specific observation and closes on a dated next step",
    ],
    redFlags: [
      "Pitches for most of the call",
      "Never asks about margins or stock",
      "Ends with a vague I will follow up",
    ],
    followUps: [
      "The seller will not share their margins on a first call. What do you do?",
      "They ask what results you can guarantee. Answer them now.",
    ],
  },
  {
    id: "roleplay-defend-a-bid-increase",
    category: "Situational & Role-play",
    level: "expert",
    tags: ["role-play", "client comms", "bids", "justification"],
    answerSeconds: 90,
    question:
      "Role-play: I am the client and I just saw you raised bids on twelve keywords. Justify it.",
    idealAnswer: `Straight answer first, then the evidence.

Yes, I raised bids on twelve keywords on Tuesday. All twelve had two things in common: ACoS under 20 percent against a 34 percent break-even, and top-of-search impression share under 30 percent. That combination means they are profitable and we are only showing up for a third of the searches available.

Average increase was 18 percent, from about 0.95 to 1.12 dollars. I capped each one so no bid can exceed what a 28 percent ACoS supports at the current conversion rate, which means even if CPC rises to the ceiling, we stay profitable.

I expect spend on those twelve to rise by about 400 dollars this month and sales by roughly 1,500 dollars, so ACoS on that group moves from 19 to around 24 percent — still well inside break-even.

I am reviewing them on Monday. If impression share has not moved, the increase was not the constraint and I will take them back down.

And if you would rather I check with you before changes of this size, tell me the threshold and I will work to it.`,
    keyPoints: [
      "Confirms the change immediately without hedging",
      "Gives the selection criteria, the size of the change and the cap",
      "States the expected outcome with numbers and a review date",
      "Offers an approval threshold rather than becoming defensive",
    ],
    redFlags: [
      "Vague justification with no criteria or numbers",
      "Apologises and reverses a correct decision under pressure",
      "Cannot say when the change will be reviewed",
    ],
    followUps: [
      "Monday comes and impression share has not moved. What now?",
      "I want approval on every change over 10 percent. Workable?",
    ],
  },
  {
    id: "prime-day-plan",
    category: "Situational & Role-play",
    level: "scenario",
    tags: ["prime day", "events", "planning", "budget"],
    answerSeconds: 90,
    question: "Prime Day is in three weeks. What do you do before, during and after?",
    idealAnswer: `**Three weeks before.** Confirm stock can survive a spike, because running out on day two is the most expensive mistake available. Confirm which deals are live and on which ASINs, since deal products deserve the budget. Build and launch any new campaigns now so they are out of the learning period. Raise budget ceilings in advance and agree the maximum daily spend in writing.

**The week before.** Start ramping bids gently, roughly 10 to 15 percent, to build recent conversion history. Traffic rises before the event itself as shoppers browse and build lists, and impressions bought that week are cheaper than during it.

**During.** Bids up 30 to 50 percent on proven converters, budgets doubled or tripled on the deal ASINs, and monitoring at least twice a day for campaigns hitting their cap. I do not launch new campaigns or test anything during the event; the data is not representative and the CPCs are the most expensive of the year.

**The two days after.** CPCs fall while purchase intent stays elevated, and this window is regularly the best ROAS of the quarter. I keep budgets up rather than cutting immediately.

**The week after.** Taper to normal, harvest the search terms Prime Day produced, and write up what the event cost and returned.`,
    keyPoints: [
      "Checks stock and deal coverage before anything in the ads account",
      "Ramps before the event to build conversion history",
      "Monitors budget caps during, and launches nothing new",
      "Knows the post-event window is high value and taper comes after",
    ],
    redFlags: [
      "Starts preparing on the day",
      "Cuts budgets immediately when the event ends",
      "Tests new campaigns during the event",
    ],
    followUps: [
      "The deal sells out on day one. What do you do with the campaigns?",
      "How do you report Prime Day performance fairly against a normal month?",
    ],
  },
  {
    id: "new-marketplace-expansion",
    category: "Situational & Role-play",
    level: "scenario",
    tags: ["expansion", "international", "launch", "strategy"],
    answerSeconds: 90,
    question:
      "The client is expanding from Amazon US to the UK. How do you set up advertising there?",
    idealAnswer: `I would treat it as a new launch, not a copy-paste, because the assumptions that work in the US often do not transfer.

**What does not transfer.** Search volume is roughly a tenth of the US, so keyword lists have to be rebuilt and long-tail terms that worked in the US may have almost no volume. Vocabulary differs — trash can versus bin, diaper versus nappy, faucet versus tap — and a copied campaign quietly targets words nobody types. Competitors and price points are different, and CPCs are usually lower.

**What does transfer.** The structure, the naming convention, the process, and a shortlist of head terms worth testing.

**The build.** Start with an auto campaign and a small manual exact set on localised head terms, at bids set from UK suggested ranges rather than converted US bids. Budget smaller in absolute terms, because the market is smaller. Then harvest for four to six weeks before scaling.

**What I check first, outside ads.** Is the listing localised rather than translated, is the ASIN in stock in UK fulfilment centres, is pricing sensible in pounds including VAT, and are there reviews in that marketplace, because US reviews do not follow.

Zero UK reviews means launch economics again: high ACoS for the first month or two, by design.`,
    keyPoints: [
      "Rebuilds keywords rather than copying the US account",
      "Names concrete vocabulary differences",
      "Checks localisation, stock, VAT pricing and marketplace reviews first",
      "Applies launch economics because reviews do not transfer",
    ],
    redFlags: [
      "Copies the US campaigns and translates the keywords",
      "Assumes US search volume and bids apply",
      "Does not know reviews are marketplace-specific",
    ],
    followUps: [
      "How would you build the UK keyword list with no tool data?",
      "Same question for Amazon Germany. What else changes?",
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Derived data
 * ------------------------------------------------------------------ */

export const TOTAL_INTERVIEW_QUESTIONS = interviewQuestions.length;

/** Self-assessment rubric, carried over from the source bank's scoring guide. */
export interface ScoreBand {
  score: 0 | 1 | 2;
  label: string;
  description: string;
  tone: Tone;
}

export const SCORE_BANDS: ScoreBand[] = [
  {
    score: 0,
    label: "Missed",
    description: "Wrong, blank, or nothing an interviewer would credit.",
    tone: "bad",
  },
  {
    score: 1,
    label: "Partial",
    description: "Right direction, missing key points or the numbers.",
    tone: "warn",
  },
  {
    score: 2,
    label: "Complete",
    description: "Covered the key points and grounded it in a real example.",
    tone: "good",
  },
];

/** Percentage needed to pass a mock interview, from the source coaching guide. */
export const PASS_MARK = 70;

const BY_ID = new Map(interviewQuestions.map((entry) => [entry.id, entry]));

export function findInterviewQuestion(id: string): InterviewEntry | undefined {
  return BY_ID.get(id);
}

export function questionsByCategory(category: InterviewCategory): InterviewEntry[] {
  return interviewQuestions.filter((entry) => entry.category === category);
}

export function questionsByLevel(level: Level): InterviewEntry[] {
  return interviewQuestions.filter((entry) => entry.level === level);
}

/** Question counts per category, in display order. */
export function categoryCounts(): Record<InterviewCategory, number> {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<
    InterviewCategory,
    number
  >;
  for (const entry of interviewQuestions) counts[entry.category] += 1;
  return counts;
}

/** Question counts per level, in level order. */
export function levelCounts(): Record<Level, number> {
  const counts = Object.fromEntries(LEVEL_ORDER.map((level) => [level, 0])) as Record<
    Level,
    number
  >;
  for (const entry of interviewQuestions) counts[entry.level] += 1;
  return counts;
}

/** questionId -> category. Used by progress roll-ups without re-scanning. */
export function questionCategories(): Record<string, InterviewCategory> {
  return Object.fromEntries(interviewQuestions.map((entry) => [entry.id, entry.category]));
}

/** questionId -> level. */
export function questionLevels(): Record<string, Level> {
  return Object.fromEntries(interviewQuestions.map((entry) => [entry.id, entry.level]));
}

/** Every tag in the bank, sorted, with its question count. */
export function tagCounts(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of interviewQuestions) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}

/** Rough time to speak every answer in the bank, in minutes. */
export function totalSpeakingMinutes(): number {
  return Math.round(
    interviewQuestions.reduce((sum, entry) => sum + entry.answerSeconds, 0) / 60,
  );
}

/** The questions ported verbatim from the source markdown bank. */
export function sourcedQuestions(): InterviewEntry[] {
  return interviewQuestions.filter((entry) => Boolean(entry.source));
}

export interface Neighbours {
  previous: InterviewEntry | null;
  next: InterviewEntry | null;
}

/**
 * Previous and next in bank order, which keeps the deep-dive pager inside a
 * category before crossing into the next one.
 */
export function neighbours(id: string): Neighbours {
  const index = interviewQuestions.findIndex((entry) => entry.id === id);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? interviewQuestions[index - 1] : null,
    next: index < interviewQuestions.length - 1 ? interviewQuestions[index + 1] : null,
  };
}

/**
 * Related questions, scored on shared tags with a bonus for the same category
 * and a smaller one for the same level. Deterministic, so the deep-dive page
 * renders identically on the server and the client.
 */
export function relatedQuestions(id: string, limit = 4): InterviewEntry[] {
  const target = findInterviewQuestion(id);
  if (!target) return [];
  const tags = new Set(target.tags);

  return interviewQuestions
    .filter((entry) => entry.id !== id)
    .map((entry) => {
      const shared = entry.tags.filter((tag) => tags.has(tag)).length;
      const score =
        shared * 3 +
        (entry.category === target.category ? 2 : 0) +
        (entry.level === target.level ? 1 : 0);
      return { entry, score };
    })
    .filter((candidate) => candidate.score > 2)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit)
    .map((candidate) => candidate.entry);
}

/** Plain-text rendering of one entry, for search indexing and mock exports. */
export function questionPlainText(entry: InterviewEntry): string {
  return [
    entry.question,
    entry.idealAnswer.replace(/[*_`#>]/g, "").replace(/\s+/g, " "),
    entry.keyPoints.join(". "),
    (entry.redFlags ?? []).join(". "),
    (entry.followUps ?? []).join(" "),
  ]
    .join(" ")
    .trim();
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

const TOOL_REFS: ResourceRef[] = [
  {
    id: "interview-mock",
    kind: "interview",
    title: "Mock interview simulator",
    summary:
      "Pick categories, a question count and a difficulty, answer against an optional timer, then score yourself against the ideal answer and get a report of your weak areas.",
    href: "/interviews/mock",
    tags: ["interview", "mock interview", "practice", "self-assessment"],
    minutes: 25,
    body: "Mock Amazon PPC interview simulator with a per-question timer, a typed answer box saved locally, a self-assessment step revealing the ideal answer and key points, and a final report with per-category scores, time spent and weak areas to revisit.",
    updated: UPDATED,
  },
  {
    id: "interview-flashcards",
    kind: "interview",
    title: "Interview flashcards",
    summary:
      "Rapid question-only drill. Read the question, answer it out loud, reveal the ideal answer and key points, then rate whether you had it.",
    href: "/interviews/flashcards",
    tags: ["interview", "flashcards", "drill", "recall"],
    minutes: 10,
    body: "Flashcard drill over the Amazon PPC interview question bank: shuffled question-only cards with keyboard controls, reveal the ideal answer and key points, mark practised or bookmark for review.",
    updated: UPDATED,
  },
];

export function resourceRefs(): ResourceRef[] {
  const questionRefs: ResourceRef[] = interviewQuestions.map((entry) => ({
    id: `interview-${entry.id}`,
    kind: "interview" as const,
    title: entry.question,
    summary: `${entry.category} · ${LEVEL_META[entry.level].label}. ${entry.keyPoints[0]}.`,
    href: `/interviews/${entry.id}`,
    tags: ["interview", entry.category.toLowerCase(), ...entry.tags],
    level: entry.level,
    minutes: Math.max(2, Math.round(entry.answerSeconds / 60) + 1),
    body: questionPlainText(entry),
    updated: UPDATED,
  }));

  return [...questionRefs, ...TOOL_REFS];
}
