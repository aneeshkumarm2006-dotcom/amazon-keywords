/**
 * Human labels for the resources quiz explanations cite.
 *
 * Quiz questions carry a bare `reference` href. Rendering "Read the
 * reference" under every explanation wastes the one line that could tell a
 * reader what they are about to open, but the runner is a client component
 * and resolving the title through `src/content/registry.ts` would put the
 * whole library — every SOP body, every case study — into the browser bundle
 * of every quiz page.
 *
 * So the labels live here as data: 54 rows, under 4KB, no imports.
 * `assertReferenceIndex()` in `src/lib/related.ts` checks this table against
 * the live registry on every build, so a renamed SOP or a retargeted question
 * fails `npm run build` instead of shipping a wrong or missing label.
 */

export interface ReferenceLabel {
  /** The resource's own title. */
  title: string;
  /** What kind of thing it is, e.g. "SOP", "Glossary". */
  kind: string;
}

export const REFERENCE_LABELS: Record<string, ReferenceLabel> = {
  "/career/salary-negotiation": { title: "Salary and negotiation guide", kind: "Career guide" },
  "/cheat-sheets/ad-types": { title: "Amazon ad types", kind: "Cheat sheet" },
  "/cheat-sheets/campaign-structure": { title: "Campaign structure", kind: "Cheat sheet" },
  "/cheat-sheets/match-types": { title: "Match types", kind: "Cheat sheet" },
  "/cheat-sheets/negative-keywords": { title: "Negative keywords", kind: "Cheat sheet" },
  "/cheat-sheets/ppc-metrics": { title: "PPC metrics", kind: "Cheat sheet" },
  "/cheat-sheets/search-term-report": { title: "Search term report", kind: "Cheat sheet" },
  "/glossary#acos": { title: "ACoS (Advertising Cost of Sale)", kind: "Glossary" },
  "/glossary#ad-group": { title: "Ad group", kind: "Glossary" },
  "/glossary#asin-variation": { title: "Variation", kind: "Glossary" },
  "/glossary#attribution-window": { title: "Attribution window", kind: "Glossary" },
  "/glossary#auto-campaign": { title: "Auto campaign", kind: "Glossary" },
  "/glossary#break-even-acos": { title: "Break-even ACoS", kind: "Glossary" },
  "/glossary#broad-match": { title: "Broad match", kind: "Glossary" },
  "/glossary#budget-pacing": { title: "Budget pacing", kind: "Glossary" },
  "/glossary#budget-rule": { title: "Budget rule", kind: "Glossary" },
  "/glossary#bulk-operations": { title: "Bulk operations", kind: "Glossary" },
  "/glossary#contribution-margin": { title: "Contribution margin", kind: "Glossary" },
  "/glossary#cpc": { title: "CPC (Cost Per Click)", kind: "Glossary" },
  "/glossary#ctr": { title: "CTR (Click-Through Rate)", kind: "Glossary" },
  "/glossary#cvr": { title: "CVR (Conversion Rate)", kind: "Glossary" },
  "/glossary#daily-budget": { title: "Daily budget", kind: "Glossary" },
  "/glossary#dayparting": { title: "Dayparting", kind: "Glossary" },
  "/glossary#dynamic-bids-up-and-down": { title: "Dynamic bids, up and down", kind: "Glossary" },
  "/glossary#exact-match": { title: "Exact match", kind: "Glossary" },
  "/glossary#impressions": { title: "Impressions", kind: "Glossary" },
  "/glossary#keyword-cannibalisation": { title: "Keyword cannibalisation", kind: "Glossary" },
  "/glossary#max-cpc": { title: "Maximum CPC", kind: "Glossary" },
  "/glossary#naming-convention": { title: "Naming convention", kind: "Glossary" },
  "/glossary#negative-product-targeting": { title: "Negative product targeting", kind: "Glossary" },
  "/glossary#new-to-brand": { title: "New-to-brand (NTB)", kind: "Glossary" },
  "/glossary#placement": { title: "Placement", kind: "Glossary" },
  "/glossary#placement-adjustment": { title: "Placement adjustment", kind: "Glossary" },
  "/glossary#placement-report": { title: "Placement report", kind: "Glossary" },
  "/glossary#portfolio": { title: "Portfolio", kind: "Glossary" },
  "/glossary#product-targeting": { title: "Product targeting", kind: "Glossary" },
  "/glossary#purchased-product-report": { title: "Purchased Product report", kind: "Glossary" },
  "/glossary#roas": { title: "ROAS (Return on Ad Spend)", kind: "Glossary" },
  "/glossary#tacos": { title: "TACoS (Total Advertising Cost of Sale)", kind: "Glossary" },
  "/glossary#top-of-search-is": { title: "Top-of-search impression share", kind: "Glossary" },
  "/sops/bid-optimization": { title: "SOP-03: Bid Optimization", kind: "SOP" },
  "/sops/campaign-launch": { title: "SOP-04: Campaign Launch (New Product)", kind: "SOP" },
  "/sops/campaign-restructuring": { title: "SOP-05: Campaign Restructuring", kind: "SOP" },
  "/sops/client-onboarding": { title: "SOP-07: Client Onboarding", kind: "SOP" },
  "/sops/daily-health-check": { title: "SOP-01: Daily PPC Health Check", kind: "SOP" },
  "/sops/escalation-procedures": { title: "SOP-08: Escalation Procedures", kind: "SOP" },
  "/sops/monthly-performance-report": { title: "SOP-06: Monthly Performance Report", kind: "SOP" },
  "/sops/weekly-search-term-analysis": { title: "SOP-02: Weekly Search Term Report Analysis", kind: "SOP" },
  "/templates/campaign-audit-checklist": { title: "Campaign audit checklist", kind: "Template" },
  "/templates/client-communication-templates": { title: "Client communication templates", kind: "Template" },
  "/workflows/ab-testing-process": { title: "A/B testing process", kind: "Workflow" },
  "/workflows/campaign-structure-decision-tree": { title: "Campaign structure decision tree", kind: "Workflow" },
  "/workflows/search-term-harvesting": { title: "Search term harvesting flow", kind: "Workflow" },
  "/workflows/seasonal-preparation": { title: "Seasonal preparation", kind: "Workflow" },
};

/** Label for a quiz reference href, or undefined when it is not indexed. */
export function referenceLabel(href: string): ReferenceLabel | undefined {
  return REFERENCE_LABELS[href];
}
