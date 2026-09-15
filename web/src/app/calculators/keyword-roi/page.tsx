
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { KeywordRoiCalculator } from "@/components/calc/KeywordRoiCalculator";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("keyword-roi");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/keyword-roi",
  type: "article",
  section: "Calculators",
  keywords: ["keyword ROI", "search term report", "negative keywords", "keyword harvesting", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <KeywordRoiCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
