import {
  Bug,
  ClipboardCheck,
  MessageSquareQuote,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { Tone } from "@/types/content";

import type { IssueDraft } from "./github";

/**
 * The four contribution forms, described as data.
 *
 * A form is a list of steps; a step is a list of field ids; a field knows how
 * to render itself, how to validate itself, and nothing else. The renderer in
 * `ContributionForm.tsx` walks this structure, so adding a question to a form
 * is a change here and nowhere else.
 *
 * Every variant ends with the same thing: `toIssue(values)` composes the exact
 * markdown a maintainer wants to read, which the final step shows as a live
 * preview and hands to GitHub as a prefilled issue.
 *
 * Content requirements follow `.github/CONTRIBUTING.md` in the source repo:
 * case studies need real before/after metrics and an honest "what didn't
 * work"; quiz questions need the correct answer, an explanation and a
 * difficulty level; SOP-shaped submissions need decision rules, not theory.
 */

/* ------------------------------------------------------------------ *
 * Values
 * ------------------------------------------------------------------ */

export interface MetricRow {
  label: string;
  before: string;
  after: string;
  unit: string;
}

export type FieldValue = string | string[] | MetricRow[];
export type FormValues = Record<string, FieldValue>;

export function emptyMetricRow(): MetricRow {
  return { label: "", before: "", after: "", unit: "" };
}

export function asText(value: FieldValue | undefined): string {
  return typeof value === "string" ? value : "";
}

export function asList(value: FieldValue | undefined): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? (value as string[])
    : [];
}

export function asMetrics(value: FieldValue | undefined): MetricRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is MetricRow => typeof entry === "object" && entry !== null && "label" in entry,
  );
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

interface FieldBase {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  /** Half-width on a two-column step. */
  half?: boolean;
}

export interface TextField extends FieldBase {
  kind: "text";
  maxLength?: number;
}

export interface TextareaField extends FieldBase {
  kind: "textarea";
  rows?: number;
  minLength?: number;
  maxLength?: number;
}

export interface SelectField extends FieldBase {
  kind: "select";
  options: { value: string; label: string }[];
}

export interface ListField extends FieldBase {
  kind: "list";
  /** Singular noun for the add button, e.g. "step". */
  itemLabel: string;
  minItems: number;
  maxItems: number;
  itemPlaceholder?: string;
  /** Renders "01, 02, 03" gutters — right for ordered procedures. */
  ordered?: boolean;
}

export interface MetricsField extends FieldBase {
  kind: "metrics";
  minRows: number;
  maxRows: number;
}

export interface ChoicesField extends FieldBase {
  kind: "choices";
  /** Key holding the correct index as a string, e.g. "answerIndex". */
  answerKey: string;
}

export type Field =
  | TextField
  | TextareaField
  | SelectField
  | ListField
  | MetricsField
  | ChoicesField;

export interface FormStep {
  id: string;
  title: string;
  blurb: string;
  fields: string[];
}

export interface ContributionVariant {
  id: VariantId;
  label: string;
  /** One line on the hub card. */
  tagline: string;
  /** Two or three sentences on the form itself. */
  intro: string;
  icon: LucideIcon;
  tone: Tone;
  /** What a good submission looks like, straight from CONTRIBUTING.md. */
  bar: string[];
  fields: Field[];
  steps: FormStep[];
  initial: FormValues;
  toIssue: (values: FormValues) => IssueDraft;
}

export type VariantId = "case-study" | "interview-question" | "quiz-question" | "feedback";

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

