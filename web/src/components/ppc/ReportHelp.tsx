import { Accordion } from "@/components/ui/Accordion";

const STEP_LIST = "list-decimal space-y-1.5 pl-5 marker:text-faint";

/**
 * Where the two files come from. Kept short and hedged: Amazon renames
 * menus often and the layout differs slightly between accounts and regions.
 */
export function ReportHelp({ className }: { className?: string }) {
  return (
    <section aria-labelledby="report-help-heading" className={className}>
      <h2 id="report-help-heading" className="mb-3 font-display text-lg font-semibold text-ink">
        How to download these reports from Amazon
      </h2>
      <Accordion
        items={[
          {
            id: "str",
            title: "Search Term Report (Sponsored Products)",
            content: (
              <div className="space-y-3 text-ink">
                <ol className={STEP_LIST}>
                  <li>
                    In the Amazon Ads console, open <strong>Measurement &amp; Reporting → Sponsored ads reports</strong>{" "}
                    and click <strong>Create report</strong>.
                  </li>
                  <li>
                    Campaign type <strong>Sponsored Products</strong>, report type <strong>Search term</strong>, time unit{" "}
                    <strong>Daily</strong>.
                  </li>
                  <li>
                    Report period <strong>Last 60 days</strong>. The rules look back 30 days after skipping the newest 2
                    (sales still arriving), and bid changes need 14 days of history.
                  </li>
                  <li>
                    Run it, wait for <em>Completed</em>, then download as <strong>.xlsx</strong> or <strong>.csv</strong> and
                    drop it above. Importing an overlapping report later only adds or updates the changed rows.
                  </li>
                </ol>
                <p className="text-muted">
                  Daily beats Summary: summary rows cover a whole period, so date windows and trends get coarser. Mixing
                  them is safe — overlapping days are counted once (daily rows first, then the newest summary).
                </p>
              </div>
            ),
          },
          {
            id: "bulk",
            title: "Bulk file (campaigns, keywords, bids and IDs)",
            content: (
              <div className="space-y-3 text-ink">
                <ol className={STEP_LIST}>
                  <li>
                    In <strong>Campaign manager</strong>, open <strong>Bulk operations</strong> (in the left menu or the
                    Sponsored ads menu).
                  </li>
                  <li>
                    Under <strong>Create spreadsheet for download</strong>, include <strong>Sponsored Products data</strong>{" "}
                    and leave <strong>Include terminated campaigns</strong> off. If it is offered, keep campaign items with
                    zero impressions included so every keyword has its ID.
                  </li>
                  <li>
                    Create the spreadsheet, then download the <strong>.xlsx</strong> and drop the whole workbook above — the
                    console reads the <em>Sponsored Products Campaigns</em> sheet.
                  </li>
                </ol>
                <p className="text-muted">
                  The bulk file supplies current bids and the campaign / ad group / keyword IDs that exports need. It is a
                  snapshot, so the latest bulk file for a store replaces the previous one.
                </p>
              </div>
            ),
          },
        ]}
      />
      <p className="mt-2 text-xs text-faint">
        Menu names move around between Amazon accounts and regions; if yours differ slightly, look for the same words.
      </p>
    </section>
  );
}
