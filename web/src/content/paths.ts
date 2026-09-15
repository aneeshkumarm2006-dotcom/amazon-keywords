import type { Level, PathStep, ResourceKind, ResourceRef, Tone } from "@/types/content";

// The light index, not the registry. `pathsContaining()` is called from
// ResourceActions, a client component on nearly every resource page, and
// importing the registry here would put the entire content library — every
// SOP body, every case study, the whole question bank — into those bundles.
import { indexByHref } from "./resource-index";

/**
 * Guided learning paths.
 *
 * A path is a reading order, not new content: every step points at a resource
 * that already exists in the registry, and the registry is the single source
 * of its title, summary, kind and estimated time. That means a path can never
 * drift from the library — rename an SOP and the path renames with it.
 *
 * The four paths answer four different questions a learner actually asks:
 *
 *   "I am a VA, where do I even start?"        -> va-to-ppc-specialist-30-days
 *   "I have an interview on Thursday."          -> interview-ready-2-weeks
 *   "I have the job — what do I do each day?"   -> daily-operator-playbook
 *   "I am good. How do I get paid like it?"     -> advanced-optimization
 *
 * Steps are validated at module load. A typo in an href throws during
 * `next build` rather than shipping a dead link.
 */

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** A step, plus the one line that says why it earns its place in the order. */
export interface PathStepEntry extends PathStep {
  /** Why this step, here, in this order. One sentence, no filler. */
  why: string;
  /** Module this step belongs to. */
  moduleId: string;
  /** 1-based position across the whole path. */
  position: number;
}

export interface PathModule {
  id: string;
  title: string;
  /** What this block of the path is for. */
  subtitle: string;
  /** The rhythm: "Week 1", "Every morning", "Days 13-14". */
  cadence: string;
  steps: PathStepEntry[];
  minutes: number;
}

export interface LearningPathDoc {
  id: string;
  title: string;
  /** Used in breadcrumbs and cards where the full title is too long. */
  shortTitle: string;
  summary: string;
  /** The longer pitch on the path page. */
  intro: string;
  level: Level;
  tone: Tone;
  /** Subject tags, drawn from the same vocabulary the rest of the library uses. */
  tags: string[];
  href: string;
  /** "30 days · about 45 minutes a day" */
  cadence: string;
  /** Who this is for, in their own words. */
  audience: string;
  /** What you can do at the end that you could not do at the start. */
  outcomes: string[];
  /** The artefact you can show someone when you finish. */
  proof: string;
  modules: PathModule[];
  /** Every step in order, flattened — satisfies the `LearningPath` contract. */
  steps: PathStepEntry[];
  stepCount: number;
  minutes: number;
}

/* ------------------------------------------------------------------ *
 * Seeds
 * ------------------------------------------------------------------ */

interface StepSeed {
  href: string;
  why: string;
  /** Required only for routes that are not registered resources. */
  title?: string;
  description?: string;
  kind?: ResourceKind;
  minutes?: number;
}

interface ModuleSeed {
  id: string;
  title: string;
  subtitle: string;
  cadence: string;
  steps: StepSeed[];
}

interface PathSeed {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  intro: string;
  level: Level;
  tone: Tone;
  tags: string[];
  cadence: string;
  audience: string;
  outcomes: string[];
  proof: string;
  modules: ModuleSeed[];
}

/**
 * Real routes that are tools rather than registered resources. Anything not
 * in the registry and not on this list is a typo.
 */
const ROUTE_ALLOW_LIST: Record<string, { title: string; kind: ResourceKind; minutes: number; description: string }> = {
  "/glossary": {
    title: "The full PPC glossary",
    kind: "glossary",
    minutes: 12,
    description:
      "Every acronym a PPC specialist is expected to know cold, with the formula and a worked example on each one.",
  },
  "/quizzes/review": {
    title: "Your spaced-repetition review queue",
    kind: "quiz",
    minutes: 10,
    description:
      "Every question you have answered wrong, resurfacing on a one, three, seven and twenty-one day schedule until you get it right twice in a row.",
  },
};

