import { StoresConsole } from "@/components/ppc/StoresConsole";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Stores & settings · PPC Console",
  description:
    "Stores, economics, rule thresholds, term lists and harvest destinations for the PPC console, plus exchange rates, backup, restore and reset.",
  path: "/dashboard/stores",
  noindex: true,
});

export default function StoresPage() {
  return <StoresConsole />;
}
