import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { CopyButton } from "@/components/ui/CopyButton";
import { withBasePath } from "@/lib/site";
import { cn } from "@/lib/utils";

import { HeadingLink } from "./HeadingLink";

/* ------------------------------------------------------------------ *
 * hast helpers
 * ------------------------------------------------------------------ */

interface TextLikeNode {
  type?: string;
  value?: string;
  children?: TextLikeNode[];
}

/** Flatten a hast subtree to its text content. */
function nodeText(node: unknown): string {
  const candidate = node as TextLikeNode | undefined;
  if (!candidate) return "";
  if (typeof candidate.value === "string") return candidate.value;
  if (!Array.isArray(candidate.children)) return "";
  return candidate.children.map(nodeText).join("");
}

const EXTERNAL = /^(https?:)?\/\//i;

/* ------------------------------------------------------------------ *
 * Element overrides
 *
 * Each override takes only the props it needs. Nothing spreads the rest,
 * because `react-markdown` also passes the hast `node`, which must never
 * reach the DOM.
 * ------------------------------------------------------------------ */

type MdProps<K extends keyof React.JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<K> & { node?: unknown };

/** The header cells of a hast table, for naming its scroll region. */
function tableHeadings(node: unknown): string[] {
  const table = node as TextLikeNode | undefined;
  const head = table?.children?.find(
    (child) => (child as { tagName?: string }).tagName === "thead",
  );
  const row = head?.children?.find((child) => (child as { tagName?: string }).tagName === "tr");
  if (!row?.children) return [];

  return row.children
    .filter((cell) => (cell as { tagName?: string }).tagName === "th")
    .map((cell) => nodeText(cell).trim())
    .filter(Boolean);
}

/**
 * Wide markdown tables are the single biggest risk to a 360px viewport, so
 * every one of them gets its own horizontal scroll well.
 *
 * A scroll well that only responds to a mouse wheel or a swipe strands
 * keyboard users on the visible columns, so the wrapper is focusable and
 * named after the table's own header row — which doubles as the accessible
 * name a bare markdown table otherwise has no way to carry.
 */
function MdTable({ node, children }: MdProps<"table">) {
  const headings = tableHeadings(node);
  const label =
    headings.length > 0 ? `Table: ${headings.join(", ")}` : "Table";

  return (
    <div
      role="group"
      aria-label={label}
      tabIndex={0}
      className="scroll-well -mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand print:overflow-visible"
    >
      <table>{children}</table>
    </div>
  );
}

/** Fenced and indented code, with the block's exact text one click away. */
function MdPre({ node, children }: MdProps<"pre">) {
  const code = nodeText(node).replace(/\n+$/, "");

  return (
    <div className="group/code relative">
      <pre>{children}</pre>
      {code ? (
        <CopyButton
          value={code}
          className="absolute top-2 right-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/code:opacity-100 print:hidden"
        />
      ) : null}
    </div>
  );
}

/**
 * Off-site links open in a new tab and never leak the referrer chain.
 *
 * A markdown body is rendered to a raw `<a>`, which Next does not rewrite, so
 * an internal link written as `/sops/x` needs the base path adding by hand.
 * `withBasePath` leaves `#anchors` and absolute URLs alone.
 */
function MdAnchor({ href, title, className, children }: MdProps<"a">) {
  const external = typeof href === "string" && EXTERNAL.test(href);
  const resolved = typeof href === "string" ? withBasePath(href) : href;

  return (
    <a
      href={resolved}
      title={title}
      className={className}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : null)}
    >
      {children}
    </a>
  );
}

function headingWithLink(Tag: "h2" | "h3"): (props: MdProps<"h2">) => ReactNode {
  return function MdHeading({ id, children }) {
    return (
      <Tag id={id} className="group/heading scroll-mt-24">
        {children}
        {id ? <HeadingLink id={id} /> : null}
      </Tag>
    );
  };
}

/**
 * GFM task lists arrive as checkboxes. Keeping them read-only is correct —
 * the markdown is the source of truth — but they must not read as broken
 * form controls to assistive technology.
 */
function MdCheckbox({ type, checked }: MdProps<"input">) {
  if (type !== "checkbox") return null;
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      readOnly
      disabled
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

const COMPONENTS = {
  table: MdTable,
  pre: MdPre,
  a: MdAnchor,
  h2: headingWithLink("h2"),
  h3: headingWithLink("h3"),
  input: MdCheckbox,
} as Components;

const REMARK_PLUGINS = [remarkGfm];

const REHYPE_PLUGINS = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: "append",
      properties: {
        className: ["anchor-link"],
        ariaHidden: "true",
        tabIndex: -1,
      },
      content: { type: "text", value: "#" },
    },
  ],
] as const;

/* ------------------------------------------------------------------ *
 * Public component
 * ------------------------------------------------------------------ */

export interface MarkdownProps {
  /** Raw markdown. Rendered with GFM tables, task lists and strikethrough. */
  children: string;
  className?: string;
}

/**
 * The one markdown renderer on the site. Server-rendered — `react-markdown`'s
 * default export is synchronous and hook-free, so the whole document ships as
 * HTML and only the copy buttons hydrate.
 */
/**
 * GFM task lists get the checkbox instead of the `.prose-doc` bullet. Scoped
 * here rather than in the global stylesheet because task lists only ever
 * arrive through markdown.
 */
const TASK_LIST_FIXES = "[&_li.task-list-item]:before:hidden";

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose-doc", TASK_LIST_FIXES, className)}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS as never}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
