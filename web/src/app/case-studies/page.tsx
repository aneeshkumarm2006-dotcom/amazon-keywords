import { Banknote, Layers, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Suspense } from "react";

import { CaseStudyGallery } from "@/components/case-study/CaseStudyGallery";
import { galleryItems, libraryStats } from "@/components/case-study/data";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { RESULT_TYPE_LABEL, RESULT_TYPE_ORDER } from "@/content/case-studies";
import { pageMetadata } from "@/lib/site";
import { formatCurrency } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Case studies",
  description:
    "Twelve Amazon PPC accounts with their real before and after numbers: a 93% ACoS supplement brand made profitable, a 90-day product launch, a $62,000 Q4, a 2,412-ASIN automotive catalogue, a Subscribe & Save consumable and a runaway-auto-campaign rescue. Each one with the challenge, the exact steps, a month-by-month timeline and the lessons.",
  path: "/case-studies",
  keywords: [
    "Amazon PPC case study",
    "ACoS turnaround",
    "PPC account restructure",
    "product launch PPC",
    "Q4 Amazon advertising",
  ],
});

const items = galleryItems();
const stats = libraryStats();

export default function CaseStudiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Train"
        title="Case studies"
        description="Twelve accounts, each one written the way you would have to explain it to a client: what was broken, what you changed in which week, what the spend and the revenue did afterwards, and what you would do differently. Every timeline is arithmetically consistent — ACoS on any row is that row's spend divided by that row's revenue — so you can argue with the numbers rather than take them on faith."
        breadcrumbs={[{ label: "Case studies" }]}
        width="wide"
        actions={
          <ButtonLink href="/case-studies/compare" variant="secondary" icon={Scale}>
            Compare accounts
          </ButtonLink>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Accounts"
            value={stats.studies}
            icon={Layers}
            tone="good"
            hint={`Across ${stats.categories} product categories`}
          />
          <StatTile
            label="Median ACoS drop"
            value={stats.medianAcosDropPoints}
            unit="pts"
            icon={TrendingDown}
            tone="brand"
            hint="Half the accounts improved by more than this"
          />
          <StatTile
            label="Ad spend tracked"
            value={formatCurrency(stats.totalSpend, 0)}
            icon={Banknote}
            tone="ember"
            hint={`${stats.timelinePoints} reporting periods in total`}
          />
          <StatTile
            label="Ad revenue tracked"
            value={formatCurrency(stats.totalRevenue, 0)}
            icon={TrendingUp}
            tone="info"
            hint={`${stats.blendedAcos}% blended ACoS across the library`}
          />
        </div>

        <Callout variant="info" title="How to read a case study without fooling yourself" className="mb-8">
          <p>
            Start with the timeline chart, not the headline. A number that improves in a straight
            line usually means someone cut spend; a number that gets worse before it gets better
            usually means someone fixed something real. Two studies here deliberately show ACoS
            rising first — the Subscribe &amp; Save consumable and the 90-day launch — and both
            finish ahead of where they started.
          </p>
          <p>
            The six result types are{" "}
            {RESULT_TYPE_ORDER.map((type) => RESULT_TYPE_LABEL[type].toLowerCase()).join(", ")}.
            Filter by the one you are about to be asked about in an interview.
          </p>
        </Callout>

        <Suspense
          fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}
        >
          <CaseStudyGallery items={items} />
        </Suspense>
      </Container>
    </>
  );
}
