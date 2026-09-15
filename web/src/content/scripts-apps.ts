import type { AutomationScript } from "./scripts-types";

/**
 * The Google Apps Script half of the library.
 *
 * These run inside a Google Sheet the client can open, which matters more than
 * it sounds: a script nobody can see is a script nobody trusts. Each one is
 * plain ES5-style JavaScript with no libraries, because the Apps Script editor
 * has no package manager and a VA should not need one.
 */

export const appsScripts: AutomationScript[] = [
  {
    id: "search-term-harvester",
    title: "Search term harvester",
    summary:
      "Reads a pasted search term report inside a Google Sheet and writes two new tabs: keywords to promote to exact with a suggested bid, and terms to add as negative exact.",
    language: "google-apps-script",
    difficulty: "intermediate",
    href: "/scripts/search-term-harvester",
    minutes: 20,
    automates:
      "The weekly harvest-and-negate pass, and the copy-paste between the report and two separate lists.",
    frequency: "Weekly",
    saves: "45 minutes a week per account",
    prerequisites: [
      "A Google account and a Google Sheet you can edit",
      "A search term report pasted into a tab named exactly 'Search Term Report', headers included",
      "Your target ACoS and minimum conversion rate",
      "Nothing to install — Apps Script is built into Sheets",
    ],
    fileName: "search_term_harvester.gs",
    code: `/**
 * Search Term Harvester
 *
 * Reads the "Search Term Report" tab and writes two tabs:
 *   Harvest - terms converting under target, with a suggested exact bid
 *   Negate  - terms failing the click or ACoS rules
 *
 * Run harvestSearchTerms() from the Apps Script editor, or from the
 * custom PPC menu this script adds to the sheet.
 */

var CONFIG = {
  sourceSheet: 'Search Term Report',
  harvestSheet: 'Harvest',
  negateSheet: 'Negate',
  targetAcos: 0.30,      // harvest at or below this
  minCvr: 0.05,          // ...that also converts at or above this
  minClicks: 10,         // fewer clicks than this: no verdict
  negateClicks: 15,      // clicks with zero orders before negating
  ceilingAcos: 0.70,     // above this, negate rather than bid down
  bidAggression: 0.80    // suggested bid as a share of max CPC
};

// Header text as Amazon ships it, matched lowercase and trimmed.
var COLUMNS = {
  term: 'customer search term',
  impressions: 'impressions',
  clicks: 'clicks',
  spend: 'spend',
  sales: '7 day total sales',
  orders: '7 day total orders (#)'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PPC')
    .addItem('Harvest search terms', 'harvestSearchTerms')
    .addToUi();
}

function harvestSearchTerms() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName(CONFIG.sourceSheet);
  if (!source) {
    throw new Error('No tab named "' + CONFIG.sourceSheet + '". Paste the report there first.');
  }

  var values = source.getDataRange().getValues();
  if (values.length < 2) throw new Error('The report tab has no data rows.');

  var at = mapColumns(values[0]);
  var harvest = [];
  var negate = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var term = String(row[at.term]).trim();
    if (!term) continue;

    var clicks = toNumber(row[at.clicks]);
    var orders = toNumber(row[at.orders]);
    var spend = toNumber(row[at.spend]);
    var sales = toNumber(row[at.sales]);

    if (clicks < CONFIG.minClicks) continue;

    if (orders === 0) {
      if (clicks >= CONFIG.negateClicks) {
        negate.push([term, 'negative exact', clicks, round2(spend),
          clicks + ' clicks, no orders']);
      }
      continue;
    }

    var acos = sales > 0 ? spend / sales : Infinity;
    var cvr = orders / clicks;

    if (acos <= CONFIG.targetAcos && cvr >= CONFIG.minCvr) {
      var aov = sales / orders;
      var maxCpc = CONFIG.targetAcos * aov * cvr;
      harvest.push([term, 'exact', round2(maxCpc * CONFIG.bidAggression), orders,
        round2(cvr * 100), round2(acos * 100), round2(sales)]);
    } else if (acos > CONFIG.ceilingAcos) {
      negate.push([term, 'negative exact', clicks, round2(spend),
        'ACoS ' + Math.round(acos * 100) + '% is over the ceiling']);
    }
  }

  writeTab(ss, CONFIG.harvestSheet,
    ['Keyword', 'Match type', 'Suggested bid', 'Orders', 'CVR %', 'ACoS %', 'Sales'], harvest);
  writeTab(ss, CONFIG.negateSheet,
    ['Keyword', 'Match type', 'Clicks', 'Wasted spend', 'Reason'], negate);

  ss.toast(harvest.length + ' to harvest, ' + negate.length + ' to negate', 'Done', 8);
}

function mapColumns(header) {
  var lower = header.map(function (cell) { return String(cell).trim().toLowerCase(); });
  var at = {};
  Object.keys(COLUMNS).forEach(function (key) {
    var index = lower.indexOf(COLUMNS[key]);
    if (index === -1) throw new Error('Column not found: ' + COLUMNS[key]);
    at[key] = index;
  });
  return at;
}

function writeTab(ss, name, header, rows) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, header.length);
}

function toNumber(value) {
  var parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
`,
    explanation: [
      {
        lines: "12-22",
        what: "Seven settings in one object. Keeping them at the top rather than scattered through the loop is what lets a VA hand the sheet to a colleague with 'change targetAcos and run it'.",
      },
      {
        lines: "25-32",
        what: "Column names as Amazon ships them, lowercase. The mapColumns helper matches against a trimmed lowercase header row, so a report with '7 Day Total Sales ' and its trailing space still resolves.",
      },
      {
        lines: "34-39",
        what: "onOpen adds a PPC menu to the sheet. Apps Script runs this automatically when the file is opened, which is what turns the script from something you run in an editor into something the client can run themselves.",
      },
      {
        lines: "49-52",
        what: "getDataRange().getValues() pulls the entire tab in one call. Reading cell by cell inside the loop would make a 2,000-row report take minutes instead of seconds — Apps Script charges for every service call, not for the arithmetic.",
      },
      {
        lines: "64-84",
        what: "The rule cascade, in the same order as the negative miner: not enough clicks, then no orders, then harvest, then the ACoS ceiling. A term that is neither harvest nor negate falls through and is simply left alone.",
      },
      {
        lines: "78-80",
        what: "The suggested bid. Average order value times conversion rate times target ACoS gives the max CPC for this specific term, and eighty percent of that is the bid to launch it at.",
      },
      {
        lines: "108-118",
        what: "writeTab creates the tab if it does not exist, clears it if it does, bolds and freezes the header and autosizes the columns — so the second run looks exactly like the first.",
      },
    ],
    steps: [
      {
        title: "Create the sheet",
        detail:
          "New Google Sheet. Rename the first tab to exactly 'Search Term Report', including the capitals.",
      },
      {
        title: "Paste the report",
        detail:
          "Download the Sponsored Products search term report as CSV, open it, copy everything including the header row, and paste into A1 of that tab.",
      },
      {
        title: "Add the script",
        detail:
          "Extensions ▸ Apps Script. Delete the placeholder myFunction, paste this file in, and save with the disk icon. Name the project something you will recognise in six months.",
      },
      {
        title: "Authorise it once",
        detail:
          "Pick harvestSearchTerms in the function dropdown and press Run. Google will ask for permission to see and manage this spreadsheet — that is Apps Script asking on your behalf, and it is limited to this file. Approve it.",
      },
      {
        title: "Run it from the sheet after that",
        detail:
          "Reload the spreadsheet and a PPC menu appears next to Help. From then on it is PPC ▸ Harvest search terms, and two tabs rewrite themselves in a couple of seconds.",
      },
      {
        title: "Check the Harvest tab before you build anything",
        detail:
          "A term can pass every rule and still be wrong — a competitor's brand name, or a size you no longer stock. Delete those rows, then take the rest to the bulk sheet generator.",
      },
    ],
    expectedOutput: `Toast: 11 to harvest, 27 to negate

Harvest tab
Keyword                            Match type  Suggested bid  Orders  CVR %  ACoS %  Sales
bamboo cutting board set           exact                0.74      51  12.38   22.83  1529.49
wood cutting board with handle     exact                0.99      27  13.64   19.56   809.73
bamboo cutting boards for kitchen  exact                1.02      19  14.18   18.81   569.81
cutting board set of 3             exact                1.09      17  15.18   18.45   509.83

Negate tab
Keyword                Match type      Clicks  Wasted spend  Reason
cheese board           negative exact     143        132.99  143 clicks, no orders
cutting board oil      negative exact      96         78.72  96 clicks, no orders
plastic cutting board  negative exact      88         79.20  ACoS 264% is over the ceiling
walnut cutting board   negative exact      64         57.60  64 clicks, no orders`,
    outputNote:
      "Suggested bids differ per keyword because each one carries its own average order value and conversion rate. That is the point — a flat launch bid across a harvest list is how a good list becomes a bad campaign.",
    tags: ["harvesting", "negatives", "apps-script", "google-sheets", "search-terms"],
    related: ["negative-keyword-miner", "bulk-sheet-generator", "bid-adjuster-acos-bands"],
  },

  {
    id: "bid-adjuster-acos-bands",
    title: "Bid adjuster by ACoS bands",
    summary:
      "Applies the automation guide's bid rules to a keyword performance tab — cut 15% above 1.5x target, raise 10% below half target with proven orders, hold inside the band — with guardrails on minimum, maximum and per-run change.",
    language: "google-apps-script",
    difficulty: "advanced",
    href: "/scripts/bid-adjuster-acos-bands",
    minutes: 25,
    automates:
      "Reading ACoS on 300 keywords and typing a new bid for each one, which is the single most repetitive job in PPC.",
    frequency: "Weekly, never daily on a small account",
    saves: "1-2 hours a week on a mid-size account",
    prerequisites: [
      "A tab named 'Keywords' with the keyword performance report pasted in",
      "A Days column, or a start date per keyword, so new keywords can be left alone",
      "A target ACoS per campaign, or one account-wide target",
      "A willingness to read the Changes tab before uploading anything",
    ],
    fileName: "bid_adjuster_acos_bands.gs",
    code: `/**
 * Bid adjuster - ACoS bands
 *
 * Reads the "Keywords" tab and writes a "Changes" tab holding only the
 * keywords whose bid should move, formatted for a bulk upload.
 *
 * Rules (from the PPC automation guide):
 *   ACoS > target x 1.5                     -> reduce bid 15%
 *   ACoS within +/-20% of target            -> no change
 *   ACoS < target x 0.5 AND orders > 3      -> raise bid 10%
 *   clicks >= 20 AND orders = 0             -> flag to negate, no bid change
 *   fewer than LEARNING_DAYS days of data   -> no change
 *
 * Guardrails: never below MIN_BID, never above MAX_BID, never move more
 * than MAX_CHANGE in one run.
 */

var RULES = {
  targetAcos: 0.30,
  highBand: 1.5,        // multiple of target that triggers a cut
  lowBand: 0.5,         // multiple of target that allows a raise
  cutBy: 0.15,
  raiseBy: 0.10,
  minOrdersToRaise: 3,
  negateClicks: 20,
  learningDays: 14,
  minBid: 0.30,
  maxBid: 5.00,
  maxChange: 0.20       // hard cap on movement in a single run
};

var COLUMNS = {
  campaign: 'campaign name',
  adGroup: 'ad group name',
  keyword: 'keyword text',
  match: 'match type',
  bid: 'bid',
  clicks: 'clicks',
  orders: '7 day total orders (#)',
  spend: 'spend',
  sales: '7 day total sales',
  days: 'days'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PPC')
    .addItem('Recalculate bids', 'adjustBids')
    .addToUi();
}

function adjustBids() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Keywords');
  if (!sheet) throw new Error('No tab named "Keywords".');

  var values = sheet.getDataRange().getValues();
  var at = mapColumns(values[0]);
  var changes = [];
  var held = 0;
  var flagged = 0;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var keyword = String(row[at.keyword]).trim();
    if (!keyword) continue;

    var bid = toNumber(row[at.bid]);
    var clicks = toNumber(row[at.clicks]);
    var orders = toNumber(row[at.orders]);
    var spend = toNumber(row[at.spend]);
    var sales = toNumber(row[at.sales]);
    var days = at.days === -1 ? RULES.learningDays : toNumber(row[at.days]);

    if (days < RULES.learningDays) { held++; continue; }

    if (orders === 0 && clicks >= RULES.negateClicks) {
      changes.push([row[at.campaign], row[at.adGroup], keyword, row[at.match],
        bid, bid, 'NEGATE', clicks + ' clicks, no orders']);
      flagged++;
      continue;
    }

    var acos = sales > 0 ? spend / sales : Infinity;
    var decision = decide(acos, orders);
    if (decision.factor === 1) { held++; continue; }

    var proposed = clamp(bid * decision.factor, bid);
    if (Math.abs(proposed - bid) < 0.01) { held++; continue; }

    changes.push([row[at.campaign], row[at.adGroup], keyword, row[at.match],
      bid, proposed, decision.action,
      'ACoS ' + (isFinite(acos) ? Math.round(acos * 100) + '%' : 'no sales')
        + ' vs target ' + Math.round(RULES.targetAcos * 100) + '%']);
  }

  writeChanges(ss, changes);
  ss.toast(changes.length + ' changes, ' + held + ' held, ' + flagged + ' to negate', 'Done', 8);
}

function decide(acos, orders) {
  if (acos > RULES.targetAcos * RULES.highBand) {
    return { factor: 1 - RULES.cutBy, action: 'CUT' };
  }
  if (acos < RULES.targetAcos * RULES.lowBand && orders > RULES.minOrdersToRaise) {
    return { factor: 1 + RULES.raiseBy, action: 'RAISE' };
  }
  return { factor: 1, action: 'HOLD' };
}

/** Apply the floor, the ceiling and the per-run movement cap, in that order. */
function clamp(proposed, currentBid) {
  var ceiling = currentBid * (1 + RULES.maxChange);
  var floor = currentBid * (1 - RULES.maxChange);
  var capped = Math.min(Math.max(proposed, floor), ceiling);
  capped = Math.min(Math.max(capped, RULES.minBid), RULES.maxBid);
  return Math.round(capped * 100) / 100;
}

function writeChanges(ss, rows) {
  var header = ['Campaign', 'Ad Group', 'Keyword', 'Match Type',
    'Current Bid', 'New Bid', 'Action', 'Why'];
  var sheet = ss.getSheetByName('Changes') || ss.insertSheet('Changes');
  sheet.clear();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, header.length);
}

function mapColumns(header) {
  var lower = header.map(function (cell) { return String(cell).trim().toLowerCase(); });
  var at = {};
  Object.keys(COLUMNS).forEach(function (key) {
    at[key] = lower.indexOf(COLUMNS[key]);
    if (at[key] === -1 && key !== 'days') {
      throw new Error('Column not found: ' + COLUMNS[key]);
    }
  });
  return at;
}

function toNumber(value) {
  var parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}
`,
    explanation: [
      {
        lines: "18-31",
        what: "Every rule as data. The three guardrails at the bottom — minBid, maxBid, maxChange — are the difference between automation and an incident: without maxChange a keyword with one lucky order can double its bid.",
      },
      {
        lines: "44",
        what: "The days column is optional. mapColumns tolerates its absence and the loop then assumes every keyword is past the learning period, which is the right default for an account you have been running for months.",
      },
      {
        lines: "76",
        what: "The learning-period skip comes before every other rule. A keyword with nine days of data has not earned a bid change no matter what its ACoS says, and checking it first means no other rule can override that.",
      },
      {
        lines: "78-83",
        what: "Zero-order keywords past the click threshold are written with the bid unchanged and an action of NEGATE. Cutting the bid on a keyword you are about to negate is wasted work, and the Changes tab should carry both kinds of decision.",
      },
      {
        lines: "101-110",
        what: "The decision function returns a multiplier and a label rather than a new bid, which keeps the bands readable and means the guardrails are applied in exactly one place.",
      },
      {
        lines: "113-120",
        what: "clamp applies the per-run movement cap first, then the absolute floor and ceiling. Order matters: applying the floor first would let a 15% cut on a $0.31 bid be rewritten as a rise to the $0.30 floor.",
      },
      {
        lines: "88",
        what: "Changes smaller than a cent are dropped into the held count. Amazon accepts them, but a bulk file full of one-cent moves is noise that makes the real changes hard to review.",
      },
    ],
    steps: [
      {
        title: "Build the Keywords tab",
        detail:
          "Download a Sponsored Products keyword report (or the Keyword rows of a bulk sheet), paste it into a tab named 'Keywords' with the header row intact. A Days column is optional but strongly recommended.",
      },
      {
        title: "Set the target ACoS",
        detail:
          "RULES.targetAcos as a ratio. Use the break-even ACoS calculator to get it, and set it per campaign by running the script on one campaign's rows at a time if targets differ.",
      },
      {
        title: "Run it and read the Changes tab",
        detail:
          "PPC ▸ Recalculate bids. Nothing is uploaded — the script only writes a tab. Read the Why column on ten random rows and satisfy yourself the rule fired for the right reason.",
      },
      {
        title: "Turn Changes into a bulk upload",
        detail:
          "Copy Campaign, Ad Group, Keyword, Match Type and New Bid into a bulk sheet with Entity set to Keyword and Operation set to Update. Rows with action NEGATE go into a separate negative keyword upload instead.",
      },
      {
        title: "Do not put this on a daily trigger",
        detail:
          "Weekly is the right cadence on most accounts. Seven days of data per decision is the minimum that survives a slow Tuesday, and daily bid movement teaches the auction nothing except that you are unstable.",
      },
    ],
    expectedOutput: `Toast: 46 changes, 214 held, 9 to negate

Changes tab
Campaign                       Ad Group     Keyword                    Match  Current  New   Action  Why
ACME_B08XYZ1234_SP_EXACT_SCALE EXACT-CORE   cutting board              Exact     0.94  0.80  CUT     ACoS 55% vs target 30%
ACME_B08XYZ1234_SP_EXACT_SCALE EXACT-CORE   bamboo cutting board set   Exact     0.85  0.94  RAISE   ACoS 23% vs target 30%
ACME_B08XYZ1234_SP_BROAD_LAUNCH BROAD-CORE  butcher block              Broad     1.08  0.92  CUT     ACoS 211% vs target 30%
ACME_B08XYZ1234_SP_AUTO_HARVEST AUTO-LOOSE  cheese board               Auto      0.93  0.93  NEGATE  143 clicks, no orders`,
    outputNote:
      "214 held out of 269 is the healthy shape. A run that wants to change most of the account means the target ACoS is wrong, not that the account is.",
    tags: ["bidding", "rules", "apps-script", "optimisation", "guardrails"],
    related: ["sp-bulk-bid-update", "search-term-harvester", "placement-performance-pivot"],
  },

  {
    id: "ranking-tracker",
    title: "Organic ranking tracker",
    summary:
      "Logs a dated snapshot of keyword ranks into a history tab every week, computes week-on-week and month-on-month movement, and highlights the biggest gains and losses.",
    language: "google-apps-script",
    difficulty: "beginner",
    href: "/scripts/ranking-tracker",
    minutes: 15,
    automates:
      "Keeping a rank history by hand, which everybody intends to do and nobody does past week three.",
    frequency: "Weekly, on a timed trigger",
    saves: "15 minutes a week, and a rank history you would otherwise never have",
    prerequisites: [
      "A 'Current Ranks' tab with two columns: keyword, and this week's organic rank",
      "A rank source — Helium 10 Keyword Tracker, Jungle Scout, or a manual search",
      "A Google Sheet you are happy to leave running on a weekly trigger",
    ],
    fileName: "ranking_tracker.gs",
    code: `/**
 * Organic ranking tracker
 *
 * Reads the "Current Ranks" tab (keyword in column A, rank in column B)
 * and appends a dated column to "Rank History", then rewrites a "Movers"
 * tab with the biggest week-on-week and month-on-month changes.
 *
 * Set a weekly time-driven trigger on snapshotRanks().
 */

var SOURCE = 'Current Ranks';
var HISTORY = 'Rank History';
var MOVERS = 'Movers';
var UNRANKED = 999;        // what to store when a keyword does not rank
var MOVER_THRESHOLD = 3;   // positions moved before it counts as news

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PPC')
    .addItem('Snapshot ranks now', 'snapshotRanks')
    .addToUi();
}

function snapshotRanks() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName(SOURCE);
  if (!source) throw new Error('No tab named "' + SOURCE + '".');

  var current = source.getRange(2, 1, Math.max(source.getLastRow() - 1, 1), 2).getValues();
  var ranks = {};
  current.forEach(function (row) {
    var keyword = String(row[0]).trim().toLowerCase();
    if (!keyword) return;
    var rank = Number(row[1]);
    ranks[keyword] = (isNaN(rank) || rank <= 0) ? UNRANKED : rank;
  });

  var history = ss.getSheetByName(HISTORY) || createHistory(ss);
  var lastColumn = history.getLastColumn();
  var lastRow = Math.max(history.getLastRow(), 1);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Existing keywords, in the order the history already holds them.
  var existing = lastRow > 1
    ? history.getRange(2, 1, lastRow - 1, 1).getValues().map(function (row) {
        return String(row[0]).trim().toLowerCase();
      })
    : [];

  // Append any keyword the history has not seen before.
  Object.keys(ranks).forEach(function (keyword) {
    if (existing.indexOf(keyword) === -1) existing.push(keyword);
  });

  if (existing.length > 0) {
    history.getRange(2, 1, existing.length, 1)
      .setValues(existing.map(function (keyword) { return [keyword]; }));
  }

  var column = lastColumn + 1;
  history.getRange(1, column).setValue(stamp).setFontWeight('bold');
  history.getRange(2, column, existing.length, 1).setValues(
    existing.map(function (keyword) {
      return [ranks[keyword] === undefined ? '' : ranks[keyword]];
    })
  );

  buildMovers(ss, history, existing);
  ss.toast(existing.length + ' keywords snapshotted for ' + stamp, 'Rank history', 8);
}

function createHistory(ss) {
  var sheet = ss.insertSheet(HISTORY);
  sheet.getRange(1, 1).setValue('Keyword').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  return sheet;
}

function buildMovers(ss, history, keywords) {
  var lastColumn = history.getLastColumn();
  if (lastColumn < 3) return;   // need at least two snapshots to compare

  var thisWeek = readColumn(history, lastColumn, keywords.length);
  var lastWeek = readColumn(history, lastColumn - 1, keywords.length);
  var monthAgo = lastColumn >= 6
    ? readColumn(history, lastColumn - 4, keywords.length)
    : null;

  var rows = [];
  for (var i = 0; i < keywords.length; i++) {
    var now = thisWeek[i];
    var prior = lastWeek[i];
    if (now === '' || prior === '') continue;
    var weekMove = prior - now;          // positive = moved up the page
    var monthMove = monthAgo && monthAgo[i] !== '' ? monthAgo[i] - now : '';
    if (Math.abs(weekMove) < MOVER_THRESHOLD) continue;
    rows.push([keywords[i], prior, now, weekMove, monthMove,
      weekMove > 0 ? 'UP' : 'DOWN']);
  }

  rows.sort(function (a, b) { return Math.abs(b[3]) - Math.abs(a[3]); });

  var sheet = ss.getSheetByName(MOVERS) || ss.insertSheet(MOVERS);
  sheet.clear();
  var header = ['Keyword', 'Last week', 'This week', 'Week move', 'Month move', 'Direction'];
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, header.length);
}

function readColumn(sheet, column, rowCount) {
  return sheet.getRange(2, column, rowCount, 1).getValues().map(function (row) {
    return row[0] === '' ? '' : Number(row[0]);
  });
}
`,
    explanation: [
      {
        lines: "11-15",
        what: "UNRANKED at 999 is a deliberate choice. Storing a blank for a keyword that does not rank makes every later subtraction a special case; storing a large number means 'fell off page 10' sorts correctly as a loss.",
      },
      {
        lines: "29-36",
        what: "Ranks are keyed by lowercase trimmed keyword, so 'Bamboo Cutting Board' pasted this week lines up with 'bamboo cutting board' from three months ago.",
      },
      {
        lines: "43-53",
        what: "The history keeps its own keyword order and appends anything new to the bottom. That is what makes the sheet a real time series: column positions never shift, so a chart built on it in month one still works in month six.",
      },
      {
        lines: "60-66",
        what: "One new column per run, headed with the date. A keyword present in the history but missing from this week's paste gets a blank rather than a zero, which keeps a partial upload from looking like a rank collapse.",
      },
      {
        lines: "80-87",
        what: "Movers needs at least two snapshots and prefers five — comparing against four columns back is the month-on-month figure, and it is simply skipped until the history is long enough.",
      },
      {
        lines: "93",
        what: "weekMove is prior minus now, so a positive number means the keyword moved up. Getting this the wrong way round is the most common bug in rank tracking, and the reason the Direction column spells it out.",
      },
      {
        lines: "97-101",
        what: "Movements under three positions are dropped. Amazon's organic rank noise on a mid-volume keyword is bigger than two positions, so reporting those as news trains the client to ignore the report.",
      },
    ],
    steps: [
      {
        title: "Set up the source tab",
        detail:
          "A tab named 'Current Ranks' with Keyword in A1 and Rank in B1, then your tracked keywords below. Fifteen to thirty keywords is the useful range; a hundred is a report nobody reads.",
      },
      {
        title: "Paste this week's ranks",
        detail:
          "From Helium 10 Keyword Tracker, export and paste the organic rank column. Leave a cell blank or put 0 where the product does not rank — the script converts that to 999.",
      },
      {
        title: "Add the script and run it once",
        detail:
          "Extensions ▸ Apps Script, paste, save, run snapshotRanks and approve the permission prompt. Check that a Rank History tab appeared with today's date as a column heading.",
      },
      {
        title: "Set the weekly trigger",
        detail:
          "In the Apps Script editor open the clock icon (Triggers) ▸ Add Trigger. Choose snapshotRanks, Time-driven, Week timer, and a day and hour. Pick the same slot you update the ranks — the script snapshots whatever is in the tab, so the trigger has to run after you paste.",
      },
      {
        title: "Read the Movers tab, not the history",
        detail:
          "The history is the archive. Movers is the report: five to fifteen rows, sorted by how far each keyword travelled, which is exactly the amount of rank information a weekly client update can carry.",
      },
    ],
    expectedOutput: `Toast: 22 keywords snapshotted for 2026-09-15

Rank History tab
Keyword                     2026-08-11  2026-08-18  2026-08-25  2026-09-01  2026-09-08  2026-09-15
bamboo cutting board set            42          38          31          27          22          18
cutting board                      999         156         141         128         119         112
wood cutting board                  74          71          69          64          58          51
end grain cutting board            999         999         999         248         201         187

Movers tab
Keyword                  Last week  This week  Week move  Month move  Direction
wood cutting board              58         51          7          23  UP
bamboo cutting board set        22         18          4           9  UP
serving board                   88         96         -8         -14  DOWN
cutting board                  119        112          7          29  UP`,
    outputNote:
      "A rank history is the single most persuasive artefact in a renewal conversation, and it only exists if something records it every week without being asked. That is the whole argument for the trigger.",
    tags: ["rank-tracking", "apps-script", "reporting", "organic", "trigger"],
    related: ["weekly-report-emailer", "wasted-spend-finder", "budget-pacing-alert"],
  },

  {
    id: "weekly-report-emailer",
    title: "Weekly report emailer",
    summary:
      "Builds an HTML weekly summary from the account data tab — spend, sales, ACoS, TACoS and week-on-week movement — and emails it to the client on a schedule.",
    language: "google-apps-script",
    difficulty: "advanced",
    href: "/scripts/weekly-report-emailer",
    minutes: 30,
    automates:
      "Writing the same email every Monday with last week's numbers pasted into it.",
    frequency: "Weekly, on a trigger",
    saves: "30-45 minutes a week per client",
    prerequisites: [
      "A 'Weekly Data' tab with one row per week: week ending, spend, ad sales, total sales, orders",
      "The client's email address, and their agreement to receive it",
      "A Google account — MailApp sends from the account that owns the script",
      "A test send to yourself before the first client send, every time you change the template",
    ],
    fileName: "weekly_report_emailer.gs",
    code: `/**
 * Weekly report emailer
 *
 * Reads the last two rows of "Weekly Data" and emails an HTML summary.
 * Columns: week ending | spend | ad sales | total sales | orders
 *
 * Set a weekly trigger on sendWeeklyReport(), Monday morning.
 */

var SETTINGS = {
  dataSheet: 'Weekly Data',
  to: 'client@example.com',
  cc: '',
  accountName: 'ACME Kitchenware',
  targetAcos: 0.30,
  sendTestTo: ''          // put your own address here to redirect while testing
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PPC')
    .addItem('Send weekly report', 'sendWeeklyReport')
    .addItem('Preview in a dialog', 'previewWeeklyReport')
    .addToUi();
}

function sendWeeklyReport() {
  var report = buildReport();
  var recipient = SETTINGS.sendTestTo || SETTINGS.to;
  MailApp.sendEmail({
    to: recipient,
    cc: SETTINGS.sendTestTo ? '' : SETTINGS.cc,
    subject: SETTINGS.accountName + ' - PPC week ending ' + report.weekEnding,
    htmlBody: report.html,
    body: report.text
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('Sent to ' + recipient, 'Weekly report', 8);
}

function previewWeeklyReport() {
  var report = buildReport();
  var output = HtmlService.createHtmlOutput(report.html).setWidth(680).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(output, 'Weekly report preview');
}

function buildReport() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS.dataSheet);
  if (!sheet) throw new Error('No tab named "' + SETTINGS.dataSheet + '".');

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) throw new Error('Need at least two weeks of data.');

  var rows = sheet.getRange(lastRow - 1, 1, 2, 5).getValues();
  var prior = parseWeek(rows[0]);
  var current = parseWeek(rows[1]);

  var metrics = [
    metric('Ad spend', current.spend, prior.spend, 'money', false),
    metric('Ad sales', current.adSales, prior.adSales, 'money', true),
    metric('Total sales', current.totalSales, prior.totalSales, 'money', true),
    metric('Orders', current.orders, prior.orders, 'count', true),
    metric('ACoS', current.acos, prior.acos, 'percent', false),
    metric('TACoS', current.tacos, prior.tacos, 'percent', false),
    metric('Organic sales', current.organic, prior.organic, 'money', true)
  ];

  return {
    weekEnding: current.weekEnding,
    html: renderHtml(metrics, current),
    text: renderText(metrics, current)
  };
}

function parseWeek(row) {
  var spend = Number(row[1]) || 0;
  var adSales = Number(row[2]) || 0;
  var totalSales = Number(row[3]) || 0;
  return {
    weekEnding: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), 'd MMM yyyy'),
    spend: spend,
    adSales: adSales,
    totalSales: totalSales,
    orders: Number(row[4]) || 0,
    organic: totalSales - adSales,
    acos: adSales > 0 ? spend / adSales * 100 : 0,
    tacos: totalSales > 0 ? spend / totalSales * 100 : 0
  };
}

function metric(label, now, before, kind, higherIsBetter) {
  var change = before === 0 ? 0 : (now - before) / before * 100;
  var good = higherIsBetter ? change >= 0 : change <= 0;
  return {
    label: label,
    value: format(now, kind),
    prior: format(before, kind),
    change: (change >= 0 ? '+' : '') + change.toFixed(1) + '%',
    colour: Math.abs(change) < 1 ? '#545c6b' : (good ? '#0f7a55' : '#c0392b')
  };
}

function format(value, kind) {
  if (kind === 'money') return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (kind === 'percent') return value.toFixed(1) + '%';
  return String(Math.round(value));
}

function renderHtml(metrics, current) {
  var rows = metrics.map(function (item) {
    return '<tr>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e4e0d8">' + item.label + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e4e0d8;text-align:right;'
      + 'font-family:monospace"><strong>' + item.value + '</strong></td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e4e0d8;text-align:right;'
      + 'font-family:monospace;color:#6b7383">' + item.prior + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #e4e0d8;text-align:right;'
      + 'font-family:monospace;color:' + item.colour + '">' + item.change + '</td>'
      + '</tr>';
  }).join('');

  return '<div style="font-family:Arial,sans-serif;max-width:640px;color:#10141c">'
    + '<h2 style="margin:0 0 4px">' + SETTINGS.accountName + '</h2>'
    + '<p style="margin:0 0 16px;color:#545c6b">PPC summary, week ending '
    + current.weekEnding + '</p>'
    + '<table style="border-collapse:collapse;width:100%;font-size:14px">'
    + '<tr style="background:#f3f1ec">'
    + '<th style="padding:8px 12px;text-align:left">Metric</th>'
    + '<th style="padding:8px 12px;text-align:right">This week</th>'
    + '<th style="padding:8px 12px;text-align:right">Last week</th>'
    + '<th style="padding:8px 12px;text-align:right">Change</th>'
    + '</tr>' + rows + '</table>'
    + '<p style="margin:16px 0 0;font-size:13px;color:#545c6b">Target ACoS '
    + (SETTINGS.targetAcos * 100).toFixed(0) + '%. '
    + (current.acos <= SETTINGS.targetAcos * 100
        ? 'The account is at or under target.'
        : 'The account is over target - bid reductions go out this week.')
    + '</p></div>';
}

function renderText(metrics, current) {
  var lines = [SETTINGS.accountName + ' - week ending ' + current.weekEnding, ''];
  metrics.forEach(function (item) {
    lines.push(item.label + ': ' + item.value + ' (was ' + item.prior + ', ' + item.change + ')');
  });
  return lines.join('\\n');
}
`,
    explanation: [
      {
        lines: "10-17",
        what: "sendTestTo is the most important line in the file. Set it to your own address and every send is redirected, so a template change can never reach a client by accident. Clear it when you are happy.",
      },
      {
        lines: "39-43",
        what: "A preview that renders the same HTML in a modal inside the sheet. Reviewing the email in a dialog rather than by sending yourself a test is the difference between a two-minute edit loop and a ten-minute one.",
      },
      {
        lines: "52-55",
        what: "Only the last two rows are read. The tab can hold three years of history and the script still costs the same, because Apps Script quotas are about service calls, not stored rows.",
      },
      {
        lines: "75-89",
        what: "parseWeek derives organic sales, ACoS and TACoS rather than storing them. Derived columns in a data tab drift the moment somebody edits a number and forgets to refresh the formula.",
      },
      {
        lines: "91-102",
        what: "The metric helper carries higherIsBetter, because a rise in spend and a rise in sales are not the same news. The colour is decided from that flag, not from the sign of the change.",
      },
      {
        lines: "99",
        what: "Movements under one percent are painted grey. A report that colours every row green or red teaches a client that the colours mean nothing.",
      },
      {
        lines: "148-154",
        what: "A plain-text body alongside the HTML. Some clients read mail in a client that strips HTML, and MailApp will use the text version rather than showing them an empty message.",
      },
    ],
    steps: [
      {
        title: "Build the Weekly Data tab",
        detail:
          "Five columns: week ending (a real date), spend, ad sales, total sales, orders. One row per week, newest at the bottom. Spend and ad sales come from the advertising console; total sales comes from the Business Report.",
      },
      {
        title: "Fill in SETTINGS",
        detail:
          "Account name, the client's address, and your own address in sendTestTo. Leave sendTestTo populated until the template is final.",
      },
      {
        title: "Preview before you send",
        detail:
          "PPC ▸ Preview in a dialog. Check the numbers against the sheet by eye — a report that is wrong once costs more trust than ten reports earn.",
      },
      {
        title: "Send a test, then clear sendTestTo",
        detail:
          "Run PPC ▸ Send weekly report with sendTestTo still set to you. When the email looks right in a real inbox, clear sendTestTo and save.",
      },
      {
        title: "Set the Monday trigger",
        detail:
          "Triggers ▸ Add Trigger ▸ sendWeeklyReport, Time-driven, Week timer, Monday, 8-9am. Update the data tab on Sunday evening or Monday before the trigger fires.",
      },
      {
        title: "Know the quota",
        detail:
          "A consumer Gmail account can send 100 emails a day through MailApp; Workspace accounts get 1,500. One weekly report per client is nowhere near either, but a loop that emails per campaign will find the limit fast.",
      },
    ],
    expectedOutput: `Subject: ACME Kitchenware - PPC week ending 14 Sep 2026

ACME Kitchenware
PPC summary, week ending 14 Sep 2026

Metric          This week    Last week     Change
Ad spend             $712          $688      +3.5%
Ad sales           $2,140        $1,905     +12.3%
Total sales        $7,020        $6,410      +9.5%
Orders                 71            64     +10.9%
ACoS                33.3%         36.1%      -7.8%
TACoS               10.1%         10.7%      -5.6%
Organic sales      $4,880        $4,505      +8.3%

Target ACoS 30%. The account is over target - bid reductions go out this week.`,
    outputNote:
      "Spend up 3.5% while ACoS falls 7.8% and organic sales rise 8.3% is the shape you want a client to see every week. The closing sentence changes itself based on the target, so the email never congratulates you on a bad week.",
    tags: ["reporting", "email", "apps-script", "client-communication", "trigger"],
    related: ["budget-pacing-alert", "ranking-tracker", "wasted-spend-finder"],
  },
];
