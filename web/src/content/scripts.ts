import type { ResourceRef } from "@/types/content";

import { appsScripts } from "./scripts-apps";
import { pythonScripts } from "./scripts-python";
import { formulaScripts, sqlScripts } from "./scripts-sql";
import {
  LANGUAGES,
  type AutomationScript,
  type PpcTool,
  type ScriptLanguage,
  type ToolTier,
} from "./scripts-types";

export {
  LANGUAGES,
  TOOL_TIERS,
  type AutomationLevel,
  type AutomationScript,
  type LanguageMeta,
  type PpcTool,
  type ScriptExplanation,
  type ScriptLanguage,
  type ScriptStep,
  type ToolTier,
  type ToolTierMeta,
} from "./scripts-types";

/**
 * The automation library.
 *
 * Fourteen assets in four languages, every one written to run against a
 * report a VA can download today. Ported from and built on top of
 * `../ppc-tools-for-va/automation/ppc-automation.md`: the bid bands, the
 * negative keyword rules and the guardrails are that document's, and the
 * tool comparison below is its twelve-tool table with the source's own
 * prices, time savings and verdicts intact.
 */

const UPDATED = "2026-06-29";

export const scripts: AutomationScript[] = [
  ...appsScripts,
  ...pythonScripts,
  ...sqlScripts,
  ...formulaScripts,
];

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export function findScript(id: string): AutomationScript | undefined {
  return scripts.find((script) => script.id === id);
}

export function requireScript(id: string): AutomationScript {
  const script = findScript(id);
  if (!script) throw new Error(`Unknown script id: ${id}`);
  return script;
}

export function scriptsByLanguage(language: ScriptLanguage): AutomationScript[] {
  return scripts.filter((script) => script.language === language);
}

export function relatedScripts(id: string): AutomationScript[] {
  const script = findScript(id);
  if (!script) return [];
  return script.related
    .map((relatedId) => findScript(relatedId))
    .filter((entry): entry is AutomationScript => Boolean(entry));
}

/** Every language that actually has assets, in catalogue order. */
export function languagesInUse(): ScriptLanguage[] {
  const order: ScriptLanguage[] = ["python", "google-apps-script", "sql", "bulk-sheet-formula"];
  return order.filter((language) => scriptsByLanguage(language).length > 0);
}

export function scriptLibraryStats() {
  const lines = scripts.reduce(
    (total, script) => total + script.code.trim().split("\n").length,
    0,
  );
  return {
    count: scripts.length,
    languages: languagesInUse().length,
    lines,
    steps: scripts.reduce((total, script) => total + script.steps.length, 0),
    annotations: scripts.reduce((total, script) => total + script.explanation.length, 0),
  };
}

/* ------------------------------------------------------------------ *
 * The twelve-tool comparison
 *
 * Prices, automation levels, verdicts and the cost-benefit figures are
 * the source guide's, unchanged. Where the source gives no time-saved or
 * net-value figure for a tool, the field is absent rather than guessed.
 * ------------------------------------------------------------------ */

