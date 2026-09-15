"use client";

import {
  BookOpenCheck,
  Flame,
  MessageSquareQuote,
  RefreshCcw,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";

import { StatTile } from "@/components/ui/StatTile";
import type { ProgressOverview } from "@/lib/progress";
import { formatMinutes, formatNumber } from "@/lib/utils";

export interface OverviewTilesProps {
  overview: ProgressOverview;
}

/** The eight headline numbers, each linking to where you would change it. */
export function OverviewTiles({ overview }: OverviewTilesProps) {
  const {
    resourcesCompleted,
    resourcesTotal,
    resourcePercent,
    quizAttempts,
    quizzesPassed,
    bestQuizScore,
    averageQuizScore,
    mockInterviews,
    bestMockScore,
    streak,
    xp,
    level,
    dueForReview,
    minutesInvested,
  } = overview;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Resources done"
        value={formatNumber(resourcesCompleted)}
        unit={`/ ${resourcesTotal}`}
        hint={
          resourcesCompleted === 0
            ? "Tick any SOP, template or case study as complete."
            : `${resourcePercent}% of the trackable library.`
        }
        icon={BookOpenCheck}
        tone="brand"
        href="/search"
      />
      <StatTile
        label="Quizzes taken"
        value={formatNumber(quizAttempts)}
        hint={
          quizAttempts === 0
            ? "Six graded sets, from fundamentals to scenarios."
            : `${quizzesPassed} quiz${quizzesPassed === 1 ? "" : "zes"} passed at 70% or better.`
        }
        icon={Target}
        tone="info"
        href="/quizzes"
      />
      <StatTile
        label="Best quiz score"
        value={bestQuizScore === null ? "—" : `${bestQuizScore}`}
        unit={bestQuizScore === null ? undefined : "%"}
        hint={
          averageQuizScore === null
            ? "Your highest score appears once you finish one."
            : `Average across every attempt: ${averageQuizScore}%.`
        }
        icon={Trophy}
        tone={bestQuizScore !== null && bestQuizScore >= 70 ? "good" : "warn"}
        href="/quizzes"
      />
      <StatTile
        label="Mock interviews"
        value={formatNumber(mockInterviews)}
        hint={
          bestMockScore === null
            ? "Timed questions, typed answers, then self-scoring."
            : `Best self-assessed score: ${bestMockScore}%.`
        }
        icon={MessageSquareQuote}
        tone="ember"
        href="/interviews/mock"
      />
      <StatTile
        label="Current streak"
        value={formatNumber(streak.current)}
        unit={streak.current === 1 ? "day" : "days"}
        hint={
          streak.longest > 0
            ? `Longest run so far: ${streak.longest} day${streak.longest === 1 ? "" : "s"}.`
            : "Any activity on a day keeps the streak alive."
        }
        icon={Flame}
        tone={streak.current > 0 ? "ember" : "neutral"}
      />
      <StatTile
        label="Total XP"
        value={formatNumber(xp.total)}
        hint={
          level.next
            ? `${formatNumber(level.remaining)} more to reach ${level.next.name}.`
            : `Top tier: ${level.tier.name}.`
        }
        icon={Zap}
        tone="brand"
      />
      <StatTile
        label="Due for review"
        value={formatNumber(dueForReview)}
        hint={
          dueForReview === 0
            ? "Missed questions resurface on a spaced schedule."
            : "Questions waiting in the Leitner queue right now."
        }
        icon={RefreshCcw}
        tone={dueForReview > 0 ? "warn" : "neutral"}
        href="/quizzes/review"
      />
      <StatTile
        label="Time invested"
        value={minutesInvested > 0 ? formatMinutes(minutesInvested) : "—"}
        hint="Reading time of completed resources plus time spent in quizzes and mocks."
        icon={Timer}
        tone="info"
      />
    </div>
  );
}