/** The single error string for a field, or undefined when it is fine. */
export function validateField(field: Field, values: FormValues): string | undefined {
  switch (field.kind) {
    case "text": {
      const text = asText(values[field.id]).trim();
      if (field.required && text.length === 0) return `${field.label} is required.`;
      if (field.maxLength && text.length > field.maxLength) {
        return `Keep this under ${field.maxLength} characters.`;
      }
      return undefined;
    }
    case "textarea": {
      const text = asText(values[field.id]).trim();
      if (field.required && text.length === 0) return `${field.label} is required.`;
      if (text.length > 0 && field.minLength && text.length < field.minLength) {
        return `Add a bit more detail — at least ${field.minLength} characters (${text.length} so far).`;
      }
      if (field.maxLength && text.length > field.maxLength) {
        return `Keep this under ${field.maxLength} characters.`;
      }
      return undefined;
    }
    case "select": {
      const text = asText(values[field.id]);
      if (field.required && text.length === 0) return `Choose a ${field.label.toLowerCase()}.`;
      return undefined;
    }
    case "list": {
      const filled = asList(values[field.id]).filter((entry) => entry.trim().length > 0);
      if (filled.length < field.minItems) {
        const noun = field.minItems === 1 ? field.itemLabel : `${field.itemLabel}s`;
        return `Add at least ${field.minItems} ${noun} (${filled.length} so far).`;
      }
      return undefined;
    }
    case "metrics": {
      const rows = asMetrics(values[field.id]);
      const complete = rows.filter(
        (row) => row.label.trim() && row.before.trim() && row.after.trim(),
      );
      if (complete.length < field.minRows) {
        return `Add at least ${field.minRows} complete rows — each needs a metric, a before and an after (${complete.length} so far).`;
      }
      return undefined;
    }
    case "choices": {
      const choices = asList(values[field.id]);
      const filled = choices.filter((entry) => entry.trim().length > 0);
      if (filled.length < 4) return `All four answer choices are required (${filled.length} of 4).`;
      const answer = asText(values[field.answerKey]);
      if (answer === "") return "Mark which choice is the correct answer.";
      return undefined;
    }
  }
}

/** Errors for every field on a step, keyed by field id. */
export function validateStep(
  variant: ContributionVariant,
  stepIndex: number,
  values: FormValues,
): Record<string, string> {
  const step = variant.steps[stepIndex];
  if (!step) return {};
  const errors: Record<string, string> = {};
  for (const fieldId of step.fields) {
    const field = variant.fields.find((entry) => entry.id === fieldId);
    if (!field) continue;
    const error = validateField(field, values);
    if (error) errors[fieldId] = error;
  }
  return errors;
}

/** True when every step of the form passes. */
export function isComplete(variant: ContributionVariant, values: FormValues): boolean {
  return variant.steps.every(
    (_, index) => Object.keys(validateStep(variant, index, values)).length === 0,
  );
}

/** How many steps currently validate — drives the progress readout. */
export function completedSteps(variant: ContributionVariant, values: FormValues): number {
  return variant.steps.filter(
    (_, index) => Object.keys(validateStep(variant, index, values)).length === 0,
  ).length;
}

/* ------------------------------------------------------------------ *
 * Markdown helpers
 * ------------------------------------------------------------------ */

function clean(value: FieldValue | undefined): string {
  return asText(value).trim();
}

function bullets(items: string[]): string {
  const filled = items.map((entry) => entry.trim()).filter(Boolean);
  return filled.length > 0 ? filled.map((entry) => `- ${entry}`).join("\n") : "_None given._";
}

function numbered(items: string[]): string {
  const filled = items.map((entry) => entry.trim()).filter(Boolean);
  return filled.length > 0
    ? filled.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
    : "_None given._";
}

function metricTable(rows: MetricRow[]): string {
  const complete = rows.filter((row) => row.label.trim() && row.before.trim() && row.after.trim());
  if (complete.length === 0) return "_No metrics given._";

  const header = "| Metric | Before | After | Unit |\n| --- | --- | --- | --- |";
  const body = complete
    .map(
      (row) =>
        `| ${row.label.trim()} | ${row.before.trim()} | ${row.after.trim()} | ${
          row.unit.trim() || "—"
        } |`,
    )
    .join("\n");

  return `${header}\n${body}`;
}

function section(heading: string, body: string): string {
  return `## ${heading}\n\n${body}`;
}

