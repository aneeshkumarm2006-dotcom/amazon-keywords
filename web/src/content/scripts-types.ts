import type { Level } from "@/types/content";

/**
 * Shared shapes for the automation library.
 *
 * Kept beside `scripts.ts` rather than inside it so the detail route, the
 * index and the comparison table can all import the types without pulling the
 * whole catalogue into a client bundle.
 */

export type ScriptLanguage = "python" | "google-apps-script" | "sql" | "bulk-sheet-formula";

export interface LanguageMeta {
  id: ScriptLanguage;
  label: string;
  /** Extension used by the download button. */
  extension: string;
  mime: string;
  /** Where the code runs. */
  runsIn: string;
  blurb: string;
}

export const LANGUAGES: Record<ScriptLanguage, LanguageMeta> = {
  python: {
    id: "python",
    label: "Python",
    extension: "py",
    mime: "text/x-python;charset=utf-8",
    runsIn: "Your laptop, or Google Colab in a browser tab",
    blurb:
      "Best for anything that reads a downloaded report and writes a file back. Install once, run from the terminal, no account needed.",
  },
  "google-apps-script": {
    id: "google-apps-script",
    label: "Google Apps Script",
    extension: "gs",
    mime: "text/javascript;charset=utf-8",
    runsIn: "Extensions ▸ Apps Script inside a Google Sheet",
    blurb:
      "Best for anything that lives in a shared sheet the client can see, or anything that needs to run on a schedule and email someone.",
  },
  sql: {
    id: "sql",
    label: "SQL",
    extension: "sql",
    mime: "text/plain;charset=utf-8",
    runsIn: "DuckDB over a CSV, BigQuery, or any warehouse the client already has",
    blurb:
      "Best for pivots and joins that would take twenty minutes of spreadsheet work. DuckDB runs these straight over a downloaded CSV with no database to set up.",
  },
  "bulk-sheet-formula": {
    id: "bulk-sheet-formula",
    label: "Sheet formulas",
    extension: "txt",
    mime: "text/plain;charset=utf-8",
    runsIn: "Google Sheets or Excel, pasted next to a downloaded report",
    blurb:
      "No install, no permissions, nothing to explain to a client's IT team. The lowest-friction automation there is, and the one most VAs skip.",
  },
};

export interface ScriptExplanation {
  /** Line range in the code block, e.g. "14-28". */
  lines: string;
  what: string;
}

export interface ScriptStep {
  title: string;
  detail: string;
}

export interface AutomationScript {
  id: string;
  title: string;
  summary: string;
  language: ScriptLanguage;
  difficulty: Level;
  href: string;
  /** Minutes to set it up the first time. */
  minutes: number;
  /** One sentence: the manual job this replaces. */
  automates: string;
  frequency: string;
  /** Honest estimate of the time it gives back. */
  saves: string;
  prerequisites: string[];
  fileName: string;
  code: string;
  explanation: ScriptExplanation[];
  steps: ScriptStep[];
  expectedOutput: string;
  outputNote: string;
  tags: string[];
  related: string[];
}

export type ToolTier = "essential" | "professional" | "budget" | "free";

export interface ToolTierMeta {
  id: ToolTier;
  label: string;
  description: string;
}

export const TOOL_TIERS: Record<ToolTier, ToolTierMeta> = {
  essential: {
    id: "essential",
    label: "Tier 1 — Essential",
    description: "Everyone in the job knows these. Learn them first; the rest are wrappers.",
  },
  professional: {
    id: "professional",
    label: "Tier 2 — Professional",
    description: "Agency and enterprise platforms. You will operate one, not choose it.",
  },
  budget: {
    id: "budget",
    label: "Tier 3 — Budget-friendly",
    description: "Rules-based automation for small and mid-size accounts.",
  },
  free: {
    id: "free",
    label: "Tier 4 — Free and DIY",
    description: "Costs nothing but your time. Where the scripts on this page live.",
  },
}
;

export type AutomationLevel =
  | "None"
  | "Rules-based"
  | "Rules + AI"
  | "AI-driven"
  | "Full AI"
  | "Manual, at scale"
  | "Whatever you build";

export interface PpcTool {
  rank: number;
  name: string;
  tier: ToolTier;
  /** Numeric floor in USD per month, for sorting. 0 means free. */
  priceFrom: number;
  /** Rendered price, e.g. "$79-$229/mo" or "Custom". */
  priceLabel: string;
  automation: AutomationLevel;
  bestFor: string;
  features: string[];
  limitation?: string;
  verdict: string;
  /** From the source cost-benefit table. Absent where the source gives none. */
  hoursSavedPerWeek?: number;
  netValuePerMonth?: number;
  /** Monthly cost the source's ROI row used, where it differs from priceFrom. */
  roiCostBasis?: number;
}
