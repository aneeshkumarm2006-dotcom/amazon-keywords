import { ArrowLeft, ArrowRight, Clock, Layers, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { PathDetail } from "@/components/progress/PathDetail";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { findPath, paths } from "@/content/paths";
import { pageMetadata } from "@/lib/site";
import { breadcrumbNode, courseNode } from "@/lib/structured-data";
import { formatMinutes, humanize } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return paths.map((path) => ({ id: path.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const path = findPath(id);

  if (!path) return { title: "Learning path not found" };

  return pageMetadata({
    title: path.title,
    description: path.summary,
    path: path.href,
    type: "article",
    section: "Learning paths",
    keywords: ["Amazon PPC learning path", path.shortTitle, path.level, "PPC training"],
  });
}

export default async function PathPage({ params }: Params) {
  const { id } = await params;
  const path = findPath(id);

  if (!path) notFound();

  const index = paths.findIndex((entry) => entry.id === path.id);
  const previous = index > 0 ? paths[index - 1] : undefined;
  const next = index < paths.length - 1 ? paths[index + 1] : undefined;

  return (
    <>
      <JsonLd
        id="path-course"
        data={[
          courseNode({
            name: path.title,
            description: path.summary,
            path: path.href,
            minutes: path.minutes,
            level: humanize(path.level),
            outcomes: path.outcomes,
            modules: path.modules.map((module) => ({
              name: module.title,
              description: module.subtitle,
            })),
          }),
          breadcrumbNode(
            [{ name: "Learning paths", path: "/paths" }, { name: path.shortTitle }],
            path.href,
          ),
        ]}
      />

      <PageHeader
        eyebrow={`Learning path · ${path.cadence}`}
        title={path.title}
        description={path.summary}
        width="wide"
        className="print:hidden"
        breadcrumbs={[{ label: "Learning paths", href: "/paths" }, { label: path.shortTitle }]}
        meta={
          <>
            <Badge tone={path.tone} variant="soft">
              {humanize(path.level)}
            </Badge>
            <Badge tone="neutral" variant="outline" icon={Layers}>
              {path.modules.length} modules
            </Badge>
            <Badge tone="neutral" variant="outline" icon={ListChecks}>
              {path.stepCount} steps
            </Badge>
            <Badge tone="neutral" variant="outline" icon={Clock}>
              {formatMinutes(path.minutes)}
            </Badge>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <PathDetail path={path} />

        {previous || next ? (
          <nav
            aria-label="Other learning paths"
            className="mt-12 grid gap-3 border-t border-hairline pt-8 sm:grid-cols-2 print:hidden"
          >
            {previous ? (
              <Link
                href={previous.href}
                className="group flex flex-col gap-1 rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.1em] text-faint uppercase">
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  Previous path
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
                href={next.href}
                className="group flex flex-col items-end gap-1 rounded-xl border border-hairline bg-surface p-4 text-right transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.1em] text-faint uppercase">
                  Next path
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

      <div className="print:hidden">
        <PageFeedback href={`/paths/${path.id}`} title={path.title} kind="Learning path" />
      </div>
    </>
  );
}
