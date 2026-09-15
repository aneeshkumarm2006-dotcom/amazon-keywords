
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { TacosCalculator } from "@/components/calc/TacosCalculator";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("tacos");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/tacos",
  type: "article",
  section: "Calculators",
  keywords: ["TACoS calculator", "total advertising cost of sale", "organic sales", "Amazon PPC reporting", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <TacosCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
