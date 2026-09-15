"use client";

import { Check, Flag, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/Badge";
import { LEVEL_META } from "@/content/quizzes";
import type { DisplayChoice } from "@/lib/quiz-session";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/content";

import { ReferenceLink } from "./ReferenceLink";

const KEY_HINTS = ["1", "2", "3", "4", "5", "6"];

export interface QuestionCardProps {
  question: QuizQuestion;
  /** Choices in display order, each carrying its original index. */
  choices: DisplayChoice[];
  /** Original index the learner picked, or null. */
  selected: number | null;
  /** Show right/wrong colouring and the explanation. */
  revealed: boolean;
  /** Lock the choices — a reviewed question in practice mode. */
  locked?: boolean;
  /** Flashcard mode hides the choices until the learner reveals them. */
  hideChoices?: boolean;
  onSelect: (originalIndex: number) => void;
  flagged: boolean;
  onToggleFlag: () => void;
  position: { current: number; total: number };
}

export function QuestionCard({
  question,
  choices,
  selected,
  revealed,
  locked,
  hideChoices,
  onSelect,
  flagged,
  onToggleFlag,
  position,
}: QuestionCardProps) {
  const level = LEVEL_META[question.level];
  const headingId = `question-${question.id}`;
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});
  const interactive = !revealed && !locked;

  // Reset the scroll position of the card when the question changes so a long
  // explanation on the previous question does not leave the next one mid-view.
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "nearest" });
  }, [question.id]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + choices.length) % choices.length;
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        move(index, 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        move(index, -1);
        break;
      case "Home":
        event.preventDefault();
        refs.current[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        refs.current[choices.length - 1]?.focus();
        break;
      default:
        break;
    }
  };

  const focusIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.originalIndex === selected),
  );

  return (
    <div ref={topRef} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-xs font-semibold text-faint">
          {position.current} / {position.total}
        </span>
        <span aria-hidden="true" className="text-faint">
          ·
        </span>
        <Badge tone={level.tone} size="sm">
          {level.ordinal} {level.label}
        </Badge>
        <Badge tone="neutral" size="sm">
          {question.topic}
        </Badge>

        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className={cn(
            "ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium",
            "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            flagged
              ? "border-warn/40 bg-warn-soft text-warn"
              : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
          )}
        >
          <Flag className={cn("size-3.5", flagged && "fill-current")} aria-hidden="true" />
          {flagged ? "Flagged" : "Flag"}
          <kbd className="ml-1 hidden font-mono text-[0.625rem] text-faint sm:inline">F</kbd>
        </button>
      </div>

      <h2
        id={headingId}
        className="font-display text-xl leading-snug font-semibold text-balance text-ink sm:text-2xl"
      >
        {question.question}
      </h2>

      {hideChoices ? (
        <p className="rounded-xl border border-dashed border-hairline-strong bg-surface-2 px-4 py-6 text-center text-sm text-muted">
          Answer it out loud from memory, then reveal.
        </p>
      ) : (
        <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2.5">
          {choices.map((choice, index) => {
            const isSelected = selected === choice.originalIndex;
            const isAnswer = choice.originalIndex === question.answerIndex;
            const showCorrect = revealed && isAnswer;
            const showWrong = revealed && isSelected && !isAnswer;

            return (
              <button
                key={choice.originalIndex}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={index === focusIndex ? 0 : -1}
                disabled={!interactive}
                onClick={() => interactive && onSelect(choice.originalIndex)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left",
                  "transition-[background-color,border-color] duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  "disabled:cursor-default",
                  showCorrect && "border-good/50 bg-good-soft",
                  showWrong && "border-bad/50 bg-bad-soft",
                  !showCorrect &&
                    !showWrong &&
                    isSelected &&
                    "border-brand bg-brand-soft",
                  !showCorrect &&
                    !showWrong &&
                    !isSelected &&
                    cn(
                      "border-hairline bg-surface",
                      interactive && "hover:border-hairline-strong hover:bg-surface-2",
                      revealed && "opacity-70",
                    ),
                )}
              >
                <span
                  className={cn(
                    "mt-px flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold",
                    showCorrect && "border-transparent bg-good text-on-good",
                    showWrong && "border-transparent bg-bad text-on-bad",
                    !showCorrect &&
                      !showWrong &&
                      isSelected &&
                      "border-transparent bg-brand text-on-brand",
                    !showCorrect &&
                      !showWrong &&
                      !isSelected &&
                      "border-hairline bg-surface-2 text-faint",
                  )}
                  aria-hidden="true"
                >
                  {showCorrect ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : showWrong ? (
                    <X className="size-3.5" strokeWidth={3} />
                  ) : (
                    (KEY_HINTS[index] ?? index + 1)
                  )}
                </span>
                <span className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed text-ink">
                  {choice.text}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {revealed ? (
        <div
          className={cn(
            "rounded-xl border p-4",
            selected === question.answerIndex
              ? "border-good/30 bg-good-soft"
              : "border-hairline bg-surface-2",
          )}
        >
          <p className="mb-1.5 font-display text-[0.9375rem] font-semibold text-ink">
            {selected === null
              ? "Not answered"
              : selected === question.answerIndex
                ? "Correct"
                : "Not quite"}
          </p>
          <p className="text-sm leading-relaxed text-ink">{question.explanation}</p>
          {question.reference ? (
            <ReferenceLink href={question.reference} className="mt-3" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
