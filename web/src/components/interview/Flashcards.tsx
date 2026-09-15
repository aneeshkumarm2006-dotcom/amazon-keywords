"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Eye,
  Play,
  RotateCcw,
  Shuffle,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  LEVEL_META,
  LEVEL_ORDER,
  findInterviewQuestion,
  interviewQuestions,
  type InterviewCategory,
} from "@/content/interviews";
import { useBookmarks, usePractised } from "@/lib/interview-hooks";
import { markPractised, toggleBookmark } from "@/lib/interview-progress";
import { newSeed, seededShuffle } from "@/lib/quiz-shuffle";
import { cn } from "@/lib/utils";
import type { Level } from "@/types/content";

import { AnswerBody } from "./AnswerBody";
import { QuestionChips } from "./QuestionChips";
import { categoryIcon } from "./meta";

type Pool = "all" | "bookmarked" | "unpractised";

const POOLS: { id: Pool; label: string }[] = [
  { id: "all", label: "Whole bank" },
  { id: "unpractised", label: "Not yet practised" },
  { id: "bookmarked", label: "Bookmarked only" },
];

/**
 * Question-only drill with reveal.
 *
 * Answer out loud, reveal, then rate yourself: "had it" marks the question
 * practised, "needs work" bookmarks it for the next session. The shuffle seed
 * is created when you press start rather than during render, so the
 * server-rendered markup and the first client render always agree.
 */
