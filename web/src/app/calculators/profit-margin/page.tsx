
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { ProfitMarginCalculator } from "@/components/calc/ProfitMarginCalculator";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("profit-margin");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/profit-margin",
  type: "article",
  section: "Calculators",
  keywords: ["Amazon profit calculator", "FBA fees", "referral fee", "unit economics", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <ProfitMarginCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
