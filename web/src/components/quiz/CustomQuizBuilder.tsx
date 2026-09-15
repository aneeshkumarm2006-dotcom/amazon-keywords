"use client";

import { Play, Shuffle, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { LEVEL_META, LEVEL_ORDER, QUIZ_TOPICS, filterQuestions } from "@/content/quizzes";
import { useCustomConfig } from "@/lib/quiz-hooks";
import { saveCustomConfig } from "@/lib/quiz-progress";
import { MODE_META, QUIZ_MODES, type QuizMode } from "@/lib/quiz-session";
import { cn } from "@/lib/utils";
import type { Level } from "@/types/content";

const COUNT_CHOICES = [5, 10, 15, 20, 25, 30, 40, 50];

export function CustomQuizBuilder({ className }: { className?: string }) {
  const router = useRouter();
  const [config, setConfig] = useCustomConfig();
  const [error, setError] = useState<string | null>(null);

  const levels = config.levels;
  const topics = config.topics;

  const matching = useMemo(() => filterQuestions(levels, topics), [levels, topics]);

  /** Topics that still have questions under the chosen levels. */
  const availableTopics = useMemo(() => {
    const levelSet = new Set(levels);
    const counts = new Map<string, number>();
    for (const question of filterQuestions(levels, [])) {
      if (levelSet.size > 0 && !levelSet.has(question.level)) continue;
      counts.set(question.topic, (counts.get(question.topic) ?? 0) + 1);
    }
    return QUIZ_TOPICS.map((topic) => ({ topic, count: counts.get(topic) ?? 0 }));
  }, [levels]);

  const toggleLevel = useCallback(
    (level: Level) => {
      setError(null);
      setConfig((previous) => {
        const next = previous.levels.includes(level)
          ? previous.levels.filter((value) => value !== level)
          : [...previous.levels, level];
        return { ...previous, levels: next, questionIds: undefined, label: undefined };
      });
    },
    [setConfig],
  );

  const toggleTopic = useCallback(
    (topic: string) => {
      setError(null);
      setConfig((previous) => {
        const next = previous.topics.includes(topic)
          ? previous.topics.filter((value) => value !== topic)
          : [...previous.topics, topic];
        return { ...previous, topics: next, questionIds: undefined, label: undefined };
      });
    },
    [setConfig],
  );

  const countOptions = useMemo(() => {
    const max = matching.length;
    const steps = COUNT_CHOICES.filter((step) => step < max);
    return [
      ...steps.map((step) => ({ value: String(step), label: `${step} questions` })),
      { value: String(Math.max(1, max)), label: `All ${max} matching` },
    ];
  }, [matching.length]);

  const effectiveCount = Math.min(config.count, Math.max(1, matching.length));

  const build = useCallback(() => {
    if (matching.length === 0) {
      setError("Nothing matches that combination. Add a level or clear a topic filter.");
      return;
    }
    const next = {
      ...config,
      count: effectiveCount,
      questionIds: undefined,
      label: undefined,
    };
    setConfig(next);
    saveCustomConfig(next);
    router.push("/quizzes/custom");
  }, [config, effectiveCount, matching.length, router, setConfig]);

  return (
    <Card as="panel" id="custom" className={cn("scroll-mt-24 overflow-hidden", className)}>
      <div className="flex items-start gap-3 border-b border-hairline p-5 sm:p-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ember-soft">
          <SlidersHorizontal className="size-4.5 text-ember" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink">Build a custom quiz</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Choose the levels and topics you want to be tested on, set the length, and pick a mode.
            The build is saved, so you can rerun the same drill tomorrow.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <fieldset>
          <legend className="mb-2.5 text-[0.8125rem] font-medium text-ink">
            Levels{" "}
            <span className="font-normal text-faint">
              ({levels.length === 0 ? "all levels" : `${levels.length} selected`})
            </span>
          </legend>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {LEVEL_ORDER.map((level) => {
              const meta = LEVEL_META[level];
              return (
                <Checkbox
                  key={level}
                  id={`custom-level-${level}`}
                  label={`${meta.ordinal} — ${meta.label}`}
                  hint={`${filterQuestions([level], []).length} questions`}
                  checked={levels.includes(level)}
                  onChange={() => toggleLevel(level)}
                />
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-[0.8125rem] font-medium text-ink">
            Topics{" "}
            <span className="font-normal text-faint">
              ({topics.length === 0 ? "every topic" : `${topics.length} selected`})
            </span>
          </legend>
          <ul className="flex flex-wrap gap-2">
            {availableTopics.map(({ topic, count }) => {
              const selected = topics.includes(topic);
              const disabled = count === 0;
              return (
                <li key={topic}>
                  <button
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    aria-pressed={selected}
                    disabled={disabled}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                      selected
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                    )}
                  >
                    {topic}
                    <span className="tabular text-[0.6875rem] text-faint">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="custom-count"
            label="Length"
            options={countOptions}
            value={String(effectiveCount)}
            onChange={(event) =>
              setConfig((previous) => ({ ...previous, count: Number(event.target.value) }))
            }
            hint={`${matching.length} question${matching.length === 1 ? "" : "s"} match right now`}
          />

          {config.mode === "exam" ? (
            <Select
              id="custom-timer"
              label="Time limit"
              options={[
                { value: "0", label: "No timer" },
                ...[5, 10, 15, 20, 30, 45, 60].map((value) => ({
                  value: String(value),
                  label: `${value} min`,
                })),
              ]}
              value={String(config.timerMinutes ?? 0)}
              onChange={(event) => {
                const value = Number(event.target.value);
                setConfig((previous) => ({
                  ...previous,
                  timerMinutes: value > 0 ? value : null,
                }));
              }}
              hint="Exam mode auto-submits when the clock runs out."
            />
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-[0.8125rem] font-medium text-ink">Mode</p>
          <SegmentedControl
            label="Custom quiz mode"
            options={QUIZ_MODES.map((value) => ({ value, label: MODE_META[value].label }))}
            value={config.mode}
            onChange={(mode: QuizMode) => setConfig((previous) => ({ ...previous, mode }))}
            fullWidth
          />
          <p className="mt-2 text-sm text-muted">{MODE_META[config.mode].blurb}</p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
          <Button icon={Play} onClick={build} disabled={matching.length === 0}>
            Build and start
          </Button>
          <Badge tone="neutral" icon={Shuffle}>
            {effectiveCount} of {matching.length} matching
          </Badge>
        </div>
      </div>
    </Card>
  );
}
