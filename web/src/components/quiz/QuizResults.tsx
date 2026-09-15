"use client";

import {
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Accordion, type AccordionItemData } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatTile } from "@/components/ui/StatTile";
import { LEVEL_META, LEVEL_ORDER, PASS_MARK, findQuestion } from "@/content/quizzes";
import { useCustomConfig } from "@/lib/quiz-hooks";
import { dayKey, saveCustomConfig } from "@/lib/quiz-progress";
import {
  MODE_META,
  formatDuration,
  formatShortDuration,
  missedIds,
  shareSummary,
  type QuizAttempt,
} from "@/lib/quiz-session";
import { useIsHydrated } from "@/lib/storage";
import { cn, formatDate } from "@/lib/utils";
import type { Level, Tone } from "@/types/content";

import { ReferenceLink } from "./ReferenceLink";

const CHART_TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: "0.75rem",
  fontSize: "0.75rem",
  color: "var(--ink)",
  boxShadow: "var(--shadow-card-value)",
  padding: "0.5rem 0.7rem",
} as const;

const AXIS_TICK = { fill: "var(--muted)", fontSize: 11 } as const;

function accuracyTone(accuracy: number): Tone {
  if (accuracy >= 80) return "good";
  if (accuracy >= PASS_MARK) return "brand";
  if (accuracy >= 50) return "warn";
  return "bad";
}

function toneVar(tone: Tone): string {
  switch (tone) {
    case "good":
      return "var(--good)";
    case "brand":
      return "var(--brand)";
    case "warn":
      return "var(--warn)";
    case "bad":
      return "var(--bad)";
    case "info":
      return "var(--info)";
    case "ember":
      return "var(--ember)";
    default:
      return "var(--hairline-strong)";
  }
}

export interface QuizResultsProps {
  attempt: QuizAttempt;
  /** Where "retake" should send the learner. */
  retakeHref: string;
  /** Rendered above the score, e.g. a breadcrumb-ish label. */
  eyebrow?: string;
  className?: string;
}

