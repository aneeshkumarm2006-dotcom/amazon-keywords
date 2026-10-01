<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# PPC Academy — project conventions (READ FULLY BEFORE WRITING CODE)

You are building **PPC Academy**, an interactive learning platform for Filipino Virtual
Assistants training to become Amazon PPC specialists. Source content lives in the sibling
repo `../ppc-tools-for-va/` (markdown + xlsx). This Next.js app is the product.

## Non-negotiables

1. **Static export.** `next.config.ts` sets `output: "export"`. There is NO server, NO
   database, NO API routes, NO server actions, NO `revalidate`, NO middleware, NO
   `next/headers`/`cookies()`. Every dynamic route must have `generateStaticParams`.
   All persistence is `localStorage` via `src/lib/storage.ts`. Never add a backend.
2. **`npm run build` must pass** (zero TS errors, zero build errors) before you finish.
   Run it. Fix what you broke. Also run `npx eslint src` and fix real errors.
3. **Never edit files a previous phase owns** unless your phase brief says so. To add a
   nav link or register a resource, use the designated registry files (see Ownership).
4. **Never delete or rewrite existing working components.** Extend them.
5. **No new npm dependencies.** Everything needed is already installed:
   `fuse.js`, `lucide-react`, `clsx`, `tailwind-merge`, `react-markdown`, `remark-gfm`,
   `rehype-slug`, `rehype-autolink-headings`, `gray-matter`, `zustand`, `recharts`.
   If you think you need another one, you don't — solve it with what is there.
6. **Client components need `"use client"`.** Anything with hooks, state, event handlers,
   `localStorage`, `recharts`, or `fuse.js` at runtime is a client component. Keep pages
   as server components that import client islands where possible.
7. This is **Next.js 16 / React 19 / Tailwind v4**. Read `node_modules/next/dist/docs/01-app/`
   if unsure about an API. Tailwind v4 has no `tailwind.config.js` — theme lives in
   `src/app/globals.css` under `@theme`.

## Design system

Tokens are defined in `src/app/globals.css`. **Always use token classes, never raw hex.**

| Token class | Meaning |
|---|---|
| `bg-canvas` / `bg-surface` / `bg-surface-2` | page bg / card bg / raised bg |
| `text-ink` / `text-muted` / `text-faint` | primary / secondary / tertiary text |
| `border-hairline` | all borders |
| `bg-brand` / `text-brand` / `border-brand` | deep emerald-teal, primary actions |
| `bg-ember` / `text-ember` | warm orange, accent + highlights (use sparingly) |
| `text-good` / `text-warn` / `text-bad` / `text-info` | metric semantics (ACoS bands etc.) |

- **Fonts:** `font-display` (Space Grotesk) for headings, default sans (Inter) for body,
  `font-mono` (JetBrains Mono) for metrics, formulas, code, and numerals in stat blocks.
- **Radii:** `rounded-lg` inputs/buttons, `rounded-xl` cards, `rounded-2xl` panels.
- **Shadows:** almost none. Use `border-hairline` + `bg-surface` for separation. One soft
  shadow (`shadow-card`) on elevated/hover cards only.
- **Dark mode:** class-based (`.dark` on `<html>`), toggled by `ThemeToggle`, persisted in
  localStorage, with a no-flash inline script in `layout.tsx`. Every token has a dark value —
  never hardcode a color that only works in one theme.
- **Feel:** editorial and data-dense, not a generic SaaS landing page. Real numbers, tables,
  metric chips, tight typography. No gradient-blob hero, no glassmorphism, no emoji used as
  iconography (use `lucide-react`). Generous whitespace, strong type hierarchy, restrained
  color — brand/ember are accents, not backgrounds for whole sections.
- **Accessibility:** semantic HTML, visible `focus-visible` rings on every interactive
  element, `aria-label` on icon-only buttons, 44px min touch targets, keyboard-operable
  everything, `prefers-reduced-motion` respected.
