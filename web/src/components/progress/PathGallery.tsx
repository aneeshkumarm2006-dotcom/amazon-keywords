"use client";

import { CheckCircle2, Compass, Route, Timer } from "lucide-react";

import { StatTile } from "@/components/ui/StatTile";
import { paths } from "@/content/paths";
import { formatMinutes, formatNumber } from "@/lib/utils";

import { PathCard } from "./PathCard";
import { useAllPathProgress } from "./useProgress";

/**
 * The `/paths` index.
 *
 * The summary strip on top is the only part that needs storage: it turns four
 * static cards into "here is where you actually are". Everything else renders
 * identically for a first-time visitor.
 */
export function PathGallery() {
  const progress = useAllPathProgress();

  const totalSteps = paths.reduce((sum, path) => sum + path.stepCount, 0);
  const doneSteps = progress.reduce((sum, entry) => sum + entry.done, 0);
  const minutesLeft = progress.reduce((sum, entry) => sum + entry.minutesLeft, 0);
  const completed = progress.filter((entry) => entry.complete).length;
  const started = progress.filter((entry) => entry.started && !entry.complete).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Steps complete"
          value={formatNumber(doneSteps)}
          unit={`/ ${totalSteps}`}
          hint="Ticking a step ticks the resource everywhere else too."
          icon={CheckCircle2}
          tone="brand"
        />
        <StatTile
          label="Paths in progress"
          value={formatNumber(started)}
          hint={
            started === 0
              ? "Start one and it appears on your progress page."
              : "Showing on your progress page with the next step."
          }
          icon={Route}
          tone="info"
        />
        <StatTile
          label="Paths finished"
          value={formatNumber(completed)}
          unit={`/ ${paths.length}`}
          hint="Each finished path prints a certificate card."
          icon={Compass}
          tone="good"
        />
        <StatTile
          label="Reading time left"
          value={formatMinutes(minutesLeft)}
          hint="Across everything you have not yet marked complete."
          icon={Timer}
          tone="ember"
        />
      </div>

      {/* The card titles are h3s. Without a heading above them the document
          outline jumps straight from the page h1 to h3, so the section gets a
          real heading — hidden, because the page title already says it. */}
      <h2 className="sr-only" id="path-gallery-heading">
        The four learning paths
      </h2>

      <ul aria-labelledby="path-gallery-heading" className="grid gap-4 lg:grid-cols-2">
        {paths.map((path) => (
          // `min-w-0` stops the truncating "Next step" line from setting a
          // max-content track width and pushing the grid past 360px.
          <li key={path.id} className="flex min-w-0">
            <PathCard path={path} className="w-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
