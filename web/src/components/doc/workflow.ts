import type { Tone } from "@/types/content";

/**
 * Structured process data for `/workflows`.
 *
 * The source repository draws these flows as ASCII boxes, which are unusable
 * on a phone and invisible to a screen reader. The same information is
 * modelled here so `<WorkflowDiagram />` can render it as real, responsive,
 * semantic markup — the raw markdown that follows keeps the decision tables.
 */

export interface WorkflowBranch {
  /** The test, e.g. "2+ orders and ACoS below target". */
  condition: string;
  /** What happens when it is true, e.g. "Harvest to manual exact". */
  result: string;
  detail?: string;
  tone?: Tone;
}

export interface WorkflowColumn {
  label: string;
  detail?: string;
  /** Short mono chip, e.g. "$10-15/day". */
  meta?: string;
}

export interface WorkflowNode {
  /**
   * `step` — one action. `parallel` — actions that happen side by side.
   * `decision` — a branch point. `outcome` — a terminal result.
   */
  kind: "step" | "parallel" | "decision" | "outcome";
  label: string;
  detail?: string;
  meta?: string;
  items?: string[];
  columns?: WorkflowColumn[];
  branches?: WorkflowBranch[];
  tone?: Tone;
}

export interface WorkflowStage {
  id: string;
  title: string;
  summary?: string;
  /** Rail label. Defaults to the stage number. */
  marker?: string;
  nodes: WorkflowNode[];
  /** Renders a loop-back note, e.g. "Repeat weekly". */
  repeats?: string;
}
