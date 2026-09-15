import type { Tone } from "@/types/content";

/**
 * The public roadmap.
 *
 * Every item here comes from a file in the source repo — `TODO.md`,
 * `KANBAN.md` or `EXPANSION-PLAN.md` — and carries the line it came from in
 * `source`, so a contributor can check the original before claiming work.
 * Status reflects what this site has actually shipped, not what the plan
 * hoped for: three of the four "High Priority" TODO lines are done because
 * the platform, the search and the quiz engine are the thing you are reading.
 *
 * Counts are never written down here. Anything that needs one takes it from
 * the live content modules at build time (see `/contribute/roadmap`), so the
 * board cannot drift away from the library.
 */

export type RoadmapStatus = "shipped" | "in-progress" | "next" | "backlog";
export type RoadmapArea = "content" | "platform" | "tooling" | "community";
export type RoadmapSize = "S" | "M" | "L";

export interface RoadmapItem {
  id: string;
  title: string;
  /** Two or three sentences: what the item is and what "done" means. */
  detail: string;
  status: RoadmapStatus;
  area: RoadmapArea;
  /** Where in the source repo this came from. */
  source: string;
  /** Rough effort, for someone picking work up cold. */
  size: RoadmapSize;
  /** Set when the item is claimable — drives the "Claim this" button. */
  claimable?: boolean;
  /** Where the shipped version lives on this site. */
  shippedAt?: { label: string; href: string };
  /**
   * Template key, replaced with a live count at render time.
   * e.g. "{caseStudies}" -> "12".
   */
  countKey?: string;
}

export interface StatusMeta {
  id: RoadmapStatus;
  label: string;
  blurb: string;
  tone: Tone;
}

export const STATUS_META: StatusMeta[] = [
  {
    id: "in-progress",
    label: "In progress",
    blurb: "Someone is actively on this. Coordinate in the issue before you start.",
    tone: "ember",
  },
  {
    id: "next",
    label: "Next up",
    blurb: "Agreed, specced and unclaimed. This is where a new contributor should look first.",
    tone: "brand",
  },
  {
    id: "backlog",
    label: "Backlog",
    blurb: "Wanted, but not scheduled. Make the case in an issue before building it.",
    tone: "neutral",
  },
  {
    id: "shipped",
    label: "Shipped",
    blurb: "Done and live. Listed so the plan and the product stay honest with each other.",
    tone: "good",
  },
];

export const AREA_LABEL: Record<RoadmapArea, string> = {
  content: "Content",
  platform: "Platform",
  tooling: "Tooling",
  community: "Community",
};

export const SIZE_LABEL: Record<RoadmapSize, string> = {
  S: "An evening",
  M: "A weekend",
  L: "Several sessions",
};

