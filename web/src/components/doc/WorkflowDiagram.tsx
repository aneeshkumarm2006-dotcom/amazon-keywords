import { CornerDownRight, GitBranch, RotateCw, Target } from "lucide-react";

import { TONE_BORDER, TONE_ICON, TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

import type { WorkflowNode, WorkflowStage } from "./workflow";

/* ------------------------------------------------------------------ *
 * Node renderers
 * ------------------------------------------------------------------ */

function NodeShell({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-3.5",
        tone === "neutral" ? "border-hairline" : TONE_BORDER[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

function NodeHead({
  label,
  meta,
  tone = "neutral",
}: {
  label: string;
  meta?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
        {label}
      </p>
      {meta ? (
        <span
          className={cn(
            "tabular shrink-0 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
            TONE_SOFT_BG[tone === "neutral" ? "brand" : tone],
            TONE_TEXT[tone === "neutral" ? "brand" : tone],
          )}
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function NodeItems({ items }: { items: string[] }) {
  return (
    <ul className="mt-2.5 space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="relative pl-4 text-[0.8125rem] leading-relaxed text-muted"
        >
          <span
            className="absolute top-[0.55em] left-0 size-1.5 rounded-full bg-brand/70"
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

function StepNode({ node }: { node: WorkflowNode }) {
  return (
    <NodeShell tone={node.tone}>
      <NodeHead label={node.label} meta={node.meta} tone={node.tone} />
      {node.detail ? (
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{node.detail}</p>
      ) : null}
      {node.items ? <NodeItems items={node.items} /> : null}
    </NodeShell>
  );
}

function ParallelNode({ node }: { node: WorkflowNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 font-mono text-[0.6875rem] font-medium tracking-[0.12em] text-faint uppercase">
        <GitBranch className="size-3.5" aria-hidden="true" />
        {node.label}
      </p>
      <div
        className={cn(
          "grid gap-2.5",
          // Three-across only divides evenly for multiples of three; every
          // other count reads better as a two-column block.
          (node.columns?.length ?? 0) % 3 === 0 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {node.columns?.map((column) => (
          <div
            key={column.label}
            className="flex flex-col gap-1 rounded-xl border border-hairline bg-surface-2 p-3"
          >
            <p className="text-[0.8125rem] leading-snug font-semibold text-ink">
              {column.label}
            </p>
            {column.detail ? (
              <p className="text-xs leading-relaxed text-muted">{column.detail}</p>
            ) : null}
            {column.meta ? (
              <p className="tabular mt-auto pt-1 text-[0.6875rem] font-semibold text-brand">
                {column.meta}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {node.detail ? (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{node.detail}</p>
      ) : null}
    </div>
  );
}

function DecisionNode({ node }: { node: WorkflowNode }) {
  return (
    <NodeShell tone="info" className="bg-info-soft/40">
      <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] font-medium tracking-[0.12em] text-info uppercase">
        <GitBranch className="size-3.5" aria-hidden="true" />
        Decision
      </p>
      <p className="mt-1.5 font-display text-[0.9375rem] leading-snug font-semibold text-ink">
        {node.label}
      </p>
      {node.detail ? (
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{node.detail}</p>
      ) : null}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {node.branches?.map((branch) => {
          const tone = branch.tone ?? "neutral";
          return (
            <li
              key={branch.condition}
              className={cn(
                "flex flex-col gap-1 rounded-lg border p-3",
                TONE_SOFT_BG[tone],
                TONE_BORDER[tone],
              )}
            >
              <p className="tabular text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">
                {branch.condition}
              </p>
              <p className="flex items-start gap-1.5 text-[0.8125rem] leading-snug font-semibold text-ink">
                <CornerDownRight
                  className={cn("mt-0.5 size-3.5 shrink-0", TONE_ICON[tone])}
                  aria-hidden="true"
                />
                {branch.result}
              </p>
              {branch.detail ? (
                <p className="pl-5 text-xs leading-relaxed text-muted">{branch.detail}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </NodeShell>
  );
}

function OutcomeNode({ node }: { node: WorkflowNode }) {
  const tone = node.tone ?? "good";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5",
        TONE_SOFT_BG[tone],
        TONE_BORDER[tone],
      )}
    >
      <Target className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[tone])} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
          {node.label}
        </p>
        {node.detail ? (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{node.detail}</p>
        ) : null}
        {node.items ? <NodeItems items={node.items} /> : null}
      </div>
    </div>
  );
}

function Node({ node }: { node: WorkflowNode }) {
  switch (node.kind) {
    case "parallel":
      return <ParallelNode node={node} />;
    case "decision":
      return <DecisionNode node={node} />;
    case "outcome":
      return <OutcomeNode node={node} />;
    default:
      return <StepNode node={node} />;
  }
}

/* ------------------------------------------------------------------ *
 * Diagram
 * ------------------------------------------------------------------ */

export interface WorkflowDiagramProps {
  stages: WorkflowStage[];
  /** Heading rendered above the rail. */
  title?: string;
  /** Anchor id for the heading, so the contents rail can link to it. */
  id?: string;
  className?: string;
}

/**
 * A numbered vertical rail with one card per stage. Replaces the ASCII box
 * diagrams in the source markdown with something that reflows to 360px, reads
 * correctly as an ordered list, and survives dark mode and printing.
 */
export function WorkflowDiagram({
  stages,
  title = "The flow, end to end",
  id = "the-flow",
  className,
}: WorkflowDiagramProps) {
  return (
    <section className={cn("min-w-0", className)} aria-labelledby={id}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id={id} className="scroll-mt-24 font-display text-lg font-bold text-ink">
          {title}
        </h2>
        <span className="tabular shrink-0 text-xs text-faint">
          {stages.length} stages
        </span>
      </div>

      <ol className="relative space-y-6">
        {stages.map((stage, index) => (
          <li key={stage.id} className="relative flex gap-3 sm:gap-5">
            {/* rail */}
            <div className="flex w-8 shrink-0 flex-col items-center sm:w-10">
              <span className="tabular z-10 flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-[0.75rem] font-semibold text-brand sm:size-10 sm:text-sm">
                {stage.marker ?? index + 1}
              </span>
              {index < stages.length - 1 ? (
                <span
                  className="mt-1 w-px flex-1 bg-hairline-strong"
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {/* stage */}
            <div className="min-w-0 flex-1 pb-2">
              <h3 className="font-display text-base leading-snug font-semibold text-ink">
                {stage.title}
              </h3>
              {stage.summary ? (
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                  {stage.summary}
                </p>
              ) : null}

              <div className="mt-3 space-y-2.5">
                {stage.nodes.map((node, nodeIndex) => (
                  <Node key={`${stage.id}-${nodeIndex}`} node={node} />
                ))}
              </div>

              {stage.repeats ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand">
                  <RotateCw className="size-3.5" aria-hidden="true" />
                  {stage.repeats}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