const SUBMISSION_FOOTER =
  "---\n\n_Submitted through the PPC Academy contribution form. Everything above was typed by the contributor; nothing was auto-collected._";

/* ------------------------------------------------------------------ *
 * Shared option lists
 * ------------------------------------------------------------------ */

const LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner — first 90 days on an account" },
  { value: "intermediate", label: "Intermediate — runs campaigns unsupervised" },
  { value: "advanced", label: "Advanced — owns strategy and budget" },
  { value: "expert", label: "Expert — account lead / manages other VAs" },
  { value: "scenario", label: "Scenario — a live case to work through" },
];

const CATEGORY_OPTIONS = [
  { value: "Supplements", label: "Supplements" },
  { value: "Home & Kitchen", label: "Home & Kitchen" },
  { value: "Beauty & Personal Care", label: "Beauty & Personal Care" },
  { value: "Electronics & Accessories", label: "Electronics & Accessories" },
  { value: "Toys & Games", label: "Toys & Games" },
  { value: "Pet Supplies", label: "Pet Supplies" },
  { value: "Apparel", label: "Apparel" },
  { value: "Sports & Outdoors", label: "Sports & Outdoors" },
  { value: "Office & Industrial", label: "Office & Industrial" },
  { value: "Grocery & Consumables", label: "Grocery & Consumables" },
  { value: "Other", label: "Other" },
];

const MARKETPLACE_OPTIONS = [
  { value: "Amazon.com (US)", label: "Amazon.com (US)" },
  { value: "Amazon.co.uk (UK)", label: "Amazon.co.uk (UK)" },
  { value: "Amazon.de (DE)", label: "Amazon.de (DE)" },
  { value: "Amazon.ca (CA)", label: "Amazon.ca (CA)" },
  { value: "Amazon.com.au (AU)", label: "Amazon.com.au (AU)" },
  { value: "Amazon.co.jp (JP)", label: "Amazon.co.jp (JP)" },
  { value: "Multiple marketplaces", label: "Multiple marketplaces" },
];

const INTERVIEW_CATEGORY_OPTIONS = [
  { value: "Fundamentals", label: "Fundamentals — definitions and the basics" },
  { value: "Campaign Structure", label: "Campaign Structure — builds and naming" },
  { value: "Optimization", label: "Optimization — bids, negatives, search terms" },
  { value: "Reporting & Analysis", label: "Reporting & Analysis — reading the data" },
  { value: "Client Management", label: "Client Management — comms and expectations" },
  { value: "Scenarios", label: "Scenarios — 'what would you do if…'" },
];

const QUIZ_TOPIC_OPTIONS = [
  { value: "Match types", label: "Match types" },
  { value: "Campaign structure", label: "Campaign structure" },
  { value: "Bidding & placements", label: "Bidding & placements" },
  { value: "Budgets & pacing", label: "Budgets & pacing" },
  { value: "Search term reports", label: "Search term reports" },
  { value: "Negative keywords", label: "Negative keywords" },
  { value: "Metrics & maths", label: "Metrics & maths" },
  { value: "Ad types (SP/SB/SD)", label: "Ad types (SP / SB / SD)" },
  { value: "Reporting", label: "Reporting" },
  { value: "Troubleshooting", label: "Troubleshooting" },
  { value: "Amazon policy", label: "Amazon policy" },
];

const FEEDBACK_TYPE_OPTIONS = [
  { value: "Wrong number or fact", label: "Wrong number or fact" },
  { value: "Broken link or control", label: "Broken link or control" },
  { value: "Typo or unclear wording", label: "Typo or unclear wording" },
  { value: "Accessibility problem", label: "Accessibility problem" },
  { value: "Layout problem on my screen", label: "Layout problem on my screen" },
  { value: "Missing content", label: "Missing content" },
  { value: "Improvement idea", label: "Improvement idea" },
];

/* ------------------------------------------------------------------ *
 * Variant 1 — case study
 * ------------------------------------------------------------------ */

