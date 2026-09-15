import type { AutomationScript } from "./scripts-types";

/**
 * SQL and spreadsheet-formula assets.
 *
 * The SQL is written for DuckDB first, because DuckDB reads a downloaded CSV
 * directly and needs no server, no credentials and no client approval. All
 * three queries are plain ANSI SQL apart from the read_csv_auto call, so they
 * paste into BigQuery or Postgres by swapping that one line for a table name.
 */

export const sqlScripts: AutomationScript[] = [
  {
    id: "dayparting-report",
    title: "Dayparting report",
    summary:
      "Pivots an hourly Sponsored Products export into a day-of-week by hour-of-day grid of spend, orders and ACoS, and names the hours worth bidding down.",
    language: "sql",
    difficulty: "advanced",
    href: "/scripts/dayparting-report",
    minutes: 20,
    automates:
      "Building a 168-cell pivot table by hand to answer 'which hours are we wasting money in'.",
    frequency: "Monthly, or before setting up any dayparting rule",
    saves: "90 minutes per analysis",
    prerequisites: [
      "An hourly campaign export with a timestamp column — the bulk API, Amazon Marketing Stream, or an hourly snapshot your tool records",
      "DuckDB installed (a single binary from duckdb.org) or access to BigQuery",
      "At least four weeks of hourly data — one week is not enough to separate a pattern from a Tuesday",
    ],
    fileName: "dayparting_report.sql",
    code: `-- Dayparting report
-- Reads an hourly Sponsored Products export and returns a day-of-week by
-- hour-of-day grid, plus a verdict per hour.
--
-- DuckDB:    duckdb -c ".read dayparting_report.sql"
-- BigQuery:  replace the source CTE with your table name.

WITH source AS (
    SELECT * FROM read_csv_auto('sp-hourly.csv', header = true)
),

typed AS (
    SELECT
        CAST(timestamp AS TIMESTAMP)                AS ts,
        CAST(impressions AS BIGINT)                 AS impressions,
        CAST(clicks AS BIGINT)                      AS clicks,
        CAST(spend AS DOUBLE)                       AS spend,
        CAST(sales AS DOUBLE)                       AS sales,
        CAST(orders AS BIGINT)                      AS orders
    FROM source
    WHERE timestamp IS NOT NULL
),

by_slot AS (
    SELECT
        EXTRACT(DOW  FROM ts)                       AS day_number,
        EXTRACT(HOUR FROM ts)                       AS hour_of_day,
        SUM(impressions)                            AS impressions,
        SUM(clicks)                                 AS clicks,
        SUM(spend)                                  AS spend,
        SUM(sales)                                  AS sales,
        SUM(orders)                                 AS orders
    FROM typed
    GROUP BY 1, 2
),

account AS (
    SELECT
        SUM(spend) AS total_spend,
        CASE WHEN SUM(sales) > 0 THEN SUM(spend) / SUM(sales) ELSE NULL END AS account_acos
    FROM by_slot
),

scored AS (
    SELECT
        CASE day_number
            WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
            WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri'
            ELSE 'Sat'
        END                                         AS day,
        by_slot.day_number,
        by_slot.hour_of_day,
        by_slot.clicks,
        by_slot.orders,
        ROUND(by_slot.spend, 2)                     AS spend,
        ROUND(by_slot.sales, 2)                     AS sales,
        ROUND(100.0 * by_slot.clicks / NULLIF(by_slot.impressions, 0), 2)  AS ctr,
        ROUND(100.0 * by_slot.orders / NULLIF(by_slot.clicks, 0), 2)       AS cvr,
        ROUND(100.0 * by_slot.spend  / NULLIF(by_slot.sales, 0), 1)        AS acos,
        ROUND(100.0 * by_slot.spend  / NULLIF(account.total_spend, 0), 2)  AS share_of_spend,
        account.account_acos
    FROM by_slot CROSS JOIN account
)

SELECT
    day,
    hour_of_day,
    clicks,
    orders,
    spend,
    sales,
    cvr,
    acos,
    share_of_spend,
    CASE
        WHEN clicks < 20                              THEN 'thin data'
        WHEN orders = 0                               THEN 'bid down 50% - no orders'
        WHEN acos > account_acos * 150                THEN 'bid down 30%'
        WHEN acos > account_acos * 120                THEN 'bid down 15%'
        WHEN acos < account_acos * 70 AND orders >= 3 THEN 'bid up 15%'
        ELSE 'hold'
    END                                               AS action
FROM scored
ORDER BY day_number, hour_of_day;
`,
    explanation: [
      {
        lines: "8-10",
        what: "read_csv_auto is the only DuckDB-specific line in the file. It sniffs types from the CSV and lets the rest of the query run against a downloaded report with no import step. Swap this CTE for a table name and everything below is standard SQL.",
      },
      {
        lines: "12-22",
        what: "An explicit CAST layer. Report exports arrive as text, and a silent string comparison on a spend column is the kind of bug that produces a confident wrong answer rather than an error.",
      },
      {
        lines: "24-34",
        what: "The grouping that does the work: day of week and hour of day. Four weeks of data collapses into 168 rows, each one an average of four observations, which is roughly the minimum for a pattern to be visible.",
      },
      {
        lines: "36-42",
        what: "The account CTE computes one number — the blended ACoS — that every row is then compared against. Comparing each hour to the account rather than to a fixed target is what makes the query portable between accounts.",
      },
      {
        lines: "57-60",
        what: "NULLIF on every denominator. An hour with impressions but no clicks divides by zero otherwise, and in SQL that is an error that kills the whole query rather than a single bad cell.",
      },
      {
        lines: "72-79",
        what: "The verdict ladder, checked in order. 'thin data' first means a 3am hour with four clicks can never be told to bid down 50% on the strength of one unlucky click.",
      },
      {
        lines: "74",
        what: "Multiplying account_acos by 150 rather than 1.5 is deliberate: account_acos is a ratio, acos is a percentage, and doing the conversion in the comparison keeps both columns readable in the output.",
      },
    ],
    steps: [
      {
        title: "Get hourly data",
        detail:
          "Standard Amazon reports are daily. Hourly data comes from Amazon Marketing Stream, from a tool that snapshots hourly (Ad Badger and PPC Entourage both do), or from a scheduled hourly pull of the campaign report. Without one of those, this query has nothing to read.",
      },
      {
        title: "Install DuckDB",
        detail:
          "Download the single binary from duckdb.org and put it beside your CSV. No service, no install wizard, no admin rights. On a Mac, brew install duckdb also works.",
      },
      {
        title: "Name the file sp-hourly.csv",
        detail:
          "Or edit line 9. The columns the query needs are timestamp, impressions, clicks, spend, sales and orders — rename yours to match, or alias them in the typed CTE.",
      },
      {
        title: "Run it",
        detail:
          'duckdb -c ".read dayparting_report.sql" prints the 168 rows. Add > dayparting.csv to the end to save them, or wrap the final SELECT in COPY (...) TO \'dayparting.csv\' to write it from inside the query.',
      },
      {
        title: "Act on the block, not the hour",
        detail:
          "Amazon dayparting works in blocks, and a single bad hour surrounded by good ones is noise. Look for three or more consecutive hours with the same verdict before changing anything.",
      },
    ],
    expectedOutput: `day  hour  clicks  orders   spend    sales   cvr   acos  share  action
Mon     0       8       0    6.84     0.00  0.00        0.34  thin data
Mon     1       4       0    3.12     0.00  0.00        0.16  thin data
Mon     9      64       7   54.40   209.93 10.94   25.9   2.71  hold
Mon    10      81       9   70.47   269.91 11.11   26.1   3.51  hold
Mon    19     112       4   98.56   119.96  3.57   82.2   4.91  bid down 30%
Mon    20      97       2   86.33    59.98  2.06  143.9   4.30  bid down 30%
Mon    21      74       0   65.86     0.00  0.00        3.28  bid down 50% - no orders
Tue     9      59       8   49.56   239.92 13.56   20.7   2.47  bid up 15%

Account ACoS across all slots: 38.4%`,
    outputNote:
      "The 19:00-22:00 block is the classic finding: heavy click volume, poor conversion, a fifth of the spend. Those three hours are usually browsers on a phone in bed, and bidding them down 30% is the single highest-return dayparting change on most accounts.",
    tags: ["dayparting", "sql", "duckdb", "hourly", "analysis"],
    related: ["placement-performance-pivot", "budget-pacing-alert", "bid-adjuster-acos-bands"],
  },

  {
    id: "placement-performance-pivot",
    title: "Placement performance pivot",
    summary:
      "Turns a placement report into one row per campaign with top of search, rest of search and product pages side by side, and computes the placement multiplier each one actually justifies.",
    language: "sql",
    difficulty: "intermediate",
    href: "/scripts/placement-performance-pivot",
    minutes: 15,
    automates:
      "Reading a three-rows-per-campaign placement report and mentally transposing it to decide a bid adjustment.",
    frequency: "Monthly",
    saves: "45 minutes, and the placement modifiers most accounts never set",
    prerequisites: [
      "A Sponsored Products placement report exported as CSV",
      "DuckDB, BigQuery, or any SQL engine — the query is standard apart from the CSV read",
      "A target ACoS per campaign, or the account blended target",
    ],
    fileName: "placement_performance_pivot.sql",
    code: `-- Placement performance pivot
-- One row per campaign, three placements across, plus the multiplier each
-- placement's own performance justifies against your target ACoS.

WITH source AS (
    SELECT * FROM read_csv_auto('placement-report.csv', header = true)
),

typed AS (
    SELECT
        campaign_name,
        CASE
            WHEN LOWER(placement) LIKE '%top of search%'  THEN 'tos'
            WHEN LOWER(placement) LIKE '%product page%'   THEN 'pdp'
            WHEN LOWER(placement) LIKE '%rest of search%' THEN 'ros'
            ELSE 'other'
        END                                     AS slot,
        CAST(impressions AS BIGINT)             AS impressions,
        CAST(clicks AS BIGINT)                  AS clicks,
        CAST(spend AS DOUBLE)                   AS spend,
        CAST(sales AS DOUBLE)                   AS sales,
        CAST(orders AS BIGINT)                  AS orders
    FROM source
    WHERE placement IS NOT NULL
),

pivoted AS (
    SELECT
        campaign_name,
        SUM(CASE WHEN slot = 'tos' THEN spend  ELSE 0 END) AS tos_spend,
        SUM(CASE WHEN slot = 'tos' THEN sales  ELSE 0 END) AS tos_sales,
        SUM(CASE WHEN slot = 'tos' THEN clicks ELSE 0 END) AS tos_clicks,
        SUM(CASE WHEN slot = 'tos' THEN orders ELSE 0 END) AS tos_orders,
        SUM(CASE WHEN slot = 'ros' THEN spend  ELSE 0 END) AS ros_spend,
        SUM(CASE WHEN slot = 'ros' THEN sales  ELSE 0 END) AS ros_sales,
        SUM(CASE WHEN slot = 'ros' THEN clicks ELSE 0 END) AS ros_clicks,
        SUM(CASE WHEN slot = 'pdp' THEN spend  ELSE 0 END) AS pdp_spend,
        SUM(CASE WHEN slot = 'pdp' THEN sales  ELSE 0 END) AS pdp_sales,
        SUM(CASE WHEN slot = 'pdp' THEN clicks ELSE 0 END) AS pdp_clicks,
        SUM(spend)                                          AS total_spend,
        SUM(sales)                                          AS total_sales
    FROM typed
    GROUP BY campaign_name
),

scored AS (
    SELECT
        campaign_name,
        ROUND(total_spend, 2)                                              AS spend,
        ROUND(100.0 * total_spend / NULLIF(total_sales, 0), 1)             AS campaign_acos,
        tos_clicks,
        ROUND(100.0 * tos_spend / NULLIF(tos_sales, 0), 1)                 AS tos_acos,
        ROUND(100.0 * tos_orders / NULLIF(tos_clicks, 0), 1)               AS tos_cvr,
        ROUND(100.0 * tos_spend / NULLIF(total_spend, 0), 0)               AS tos_share,
        ROUND(100.0 * ros_spend / NULLIF(ros_sales, 0), 1)                 AS ros_acos,
        ROUND(100.0 * pdp_spend / NULLIF(pdp_sales, 0), 1)                 AS pdp_acos,
        ros_clicks,
        pdp_clicks
    FROM pivoted
)

SELECT
    campaign_name,
    spend,
    campaign_acos,
    tos_acos,
    tos_cvr,
    tos_share,
    ros_acos,
    pdp_acos,
    -- A placement can afford a multiplier in proportion to how much better
    -- it converts than the rest of search. Capped at +100% and floored at 0.
    CASE
        WHEN tos_clicks < 30 OR ros_acos IS NULL THEN NULL
        ELSE GREATEST(0, LEAST(100, ROUND(100.0 * (ros_acos / NULLIF(tos_acos, 0) - 1), 0)))
    END                                                   AS suggested_tos_adjustment,
    CASE
        WHEN pdp_clicks < 30 OR ros_acos IS NULL THEN NULL
        ELSE GREATEST(0, LEAST(100, ROUND(100.0 * (ros_acos / NULLIF(pdp_acos, 0) - 1), 0)))
    END                                                   AS suggested_pdp_adjustment,
    CASE
        WHEN tos_clicks < 30                        THEN 'not enough top-of-search data'
        WHEN tos_acos <= campaign_acos * 0.8        THEN 'raise the top of search modifier'
        WHEN tos_acos >= campaign_acos * 1.3        THEN 'cut the top of search modifier'
        ELSE 'placement mix is balanced'
    END                                                   AS verdict
FROM scored
ORDER BY spend DESC;
`,
    explanation: [
      {
        lines: "11-17",
        what: "Amazon spells the placement column differently across report types and marketplaces. Matching on LIKE against a lowercased string, rather than an equality test, is what stops the pivot silently returning zeros.",
      },
      {
        lines: "27-43",
        what: "A conditional-aggregation pivot. Three SUM(CASE WHEN...) columns per placement is more verbose than a PIVOT clause but runs unchanged on every SQL engine, including the one the client's analyst uses.",
      },
      {
        lines: "46-60",
        what: "Rates are computed after the pivot, never before. Averaging three placement ACoS figures would weight a 12-click placement the same as a 2,000-click one; dividing summed spend by summed sales does not.",
      },
      {
        lines: "70-77",
        what: "The suggested multiplier. If rest of search runs at 48% ACoS and top of search at 24%, top of search is twice as efficient and can carry a +100% modifier before the two are equally profitable. That ratio is the whole calculation.",
      },
      {
        lines: "73",
        what: "GREATEST and LEAST cap the suggestion between 0 and +100%. Amazon allows up to 900%, but a suggestion derived from one month of data has no business proposing anything near that.",
      },
      {
        lines: "71",
        what: "Under 30 clicks the placement returns NULL rather than a number. An empty cell invites a human to look; a confident 47% invites them to paste it in.",
      },
      {
        lines: "79-84",
        what: "A plain-English verdict beside the numbers, so the person reading the output does not have to remember which direction a lower ACoS points.",
      },
    ],
    steps: [
      {
        title: "Export the placement report",
        detail:
          "Campaign Manager ▸ Sponsored ads reports ▸ Placement report, Sponsored Products, last 30 days, CSV. Check it has one row per campaign per placement before you run anything.",
      },
      {
        title: "Match the column names",
        detail:
          "The query expects campaign_name, placement, impressions, clicks, spend, sales, orders. Rename the header row in the CSV or alias the columns in the typed CTE — Amazon's exact header text varies by marketplace.",
      },
      {
        title: "Run it",
        detail: 'duckdb -c ".read placement_performance_pivot.sql"',
      },
      {
        title: "Apply half the suggestion first",
        detail:
          "If the query suggests +80%, set +40% and wait two weeks. Placement modifiers compound with the base bid, so a large jump changes both your position and your cost per click at the same time and you cannot tell which moved the result.",
      },
      {
        title: "Re-check after any bid change",
        detail:
          "The modifier is a multiplier on the base bid. Cutting base bids 15% and leaving a +80% modifier in place quietly cuts the top-of-search bid 15% too, which is often not what was intended.",
      },
    ],
    expectedOutput: `campaign_name                     spend  campaign_acos  tos_acos  tos_cvr  tos_share  ros_acos  pdp_acos  suggested_tos  suggested_pdp  verdict
ACME_B08XYZ1234_SP_EXACT_SCALE   1038.4           26.1      19.4     14.2         58      41.7      52.3            100             0  raise the top of search modifier
ACME_B09ABC5678_SP_PHRASE_MAINT   352.1           33.8      31.2      9.1         44      36.9      48.8             18             0  placement mix is balanced
ACME_B08XYZ1234_SP_BROAD_LAUNCH   168.3           77.2      88.4      4.3         61      64.1                                       cut the top of search modifier
ACME_B09ABC5678_SP_EXACT_DEFEND    99.2           19.6                                    19.6                                       not enough top-of-search data`,
    outputNote:
      "The first row is the common finding: top of search converts at 14.2% against a campaign average, and is efficient enough to justify the full +100% cap. The third row is the opposite — a launch campaign paying a premium for a placement that converts worse than the rest of search.",
    tags: ["placements", "sql", "bidding", "pivot", "duckdb"],
    related: ["dayparting-report", "bid-adjuster-acos-bands", "duplicate-keyword-finder"],
  },

  {
    id: "duplicate-keyword-finder",
    title: "Duplicate keyword finder",
    summary:
      "Finds the same keyword and match type running in more than one ad group, ranks the duplicates by combined spend, and names the ad group to keep based on which one actually converts.",
    language: "sql",
    difficulty: "intermediate",
    href: "/scripts/duplicate-keyword-finder",
    minutes: 12,
    automates:
      "Hunting through a 4,000-row keyword export for the keywords that are bidding against themselves.",
    frequency: "On takeover, then quarterly",
    saves: "An hour per audit, and the CPC inflation duplicates cause",
    prerequisites: [
      "A keyword report or bulk sheet export as CSV with campaign, ad group, keyword text, match type, and performance columns",
      "DuckDB or any SQL engine",
      "Enough history that the winner is decided by data and not by luck — 30 days minimum",
    ],
    fileName: "duplicate_keyword_finder.sql",
    code: `-- Duplicate keyword finder
-- The same keyword in the same match type across several ad groups means
-- your own campaigns are competing in the same auction. This finds them,
-- and picks the one worth keeping.

WITH source AS (
    SELECT * FROM read_csv_auto('keyword-report.csv', header = true)
),

typed AS (
    SELECT
        campaign_name,
        ad_group_name,
        LOWER(TRIM(keyword_text))               AS keyword,
        LOWER(TRIM(match_type))                 AS match_type,
        CAST(clicks AS BIGINT)                  AS clicks,
        CAST(orders AS BIGINT)                  AS orders,
        CAST(spend AS DOUBLE)                   AS spend,
        CAST(sales AS DOUBLE)                   AS sales,
        CAST(bid AS DOUBLE)                     AS bid
    FROM source
    WHERE keyword_text IS NOT NULL
      AND LOWER(TRIM(state)) = 'enabled'
),

grouped AS (
    SELECT
        keyword,
        match_type,
        COUNT(*)                                        AS placements,
        SUM(spend)                                      AS total_spend,
        SUM(sales)                                      AS total_sales,
        SUM(clicks)                                     AS total_clicks,
        SUM(orders)                                     AS total_orders,
        MAX(bid)                                        AS highest_bid,
        MIN(bid)                                        AS lowest_bid
    FROM typed
    GROUP BY keyword, match_type
    HAVING COUNT(*) > 1
),

ranked AS (
    SELECT
        typed.keyword,
        typed.match_type,
        typed.campaign_name,
        typed.ad_group_name,
        typed.clicks,
        typed.orders,
        typed.spend,
        typed.bid,
        CASE WHEN typed.sales > 0 THEN 100.0 * typed.spend / typed.sales END AS acos,
        ROW_NUMBER() OVER (
            PARTITION BY typed.keyword, typed.match_type
            -- Keep the ad group with orders first, then the cheapest ACoS,
            -- then the most clicks. Never keep on spend alone.
            ORDER BY
                CASE WHEN typed.orders > 0 THEN 0 ELSE 1 END,
                CASE WHEN typed.sales > 0 THEN typed.spend / typed.sales ELSE 9.99 END,
                typed.clicks DESC
        )                                                                     AS keep_rank
    FROM typed
    JOIN grouped
      ON grouped.keyword = typed.keyword
     AND grouped.match_type = typed.match_type
)

SELECT
    ranked.keyword,
    ranked.match_type,
    grouped.placements,
    ROUND(grouped.total_spend, 2)                        AS combined_spend,
    ROUND(grouped.highest_bid - grouped.lowest_bid, 2)   AS bid_spread,
    ranked.campaign_name,
    ranked.ad_group_name,
    ranked.clicks,
    ranked.orders,
    ROUND(ranked.spend, 2)                               AS spend,
    ROUND(ranked.acos, 1)                                AS acos,
    CASE WHEN ranked.keep_rank = 1 THEN 'KEEP' ELSE 'pause or negate here' END AS action
FROM ranked
JOIN grouped
  ON grouped.keyword = ranked.keyword
 AND grouped.match_type = ranked.match_type
ORDER BY grouped.total_spend DESC, ranked.keyword, ranked.keep_rank;
`,
    explanation: [
      {
        lines: "13-14",
        what: "LOWER and TRIM on both keyword and match type. 'Bamboo Cutting Board ' and 'bamboo cutting board' are the same auction entry as far as Amazon is concerned, and an exact string match would miss half the duplicates.",
      },
      {
        lines: "23",
        what: "Paused keywords are excluded. A paused duplicate is not competing with anything, and including them turns a short actionable list into a long historical one.",
      },
      {
        lines: "26-39",
        what: "The HAVING COUNT(*) > 1 is the entire detection step. Everything before it is normalisation and everything after is deciding which copy survives.",
      },
      {
        lines: "35-36",
        what: "Highest and lowest bid per duplicate group. The spread between them is the interesting number: two ad groups bidding $0.60 and $1.40 on the same keyword means you are reliably paying the higher price against yourself.",
      },
      {
        lines: "51-60",
        what: "ROW_NUMBER with a three-level sort decides the keeper: an ad group with orders beats one without, then lower ACoS, then more clicks. Sorting on spend would keep whichever ad group has been wasting the most money.",
      },
      {
        lines: "57",
        what: "The 9.99 fallback puts a keyword with no sales at the bottom of the ACoS sort without needing a NULLS LAST clause, which not every engine supports in the same place.",
      },
      {
        lines: "78",
        what: "Every copy is returned, not just the losers, so the output reads as a decision: one KEEP row followed by the ad groups to pause, grouped together and sorted by how much the duplication is costing.",
      },
    ],
    steps: [
      {
        title: "Export every enabled keyword",
        detail:
          "A bulk sheet export filtered to Keyword entities is the most complete source; a keyword performance report also works if it includes campaign, ad group, match type, bid and state.",
      },
      {
        title: "Check the state column exists",
        detail:
          "Line 23 filters on it. If your export has no state column, delete that line — but expect the list to include keywords you paused months ago.",
      },
      {
        title: "Run it",
        detail: 'duckdb -c ".read duplicate_keyword_finder.sql"',
      },
      {
        title: "Pause, do not delete",
        detail:
          "Pause the losing copies rather than archiving them. Amazon keeps the history either way, but a paused keyword can be re-enabled in seconds if the keeper turns out to underperform.",
      },
      {
        title: "Add a negative to stop it recurring",
        detail:
          "Pausing a duplicate in a broad or auto campaign does nothing — the term will just be matched again. Add it as a negative exact in the losing campaign, which is the same fix the search term harvester applies.",
      },
    ],
    expectedOutput: `keyword                   match  placements  combined_spend  bid_spread  campaign_name                    ad_group_name  clicks  orders  spend   acos  action
bamboo cutting board set  exact           3          412.77        0.55  ACME_B08XYZ1234_SP_EXACT_SCALE   EXACT-CORE        412      51  349.20  22.8  KEEP
bamboo cutting board set  exact           3          412.77        0.55  ACME_B08XYZ1234_SP_EXACT_DEFEND  BRAND-DEFEND       48       3   41.28  45.9  pause or negate here
bamboo cutting board set  exact           3          412.77        0.55  ACME_OLD_TEST_CAMPAIGN           TEST-1             26       0   22.29        pause or negate here
cutting board             phrase          2          688.90        0.18  ACME_B08XYZ1234_SP_PHRASE_MAINT  PHRASE-CORE       587      38  622.22  54.6  KEEP
cutting board             phrase          2          688.90        0.18  ACME_B09ABC5678_SP_PHRASE_MAINT  PHRASE-CROSS       71       2   66.68  74.1  pause or negate here`,
    outputNote:
      "A $0.55 bid spread on the top row means two ad groups were bidding 55 cents apart on the same term — the account was paying its own higher bid to beat its own lower one. That is the cost of a duplicate, and it never shows up as a single line item in any report.",
    tags: ["duplicates", "sql", "audit", "account-structure", "cpc"],
    related: ["campaign-naming-auditor", "wasted-spend-finder", "placement-performance-pivot"],
  },
];

