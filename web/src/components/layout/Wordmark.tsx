import Link from "next/link";

import { cn } from "@/lib/utils";

export interface WordmarkProps {
  className?: string;
  /** Renders as a plain block rather than a link (for the footer). */
  asLink?: boolean;
}

/**
 * The PPC Academy mark: a small bid-curve glyph plus the wordmark. Drawn
 * inline so it inherits the theme tokens instead of shipping two PNGs.
 */
export function Wordmark({ className, asLink = true }: WordmarkProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand"
      >
        <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" aria-hidden="true">
          <path
            d="M3 17.5 8.2 11l3.6 3.2L20 5.5"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.4 5.5H20v4.6"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="8.2" cy="11" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.9375rem] font-bold tracking-tight text-ink">
          PPC Academy
        </span>
        <span className="mt-0.5 font-mono text-[0.625rem] tracking-[0.1em] text-faint uppercase">
          for Filipino VAs
        </span>
      </span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
    className,
  );

  if (!asLink) return <span className={classes}>{content}</span>;

  return (
    <Link href="/" className={classes} aria-label="PPC Academy — home">
      {content}
    </Link>
  );
}
