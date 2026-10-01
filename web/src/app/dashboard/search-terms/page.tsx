import { ExplorerConsole } from "@/components/ppc/explorer/ExplorerConsole";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Search terms · PPC Console",
  description:
    "Explore every search term and target from your Sponsored Products reports: filters, winner / bleeder presets, sortable columns, daily trends and CSV export.",
  path: "/dashboard/search-terms",
  noindex: true,
});

export default function SearchTermsPage() {
  // `?campaign=` is read on the client by useLocationSearch, so no Suspense
  // boundary (and no client-rendering bailout) is needed.
  return <ExplorerConsole />;
}