const caseStudyVariant: ContributionVariant = {
  id: "case-study",
  label: "Case study",
  tagline: "Share an optimisation win with the real before/after numbers.",
  intro:
    "The most valuable thing you can give the library is an account you actually turned around. Anonymise the client — a category and a size is enough — but keep the numbers exact. A case study without real metrics is a blog post, and the repo already has enough of those.",
  icon: TrendingUp,
  tone: "good",
  bar: [
    "Real before/after metrics, not rounded guesses.",
    "The strategy described clearly enough to copy.",
    "What worked and what didn't — both.",
    "Client names anonymised if you need to.",
  ],
  fields: [
    {
      id: "title",
      kind: "text",
      label: "Case study title",
      placeholder: "Supplement brand: 62% ACoS down to 24% in four months",
      hint: "Lead with the result. The number in the title is what makes people open it.",
      required: true,
      maxLength: 110,
    },
    {
      id: "client",
      kind: "text",
      label: "Client profile",
      placeholder: "Private-label supplement brand, 18 SKUs, $80K/month revenue",
      hint: "Category, catalogue size and rough scale. No brand names needed.",
      required: true,
      half: true,
    },
    {
      id: "category",
      kind: "select",
      label: "Category",
      options: CATEGORY_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "marketplace",
      kind: "select",
      label: "Marketplace",
      options: MARKETPLACE_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "timeframe",
      kind: "text",
      label: "Timeframe",
      placeholder: "January – April 2026 (4 months)",
      hint: "Start and end, plus how long that is.",
      required: true,
      half: true,
    },
    {
      id: "adSpend",
      kind: "text",
      label: "Ad spend",
      placeholder: "$4,200/month at the start, $5,100/month at the end",
      hint: "Monthly spend, or the total across the engagement.",
      required: true,
      half: true,
    },
    {
      id: "challenge",
      kind: "textarea",
      label: "The challenge",
      placeholder:
        "ACoS had been above 60% for five months. Auto campaigns were eating 40% of the budget with no negatives ever added, and the top three converting search terms were still trapped in auto…",
      hint: "What was broken when you took it over, and why it mattered to the client.",
      required: true,
      minLength: 120,
      maxLength: 1800,
      rows: 7,
    },
    {
      id: "approach",
      kind: "list",
      label: "The approach, step by step",
      itemLabel: "step",
      itemPlaceholder: "Pulled 90 days of search term data and negated everything above 80% ACoS with 15+ clicks",
      hint: "In the order you did it. Each step should be something another VA can repeat.",
      minItems: 3,
      maxItems: 14,
      ordered: true,
      required: true,
    },
    {
      id: "metrics",
      kind: "metrics",
      label: "Before and after",
      hint: "One row per metric. ACoS, ROAS, spend, revenue, CPC, CVR, TACoS — whatever moved.",
      minRows: 3,
      maxRows: 12,
      required: true,
    },
    {
      id: "results",
      kind: "textarea",
      label: "The results",
      placeholder:
        "ACoS finished at 24.1% against a 28% break-even, so the account moved from losing money on ads to funding its own growth. Ad revenue grew 38% on 21% more spend…",
      hint: "Tie the numbers together. What did the client actually gain?",
      required: true,
      minLength: 100,
      maxLength: 1500,
      rows: 6,
    },
    {
      id: "lessons",
      kind: "list",
      label: "What you'd tell another VA",
      itemLabel: "lesson",
      itemPlaceholder: "Negating before harvesting wastes a week — do both in the same pass",
      hint: "Include at least one thing that did not work. That is the part nobody else publishes.",
      minItems: 2,
      maxItems: 8,
      required: true,
    },
  ],
  steps: [
    {
      id: "account",
      title: "The account",
      blurb: "Enough context for a reader to tell whether this case looks like theirs.",
      fields: ["title", "client", "category", "marketplace", "timeframe", "adSpend"],
    },
    {
      id: "challenge",
      title: "The challenge",
      blurb: "What was wrong before you touched anything.",
      fields: ["challenge"],
    },
    {
      id: "approach",
      title: "What you did",
      blurb: "The steps, in order. This is the part people copy.",
      fields: ["approach"],
    },
    {
      id: "metrics",
      title: "The numbers",
      blurb: "Before and after for every metric that moved. Exact figures only.",
      fields: ["metrics"],
    },
    {
      id: "results",
      title: "Results and lessons",
      blurb: "What it added up to, and what you would do differently.",
      fields: ["results", "lessons"],
    },
  ],
  initial: {
    title: "",
    client: "",
    category: "",
    marketplace: "",
    timeframe: "",
    adSpend: "",
    challenge: "",
    approach: ["", "", ""],
    metrics: [
      { label: "ACoS", before: "", after: "", unit: "%" },
      { label: "ROAS", before: "", after: "", unit: "x" },
      { label: "Ad revenue", before: "", after: "", unit: "USD" },
    ],
    results: "",
    lessons: ["", ""],
  },
  toIssue: (values) => {
    const title = clean(values.title) || "Untitled case study";

    const body = [
      section(
        "Account profile",
        [
          `- **Client:** ${clean(values.client) || "—"}`,
          `- **Category:** ${clean(values.category) || "—"}`,
          `- **Marketplace:** ${clean(values.marketplace) || "—"}`,
          `- **Timeframe:** ${clean(values.timeframe) || "—"}`,
          `- **Ad spend:** ${clean(values.adSpend) || "—"}`,
        ].join("\n"),
      ),
      section("The challenge", clean(values.challenge) || "_Not given._"),
      section("The approach", numbered(asList(values.approach))),
      section("Before and after", metricTable(asMetrics(values.metrics))),
      section("The results", clean(values.results) || "_Not given._"),
      section("Lessons", bullets(asList(values.lessons))),
      SUBMISSION_FOOTER,
    ].join("\n\n");

    return {
      title: `[case study] ${title}`,
      body,
      labels: ["content", "case-study", "submission"],
    };
  },
};

