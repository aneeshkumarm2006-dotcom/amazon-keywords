
import { BidCalculator } from "@/components/calc/BidCalculator";
import { CalculatorFrame } from "@/components/calc/CalculatorFrame";
import { PageFeedback } from "@/components/community/PageFeedback";
import { requireCalculator } from "@/content/calculators";
import { pageMetadata } from "@/lib/site";

const calculator = requireCalculator("bid");

export const metadata = pageMetadata({
  title: calculator.title,
  description: `${calculator.question} ${calculator.summary}`,
  socialTitle: `${calculator.title} · PPC Academy`,
  path: "/calculators/bid",
  type: "article",
  section: "Calculators",
  keywords: ["Amazon bid calculator", "max CPC", "match type bids", "placement adjustment", ...calculator.tags],
});

export default function Page() {
  return (
    <>
      <CalculatorFrame calculator={calculator}>
        <BidCalculator />
      </CalculatorFrame>
      <PageFeedback href={calculator.href} title={calculator.title} kind="Calculator" />
    </>
  );
}
