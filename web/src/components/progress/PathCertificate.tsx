"use client";

import { Award, Printer } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/Button";
import type { LearningPathDoc } from "@/content/paths";
import { cn, formatDate, formatMinutes } from "@/lib/utils";

import { useHydrated, useProfile } from "./useProgress";

export interface PathCertificateProps {
  path: LearningPathDoc;
  /** When the last step was ticked. A finished path always has one. */
  completedAt: number;
  stepCount: number;
  className?: string;
}

function isoDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * The completion card.
 *
 * It is deliberately not a certificate of accreditation — nobody accredits
 * localStorage — and it says so on its face. What it is: a printable record
 * of a specific, listed body of work, with the step count and the hours,
 * which is a legitimate thing to put in a portfolio appendix.
 */
export function PathCertificate({
  path,
  completedAt,
  stepCount,
  className,
}: PathCertificateProps) {
  const profile = useProfile();
  const hydrated = useHydrated();
  const name = hydrated && profile.displayName.trim() ? profile.displayName.trim() : null;
  const day = isoDay(completedAt);

  const print = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  return (
    <section
      aria-labelledby="certificate-heading"
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-good/40 bg-surface",
        "print:border print:border-hairline-strong print:break-inside-avoid",
        className,
      )}
    >
      <div className="grid-field absolute inset-0 opacity-70 print:hidden" aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-5 px-6 py-10 text-center sm:px-10 sm:py-12">
        <span
          className="flex size-14 items-center justify-center rounded-2xl bg-good-soft"
          aria-hidden="true"
        >
          <Award className="size-7 text-good" />
        </span>

        <div className="space-y-2">
          <p className="font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-good uppercase">
            Path complete
          </p>
          <h2
            id="certificate-heading"
            className="text-2xl leading-tight font-bold text-ink sm:text-3xl"
          >
            {path.title}
          </h2>
        </div>

        <div className="hairline-rule h-px w-full max-w-md" aria-hidden="true" />

        <div className="space-y-1">
          <p className="text-[0.8125rem] text-muted">Completed by</p>
          <p className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {name ?? "A PPC Academy learner"}
          </p>
          {name ? null : (
            <p className="text-[0.75rem] text-faint print:hidden">
              Add a display name to your profile and it appears here.
            </p>
          )}
        </div>

        <dl className="grid w-full max-w-lg grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-4">
          <div className="bg-surface px-3 py-3">
            <dt className="text-[0.625rem] font-medium tracking-[0.1em] text-faint uppercase">
              Date
            </dt>
            <dd className="tabular mt-0.5 text-[0.8125rem] font-semibold text-ink">
              {formatDate(day)}
            </dd>
          </div>
          <div className="bg-surface px-3 py-3">
            <dt className="text-[0.625rem] font-medium tracking-[0.1em] text-faint uppercase">
              Steps
            </dt>
            <dd className="tabular mt-0.5 text-[0.8125rem] font-semibold text-ink">{stepCount}</dd>
          </div>
          <div className="bg-surface px-3 py-3">
            <dt className="text-[0.625rem] font-medium tracking-[0.1em] text-faint uppercase">
              Modules
            </dt>
            <dd className="tabular mt-0.5 text-[0.8125rem] font-semibold text-ink">
              {path.modules.length}
            </dd>
          </div>
          <div className="bg-surface px-3 py-3">
            <dt className="text-[0.625rem] font-medium tracking-[0.1em] text-faint uppercase">
              Study time
            </dt>
            <dd className="tabular mt-0.5 text-[0.8125rem] font-semibold text-ink">
              {formatMinutes(path.minutes)}
            </dd>
          </div>
        </dl>

        <p className="max-w-lg text-[0.8125rem] leading-relaxed text-muted">
          {path.proof}
        </p>

        <p className="max-w-lg text-[0.6875rem] leading-relaxed text-faint">
          PPC Academy is free and open-source. This card records self-directed study tracked in
          your own browser — it is not an accredited qualification, and it is worth exactly as
          much as the work behind it.
        </p>

        <Button icon={Printer} variant="secondary" onClick={print} className="print:hidden">
          Print or save as PDF
        </Button>
      </div>
    </section>
  );
}