/* ------------------------------------------------------------------ *
 * Variant 2 — interview question
 * ------------------------------------------------------------------ */

const interviewVariant: ContributionVariant = {
  id: "interview-question",
  label: "Interview question",
  tagline: "Add a question you were actually asked, with the answer that lands.",
  intro:
    "Questions from real screens beat questions invented for a blog. Write the question exactly as it was put to you, then the answer a strong candidate gives — not the textbook definition, the version that shows judgement.",
  icon: MessageSquareQuote,
  tone: "ember",
  bar: [
    "The question as it was actually asked.",
    "An ideal answer a hiring manager would accept.",
    "Three or more key points the answer must hit.",
    "The difficulty level, so it lands in the right bank.",
  ],
  fields: [
    {
      id: "category",
      kind: "select",
      label: "Category",
      options: INTERVIEW_CATEGORY_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "level",
      kind: "select",
      label: "Level",
      options: LEVEL_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "question",
      kind: "textarea",
      label: "The question",
      placeholder:
        "A client's ACoS jumped from 28% to 51% in one week and nothing changed in the campaigns. Walk me through how you find the cause.",
      hint: "Word for word, the way the interviewer said it.",
      required: true,
      minLength: 25,
      maxLength: 600,
      rows: 4,
    },
    {
      id: "idealAnswer",
      kind: "textarea",
      label: "The ideal answer",
      placeholder:
        "Start by separating whether spend went up or revenue went down — they need different fixes. Pull the last 14 days by campaign and compare…",
      hint: "Markdown is fine. Write what a strong candidate says out loud, not a bullet dump.",
      required: true,
      minLength: 150,
      maxLength: 2500,
      rows: 9,
    },
    {
      id: "keyPoints",
      kind: "list",
      label: "Key points the answer must hit",
      itemLabel: "key point",
      itemPlaceholder: "Separates a spend problem from a revenue problem before touching bids",
      hint: "The checklist an interviewer marks against.",
      minItems: 3,
      maxItems: 8,
      required: true,
    },
    {
      id: "redFlags",
      kind: "list",
      label: "Red flags",
      itemLabel: "red flag",
      itemPlaceholder: "Jumps straight to lowering every bid without diagnosing anything",
      hint: "Answers that should worry the interviewer. Optional but very useful.",
      minItems: 0,
      maxItems: 6,
    },
    {
      id: "followUps",
      kind: "list",
      label: "Likely follow-ups",
      itemLabel: "follow-up",
      itemPlaceholder: "And if the spend was flat but conversions halved?",
      hint: "Where the interviewer usually pushes next. Optional.",
      minItems: 0,
      maxItems: 5,
    },
    {
      id: "source",
      kind: "text",
      label: "Where this came from",
      placeholder: "Agency screening round, Manila, March 2026",
      hint: "Optional. Helps us judge how common the question is. Never name an interviewer.",
      maxLength: 140,
    },
  ],
  steps: [
    {
      id: "question",
      title: "The question",
      blurb: "What was asked, and who it is aimed at.",
      fields: ["category", "level", "question"],
    },
    {
      id: "answer",
      title: "The ideal answer",
      blurb: "What a strong candidate says, and the points they have to cover.",
      fields: ["idealAnswer", "keyPoints"],
    },
    {
      id: "grading",
      title: "Grading notes",
      blurb: "What would worry an interviewer, and where they push next.",
      fields: ["redFlags", "followUps", "source"],
    },
  ],
  initial: {
    category: "",
    level: "",
    question: "",
    idealAnswer: "",
    keyPoints: ["", "", ""],
    redFlags: [""],
    followUps: [""],
    source: "",
  },
  toIssue: (values) => {
    const question = clean(values.question);
    const short = question.length > 70 ? `${question.slice(0, 67).trimEnd()}…` : question;

    const body = [
      section(
        "Classification",
        [
          `- **Category:** ${clean(values.category) || "—"}`,
          `- **Level:** ${clean(values.level) || "—"}`,
          `- **Source:** ${clean(values.source) || "not given"}`,
        ].join("\n"),
      ),
      section("The question", question ? `> ${question.replace(/\n/g, "\n> ")}` : "_Not given._"),
      section("Ideal answer", clean(values.idealAnswer) || "_Not given._"),
      section("Key points", bullets(asList(values.keyPoints))),
      section("Red flags", bullets(asList(values.redFlags))),
      section("Likely follow-ups", bullets(asList(values.followUps))),
      SUBMISSION_FOOTER,
    ].join("\n\n");

    return {
      title: `[interview] ${short || "New interview question"}`,
      body,
      labels: ["content", "interview-question", "submission"],
    };
  },
};

