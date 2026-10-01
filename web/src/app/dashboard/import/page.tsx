import { ImportConsole } from "@/components/ppc/ImportConsole";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Import reports · PPC Console",
  description:
    "Drop Amazon Search Term Reports and bulk files (CSV or XLSX). The console detects the report, previews the rows and imports them into a store — all inside your browser.",
  path: "/dashboard/import",
  noindex: true,
});

export default function ImportPage() {
  return <ImportConsole />;
}
