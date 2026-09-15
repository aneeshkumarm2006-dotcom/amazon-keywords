import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

import { CompareView } from "@/components/case-study/CompareView";
import { compareItems } from "@/components/case-study/data";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Compare case studies",
  description:
    "Line up two or three Amazon PPC case studies side by side: starting and final ACoS, ad revenue growth, total spend, blended ROAS and every reported before-and-after metric, with grouped charts and full data tables.",
  path: "/case-studies/compare",
  keywords: [
    "compare Amazon PPC case studies",
    "ACoS benchmark",
    "PPC account comparison",
  ],
});

const items = compareItems();

export default function CompareCaseStudiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Case studies"
        title="Compare accounts"
        description="Two accounts can post the same final ACoS and have almost nothing in common. This view puts their starting points, their trajectories, their budgets and their reported metrics in the same table so you can see which levers actually did the work."
        width="wide"
        breadcrumbs={[{ label: "Case studies", href: "/case-studies" }, { label: "Compare" }]}
        actions={
          <ButtonLink href="/case-studies" variant="secondary" icon={ArrowLeft}>
            Back to the library
          </ButtonLink>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <Callout variant="warn" title="Compare like with like" className="mb-8">
          Reporting periods are not the same length across these accounts — some reported weekly,
          some monthly. Percentage changes and blended figures are comparable; the absolute height
          of a single period is not. The engagement totals row is the fairest way to compare two
          accounts of different sizes.
        </Callout>

        <Suspense
          fallback={
            <div className="h-64 rounded-2xl border border-hairline bg-surface" />
          }
        >
          <CompareView items={items} />
        </Suspense>
      </Container>
    </>
  );
}
