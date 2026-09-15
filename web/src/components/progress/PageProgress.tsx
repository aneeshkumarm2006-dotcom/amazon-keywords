import { Container, type ContainerWidth } from "@/components/layout/Container";

import { ResourceActions } from "./ResourceActions";

/**
 * One-line mount for the progress controls.
 *
 * Reading routes belong to other phases, so the edit that adds "mark as
 * complete" to an SOP, a case study or a quiz should be exactly one element.
 * This server component supplies the gutter; the client island does the rest.
 *
 *   <PageProgress href={`/case-studies/${study.id}`} title={study.title} />
 */

export interface PageProgressProps {
  href: string;
  title: string;
  id?: string;
  hidePaths?: boolean;
  width?: ContainerWidth;
  className?: string;
}

export function PageProgress({
  href,
  title,
  id,
  hidePaths,
  width = "wide",
  className,
}: PageProgressProps) {
  return (
    <Container width={width} className={className ?? "pb-2"}>
      <ResourceActions href={href} title={title} id={id} hidePaths={hidePaths} />
    </Container>
  );
}