/* ------------------------------------------------------------------ *
 * Variant 3 — quiz question
 * ------------------------------------------------------------------ */

const quizVariant: ContributionVariant = {
  id: "quiz-question",
  label: "Quiz question",
  tagline: "Propose a question with four choices, the answer and the why.",
  intro:
    "Good quiz questions punish a guess and reward understanding. Make the three wrong choices plausible — a distractor nobody would pick teaches nothing — and write an explanation that stands on its own when someone gets it wrong at 11pm.",
  icon: Target,
  tone: "brand",
  bar: [
    "Exactly four choices, all of them plausible.",
    "One unambiguously correct answer.",
    "An explanation of why it is correct.",
    "A difficulty level, and a source if it comes from Amazon's docs.",
  ],
  fields: [
    {
      id: "level",
      kind: "select",
      label: "Level",
      options: LEVEL_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "topic",
      kind: "select",
      label: "Topic",
      options: QUIZ_TOPIC_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "question",
      kind: "textarea",
      label: "The question",
      placeholder:
        "A keyword has 40 clicks, 0 orders and $34 spend on a product with a 28% break-even ACoS. What is the correct action?",
      hint: "One question, no compound clauses. Include the numbers a reader needs to answer it.",
      required: true,
      minLength: 25,
      maxLength: 500,
      rows: 4,
    },
    {
      id: "choices",
      kind: "choices",
      label: "Answer choices",
      answerKey: "answerIndex",
      hint: "Four choices. Mark the correct one with the radio on its left.",
      required: true,
    },
    {
      id: "explanation",
      kind: "textarea",
      label: "Why that answer is right",
      placeholder:
        "Forty clicks with no orders is roughly three times the conversion window for this category, so the keyword has shown enough data to judge…",
      hint: "Explain the reasoning, not just the rule. Mention why the tempting wrong answer is wrong.",
      required: true,
      minLength: 80,
      maxLength: 1200,
      rows: 6,
    },
    {
      id: "reference",
      kind: "text",
      label: "Reference",
      placeholder: "Amazon Ads help: 'Negative keyword targeting', or /cheat-sheets/negative-keywords",
      hint: "Optional. An Amazon documentation page, or a route on this site.",
      maxLength: 200,
    },
  ],
  steps: [
    {
      id: "setup",
      title: "Where it belongs",
      blurb: "The bank and difficulty this question should sit in.",
      fields: ["level", "topic"],
    },
    {
      id: "question",
      title: "Question and choices",
      blurb: "Four plausible options, one correct.",
      fields: ["question", "choices"],
    },
    {
      id: "explanation",
      title: "The explanation",
      blurb: "What the reader learns when they get it wrong.",
      fields: ["explanation", "reference"],
    },
  ],
  initial: {
    level: "",
    topic: "",
    question: "",
    choices: ["", "", "", ""],
    answerIndex: "",
    explanation: "",
    reference: "",
  },
  toIssue: (values) => {
    const question = clean(values.question);
    const short = question.length > 70 ? `${question.slice(0, 67).trimEnd()}…` : question;
    const choices = asList(values.choices);
    const answerIndex = Number.parseInt(asText(values.answerIndex), 10);

    const choiceLines = choices
      .map((choice, index) => {
        const letter = String.fromCharCode(65 + index);
        const correct = index === answerIndex ? " ✅ **correct**" : "";
        return `- **${letter}.** ${choice.trim() || "_blank_"}${correct}`;
      })
      .join("\n");

    const answerLabel = Number.isInteger(answerIndex)
      ? `${String.fromCharCode(65 + answerIndex)} — ${choices[answerIndex]?.trim() ?? ""}`
      : "not marked";

    const body = [
      section(
        "Classification",
        [
          `- **Level:** ${clean(values.level) || "—"}`,
          `- **Topic:** ${clean(values.topic) || "—"}`,
          `- **Reference:** ${clean(values.reference) || "not given"}`,
        ].join("\n"),
      ),
      section("The question", question || "_Not given._"),
      section("Choices", choiceLines || "_Not given._"),
      section("Correct answer", answerLabel),
      section("Explanation", clean(values.explanation) || "_Not given._"),
      SUBMISSION_FOOTER,
    ].join("\n\n");

    return {
      title: `[quiz] ${short || "New quiz question"}`,
      body,
      labels: ["content", "quiz-question", "submission"],
    };
  },
};

