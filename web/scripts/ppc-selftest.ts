/**
 * PPC Console engine self-test.
 *
 *   cd web && npx jiti scripts/ppc-selftest.ts
 *
 * Plain node:assert, no framework. Exits non-zero on failure.
 * Covers CSV, ZIP/XLSX, report detection, bid maths, the recommendation engine
 * (hand-worked dataset), exports, demo data, db.ts import safety, the
 * /dashboard overview computations and the Keywords / Search terms / Bids
 * page models (decisions, explanations, target table, explorer, calculator),
 * plus regressions for verified engine defects (ppc-test-regressions.ts) and
 * the data layer: overlapping imports, row versions, decision lifetimes
 * (ppc-test-data.ts), console-UI logic (ppc-test-ui.ts), and the static-export
 * postbuild step that flattens Windows-built segment files (ppc-test-site.ts).
 */

import "./ppc-test-io";
import "./ppc-test-rules";
import "./ppc-test-demo";
import "./ppc-test-overview";
import "./ppc-test-work";
import "./ppc-test-regressions";
import "./ppc-test-data";
import "./ppc-test-ui";
import "./ppc-test-site";
import { run } from "./ppc-test-harness";

run()
  .then((failures) => {
    process.exit(failures ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
