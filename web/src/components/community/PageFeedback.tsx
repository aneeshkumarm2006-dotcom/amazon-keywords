import { Container } from "@/components/layout/Container";
import type { ContainerWidth } from "@/components/layout/Container";

import { ResourceFeedback } from "./ResourceFeedback";

/**
 * One-line mount for the feedback widget.
 *
 * Reading routes are owned by other phases, so the edit that adds feedback to
 * an SOP, a case study or a calculator should be exactly one element. This
 * server component supplies the gutter and derives the storage key from the
 * route, leaving the client island to do the interactive part.
 *
 *   <PageFeedback href={`/sops/${sop.id}`} title={sop.title} kind="SOP" />
 */

export interface PageFeedbackProps {
  /** Route this page lives at, e.g. "/sops/daily-health-check". */
  href: string;
  /** Page title, shown in the export and the prefilled issue. */
  title: string;
  /** Human label for the resource kind, e.g. "SOP" or "Calculator". */
  kind?: string;
  /** Override the derived storage key. Rarely needed. */
  id?: string;
  width?: ContainerWidth;
  className?: string;
}

/** "/sops/daily-health-check" -> "sops:daily-health-check" */
export function feedbackIdForRoute(href: string): string {
  return href.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, ":") || "home";
}

export function PageFeedback({
  href,
  title,
  kind,
  id,
  width = "wide",
  className,
}: PageFeedbackProps) {
  return (
    <Container width={width} className={className ?? "pb-12 sm:pb-14"}>
      <ResourceFeedback
        resourceId={id ?? feedbackIdForRoute(href)}
        title={title}
        route={href}
        kind={kind}
      />
    </Container>
  );
}
