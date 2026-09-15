import { Briefcase, GraduationCap, TrendingUp, Wallet } from "lucide-react";
import { Suspense } from "react";

import { toIndexItems } from "@/components/doc/data";
import { DocIndex } from "@/components/doc/DocIndex";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { careerGuides } from "@/content/career";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Career",
  description:
    "Four career resources for Filipino VAs moving into Amazon PPC: the four-level career guide with salary bands, a resume template, a portfolio template with three worked case studies, and the 2026 salary and negotiation guide.",
  path: "/career",
  keywords: [
    "Amazon PPC salary",
    "VA to PPC specialist",
    "PPC resume",
    "PPC portfolio",
    "freelance rate negotiation",
  ],
});

const items = toIndexItems(careerGuides);

const LADDER: {
  level: string;
  timeline: string;
  php: string;
  usd: string;
}[] = [
  { level: "General VA", timeline: "Starting point", php: "15,000 - 25,000", usd: "$270 - $450" },
  { level: "PPC Junior", timeline: "6-12 months", php: "25,000 - 40,000", usd: "$450 - $720" },
  { level: "PPC Specialist", timeline: "12-18 months", php: "40,000 - 65,000", usd: "$720 - $1,170" },
  { level: "Senior Specialist", timeline: "18-24 months", php: "65,000 - 100,000", usd: "$1,170 - $1,800" },
  { level: "PPC Manager / Lead", timeline: "24+ months", php: "80,000 - 150,000+", usd: "$1,440 - $2,700+" },
];

export default function CareerPage() {
  return (
    <>
      <PageHeader
        eyebrow="Career"
        title="From VA to PPC specialist"
        description="The ladder, the money, and the two documents that decide whether you get the interview. Four resources covering what to learn at each level, what to charge for it, how to write a resume that survives an applicant tracking system, and how to build a portfolio that proves the numbers."
        breadcrumbs={[{ label: "Career" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Resources"
            value={careerGuides.length}
            icon={GraduationCap}
            tone="ember"
            hint="Guide, resume, portfolio, salary"
          />
          <StatTile
            label="Career levels"
            value={4}
            icon={TrendingUp}
            tone="brand"
            hint="Junior to manager"
          />
          <StatTile
            label="Salary markets"
            value={4}
            icon={Wallet}
            tone="good"
            hint="PH, US, AU, EU rates"
          />
          <StatTile
            label="Worked case studies"
            value={3}
            icon={Briefcase}
            tone="info"
            hint="Launch, restructure, Q4"
          />
        </div>

        <section aria-labelledby="ladder-heading" className="mb-10">
          <h2
            id="ladder-heading"
            className="mb-3 font-display text-lg font-bold text-ink"
          >
            The ladder at a glance
          </h2>
          <Table caption="Amazon PPC career levels with 2026 monthly salary bands for Philippine-based specialists">
            <THead>
              <TR>
                <TH>Level</TH>
                <TH>Time to reach</TH>
                <TH numeric>Monthly (PHP)</TH>
                <TH numeric>Monthly (USD)</TH>
              </TR>
            </THead>
            <TBody>
              {LADDER.map((row) => (
                <TR key={row.level}>
                  <THRow>{row.level}</THRow>
                  <TD className="text-muted">{row.timeline}</TD>
                  <TD numeric mono>
                    {row.php}
                  </TD>
                  <TD numeric mono className="text-muted">
                    {row.usd}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="mt-2.5 text-xs text-faint">
            2026 market ranges for Philippine-based specialists. Remote employers in the US, AU
            and EU pay materially more for the same skill — the full rate tables are in the
            salary and negotiation guide.
          </p>
        </section>

        <Suspense fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}>
          <DocIndex
            items={items}
            basePath="/career"
            noun={["resource", "resources"]}
            accent="ember"
            cardMetaCount={2}
            storageKey="view:career"
          />
        </Suspense>
      </Container>
    </>
  );
}
