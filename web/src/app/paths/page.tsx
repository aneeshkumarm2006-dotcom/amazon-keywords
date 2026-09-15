import { ArrowRight, Layers, ListChecks, Repeat2 } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { PathGallery } from "@/components/progress/PathGallery";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { TOTAL_PATH_RESOURCES, TOTAL_PATH_STEPS, paths } from "@/content/paths";
import { allResources } from "@/content/registry";
import { pageMetadata } from "@/lib/site";
import { breadcrumbNode, itemListNode } from "@/lib/structured-data";
import { cn, formatMinutes } from "@/lib/utils";
import type { Tone } from "@/types/content";

export const metadata = pageMetadata({
  title: "Learning paths",
  description:
    "Four guided routes through PPC Academy: VA to PPC Specialist in 30 days, Interview Ready in 2 weeks, the Daily Operator Playbook, and Advanced Optimization. Every step links to a real resource and ticks off against your dashboard.",
  path: "/paths",
  keywords: [
    "Amazon PPC learning path",
    "PPC training plan",
    "VA to PPC specialist",
    "PPC interview preparation",
  ],
});

const HOW_IT_WORKS: { title: string; body: string; icon: typeof Layers; tone: Tone }[] = [
  {
    title: "A reading order, not new material",
    body: "Every step points at an SOP, workflow, quiz, calculator, case study or interview question that already exists in the library. A path is the sequence a PPC lead would teach it in.",
    icon: Layers,
    tone: "brand",
  },
  {
    title: "One tick, counted once",
    body: "Marking a step complete marks the resource complete everywhere — on its own page, on your dashboard, and in any other path that uses it. Nothing is double-counted.",
    icon: ListChecks,
    tone: "info",
  },
  {
    title: "Come back in any order",
    body: "Progress is saved in this browser as you go, so you can leave mid-module. The path reopens at the first thing you have not finished.",
    icon: Repeat2,
    tone: "ember",
  },
];

export default function PathsPage() {
  const totalMinutes = paths.reduce((sum, path) => sum + path.minutes, 0);

  return (
    <>
      <JsonLd
        id="paths-list"
        data={[
          itemListNode(
            paths.map((path) => ({ name: path.title, path: path.href })),
            "/paths",
            "PPC Academy learning paths",
          ),
          breadcrumbNode([{ name: "Learning paths" }], "/paths"),
        ]}
      />

      <PageHeader
        eyebrow="Train"
        title="Learning paths"
        description={`The library runs to ${allResources.length} resources, which is useless if you do not know what to read first. These four paths answer four different questions — where do I start, I have an interview on Thursday, what do I actually do each day, and how do I get paid like a senior.`}
        width="wide"
        breadcrumbs={[{ label: "Learning paths" }]}
        meta={
          <>
            <Badge tone="brand" variant="soft">
              {paths.length} paths
            </Badge>
            <Badge tone="neutral" variant="outline">
              {TOTAL_PATH_STEPS} steps
            </Badge>
            <Badge tone="neutral" variant="outline">
              {TOTAL_PATH_RESOURCES} distinct resources
            </Badge>
            <Badge tone="neutral" variant="outline">
              {formatMinutes(totalMinutes)} of study
            </Badge>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <PathGallery />

        <section
          aria-labelledby="how-paths-work"
          className="mt-12 border-t border-hairline pt-8"
        >
          <h2 id="how-paths-work" className="text-xl leading-tight font-bold text-ink sm:text-2xl">
            How paths work
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.title} className="rounded-xl border border-hairline bg-surface p-5">
                <span
                  className={cn(
                    "mb-3 flex size-9 items-center justify-center rounded-lg",
                    TONE_SOFT_BG[item.tone],
                  )}
                  aria-hidden="true"
                >
                  <item.icon className={cn("size-[1.125rem]", TONE_ICON[item.tone])} />
                </span>
                <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[0.875rem] text-muted">
            Progress lives in this browser only.{" "}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 font-medium text-brand underline decoration-hairline-strong underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Your dashboard
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>{" "}
            has the export button if you move machines.
          </p>
        </section>
      </Container>
    </>
  );
}
