"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Eye,
  CircleDot,
  Plus,
  RotateCcw,
  Save,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Markdown } from "@/components/doc/Markdown";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StepProgress } from "@/components/ui/Progress";
import { Textarea } from "@/components/ui/Textarea";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { useIsHydrated, useLocalStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { clearDraft, draftKey, relativeTime, saveDraft, type StoredDraft } from "./drafts";
import {
  asList,
  asMetrics,
  asText,
  completedSteps,
  emptyMetricRow,
  hasContent,
  initialValues,
  isComplete,
  validateStep,
  type ContributionVariant,
  type Field,
  type FieldValue,
  type FormValues,
  type MetricRow,
} from "./form-spec";
import { issueUrl, issueUrlTooLong, MAX_ISSUE_URL_LENGTH } from "./github";

/**
 * The guided contribution form.
 *
 * One component drives all four submission types: it walks the step/field
 * structure in `form-spec.ts`, validates a step before letting the
 * contributor past it, keeps a local draft so a reload costs nothing, and
 * finishes on a live markdown preview of exactly what will be filed —
 * with a prefilled GitHub issue link and a copy button beside it.
 *
 * No network, no analytics, no hidden collection: the only thing that ever
 * leaves the browser is the issue the contributor chooses to open.
 */

const AUTOSAVE_DELAY = 1200;

export interface ContributionFormProps {
  variant: ContributionVariant;
  /**
   * Pre-filled values, e.g. the route a feedback report was started from.
   * A subset of the variant's fields is fine — it is merged over the
   * variant's own initial values.
   */
  seed?: FormValues;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Field helpers
 * ------------------------------------------------------------------ */

function domId(variantId: string, fieldId: string): string {
  return `${variantId}-${fieldId}`;
}

/** The control a validation error should send focus to. */
function firstFocusId(variantId: string, field: Field): string {
  const base = domId(variantId, field.id);
  switch (field.kind) {
    case "list":
      return `${base}-item-0`;
    case "metrics":
      return `${base}-row-0-label`;
    case "choices":
      return `${base}-choice-0`;
    default:
      return base;
  }
}

function focusById(id: string): void {
  if (typeof document === "undefined") return;
  const element = document.getElementById(id);
  if (element instanceof HTMLElement) {
    element.focus();
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

/* ------------------------------------------------------------------ *
 * List editor
 * ------------------------------------------------------------------ */

function ListEditor({
  field,
  baseId,
  items,
  error,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>;
  baseId: string;
  items: string[];
  error?: string;
  onChange: (next: string[]) => void;
}) {
  const setAt = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const remove = (index: number) => {
    const next = items.filter((_, position) => position !== index);
    onChange(next.length > 0 ? next : [""]);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    window.requestAnimationFrame(() => focusById(`${baseId}-item-${target}`));
  };

  const add = () => {
    if (items.length >= field.maxItems) return;
    onChange([...items, ""]);
    window.requestAnimationFrame(() => focusById(`${baseId}-item-${items.length}`));
  };

  return (
    <fieldset className="min-w-0">
      <legend className="text-[0.8125rem] font-medium text-ink">
        {field.label}
        {field.required ? (
          <span className="ml-1 text-bad" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {field.hint ? <p className="mt-1 text-xs text-faint">{field.hint}</p> : null}

      <ul className="mt-2.5 flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={`${baseId}-${index}`} className="flex items-start gap-2">
            {field.ordered ? (
              <span
                className="mt-2.5 w-6 shrink-0 text-right font-mono text-xs text-faint tabular-nums"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            ) : (
              <span
                className="mt-[1.1rem] size-1.5 shrink-0 rounded-full bg-hairline-strong"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <Input
                id={`${baseId}-item-${index}`}
                label={`${field.label}, ${field.itemLabel} ${index + 1}`}
                hideLabel
                value={item}
                placeholder={index === 0 ? field.itemPlaceholder : undefined}
                onChange={(event) => setAt(index, event.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {field.ordered ? (
                <>
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${field.itemLabel} ${index + 1} up`}
                    className="inline-flex size-11 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30 sm:size-9"
                  >
                    <ChevronUp className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${field.itemLabel} ${index + 1} down`}
                    className="inline-flex size-11 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30 sm:size-9"
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={items.length === 1 && item.trim() === ""}
                aria-label={`Remove ${field.itemLabel} ${index + 1}`}
                className="inline-flex size-11 items-center justify-center rounded-lg text-faint transition-colors hover:bg-bad-soft hover:text-bad focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-30 sm:size-9"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={add}
          disabled={items.length >= field.maxItems}
        >
          Add {field.itemLabel}
        </Button>
        <span className="text-xs text-faint">
          {items.filter((entry) => entry.trim()).length} of {field.maxItems} max
          {field.minItems > 0 ? `, ${field.minItems} minimum` : ""}
        </span>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-bad">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ *
 * Metrics editor
 * ------------------------------------------------------------------ */

function MetricsEditor({
  field,
  baseId,
  rows,
  error,
  onChange,
}: {
  field: Extract<Field, { kind: "metrics" }>;
  baseId: string;
  rows: MetricRow[];
  error?: string;
  onChange: (next: MetricRow[]) => void;
}) {
  const setCell = (index: number, key: keyof MetricRow, value: string) => {
    const next = rows.map((row, position) =>
      position === index ? { ...row, [key]: value } : row,
    );
    onChange(next);
  };

  const remove = (index: number) => {
    const next = rows.filter((_, position) => position !== index);
    onChange(next.length > 0 ? next : [emptyMetricRow()]);
  };

  const add = () => {
    if (rows.length >= field.maxRows) return;
    onChange([...rows, emptyMetricRow()]);
    window.requestAnimationFrame(() => focusById(`${baseId}-row-${rows.length}-label`));
  };

  return (
    <fieldset className="min-w-0">
      <legend className="text-[0.8125rem] font-medium text-ink">
        {field.label}
        {field.required ? (
          <span className="ml-1 text-bad" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {field.hint ? <p className="mt-1 text-xs text-faint">{field.hint}</p> : null}

      <ul className="mt-2.5 flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={`${baseId}-row-${index}`}
            className="rounded-xl border border-hairline bg-surface-2 p-3"
          >
            <div className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
                <Input
                  id={`${baseId}-row-${index}-label`}
                  label={`Metric ${index + 1}`}
                  hideLabel
                  value={row.label}
                  placeholder="ACoS"
                  onChange={(event) => setCell(index, "label", event.target.value)}
                />
                <Input
                  id={`${baseId}-row-${index}-before`}
                  label={`Metric ${index + 1} before`}
                  hideLabel
                  value={row.before}
                  placeholder="Before"
                  inputMode="decimal"
                  onChange={(event) => setCell(index, "before", event.target.value)}
                />
                <Input
                  id={`${baseId}-row-${index}-after`}
                  label={`Metric ${index + 1} after`}
                  hideLabel
                  value={row.after}
                  placeholder="After"
                  inputMode="decimal"
                  onChange={(event) => setCell(index, "after", event.target.value)}
                />
                <Input
                  id={`${baseId}-row-${index}-unit`}
                  label={`Metric ${index + 1} unit`}
                  hideLabel
                  value={row.unit}
                  placeholder="%, x, USD"
                  onChange={(event) => setCell(index, "unit", event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove metric row ${index + 1}`}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-bad-soft hover:text-bad focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:size-9"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={add}
          disabled={rows.length >= field.maxRows}
        >
          Add metric
        </Button>
        <span className="text-xs text-faint">
          Columns are metric, before, after and unit. {field.minRows} complete rows minimum.
        </span>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-bad">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ *
 * Choices editor
 * ------------------------------------------------------------------ */

function ChoicesEditor({
  field,
  baseId,
  choices,
  answerIndex,
  error,
  onChoices,
  onAnswer,
}: {
  field: Extract<Field, { kind: "choices" }>;
  baseId: string;
  choices: string[];
  answerIndex: string;
  error?: string;
  onChoices: (next: string[]) => void;
  onAnswer: (next: string) => void;
}) {
  const padded = [0, 1, 2, 3].map((index) => choices[index] ?? "");

  return (
    <fieldset className="min-w-0">
      <legend className="text-[0.8125rem] font-medium text-ink">
        {field.label}
        <span className="ml-1 text-bad" aria-hidden="true">
          *
        </span>
      </legend>
      {field.hint ? <p className="mt-1 text-xs text-faint">{field.hint}</p> : null}

      <ul className="mt-2.5 flex flex-col gap-2">
        {padded.map((choice, index) => {
          const letter = String.fromCharCode(65 + index);
          const selected = answerIndex === String(index);
          return (
            <li key={`${baseId}-choice-${index}`}>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2 transition-colors",
                  selected
                    ? "border-good/40 bg-good-soft"
                    : "border-hairline bg-surface-2",
                )}
              >
                <label
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
                  htmlFor={`${baseId}-answer-${index}`}
                >
                  <input
                    type="radio"
                    id={`${baseId}-answer-${index}`}
                    name={`${baseId}-answer`}
                    value={String(index)}
                    checked={selected}
                    onChange={() => onAnswer(String(index))}
                    className="size-4 accent-[var(--good)] outline-none"
                  />
                  <span className="sr-only">Mark choice {letter} as the correct answer</span>
                </label>
                <span
                  className={cn(
                    "w-4 shrink-0 font-mono text-xs font-semibold",
                    selected ? "text-good" : "text-faint",
                  )}
                  aria-hidden="true"
                >
                  {letter}
                </span>
                <div className="min-w-0 flex-1">
                  <Input
                    id={`${baseId}-choice-${index}`}
                    label={`Choice ${letter}`}
                    hideLabel
                    value={choice}
                    placeholder={index === 0 ? "Negate the keyword as exact" : `Choice ${letter}`}
                    onChange={(event) => {
                      const next = [...padded];
                      next[index] = event.target.value;
                      onChoices(next);
                    }}
                  />
                </div>
                {selected ? (
                  <span className="hidden shrink-0 items-center gap-1 pr-1 text-xs font-medium text-good sm:inline-flex">
                    <CircleCheck className="size-3.5" aria-hidden="true" />
                    Correct
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-bad">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ *
 * Form
 * ------------------------------------------------------------------ */

export function ContributionForm({ variant, seed, className }: ContributionFormProps) {
  const hydrated = useIsHydrated();
  const reviewIndex = variant.steps.length;

  const [values, setValues] = useState<FormValues>(() => ({
    ...initialValues(variant),
    ...seed,
  }));
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  /** True once the reader has restored, discarded, or started typing. */
  const [draftHandled, setDraftHandled] = useState(false);

  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  /**
   * The stored draft is read through `useLocalStorage`, not copied into state
   * by an effect: it returns null on the server and during hydration, then
   * the real record, and it re-renders when autosave writes — which is where
   * the "saved 2 min ago" readout comes from for free.
   */
  const [storedDraft] = useLocalStorage<StoredDraft | null>(draftKey(variant.id), null);

  const savedDraft = useMemo(() => {
    if (!storedDraft || storedDraft.variant !== variant.id) return null;
    if (!storedDraft.values || typeof storedDraft.values !== "object") return null;
    return storedDraft;
  }, [storedDraft, variant.id]);

  const savedAt = savedDraft?.savedAt ?? null;
  const pendingDraft =
    !draftHandled && savedDraft && hasContent(variant, savedDraft.values) ? savedDraft : null;

  /* ------------------------------------------------------------ autosave */
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (!hasContent(variant, values)) return;
      saveDraft(variant.id, values, step);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [values, step, variant]);

  /* ------------------------------------------------------------- setters */
  const setValue = useCallback((fieldId: string, value: FieldValue) => {
    dirtyRef.current = true;
    // Typing is an answer to the restore prompt: this is the draft now.
    setDraftHandled(true);
    setValues((previous) => ({ ...previous, [fieldId]: value }));
  }, []);

  const errors = useMemo(
    () => (step < reviewIndex ? validateStep(variant, step, values) : {}),
    [variant, step, values, reviewIndex],
  );
  const showErrors = Boolean(attempted[step]);
  const errorEntries = Object.entries(errors);

  const done = useMemo(() => completedSteps(variant, values), [variant, values]);
  const complete = useMemo(() => isComplete(variant, values), [variant, values]);
  const dirty = useMemo(() => hasContent(variant, values), [variant, values]);

  const draft = useMemo(() => variant.toIssue(values), [variant, values]);
  const href = useMemo(() => issueUrl(draft), [draft]);
  const tooLong = issueUrlTooLong(href);
  const markdown = `# ${draft.title}\n\n${draft.body}\n`;

  /* ---------------------------------------------------------- navigation */
  const goTo = useCallback((next: number) => {
    setStep(next);
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }, []);

  const goNext = useCallback(() => {
    if (step >= reviewIndex) return;
    const stepErrors = validateStep(variant, step, values);
    setAttempted((previous) => ({ ...previous, [step]: true }));
    if (Object.keys(stepErrors).length > 0) {
      const firstId = Object.keys(stepErrors)[0];
      const field = variant.fields.find((entry) => entry.id === firstId);
      if (field) focusById(firstFocusId(variant.id, field));
      return;
    }
    goTo(step + 1);
  }, [step, reviewIndex, variant, values, goTo]);

  const goBack = useCallback(() => {
    if (step > 0) goTo(step - 1);
  }, [step, goTo]);

  /* -------------------------------------------------------- draft actions */
  const saveNow = useCallback(() => {
    saveDraft(variant.id, values, step);
    setDraftHandled(true);
    dirtyRef.current = false;
  }, [variant.id, values, step]);

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setValues({ ...initialValues(variant), ...pendingDraft.values });
    setStep(Math.min(Math.max(0, pendingDraft.step), variant.steps.length));
    setDraftHandled(true);
    dirtyRef.current = false;
  }, [pendingDraft, variant]);

  const discardDraft = useCallback(() => {
    clearDraft(variant.id);
    setDraftHandled(true);
  }, [variant.id]);

  const startOver = useCallback(() => {
    clearDraft(variant.id);
    setValues({ ...initialValues(variant), ...seed });
    setStep(0);
    setAttempted({});
    setDraftHandled(true);
    dirtyRef.current = false;
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }, [variant, seed]);

  /* ------------------------------------------------------------ rendering */
  const renderField = (field: Field) => {
    const base = domId(variant.id, field.id);
    const error = showErrors ? errors[field.id] : undefined;

    switch (field.kind) {
      case "text":
        return (
          <Input
            key={field.id}
            id={base}
            label={field.label}
            hint={field.hint}
            error={error}
            required={field.required}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            value={asText(values[field.id])}
            onChange={(event) => setValue(field.id, event.target.value)}
            fieldClassName={field.half ? "min-w-0" : "min-w-0 sm:col-span-2"}
          />
        );
      case "textarea":
        return (
          <Textarea
            key={field.id}
            id={base}
            label={field.label}
            hint={field.hint}
            error={error}
            required={field.required}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={field.rows}
            showCount={Boolean(field.maxLength)}
            value={asText(values[field.id])}
            onChange={(event) => setValue(field.id, event.target.value)}
            fieldClassName={field.half ? "min-w-0" : "min-w-0 sm:col-span-2"}
          />
        );
      case "select":
        return (
          <Select
            key={field.id}
            id={base}
            label={field.label}
            hint={field.hint}
            error={error}
            required={field.required}
            placeholder={`Choose a ${field.label.toLowerCase()}…`}
            options={field.options}
            value={asText(values[field.id])}
            onChange={(event) => setValue(field.id, event.target.value)}
            fieldClassName={field.half ? "min-w-0" : "min-w-0 sm:col-span-2"}
          />
        );
      case "list":
        return (
          <div key={field.id} className="min-w-0 sm:col-span-2">
            <ListEditor
              field={field}
              baseId={base}
              items={asList(values[field.id])}
              error={error}
              onChange={(next) => setValue(field.id, next)}
            />
          </div>
        );
      case "metrics":
        return (
          <div key={field.id} className="min-w-0 sm:col-span-2">
            <MetricsEditor
              field={field}
              baseId={base}
              rows={asMetrics(values[field.id])}
              error={error}
              onChange={(next) => setValue(field.id, next)}
            />
          </div>
        );
      case "choices":
        return (
          <div key={field.id} className="min-w-0 sm:col-span-2">
            <ChoicesEditor
              field={field}
              baseId={base}
              choices={asList(values[field.id])}
              answerIndex={asText(values[field.answerKey])}
              error={error}
              onChoices={(next) => setValue(field.id, next)}
              onAnswer={(next) => setValue(field.answerKey, next)}
            />
          </div>
        );
    }
  };

  const activeStep = variant.steps[step];
  const onReview = step === reviewIndex;
  const VariantIcon = variant.icon;

  return (
    <div className={cn("min-w-0", className)}>
      {/* ------------------------------------------------------ draft banner */}
      {hydrated && pendingDraft ? (
        <Callout variant="info" title="You have an unfinished draft" className="mb-5">
          <p>
            Saved {relativeTime(pendingDraft.savedAt)} on this device, at step{" "}
            {Math.min(pendingDraft.step + 1, variant.steps.length)} of {variant.steps.length}.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" icon={RotateCcw} onClick={restoreDraft}>
              Restore it
            </Button>
            <Button size="sm" variant="secondary" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </Callout>
      ) : null}

      {/* ----------------------------------------------------------- header */}
      <div className="rounded-2xl border border-hairline bg-surface">
        <div className="flex flex-col gap-4 border-b border-hairline p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-3.5">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                TONE_SOFT_BG[variant.tone],
              )}
              aria-hidden="true"
            >
              <VariantIcon className={cn("size-5", TONE_ICON[variant.tone])} />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg leading-snug font-bold text-ink">
                Submit a {variant.label.toLowerCase()}
              </h3>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">{variant.intro}</p>
            </div>
          </div>
          <div className="shrink-0 sm:w-40">
            <StepProgress
              current={Math.min(step + 1, reviewIndex + 1)}
              total={reviewIndex + 1}
              label="Step"
              tone={variant.tone}
            />
            <p className="mt-1.5 text-xs text-faint">
              {done} of {variant.steps.length} sections complete
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------- step rail */}
        <nav aria-label="Form steps" className="scroll-well overflow-x-auto border-b border-hairline">
          <ol className="flex min-w-max items-center gap-1 p-2.5 sm:gap-1.5">
            {[...variant.steps, { id: "review", title: "Review & file" }].map((entry, index) => {
              const current = index === step;
              const passed =
                index < reviewIndex
                  ? Object.keys(validateStep(variant, index, values)).length === 0
                  : complete;
              const reachable = index <= step || passed || index === done;

              return (
                <li key={entry.id} className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => (reachable ? goTo(index) : goNext())}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      current
                        ? "bg-surface-2 text-ink"
                        : reachable
                          ? "text-muted hover:bg-surface-2 hover:text-ink"
                          : "text-faint",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[0.625rem] tabular-nums",
                        passed
                          ? "bg-good text-on-good"
                          : current
                            ? "bg-brand text-on-brand"
                            : "bg-surface-2 text-faint ring-1 ring-hairline ring-inset",
                      )}
                      aria-hidden="true"
                    >
                      {passed ? <CircleCheck className="size-3" /> : index + 1}
                    </span>
                    {entry.title}
                  </button>
                  {index < reviewIndex ? (
                    <span className="text-faint" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ------------------------------------------------------------ body */}
        <div className="p-5 sm:p-6">
          {onReview ? (
            <section aria-labelledby={`${variant.id}-review-heading`}>
              <h4
                id={`${variant.id}-review-heading`}
                ref={stepHeadingRef}
                tabIndex={-1}
                className="font-display text-[1.0625rem] font-semibold text-ink outline-none"
              >
                Review &amp; file
              </h4>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
                This is the exact markdown that goes into the issue. Read it once — you are the
                last reviewer before a maintainer sees it.
              </p>

              {!complete ? (
                <Callout variant="warn" title="Some sections are still incomplete" className="mt-4">
                  <p>
                    You can still file it, but a maintainer will have to come back and ask. The
                    step rail above marks every section that validates.
                  </p>
                </Callout>
              ) : null}

              <div className="mt-5 overflow-hidden rounded-xl border border-hairline">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-surface-2 px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-muted">
                    <Eye className="size-3.5" aria-hidden="true" />
                    Live preview
                  </span>
                  <span className="font-mono text-[0.6875rem] text-faint">
                    {markdown.length.toLocaleString("en-US")} characters
                  </span>
                </div>

                <div className="border-b border-hairline bg-surface px-4 py-3">
                  <p className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
                    Issue title
                  </p>
                  <p className="mt-1 font-mono text-[0.8125rem] break-words text-ink">
                    {draft.title}
                  </p>
                  {draft.labels && draft.labels.length > 0 ? (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {draft.labels.map((label) => (
                        <li key={label}>
                          <Badge tone="neutral" variant="outline" size="sm">
                            {label}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="bg-surface px-4 py-4 sm:px-5">
                  <Markdown>{draft.body}</Markdown>
                </div>
              </div>

              {tooLong ? (
                <Callout variant="warn" title="Too long for a prefilled link" className="mt-4">
                  <p>
                    This submission is {href.length.toLocaleString("en-US")} characters once
                    encoded, past the ~{MAX_ISSUE_URL_LENGTH.toLocaleString("en-US")} a prefilled
                    GitHub URL survives. Use <strong>Copy markdown</strong>, open a blank issue,
                    and paste — nothing is lost that way.
                  </p>
                </Callout>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2.5">
                {tooLong ? (
                  <ButtonLink
                    href={issueUrl({ title: draft.title, body: "", labels: draft.labels })}
                    icon={CircleDot}
                    external
                  >
                    Open a blank issue
                  </ButtonLink>
                ) : (
                  <ButtonLink href={href} icon={CircleDot} external>
                    Open a GitHub issue
                  </ButtonLink>
                )}
                <CopyButton value={markdown} label="Copy markdown" size="md" />
                <Button variant="secondary" icon={Save} onClick={saveNow}>
                  Save draft
                </Button>
                <Button variant="ghost" icon={RotateCcw} onClick={startOver}>
                  Start over
                </Button>
              </div>

              <p className="mt-3.5 text-xs leading-relaxed text-faint">
                Opening the issue takes you to GitHub with the fields already filled in. You sign
                in as yourself and press submit — nothing is posted on your behalf, and nothing
                you typed here has left this browser.
              </p>
            </section>
          ) : activeStep ? (
            <section aria-labelledby={`${variant.id}-${activeStep.id}-heading`}>
              <h4
                id={`${variant.id}-${activeStep.id}-heading`}
                ref={stepHeadingRef}
                tabIndex={-1}
                className="font-display text-[1.0625rem] font-semibold text-ink outline-none"
              >
                {activeStep.title}
              </h4>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
                {activeStep.blurb}
              </p>

              {showErrors && errorEntries.length > 0 ? (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-bad/30 bg-bad-soft p-4 text-sm"
                >
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <TriangleAlert className="size-4 shrink-0 text-bad" aria-hidden="true" />
                    {errorEntries.length === 1
                      ? "One thing to fix before the next step"
                      : `${errorEntries.length} things to fix before the next step`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {errorEntries.map(([fieldId, message]) => {
                      const field = variant.fields.find((entry) => entry.id === fieldId);
                      return (
                        <li key={fieldId}>
                          <button
                            type="button"
                            onClick={() =>
                              field ? focusById(firstFocusId(variant.id, field)) : undefined
                            }
                            className="text-left text-[0.8125rem] text-bad underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            {message}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {activeStep.fields.map((fieldId) => {
                  const field = variant.fields.find((entry) => entry.id === fieldId);
                  return field ? renderField(field) : null;
                })}
              </div>
            </section>
          ) : null}
        </div>

        {/* ---------------------------------------------------------- footer */}
        <div className="flex flex-col gap-3 border-t border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-xs text-faint">
            {hydrated && savedAt ? (
              <>
                <Save className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Draft saved {relativeTime(savedAt)} — on this device only</span>
              </>
            ) : dirty ? (
              <span>Your answers stay in this browser until you file the issue.</span>
            ) : (
              <span>Nothing typed yet. Nothing stored yet.</span>
            )}
          </div>

          {!onReview ? (
            <div className="flex flex-wrap gap-2">
              {step > 0 ? (
                <Button variant="secondary" icon={ArrowLeft} onClick={goBack}>
                  Back
                </Button>
              ) : null}
              <Button
                variant="secondary"
                icon={Save}
                onClick={saveNow}
                disabled={!dirty}
                className="hidden sm:inline-flex"
              >
                Save draft
              </Button>
              <Button iconAfter={ArrowRight} onClick={goNext}>
                {step === reviewIndex - 1 ? "Preview submission" : "Next"}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" icon={ArrowLeft} onClick={goBack}>
              Back to {variant.steps[reviewIndex - 1]?.title.toLowerCase() ?? "the form"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
