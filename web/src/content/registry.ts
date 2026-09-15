import {
  Bot,
  BookOpen,
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  type LucideIcon,
  MessageSquareQuote,
  Route,
  ScrollText,
  Target,
  Terminal,
  TrendingUp,
  Workflow,
} from "lucide-react";

import type { ResourceKind, ResourceRef, Tone } from "@/types/content";

import { resourceRefs as automationRefs } from "./automation";
import { resourceRefs as careerRefs } from "./career";
import { resourceRefs as calculatorRefs } from "./calculators";
import { resourceRefs as caseStudyRefs } from "./case-studies";
import { resourceRefs as cheatSheetRefs } from "./cheat-sheets";
import { resourceRefs as glossaryRefs } from "./glossary";
import { resourceRefs as interviewRefs } from "./interviews";
import { resourceRefs as pathRefs } from "./paths";
import { resourceRefs as quizRefs } from "./quizzes";
import { resourceRefs as scriptRefs } from "./scripts";
import { resourceRefs as sopRefs } from "./sops";
import { resourceRefs as templateRefs } from "./templates";
import { resourceRefs as workflowRefs } from "./workflows";

/* ------------------------------------------------------------------ *
 * Resource registry
 *
 * Every content domain exports a `resourceRefs(): ResourceRef[]` helper.
 * To register a domain, add ONE line to RESOURCE_SOURCES below plus its
 * import at the top of this file. Nothing else in this file changes.
 *
 *   import { resourceRefs as sopRefs } from "./sops";
 *   ...
 *   export const RESOURCE_SOURCES: ResourceRef[][] = [
 *     sopRefs(),
 *   ];
 *
 * Domain modules must never import from this file — that would create a
 * cycle. Keep the dependency arrow pointing one way: domain -> registry.
 * ------------------------------------------------------------------ */

/** One entry per content domain. Later phases append their refs here. */
export const RESOURCE_SOURCES: ResourceRef[][] = [
  // phase 2 — sops, workflows, templates, automation, career, cheat-sheets, glossary
  sopRefs(),
  workflowRefs(),
  templateRefs(),
  automationRefs(),
  careerRefs(),
  cheatSheetRefs(),
  glossaryRefs(),
  // phase 4 — quizzes
  quizRefs(),
  // phase 5 — case studies
  caseStudyRefs(),
  // phase 6 — interviews
  interviewRefs(),
  // phase 7 — calculators, scripts
  calculatorRefs(),
  scriptRefs(),
  // phase 9 — learning paths
  pathRefs(),
];

/** Every registered resource, flattened. Search, nav and counts read this. */
export const allResources: ResourceRef[] = [...RESOURCE_SOURCES.flat()];

/* ------------------------------------------------------------------ *
 * Kind metadata
 * ------------------------------------------------------------------ */

export interface KindMeta {
  kind: ResourceKind;
  /** Singular noun, e.g. "SOP". */
  label: string;
  /** Section heading noun, e.g. "SOPs". */
  plural: string;
  /** lucide-react export name, for anywhere an icon must be serialisable. */
  iconName: string;
  /** Resolved lucide component — render as `<meta.icon className="size-4" />`. */
  icon: LucideIcon;
  /** One sentence describing what this kind is for. */
  description: string;
  /** Design-token colour role for chips, rules and icon wells. */
  accent: Tone;
  /** Index route for the kind. */
  href: string;
}

