import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Table primitives. `Table` always wraps its `<table>` in a horizontal scroll
 * well so wide data never forces the page to scroll sideways at 360px.
 *
 * A scroll well that only answers a wheel or a swipe strands keyboard users on
 * the visible columns, so the wrapper is focusable and carries the caption as
 * its accessible name — the same pattern markdown tables use in `Markdown.tsx`.
 */

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** Accessible caption. Pass `captionHidden` to keep it screen-reader only. */
  caption?: string;
  captionHidden?: boolean;
  wrapperClassName?: string;
  /** Adds a sticky first column — handy for comparison tables on phones. */
  stickyFirstColumn?: boolean;
}

export function Table({
  caption,
  captionHidden = true,
  className,
  wrapperClassName,
  stickyFirstColumn,
  children,
  ...rest
}: TableProps) {
  return (
    <div
      role="group"
      aria-label={caption ?? "Table"}
      tabIndex={0}
      className={cn(
        "scroll-well overflow-x-auto rounded-xl border border-hairline bg-surface",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        wrapperClassName,
      )}
    >
      <table
        className={cn(
          "w-full min-w-full border-collapse text-left text-sm",
          stickyFirstColumn &&
            "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:bg-surface [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:bg-surface-2",
          className,
        )}
        {...rest}
      >
        {caption ? (
          <caption
            className={cn(
              "caption-top px-4 py-3 text-left text-xs text-muted",
              captionHidden && "sr-only",
            )}
          >
            {caption}
          </caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-surface-2", className)} {...rest}>
      {children}
    </thead>
  );
}

export function TBody({ className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-hairline", className)} {...rest}>
      {children}
    </tbody>
  );
}

export function TR({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors duration-100 hover:bg-surface-2/60", className)} {...rest}>
      {children}
    </tr>
  );
}

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align numeric columns. */
  numeric?: boolean;
}

export function TH({ className, numeric, children, ...rest }: ThProps) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-hairline px-4 py-2.5 text-[0.6875rem] font-semibold tracking-[0.06em] whitespace-nowrap text-muted uppercase",
        numeric && "text-right",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  /** Renders the cell in the mono face with tabular figures. */
  mono?: boolean;
}

export function TD({ className, numeric, mono, children, ...rest }: TdProps) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 align-top text-sm text-ink",
        numeric && "text-right",
        mono && "tabular text-[0.8125rem]",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

/** A row-header cell: first column of a data row. */
export function THRow({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="row"
      className={cn("px-4 py-2.5 text-left align-top text-sm font-medium text-ink", className)}
      {...rest}
    >
      {children}
    </th>
  );
}
