import { BidsConsole } from "@/components/ppc/bids/BidsConsole";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Bids · PPC Console",
  description:
    "Break-even and target ACoS from unit economics, the Bid-Calculator workbook (max CPC, conservative / recommended / aggressive bids, match-type bids, CVR sensitivity) and the bid maths for every target.",
  path: "/dashboard/bids",
  noindex: true,
});

export default function BidsPage() {
  return <BidsConsole />;
}