/* ------------------------------------------------------------------ *
 * Variant 4 — feedback / bug
 * ------------------------------------------------------------------ */

const feedbackVariant: ContributionVariant = {
  id: "feedback",
  label: "Issue or idea",
  tagline: "Report a wrong number, a broken control, or something that should exist.",
  intro:
    "The fastest contribution there is. If a figure looks wrong, a link is dead, or a page fights you on a phone, say so — one line is enough to be useful, and a screenshot in the issue afterwards is even better.",
  icon: Bug,
  tone: "warn",
  bar: [
    "Say which page, exactly.",
    "Describe what you saw and what you expected.",
    "Attach a screenshot on the issue if the problem is visual.",
    "Check the tracker first — someone may have filed it already.",
  ],
  fields: [
    {
      id: "page",
      kind: "text",
      label: "Page or resource",
      placeholder: "/calculators/break-even-acos",
      hint: "A route on this site, a file in the repo, or a plain description.",
      required: true,
      half: true,
    },
    {
      id: "type",
      kind: "select",
      label: "Type",
      options: FEEDBACK_TYPE_OPTIONS,
      required: true,
      half: true,
    },
    {
      id: "description",
      kind: "textarea",
      label: "What happened",
      placeholder:
        "The break-even ACoS calculator shows 31.4% for a $29.99 product with $8 COGS and $5.50 FBA, but working it by hand gives 45.7%…",
      hint: "What you did, what you saw. Include the inputs if it is a calculator.",
      required: true,
      minLength: 40,
      maxLength: 1500,
      rows: 6,
    },
    {
      id: "expected",
      kind: "textarea",
      label: "What you expected instead",
      placeholder: "45.7%, matching the formula on the cheat sheet.",
      hint: "Optional, but it turns a report into a fix.",
      maxLength: 800,
      rows: 3,
    },
    {
      id: "environment",
      kind: "text",
      label: "Device and browser",
      placeholder: "Android phone, Chrome, dark mode",
      hint: "Optional. Only matters for layout and accessibility reports.",
      maxLength: 140,
    },
  ],
  steps: [
    {
      id: "where",
      title: "Where",
      blurb: "Which page, and what kind of problem it is.",
      fields: ["page", "type"],
    },
    {
      id: "what",
      title: "What happened",
      blurb: "Enough detail that someone can reproduce it without asking you.",
      fields: ["description", "expected", "environment"],
    },
  ],
  initial: {
    page: "",
    type: "",
    description: "",
    expected: "",
    environment: "",
  },
  toIssue: (values) => {
    const page = clean(values.page) || "unspecified page";
    const type = clean(values.type) || "Issue";

    const body = [
      section(
        "Where",
        [
          `- **Page:** \`${page}\``,
          `- **Type:** ${type}`,
          `- **Device / browser:** ${clean(values.environment) || "not given"}`,
        ].join("\n"),
      ),
      section("What happened", clean(values.description) || "_Not given._"),
      section("What I expected", clean(values.expected) || "_Not given._"),
      SUBMISSION_FOOTER,
    ].join("\n\n");

    return {
      title: `[${type.toLowerCase()}] ${page}`,
      body,
      labels: ["site-feedback", "triage"],
    };
  },
};

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const CONTRIBUTION_VARIANTS: ContributionVariant[] = [
  caseStudyVariant,
  interviewVariant,
  quizVariant,
  feedbackVariant,
];

