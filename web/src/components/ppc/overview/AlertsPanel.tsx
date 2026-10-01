"use client";

import { ChevronDown, ChevronUp, CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import type { AlertSeverity, OverviewAlert } from "./compute";
import { Panel, ScopeLink, TEXT_LINK, useOverview } from "./shared";

const SEVERITY: Record<AlertSeverity, { icon: LucideIcon; className: string; label: string }> = {
  critical: { icon: OctagonAlert, className: "text-bad", label: "Critical" },
  warning: { icon: TriangleAlert, className: "text-warn", label: "Warning" },
  info: { icon: Info, className: "text-info", label: "Note" },
};

export interface AlertsPanelProps {
  alerts: OverviewAlert[];
  days: number;
  /** Rows shown before "Show all". */
  initial?: number;
  className?: string;
}

/**
 * Things that changed and need a look, computed from the period vs the one
 * before it (rules in `ALERT_RULES`). Most severe first.
 */
export function AlertsPanel({ alerts, days, initial = 6, className }: AlertsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warnings = alerts.filter((a) => a.severity === "warning").length;
  const visible = expanded ? alerts : alerts.slice(0, initial);

  return (
    <Panel
      title="Alerts"
      description={
        <p>
          Last {days} days against the {days} before, plus data health.
        </p>
      }
      aside={
        alerts.length ? (
          <span className="flex gap-1.5">
            {critical ? (
              <Badge tone="bad" size="sm">
                {critical} critical
              </Badge>
            ) : null}
            {warnings ? (
              <Badge tone="warn" size="sm">
                {warnings} {warnings === 1 ? "warning" : "warnings"}
              </Badge>
            ) : null}
            {!critical && !warnings ? (
              <Badge tone="info" size="sm">
                {alerts.length} {alerts.length === 1 ? "note" : "notes"}
              </Badge>
            ) : null}
          </span>
        ) : null
      }
      className={className}
      footer={
        alerts.length > initial ? (
          <Button
            variant="ghost"
            size="sm"
            icon={expanded ? ChevronUp : ChevronDown}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Show fewer" : `Show all ${alerts.length} alerts`}
          </Button>
        ) : undefined
      }
    >
      {alerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-good-soft">
            <CircleCheck className="size-5 text-good" aria-hidden="true" />
          </span>
          <p className="font-display text-[0.9375rem] font-semibold text-ink">No alerts</p>
          <p className="max-w-xs text-[0.8125rem] leading-relaxed text-muted">
            No ACoS spikes, CPC jumps, campaigns gone dark or stale data in this period.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {visible.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AlertRow({ alert }: { alert: OverviewAlert }) {
  const { switchScope } = useOverview();
  const meta = SEVERITY[alert.severity];
  const Icon = meta.icon;
  const link = alert.link;
  const action =
    link.kind === "scope" ? (
      <button
        type="button"
        onClick={() => switchScope(link.storeId)}
        className={cn(TEXT_LINK, "inline-flex min-h-8 items-center text-xs whitespace-nowrap [@media(pointer:coarse)]:min-h-11")}
      >
        {link.label}
      </button>
    ) : (
      <ScopeLink
        href={link.href}
        storeId={link.storeId}
        className={cn(TEXT_LINK, "inline-flex min-h-8 items-center text-xs whitespace-nowrap [@media(pointer:coarse)]:min-h-11")}
      >
        {link.label}
      </ScopeLink>
    );

  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <Icon className={cn("mt-0.5 size-4 shrink-0", meta.className)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-ink [overflow-wrap:anywhere]">
          <span className="sr-only">{meta.label}: </span>
          {alert.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{alert.detail}</p>
        <div className="mt-0.5">{action}</div>
      </div>
    </li>
  );
}