- **Responsive:** must work at 360px width. No horizontal page scroll ever. Tables and wide
  diagrams go in `overflow-x-auto` wrappers.

## Shared utilities (phase 1 creates these; everyone uses them)

- `src/lib/utils.ts` — `cn(...)` (clsx + tailwind-merge), `formatNumber`, `formatCurrency`,
  `formatPercent`, `slugify`.
- `src/lib/storage.ts` — safe localStorage read/write (try/catch, SSR-safe), namespaced
  under `ppc-academy:`.
- `src/components/ui/*` — `Button`, `Card`, `Badge`, `Input`, `Select`, `Tabs`, `Accordion`,
  `Progress`, `Callout`, `StatTile`, `Table`, `Dialog`, `Skeleton`, `EmptyState`.
- `src/components/layout/*` — `Header`, `Footer`, `Container`, `PageHeader`, `Section`,
  `Breadcrumbs`, `ThemeToggle`, `MobileNav`.

## Content contracts (`src/types/content.ts` — phase 1 authors these EXACTLY)

```ts
export type ResourceKind =
  | "quiz" | "interview" | "case-study" | "sop" | "workflow"
  | "template" | "automation" | "career" | "calculator" | "cheat-sheet" | "glossary";

export type Level = "beginner" | "intermediate" | "advanced" | "expert" | "scenario";

/** Every browsable item registers one of these so search + nav can find it. */
export interface ResourceRef {
  id: string;            // stable, unique, kebab-case
  kind: ResourceKind;
  title: string;
  summary: string;       // 1-2 sentences, plain text
  href: string;          // internal route, e.g. "/sops/daily-health-check"
  tags: string[];
  level?: Level;
  minutes?: number;      // est. read/complete time
  body?: string;         // full plain-text body for search indexing
  updated?: string;      // ISO date
}

export interface QuizQuestion {
  id: string;
  level: Level;
  topic: string;
  question: string;
  choices: string[];          // 4 choices
  answerIndex: number;
  explanation: string;        // why the answer is right
  reference?: string;         // link to a resource href
}

export interface Quiz {
  id: string; title: string; summary: string;
  level: Level; topic: string; minutes: number;
  questions: QuizQuestion[];
}

export interface InterviewQuestion {
  id: string;
  category: string;           // e.g. "Fundamentals", "Optimization", "Client Management"
  level: Level;
  question: string;
  idealAnswer: string;        // markdown
  keyPoints: string[];
  redFlags?: string[];
  followUps?: string[];
}

export interface CaseStudyMetric {
  label: string; before: number | string; after: number | string;
  unit?: string; better: "higher" | "lower";
}

export interface CaseStudy {
  id: string; title: string; category: string; summary: string;
  client: string; timeframe: string; adSpend: string;
  challenge: string;                 // markdown
  approach: string[];                // ordered steps
  metrics: CaseStudyMetric[];
  timeline: { period: string; spend: number; revenue: number; acos: number }[];
  results: string;                   // markdown
  lessons: string[];
  tags: string[];
}

export interface DocResource {          // SOPs, workflows, templates, automation, career, cheat sheets
  id: string; kind: ResourceKind; title: string; summary: string;
  tags: string[]; minutes: number; level?: Level;
  meta?: Record<string, string>;        // e.g. { Frequency: "Daily", Time: "15 min" }
  body: string;                          // markdown, rendered by <Markdown />
}
```

Each content domain exports `const X: T[]` from `src/content/<domain>.ts` **and** a
`resourceRefs(): ResourceRef[]` helper. `src/content/registry.ts` aggregates every domain's
refs into `allResources`. Adding content = adding to your own domain file and making sure
`registry.ts` picks it up.

## Ownership map (do not write outside your lane)

