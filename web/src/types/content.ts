/**
 * Content contracts for PPC Academy.
 *
 * These interfaces are the shared vocabulary between every content domain
 * (`src/content/*.ts`) and every feature route. They are authored in phase 1
 * and must not be changed by later phases — extend with new optional fields
 * only if something is genuinely missing.
 */

export type ResourceKind =
  | "quiz"
  | "interview"
  | "case-study"
  | "sop"
  | "workflow"
  | "template"
  | "automation"
  | "script"
  | "career"
  | "calculator"
  | "cheat-sheet"
  | "glossary"
  | "path";

export type Level = "beginner" | "intermediate" | "advanced" | "expert" | "scenario";

/** Every browsable item registers one of these so search + nav can find it. */
export interface ResourceRef {
  id: string; // stable, unique, kebab-case
  kind: ResourceKind;
  title: string;
  summary: string; // 1-2 sentences, plain text
  href: string; // internal route, e.g. "/sops/daily-health-check"
  tags: string[];
  level?: Level;
  minutes?: number; // est. read/complete time
  body?: string; // full plain-text body for search indexing
  updated?: string; // ISO date
}

export interface QuizQuestion {
  id: string;
  level: Level;
  topic: string;
  question: string;
  choices: string[]; // 4 choices
  answerIndex: number;
  explanation: string; // why the answer is right
  reference?: string; // link to a resource href
}

export interface Quiz {
  id: string;
  title: string;
  summary: string;
  level: Level;
  topic: string;
  minutes: number;
  questions: QuizQuestion[];
}

export interface InterviewQuestion {
  id: string;
  category: string; // e.g. "Fundamentals", "Optimization", "Client Management"
  level: Level;
  question: string;
  idealAnswer: string; // markdown
  keyPoints: string[];
  redFlags?: string[];
  followUps?: string[];
}

export interface CaseStudyMetric {
  label: string;
  before: number | string;
  after: number | string;
  unit?: string;
  better: "higher" | "lower";
}

export interface CaseStudy {
  id: string;
  title: string;
  category: string;
  summary: string;
  client: string;
  timeframe: string;
  adSpend: string;
  challenge: string; // markdown
  approach: string[]; // ordered steps
  metrics: CaseStudyMetric[];
  timeline: { period: string; spend: number; revenue: number; acos: number }[];
  results: string; // markdown
  lessons: string[];
  tags: string[];
}

export interface DocResource {
  // SOPs, workflows, templates, automation, career, cheat sheets
  id: string;
  kind: ResourceKind;
  title: string;
  summary: string;
  tags: string[];
  minutes: number;
  level?: Level;
  meta?: Record<string, string>; // e.g. { Frequency: "Daily", Time: "15 min" }
  body: string; // markdown, rendered by <Markdown />
}

/* ------------------------------------------------------------------ *
 * Helper types shared by the UI layer
 * ------------------------------------------------------------------ */

/** Semantic colour roles wired to the design tokens. */
export type Tone = "neutral" | "brand" | "ember" | "good" | "warn" | "bad" | "info";

/** Direction a metric moved, once you account for `better`. */
export type MetricDirection = "up" | "down" | "flat";

/** A single term in the glossary domain (phase 2). */
export interface GlossaryTerm {
  id: string;
  term: string;
  abbreviation?: string;
  category: string;
  definition: string; // plain text, 1-3 sentences
  formula?: string; // mono-rendered, e.g. "ACoS = (Ad Spend / Ad Revenue) x 100"
  example?: string;
  related?: string[]; // ids of other terms
  seeAlso?: string[]; // internal hrefs
}

/** A named numeric input for an interactive calculator (phase 7). */
export interface CalculatorField {
  id: string;
  label: string;
  unit?: "USD" | "%" | "x" | "count";
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  help?: string;
}

/** A calculator definition (phase 7). */
export interface CalculatorSpec {
  id: string;
  title: string;
  summary: string;
  href: string;
  fields: CalculatorField[];
  tags: string[];
}

/** A step in a guided learning path (phase 9). */
export interface PathStep {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: ResourceKind;
  minutes: number;
}

/** A guided learning path (phase 9). */
export interface LearningPath {
  id: string;
  title: string;
  summary: string;
  level: Level;
  href: string;
  outcomes: string[];
  steps: PathStep[];
}

/** Sort/filter state shared by index pages. */
export interface ResourceFilter {
  kinds?: ResourceKind[];
  levels?: Level[];
  tags?: string[];
  query?: string;
}
