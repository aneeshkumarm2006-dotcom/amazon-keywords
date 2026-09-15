
import { BudgetPlannerCalculator } from "@/components/calc/BudgetPlannerCalculator";
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("budget-planner");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/budget-planner",
  type: "article",
  section: "Calculators",
  keywords: ["PPC budget planner", "daily budget", "70/20/10 rule", "budget allocation", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <BudgetPlannerCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