export const KIND_META: Record<ResourceKind, KindMeta> = {
  quiz: {
    kind: "quiz",
    label: "Quiz",
    plural: "Quizzes",
    iconName: "Target",
    icon: Target,
    description:
      "Graded question banks from match-type basics to scenario problem-solving, with an explanation on every answer.",
    accent: "brand",
    href: "/quizzes",
  },
  interview: {
    kind: "interview",
    label: "Interview question",
    plural: "Interview prep",
    iconName: "MessageSquareQuote",
    icon: MessageSquareQuote,
    description:
      "Real questions hiring managers ask PPC specialists, each with an ideal answer, key points and red flags.",
    accent: "ember",
    href: "/interviews",
  },
  "case-study": {
    kind: "case-study",
    label: "Case study",
    plural: "Case studies",
    iconName: "TrendingUp",
    icon: TrendingUp,
    description:
      "Real accounts with before/after numbers: what was broken, what changed, and what the spend did next.",
    accent: "good",
    href: "/case-studies",
  },
  sop: {
    kind: "sop",
    label: "SOP",
    plural: "SOPs",
    iconName: "ClipboardList",
    icon: ClipboardList,
    description:
      "Step-by-step operating procedures with inputs, decision rules, outputs and escalation paths.",
    accent: "info",
    href: "/sops",
  },
  workflow: {
    kind: "workflow",
    label: "Workflow",
    plural: "Workflows",
    iconName: "Workflow",
    icon: Workflow,
    description:
      "Process maps and decision trees for keyword harvesting, structure choices, reporting and testing.",
    accent: "brand",
    href: "/workflows",
  },
  template: {
    kind: "template",
    label: "Template",
    plural: "Templates",
    iconName: "FileSpreadsheet",
    icon: FileSpreadsheet,
    description:
      "Campaign build sheets, search-term analysis grids, audit checklists and client-ready report formats.",
    accent: "warn",
    href: "/templates",
  },
  automation: {
    kind: "automation",
    label: "Automation guide",
    plural: "Automation",
    iconName: "Bot",
    icon: Bot,
    description:
      "Tool comparison, rule sets, guardrails and the maturity model for moving from manual to automated.",
    accent: "info",
    href: "/automation",
  },
  script: {
    kind: "script",
    label: "Script",
    plural: "Scripts",
    iconName: "Terminal",
    icon: Terminal,
    description:
      "Runnable Python, Apps Script, SQL and sheet formulas, each one written against a report you can download today.",
    accent: "brand",
    href: "/scripts",
  },
  career: {
    kind: "career",
    label: "Career guide",
    plural: "Career",
    iconName: "GraduationCap",
    icon: GraduationCap,
    description:
      "The VA-to-specialist ladder: level definitions, salary ranges, resume, portfolio and negotiation.",
    accent: "ember",
    href: "/career",
  },
  calculator: {
    kind: "calculator",
    label: "Calculator",
    plural: "Calculators",
    iconName: "Calculator",
    icon: Calculator,
    description:
      "Break-even ACoS, ROAS, bid maths, budget planning and keyword ROI, computed live in the browser.",
    accent: "good",
    href: "/calculators",
  },
  "cheat-sheet": {
    kind: "cheat-sheet",
    label: "Cheat sheet",
    plural: "Cheat sheets",
    iconName: "ScrollText",
    icon: ScrollText,
    description:
      "One-page references you can keep open during a client call or a live interview screen-share.",
    accent: "neutral",
    href: "/cheat-sheets",
  },
  path: {
    kind: "path",
    label: "Learning path",
    plural: "Learning paths",
    iconName: "Route",
    icon: Route,
    description:
      "Guided reading orders through the library: where to start, what to read next, and what you can do once you finish.",
    accent: "brand",
    href: "/paths",
  },
  glossary: {
    kind: "glossary",
    label: "Glossary term",
    plural: "Glossary",
    iconName: "BookOpen",
    icon: BookOpen,
    description:
      "Plain-English definitions with the formula, a worked example and where the metric actually matters.",
    accent: "neutral",
    href: "/glossary",
  },
};

/** Stable render order for kind grids and filter chips. */
export const KIND_ORDER: ResourceKind[] = [
  "quiz",
  "interview",
  "case-study",
  "sop",
  "workflow",
  "template",
  "calculator",
  "automation",
  "script",
  "cheat-sheet",
  "glossary",
  "career",
  "path",
];

/**
 * Item counts in the source toolkit (`../ppc-tools-for-va/`).
 *
 * These are the published counts of the library this site is built from.
 * `resourceCount()` prefers the live registry once a domain has registered
 * its refs, and falls back to these so the marketing surface is never
 * blank before every phase has landed.
 */
export const SOURCE_LIBRARY_COUNTS: Record<ResourceKind, number> = {
  quiz: 50, // quiz questions across 5 levels
  interview: 60, // interview questions across 5 categories
  "case-study": 6,
  sop: 8,
  workflow: 6,
  template: 7,
  automation: 12, // tools compared in the automation guide
  script: 14, // runnable automation assets in four languages
  career: 4, // career guide, resume, portfolio, salary negotiation
  calculator: 5,
  "cheat-sheet": 6,
  glossary: 40,
  path: 4, // guided learning paths
};

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

/** Every registered resource of one kind, in registration order. */
export function byKind(kind: ResourceKind): ResourceRef[] {
  return allResources.filter((resource) => resource.kind === kind);
}

/** Resolve a route to its registered resource, ignoring a trailing slash. */
export function findByHref(href: string): ResourceRef | undefined {
  const normalised = href.length > 1 ? href.replace(/\/+$/, "") : href;
  return allResources.find(
    (resource) =>
      (resource.href.length > 1 ? resource.href.replace(/\/+$/, "") : resource.href) ===
      normalised,
  );
}

/** Resolve a resource by its stable id. */
export function findById(id: string): ResourceRef | undefined {
  return allResources.find((resource) => resource.id === id);
}

/** Count for a kind: the live registry when populated, else the library count. */
export function resourceCount(kind: ResourceKind): number {
  const registered = byKind(kind).length;
  return registered > 0 ? registered : SOURCE_LIBRARY_COUNTS[kind];
}

/** Every tag in use, sorted and de-duplicated. */
export function allTags(): string[] {
  return Array.from(new Set(allResources.flatMap((resource) => resource.tags))).sort(
    (a, b) => a.localeCompare(b),
  );
}

/** Resources carrying a given tag. */
export function byTag(tag: string): ResourceRef[] {
  const needle = tag.toLowerCase();
  return allResources.filter((resource) =>
    resource.tags.some((candidate) => candidate.toLowerCase() === needle),
  );
}

/** Kind metadata in display order — used by the home page resource grid. */
export function kindsInOrder(): KindMeta[] {
  return KIND_ORDER.map((kind) => KIND_META[kind]);
}
