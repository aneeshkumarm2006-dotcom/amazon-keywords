import { KeywordsConsole } from "@/components/ppc/keywords/KeywordsConsole";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Keywords · PPC Console",
  description:
    "Harvest, negative and bid recommendations from your search term data, each explained with the numbers behind it — approve, edit bids and export an Amazon bulk sheet.",
  path: "/dashboard/keywords",
  noindex: true,
});

export default function KeywordsPage() {
  // `?view=` / `?q=` are read on the client by useLocationSearch, so no
  // Suspense boundary (and no client-rendering bailout) is needed.
  return <KeywordsConsole />;
}
