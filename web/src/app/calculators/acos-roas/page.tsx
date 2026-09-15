
import { AcosRoasCalculator } from "@/components/calc/AcosRoasCalculator";
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("acos-roas");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/acos-roas",
  type: "article",
  section: "Calculators",
  keywords: ["ACoS calculator", "ROAS calculator", "break-even ACoS", "Amazon PPC profitability", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <AcosRoasCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
