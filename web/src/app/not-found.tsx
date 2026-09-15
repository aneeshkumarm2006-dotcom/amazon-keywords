import { ArrowRight, Home, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { CardLink } from "@/components/ui/Card";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { kindsInOrder, resourceCount } from "@/content/registry";
import { QUICK_LINKS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That route does not exist on PPC Academy. Jump to the quizzes, SOPs, case studies or search every resource.",
  robots: { index: false, follow: true },
  /**
   * The root layout declares the home page as its canonical, which every
   * child inherits unless it overrides. A 404 must not claim to be the home
   * page — `null` drops the tag entirely rather than pointing somewhere
   * misleading.
   */
  alternates: { canonical: null },
  openGraph: { url: null },
};

export default function NotFound() {
  const kinds = kindsInOrder().slice(0, 6);

  return (
    <div className="relative overflow-hidden">
      <div className="grid-field absolute inset-0" aria-hidden="true" />

      <Container width="default" className="relative py-16 sm:py-24">
        <p className="font-mono text-[0.6875rem] font-medium tracking-[0.16em] text-ember-ink uppercase">
          Error 404 · Route not found
        </p>

        <h1 className="mt-4 max-w-2xl text-[2rem] leading-[1.1] font-bold tracking-tight text-ink sm:text-5xl">
          Zero impressions on this URL.
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          The page you asked for is not in the index. It may have moved while the library was being
          reorganised, or the link that brought you here had a typo. Nothing is lost — everything
          below is one click away.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg" icon={Home}>
            Back to the home page
          </ButtonLink>
          <ButtonLink href="/search" size="lg" variant="secondary" icon={Search}>
            Search every resource
          </ButtonLink>
        </div>

        <div className="mt-14">
          <h2 className="font-display text-sm font-semibold tracking-[0.08em] text-muted uppercase">
            Popular destinations
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <CardLink href={link.href} className="flex items-start gap-3 p-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                      <Icon className="size-4 text-brand" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{link.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {link.description}
                      </span>
                    </span>
                    <ArrowRight className="mt-2.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                  </CardLink>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-sm font-semibold tracking-[0.08em] text-muted uppercase">
            Or jump straight to a section
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {kinds.map((meta) => {
              const Icon = meta.icon;
              return (
                <li key={meta.kind}>
                  <Link
                    href={meta.href}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink transition-colors hover:border-hairline-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded",
                        TONE_SOFT_BG[meta.accent],
                      )}
                    >
                      <Icon
                        className={cn("size-3.5", TONE_ICON[meta.accent])}
                        aria-hidden="true"
                      />
                    </span>
                    {meta.plural}
                    <span className="tabular text-xs text-faint">{resourceCount(meta.kind)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </div>
  );
}
