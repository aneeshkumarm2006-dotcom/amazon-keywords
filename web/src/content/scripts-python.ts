import type { AutomationScript } from "./scripts-types";

/**
 * The Python half of the automation library.
 *
 * Every script here reads a report you already download by hand and writes a
 * file you can act on. None of them touch the Amazon API, because API access
 * needs a developer account a VA almost never has — and because a report you
 * downloaded is a report you can check.
 */

export const pythonScripts: AutomationScript[] = [
  {
    id: "negative-keyword-miner",
    title: "Negative keyword miner",
    summary:
      "Reads a search term report and writes an upload-ready negative keyword list: zero-order terms past the click threshold, terms running at three times break-even, and anything carrying an irrelevant token.",
    language: "python",
    difficulty: "intermediate",
    href: "/scripts/negative-keyword-miner",
    minutes: 15,
    automates:
      "The weekly pass through a 2,000-row search term report looking for terms to exclude.",
    frequency: "Weekly",
    saves: "40-60 minutes a week per account",
    prerequisites: [
      "Python 3.9 or newer (check with python --version)",
      "pandas and openpyxl: pip install pandas openpyxl",
      "A Sponsored Products search term report downloaded as CSV or XLSX",
      "Your break-even ACoS — use the profit margin calculator if you do not have it",
    ],
    fileName: "negative_keyword_miner.py",
    code: `#!/usr/bin/env python3
"""
Negative keyword miner.

Reads an Amazon Sponsored Products search term report and writes
negative-keywords.csv: every term that should be excluded, the match type
to use, and the reason - so you can defend the list to a client.

Usage:
    python negative_keyword_miner.py search-term-report.csv
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

# --- rules: change these four numbers, nothing else -------------------------
BREAK_EVEN_ACOS = 0.32        # your margin before advertising, as a ratio
MIN_CLICKS_NO_ORDER = 15      # clicks with zero orders before negating
WASTE_MULTIPLE = 3.0          # negate at this multiple of break-even ACoS
MIN_CLICKS_FOR_ACOS = 10      # below this many clicks, ACoS is noise

IRRELEVANT_TOKENS = (
    "free", "cheap", "used", "refurbished", "wholesale",
    "recipe", "how to", "diy", "template", "job",
)

# Amazon ships these headers with inconsistent spacing and capitalisation,
# so every column name is matched lowercase and stripped.
COLUMNS = {
    "term": "customer search term",
    "clicks": "clicks",
    "spend": "spend",
    "sales": "7 day total sales",
    "orders": "7 day total orders (#)",
    "campaign": "campaign name",
    "ad_group": "ad group name",
}


def load(path: Path) -> pd.DataFrame:
    frame = pd.read_excel(path) if path.suffix.lower() in {".xlsx", ".xls"} else pd.read_csv(path)
    frame.columns = [str(column).strip().lower() for column in frame.columns]

    missing = [name for name in COLUMNS.values() if name not in frame.columns]
    if missing:
        raise SystemExit("Missing columns: " + ", ".join(missing))

    frame = frame.rename(columns={value: key for key, value in COLUMNS.items()})
    for column in ("clicks", "spend", "sales", "orders"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)
    frame["term"] = frame["term"].astype(str).str.strip().str.lower()
    return frame[frame["term"] != ""]


def verdict(row: pd.Series) -> tuple[str, str] | None:
    """Return (match type, reason) for a term to negate, or None to keep it."""
    for token in IRRELEVANT_TOKENS:
        if token in row["term"]:
            return "negative phrase", "contains '" + token + "' - wrong intent"

    if row["orders"] == 0 and row["clicks"] >= MIN_CLICKS_NO_ORDER:
        return "negative exact", (
            str(int(row["clicks"])) + " clicks, 0 orders, "
            + format(row["spend"], ".2f") + " wasted"
        )

    if row["orders"] > 0 and row["clicks"] >= MIN_CLICKS_FOR_ACOS and row["sales"] > 0:
        acos = row["spend"] / row["sales"]
        if acos >= BREAK_EVEN_ACOS * WASTE_MULTIPLE:
            return "negative exact", (
                "ACoS " + format(acos * 100, ".0f") + "% is "
                + format(acos / BREAK_EVEN_ACOS, ".1f") + "x break-even"
            )
    return None


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python negative_keyword_miner.py <report.csv>")

    frame = load(Path(sys.argv[1]))
    verdicts = frame.apply(verdict, axis=1)
    flagged = frame[verdicts.notna()].copy()
    flagged["match type"] = [item[0] for item in verdicts.dropna()]
    flagged["reason"] = [item[1] for item in verdicts.dropna()]

    output = flagged[
        ["campaign", "ad_group", "term", "match type", "clicks", "orders", "spend", "reason"]
    ].sort_values("spend", ascending=False)
    output.to_csv("negative-keywords.csv", index=False)

    print("Scanned      " + str(len(frame)) + " search terms")
    print("To negate    " + str(len(output)))
    print("Spend freed  " + format(output["spend"].sum(), ".2f")
          + " of " + format(frame["spend"].sum(), ".2f"))
    print("Written to   negative-keywords.csv")


if __name__ == "__main__":
    main()
`,
    explanation: [
      {
        lines: "18-30",
        what: "The four numbers that are actually yours. Break-even ACoS comes from your margin; everything else is the automation guide's default rule set. Change these and never touch the rest of the file.",
      },
      {
        lines: "32-35",
        what: "A token blocklist. A term containing 'recipe' or 'job' is not a bad bid, it is a shopper looking for something you do not sell, so it earns a negative phrase rather than a negative exact.",
      },
      {
        lines: "39-47",
        what: "Amazon ships the same report with different header spacing depending on where you export it. Mapping by lowercase stripped names instead of exact strings is the difference between a script that works once and one that works every week.",
      },
      {
        lines: "50-62",
        what: "Load, normalise and coerce. Every numeric column goes through to_numeric with errors='coerce' because a report exported from Seller Central can carry a dash or a blank where a zero belongs.",
      },
      {
        lines: "65-84",
        what: "The verdict function, in rule order. Irrelevance first (it does not need click volume to be true), then the zero-order rule, then the ACoS rule. Returning None means keep the term — the default is always to keep.",
      },
      {
        lines: "87-99",
        what: "Apply the verdict across every row, keep the flagged ones, and attach the match type and reason as real columns. The reason column is what turns this from a list into something you can put in front of a client.",
      },
      {
        lines: "101-110",
        what: "Sort by spend descending so the most expensive mistakes are at the top of the file, write the CSV, and print a four-line summary. The 'spend freed' line is the number worth reporting.",
      },
    ],
    steps: [
      {
        title: "Install Python and pandas",
        detail:
          "Install Python 3.9+ from python.org, then run pip install pandas openpyxl in a terminal. On Windows use the Command Prompt; on a Mac use Terminal. If pip is not found, try python -m pip install pandas openpyxl.",
      },
      {
        title: "Download the search term report",
        detail:
          "In Campaign Manager go to Measurement and Reporting ▸ Sponsored ads reports, create a Search Term report for Sponsored Products, set the date range to the last 30 days, and download it as CSV.",
      },
      {
        title: "Set your break-even ACoS",
        detail:
          "Open the script in any text editor and change BREAK_EVEN_ACOS to your margin as a ratio — a 32% margin is 0.32. This is the only edit most accounts need.",
      },
      {
        title: "Run it",
        detail:
          "Put the script and the report in the same folder, then run python negative_keyword_miner.py search-term-report.csv. It prints a summary and writes negative-keywords.csv beside the report.",
      },
      {
        title: "Review before you upload",
        detail:
          "Open the CSV and read the reason column. Delete any row you disagree with — a brand term you are deliberately defending, or a launch keyword that has not had its 14 days. Then add the survivors as negatives in the ad group named in the file, not account-wide.",
      },
    ],
    expectedOutput: `$ python negative_keyword_miner.py search-term-report.csv
Scanned      1,847 search terms
To negate    63
Spend freed  1,284.40 of 6,910.22
Written to   negative-keywords.csv

negative-keywords.csv (first rows)
campaign,ad_group,term,match type,clicks,orders,spend,reason
SP_Auto_Discovery,Auto - Loose,cheese board,negative exact,143,0,132.99,"143 clicks, 0 orders, 132.99 wasted"
SP_Broad_Research,Broad - Core,cutting board oil,negative exact,96,0,78.72,"96 clicks, 0 orders, 78.72 wasted"
SP_Auto_Discovery,Auto - Loose,plastic cutting board,negative exact,88,1,79.20,ACoS 264% is 8.3x break-even
SP_Broad_Research,Broad - Core,free cutting board,negative phrase,34,0,29.41,contains 'free' - wrong intent`,
    outputNote:
      "The spend-freed line is the one to put in a client update: it is the money the account stops losing next week, not a projection.",
    tags: ["negatives", "search-terms", "python", "pandas", "waste"],
    related: ["wasted-spend-finder", "search-term-harvester", "str-triage-formula-pack"],
  },

  {
    id: "wasted-spend-finder",
    title: "Wasted spend finder",
    summary:
      "Quantifies where an account is losing money across four buckets — dead clicks, above-ceiling ACoS, impression-heavy no-click terms and sub-threshold spenders — and prints a client-ready recovery figure.",
    language: "python",
    difficulty: "intermediate",
    href: "/scripts/wasted-spend-finder",
    minutes: 12,
    automates:
      "The audit question every client asks in month one: how much of my budget is being wasted, and on what?",
    frequency: "Monthly, or on every new account",
    saves: "2-3 hours on a first-month audit",
    prerequisites: [
      "Python 3.9+ with pandas installed",
      "A 30-day or 60-day search term report as CSV",
      "Your break-even ACoS",
    ],
    fileName: "wasted_spend_finder.py",
    code: `#!/usr/bin/env python3
"""
Wasted spend finder.

Splits an account's search term spend into four waste buckets and prints
the recoverable total. Written to be read out loud on a client call.

Usage:
    python wasted_spend_finder.py search-term-report.csv
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

BREAK_EVEN_ACOS = 0.32
DEAD_CLICKS = 15          # clicks, zero orders
CEILING_MULTIPLE = 2.0    # ACoS above this multiple of break-even
LOW_CTR = 0.0015          # 0.15% - the term shows but nobody wants it
MIN_IMPRESSIONS = 2000    # ...on enough impressions to mean something

COLUMNS = {
    "term": "customer search term",
    "impressions": "impressions",
    "clicks": "clicks",
    "spend": "spend",
    "sales": "7 day total sales",
    "orders": "7 day total orders (#)",
    "campaign": "campaign name",
}


def load(path: Path) -> pd.DataFrame:
    frame = pd.read_excel(path) if path.suffix.lower() in {".xlsx", ".xls"} else pd.read_csv(path)
    frame.columns = [str(column).strip().lower() for column in frame.columns]
    frame = frame.rename(columns={value: key for key, value in COLUMNS.items()})
    for column in ("impressions", "clicks", "spend", "sales", "orders"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)
    frame["acos"] = frame.apply(
        lambda row: row["spend"] / row["sales"] if row["sales"] > 0 else float("inf"), axis=1
    )
    frame["ctr"] = frame.apply(
        lambda row: row["clicks"] / row["impressions"] if row["impressions"] > 0 else 0, axis=1
    )
    return frame


def buckets(frame: pd.DataFrame) -> dict[str, pd.DataFrame]:
    dead = frame[(frame["orders"] == 0) & (frame["clicks"] >= DEAD_CLICKS)]
    over = frame[
        (frame["orders"] > 0) & (frame["acos"] > BREAK_EVEN_ACOS * CEILING_MULTIPLE)
    ]
    # Spend above the ceiling is only partly waste: the break-even share paid
    # for itself. Charge the account for the excess only.
    over = over.assign(excess=over["spend"] - over["sales"] * BREAK_EVEN_ACOS)
    ignored = frame[(frame["impressions"] >= MIN_IMPRESSIONS) & (frame["ctr"] < LOW_CTR)]
    thin = frame[(frame["clicks"] > 0) & (frame["clicks"] < DEAD_CLICKS) & (frame["orders"] == 0)]
    return {"dead": dead, "over": over, "ignored": ignored, "thin": thin}


def line(label: str, amount: float, count: int, total: float, note: str) -> None:
    share = amount / total * 100 if total else 0
    print(
        "  " + label.ljust(26)
        + format(amount, ">10,.2f")
        + format(share, ">7.1f") + "%"
        + format(count, ">7") + " terms   " + note
    )


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python wasted_spend_finder.py <report.csv>")

    frame = load(Path(sys.argv[1]))
    parts = buckets(frame)
    total_spend = frame["spend"].sum()

    dead_spend = parts["dead"]["spend"].sum()
    over_spend = parts["over"]["excess"].clip(lower=0).sum()
    recoverable = dead_spend + over_spend

    print("WASTED SPEND - " + str(len(frame)) + " search terms, "
          + format(total_spend, ",.2f") + " total spend")
    print("  " + "bucket".ljust(26) + "spend".rjust(10) + "share".rjust(8)
          + "count".rjust(9) + "   action")
    line("Dead clicks", dead_spend, len(parts["dead"]), total_spend, "negate exact")
    line("Above the ACoS ceiling", over_spend, len(parts["over"]), total_spend, "cut bids 15-25%")
    line("Shown but ignored", parts["ignored"]["spend"].sum(), len(parts["ignored"]),
         total_spend, "listing or relevance problem")
    line("Not yet judgeable", parts["thin"]["spend"].sum(), len(parts["thin"]),
         total_spend, "wait for " + str(DEAD_CLICKS) + " clicks")

    print()
    print("Recoverable this month: " + format(recoverable, ",.2f")
          + "  (" + format(recoverable / total_spend * 100 if total_spend else 0, ".1f") + "% of spend)")
    print("Annualised:             " + format(recoverable * 12, ",.2f"))

    worst = parts["dead"].nlargest(5, "spend")[["campaign", "term", "clicks", "spend"]]
    print()
    print("Five most expensive dead terms")
    print(worst.to_string(index=False))

    parts["dead"].to_csv("waste-dead-clicks.csv", index=False)
    parts["over"].to_csv("waste-over-ceiling.csv", index=False)


if __name__ == "__main__":
    main()
`,
    explanation: [
      {
        lines: "17-22",
        what: "Five thresholds define all four buckets. CEILING_MULTIPLE at 2.0 is deliberately looser than the negate rule: a term at twice break-even is a bid problem, not a relevance problem.",
      },
      {
        lines: "38-52",
        what: "Loading adds two derived columns the report does not ship: ACoS (infinite when there are no sales, so it sorts to the top) and CTR. Deriving them once keeps every bucket a one-line filter.",
      },
      {
        lines: "55-68",
        what: "The four buckets. Note the assign on line 62: for a term above the ceiling, only the spend beyond what break-even would have allowed is waste. Charging the client for the whole spend would overstate the recovery and get you caught.",
      },
      {
        lines: "71-79",
        what: "A fixed-width print helper. Columns that line up are the difference between a report a client reads and one they skim, and ljust/rjust costs nothing.",
      },
      {
        lines: "88-101",
        what: "Recoverable is deliberately only the first two buckets. Ignored impressions cost almost nothing and thin terms have not earned a verdict, so counting them would inflate the number.",
      },
      {
        lines: "103-107",
        what: "The annualised line. Twelve times a month of waste is the figure that gets a retainer approved — quote it as a ceiling, not a promise, because some of it comes back as lost sales.",
      },
      {
        lines: "109-118",
        what: "The five worst terms printed inline, and the two actionable buckets written out as CSVs so the next step is a file rather than a re-run.",
      },
    ],
    steps: [
      {
        title: "Install the dependency",
        detail: "pip install pandas openpyxl. Nothing else is needed.",
      },
      {
        title: "Pull a 60-day report",
        detail:
          "A 30-day window works, but 60 days puts more terms past the 15-click threshold and gives a fairer waste figure on a small account.",
      },
      {
        title: "Set BREAK_EVEN_ACOS",
        detail:
          "This drives the second bucket entirely. Guessing it high understates waste; guessing it low invents waste that is not there.",
      },
      {
        title: "Run and read the table",
        detail:
          "python wasted_spend_finder.py report.csv. Read the recoverable line, then open waste-dead-clicks.csv to see what is behind it.",
      },
      {
        title: "Turn it into the audit slide",
        detail:
          "The four bucket rows, the recoverable figure and the five worst terms are a complete audit finding. Pair it with the negative keyword miner output as the fix.",
      },
    ],
    expectedOutput: `$ python wasted_spend_finder.py search-term-report.csv
WASTED SPEND - 1,847 search terms, 6,910.22 total spend
  bucket                         spend   share    count   action
  Dead clicks                 1,284.40   18.6%       41 terms   negate exact
  Above the ACoS ceiling        742.18   10.7%       58 terms   cut bids 15-25%
  Shown but ignored             196.05    2.8%       23 terms   listing or relevance problem
  Not yet judgeable             311.72    4.5%      174 terms   wait for 15 clicks

Recoverable this month: 2,026.58  (29.3% of spend)
Annualised:             24,318.96

Five most expensive dead terms
        campaign                  term  clicks   spend
SP_Auto_Discovery          cheese board     143  132.99
SP_Broad_Research     cutting board oil      96   78.72
SP_Auto_Discovery      walnut cutting board   64   57.60
SP_Broad_Research         kitchen shears      52   48.36
SP_Auto_Discovery          serving platter     44   41.80`,
    outputNote:
      "Twenty-nine percent recoverable is high but not unusual on an account that has never had its search terms worked. Below ten percent means the account is already being managed, and you should say so.",
    tags: ["audit", "waste", "python", "reporting", "new-account"],
    related: ["negative-keyword-miner", "duplicate-keyword-finder", "weekly-report-emailer"],
  },

  {
    id: "campaign-naming-auditor",
    title: "Campaign naming auditor",
    summary:
      "Checks every campaign name against a convention, lists the violations with what is wrong, and proposes a corrected name built from the campaign's own attributes.",
    language: "python",
    difficulty: "beginner",
    href: "/scripts/campaign-naming-auditor",
    minutes: 10,
    automates:
      "Reading 80 campaign names one at a time to work out which ones nobody will be able to filter on in six months.",
    frequency: "On account takeover, then quarterly",
    saves: "An hour on takeover, and every future report that relies on filtering by name",
    prerequisites: [
      "Python 3.9+ (no third-party packages — this one uses the standard library only)",
      "A campaign report or bulk sheet exported as CSV with campaign names and targeting type",
      "An agreed naming convention — the default here is the one in the campaign structure cheat sheet",
    ],
    fileName: "campaign_naming_auditor.py",
    code: `#!/usr/bin/env python3
"""
Campaign naming auditor.

Convention:  BRAND_ASIN_ADTYPE_MATCH_STRATEGY
Example:     ACME_B08XYZ1234_SP_EXACT_SCALE

Reads a campaign CSV, reports every name that breaks the convention, and
suggests a replacement built from the columns the report already has.

Usage:
    python campaign_naming_auditor.py campaigns.csv
"""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

PATTERN = re.compile(
    r"^(?P<brand>[A-Z0-9]{2,12})"
    r"_(?P<asin>B0[A-Z0-9]{8})"
    r"_(?P<adtype>SP|SB|SBV|SD)"
    r"_(?P<match>EXACT|PHRASE|BROAD|AUTO|ASIN|CAT)"
    r"_(?P<strategy>LAUNCH|SCALE|DEFEND|HARVEST|MAINTAIN)$"
)

AD_TYPE = {"sponsored products": "SP", "sponsored brands": "SB", "sponsored display": "SD"}
MATCH = {"exact": "EXACT", "phrase": "PHRASE", "broad": "BROAD", "auto": "AUTO"}
BRAND = "ACME"           # set this to the client's brand token
DEFAULT_STRATEGY = "MAINTAIN"


def problems(name: str) -> list[str]:
    """Every rule the name breaks, in the order a human would notice them."""
    found = []
    parts = name.split("_")
    if len(parts) != 5:
        found.append("has " + str(len(parts)) + " segments, the convention has 5")
    if " " in name:
        found.append("contains spaces - breaks spreadsheet filters")
    if name != name.upper():
        found.append("not upper case")
    if not re.search(r"B0[A-Z0-9]{8}", name):
        found.append("no ASIN")
    if not any(token in parts for token in ("SP", "SB", "SBV", "SD")):
        found.append("no ad type")
    if not any(token in parts for token in MATCH.values()) and "AUTO" not in parts:
        found.append("no match type")
    return found


def suggest(row: dict[str, str]) -> str:
    asin = (row.get("asin") or "B0UNKNOWN0").strip().upper()
    adtype = AD_TYPE.get((row.get("ad type") or "").strip().lower(), "SP")
    targeting = (row.get("targeting type") or "").strip().lower()
    match = "AUTO" if targeting == "auto" else MATCH.get(targeting, "EXACT")
    return "_".join([BRAND, asin, adtype, match, DEFAULT_STRATEGY])


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python campaign_naming_auditor.py <campaigns.csv>")

    with Path(sys.argv[1]).open(newline="", encoding="utf-8-sig") as handle:
        rows = [
            {key.strip().lower(): value for key, value in row.items()}
            for row in csv.DictReader(handle)
        ]

    clean, broken = [], []
    for row in rows:
        name = (row.get("campaign name") or "").strip()
        if not name:
            continue
        if PATTERN.match(name):
            clean.append(name)
        else:
            broken.append((name, problems(name), suggest(row)))

    print("Campaigns checked : " + str(len(clean) + len(broken)))
    print("Following the rule: " + str(len(clean)))
    print("Needing a rename  : " + str(len(broken)))
    print()

    for name, issues, proposal in broken:
        print(name)
        for issue in issues:
            print("   x " + issue)
        print("   -> " + proposal)
        print()

    with open("campaign-renames.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["Current name", "Problems", "Suggested name"])
        for name, issues, proposal in broken:
            writer.writerow([name, "; ".join(issues), proposal])


if __name__ == "__main__":
    main()
`,
    explanation: [
      {
        lines: "21-28",
        what: "The convention as a single named-group regex. Named groups mean the error message can say which segment failed rather than 'did not match', and the ASIN group encodes the real B0-prefix-plus-eight-characters shape.",
      },
      {
        lines: "30-34",
        what: "Lookup tables from the report's own vocabulary to the convention's tokens, plus the one line you must edit: BRAND.",
      },
      {
        lines: "37-53",
        what: "Rules are checked independently and all failures collected, rather than returning on the first one. A name can be lower case and missing an ASIN, and a rename list that only mentions the first problem creates a second pass.",
      },
      {
        lines: "56-61",
        what: "The suggestion is built from columns the campaign report already has, so it is a real rename rather than a placeholder. Targeting type maps to AUTO or the match type; strategy defaults to MAINTAIN because no report knows your intent.",
      },
      {
        lines: "68-73",
        what: "utf-8-sig strips the byte-order mark Excel puts at the front of a CSV, which is the single most common reason a header lookup silently fails on Windows.",
      },
      {
        lines: "75-84",
        what: "Two lists, one pass. Names that match the pattern are counted and dropped; the rest carry their problems and proposal forward.",
      },
      {
        lines: "91-97",
        what: "Human-readable output first — name, bulleted problems, arrow to the fix — then the same content as a CSV you can paste into a bulk sheet's rename column.",
      },
    ],
    steps: [
      {
        title: "Agree the convention first",
        detail:
          "The script is worthless if the convention is not the client's. Edit PATTERN and BRAND to match what the account actually uses; the default is BRAND_ASIN_ADTYPE_MATCH_STRATEGY.",
      },
      {
        title: "Export the campaign list",
        detail:
          "Campaign Manager ▸ Campaigns ▸ export, or download a bulk sheet and keep the Campaign entity rows. You need at minimum a campaign name column; an ASIN and targeting type column make the suggestions usable.",
      },
      {
        title: "Run it",
        detail: "python campaign_naming_auditor.py campaigns.csv",
      },
      {
        title: "Rename in bulk, not by hand",
        detail:
          "Take campaign-renames.csv into a bulk sheet: set Entity to Campaign, Operation to Update, paste the campaign ID and the suggested name, and upload. Renaming through the console one campaign at a time is how a two-hour job becomes a two-day job.",
      },
      {
        title: "Warn the client before you upload",
        detail:
          "Renaming campaigns breaks any saved filter, dashboard or Data Studio report keyed to the old name. Send the rename list first and get a yes in writing.",
      },
    ],
    expectedOutput: `$ python campaign_naming_auditor.py campaigns.csv
Campaigns checked : 34
Following the rule: 11
Needing a rename  : 23

Bamboo Board - Auto
   x has 3 segments, the convention has 5
   x contains spaces - breaks spreadsheet filters
   x not upper case
   x no ASIN
   -> ACME_B08XYZ1234_SP_AUTO_MAINTAIN

ACME_B08XYZ1234_SP_EXACT
   x has 4 segments, the convention has 5
   -> ACME_B08XYZ1234_SP_EXACT_MAINTAIN

test campaign 2 copy
   x has 4 segments, the convention has 5
   x contains spaces - breaks spreadsheet filters
   x not upper case
   x no ASIN
   x no ad type
   x no match type
   -> ACME_B09ABC5678_SP_EXACT_MAINTAIN`,
    outputNote:
      "Two thirds failing is normal on an account that has changed hands. The value is not tidiness: a consistent name is what lets every other script in this library group by ad type and match type without a lookup table.",
    tags: ["naming", "audit", "python", "account-structure", "takeover"],
    related: ["bulk-sheet-generator", "duplicate-keyword-finder", "placement-performance-pivot"],
  },

  {
    id: "bulk-sheet-generator",
    title: "Bulk sheet generator",
    summary:
      "Turns a flat keyword list into a valid Amazon Sponsored Products bulk upload file: campaign, ad group, product ad and keyword rows with the right entity and operation columns.",
    language: "python",
    difficulty: "advanced",
    href: "/scripts/bulk-sheet-generator",
    minutes: 25,
    automates:
      "Building a 200-keyword campaign by hand in Campaign Manager, which takes an afternoon and produces typos.",
    frequency: "On every launch or restructure",
    saves: "3-4 hours per campaign build",
    prerequisites: [
      "Python 3.9+ (standard library only)",
      "A keyword CSV with columns: keyword, match, bid",
      "The ASIN and SKU you are advertising",
      "A test upload first — Amazon validates on upload and rejects the whole file on one bad row",
    ],
    fileName: "bulk_sheet_generator.py",
    code: `#!/usr/bin/env python3
"""
Sponsored Products bulk sheet generator.

Reads keywords.csv (keyword, match, bid) and writes sp-bulk-upload.csv:
one campaign, one ad group per match type, one product ad, and a keyword
row per keyword - in the entity order Amazon expects.

Usage:
    python bulk_sheet_generator.py keywords.csv
"""
from __future__ import annotations

import csv
import sys
from datetime import date
from pathlib import Path

# --- the build ---------------------------------------------------------------
BRAND = "ACME"
ASIN = "B08XYZ1234"
SKU = "ACME-BAMBOO-01"
DAILY_BUDGET = "20.00"
DEFAULT_BID = "0.72"
STRATEGY = "LAUNCH"
BIDDING = "Dynamic bids - down only"

HEADERS = [
    "Product", "Entity", "Operation", "Campaign ID", "Ad Group ID", "Portfolio ID",
    "Ad ID", "Keyword ID", "Product Targeting ID", "Campaign Name", "Ad Group Name",
    "Start Date", "End Date", "Targeting Type", "State", "Daily Budget", "SKU", "ASIN",
    "Ad Group Default Bid", "Bid", "Keyword Text", "Match Type", "Bidding Strategy",
]

MATCH_LABEL = {"exact": "Exact", "phrase": "Phrase", "broad": "Broad"}


def blank() -> dict[str, str]:
    return {header: "" for header in HEADERS}


def campaign_row(name: str) -> dict[str, str]:
    row = blank()
    row.update({
        "Product": "Sponsored Products", "Entity": "Campaign", "Operation": "Create",
        "Campaign ID": name, "Campaign Name": name,
        "Start Date": date.today().strftime("%Y%m%d"),
        "Targeting Type": "Manual", "State": "enabled",
        "Daily Budget": DAILY_BUDGET, "Bidding Strategy": BIDDING,
    })
    return row


def ad_group_row(campaign: str, ad_group: str) -> dict[str, str]:
    row = blank()
    row.update({
        "Product": "Sponsored Products", "Entity": "Ad Group", "Operation": "Create",
        "Campaign ID": campaign, "Ad Group ID": ad_group,
        "Campaign Name": campaign, "Ad Group Name": ad_group,
        "State": "enabled", "Ad Group Default Bid": DEFAULT_BID,
    })
    return row


def product_ad_row(campaign: str, ad_group: str) -> dict[str, str]:
    row = blank()
    row.update({
        "Product": "Sponsored Products", "Entity": "Product Ad", "Operation": "Create",
        "Campaign ID": campaign, "Ad Group ID": ad_group,
        "Ad ID": ad_group + "-AD", "State": "enabled", "SKU": SKU, "ASIN": ASIN,
    })
    return row


def keyword_row(campaign: str, ad_group: str, text: str, match: str, bid: str) -> dict[str, str]:
    row = blank()
    row.update({
        "Product": "Sponsored Products", "Entity": "Keyword", "Operation": "Create",
        "Campaign ID": campaign, "Ad Group ID": ad_group,
        "Keyword ID": ad_group + "-" + text.replace(" ", "-")[:40],
        "State": "enabled", "Bid": bid, "Keyword Text": text,
        "Match Type": MATCH_LABEL[match],
    })
    return row


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "keywords.csv")
    with source.open(newline="", encoding="utf-8-sig") as handle:
        keywords = [
            {key.strip().lower(): (value or "").strip() for key, value in row.items()}
            for row in csv.DictReader(handle)
        ]

    by_match: dict[str, list[dict[str, str]]] = {}
    for entry in keywords:
        match = entry.get("match", "exact").lower()
        if match not in MATCH_LABEL:
            print("  skipped (bad match type): " + entry.get("keyword", "?"))
            continue
        by_match.setdefault(match, []).append(entry)

    rows: list[dict[str, str]] = []
    for match, entries in by_match.items():
        campaign = "_".join([BRAND, ASIN, "SP", match.upper(), STRATEGY])
        ad_group = match.upper() + "-CORE"
        rows.append(campaign_row(campaign))
        rows.append(ad_group_row(campaign, ad_group))
        rows.append(product_ad_row(campaign, ad_group))
        for entry in entries:
            rows.append(keyword_row(
                campaign, ad_group, entry["keyword"], match,
                entry.get("bid") or DEFAULT_BID,
            ))

    with open("sp-bulk-upload.csv", "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)

    print("Campaigns   " + str(len(by_match)))
    print("Keywords    " + str(sum(len(value) for value in by_match.values())))
    print("Total rows  " + str(len(rows)))
    print("Written to  sp-bulk-upload.csv")


if __name__ == "__main__":
    main()
`,
    explanation: [
      {
        lines: "19-26",
        what: "The seven constants that describe the build. Everything downstream is generated, so a second product means changing three lines rather than editing 200 rows.",
      },
      {
        lines: "28-34",
        what: "The bulk sheet header, in Amazon's order and spelling. Amazon matches on exact header text; a renamed or reordered column is the most common cause of a rejected upload.",
      },
      {
        lines: "41-52",
        what: "The campaign row. Note that Campaign ID carries the campaign *name* — on a Create operation you supply your own reference id, and Amazon swaps in the real numeric id after the upload. Using the name means the child rows join up without a lookup.",
      },
      {
        lines: "55-82",
        what: "Ad group, product ad and keyword rows, each a copy of the blank template with only its own fields filled. Leaving irrelevant columns empty rather than zero matters: a zero in Daily Budget on a keyword row is a validation error.",
      },
      {
        lines: "94-104",
        what: "Keywords are grouped by match type, and a keyword with a match type outside exact/phrase/broad is skipped with a printed warning rather than silently dropped.",
      },
      {
        lines: "106-118",
        what: "One campaign per match type, each with its own ad group and product ad, then the keywords. Entity order matters — Amazon processes the file top to bottom and a keyword row before its ad group fails.",
      },
      {
        lines: "120-124",
        what: "DictWriter with the fixed header list guarantees column order and fills any field a row did not set. That is the whole reason for the blank() template.",
      },
    ],
    steps: [
      {
        title: "Build the keyword CSV",
        detail:
          "Three columns: keyword, match, bid. Export the harvest list from the keyword ROI calculator, or from Cerebro, and add a match column. Leave bid blank to use DEFAULT_BID.",
      },
      {
        title: "Set the seven constants",
        detail:
          "BRAND, ASIN, SKU, DAILY_BUDGET, DEFAULT_BID, STRATEGY and BIDDING. Get the SKU exactly right — Amazon matches it against your catalogue and a typo fails the whole file.",
      },
      {
        title: "Generate the file",
        detail: "python bulk_sheet_generator.py keywords.csv",
      },
      {
        title: "Upload as a test first",
        detail:
          "Campaign Manager ▸ Bulk operations ▸ upload. Amazon validates before applying and returns an errors file. Fix, regenerate, re-upload. Never upload a generated file to a live account without reading the validation result.",
      },
      {
        title: "Check the campaigns exist before you add negatives",
        detail:
          "The real numeric campaign IDs only exist after a successful upload. Download a fresh bulk sheet afterwards if you plan to script negatives or bid changes on the same campaigns.",
      },
    ],
    expectedOutput: `$ python bulk_sheet_generator.py keywords.csv
  skipped (bad match type): bamboo cutting board | modified broad
Campaigns   3
Keywords    187
Total rows  196
Written to  sp-bulk-upload.csv

sp-bulk-upload.csv (first rows)
Product,Entity,Operation,Campaign ID,Ad Group ID,...,Keyword Text,Match Type,Bidding Strategy
Sponsored Products,Campaign,Create,ACME_B08XYZ1234_SP_EXACT_LAUNCH,,...,,,Dynamic bids - down only
Sponsored Products,Ad Group,Create,ACME_B08XYZ1234_SP_EXACT_LAUNCH,EXACT-CORE,...,,,
Sponsored Products,Product Ad,Create,ACME_B08XYZ1234_SP_EXACT_LAUNCH,EXACT-CORE,...,,,
Sponsored Products,Keyword,Create,ACME_B08XYZ1234_SP_EXACT_LAUNCH,EXACT-CORE,...,bamboo cutting board set,Exact,`,
    outputNote:
      "196 rows from a 187-line keyword file: three campaigns, three ad groups, three product ads. If the row count is not keywords plus three times campaigns, something was skipped — read the warnings.",
    tags: ["bulk-operations", "campaign-build", "python", "launch", "csv"],
    related: ["campaign-naming-auditor", "sp-bulk-bid-update", "search-term-harvester"],
  },

  {
    id: "budget-pacing-alert",
    title: "Budget pacing alert",
    summary:
      "Compares month-to-date spend against the plan for every campaign, projects where each one lands on the last day of the month, and flags the ones that will overshoot or underspend.",
    language: "python",
    difficulty: "intermediate",
    href: "/scripts/budget-pacing-alert",
    minutes: 15,
    automates:
      "The mid-month panic where a client asks whether the budget is on track and nobody knows until the month closes.",
    frequency: "Daily, or every Monday",
    saves: "20 minutes a day, and the occasional blown month",
    prerequisites: [
      "Python 3.9+ with pandas",
      "A daily campaign performance report as CSV, with a date column",
      "A plan CSV: campaign name and monthly budget",
    ],
    fileName: "budget_pacing_alert.py",
    code: `#!/usr/bin/env python3
"""
Budget pacing alert.

Projects month-end spend per campaign from month-to-date actuals and
compares it to plan. Prints a pacing table and writes pacing-report.csv.

Usage:
    python budget_pacing_alert.py daily-report.csv plan.csv
"""
from __future__ import annotations

import calendar
import sys
from datetime import date
from pathlib import Path

import pandas as pd

OVER_THRESHOLD = 1.10     # projected / plan above this = overspending
UNDER_THRESHOLD = 0.85    # ...below this = underspending
TODAY = date.today()


def days_in_month(day: date) -> int:
    return calendar.monthrange(day.year, day.month)[1]


def load_actuals(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    frame.columns = [str(column).strip().lower() for column in frame.columns]
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame = frame.dropna(subset=["date"])
    current = frame[
        (frame["date"].dt.month == TODAY.month) & (frame["date"].dt.year == TODAY.year)
    ]
    grouped = current.groupby("campaign name").agg(
        spend=("spend", "sum"),
        sales=("7 day total sales", "sum"),
        days=("date", "nunique"),
    )
    return grouped.reset_index().rename(columns={"campaign name": "campaign"})


def load_plan(path: Path) -> pd.DataFrame:
    plan = pd.read_csv(path)
    plan.columns = [str(column).strip().lower() for column in plan.columns]
    return plan.rename(columns={"campaign name": "campaign", "monthly budget": "plan"})


def status(ratio: float) -> str:
    if ratio > OVER_THRESHOLD:
        return "OVER"
    if ratio < UNDER_THRESHOLD:
        return "UNDER"
    return "on track"


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("Usage: python budget_pacing_alert.py <daily-report.csv> <plan.csv>")

    actuals = load_actuals(Path(sys.argv[1]))
    plan = load_plan(Path(sys.argv[2]))
    frame = plan.merge(actuals, on="campaign", how="left").fillna({"spend": 0, "sales": 0, "days": 0})

    total_days = days_in_month(TODAY)
    elapsed = TODAY.day
    share_elapsed = elapsed / total_days

    frame["daily run rate"] = frame["spend"] / max(elapsed, 1)
    frame["projected"] = frame["daily run rate"] * total_days
    frame["ratio"] = frame["projected"] / frame["plan"].replace(0, pd.NA)
    frame["variance"] = frame["projected"] - frame["plan"]
    frame["status"] = frame["ratio"].fillna(0).map(status)
    frame["acos"] = (frame["spend"] / frame["sales"].replace(0, pd.NA) * 100).round(1)

    print("PACING - day " + str(elapsed) + " of " + str(total_days)
          + " (" + format(share_elapsed * 100, ".0f") + "% elapsed)")
    print()
    header = ("campaign".ljust(34) + "plan".rjust(10) + "MTD".rjust(10)
              + "proj".rjust(10) + "var".rjust(10) + "  ACoS   status")
    print(header)
    print("-" * len(header))

    for row in frame.sort_values("variance", ascending=False).itertuples():
        print(
            str(row.campaign)[:33].ljust(34)
            + format(row.plan, ">10,.0f")
            + format(row.spend, ">10,.0f")
            + format(row.projected, ">10,.0f")
            + format(row.variance, ">+10,.0f")
            + format(row.acos if pd.notna(row.acos) else 0, ">7.1f")
            + "   " + row.status
        )

    print()
    print("Account plan      " + format(frame["plan"].sum(), ",.0f"))
    print("Month to date     " + format(frame["spend"].sum(), ",.0f"))
    print("Projected close   " + format(frame["projected"].sum(), ",.0f"))
    print("Campaigns over    " + str(int((frame["status"] == "OVER").sum())))
    print("Campaigns under   " + str(int((frame["status"] == "UNDER").sum())))

    frame.to_csv("pacing-report.csv", index=False)


if __name__ == "__main__":
    main()
`,
    explanation: [
      {
        lines: "19-21",
        what: "Two thresholds, deliberately asymmetric. Ten percent over is worth an alert because it comes out of margin; fifteen percent under is the trigger on the other side because a slightly underspent month is rarely urgent.",
      },
      {
        lines: "29-42",
        what: "Actuals are filtered to the current calendar month before grouping. Without that filter a report containing last month's rows inflates month-to-date and every projection with it.",
      },
      {
        lines: "38",
        what: "Counting distinct dates rather than rows gives the true number of days the campaign actually delivered, which is what a pacing figure should be divided by when a campaign was paused mid-month.",
      },
      {
        lines: "68-74",
        what: "The projection is a straight-line run rate: spend so far divided by days elapsed, multiplied by days in the month. Simple on purpose — a smarter model would need seasonality the account cannot supply mid-month.",
      },
      {
        lines: "72",
        what: "replace(0, pd.NA) before dividing is what stops a campaign with no plan producing an infinite ratio and sorting to the top of the table forever.",
      },
      {
        lines: "82-97",
        what: "Fixed-width columns, sorted by variance descending, so the campaign about to overspend by the most is the first line you read.",
      },
      {
        lines: "99-105",
        what: "Account-level totals last. A client who reads nothing else reads 'projected close' against 'account plan'.",
      },
    ],
    steps: [
      {
        title: "Write the plan file once",
        detail:
          "Two columns: campaign name, monthly budget. Take the numbers from the budget planner's 70/20/10 allocation. Keep it in the client folder and update it when the plan changes, not when the spend does.",
      },
      {
        title: "Download a daily report",
        detail:
          "Campaign Manager ▸ Sponsored ads reports ▸ Campaign report, with the unit set to Daily and the range set to month to date. The date column is what makes the pacing maths possible.",
      },
      {
        title: "Run it",
        detail: "python budget_pacing_alert.py daily-report.csv plan.csv",
      },
      {
        title: "Act on OVER before UNDER",
        detail:
          "An overspending campaign is costing money today. Cut its daily budget to plan divided by days remaining, not to the original daily figure, or it will still close over.",
      },
      {
        title: "Check UNDER for a cause, not a cure",
        detail:
          "Underspend is a symptom: budget-capped early in the day, bids below the auction floor, or an out-of-stock ASIN. Raising the budget on a campaign that is not spending its current one changes nothing.",
      },
    ],
    expectedOutput: `$ python budget_pacing_alert.py daily-report.csv plan.csv
PACING - day 18 of 30 (60% elapsed)

campaign                                plan       MTD      proj       var   ACoS   status
-------------------------------------------------------------------------------------------
ACME_B08XYZ1234_SP_EXACT_SCALE         1,400     1,038     1,730      +330   24.1   OVER
ACME_B08XYZ1234_SP_AUTO_HARVEST          300       214       357       +57   61.4   OVER
ACME_B09ABC5678_SP_PHRASE_MAINTAIN       600       352       587       -13   33.8   on track
ACME_B08XYZ1234_SP_BROAD_LAUNCH          400       168       280      -120   77.2   UNDER
ACME_B09ABC5678_SP_EXACT_DEFEND          300        99       165      -135   19.6   UNDER

Account plan      3,000
Month to date     1,871
Projected close   3,119
Campaigns over    2
Campaigns under   2`,
    outputNote:
      "The account projects 4% over plan while two campaigns are 20%+ under — which is the normal shape. Fix the overspenders first, then decide whether the underspend is a bid problem worth solving or budget you should move.",
    tags: ["budget", "pacing", "python", "monitoring", "forecast"],
    related: ["weekly-report-emailer", "bid-adjuster-acos-bands", "dayparting-report"],
  },
];
