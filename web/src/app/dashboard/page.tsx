import { ConsoleOverview } from "@/components/ppc/ConsoleOverview";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Overview · PPC Console",
  description:
    "A personal Amazon PPC console: every store side by side with KPIs, daily trends, alerts, wasted spend, harvest opportunity and the top recommended actions. Data stays in your browser.",
  path: "/dashboard",
  noindex: true,
});

export default function ConsoleOverviewPage() {
  return <ConsoleOverview />;
}
