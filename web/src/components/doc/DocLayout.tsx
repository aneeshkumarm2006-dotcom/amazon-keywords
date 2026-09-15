import { ArrowLeft, ArrowRight, Clock, Printer, Tag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { ResourceActions } from "@/components/progress/ResourceActions";
import { Badge } from "@/components/ui/Badge";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { KIND_META } from "@/content/registry";
import { cn, formatMinutes, humanize } from "@/lib/utils";
import type { DocResource } from "@/types/content";

import { Markdown } from "./Markdown";
import { extractToc, type TocItem } from "./slug";
import { Toc, TocDisclosure } from "./Toc";

export interface DocNeighbour {
  id: string;
  title: string;
}

export interface DocLayoutProps {
  doc: DocResource;
  /** Index route for the domain, e.g. "/sops". */
  basePath: string;
  /** How the index is named in the breadcrumb trail, e.g. "SOPs". */
  indexLabel: string;
  /** Position within the domain, for the "3 of 8" readout. */
  position?: { index: number; total: number };
  previous?: DocNeighbour;
  next?: DocNeighbour;
  /**
   * Contents entries for anything rendered in `children`, prepended to the
   * headings extracted from the markdown so the rail covers the whole page.
   */
  tocPrefix?: TocItem[];
  /** Rendered above the markdown body — workflow diagrams, key-figure rows. */
  children?: ReactNode;
}

/**
 * The shared reading frame for every long-form document: contents rail, meta
 * sidebar, tags, and previous/next within the same domain.
 *
 * Print behaviour is handled with Tailwind's `print:` variants rather than a
 * global stylesheet: the rails, breadcrumbs and pager drop out and the body
 * runs full width, so a printed SOP is the document and nothing else.
 */
export function DocLayout({
  doc,
  basePath,
  indexLabel,
  position,
  previous,
  next,
  tocPrefix,
  children,
}: DocLayoutProps) {
  const toc = [...(tocPrefix ?? []), ...extractToc(doc.body)];
  const kind = KIND_META[doc.kind];
  const KindIcon = kind.icon;
  const metaEntries = Object.entries(doc.meta ?? {});

  return (
    <article>
      {/* ---------------------------------------------------------- header */}
      <header className="border-b border-hairline bg-surface print:border-0">
        <Container width="wide" className="py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { label: indexLabel, href: basePath },
              { label: doc.title },
            ]}
            className="mb-5 print:hidden"
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-lg",
                    TONE_SOFT_BG[kind.accent],
                  )}
                >
                  <KindIcon
                    className={cn("size-4", TONE_ICON[kind.accent])}
                    aria-hidden="true"
                  />
                </span>
                <span className="font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-muted uppercase">
                  {kind.label}
                  {position ? ` ${position.index} of ${position.total}` : ""}
                </span>
              </div>

              <h1 className="text-[1.75rem] leading-[1.15] font-bold text-ink sm:text-4xl">
                {doc.title}
              </h1>

              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                {doc.summary}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge tone="neutral" size="sm" icon={Clock}>
                  {formatMinutes(doc.minutes)} read
                </Badge>
                {doc.level ? (
                  <Badge tone={kind.accent} size="sm" variant="outline">
                    {humanize(doc.level)}
                  </Badge>
                ) : null}
                {doc.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`${basePath}?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex h-6 items-center gap-1 rounded-full border border-hairline bg-surface-2 px-2 text-xs text-muted transition-colors hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Tag className="size-3" aria-hidden="true" />
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {metaEntries.length > 0 ? (
              <dl className="grid w-full shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3 lg:w-72 lg:grid-cols-2">
                {metaEntries.map(([label, value]) => (
                  <div key={label} className="bg-surface px-3 py-2.5">
                    <dt className="text-[0.625rem] font-medium tracking-[0.1em] text-faint uppercase">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-[0.8125rem] leading-snug font-medium text-ink">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </Container>
      </header>

      {/* ----------------------------------------------------------- body */}
      <Container width="wide" className="py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12 xl:gap-16">
          <div className="min-w-0">
            <ResourceActions
              href={`${basePath}/${doc.id}`}
              title={doc.title}
              className="mb-8 print:hidden"
            />

            <TocDisclosure items={toc} className="mb-8 lg:hidden" />

            {children ? <div className="mb-10">{children}</div> : null}

            <Markdown>{doc.body}</Markdown>

            <p className="mt-12 flex flex-wrap items-center gap-2 border-t border-hairline pt-5 text-xs text-faint print:hidden">
              <Printer className="size-3.5" aria-hidden="true" />
              This page is print-ready — the rails and navigation drop out
              automatically.
            </p>
          </div>

          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24">
              <Toc items={toc} />
            </div>
          </aside>
        </div>

        {/* ----------------------------------------------------- pagination */}
        {previous || next ? (
          <nav
            aria-label={`More ${indexLabel.toLowerCase()}`}
            className="mt-14 grid gap-3 border-t border-hairline pt-8 sm:grid-cols-2 print:hidden"
          >
            {previous ? (
              <Link
                href={`${basePath}/${previous.id}`}
                className="group flex flex-col gap-1 rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.1em] text-faint uppercase">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Previous
                </span>
                <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}

            {next ? (
              <Link
                href={`${basePath}/${next.id}`}
                className="group flex flex-col items-end gap-1 rounded-xl border border-hairline bg-surface p-4 text-right transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.1em] text-faint uppercase">
                  Next
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
                <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                  {next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </Container>
    </article>
  );
}
