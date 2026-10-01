"use client";

import { ArrowRight, ClipboardList, Route, Sparkles, Target } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import { Skeleton } from "@/components/ui/Skeleton";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { levelCounts } from "@/content/quizzes";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

import { ActivityFeed } from "./ActivityFeed";
import { BookmarksPanel } from "./BookmarksPanel";
import { DataPanel } from "./DataPanel";
import { MasteryPanel } from "./MasteryPanel";
import { OverviewTiles } from "./OverviewTiles";
import { PathsPanel } from "./PathsPanel";
import { ProfileHeader } from "./ProfileHeader";
import { WeakAreasPanel } from "./WeakAreasPanel";
import { XpPanel } from "./XpPanel";
import {
  useActivityDays,
  useActivityFeed,
  useAllPathProgress,
  useBookmarkRows,
  useLevelCoverage,
  useOverview,
  useScoreTrend,
  useTopicMastery,
  useWeakAreas,
} from "./useProgress";

/**
 * The two charted panels are the only thing on this page that needs recharts,
 * and both sit below the fold behind a `useMounted` gate that already stops
 * them rendering before hydration. Loading them lazily keeps the chart
 * library out of the dashboard's first payload; the panels keep their own
 * height while the chunk arrives, so nothing jumps.
 */
function ChartPanelFallback({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      <Skeleton className="mt-5 h-48 rounded-lg" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

const ActivityPanel = dynamic(
  () => import("./ActivityPanel").then((mod) => mod.ActivityPanel),
  { loading: () => <ChartPanelFallback label="Loading your activity chart" /> },
);

const ScoreTrendPanel = dynamic(
  () => import("./ScoreTrendPanel").then((mod) => mod.ScoreTrendPanel),
  { loading: () => <ChartPanelFallback label="Loading your score trend" /> },
);

interface StarterStep {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof Target;
  tone: Tone;
}

const LEVEL_1_QUESTIONS = levelCounts().beginner;

const STARTER_STEPS: StarterStep[] = [
  {
    title: "Find out what you already know",
    description: `Level 1 is ${LEVEL_1_QUESTIONS} fundamentals questions with an explanation on every answer. About fifteen minutes, and the weak-areas list below fills itself in.`,
    href: "/quizzes/beginner",
    cta: "Take the Level 1 quiz",
    icon: Target,
    tone: "info",
  },
  {
    title: "Pick a path and follow the order",
    description:
      "Four sequenced routes through the library. Ticking a step here is the same tick as reading the resource itself, so nothing is counted twice.",
    href: "/paths",
    cta: "Browse the four paths",
    icon: Route,
    tone: "brand",
  },
  {
    title: "Read the one SOP everyone uses daily",
    description:
      "The 15-minute morning health check. Mark it complete at the bottom of the page and this page starts tracking.",
    href: "/sops/daily-health-check",
    cta: "Open the daily health check",
    icon: ClipboardList,
    tone: "ember",
  },
];

/**
 * The personal dashboard.
 *
 * Everything on it derives from localStorage, which means the honest first
 * render is empty — so the empty state is the design, not an afterthought:
 * three concrete first moves, and every panel below explains what would
 * appear in it and how to make that happen.
 */
export function Dashboard() {
  const overview = useOverview();
  const days = useActivityDays();
  const trend = useScoreTrend();
  const topics = useTopicMastery();
  const levels = useLevelCoverage();
  const weak = useWeakAreas();
  const bookmarks = useBookmarkRows();
  const events = useActivityFeed();
  const pathProgress = useAllPathProgress();

  // One clock for the whole feed, read on mount so relative times stay stable
  // across re-renders instead of drifting mid-list.
  const [now] = useState(() => Date.now());

  const untested = overview.quizAttempts === 0 && overview.mockInterviews === 0;

  return (
    <div className="space-y-6">
      <ProfileHeader overview={overview} />

      {overview.empty ? (
        <section
          aria-labelledby="starter-heading"
          className="rounded-2xl border border-hairline bg-surface"
        >
          <div className="border-b border-hairline px-5 py-4">
            <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-ember-ink uppercase">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Nothing tracked yet
            </p>
            <h2
              id="starter-heading"
              className="mt-1.5 text-xl leading-tight font-bold text-ink sm:text-2xl"
            >
              Three ways to put the first number on this page
            </h2>
            <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
              This page reads from your own browser. No account, no sign-in, nothing sent
              anywhere — which also means it stays blank until you do something. Any one of these
              takes under twenty minutes and fills in most of the panels below.
            </p>
          </div>

          <ul className="grid divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {STARTER_STEPS.map((step) => (
              <li key={step.href} className="flex">
                <Link
                  href={step.href}
                  className="group flex w-full flex-col gap-2 p-5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      TONE_SOFT_BG[step.tone],
                    )}
                    aria-hidden="true"
                  >
                    <step.icon className={cn("size-[1.125rem]", TONE_ICON[step.tone])} />
                  </span>
                  <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                    {step.title}
                  </span>
                  <span className="text-[0.8125rem] leading-relaxed text-muted">
                    {step.description}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[0.8125rem] font-medium text-brand">
                    {step.cta}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <OverviewTiles overview={overview} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <ActivityPanel days={days} />
        <XpPanel overview={overview} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreTrendPanel points={trend} />
        <MasteryPanel topics={topics} levels={levels} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeakAreasPanel areas={weak} untested={untested} />
        <PathsPanel paths={pathProgress} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BookmarksPanel rows={bookmarks} />
        <ActivityFeed events={events} now={now} />
      </div>

      <AddToHomeScreen />

      <DataPanel />
    </div>
  );
}