const SEEDS: PathSeed[] = [
  /* ---------------------------------------------------------------- *
   * 1. VA to PPC Specialist (30 days)
   * ---------------------------------------------------------------- */
  {
    id: "va-to-ppc-specialist-30-days",
    title: "VA to PPC Specialist (30 days)",
    shortTitle: "VA to Specialist",
    summary:
      "Four weeks from general VA to someone who can run a Sponsored Products account without supervision, finishing with a mock certification exam and a portfolio you can send.",
    intro:
      "This is the order a PPC lead would teach it in. Week one buys you the vocabulary, because you cannot optimise a metric you cannot compute. Week two puts you on the daily and weekly routine that pays the bills. Week three is where the money is — bids, break-even and negatives. Week four builds and reports. Day 30 is the exam and the paperwork that gets you hired.",
    level: "beginner",
    tone: "brand",
    tags: ["learning path", "fundamentals", "metrics", "launch", "career"],
    cadence: "30 days · about 45 minutes a day",
    audience:
      "General VAs with no paid-ads background who can give the training 45 minutes a day for a month.",
    outcomes: [
      "Compute ACoS, ROAS, TACoS, CTR, CVR and break-even ACoS without a calculator",
      "Run a 15-minute daily health check and a weekly search term review on a live account",
      "Set a first bid from a target ACoS and defend the number you picked",
      "Launch a Sponsored Products campaign for a new product from a build sheet",
      "Produce a monthly client report that leads with the business result",
    ],
    proof:
      "A finished mock certification exam score, a resume rewritten around PPC outcomes, and a portfolio template filled with the numbers from your practice account.",
    modules: [
      {
        id: "week-1",
        title: "The vocabulary",
        subtitle:
          "Everything an interviewer assumes you already know. Do not skip it because it looks easy — the arithmetic here is what every later decision rests on.",
        cadence: "Week 1",
        steps: [
          {
            href: "/cheat-sheets/ppc-metrics",
            why: "Six metrics carry the whole job. Learn the formulas before you learn anything else.",
          },
          {
            href: "/glossary",
            why: "Skim it once, then keep it open. You will hear half of these terms in your first client call.",
          },
          {
            href: "/cheat-sheets/match-types",
            why: "Broad, phrase and exact decide what your keywords can actually match. Getting this wrong costs money silently.",
          },
          {
            href: "/cheat-sheets/ad-types",
            why: "Sponsored Products, Brands and Display are three different jobs. Interviewers open with this.",
          },
          {
            href: "/calculators/acos-roas",
            why: "Type real numbers in until the relationship between ACoS and ROAS is obvious rather than memorised.",
          },
          {
            href: "/quizzes/beginner",
            why: "Fifty-plus fundamentals questions. Do not move to week two until you clear the 70% pass mark.",
          },
        ],
      },
      {
        id: "week-2",
        title: "The daily job",
        subtitle:
          "What a PPC junior is actually paid to do in the first hour of every morning and the first hour of every Monday.",
        cadence: "Week 2",
        steps: [
          {
            href: "/sops/daily-health-check",
            why: "The 15-minute routine that catches a runaway campaign before it burns a week of budget.",
          },
          {
            href: "/sops/weekly-search-term-analysis",
            why: "The single highest-value hour in the week. Everything you harvest and negate comes from here.",
          },
          {
            href: "/cheat-sheets/search-term-report",
            why: "Know which column answers which question before you open a 40,000-row export.",
          },
          {
            href: "/workflows/search-term-harvesting",
            why: "The decision tree that turns a converting search term into a keyword in the right campaign.",
          },
          {
            href: "/templates/search-term-analysis-sheet",
            why: "Copy the grid, paste your report into it, and the triage takes twenty minutes instead of two hours.",
          },
          {
            href: "/quizzes/intermediate",
            why: "Optimisation questions. This is the level most PPC junior interviews screen at.",
          },
        ],
      },
      {
        id: "week-3",
        title: "Bids and profitability",
        subtitle:
          "Where the money is won or lost. Every number in this module has to be right, because a wrong break-even makes every later bid wrong too.",
        cadence: "Week 3",
        steps: [
          {
            href: "/calculators/break-even-acos",
            why: "Until you know break-even ACoS, no target ACoS you set means anything.",
          },
          {
            href: "/calculators/profit-margin",
            why: "Work backwards from the unit economics — fees, COGS and shipping decide what you can afford to bid.",
          },
          {
            href: "/sops/bid-optimization",
            why: "The rules for how far to move a bid, how often, and what evidence justifies it.",
          },
          {
            href: "/calculators/bid",
            why: "Turn a target ACoS and a conversion rate into an actual bid figure, then sanity-check it.",
          },
          {
            href: "/cheat-sheets/negative-keywords",
            why: "Negatives are how you stop paying for the traffic you already know does not convert.",
          },
          {
            href: "/case-studies/supplement-93-to-35-acos",
            why: "See the whole week applied to one broken account, with the before and after numbers.",
          },
        ],
      },
      {
        id: "week-4",
        title: "Building and reporting",
        subtitle:
          "Launching something from nothing, then explaining to a client what happened to their money.",
        cadence: "Week 4",
        steps: [
          {
            href: "/workflows/campaign-structure-decision-tree",
            why: "Decide the structure before you build. Restructuring later is the most expensive kind of rework.",
          },
          {
            href: "/sops/campaign-launch",
            why: "The full new-product launch procedure, from keyword research to the first bid.",
          },
          {
            href: "/templates/campaign-build-sheet",
            why: "Build in a sheet, upload in bulk. It is faster and you get a record of what you did.",
          },
          {
            href: "/sops/monthly-performance-report",
            why: "Reporting is the deliverable the client actually sees. Treat it as part of the job, not admin.",
          },
          {
            href: "/templates/monthly-report-template",
            why: "A report format that leads with the business result instead of a wall of ad metrics.",
          },
          {
            href: "/workflows/reporting-workflow",
            why: "Daily, weekly and monthly cadences so nothing is reported twice and nothing is missed.",
          },
        ],
      },
      {
        id: "day-30",
        title: "Prove it",
        subtitle:
          "The last day is not more learning. It is producing the evidence that you learned the previous 29.",
        cadence: "Day 30",
        steps: [
          {
            href: "/quizzes/mock-exam",
            why: "Forty questions across all five levels, timed. Sit it in exam mode and treat the score as real.",
          },
          {
            href: "/career/va-to-ppc-specialist",
            why: "The ladder, the salary ranges, and what each rung expects of you before you apply.",
          },
          {
            href: "/career/resume-template",
            why: "Rewrite your resume around outcomes and numbers, not a list of tools you have opened.",
          },
          {
            href: "/career/portfolio-template",
            why: "Fill it with your practice account. A portfolio beats a certificate in every PPC interview.",
          },
          {
            href: "/interviews/mock",
            why: "One timed run to find out which answers fall apart when someone is watching.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * 2. Interview Ready (2 weeks)
   * ---------------------------------------------------------------- */
  {
    id: "interview-ready-2-weeks",
    title: "Interview Ready (2 weeks)",
    shortTitle: "Interview Ready",
    summary:
      "Fourteen days of targeted rehearsal across the five things every PPC interview tests: fundamentals, structure, optimisation, client handling and live scenarios.",
    intro:
      "Interviews do not test everything you know — they test five things, in roughly this order, and they test whether you can say the answer out loud under mild pressure. This path drills the exact questions hiring managers ask, in the order a three-round process asks them, and finishes with two dress rehearsals. Say every answer aloud. Reading an ideal answer and being able to deliver one are different skills.",
    level: "intermediate",
    tone: "ember",
    tags: ["learning path", "interview", "career", "client management", "troubleshooting scenarios"],
    cadence: "14 days · about 40 minutes a day",
    audience:
      "Anyone with a PPC screen, technical round or client-facing interview booked in the next month.",
    outcomes: [
      "Answer the five fundamentals questions that open almost every PPC screen",
      "Defend a campaign structure choice and a bid change with numbers, not opinion",
      "Handle the three hardest client questions: a bad month, a budget cut and an ACoS spike",
      "Diagnose a broken account out loud, in order, without jumping to a fix",
      "Give a rate expectation without flinching and back it with a result",
    ],
    proof:
      "A mock interview report showing your per-category scores, plus a flashcard run where you no longer need the prompt.",
    modules: [
      {
        id: "days-1-3",
        title: "Fundamentals you must answer cold",
        subtitle:
          "The screening round. These five decide whether there is a second conversation, and none of them reward hesitation.",
        cadence: "Days 1-3",
        steps: [
          {
            href: "/interviews/three-ad-types",
            why: "The most common opening question in the bank. Get it crisp and you set the tone for the round.",
          },
          {
            href: "/interviews/match-types-broad-phrase-exact",
            why: "Asked in some form in nearly every screen. The trap is forgetting that match type controls matching, not bids.",
          },
          {
            href: "/interviews/acos-and-roas-maths",
            why: "You will be asked to compute one from the other live. Practise until it is arithmetic, not recall.",
          },
          {
            href: "/interviews/tacos-vs-acos",
            why: "The question that separates a junior from a specialist. Say the words total sales.",
          },
          {
            href: "/interviews/break-even-acos",
            why: "If you cannot derive break-even from a margin, every target you name later sounds invented.",
          },
          {
            href: "/cheat-sheets/ppc-metrics",
            why: "Read it once more the morning of the interview. It is the whole formula sheet on one page.",
          },
        ],
      },
      {
        id: "days-4-6",
        title: "Structure and optimisation",
        subtitle:
          "The technical round. Here they stop asking what things are and start asking what you would do.",
        cadence: "Days 4-6",
        steps: [
          {
            href: "/interviews/skag-vs-themed-ad-groups",
            why: "A structure-opinion question. There is no single right answer — there is a right way to justify one.",
          },
          {
            href: "/interviews/auto-to-manual-harvest-structure",
            why: "The core loop of Amazon PPC. If you can draw it, you can run an account.",
          },
          {
            href: "/interviews/search-term-harvest-rules",
            why: "Name your thresholds. Interviewers are listening for specific numbers, not for it depends.",
          },
          {
            href: "/interviews/bid-change-size-and-cadence",
            why: "How much, how often, and why. The wrong answer here is any answer without a number in it.",
          },
          {
            href: "/interviews/how-much-data-before-deciding",
            why: "Patience is a technical skill. This question is really about statistical nerve.",
          },
          {
            href: "/quizzes/advanced",
            why: "Strategy-level questions under a clock, to check the knowledge holds up without a prompt.",
          },
        ],
      },
      {
        id: "days-7-9",
        title: "Client conversations",
        subtitle:
          "The round that decides whether they trust you in front of the client. Tone matters as much as content.",
        cadence: "Days 7-9",
        steps: [
          {
            href: "/interviews/explain-acos-to-client",
            why: "Explaining a metric to a non-specialist is a skill you will use weekly. Practise the plain-English version.",
          },
          {
            href: "/interviews/client-upset-acos-increased",
            why: "The most common live role-play. Lead with the business number, not the ad metric.",
          },
          {
            href: "/interviews/explaining-a-bad-month",
            why: "Everyone has bad months. They are hiring for how you report one.",
          },
          {
            href: "/interviews/client-cuts-budget-fifty-percent",
            why: "A prioritisation question disguised as a budget question. Say what you would switch off first.",
          },
          {
            href: "/sops/client-onboarding",
            why: "Knowing the onboarding procedure signals you have done this before, not just studied it.",
          },
          {
            href: "/templates/client-communication-templates",
            why: "Borrow the phrasing. Good client email structure is copyable and interviewers notice it.",
          },
        ],
      },
      {
        id: "days-10-12",
        title: "Scenarios and troubleshooting",
        subtitle:
          "The hardest format to fake. Every one of these rewards diagnosis before action — say what you would check, in order.",
        cadence: "Days 10-12",
        steps: [
          {
            href: "/interviews/acos-jumped-twenty-five-to-sixty",
            why: "The classic diagnostic scenario. List your checks in order before you propose a single fix.",
          },
          {
            href: "/interviews/budget-exhausted-by-noon",
            why: "Tests whether you understand that a budget cap and a bid are different levers.",
          },
          {
            href: "/interviews/clicks-but-no-conversions",
            why: "Half the answer is not about ads at all. Say listing and price out loud.",
          },
          {
            href: "/interviews/inherit-ninety-acos-account",
            why: "An account-rescue question. The right answer starts with do not change everything at once.",
          },
          {
            href: "/interviews/q4-black-friday-plan",
            why: "Seasonality under pressure, with real budget and bid implications. Expect this in any Q3 interview.",
          },
          {
            href: "/quizzes/scenario",
            why: "Fifteen open-ended situations. Time yourself — scenario questions punish rambling.",
          },
        ],
      },
      {
        id: "days-13-14",
        title: "Dress rehearsal",
        subtitle:
          "Two days of delivery practice. You already know the material; this is about saying it once, cleanly, to a clock.",
        cadence: "Days 13-14",
        steps: [
          {
            href: "/interviews/tell-me-about-yourself",
            why: "Ninety seconds, rehearsed, ending on why PPC. Most candidates waste the easiest question of the day.",
          },
          {
            href: "/interviews/rate-expectations",
            why: "Name a number and justify it with a result. Hesitating here costs more than any technical slip.",
          },
          {
            href: "/career/salary-negotiation",
            why: "The market ranges and the exact phrasing for the counter-offer conversation.",
          },
          {
            href: "/interviews/flashcards",
            why: "One fast pass over the whole bank. Rate yourself honestly — the weak ones come back.",
          },
          {
            href: "/interviews/mock",
            why: "Full timed run, categories mixed, self-scored. Do it twice if the first report finds a weak category.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * 3. Daily Operator Playbook
   * ---------------------------------------------------------------- */
  {
    id: "daily-operator-playbook",
    title: "Daily Operator Playbook",
    shortTitle: "Operator Playbook",
    summary:
      "The working rhythm of a PPC specialist with live accounts: what you check every morning, every week, every month and every quarter, plus what to do when something breaks.",
    intro:
      "This path is not a course, it is a rota. Work through it once to set your routine up, then come back to it as a checklist. The order matters: the morning checks exist to catch the things that cost money overnight, the weekly block is where the actual optimisation happens, and the quarterly block is the hygiene that stops an account rotting. Each block names the automation that removes the tedious half of it.",
    level: "intermediate",
    tone: "info",
    tags: ["learning path", "process", "weekly", "reporting", "audit"],
    cadence: "Ongoing · 15 min daily, 90 min weekly",
    audience:
      "Junior specialists and VAs who already have live accounts and need a routine that scales past two of them.",
    outcomes: [
      "Run a repeatable 15-minute morning check across every account you own",
      "Turn a weekly search term report into harvests and negatives in under an hour",
      "Ship a monthly client report without rebuilding it from scratch each time",
      "Keep naming, duplicates and structure clean with a quarterly audit",
      "Know the escalation path before the emergency, not during it",
    ],
    proof:
      "A working set of sheets and scripts wired to your own accounts, plus a documented escalation path your client has agreed to.",
    modules: [
      {
        id: "every-morning",
        title: "Every morning",
        subtitle:
          "Fifteen minutes, before anything else. The point is to catch the overnight damage while it is still small.",
        cadence: "Daily · 15 min",
        steps: [
          {
            href: "/sops/daily-health-check",
            why: "The checklist itself. Run it in the same order every day so a missing item is obvious.",
          },
          {
            href: "/cheat-sheets/ppc-metrics",
            why: "Pin it next to the console. Daily checks are metric comparisons and you want no arithmetic hesitation.",
          },
          {
            href: "/scripts/budget-pacing-alert",
            why: "Automate the part you would otherwise eyeball: which campaigns will exhaust budget before the day ends.",
          },
          {
            href: "/calculators/tacos",
            why: "A weekly TACoS glance keeps the daily ACoS noise in proportion to the actual business.",
          },
        ],
      },
      {
        id: "every-week",
        title: "Every week",
        subtitle:
          "Ninety minutes on one day, protected in your calendar. This block is where accounts actually improve.",
        cadence: "Weekly · 90 min",
        steps: [
          {
            href: "/sops/weekly-search-term-analysis",
            why: "The procedure, with the thresholds. Same day each week so the data window stays comparable.",
          },
          {
            href: "/workflows/search-term-harvesting",
            why: "The decision tree for what becomes a keyword, what becomes a negative, and what waits.",
          },
          {
            href: "/scripts/search-term-harvester",
            why: "Turns the triage into a sorted tab. What took an hour of filtering takes a run and a review.",
          },
          {
            href: "/scripts/negative-keyword-miner",
            why: "Finds the spend-without-orders terms against your real break-even instead of a guessed one.",
          },
          {
            href: "/sops/bid-optimization",
            why: "Bid changes belong in the weekly block, not the daily one. Data needs time to accumulate.",
          },
          {
            href: "/scripts/bid-adjuster-acos-bands",
            why: "Proposes the changes by ACoS band and leaves the decision with you. Never put it on a trigger.",
          },
        ],
      },
      {
        id: "every-month",
        title: "Every month",
        subtitle:
          "Half a day near the start of the month. Reporting is a deliverable, and wasted spend compounds quietly.",
        cadence: "Monthly · half a day",
        steps: [
          {
            href: "/sops/monthly-performance-report",
            why: "The procedure that stops the report becoming an improvised data dump every month.",
          },
          {
            href: "/templates/monthly-report-template",
            why: "The format. Business result first, ad metrics second, next month's plan third.",
          },
          {
            href: "/scripts/weekly-report-emailer",
            why: "Automate the send. A report the client receives on a schedule builds more trust than a better report that slips.",
          },
          {
            href: "/workflows/reporting-workflow",
            why: "Keeps the daily, weekly and monthly cadences from duplicating each other.",
          },
          {
            href: "/scripts/wasted-spend-finder",
            why: "One monthly run gives you the exact dollar figure to lead the audit slide with.",
          },
        ],
      },
      {
        id: "every-quarter",
        title: "Every quarter",
        subtitle:
          "The hygiene block. None of it is urgent, which is exactly why it has to be scheduled.",
        cadence: "Quarterly · one day",
        steps: [
          {
            href: "/templates/campaign-audit-checklist",
            why: "A structured pass over the whole account, so problems are found rather than stumbled on.",
          },
          {
            href: "/scripts/campaign-naming-auditor",
            why: "Naming drift makes every future report harder. Catch it while it is ten campaigns, not two hundred.",
          },
          {
            href: "/scripts/duplicate-keyword-finder",
            why: "Duplicates make your own campaigns bid against each other and inflate CPC for nothing.",
          },
          {
            href: "/sops/campaign-restructuring",
            why: "When the audit says the structure is wrong, this is how you change it without losing history.",
          },
          {
            href: "/workflows/seasonal-preparation",
            why: "Run it a quarter ahead of the season, not a week. Q4 planning starts in Q3.",
          },
        ],
      },
      {
        id: "when-it-breaks",
        title: "When it breaks",
        subtitle:
          "Read these before the emergency. In the middle of one, you want recall, not research.",
        cadence: "On incident",
        steps: [
          {
            href: "/sops/escalation-procedures",
            why: "What you handle, what you escalate, and how fast. Agree it with the client while nothing is on fire.",
          },
          {
            href: "/case-studies/runaway-auto-campaign-rescue",
            why: "A real overspend incident with the timeline and the fix, so you recognise the shape of one.",
          },
          {
            href: "/interviews/overnight-spend-spike",
            why: "The diagnostic order for a sudden spend jump, written as an answer you can follow at 7am.",
          },
          {
            href: "/interviews/ads-not-eligible-to-serve",
            why: "The other emergency: nothing is spending. Usually not an ads problem at all.",
          },
          {
            href: "/quizzes/review",
            why: "Keep the queue empty. The questions you keep getting wrong are the gaps an incident will find.",
          },
        ],
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * 4. Advanced Optimization
   * ---------------------------------------------------------------- */
  {
    id: "advanced-optimization",
    title: "Advanced Optimization",
    shortTitle: "Advanced Optimization",
    summary:
      "Account-level thinking for specialists who already run the routine: architecture, marginal bid maths, TACoS and halo, disciplined testing, and scaling into a season.",
    intro:
      "Everything here assumes the weekly routine is already automatic. This path is about the decisions that a routine cannot make for you: whether the structure is the problem, whether a keyword at 80% ACoS is actually worth keeping, when ad profit should lose to organic rank, and how to scale without the ACoS curve running away. Five modules, each one closing with real accounts where the decision was made and the numbers that followed.",
    level: "advanced",
    tone: "good",
    tags: ["learning path", "optimization", "structure", "testing", "tacos"],
    cadence: "Self-paced · about 6 hours total",
    audience:
      "Specialists with at least six months on live accounts who are being asked strategy questions, not execution ones.",
    outcomes: [
      "Decide whether an account's problem is structural before touching a single bid",
      "Price a marginal keyword against contribution margin rather than against ACoS alone",
      "Use TACoS and halo to argue for spend that looks unprofitable in the ads console",
      "Run an A/B test with a control, a single variable and a stopping rule",
      "Scale into Q4 and into a new marketplace without losing efficiency",
    ],
    proof:
      "A structure recommendation, a keyword-level profitability model and a written test plan — the three artefacts a senior interview asks to see.",
    modules: [
      {
        id: "architecture",
        title: "Account architecture",
        subtitle:
          "Most accounts that look like a bidding problem are a structure problem. Learn to tell the difference before you optimise.",
        cadence: "Module 1",
        steps: [
          {
            href: "/workflows/campaign-structure-decision-tree",
            why: "The decision tree that picks a structure from catalogue size and budget, not from fashion.",
          },
          {
            href: "/cheat-sheets/campaign-structure",
            why: "Naming conventions, portfolio use and the segmentation patterns worth copying.",
          },
          {
            href: "/interviews/structure-for-catalogue-of-forty",
            why: "The scale question. Forty ASINs is where per-product structure stops being manageable.",
          },
          {
            href: "/case-studies/multi-product-account-restructure",
            why: "A real restructure with the before and after numbers, including what got worse first.",
          },
          {
            href: "/sops/campaign-restructuring",
            why: "The procedure for changing structure on a live account without losing performance history.",
          },
        ],
      },
      {
        id: "bid-maths",
        title: "Bid maths under pressure",
        subtitle:
          "Marginal decisions, made with contribution margin rather than a target ACoS someone invented in a meeting.",
        cadence: "Module 2",
        steps: [
          {
            href: "/calculators/keyword-roi",
            why: "Model a single keyword end to end — clicks, CVR, margin — and see where it stops paying.",
          },
          {
            href: "/interviews/keyword-eighty-acos-thirty-five-margin",
            why: "The question that tests whether you optimise to a target or to profit. They are not the same.",
          },
          {
            href: "/interviews/dynamic-bidding-strategies",
            why: "Down-only, up-and-down and fixed each change what your bid means. Know when each one is right.",
          },
          {
            href: "/interviews/placement-vs-bid-adjustments",
            why: "Placement multipliers compound on top of your bid. This is where accounts overspend invisibly.",
          },
          {
            href: "/scripts/placement-performance-pivot",
            why: "Gives you the placement split as a table so the multiplier decision has evidence behind it.",
          },
          {
            href: "/scripts/dayparting-report",
            why: "Hour-of-day performance, so a budget decision can be about timing rather than only about size.",
          },
        ],
      },
      {
        id: "tacos-and-halo",
        title: "TACoS, halo and the whole business",
        subtitle:
          "The argument for spend that the ads console calls unprofitable. This is the module that gets you taken seriously by a founder.",
        cadence: "Module 3",
        steps: [
          {
            href: "/calculators/tacos",
            why: "Ad spend against total sales. Once you report this, the ACoS conversation changes shape.",
          },
          {
            href: "/interviews/great-acos-declining-organic",
            why: "The trap of optimising ads while the business shrinks. Spot it before the client does.",
          },
          {
            href: "/interviews/profit-versus-rank-tradeoff",
            why: "When to deliberately accept a worse ACoS to buy organic rank, and how to time-box it.",
          },
          {
            href: "/case-studies/subscribe-and-save-coffee",
            why: "Lifetime value changes the maths entirely. A repeat-purchase product can afford a first-order loss.",
          },
          {
            href: "/case-studies/home-lifestyle-102-percent-growth",
            why: "Scaling with TACoS as the guardrail rather than ACoS as the ceiling.",
          },
        ],
      },
      {
        id: "testing-and-automation",
        title: "Testing and automation",
        subtitle:
          "Change one thing, keep a control, agree the stopping rule in advance. Then automate the parts that no longer need judgement.",
        cadence: "Module 4",
        steps: [
          {
            href: "/workflows/ab-testing-process",
            why: "A test without a control and a stopping rule is just a change you feel good about.",
          },
          {
            href: "/templates/ab-test-tracker",
            why: "Record the hypothesis before the result. It is the only way to learn from a test that failed.",
          },
          {
            href: "/automation/automation-rules",
            why: "The rule library, with the guardrails that stop a rule quietly emptying a budget.",
          },
          {
            href: "/automation/automate-vs-manual",
            why: "The honest boundary: what automation is genuinely better at, and what it should never own.",
          },
          {
            href: "/automation/automation-maturity-model",
            why: "Place yourself on the model, then take exactly one step up rather than four.",
          },
          {
            href: "/scripts/sp-bulk-bid-update",
            why: "Bulk changes with a diff you can review. The safe way to apply a hundred bid moves at once.",
          },
        ],
      },
      {
        id: "scale-and-season",
        title: "Scale and seasonality",
        subtitle:
          "Growth without efficiency collapse, across a peak season and across a border. Finish with the two hardest quiz levels.",
        cadence: "Module 5",
        steps: [
          {
            href: "/workflows/seasonal-preparation",
            why: "The calendar-backwards plan. Everything that has to be true before the season starts.",
          },
          {
            href: "/case-studies/q4-black-friday-toys",
            why: "Peak season with real CPC inflation and the budget decisions made day by day.",
          },
          {
            href: "/case-studies/sportswear-seasonal-scaling",
            why: "Scaling up and back down without destroying the efficiency you built in the quiet months.",
          },
          {
            href: "/case-studies/international-marketplace-expansion",
            why: "A new marketplace is a new auction. See what transfers and what has to be rebuilt.",
          },
          {
            href: "/quizzes/expert",
            why: "Client-management judgement under a clock. Strategy is worthless if you cannot sell it.",
          },
          {
            href: "/quizzes/scenario",
            why: "The final check: open-ended, no obvious lever, diagnosis before action.",
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function buildStep(
  seed: StepSeed,
  pathId: string,
  moduleId: string,
  position: number,
): PathStepEntry {
  const resource = indexByHref(seed.href);
  const fallback = ROUTE_ALLOW_LIST[seed.href];

  if (!resource && !fallback && !(seed.title && seed.kind && seed.minutes)) {
    throw new Error(
      `Learning path "${pathId}" step ${position} points at "${seed.href}", which is neither a registered resource nor a known route.`,
    );
  }

  const title = seed.title ?? resource?.title ?? fallback?.title ?? seed.href;
  const description =
    seed.description ?? resource?.summary ?? fallback?.description ?? seed.why;
  const kind = seed.kind ?? resource?.kind ?? fallback?.kind ?? "sop";
  const minutes = seed.minutes ?? resource?.minutes ?? fallback?.minutes ?? 5;

  return {
    id: `${pathId}__${moduleId}__${position}`,
    title,
    description,
    href: seed.href,
    kind,
    minutes,
    why: seed.why,
    moduleId,
    position,
  };
}

function buildPath(seed: PathSeed): LearningPathDoc {
  let position = 0;

  const modules: PathModule[] = seed.modules.map((moduleSeed) => {
    const steps = moduleSeed.steps.map((stepSeed) => {
      position += 1;
      return buildStep(stepSeed, seed.id, moduleSeed.id, position);
    });

    return {
      id: moduleSeed.id,
      title: moduleSeed.title,
      subtitle: moduleSeed.subtitle,
      cadence: moduleSeed.cadence,
      steps,
      minutes: steps.reduce((sum, step) => sum + step.minutes, 0),
    };
  });

  const steps = modules.flatMap((entry) => entry.steps);

  return {
    id: seed.id,
    title: seed.title,
    shortTitle: seed.shortTitle,
    summary: seed.summary,
    intro: seed.intro,
    level: seed.level,
    tone: seed.tone,
    tags: seed.tags,
    href: `/paths/${seed.id}`,
    cadence: seed.cadence,
    audience: seed.audience,
    outcomes: seed.outcomes,
    proof: seed.proof,
    modules,
    steps,
    stepCount: steps.length,
    minutes: steps.reduce((sum, step) => sum + step.minutes, 0),
  };
}

export const paths: LearningPathDoc[] = SEEDS.map(buildPath);

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export function findPath(id: string): LearningPathDoc | undefined {
  return paths.find((path) => path.id === id);
}

/** The paths that include a given route — shown on a resource page. */
export function pathsContaining(href: string): LearningPathDoc[] {
  return paths.filter((path) => path.steps.some((step) => step.href === href));
}

export const TOTAL_PATH_STEPS = paths.reduce((sum, path) => sum + path.stepCount, 0);

/** Distinct resources referenced by at least one path. */
export const TOTAL_PATH_RESOURCES = new Set(
  paths.flatMap((path) => path.steps.map((step) => step.href)),
).size;

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

/**
 * One ref per path, so the four paths are searchable like everything else.
 *
 * A path owns no prose of its own beyond its pitch, so the body is built from
 * the parts a learner would actually search for: what it is for, who it is
 * for, what they walk away with, and the titles of every step in order. That
 * makes "daily operator playbook" findable by name and "break-even ACoS"
 * findable through the step that teaches it.
 */
export function resourceRefs(): ResourceRef[] {
  return paths.map((path) => ({
    id: `path-${path.id}`,
    kind: "path" as const,
    title: path.title,
    summary: path.summary,
    href: path.href,
    tags: path.tags,
    level: path.level,
    minutes: path.minutes,
    body: [
      path.intro,
      path.audience,
      ...path.outcomes,
      path.proof,
      ...path.modules.flatMap((module) => [
        module.title,
        module.subtitle,
        ...module.steps.map((step) => step.title),
      ]),
    ].join(" "),
  }));
}
