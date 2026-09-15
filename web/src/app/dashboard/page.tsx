import { Lock } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Dashboard } from "@/components/progress/Dashboard";
import { Badge } from "@/components/ui/Badge";
import { TOTAL_INTERVIEW_QUESTIONS } from "@/content/interviews";
import { paths } from "@/content/paths";
import { TOTAL_QUESTIONS } from "@/content/quizzes";
import { trackedResources } from "@/lib/progress-scope";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Dashboard",
  description:
    "Your PPC Academy progress: resources completed, quiz scores and topic mastery, mock interview results, learning path progress, streak and XP. Everything is stored in your own browser and exportable as JSON.",
  path: "/dashboard",
  keywords: ["PPC training progress", "quiz scores", "learning dashboard"],
});

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Career"
        title="Your dashboard"
        description="One page for everything you have done here: what you have read, what you have been tested on, where you are weak, and how far through each learning path you are. There is no account — it is all computed from records kept in this browser, and you can export the lot as a JSON file."
        width="wide"
        breadcrumbs={[{ label: "Dashboard" }]}
        meta={
          <>
            <Badge tone="good" variant="soft" icon={Lock}>
              Local only · nothing uploaded
            </Badge>
            <Badge tone="neutral" variant="outline">
              {trackedResources.length} trackable resources
            </Badge>
            <Badge tone="neutral" variant="outline">
              {TOTAL_QUESTIONS} quiz questions
            </Badge>
            <Badge tone="neutral" variant="outline">
              {TOTAL_INTERVIEW_QUESTIONS} interview questions
            </Badge>
            <Badge tone="neutral" variant="outline">
              {paths.length} learning paths
            </Badge>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <Dashboard />
      </Container>
    </>
  );
}