export function Flashcards() {
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [pool, setPool] = useState<Pool>("all");
  const [seed, setSeed] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hadIt, setHadIt] = useState<string[]>([]);
  const [needsWork, setNeedsWork] = useState<string[]>([]);

  const bookmarks = useBookmarks();
  const practised = usePractised();

  const poolIds = useMemo(() => {
    return interviewQuestions
      .filter((entry) => {
        if (categories.length > 0 && !categories.includes(entry.category)) return false;
        if (levels.length > 0 && !levels.includes(entry.level)) return false;
        if (pool === "bookmarked" && !bookmarks.has(entry.id)) return false;
        if (pool === "unpractised" && practised.has(entry.id)) return false;
        return true;
      })
      .map((entry) => entry.id);
    // `bookmarks` and `practised` are only read when the matching pool is
    // selected; including them keeps the deck honest when a card is starred
    // mid-session.
  }, [categories, levels, pool, bookmarks, practised]);

  const deck = useMemo(
    () => (seed === null ? poolIds : seededShuffle(poolIds, seed)),
    [poolIds, seed],
  );

  const started = seed !== null;
  const finished = started && deck.length > 0 && index >= deck.length;
  const currentId = finished ? undefined : deck[index];
  const current = currentId ? findInterviewQuestion(currentId) : undefined;

  const advance = useCallback(() => {
    setRevealed(false);
    setIndex((previous) => Math.min(previous + 1, deck.length));
  }, [deck.length]);

  const back = useCallback(() => {
    setRevealed(false);
    setIndex((previous) => Math.max(previous - 1, 0));
  }, []);

  const rate = useCallback(
    (knew: boolean) => {
      if (!currentId) return;
      if (knew) {
        markPractised([currentId]);
        setHadIt((previous) =>
          previous.includes(currentId) ? previous : [...previous, currentId],
        );
      } else {
        if (!bookmarks.has(currentId)) toggleBookmark(currentId);
        setNeedsWork((previous) =>
          previous.includes(currentId) ? previous : [...previous, currentId],
        );
      }
      advance();
    },
    [advance, bookmarks, currentId],
  );

  const restart = useCallback(() => {
    setSeed(newSeed());
    setIndex(0);
    setRevealed(false);
    setHadIt([]);
    setNeedsWork([]);
  }, []);

  /**
   * Any filter change rebuilds the deck, so the pointer goes back to the start
   * rather than landing past the end of a shorter list. Done here in the
   * handlers rather than in an effect, so there is no cascading render.
   */
  const rewind = useCallback(() => {
    setIndex(0);
    setRevealed(false);
  }, []);

  // Keyboard drill controls. Ignored while a form control has focus so the
  // filter chips stay usable.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
        case "Enter":
          if (!current) return;
          event.preventDefault();
          if (revealed) advance();
          else setRevealed(true);
          break;
        case "ArrowRight":
          event.preventDefault();
          advance();
          break;
        case "ArrowLeft":
          event.preventDefault();
          back();
          break;
        case "1":
          if (!revealed) return;
          event.preventDefault();
          rate(false);
          break;
        case "2":
          if (!revealed) return;
          event.preventDefault();
          rate(true);
          break;
        case "s":
        case "S":
          event.preventDefault();
          restart();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, back, current, rate, restart, revealed]);

  const toggleCategory = (category: InterviewCategory) => {
    rewind();
    setCategories((previous) =>
      previous.includes(category)
        ? previous.filter((entry) => entry !== category)
        : [...previous, category],
    );
  };

  const toggleLevel = (level: Level) => {
    rewind();
    setLevels((previous) =>
      previous.includes(level)
        ? previous.filter((entry) => entry !== level)
        : [...previous, level],
    );
  };

  const choosePool = (next: Pool) => {
    rewind();
    setPool(next);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* --------------------------------------------------------- filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
            Deck
          </span>
          {POOLS.map((entry) => (
            <Chip key={entry.id} on={pool === entry.id} onClick={() => choosePool(entry.id)}>
              {entry.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
            Level
          </span>
          {LEVEL_ORDER.map((level) => (
            <Chip key={level} on={levels.includes(level)} onClick={() => toggleLevel(level)}>
              {LEVEL_META[level].label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
            Category
          </span>
          {CATEGORY_ORDER.map((category) => {
            const Icon = categoryIcon(category);
            return (
              <Chip
                key={category}
                on={categories.includes(category)}
                onClick={() => toggleCategory(category)}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {CATEGORY_META[category].short}
              </Chip>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
          <p className="text-[0.8125rem] text-muted">
            <span className="tabular font-semibold text-ink">{deck.length}</span> card
            {deck.length === 1 ? "" : "s"} in this deck
          </p>
          <Button variant="ghost" size="sm" icon={Shuffle} onClick={restart} disabled={deck.length === 0}>
            {started ? "Shuffle" : "Shuffle and start"}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------ card */}
      {deck.length === 0 ? (
        <EmptyState
          title="No cards in this deck"
          description="Nothing matches those filters. Widen the level or category selection, or switch the deck back to the whole bank."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCategories([]);
                setLevels([]);
                setPool("all");
              }}
            >
              Reset the deck
            </Button>
          }
        />
      ) : !started ? (
        <div className="rounded-2xl border border-hairline bg-surface p-6 text-center sm:p-10">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-ember-soft">
            <Zap className="size-6 text-ember" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
            {deck.length} card{deck.length === 1 ? "" : "s"} in this deck, shuffled. Read the
            question, answer it out loud in full, then reveal and mark yourself honestly.
          </p>
          <div className="mt-6 flex justify-center">
            <Button icon={Play} onClick={restart}>
              Shuffle and start
            </Button>
          </div>
          <p className="mt-4 text-xs text-faint">
            <Key>Space</Key> reveals and advances · <Key>1</Key> needs work · <Key>2</Key> had it
          </p>
        </div>
      ) : finished ? (
        <div className="rounded-2xl border border-hairline bg-surface p-6 text-center sm:p-10">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-good-soft">
            <Trophy className="size-6 text-good" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Deck finished</h2>
          <p className="mt-2 text-[0.9375rem] text-muted">
            You went through {deck.length} card{deck.length === 1 ? "" : "s"}.{" "}
            <span className="tabular font-semibold text-good">{hadIt.length}</span> marked as
            known,{" "}
            <span className="tabular font-semibold text-ember-ink">{needsWork.length}</span> sent back
            to the bookmark list.
          </p>

          {needsWork.length > 0 ? (
            <ul className="mx-auto mt-6 flex max-w-2xl flex-col gap-1.5 text-left">
              {needsWork.map((id) => {
                const entry = findInterviewQuestion(id);
                if (!entry) return null;
                return (
                  <li key={id}>
                    <Link
                      href={`/interviews/${id}`}
                      className="flex items-start gap-2 rounded-lg border border-hairline bg-surface-2 p-3 text-sm text-ink transition-colors hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <Star className="mt-0.5 size-3.5 shrink-0 text-ember" aria-hidden="true" />
                      <span className="leading-snug">{entry.question}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button icon={RotateCcw} onClick={restart}>
              Shuffle and go again
            </Button>
          </div>
        </div>
      ) : current ? (
        <div className="flex flex-col gap-4">
          <Progress
            value={index}
            max={deck.length}
            label={`Card ${index + 1} of ${deck.length}`}
            readout={`${hadIt.length} known`}
            tone="brand"
            size="sm"
          />

          <div className="rounded-2xl border border-hairline bg-surface">
            <div className="border-b border-hairline p-5 sm:p-7">
              <QuestionChips entry={current} />
              <h2 className="mt-4 font-display text-xl leading-snug font-semibold text-balance text-ink sm:text-2xl">
                {current.question}
              </h2>
              {!revealed ? (
                <p className="mt-4 text-[0.875rem] text-muted">
                  Answer it out loud, in full, before you reveal. Aim for about{" "}
                  {Math.round(current.answerSeconds / 15) * 15} seconds.
                </p>
              ) : null}
            </div>

            {revealed ? (
              <div className="p-5 sm:p-7">
                <AnswerBody entry={current} hideFollowUps />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-hairline p-4">
              <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={back} disabled={index === 0}>
                Back
              </Button>

              {revealed ? (
                <>
                  <Button variant="secondary" size="sm" icon={Star} onClick={() => rate(false)}>
                    Needs work
                  </Button>
                  <Button size="sm" icon={CircleCheckBig} onClick={() => rate(true)}>
                    I had it
                  </Button>
                </>
              ) : (
                <Button size="sm" icon={Eye} onClick={() => setRevealed(true)}>
                  Reveal the answer
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                iconAfter={ChevronRight}
                onClick={advance}
                className="ml-auto"
              >
                Skip
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-faint">
            <Key>Space</Key> reveals and advances · <Key>1</Key> needs work · <Key>2</Key> had it ·{" "}
            <Key>←</Key> <Key>→</Key> move · <Key>S</Key> shuffles
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        on
          ? "border-brand bg-brand text-on-brand"
          : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-[0.6875rem] text-muted">
      {children}
    </kbd>
  );
}
