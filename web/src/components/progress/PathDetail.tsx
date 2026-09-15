"use client";

import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Flag,
  ListChecks,
  RotateCcw,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TONE_ICON, TONE_SOFT_BG, TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import type { LearningPathDoc } from "@/content/paths";
import { KIND_META } from "@/content/registry";
import { completeModule, togglePathStep, type PathModuleState } from "@/lib/progress";
import { cn, formatMinutes } from "@/lib/utils";

import { LevelRing } from "./LevelRing";
import { PathCertificate } from "./PathCertificate";
import { usePathProgress } from "./useProgress";

export interface PathDetailProps {
  path: LearningPathDoc;
}

/**
 * One learning path: the case for doing it, then the checklist.
 *
 * Every tick writes to the shared completion map, so marking an SOP done here
 * marks it done on the SOP page and on any other path that uses it. Modules
 * open and close locally; the first unfinished module opens by default once
 * storage has been read, which is the module you actually want.
 */
export function PathDetail({ path }: PathDetailProps) {
  const progress = usePathProgress(path);
  const baseId = useId();

  const firstUnfinished = useMemo(
    () => progress.modules.find((entry) => !entry.complete)?.module.id ?? path.modules[0].id,
    [path.modules, progress.modules],
  );

  // Null means "follow my progress": the open module is whichever one is
  // unfinished, which after hydration is where the learner actually stopped.
  // The first manual open or close pins the set and this stops tracking.
  const [pinned, setPinned] = useState<string[] | null>(null);
  const open = pinned ?? [firstUnfinished];

  const toggleModule = useCallback(
    (id: string) => {
      setPinned((current) => {
        const base = current ?? [firstUnfinished];
        return base.includes(id) ? base.filter((entry) => entry !== id) : [...base, id];
      });
    },
    [firstUnfinished],
  );

  const expandAll = useCallback(() => {
    setPinned(path.modules.map((entry) => entry.id));
  }, [path.modules]);

  const collapseAll = useCallback(() => {
    setPinned([]);
  }, []);

  const next = progress.nextStep;

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------ status */}
      <section
        aria-labelledby="path-status-heading"
        className="overflow-hidden rounded-2xl border border-hairline bg-surface print:hidden"
      >
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <LevelRing
              percent={progress.percent}
              label={`${progress.percent}%`}
              tone={progress.complete ? "good" : path.tone}
              size={84}
              srLabel={`${progress.percent} percent complete: ${progress.done} of ${progress.total} steps.`}
            />
            <div className="min-w-0">
              <h2
                id="path-status-heading"
                className="font-display text-lg leading-snug font-semibold text-ink"
              >
                {progress.complete
                  ? "Path complete"
                  : progress.started
                    ? "In progress"
                    : "Not started yet"}
              </h2>
              <p className="tabular mt-1 text-[0.875rem] text-muted">
                {progress.done} of {progress.total} steps ·{" "}
                {progress.complete
                  ? `${formatMinutes(path.minutes)} of study behind you`
                  : `${formatMinutes(progress.minutesLeft)} left`}
              </p>
              <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    TONE_SOLID_BG[progress.complete ? "good" : path.tone],
                  )}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            {next ? (
              <ButtonLink href={next.step.href} iconAfter={ArrowRight} size="lg">
                {progress.started ? "Continue" : "Start"}: step {next.step.position}
              </ButtonLink>
            ) : (
              <ButtonLink href="/paths" variant="secondary" iconAfter={ArrowRight} size="lg">
                Pick your next path
              </ButtonLink>
            )}
          </div>
        </div>

        {next ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-hairline bg-canvas px-5 py-3 text-[0.8125rem]">
            <Flag className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
            <span className="text-faint">Up next</span>
            <Link
              href={next.step.href}
              className="font-medium text-ink underline decoration-hairline-strong underline-offset-2 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {next.step.title}
            </Link>
            <span className="tabular text-faint">· {formatMinutes(next.step.minutes)}</span>
          </div>
        ) : null}
      </section>

      {/* ---------------------------------------------------------- the case */}
      <section
        aria-labelledby="path-about-heading"
        className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] print:hidden"
      >
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <h2
            id="path-about-heading"
            className="font-display text-[0.9375rem] font-semibold text-ink"
          >
            What you will be able to do
          </h2>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-muted">{path.intro}</p>
          <ul className="mt-4 space-y-2">
            {path.outcomes.map((outcome) => (
              <li key={outcome} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
                    TONE_SOFT_BG[path.tone],
                  )}
                  aria-hidden="true"
                >
                  <Check className={cn("size-3", TONE_ICON[path.tone])} strokeWidth={3} />
                </span>
                <span className="text-[0.875rem] leading-relaxed text-ink">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <Users className="size-4 text-faint" aria-hidden="true" />
              Who it is for
            </h3>
            <p className="text-[0.875rem] leading-relaxed text-muted">{path.audience}</p>
          </div>
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h3 className="mb-2 flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <Target className="size-4 text-faint" aria-hidden="true" />
              What you finish with
            </h3>
            <p className="text-[0.875rem] leading-relaxed text-muted">{path.proof}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ modules */}
      <section aria-labelledby="path-modules-heading" className="print:hidden">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="path-modules-heading"
              className="text-xl leading-tight font-bold text-ink sm:text-2xl"
            >
              The path
            </h2>
            <p className="mt-1 text-[0.875rem] text-muted">
              {path.modules.length} modules, {path.stepCount} steps. Tick a step here and it is
              ticked everywhere else on the site.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand all
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse all
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {progress.modules.map((entry, index) => (
            <ModulePanel
              key={entry.module.id}
              baseId={baseId}
              index={index + 1}
              state={entry}
              tone={path.tone}
              open={open.includes(entry.module.id)}
              onToggle={() => toggleModule(entry.module.id)}
            />
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- certificate */}
      {progress.complete && progress.completedAt !== null ? (
        <PathCertificate
          path={path}
          completedAt={progress.completedAt}
          stepCount={progress.total}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Module
 * ------------------------------------------------------------------ */

interface ModulePanelProps {
  baseId: string;
  index: number;
  state: PathModuleState;
  tone: PathDetailProps["path"]["tone"];
  open: boolean;
  onToggle: () => void;
}

function ModulePanel({ baseId, index, state, tone, open, onToggle }: ModulePanelProps) {
  const { module: entry } = state;
  const panelId = `${baseId}-panel-${entry.id}`;
  const triggerId = `${baseId}-trigger-${entry.id}`;

  const markAll = useCallback(() => {
    completeModule(state);
  }, [state]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface transition-colors",
        state.complete ? "border-good/40" : "border-hairline",
      )}
    >
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full min-h-14 items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5"
        >
          <span
            className={cn(
              "tabular flex size-9 shrink-0 items-center justify-center rounded-lg text-[0.8125rem] font-semibold",
              state.complete ? "bg-good text-on-good" : cn(TONE_SOFT_BG[tone], TONE_TEXT[tone]),
            )}
            aria-hidden="true"
          >
            {state.complete ? <Check className="size-4" strokeWidth={3} /> : index}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                {entry.title}
              </span>
              <span className="text-[0.6875rem] tracking-[0.06em] text-faint uppercase">
                {entry.cadence}
              </span>
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-faint">
              <span className="tabular">
                {state.done}/{state.total} steps
              </span>
              <span className="tabular inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden="true" />
                {formatMinutes(entry.minutes)}
              </span>
              <span className="h-1 w-20 overflow-hidden rounded-full bg-surface-2">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    TONE_SOLID_BG[state.complete ? "good" : tone],
                  )}
                  style={{ width: `${state.percent}%` }}
                />
              </span>
            </span>
          </span>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-faint transition-transform duration-200",
              open && "rotate-180 text-brand",
            )}
            aria-hidden="true"
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="border-t border-hairline bg-canvas"
      >
        {open ? (
          <>
            <p className="px-4 pt-4 text-[0.8125rem] leading-relaxed text-muted sm:px-5">
              {entry.subtitle}
            </p>

            <ol className="mt-3 divide-y divide-hairline border-t border-hairline">
              {state.steps.map((step) => (
                <StepRow key={step.step.id} state={step} />
              ))}
            </ol>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3 sm:px-5">
              <p className="text-[0.75rem] text-faint">
                {state.complete
                  ? "Module complete. The next one is already open."
                  : `${formatMinutes(state.minutesLeft)} left in this module.`}
              </p>
              {state.complete ? (
                <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-good">
                  <CheckCheck className="size-4" aria-hidden="true" />
                  Done
                </span>
              ) : (
                <Button variant="secondary" size="sm" icon={ListChecks} onClick={markAll}>
                  Mark the remaining {state.total - state.done} complete
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Step
 * ------------------------------------------------------------------ */

function StepRow({ state }: { state: PathModuleState["steps"][number] }) {
  const { step } = state;
  const meta = KIND_META[step.kind];
  const Icon = meta.icon;
  const inputId = `step-${step.id}`;
  const titleId = `${inputId}-title`;

  const onChange = useCallback(() => {
    togglePathStep(step);
  }, [step]);

  return (
    <li className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={state.complete}
          onChange={onChange}
          aria-labelledby={titleId}
          className={cn(
            "peer size-5 cursor-pointer appearance-none rounded-[0.3rem] border bg-surface",
            "border-hairline-strong transition-colors duration-150",
            "checked:border-good checked:bg-good",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        />
        <Check
          className="pointer-events-none absolute size-3.5 text-on-good opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="tabular text-[0.6875rem] text-faint">{step.position}.</span>
          <Link
            id={titleId}
            href={step.href}
            className={cn(
              "text-[0.9375rem] leading-snug font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              state.complete ? "text-muted" : "text-ink",
            )}
          >
            {step.title}
          </Link>
          <Badge tone={meta.accent} size="sm" variant="outline" icon={Icon}>
            {meta.label}
          </Badge>
          <span className="tabular text-[0.6875rem] text-faint">
            {formatMinutes(step.minutes)}
          </span>
        </div>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{step.why}</p>
      </div>

      {state.complete ? (
        <button
          type="button"
          onClick={onChange}
          aria-label={`Mark "${step.title}" as not complete`}
          className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:flex"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}