export const ROADMAP: RoadmapItem[] = [
  /* ---------------------------------------------------------- shipped */
  {
    id: "web-platform",
    title: "Interactive web platform",
    detail:
      "Turn the markdown toolkit into a Next.js product with real navigation, dark mode and offline-friendly static pages. Shipped as this site: a static export, no backend, every route pre-rendered.",
    status: "shipped",
    area: "platform",
    source: "TODO.md — High priority",
    size: "L",
    shippedAt: { label: "You are on it", href: "/" },
  },
  {
    id: "search",
    title: "Search across all resources",
    detail:
      "One index over every quiz, SOP, workflow, template, case study, calculator and glossary term, with facets by kind, level and tag, plus a keyboard command palette.",
    status: "shipped",
    area: "platform",
    source: "TODO.md — High priority",
    size: "M",
    shippedAt: { label: "Open search", href: "/search" },
  },
  {
    id: "quiz-engine",
    title: "Interactive quiz engine",
    detail:
      "Scored question banks across five difficulty levels with an explanation on every answer, a custom quiz builder and a spaced review queue.",
    status: "shipped",
    area: "platform",
    source: "TODO.md — High priority",
    size: "L",
    countKey: "{quizQuestions} questions live",
    shippedAt: { label: "Take a quiz", href: "/quizzes" },
  },
  {
    id: "case-studies-12",
    title: "Reach twelve case studies",
    detail:
      "The plan set a target of twelve detailed accounts, up from the six in the original toolkit, spread across turnarounds, launches, scale-ups, rescues and efficiency plays.",
    status: "shipped",
    area: "content",
    source: "TODO.md — Medium priority (target: 12)",
    size: "L",
    countKey: "{caseStudies} accounts live",
    shippedAt: { label: "Read them", href: "/case-studies" },
  },
  {
    id: "interviews-100",
    title: "Expand the interview bank past 100",
    detail:
      "Grow the original sixty questions into a bank that covers fundamentals, structure, optimisation, reporting, client management and live scenarios, each with an ideal answer and key points.",
    status: "shipped",
    area: "content",
    source: "TODO.md — Medium priority (target: 100+)",
    size: "L",
    countKey: "{interviewQuestions} questions live",
    shippedAt: { label: "Open the bank", href: "/interviews" },
  },
  {
    id: "automation-scripts",
    title: "Automation scripts library",
    detail:
      "Ready-to-run Apps Script, SQL and Python for bid rules, search-term harvesting, report generation and competitor monitoring, each with prerequisites and a walkthrough.",
    status: "shipped",
    area: "tooling",
    source: "TODO.md — Medium priority · EXPANSION-PLAN.md Phase 7",
    size: "L",
    countKey: "{scripts} scripts live",
    shippedAt: { label: "Browse scripts", href: "/scripts" },
  },
  {
    id: "calculators",
    title: "Calculator tools",
    detail:
      "The five workbooks from the expansion plan — ACoS/ROAS, bid, profit margin, budget planner and keyword ROI — rebuilt as live browser tools with sensitivity tables and charts.",
    status: "shipped",
    area: "tooling",
    source: "EXPANSION-PLAN.md — Phase 2",
    size: "L",
    countKey: "{calculators} calculators live",
    shippedAt: { label: "Open a calculator", href: "/calculators" },
  },
  {
    id: "career-resources",
    title: "Career and training resources",
    detail:
      "The VA-to-specialist ladder, a resume template, a portfolio format and a salary negotiation guide with Philippine and remote-international ranges.",
    status: "shipped",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 3",
    size: "M",
    shippedAt: { label: "Career guides", href: "/career" },
  },
  {
    id: "glossary",
    title: "Amazon PPC glossary",
    detail:
      "Plain-English definitions with the formula, a worked example and where the metric actually matters, cross-referenced to the cheat sheets.",
    status: "shipped",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 8.1",
    size: "M",
    countKey: "{glossaryTerms} terms live",
    shippedAt: { label: "Open the glossary", href: "/glossary" },
  },

  {
    id: "cheat-sheets-8",
    title: "The eight cheat sheets",
    detail:
      "All eight one-page references the plan called for are live: metrics, match types, campaign structure, search term reports, negative keywords, ad types, reporting and tools. A ninth is not planned — corrections and additions to the existing eight are more useful than a new sheet.",
    status: "shipped",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 4 (8 sheets planned)",
    size: "M",
    countKey: "{cheatSheets} of 8 published",
    shippedAt: { label: "Read them", href: "/cheat-sheets" },
  },

  /* ------------------------------------------------------ in progress */
  {
    id: "community-system",
    title: "Community contributions system",
    detail:
      "Guided submission forms that compose the markdown a maintainer wants and hand it to a prefilled GitHub issue, plus per-page feedback and this roadmap board. The forms are live; issue templates and a PR template in the repo still need writing.",
    status: "in-progress",
    area: "community",
    source: "TODO.md — Low priority · KANBAN.md — To Do",
    size: "M",
    claimable: true,
    shippedAt: { label: "Use the forms", href: "/contribute" },
  },
  {
    id: "resource-expansion",
    title: "Ongoing resource expansion",
    detail:
      "The standing job: more questions, more accounts, more edge cases. Every bank on the site takes submissions, and the contribution forms enforce the same evidence bar the existing entries meet.",
    status: "in-progress",
    area: "content",
    source: "KANBAN.md — In Progress",
    size: "M",
    claimable: true,
  },

  /* ----------------------------------------------------------- next up */
  {
    id: "client-resources",
    title: "Client-facing resource pack",
    detail:
      "Five documents a VA hands to a client: an onboarding questionnaire, a management agreement, a monthly report format, a strategy call agenda and a set of communication templates. Highest-value unbuilt item on the plan — it is what makes a VA look like an agency.",
    status: "next",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 5",
    size: "L",
    claimable: true,
  },
  {
    id: "emergency-playbook",
    title: "PPC emergency playbook",
    detail:
      "What to do in the first hour when a product is suppressed mid-campaign, a competitor starts bidding on brand terms, ACoS spikes overnight, stock runs out at peak, or the account gets a policy warning. Decision rules and escalation, not theory.",
    status: "next",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 6.3",
    size: "M",
    claimable: true,
  },
  {
    id: "failure-analysis",
    title: "Failure case studies",
    detail:
      "Accounts that went wrong and why: a suspension, a budget blown in three days, a client churn traced to communication, and a TACoS catastrophe where PPC cannibalised organic. Same evidence bar as a win — real numbers, honest post-mortem.",
    status: "next",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 6.2",
    size: "M",
    claimable: true,
  },
  {
    id: "policy-guide",
    title: "Amazon advertising policy guide",
    detail:
      "The advertising policies explained in plain English, the violations VAs actually trip over, how account health is measured, and appeal templates for each violation type.",
    status: "next",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 8.2",
    size: "M",
    claimable: true,
  },
  {
    id: "category-benchmarks",
    title: "Category benchmark database",
    detail:
      "ACoS, CPC and CVR benchmarks by category with seasonal patterns and competitive intensity, so a VA can tell a client whether 32% ACoS is good for supplements. Needs sourced data — cite where every number comes from.",
    status: "next",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 8.3",
    size: "L",
    claimable: true,
  },
  {
    id: "issue-templates",
    title: "GitHub issue and PR templates",
    detail:
      "Structured `.github/ISSUE_TEMPLATE/` forms for bug reports, feature requests, case study submissions and quiz questions, plus a PR template carrying the contribution checklist. The labels the forms on this site already emit should match them.",
    status: "next",
    area: "community",
    source: "EXPANSION-PLAN.md — Phase 10.1 and 10.2",
    size: "S",
    claimable: true,
  },
  {
    id: "ci-checks",
    title: "Repository CI checks",
    detail:
      "GitHub Actions for markdown linting, a link checker across every resource, and an auto-generated table of contents so the README never falls behind the file tree.",
    status: "next",
    area: "tooling",
    source: "EXPANSION-PLAN.md — Phase 10.3",
    size: "S",
    claimable: true,
  },

  /* ----------------------------------------------------------- backlog */
  {
    id: "user-accounts",
    title: "User accounts and synced progress",
    detail:
      "Progress already persists locally — quiz scores, practised questions and path completion all survive a reload on the same device. Syncing across devices means a backend, which the static export deliberately does not have. Open an issue with a hosting plan before writing any of it.",
    status: "backlog",
    area: "platform",
    source: "TODO.md — Low priority · KANBAN.md — To Do",
    size: "L",
    shippedAt: { label: "Local progress works today", href: "/dashboard" },
  },
  {
    id: "video-scripts",
    title: "Video content scripts",
    detail:
      "Five scripts the repo can support: PPC explained in ten minutes, how to read a search term report, a live account audit, a day in the life of a specialist, and the top five mistakes VAs make.",
    status: "backlog",
    area: "content",
    source: "EXPANSION-PLAN.md — Phase 9",
    size: "M",
    claimable: true,
  },
  {
    id: "mobile-app",
    title: "Mobile app",
    detail:
      "A native wrapper was on the original list. An installable progressive web app covers most of it at a fraction of the cost — if you want to argue for native, argue for it in an issue first.",
    status: "backlog",
    area: "platform",
    source: "TODO.md — Low priority",
    size: "L",
  },
];

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function itemsByStatus(status: RoadmapStatus): RoadmapItem[] {
  return ROADMAP.filter((item) => item.status === status);
}

export function statusCounts(): Record<RoadmapStatus, number> {
  return {
    shipped: itemsByStatus("shipped").length,
    "in-progress": itemsByStatus("in-progress").length,
    next: itemsByStatus("next").length,
    backlog: itemsByStatus("backlog").length,
  };
}

export function claimableCount(): number {
  return ROADMAP.filter((item) => item.claimable).length;
}

/** Replace `{key}` tokens in an item's `countKey` with live numbers. */
export function fillCounts(template: string, counts: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = counts[key];
    return typeof value === "number" ? value.toLocaleString("en-US") : match;
  });
}