export function QuizResults({ attempt, retakeHref, eyebrow, className }: QuizResultsProps) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const [, setCustomConfig] = useCustomConfig();

  const missed = useMemo(() => missedIds(attempt), [attempt]);

  const topicData = useMemo(
    () =>
      Object.entries(attempt.byTopic)
        .map(([topic, tally]) => ({
          topic,
          accuracy: Math.round((tally.correct / tally.total) * 100),
          correct: tally.correct,
          total: tally.total,
        }))
        .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total),
    [attempt.byTopic],
  );

  const levelData = useMemo(
    () =>
      LEVEL_ORDER.filter((level) => attempt.byLevel[level]).map((level) => {
        const tally = attempt.byLevel[level] as { correct: number; total: number };
        const accuracy = Math.round((tally.correct / tally.total) * 100);
        return {
          level,
          name: LEVEL_META[level].label,
          accuracy,
          correct: tally.correct,
          total: tally.total,
          fill: toneVar(accuracyTone(accuracy)),
        };
      }),
    [attempt.byLevel],
  );

  const timeData = useMemo(
    () =>
      attempt.rows.map((row, index) => ({
        index: index + 1,
        seconds: Math.round((row.ms / 1000) * 10) / 10,
        correct: row.correct,
      })),
    [attempt.rows],
  );

  const timedRows = timeData.filter((row) => row.seconds > 0);
  const averageSeconds =
    timedRows.length > 0
      ? timedRows.reduce((sum, row) => sum + row.seconds, 0) / timedRows.length
      : 0;

  const slowest = useMemo(
    () => attempt.rows.reduce((worst, row) => (row.ms > worst.ms ? row : worst), attempt.rows[0]),
    [attempt.rows],
  );

  const flaggedCount = attempt.rows.filter((row) => row.flagged).length;

  const retryMissed = useCallback(() => {
    if (missed.length === 0) return;
    const config = {
      levels: [] as Level[],
      topics: [] as string[],
      count: missed.length,
      mode: attempt.mode === "flashcard" ? ("flashcard" as const) : ("practice" as const),
      timerMinutes: null,
      questionIds: missed,
      label: `Missed from ${attempt.title}`,
    };
    setCustomConfig(config);
    // Write through as well so the runner reads it even if the state update
    // has not flushed to storage before the route change.
    saveCustomConfig(config);
    router.push("/quizzes/custom");
  }, [attempt.mode, attempt.title, missed, router, setCustomConfig]);

  const missedItems: AccordionItemData[] = missed.map((questionId, position) => {
    const question = findQuestion(questionId);
    const row = attempt.rows.find((entry) => entry.questionId === questionId);
    if (!question || !row) {
      return {
        id: questionId,
        title: "Question no longer in the bank",
        content: (
          <p className="text-sm text-muted">
            This question was removed from the question bank after the attempt was recorded.
          </p>
        ),
      };
    }

    return {
      id: questionId,
      title: (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-[0.9375rem] leading-snug font-medium text-ink">
            {question.question}
          </span>
          <span className="text-xs text-faint">
            {LEVEL_META[question.level].ordinal} · {question.topic}
            {row.flagged ? " · flagged" : ""}
          </span>
        </span>
      ),
      meta: (
        <Badge tone="bad" size="sm">
          {row.answerIndex === null ? "Skipped" : "Wrong"}
        </Badge>
      ),
      defaultOpen: position === 0,
      content: (
        <div className="flex flex-col gap-3">
          {row.answerIndex !== null ? (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                You picked
              </span>
              <span className="text-bad">{question.choices[row.answerIndex]}</span>
            </p>
          ) : null}
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              Correct
            </span>
            <span className="font-medium text-good">{question.choices[question.answerIndex]}</span>
          </p>
          <p className="text-sm leading-relaxed text-ink">{question.explanation}</p>
          <div className="flex flex-wrap items-center gap-3">
            {question.reference ? <ReferenceLink href={question.reference} /> : null}
            <span className="tabular text-xs text-faint">
              {formatShortDuration(row.ms)} on this question
            </span>
          </div>
        </div>
      ),
    };
  });

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {/* Score header ------------------------------------------------ */}
      <Card as="panel" className="overflow-hidden">
        <div
          className={cn(
            "flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between",
            attempt.passed ? "bg-good-soft" : "bg-surface-2",
          )}
        >
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1.5 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-muted uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-xl leading-tight font-bold text-ink sm:text-2xl">
              {attempt.title}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{MODE_META[attempt.mode].label} mode</span>
              <span aria-hidden="true">·</span>
              <span>{formatDate(dayKey(attempt.finishedAt))}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular">{formatDuration(attempt.durationMs)}</span>
            </p>
          </div>

          <div className="flex items-end gap-5">
            <div>
              <p className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "tabular text-5xl leading-none font-bold sm:text-6xl",
                    attempt.passed ? "text-good" : "text-ink",
                  )}
                >
                  {attempt.score}
                </span>
                <span className="text-xl font-semibold text-faint">%</span>
              </p>
              <p className="tabular mt-2 text-sm text-muted">
                {attempt.correct} of {attempt.total} correct
              </p>
            </div>
            <Badge
              tone={attempt.passed ? "good" : "bad"}
              variant="solid"
              icon={attempt.passed ? CircleCheck : CircleX}
              className="mb-1"
            >
              {attempt.passed ? "Pass" : "Below pass"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-5 py-4 sm:px-7">
          <Button icon={RotateCcw} variant="secondary" onClick={() => router.push(retakeHref)}>
            Retake
          </Button>
          <Button icon={Target} onClick={retryMissed} disabled={missed.length === 0}>
            Retry {missed.length} missed
          </Button>
          <CopyButton value={shareSummary(attempt)} label="Copy result summary" size="md" />
          <ButtonLink href="/quizzes/review" variant="ghost" size="md">
            Review queue
          </ButtonLink>
        </div>
      </Card>

      {/* Headline stats --------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Pass mark"
          value={`${PASS_MARK}%`}
          icon={Target}
          tone={attempt.passed ? "good" : "bad"}
          hint={
            attempt.passed
              ? `${Math.round((attempt.score - PASS_MARK) * 10) / 10} points clear`
              : `${Math.round((PASS_MARK - attempt.score) * 10) / 10} points short`
          }
        />
        <StatTile
          label="Time on task"
          value={formatDuration(attempt.durationMs)}
          icon={Clock}
          tone="info"
          hint={`${formatShortDuration(averageSeconds * 1000)} average per question`}
        />
        <StatTile
          label="Unanswered"
          value={attempt.unanswered}
          icon={CircleX}
          tone={attempt.unanswered > 0 ? "warn" : "neutral"}
          hint={attempt.unanswered > 0 ? "Skipped questions score zero" : "Nothing left blank"}
        />
        <StatTile
          label="Flagged"
          value={flaggedCount}
          icon={Flag}
          tone={flaggedCount > 0 ? "ember" : "neutral"}
          hint={
            slowest && slowest.ms > 0
              ? `Slowest question: ${formatShortDuration(slowest.ms)}`
              : "Marked for a second look"
          }
        />
      </div>

      {/* Charts ------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="border-b border-hairline px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink">Accuracy by topic</h3>
            <p className="mt-1 text-sm text-muted">
              Weakest first. Anything under the {PASS_MARK}% line is where the next study session
              should go.
            </p>
          </div>
          <div className="p-3 sm:p-4">
            {hydrated ? (
              <ResponsiveContainer width="100%" height={Math.max(220, topicData.length * 30)}>
                <BarChart
                  data={topicData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid horizontal={false} stroke="var(--hairline)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: "var(--hairline)" }}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="topic"
                    width={104}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: "var(--muted)", marginBottom: 2 }}
                    formatter={(value: unknown) => [`${String(value)}%`, "Accuracy"]}
                  />
                  <ReferenceLine
                    x={PASS_MARK}
                    stroke="var(--hairline-strong)"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="accuracy" radius={[0, 5, 5, 0]} maxBarSize={22}>
                    {topicData.map((entry) => (
                      <Cell key={entry.topic} fill={toneVar(accuracyTone(entry.accuracy))} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] rounded-lg bg-surface-2" />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-hairline px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink">Accuracy by level</h3>
            <p className="mt-1 text-sm text-muted">
              How the score splits across the five difficulty bands in this attempt.
            </p>
          </div>
          <div className="p-3 sm:p-4">
            {hydrated ? (
              <ResponsiveContainer width="100%" height={230}>
                <RadialBarChart
                  data={levelData}
                  innerRadius="30%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  barSize={14}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    dataKey="accuracy"
                    angleAxisId={0}
                    background={{ fill: "var(--surface-2)" }}
                    cornerRadius={7}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: "var(--muted)", marginBottom: 2 }}
                    formatter={(value: unknown) => [`${String(value)}%`, "Accuracy"]}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[230px] rounded-lg bg-surface-2" />
            )}

            <ul className="mt-2 flex flex-col gap-1.5 px-2 pb-1">
              {levelData.map((entry) => (
                <li key={entry.level} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-muted">{entry.name}</span>
                  <span className="tabular text-xs font-semibold text-ink">
                    {entry.correct}/{entry.total}
                  </span>
                  <span className="tabular w-10 text-right text-xs text-faint">
                    {entry.accuracy}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {timedRows.length > 1 ? (
        <Card>
          <div className="border-b border-hairline px-5 py-4">
            <h3 className="font-display text-base font-semibold text-ink">Time per question</h3>
            <p className="mt-1 text-sm text-muted">
              Seconds spent on each question in the order you saw them. Green bars were answered
              correctly. The dashed line is your average of{" "}
              <span className="tabular">{formatShortDuration(averageSeconds * 1000)}</span>.
            </p>
          </div>
          <div className="p-3 sm:p-4">
            {hydrated ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--hairline)" />
                  <XAxis
                    dataKey="index"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: "var(--hairline)" }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={34}
                    tickFormatter={(value: number) => `${value}s`}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: "var(--muted)", marginBottom: 2 }}
                    labelFormatter={(label: unknown) => `Question ${String(label)}`}
                    formatter={(value: unknown) => [`${String(value)}s`, "Time"]}
                  />
                  <ReferenceLine
                    y={Math.round(averageSeconds * 10) / 10}
                    stroke="var(--hairline-strong)"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="seconds" radius={[3, 3, 0, 0]} maxBarSize={26}>
                    {timeData.map((entry) => (
                      <Cell
                        key={entry.index}
                        fill={entry.correct ? "var(--good)" : "var(--bad)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] rounded-lg bg-surface-2" />
            )}
          </div>
        </Card>
      ) : null}

      {/* Missed questions -------------------------------------------- */}
      <section aria-labelledby="missed-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="missed-heading" className="font-display text-lg font-semibold text-ink">
              {missed.length === 0
                ? "Nothing missed"
                : `${missed.length} question${missed.length === 1 ? "" : "s"} to review`}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {missed.length === 0
                ? "A clean sheet. The review queue has nothing new from this attempt."
                : "Each one is now in your review queue and will resurface until you get it right twice."}
            </p>
          </div>
          {missed.length > 0 ? (
            <Button icon={TrendingUp} variant="secondary" size="sm" onClick={retryMissed}>
              Drill these now
            </Button>
          ) : null}
        </div>

        {missed.length > 0 ? (
          <Accordion items={missedItems} />
        ) : (
          <Card className="flex items-center gap-3 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-good-soft">
              <CircleCheck className="size-5 text-good" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted">
              Every question in this attempt was answered correctly. Try the next level up, or run
              the mock exam in exam mode with the timer on.
            </p>
          </Card>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
        <Timer className="size-4 shrink-0 text-faint" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm text-muted">
          Results are stored in this browser only. Copy the summary if you want to keep it or send
          it to a coach.
        </p>
        <ButtonLink href="/quizzes" variant="secondary" size="sm">
          All quizzes
        </ButtonLink>
      </div>
    </div>
  );
}
