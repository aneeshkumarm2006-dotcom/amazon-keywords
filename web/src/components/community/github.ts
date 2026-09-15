/**
 * Prefilled GitHub issue links.
 *
 * There is no backend, so every "submit" on this site is really a hand-off:
 * we compose the markdown the maintainers want to read, URL-encode it into
 * GitHub's `issues/new` query string, and let the contributor press the
 * button under their own account. Nothing leaves the browser until they do.
 *
 * Kept dependency-free and side-effect-free so server components can build
 * the same links at render time.
 */

export const REPO_SLUG = "projectamazonph/ppc-tools-for-va";
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;
export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/.github/CONTRIBUTING.md`;
export const FORK_URL = `${REPO_URL}/fork`;
export const PULLS_URL = `${REPO_URL}/pulls`;

/**
 * GitHub truncates very long query strings and some proxies cap the request
 * line near 8 KB. Past this length we tell the contributor to copy the
 * markdown and paste it into the issue body instead of silently losing it.
 */
export const MAX_ISSUE_URL_LENGTH = 6000;

export interface IssueDraft {
  title: string;
  body: string;
  labels?: readonly string[];
}

/**
 * `encodeURIComponent` rather than `URLSearchParams`, so spaces encode as
 * `%20` and newlines as `%0A`. GitHub accepts both forms; the explicit one
 * survives being copied into a chat message or a docs snippet unchanged.
 */
function param(key: string, value: string): string {
  return `${key}=${encodeURIComponent(value)}`;
}

/** Build the prefilled `issues/new` URL for a draft. */
export function issueUrl({ title, body, labels }: IssueDraft): string {
  const parts = [param("title", title.trim()), param("body", body.trim())];
  const cleanLabels = (labels ?? []).map((label) => label.trim()).filter(Boolean);
  if (cleanLabels.length > 0) parts.push(param("labels", cleanLabels.join(",")));
  return `${NEW_ISSUE_URL}?${parts.join("&")}`;
}

/** True when the composed URL is long enough to risk truncation. */
export function issueUrlTooLong(url: string): boolean {
  return url.length > MAX_ISSUE_URL_LENGTH;
}

/** Search the issue tracker for a phrase — used by "check if already reported". */
export function issueSearchUrl(query: string): string {
  return `${ISSUES_URL}?q=${encodeURIComponent(`is:issue ${query}`)}`;
}

/** Filter the tracker to one label, e.g. the roadmap board's "claim this". */
export function issueLabelUrl(label: string): string {
  return `${ISSUES_URL}?q=${encodeURIComponent(`is:issue is:open label:"${label}"`)}`;
}

/* ------------------------------------------------------------------ *
 * Ready-made drafts
 * ------------------------------------------------------------------ */

export interface PageIssueOptions {
  /** Route the reader was on, e.g. "/sops/daily-health-check". */
  route: string;
  /** Page title, used in the issue title. */
  title: string;
  /** Optional note the reader already typed into the feedback widget. */
  note?: string;
  /** Optional star rating, included as context. */
  stars?: number;
}

/**
 * "Report an issue with this page" — the draft the per-resource feedback
 * widget hands to GitHub.
 */
export function pageIssueDraft({ route, title, note, stars }: PageIssueOptions): IssueDraft {
  const lines = [
    "### Page",
    "",
    `\`${route}\` — ${title}`,
    "",
    "### What is wrong",
    "",
    note?.trim() ? note.trim() : "<!-- What is inaccurate, broken, confusing or missing? -->",
    "",
    "### What it should say instead",
    "",
    "<!-- The correction, with a source if you have one. -->",
    "",
  ];

  if (typeof stars === "number" && stars > 0) {
    lines.push("---", "", `Reader rating: ${stars}/5.`, "");
  }

  lines.push("_Reported from the PPC Academy site._");

  return {
    title: `[page] ${title} — issue on ${route}`,
    body: lines.join("\n"),
    labels: ["content", "site-feedback"],
  };
}

export interface RoadmapClaimOptions {
  /** Roadmap item title. */
  title: string;
  /** Where the item came from, e.g. "TODO.md — Medium priority". */
  source: string;
  /** What the item involves, as shown on the board. */
  detail: string;
  /** Area label, e.g. "content" or "tooling". */
  area: string;
}

/** "Claim this" — opens an issue declaring intent to take a roadmap item. */
export function roadmapClaimDraft({
  title,
  source,
  detail,
  area,
}: RoadmapClaimOptions): IssueDraft {
  return {
    title: `[claim] ${title}`,
    body: [
      "### Roadmap item",
      "",
      `**${title}**`,
      "",
      detail,
      "",
      `Source: ${source}`,
      "",
      "### What I plan to do",
      "",
      "<!-- Scope you are taking on. Split it if the whole item is too big. -->",
      "",
      "### Rough timeline",
      "",
      "<!-- When you expect to open the PR. A week is a fine answer. -->",
      "",
      "---",
      "",
      "I have read `.github/CONTRIBUTING.md` and will follow the content guidelines for this resource type.",
    ].join("\n"),
    labels: ["roadmap", area],
  };
}
