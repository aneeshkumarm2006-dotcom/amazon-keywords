import { Command, Layers, Tags, Zap } from "lucide-react";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { SearchApp } from "@/components/search/SearchApp";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { KIND_ORDER, allResources, allTags } from "@/content/registry";
import { pageMetadata } from "@/lib/site";

const TOTAL = allResources.length;
const KINDS = new Set(allResources.map((resource) => resource.kind)).size;
const TAGS = allTags().length;
const KIND_TOTAL = KIND_ORDER.length;

export const metadata = pageMetadata({
  title: "Search",
  description: `Full-text search across all ${TOTAL} PPC Academy resources — SOPs, workflows, templates, automation guides, cheat sheets, career guides and the glossary. Filter by type, level and tag; everything is indexed in the browser, so results are instant and work offline.`,
  path: "/search",
  keywords: ["Amazon PPC search", "PPC glossary lookup", "SOP search", "PPC reference"],
});

export default function SearchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Find anything"
        title="Search the whole library"
        description="One box across every quiz, SOP, workflow, template, automation guide, cheat sheet, career guide and glossary term. Titles are weighted heaviest, then tags, then summaries, then the full text of each document — so a half-remembered phrase from the middle of an SOP still finds it."
        breadcrumbs={[{ label: "Search" }]}
        width="wide"
        meta={
          <>
            <Badge tone="brand" icon={Layers}>
              {TOTAL} resources indexed
            </Badge>
            <Badge tone="neutral" icon={Tags}>
              {TAGS} tags
            </Badge>
            <Badge tone="neutral" icon={Zap}>
              {KINDS} of {KIND_TOTAL} types live
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-faint">
              <Command className="size-3.5" aria-hidden="true" />
              Press
              <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem]">
                /
              </kbd>
              anywhere for the command palette
            </span>
          </>
        }
      />

      <Container width="wide" className="pt-2 pb-12 sm:pb-16">
        {/*
          `SearchApp` reads the `q`, `kind`, `level`, `tag` and `sort` params
          through `useSearchParams`, which under static export is empty during
          the prerender and fills in on the client — so it needs a boundary.
        */}
        <Suspense fallback={<SearchSkeleton />}>
          <SearchApp />
        </Suspense>
      </Container>
    </>
  );
}

/** Matches the island's own layout so the page does not jump when it mounts. */
function SearchSkeleton() {
  return (
    <div>
      <div className="mb-6 border-b border-hairline py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-12 flex-1" label="Loading search" />
          <Skeleton className="h-11 w-40 shrink-0" />
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <div className="mb-6 hidden flex-col gap-2 lg:mb-0 lg:flex">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
