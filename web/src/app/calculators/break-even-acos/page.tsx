
import { BreakEvenAcosCalculator } from "@/components/calc/BreakEvenAcosCalculator";
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("break-even-acos");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/break-even-acos",
  type: "article",
  section: "Calculators",
  keywords: ["break-even ACoS", "target ACoS", "break-even CPC", "profit margin", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <BreakEvenAcosCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