| Phase | Owns |
|---|---|
| 1 | `globals.css`, `layout.tsx`, `page.tsx`, `types/`, `lib/utils.ts`, `lib/storage.ts`, `components/ui/*`, `components/layout/*`, `content/registry.ts` (skeleton), `lib/nav.ts` |
| 2 | `content/{sops,workflows,templates,automation,career,cheat-sheets,glossary}.ts`, `app/{sops,workflows,templates,automation,career,cheat-sheets,glossary}/**`, `components/doc/*` |
| 3 | `lib/search.ts`, `app/search/**`, `components/search/*` |
| 4 | `content/quizzes.ts`, `app/quizzes/**`, `components/quiz/*`, `lib/quiz-*.ts` |
| 5 | `content/case-studies.ts`, `app/case-studies/**`, `components/case-study/*` |
| 6 | `content/interviews.ts`, `app/interviews/**`, `components/interview/*` |
| 7 | `content/calculators.ts`, `content/scripts.ts`, `app/calculators/**`, `app/scripts/**`, `components/calc/*` |
| 8 | `app/contribute/**`, `components/community/*`, `lib/feedback.ts` |
| 9 | `app/dashboard/**`, `app/paths/**`, `components/progress/*`, `lib/progress.ts`, `content/paths.ts` |
| 10 | `public/manifest.webmanifest`, `public/icons/*`, `public/sw.js`, `components/pwa/*`, responsive fixes anywhere |
| 11 | cross-cutting polish, SEO, sitemap, README |

Shared files everyone may append to (append only, never restructure):
`src/content/registry.ts`, `src/lib/nav.ts`.

## Writing content

The source markdown in `../ppc-tools-for-va/` is the ground truth — read it and port it
faithfully; do not invent contradicting numbers. When a phase asks you to *expand* content
(more case studies, more interview questions), keep the same voice, realism, and level of
numeric detail: real ACoS/ROAS/CPC figures that are internally consistent and
arithmetically correct. Audience: Filipino VAs, English, practical, no fluff, no hype.

---

# PPC Console (`/dashboard`) — conventions (added 2026-09-30)

`/dashboard` is no longer the learner-progress page. It is a **personal Amazon PPC console**:
upload Search Term Reports and bulk files, get harvest / negative / bid recommendations, export
Amazon bulk sheets, and see multiple stores on one dashboard. No login. Learner progress moved
to `/progress` (same `components/progress/Dashboard.tsx`).

## Rules that override the academy rules above
- **Persistence is IndexedDB**, database `ppc-console`, via `src/lib/ppc/db.ts` only. Reports can
  be 100k rows, far beyond localStorage. Nothing is uploaded anywhere; there is still no backend.
  Never store console data under the `ppc-academy:` localStorage prefix (progress Export/Reset
  wipes that namespace).
- Still static export, still **no new npm dependencies**: CSV and XLSX are parsed/written by our
  own code in `src/lib/ppc/` (zip via `DecompressionStream("deflate-raw")`, STORED zip + CRC32 for
  writing, XML by string scanning — no `DOMParser`, so the engine also runs under Node).
- `src/lib/ppc/*` is a **pure engine**: no React, no `@/` path aliases (relative imports only),
  no browser globals at module top level, so `npx jiti scripts/ppc-selftest.ts` can run it.
  The only browser-bound module is `db.ts` (guard every `indexedDB` access).
- **Types live in `src/lib/ppc/types.ts`** — build against them; extend with optional fields,
  never reshape. Money is in the store's currency; rates are ratios (0.3 = 30%).
- `/dashboard/**` pages set `noindex: true` in `pageMetadata`.

## Ownership
| Area | Files |
|---|---|
| Engine | `src/lib/ppc/*`, `scripts/ppc-*` |
| Console UI | `src/components/ppc/*`, `src/app/dashboard/**` |
| Progress move | `src/app/progress/**` + the link/nav/SW/manifest edits listed in the plan |
| Chart series tokens | `--series-1..6` in `globals.css` (light + dark), append only |