export const formulaScripts: AutomationScript[] = [
  {
    id: "str-triage-formula-pack",
    title: "Search term triage formula pack",
    summary:
      "Eight spreadsheet formulas that turn a pasted search term report into a scored, colour-coded triage sheet with harvest and negate lists, using no script and no install.",
    language: "bulk-sheet-formula",
    difficulty: "beginner",
    href: "/scripts/str-triage-formula-pack",
    minutes: 10,
    automates:
      "The arithmetic and the verdict on every row of a search term report, without asking anyone for permission to run a script.",
    frequency: "Weekly",
    saves: "30 minutes a week, on day one, with nothing installed",
    prerequisites: [
      "Google Sheets, or Excel 365 for the FILTER and LET functions",
      "A search term report pasted into a sheet starting at A1, headers in row 1",
      "Columns in this order: A term, B impressions, C clicks, D spend, E sales, F orders",
    ],
    fileName: "str_triage_formulas.txt",
    code: `SEARCH TERM TRIAGE - FORMULA PACK
=================================
Paste the report into A1. Expected columns:
  A  Customer Search Term      D  Spend
  B  Impressions               E  7 Day Total Sales
  C  Clicks                    F  7 Day Total Orders

Put the four thresholds in a settings block first:
  J1  Target ACoS        0.30
  J2  Min CVR            0.05
  J3  Negate clicks      15
  J4  Min clicks         10

---------------------------------------------------------------------
1. CTR                                                    (paste in G2)
=IF(B2=0, "", C2/B2)
Format the column as a percentage. Empty rather than an error when a
term somehow has no impressions.

---------------------------------------------------------------------
2. CVR                                                    (paste in H2)
=IF(C2=0, "", F2/C2)

---------------------------------------------------------------------
3. CPC                                                    (paste in I2)
=IF(C2=0, "", D2/C2)

---------------------------------------------------------------------
4. ACoS                                                   (paste in K2)
=IF(E2=0, "", D2/E2)
Leave it blank rather than showing a division error: a term with spend
and no sales has no ACoS, it has a problem, and rule 6 catches it.

---------------------------------------------------------------------
5. Profit per click                                       (paste in L2)
Put your contribution margin in J5 (0.30 for 30%).
=IF(C2=0, "", (E2*\\$J\\$5 - D2)/C2)

---------------------------------------------------------------------
6. Verdict                                                (paste in M2)
=IFS(
   C2 < \\$J\\$4,                          "WATCH",
   AND(F2=0, C2 >= \\$J\\$3),               "NEGATE",
   F2 = 0,                                "WATCH",
   AND(K2 <= \\$J\\$1, H2 >= \\$J\\$2),        "HARVEST",
   K2 <= \\$J\\$1,                          "OPTIMISE",
   K2 <= \\$J\\$1 * 2.33,                   "OPTIMISE",
   TRUE,                                  "NEGATE"
)
Order matters. Click count is checked before anything else so a term
with four clicks can never be negated on one unlucky week.

---------------------------------------------------------------------
7. Suggested exact bid, for harvest rows only             (paste in N2)
=IF(M2 <> "HARVEST", "", \\$J\\$1 * (E2/F2) * H2 * 0.8)
Target ACoS x average order value x conversion rate, then 80% of it.
Each keyword gets its own bid because each one has its own AOV.

---------------------------------------------------------------------
8. The two lists                                (paste in P1 and R1)
Harvest:
=SORT(FILTER({A2:A, N2:N, K2:K}, M2:M = "HARVEST"), 3, TRUE)

Negate:
=SORT(FILTER({A2:A, D2:D, C2:C}, M2:M = "NEGATE"), 2, FALSE)

Harvest sorts by ACoS ascending (best first). Negate sorts by spend
descending (most expensive mistake first). Both update themselves when
you paste a new report over the top.

---------------------------------------------------------------------
9. Account totals                                        (paste in P20)
Spend       =SUM(D2:D)
Sales       =SUM(E2:E)
ACoS        =SUM(D2:D)/SUM(E2:E)
Wasted      =SUMIF(M2:M, "NEGATE", D2:D)
Recoverable =SUMIF(M2:M, "NEGATE", D2:D)/SUM(D2:D)

---------------------------------------------------------------------
10. Conditional formatting on column M
    Format ▸ Conditional formatting ▸ Custom formula is
      =\\$M2="HARVEST"   green fill
      =\\$M2="OPTIMISE"  amber fill
      =\\$M2="NEGATE"    red fill
    Apply to range A2:N. The dollar before M and not before 2 is what
    makes the whole row colour instead of one cell.

---------------------------------------------------------------------
EXCEL NOTES
  - IFS exists in Excel 2019 and later. On anything older, nest IFs.
  - Open ranges like A2:A are Sheets syntax. In Excel use A2:A5000.
  - FILTER and SORT need Excel 365. Without them, use AutoFilter on
    column M and copy the visible rows.
`,
    explanation: [
      {
        lines: "8-12",
        what: "A settings block in column J. Hard-coding 0.30 into eight formulas means changing it in eight places next month; referencing $J$1 means changing it once and watching every verdict update.",
      },
      {
        lines: "17-18",
        what: "Every rate formula opens with an IF on the denominator. IFERROR would also work, but it hides real problems — an empty string says 'this cannot be computed', where a swallowed #DIV/0 says nothing at all.",
      },
      {
        lines: "35",
        what: "Profit per click uses an absolute reference for the margin and relative references for the row. Getting the dollar signs the wrong way round is the single most common reason a formula works in row 2 and produces nonsense in row 200.",
      },
      {
        lines: "39-48",
        what: "IFS evaluates top to bottom and stops at the first TRUE, which is exactly the rule cascade the Python and Apps Script versions implement. The minimum-click check sits first for the same reason it does there.",
      },
      {
        lines: "45",
        what: "2.33 is 0.70 divided by 0.30 — the optimise ceiling expressed as a multiple of the target, so changing the target in J1 moves the ceiling with it rather than leaving a stale 70% behind.",
      },
      {
        lines: "53",
        what: "E2/F2 is the average order value for that specific term, not the account average. A term that sells two-packs carries a higher AOV and therefore earns a higher bid at the same target ACoS.",
      },
      {
        lines: "58-62",
        what: "FILTER with an array literal in braces picks three non-adjacent columns into one result, and SORT orders it. Both are live: paste a new report over row 2 and the lists rewrite themselves with no re-drag.",
      },
      {
        lines: "80-84",
        what: "The conditional formatting rule. $M2 locks the column and leaves the row free, which is what turns a single-cell highlight into a whole-row one across A2:N.",
      },
    ],
    steps: [
      {
        title: "Paste the report at A1",
        detail:
          "Download the search term report as CSV, open it, and paste the whole thing including headers into a fresh sheet. Check the columns land in the A-F order the pack expects; reorder them if not.",
      },
      {
        title: "Build the settings block",
        detail:
          "J1 target ACoS as a decimal, J2 minimum CVR, J3 negate clicks, J4 minimum clicks, J5 contribution margin. Label them in column I so the next person knows what they are.",
      },
      {
        title: "Paste formulas into row 2, then fill down",
        detail:
          "Enter each formula in its row-2 cell, select G2:N2, copy, then select G3:N and paste. In Sheets you can instead wrap each one in ARRAYFORMULA and enter it once.",
      },
      {
        title: "Add the two list formulas and the totals",
        detail:
          "P1 and R1 for the lists, P20 for the totals block. These are single cells that spill — do not fill them down.",
      },
      {
        title: "Colour column M",
        detail:
          "Three conditional formatting rules on A2:N with the custom formulas given. A triage sheet you can read at a glance is the difference between doing this weekly and doing it once.",
      },
      {
        title: "Reuse it",
        detail:
          "Next week, paste the new report over row 2 and everything recalculates. Keep one copy of the sheet per client rather than one per week.",
      },
    ],
    expectedOutput: `A                          C       D       E       H       K      M          N
term                    clicks  spend   sales   CVR     ACoS   VERDICT    bid
bamboo cutting board set   412  349.20 1529.49 12.38%  22.8%  HARVEST    0.74
cutting board              587  622.22 1139.62  6.47%  54.6%  OPTIMISE
wood cutting board w/h     198  158.40  809.73 13.64%  19.6%  HARVEST    0.99
butcher block              176  190.08   89.97  1.70% 211.3%  NEGATE
cheese board               143  132.99    0.00  0.00%         NEGATE
end grain cutting board      9    8.91   29.99 11.11%  29.7%  WATCH

P20 block
Spend        2,174.50
Sales        5,608.13
ACoS            38.8%
Wasted         538.59
Recoverable     24.8%`,
    outputNote:
      "This is the same output the Python miner and the Apps Script harvester produce, from the same rules, with nothing installed and nothing authorised. Start here; move to a script when you are doing it for five accounts instead of one.",
    tags: ["formulas", "google-sheets", "search-terms", "triage", "no-install"],
    related: ["search-term-harvester", "negative-keyword-miner", "sp-bulk-bid-update"],
  },

  {
    id: "sp-bulk-bid-update",
    title: "Bulk sheet bid update formulas",
    summary:
      "Formulas that turn a downloaded Sponsored Products bulk sheet into an upload-ready bid change: new bid with guardrails, the Operation column, and a filter that keeps only the rows that actually moved.",
    language: "bulk-sheet-formula",
    difficulty: "intermediate",
    href: "/scripts/sp-bulk-bid-update",
    minutes: 15,
    automates:
      "Typing 300 new bids into Campaign Manager one keyword at a time.",
    frequency: "Weekly or fortnightly",
    saves: "60-90 minutes per bid pass",
    prerequisites: [
      "A Sponsored Products bulk sheet downloaded from Campaign Manager ▸ Bulk operations",
      "Google Sheets or Excel",
      "A target ACoS, and the guardrails you are prepared to defend to the client",
    ],
    fileName: "sp_bulk_bid_update_formulas.txt",
    code: `SPONSORED PRODUCTS BULK SHEET - BID UPDATE FORMULAS
===================================================
Download the bulk sheet, open the "Sponsored Products Campaigns" tab,
and work on a COPY. Amazon's column letters shift between report
versions, so the first job is to confirm these three:

  Entity        usually column B
  Operation     usually column C
  Bid           usually column T
  Clicks / Orders / Spend / Sales are in the performance block on the right.

Below, the performance columns are referred to as:
  AH Impressions   AI Clicks   AJ Spend   AK Orders   AL Sales
Change the letters to match your file before pasting anything.

Settings block on a new tab named Settings:
  B1  Target ACoS      0.30
  B2  Cut factor       0.85      (a 15% reduction)
  B3  Raise factor     1.10
  B4  Min bid          0.30
  B5  Max bid          5.00
  B6  Max move         0.20      (never move more than 20% in one pass)
  B7  Learning clicks  20

---------------------------------------------------------------------
1. Row ACoS                                              (new column BA)
=IF(OR(\\$B2 <> "Keyword", AL2 = 0), "", AJ2/AL2)
Only Keyword rows get a bid. Campaign and Ad Group rows are left blank
so they cannot be picked up by the filter in step 5.

---------------------------------------------------------------------
2. Raw proposed bid                                      (new column BB)
=IF(\\$B2 <> "Keyword", "",
   IF(AI2 < Settings!\\$B\\$7, T2,
     IF(AND(AK2 = 0, AI2 >= Settings!\\$B\\$7), T2 * Settings!\\$B\\$2,
       IF(BA2 = "", T2,
         IF(BA2 > Settings!\\$B\\$1 * 1.5, T2 * Settings!\\$B\\$2,
           IF(AND(BA2 < Settings!\\$B\\$1 * 0.5, AK2 > 3), T2 * Settings!\\$B\\$3, T2))))))
Same band rules as the Apps Script version: cut above 1.5x target,
raise below 0.5x target with proven orders, otherwise hold.

---------------------------------------------------------------------
3. Guardrailed bid                                       (new column BC)
=IF(BB2 = "", "",
   ROUND(
     MEDIAN(
       Settings!\\$B\\$4,
       MIN(MAX(BB2, T2*(1-Settings!\\$B\\$6)), T2*(1+Settings!\\$B\\$6)),
       Settings!\\$B\\$5
     ), 2))
MEDIAN of (floor, value, ceiling) is the shortest way to clamp a number
in a spreadsheet: it returns the middle of the three, which is the
value when it is inside the range and the nearer bound when it is not.

---------------------------------------------------------------------
4. Did it actually move?                                 (new column BD)
=IF(BC2 = "", "", IF(ABS(BC2 - T2) < 0.01, "hold", "change"))
Sub-cent moves are held. A bulk file of one-cent changes is impossible
to review and tells the auction nothing.

---------------------------------------------------------------------
5. The upload sheet                              (new tab, cell A1)
=LET(
  rows, FILTER(
    {Bulk!A2:A, Bulk!B2:B, Bulk!D2:D, Bulk!E2:E, Bulk!H2:H,
     Bulk!U2:U, Bulk!V2:V, Bulk!BC2:BC},
    Bulk!BD2:BD = "change"
  ),
  rows
)
Columns pulled: Product, Entity, Campaign ID, Ad Group ID, Keyword ID,
Keyword Text, Match Type, and the new bid. Adjust the letters to your
file. Add a header row above that matches the bulk sheet exactly, and
type Update into the Operation column for every row.

---------------------------------------------------------------------
6. Sanity checks before you upload             (paste anywhere spare)
Rows changing      =COUNTIF(Bulk!BD2:BD, "change")
Rows holding       =COUNTIF(Bulk!BD2:BD, "hold")
Biggest cut        =MIN(ARRAYFORMULA(IF(Bulk!BD2:BD="change", Bulk!BC2:BC/Bulk!T2:T-1, "")))
Biggest raise      =MAX(ARRAYFORMULA(IF(Bulk!BD2:BD="change", Bulk!BC2:BC/Bulk!T2:T-1, "")))
Spend affected     =SUMIF(Bulk!BD2:BD, "change", Bulk!AJ2:AJ)

If "biggest cut" is below -20% or "biggest raise" above +20%, the
guardrail in step 3 is not being applied - check the column letters.

---------------------------------------------------------------------
7. Upload
   Campaign Manager ▸ Bulk operations ▸ Upload. Amazon validates the
   file and returns errors in a downloadable copy. Fix and re-upload;
   a partially applied bulk file is normal, not a failure.
`,
    explanation: [
      {
        lines: "5-13",
        what: "The warning that matters most. Amazon shifts bulk sheet columns between report versions and marketplaces, and every formula below is column-letter dependent. Five minutes confirming the letters saves an afternoon debugging a file Amazon rejected.",
      },
      {
        lines: "16-23",
        what: "A settings tab rather than inline numbers. It also doubles as the record of what you did: screenshot it into the client's change log and the bid pass is documented.",
      },
      {
        lines: "26-28",
        what: "Entity is checked first on every formula. A bulk sheet interleaves Campaign, Ad Group, Keyword and Product Ad rows, and writing a bid into a Campaign row is a validation error that fails the whole upload.",
      },
      {
        lines: "32-39",
        what: "The nested IF chain is the band ladder: learning period, zero-order rule, then the two ACoS bands, then hold. It is ugly, and it is the same logic as the Apps Script version — which is the point, because a VA should be able to move between the two.",
      },
      {
        lines: "43-50",
        what: "MEDIAN as a clamp. MEDIAN(floor, value, ceiling) returns value when it sits between the bounds and the nearer bound otherwise, which does in one function what MIN and MAX nested together do in two.",
      },
      {
        lines: "60-70",
        what: "LET plus FILTER builds the upload sheet as one live formula. Change a threshold in Settings and the upload sheet rewrites itself, so there is no stale copy of last week's changes to upload by accident.",
      },
      {
        lines: "77-82",
        what: "The four sanity checks. The biggest-cut and biggest-raise lines are a self-test of the guardrail: if either exceeds the max-move setting, a column letter is wrong somewhere and the file should not be uploaded.",
      },
    ],
    steps: [
      {
        title: "Download and duplicate",
        detail:
          "Campaign Manager ▸ Bulk operations ▸ Create spreadsheet for the last 30 days with performance data included. Open it, duplicate the Sponsored Products Campaigns tab, and rename the copy Bulk. Never edit the original.",
      },
      {
        title: "Confirm the column letters",
        detail:
          "Find Entity, Operation, Bid, Clicks, Orders, Spend and Sales in the header row and write the letters down. Every formula in the pack refers to them.",
      },
      {
        title: "Build the Settings tab",
        detail:
          "Seven values in B1:B7 as listed. Set Max move to 0.20 for a normal pass and 0.10 on a nervous client's account.",
      },
      {
        title: "Add the four working columns",
        detail:
          "BA through BD, filled down the whole sheet. Then read the sanity checks in step 6 before doing anything else.",
      },
      {
        title: "Build and check the upload tab",
        detail:
          "Paste the LET formula on a new tab, add a header row copied exactly from the bulk sheet, and type Update in the Operation column. Spot-check ten rows against the Bulk tab by eye.",
      },
      {
        title: "Upload and keep the result",
        detail:
          "Upload, download Amazon's validation result, and save it in the client folder next to the Settings screenshot. That pair is your evidence of what changed and why, which is the difference between an optimisation and an unexplained bid move.",
      },
    ],
    expectedOutput: `Sanity check block
Rows changing        46
Rows holding        223
Biggest cut      -15.0%
Biggest raise    +10.0%
Spend affected   1,284.40

Upload tab (first rows)
Product             Entity   Campaign ID  Ad Group ID  Keyword ID  Keyword Text              Match Type  Bid   Operation
Sponsored Products  Keyword  184729301    993827461    772618394   cutting board             Phrase      0.80  Update
Sponsored Products  Keyword  184729301    993827461    772618402   bamboo cutting board set  Exact       0.94  Update
Sponsored Products  Keyword  184729355    993827509    772618511   butcher block             Broad       0.92  Update
Sponsored Products  Keyword  184729355    993827509    772618533   large cutting board       Phrase      0.71  Update`,
    outputNote:
      "Biggest cut exactly -15.0% and biggest raise exactly +10.0% is the guardrail working: the band rules propose those factors and the 20% movement cap never has to intervene. Seeing anything larger means a column letter is wrong.",
    tags: ["bulk-operations", "formulas", "bidding", "google-sheets", "upload"],
    related: ["bid-adjuster-acos-bands", "bulk-sheet-generator", "str-triage-formula-pack"],
  },
];
