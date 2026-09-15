"use client";

import { CircleCheckBig, Star } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useBookmarks, usePractised } from "@/lib/interview-hooks";
import { useIsHydrated } from "@/lib/storage";
import { cn } from "@/lib/utils";

export interface QuestionActionsProps {
  id: string;
  /** `bar` renders labelled buttons, `icons` renders a compact pair. */
  variant?: "bar" | "icons";
  className?: string;
}

/**
 * Star and practised toggles for one question.
 *
 * Both states live in localStorage, so the buttons render in their default
 * state on the server and switch once hydration finishes — `aria-pressed` is
 * only meaningful after that, which is why the hydration flag gates the
 * pressed styling rather than the markup.
 */
export function QuestionActions({ id, variant = "bar", className }: QuestionActionsProps) {
  const bookmarks = useBookmarks();
  const practised = usePractised();
  const hydrated = useIsHydrated();

  const starred = hydrated && bookmarks.has(id);
  const done = hydrated && practised.has(id);

  if (variant === "icons") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <button
          type="button"
          aria-pressed={starred}
          aria-label={starred ? "Remove bookmark" : "Bookmark this question"}
          onClick={() => bookmarks.toggle(id)}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-lg border transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            starred
              ? "border-ember/35 bg-ember-soft text-ember-ink"
              : "border-transparent text-faint hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Star className="size-4" fill={starred ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? "Mark as not practised" : "Mark as practised"}
          onClick={() => practised.toggle(id)}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-lg border transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            done
              ? "border-good/30 bg-good-soft text-good"
              : "border-transparent text-faint hover:bg-surface-2 hover:text-ink",
          )}
        >
          <CircleCheckBig className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant={starred ? "primary" : "secondary"}
        size="sm"
        icon={Star}
        aria-pressed={starred}
        onClick={() => bookmarks.toggle(id)}
      >
        {starred ? "Bookmarked" : "Bookmark"}
      </Button>
      <Button
        variant={done ? "primary" : "secondary"}
        size="sm"
        icon={CircleCheckBig}
        aria-pressed={done}
        onClick={() => practised.toggle(id)}
      >
        {done ? "Practised" : "Mark practised"}
      </Button>
    </div>
  );
}
