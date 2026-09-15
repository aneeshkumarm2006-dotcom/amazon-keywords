"use client";

import { ListChecks, RotateCcw } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Progress } from "@/components/ui/Progress";
import { useLocalStorage } from "@/lib/storage";

/**
 * Before you run it.
 *
 * Ticks are kept per script in localStorage, so somebody who set Python up
 * last month does not start from zero on the next script. The list is the
 * honest version of "prerequisites": every one of these has stopped a VA
 * getting a script running at least once.
 */
export function PrereqChecklist({
  scriptId,
  prerequisites,
}: {
  scriptId: string;
  prerequisites: string[];
}) {
  const [done, setDone, meta] = useLocalStorage<string[]>(`script:${scriptId}:prereqs`, []);

  const toggle = useCallback(
    (item: string) => {
      setDone((current) =>
        current.includes(item)
          ? current.filter((entry) => entry !== item)
          : [...current, item],
      );
    },
    [setDone],
  );

  const checked = meta.ready ? done.filter((item) => prerequisites.includes(item)) : [];
  const complete = checked.length === prerequisites.length && prerequisites.length > 0;

  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3.5 sm:px-5">
        <ListChecks className="size-4 shrink-0 text-brand" aria-hidden="true" />
        <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
          Before you run it
        </h2>
        {checked.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            className="ml-auto"
            onClick={() => meta.reset()}
          >
            Clear
          </Button>
        ) : null}
      </header>

      <div className="grid gap-3.5 p-4 sm:p-5">
        <Progress
          value={checked.length}
          max={prerequisites.length}
          label="Ready to run"
          readout={`${checked.length} of ${prerequisites.length}`}
          tone={complete ? "good" : "brand"}
          size="sm"
        />

        <ul className="grid gap-2.5">
          {prerequisites.map((item, index) => (
            <li key={item}>
              <Checkbox
                id={`${scriptId}-prereq-${index}`}
                label={item}
                checked={checked.includes(item)}
                onChange={() => toggle(item)}
              />
            </li>
          ))}
        </ul>

        {complete ? (
          <p className="rounded-lg border border-good/30 bg-good-soft px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-ink">
            Everything is in place. Work down the steps below in order — the first run is the
            slow one, and every run after it takes a couple of minutes.
          </p>
        ) : null}
      </div>
    </section>
  );
}