Routes: `/dashboard` (overview), `/dashboard/import`, `/dashboard/search-terms`,
`/dashboard/keywords` (recommendations), `/dashboard/bids`, `/dashboard/stores`.

## Report columns (header aliases, matched after NFKD + dropping accents, lower-casing and stripping everything but letters / digits of any script; localised DE / FR / IT / ES / JP console headers are accepted after the English ones)
Search Term Report (console): Date | Start Date + End Date, Portfolio name, Currency, Campaign Name,
Ad Group Name, Targeting, Match Type, Customer Search Term, Impressions, Clicks, Spend (or Cost),
`N Day Total Sales`, `N Day Total Orders (#)`, `N Day Total Units (#)` (N = 7 SP, 14 SB).
Ads API v3 names also accepted: campaignName, adGroupName, targeting/keyword, matchType, searchTerm,
impressions, clicks, cost, sales7d/sales14d, purchases7d/purchases14d, unitsSoldClicks7d.
Bulk file: the "Sponsored Products Campaigns" sheet — Product, Entity, Operation, Campaign ID,
Ad Group ID, Ad ID, Keyword ID, Product Targeting ID, Campaign Name (Informational only),
Ad Group Name (Informational only), State, Targeting Type, Daily Budget, Ad Group Default Bid,
Bid, Keyword Text, Match Type, Product Targeting Expression, SKU, ASIN.

## Rule defaults (source: SOP-02/03, Workflow 2, Template 2, Bid-Calculator.xlsx)
Window 30 days, last 2 excluded; evaluate ≥ 5 clicks. Harvest exact: ≥ 2 orders and ACoS < target
(ASIN terms → product targeting); skip if already targeted; paired negative exact in source ad
group. Harvest bid = target ACoS × AOV × smoothed CVR × 0.80 × match multiplier (1 / 0.85 / 0.70 /
0.60); smoothed CVR = (orders + 15 × ad-group CVR) ÷ (clicks + 15). Negate exact: 0 orders, ≥ 15
clicks. Negate phrase: irrelevant word (word-boundary match). Converting but expensive: ACoS
2–3× break-even → bid cut; > 3× with ≥ 10 clicks → negative exact (medium). Bid ladder on ACoS ÷
target: < 0.5 +15%, ≤ 0.8 +8%, ≤ 1.2 hold, ≤ 1.5 −12%, ≤ 2 −20%, > 2 −20% + pause flag; max move
±20%; raises need ≥ 3 orders; ≥ 14 days history (inclusive); never above max CPC; floor 0.30 / ceiling 5.00
(USD-scale: new stores get them in their currency, e.g. JPY 10 / 750, INR 1 / 300, MXN 1 / 100; JPY bids are whole
yen); floor / ceiling never override max move or max CPC.
Starved winner: CVR ≥ 10%, ≥ 2 orders, ACoS < target, impressions < store median → +20%.
Relevance: ≥ 1,000 impressions and CTR < 0.2%. Most destructive action wins; never negate a term
that converts elsewhere in the store; brand/competitor terms are never negated.

## Data semantics (db.ts / metrics.ts / work/decisions.ts)
- One series per search term: overlapping imports are never added together. `resolveOverlaps` (on every
  db read and inside `recommend`) lets daily rows win for the days they cover and the latest of
  overlapping summary periods win; stored rows are untouched.
- A row remembers every import that holds it (`SearchTermRow.versions`, capped at 12). Deleting an import
  restores the previous import's numbers for rows it changed and deletes only rows no other import holds.
- The "Current" bulk snapshot is the batch that still owns entities (`liveBulkBatches`), not the newest
  bulk batch in the history.
- Decisions carry the rec they were made for (`Decision.basis`). A target-level decision reopens once a
  bulk file shows a different current bid; applied / rejected ones also after 14 more days of data. A
  companion whose harvest link changed reopens. Approved changes whose rec is gone are listed for discard.
- Decision writes go through `applyDecisionChanges` (one transaction); the store switcher scope is per tab.
