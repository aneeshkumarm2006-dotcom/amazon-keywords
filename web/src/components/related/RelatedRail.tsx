import { ArrowUpRight, Clock, Route, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { KIND_META } from "@/content/registry";
import { relatedResources, usedIn, type RelatedOptions } from "@/lib/related";
import { cn, formatMinutes, truncate } from "@/lib/utils";

/**
 * The block that closes every resource page: what to read next, and where
 * this page is already used.
 *
 * Both halves are derived at build time from `src/lib/related.ts`, so the
 * links can only point at resources that are registered — there is no list
 * of "related items" for an author to forget to update. A server component
 * on purpose: the whole registry is consulted and none of it ships.
 *
 * The component renders nothing at all when neither half has anything, so a
 * page with no overlap ends cleanly rather than showing an empty shell.
 */

export interface RelatedRailProps {
  /** The route this block sits on, e.g. "/sops/daily-health-check". */
  href: string;
  /** Hrefs already linked elsewhere on the page — kept out of "Read next". */
  exclude?: string[];
  /** Scoring overrides, passed through to `relatedResources`. */
  options?: Omit<RelatedOptions, "exclude">;
  /** Wrap in a `<Container>`. Off when the page already provides one. */
  contained?: boolean;
  className?: string;
}

export function RelatedRail({
  href,
  exclude = [],
  options,
  contained = true,
  className,
}: RelatedRailProps) {
  const uses = usedIn(href);
  const related = relatedResources(href, {
    limit: 6,
    perKind: 2,
    ...options,
    exclude: [...exclude, ...uses.caseStudies.map((use) => `/case-studies/${use.study.id}`)],
  });

  if (related.length === 0 && !uses.any) return null;

  const body = (
    <div className="grid gap-10 border-t border-hairline pt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      {/* ------------------------------------------------------ read next */}
      {related.length > 0 ? (
        <section aria-labelledby="related-next">
          <h2
            id="related-next"
            className="font-display text-xl leading-tight font-bold text-ink"
          >
            Related in the library
          </h2>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
            Matched on the tags this page shares with the rest of the library, capped at two
            per type so the list stays mixed.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {related.map(({ resource, sharedTags }) => {
              const kind = KIND_META[resource.kind];
              const Icon = kind.icon;

              return (
                <li key={resource.href} className="flex">
                  <Link
                    href={resource.href}
                    className="group flex w-full flex-col gap-2 rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md",
                          TONE_SOFT_BG[kind.accent],
                        )}
                      >
                        <Icon
                          className={cn("size-3.5", TONE_ICON[kind.accent])}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="font-mono text-[0.625rem] font-medium tracking-[0.12em] text-faint uppercase">
                        {kind.label}
                      </span>
                      {resource.minutes ? (
                        <span className="ml-auto inline-flex items-center gap-1 text-[0.6875rem] text-faint">
                          <Clock className="size-3" aria-hidden="true" />
                          {formatMinutes(resource.minutes)}
                        </span>
                      ) : null}
                    </span>

                    <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                      {resource.title}
                    </span>

                    <span className="text-[0.8125rem] leading-relaxed text-muted">
                      {truncate(resource.summary, 116)}
                    </span>

                    {sharedTags.length > 0 ? (
                      <span className="mt-auto flex flex-wrap gap-1 pt-1">
                        {sharedTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} tone="neutral" size="sm" variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* -------------------------------------------------------- used in */}
      {uses.any ? (
        <section
          aria-labelledby="related-used-in"
          className={cn(related.length === 0 && "lg:col-span-2")}
        >
          <h2
            id="related-used-in"
            className="font-display text-xl leading-tight font-bold text-ink"
          >
            Used in
          </h2>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
            Everywhere else on the site that points back at this page.
          </p>

          <div className="mt-5 space-y-5">
            {uses.caseStudies.length > 0 ? (
              <UseGroup
                icon={TrendingUp}
                tone="good"
                title={`${uses.caseStudies.length} case ${uses.caseStudies.length === 1 ? "study" : "studies"}`}
              >
                {uses.caseStudies.map((use) => (
                  <UseRow
                    key={use.study.id}
                    href={`/case-studies/${use.study.id}`}
                    title={use.study.title}
                    note={use.note}
                  />
                ))}
              </UseGroup>
            ) : null}

            {uses.paths.length > 0 ? (
              <UseGroup
                icon={Route}
                tone="brand"
                title={`${uses.paths.length} learning ${uses.paths.length === 1 ? "path" : "paths"}`}
              >
                {uses.paths.map((use) => (
                  <UseRow
                    key={use.path.id}
                    href={use.path.href}
                    title={use.path.shortTitle}
                    eyebrow={`Step ${use.position} of ${use.path.stepCount}`}
                    note={use.why}
                  />
                ))}
              </UseGroup>
            ) : null}

            {uses.quizQuestions.length > 0 ? (
              <UseGroup
                icon={Target}
                tone="ember"
                title={`${uses.quizQuestions.length} quiz ${uses.quizQuestions.length === 1 ? "question" : "questions"}`}
              >
                {uses.quizQuestions.slice(0, 4).map((use) => (
                  <UseRow
                    key={use.question.id}
                    href={`/quizzes/${use.quizId}`}
                    title={truncate(use.question.question, 92)}
                    eyebrow={use.quizTitle}
                  />
                ))}
                {uses.quizQuestions.length > 4 ? (
                  <li className="px-4 py-2.5 text-[0.8125rem] text-faint">
                    and {uses.quizQuestions.length - 4} more across the question bank
                  </li>
                ) : null}
              </UseGroup>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );

  return (
    <div className={cn("pb-14 print:hidden sm:pb-16", className)}>
      {contained ? <Container width="wide">{body}</Container> : body}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

function UseGroup({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: typeof Route;
  tone: "brand" | "ember" | "good";
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <h3 className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            TONE_SOFT_BG[tone],
          )}
        >
          <Icon className={cn("size-3.5", TONE_ICON[tone])} aria-hidden="true" />
        </span>
        <span className="font-display text-[0.8125rem] font-semibold text-ink">{title}</span>
      </h3>
      <ul className="divide-y divide-hairline">{children}</ul>
    </div>
  );
}

function UseRow({
  href,
  title,
  eyebrow,
  note,
}: {
  href: string;
  title: string;
  eyebrow?: string;
  note?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        {eyebrow ? (
          <span className="font-mono text-[0.625rem] tracking-[0.1em] text-faint uppercase">
            {eyebrow}
          </span>
        ) : null}
        <span className="flex items-start gap-1.5 text-[0.8125rem] leading-snug font-medium text-ink group-hover:text-brand">
          {title}
          <ArrowUpRight
            className="mt-0.5 size-3.5 shrink-0 text-faint group-hover:text-brand"
            aria-hidden="true"
          />
        </span>
        {note ? (
          <span className="text-xs leading-relaxed text-muted">{note}</span>
        ) : null}
      </Link>
    </li>
  );
}
