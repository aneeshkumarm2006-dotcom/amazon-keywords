# TODO — PPC Tools for VA

The interactive platform lives in `/site` — a Next.js 16 static export of this toolkit.
Items below marked **Built in /site** are shipping there. Where the site's counts differ
from the markdown in this repo, the note says so: the site expanded several collections
and the source markdown has not been backfilled yet.

## High Priority
- [x] Build interactive web platform (Next.js)
      **Built in /site.** Next.js 16 App Router, React 19, Tailwind v4, `output: "export"` —
      236 prerendered routes, no server, no database. Dark mode, installable PWA with an
      offline shell, and a 360px-first layout.
- [x] Add search across all resources
      **Built in /site.** `/search` runs a fuse.js index over all 301 registered resources
      with facets by type, level and tag, match highlighting and "did you mean" suggestions.
      A Cmd/Ctrl-K command palette reaches the same index from any page, and loads it lazily
      so the index is not in every page's bundle.
- [x] Create interactive quiz engine
      **Built in /site.** `/quizzes` — 126 questions across five levels plus a 40-question
      mock exam, in practice, exam and flashcard modes. Keyboard-driven runner, an
      explanation and a linked source on every answer, a scored results breakdown with
      per-level and per-topic accuracy, a custom quiz builder, and a Leitner review queue
      that resurfaces missed questions after 1, 3, 7 and 21 days.

## Medium Priority
- [x] Add more case studies (target: 12)
      **Built in /site.** 12 accounts at `/case-studies`, with derived ACoS timelines,
      before/after metric grids, playbook links back to the SOPs each account used, and a
      two-or-three-way comparison tool. Studies 1–6 are this repo's markdown ported
      unchanged; 7–12 were written for the site. The markdown in `case-studies/` still holds
      the original six — backfilling it is outstanding.
- [x] Expand interview questions (target: 100+)
      **Built in /site.** 117 questions across nine competencies at `/interviews`, each with
      a model answer, key points, red flags and follow-ups, plus a timed mock interview
      simulator with self-scoring and a flashcard drill. The 60 from
      `interview-questions/` are all carried over with their original categorisation
      recorded; `interview-questions/` itself has not been backfilled.
- [x] Create automation scripts repo
      **Built in /site** rather than as a separate repository. `/scripts` holds 14 runnable
      assets in Python, Google Apps Script, SQL and sheet formulas — search term harvesting,
      negative keyword mining, ACoS-band bid rules, budget pacing alerts, dayparting,
      placement pivots, duplicate keyword detection, bulk sheet generation, rank tracking
      and a weekly report emailer — each with full code, a line-by-line explanation,
      prerequisites and expected output. Splitting them into their own repo is still open if
      the scripts ever need independent versioning.

## Low Priority
- [x] Community contributions system
      **Built in /site.** `/contribute` has four guided submission forms (case study,
      interview question, quiz question, issue report) that assemble the markdown for you
      and hand it to a prefilled GitHub issue — no backend and nothing collected.
      `/contribute/guidelines` states the bar each resource type has to clear, and
      `/contribute/roadmap` is a claimable board traced back to this file, `KANBAN.md` and
      `EXPANSION-PLAN.md`.
- [ ] User accounts and progress
      **Progress is built in /site**: `/dashboard` tracks completions, XP, level, day
      streak, quiz scores, topic mastery, weak areas, mock interview results, bookmarks and
      learning path progress, all computed from `localStorage` and exportable as a JSON file
      you can carry to another machine. **Accounts are not built** and stay unticked — they
      need a backend, and the site is deliberately a static export with nothing uploaded.
- [ ] Mobile app
      Not built. The site is an installable PWA — home-screen install prompt, service worker
      caching of the app shell and visited pages, an offline library page and a phone tab
      bar — which covers most of what a wrapper app would, but a native build is still open.

## Outstanding
- [ ] Backfill this repo's markdown with the six case studies written for the site
- [ ] Backfill `interview-questions/` with the 57 questions written for the site
- [ ] Backfill `quizzes/` with the 76 questions written for the site
