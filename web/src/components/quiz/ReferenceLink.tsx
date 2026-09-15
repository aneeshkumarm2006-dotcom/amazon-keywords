import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { referenceLabel } from "@/content/reference-labels";
import { cn } from "@/lib/utils";

/**
 * The "where this answer comes from" link under a quiz explanation.
 *
 * The question only stores an href, so the title comes from
 * `src/content/reference-labels.ts` — a flat table rather than the registry,
 * because the quiz runner is a client component and the registry carries
 * every document body with it. `assertReferenceIndex()` keeps the table
 * honest at build time.
 *
 * Naming the destination matters more than it looks: a reader who has just
 * got a question wrong decides whether to click based on whether the link
 * says "Read the reference" or "SOP-03: Bid optimisation".
 */

export interface ReferenceLinkProps {
  href: string;
  className?: string;
}

export function ReferenceLink({ href, className }: ReferenceLinkProps) {
  const label = referenceLabel(href);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-full items-baseline gap-1.5 text-sm font-medium text-brand underline decoration-brand/35 underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      {label ? (
        <>
          <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.1em] text-muted uppercase">
            {label.kind}
          </span>
          <span className="min-w-0">{label.title}</span>
        </>
      ) : (
        <span>Read the reference</span>
      )}
      <ArrowUpRight className="size-3.5 shrink-0 self-center" aria-hidden="true" />
    </Link>
  );
}
