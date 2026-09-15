"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Progress } from "@/components/ui/Progress";
import { useLocalStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * The pre-flight checklist.
 *
 * Every line is a restatement of a rule in `.github/CONTRIBUTING.md`, turned
 * into something you can tick off before you press submit. Ticks persist in
 * this browser so a contributor can work through a long case study across
 * two sittings without losing their place.
 */

const STORAGE_KEY = "contribute:standards";

interface CheckItem {
  id: string;
  label: string;
  hint?: string;
}

interface CheckGroup {
  id: string;
  title: string;
  blurb: string;
  items: CheckItem[];
}

const GROUPS: CheckGroup[] = [
  {
    id: "every",
    title: "Every submission",
    blurb: "What a maintainer checks before reading anything else.",
    items: [
      {
        id: "every-real",
        label: "Everything in it is true and from your own work",
        hint: "Invented numbers are worse than no numbers — they get copied into client reports.",
      },
      {
        id: "every-actionable",
        label: "A VA could act on it tomorrow without asking you a question",
        hint: "No theory without practice, straight from the guide's SOP rule.",
      },
      {
        id: "every-anonymised",
        label: "Client and brand names are removed or anonymised",
        hint: "A category and a rough size is all the context a reader needs.",
      },
      {
        id: "every-sources",
        label: "Original sources are credited",
        hint: "If a rule comes from Amazon's documentation, link the page.",
      },
      {
        id: "every-duplicate",
        label: "You checked the issue tracker for a duplicate",
        hint: "Two people writing the same cheat sheet is the most common waste on this repo.",
      },
    ],
  },
  {
    id: "case-studies",
    title: "Case studies",
    blurb: "From the guide: real metrics, a clear strategy, and the honest half.",
    items: [
      {
        id: "cs-metrics",
        label: "Before and after figures for every metric that moved",
        hint: "ACoS, ROAS, spend, revenue, CPC, CVR — whichever apply.",
      },
      {
        id: "cs-arithmetic",
        label: "The arithmetic checks out",
        hint: "Spend ÷ revenue really is the ACoS you quoted. Readers do check.",
      },
      {
        id: "cs-strategy",
        label: "The strategy is described step by step, in the order you ran it",
      },
      {
        id: "cs-failures",
        label: "You said what did not work, not only what did",
        hint: "This is the part that separates a case study from a brag.",
      },
      {
        id: "cs-timeframe",
        label: "The timeframe and ad spend are stated",
        hint: "A 40% ACoS drop in four months is a different claim to one in four days.",
      },
    ],
  },
  {
    id: "quiz",
    title: "Quiz questions",
    blurb: "Four choices, one answer, and a reason the reader can learn from.",
    items: [
      {
        id: "quiz-answer",
        label: "Exactly one choice is unambiguously correct",
      },
      {
        id: "quiz-distractors",
        label: "The three wrong choices are plausible",
        hint: "A distractor nobody would pick teaches nothing and inflates the score.",
      },
      {
        id: "quiz-explanation",
        label: "The explanation says why the answer is right, not just what it is",
      },
      {
        id: "quiz-level",
        label: "The difficulty level is set honestly",
        hint: "Beginner means a VA in their first 90 days can reason it out.",
      },
      {
        id: "quiz-reference",
        label: "Amazon documentation is referenced where the question comes from it",
      },
    ],
  },
  {
    id: "sops",
    title: "SOPs and workflows",
    blurb: "A procedure is only useful if it tells you what to do when it goes wrong.",
    items: [
      { id: "sop-steps", label: "Step-by-step instructions, numbered and in order" },
      {
        id: "sop-rules",
        label: "Decision rules included — when to do what",
        hint: "Thresholds and numbers, e.g. 'negate above 80% ACoS with 15+ clicks'.",
      },
      { id: "sop-escalation", label: "Escalation criteria: when to stop and ask the client" },
      {
        id: "sop-timing",
        label: "Frequency and time cost stated",
        hint: "Daily / weekly / monthly, and how long one pass actually takes.",
      },
    ],
  },
  {
    id: "templates",
    title: "Templates and calculators",
    blurb: "The guide is blunt about this one: test the formulas.",
    items: [
      {
        id: "tpl-formulas",
        label: "Every formula tested against a worked example",
        hint: "Enter real numbers, check the output by hand, then submit.",
      },
      { id: "tpl-instructions", label: "Instructions for use are included in the file" },
      {
        id: "tpl-dependencies",
        label: "Dependencies noted",
        hint: "Helium 10, Google Sheets only, a specific Amazon report export, and so on.",
      },
      { id: "tpl-columns", label: "Column headers are self-explanatory without a legend" },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap((group) => group.items.map((item) => item.id));
const EMPTY: string[] = [];

export function StandardsChecklist({ className }: { className?: string }) {
  const [stored, setStored, meta] = useLocalStorage<string[]>(STORAGE_KEY, EMPTY);

  const checked = useMemo(
    () => new Set(Array.isArray(stored) ? stored.filter((id) => ALL_IDS.includes(id)) : []),
    [stored],
  );

  const toggle = useCallback(
    (id: string) => {
      setStored((previous) => {
        const current = new Set(Array.isArray(previous) ? previous : []);
        if (current.has(id)) current.delete(id);
        else current.add(id);
        return Array.from(current);
      });
    },
    [setStored],
  );

  const reset = useCallback(() => setStored([]), [setStored]);

  const done = checked.size;
  const total = ALL_IDS.length;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <Progress
            value={done}
            max={total}
            label="Checklist"
            readout={`${done} of ${total}`}
            tone={done === total ? "good" : "brand"}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={reset}
          disabled={!meta.ready || done === 0}
          className="shrink-0"
        >
          Reset
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {GROUPS.map((group) => {
          const groupDone = group.items.filter((item) => checked.has(item.id)).length;
          const complete = groupDone === group.items.length;

          return (
            <section
              key={group.id}
              aria-labelledby={`standards-${group.id}`}
              className={cn(
                "min-w-0 rounded-xl border bg-surface p-5",
                complete ? "border-good/40" : "border-hairline",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3
                  id={`standards-${group.id}`}
                  className="font-display text-[1.0625rem] font-semibold text-ink"
                >
                  {group.title}
                </h3>
                <span
                  className={cn(
                    "tabular shrink-0 rounded-full px-2 py-0.5 font-mono text-xs",
                    complete ? "bg-good-soft text-good" : "bg-surface-2 text-muted",
                  )}
                >
                  {groupDone}/{group.items.length}
                </span>
              </div>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{group.blurb}</p>

              <ul className="mt-4 space-y-3.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Checkbox
                      id={`standards-${item.id}`}
                      label={item.label}
                      hint={item.hint}
                      checked={checked.has(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-faint">
        Ticks are saved in this browser only. Nothing is uploaded, and clearing your site data
        clears them.
      </p>
    </div>
  );
}