export const ppcTools: PpcTool[] = [
  {
    rank: 1,
    name: "Amazon Campaign Manager",
    tier: "essential",
    priceFrom: 0,
    priceLabel: "Free",
    automation: "None",
    bestFor: "Learning fundamentals, small accounts",
    features: ["Campaign creation", "Bid adjustments", "Search term reports"],
    limitation: "No automation, no AI, clunky interface, manual everything",
    verdict:
      "A good starting point you will outgrow fast — but learn it first. Every tool below is a wrapper over this one, and you cannot debug a wrapper you do not understand.",
    hoursSavedPerWeek: 0,
  },
  {
    rank: 2,
    name: "Helium 10 Adtomic",
    tier: "essential",
    priceFrom: 79,
    priceLabel: "$79-$229/mo",
    automation: "Rules + AI",
    bestFor: "Sellers already inside the Helium 10 ecosystem",
    features: [
      "AI bid optimisation",
      "Keyword harvesting",
      "Negative keyword automation",
      "Rule-based automation",
      "Cerebro and Magnet integration",
    ],
    limitation: "A 2% ad spend fee on some plans",
    verdict:
      "The best all-in-one for mid-size sellers. The 2% fee matters at scale: on $20,000 of monthly spend that is $400 on top of the subscription.",
  },
  {
    rank: 3,
    name: "Helium 10 (full suite)",
    tier: "essential",
    priceFrom: 79,
    priceLabel: "$79-$229/mo",
    automation: "Rules + AI",
    bestFor: "All-round Amazon work, and the stack most job posts name",
    features: [
      "Cerebro — competitor keyword research",
      "Magnet — keyword discovery",
      "Adtomic — PPC automation",
      "Keyword Tracker — rank monitoring",
      "Market Tracker — market share",
    ],
    verdict:
      "The Swiss Army knife of Amazon selling. If you learn one paid tool as a VA, learn this one.",
    hoursSavedPerWeek: 8,
    netValuePerMonth: 331,
    roiCostBasis: 149,
  },
  {
    rank: 4,
    name: "Perpetua",
    tier: "professional",
    priceFrom: 500,
    priceLabel: "Custom, from ~$500/mo",
    automation: "Full AI",
    bestFor: "Large accounts and agencies",
    features: ["AI-driven optimisation", "Amazon plus Walmart", "Advanced analytics"],
    verdict: "Enterprise-grade, and the price reflects it.",
    hoursSavedPerWeek: 15,
    netValuePerMonth: 400,
    roiCostBasis: 500,
  },
  {
    rank: 5,
    name: "Quartile",
    tier: "professional",
    priceFrom: 500,
    priceLabel: "Custom, based on ad spend",
    automation: "Full AI",
    bestFor: "Enterprise brands",
    features: ["AI-powered bidding", "Cross-marketplace", "Advanced attribution"],
    verdict: "Best for accounts spending $100K or more a month.",
  },
  {
    rank: 6,
    name: "Teikametrics",
    tier: "professional",
    priceFrom: 0,
    priceLabel: "Free tier, paid plans scale",
    automation: "AI-driven",
    bestFor: "Multi-marketplace sellers",
    features: ["AI bid optimisation", "Walmart integration", "Analytics"],
    verdict: "Good for sellers running Amazon and Walmart together.",
  },
  {
    rank: 7,
    name: "PPC Entourage (Carbon6)",
    tier: "budget",
    priceFrom: 50,
    priceLabel: "From $50/mo",
    automation: "Rules-based",
    bestFor: "Budget-conscious sellers",
    features: ["Dayparting", "Automated bid rules", "Keyword harvesting"],
    verdict: "An affordable entry point into automation.",
  },
  {
    rank: 8,
    name: "BidX",
    tier: "budget",
    priceFrom: 49,
    priceLabel: "From $49/mo",
    automation: "Rules-based",
    bestFor: "Small to mid-size sellers",
    features: ["Bid automation", "Keyword management", "Bulk operations"],
    verdict: "Simple, affordable, gets the job done.",
    hoursSavedPerWeek: 3,
    netValuePerMonth: 131,
    roiCostBasis: 49,
  },
  {
    rank: 9,
    name: "Ad Badger",
    tier: "budget",
    priceFrom: 99,
    priceLabel: "From $99/mo",
    automation: "Rules + AI",
    bestFor: "Sellers who want strong negative keyword automation",
    features: ["Bid optimisation", "Negative keyword automation", "Dayparting"],
    verdict: "Strongest of the mid-tier on negatives specifically.",
    hoursSavedPerWeek: 5,
    netValuePerMonth: 201,
    roiCostBasis: 99,
  },
  {
    rank: 10,
    name: "Zon.Tools",
    tier: "budget",
    priceFrom: 9,
    priceLabel: "From $9/mo",
    automation: "Rules-based",
    bestFor: "Beginners and very small budgets",
    features: ["Basic bid automation", "Campaign management"],
    verdict: "The cheapest option, with the feature set that implies.",
  },
  {
    rank: 11,
    name: "Amazon Bulk Operations",
    tier: "free",
    priceFrom: 0,
    priceLabel: "Free",
    automation: "Manual, at scale",
    bestFor: "Anyone who knows Excel",
    features: ["Download a CSV", "Edit in a spreadsheet", "Upload it back"],
    verdict:
      "Free and genuinely powerful if you know Excel. Most VAs skip this and then pay $49 a month for a tool that does the same job more slowly.",
  },
  {
    rank: 12,
    name: "Google Sheets + Amazon API",
    tier: "free",
    priceFrom: 0,
    priceLabel: "Free (DIY)",
    automation: "Whatever you build",
    bestFor: "Technically confident sellers who want a bespoke solution",
    features: ["Custom reporting", "Data analysis", "Automation scripts"],
    verdict:
      "Maximum flexibility, requires technical skill. Everything in the library above lives here.",
  },
];

export function toolsByTier(tier: ToolTier): PpcTool[] {
  return ppcTools.filter((tool) => tool.tier === tier);
}

/**
 * The ROI formula from the source guide:
 *   (hours saved x hourly rate x 4 weeks) - monthly tool cost
 * Returns null where the source gives no time-saved figure.
 */
export function toolRoi(tool: PpcTool, hourlyRate: number): number | null {
  if (tool.hoursSavedPerWeek === undefined) return null;
  const monthlyCost = tool.roiCostBasis ?? tool.priceFrom;
  return tool.hoursSavedPerWeek * hourlyRate * 4 - monthlyCost;
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export function resourceRefs(): ResourceRef[] {
  return scripts.map((script) => ({
    id: `script-${script.id}`,
    kind: "script" as const,
    title: script.title,
    summary: script.summary,
    href: script.href,
    // The language label doubles as a tag; several scripts already carry it.
    tags: Array.from(
      new Set([...script.tags, LANGUAGES[script.language].label.toLowerCase()]),
    ),
    level: script.difficulty,
    minutes: script.minutes,
    body: [
      script.automates,
      script.summary,
      script.prerequisites.join(". "),
      script.explanation.map((entry) => entry.what).join(" "),
      script.steps.map((step) => `${step.title}. ${step.detail}`).join(" "),
      script.outputNote,
    ].join(" "),
    updated: UPDATED,
  }));
}