export function findVariant(id: string): ContributionVariant | undefined {
  return CONTRIBUTION_VARIANTS.find((variant) => variant.id === id);
}

export function requireVariant(id: VariantId): ContributionVariant {
  const variant = findVariant(id);
  if (!variant) throw new Error(`Unknown contribution variant: ${id}`);
  return variant;
}

/** A fresh, independent copy of a variant's starting values. */
export function initialValues(variant: ContributionVariant): FormValues {
  const out: FormValues = {};
  for (const [key, value] of Object.entries(variant.initial)) {
    if (Array.isArray(value)) {
      out[key] = value.map((entry) =>
        typeof entry === "string" ? entry : { ...entry },
      ) as FieldValue;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** True when the contributor has typed anything at all. */
export function hasContent(variant: ContributionVariant, values: FormValues): boolean {
  return Object.entries(values).some(([key, value]) => {
    const seed = variant.initial[key];
    if (typeof value === "string") return value.trim() !== (typeof seed === "string" ? seed : "");
    if (Array.isArray(value)) {
      return value.some((entry) =>
        typeof entry === "string"
          ? entry.trim().length > 0
          : Boolean(entry.before.trim() || entry.after.trim()),
      );
    }
    return false;
  });
}

/** Icon and label for the checklist rendered beside every form. */
export const CHECKLIST_ICON = ClipboardCheck;
