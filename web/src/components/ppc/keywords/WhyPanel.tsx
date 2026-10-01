"use client";

import { Info, Link2, TriangleAlert } from "lucide-react";
import { useId, useMemo } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import type { HarvestDestination, Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { money } from "../format";
import { parseBid, type DecisionDraft } from "../work/decisions";
import {
  describeDestination,
  destinationValue,
  landsInSource,
  routedDestination,
  type AdGroupOption,
  type DestinationValue,
} from "../work/destinations";
import { explainRecommendation } from "../work/explain";
import { guardrailsText } from "../work/glossary";
import type { PriorIndex } from "../work/model";
import type { RecItem } from "../work/recs";
import { Jargon } from "./common";

export interface WhyPanelProps {
  item: RecItem;
  store: Store;
  priors: PriorIndex | null;
  windowDays: number;
  draft?: DecisionDraft;
  adGroupOptions: AdGroupOption[];
  onDestination: (id: string, value: DestinationValue) => void;
  onSkipNegative: (id: string, skip: boolean) => void;
  id: string;
}

/** The effective destination of a harvest row: typed draft → saved decision → store default. */
export function effectiveDestination(item: RecItem, store: Store, draft?: DecisionDraft): HarvestDestination {
  return draft?.destination ?? item.decision?.destination ?? store.harvestDestination;
}

/** The expanded "Why" row: the reason, the maths, what uploading it does, and harvest destination controls. */
export function WhyPanel({ item, store, priors, windowDays, draft, adGroupOptions, onDestination, onSkipNegative, id }: WhyPanelProps) {
  const rec = item.rec;
  const harvest = rec.action.startsWith("harvest");
  // As export.ts places it: auto ad groups cannot hold keywords, so those harvests go to a new campaign.
  const dest = routedDestination(effectiveDestination(item, store, draft), rec, store, adGroupOptions);
  const moneyFmt = (n: number) => money(n, store.currency, { decimals: 0 });
  const destLabel = harvest ? describeDestination(dest, rec, store, moneyFmt) : undefined;
  const typed = draft?.bid !== undefined ? parseBid(draft.bid) : item.decision?.editedBid;
  const bidOverride = typed !== undefined && Number.isFinite(typed) ? typed : undefined;
  const ex = useMemo(
    () => (priors ? explainRecommendation(rec, { store, priors, windowDays, destinationLabel: destLabel, bidOverride }) : null),
    [rec, store, priors, windowDays, destLabel, bidOverride],
  );
  const editable = item.status === "open" || item.status === "approved";

  return (
    <div id={id} className="grid gap-5 bg-canvas px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
      <div className="min-w-0 space-y-3">
        {ex ? (
          <>
            <p className="text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{ex.headline}</p>
            <p className="text-[0.8125rem] leading-relaxed text-muted [overflow-wrap:anywhere]">
              <span className="font-medium text-ink">If you approve: </span>
              {ex.what}
            </p>
            {ex.summary ? (
              <p className="scroll-well overflow-x-auto rounded-lg border border-hairline bg-surface px-3 py-2 tabular text-xs whitespace-nowrap text-ink">
                {ex.summary}
              </p>
            ) : null}
            <dl className="divide-y divide-hairline rounded-lg border border-hairline bg-surface">
              {ex.lines.map((l, i) => (
                <div key={i} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-xs font-medium text-muted">{l.label}</dt>
                  <dd className="min-w-0">
                    <span className="block tabular text-xs break-words text-ink">{l.formula}</span>
                    {l.note ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{l.note}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[0.8125rem] leading-relaxed text-ink">
              <Jargon k="impact">Impact</Jargon>: {ex.impact}
            </p>
            {ex.cautions.map((c, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs leading-relaxed text-warn [overflow-wrap:anywhere]">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {c}
              </p>
            ))}
          </>
        ) : (
          <p className="text-sm text-muted [overflow-wrap:anywhere]">{rec.reason}</p>
        )}
        <details className="group text-xs text-muted">
          <summary className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded font-medium text-muted hover:text-ink [@media(pointer:coarse)]:min-h-11">
            Engine notes ({rec.evidence.length})
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 tabular break-words">
            {rec.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      </div>

      {harvest ? (
        <HarvestControls
          item={item}
          store={store}
          dest={dest}
          draft={draft}
          editable={editable}
          options={adGroupOptions}
          onDestination={onDestination}
          onSkipNegative={onSkipNegative}
          destLabel={destLabel ?? ""}
        />
      ) : rec.action === "bid-up" || rec.action === "bid-down" ? (
        <aside className="h-fit min-w-0 space-y-2 rounded-lg border border-hairline bg-surface p-3 text-xs leading-relaxed text-muted">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <Info className="size-3.5 text-info" aria-hidden="true" />
            <Jargon k="guardrails" text={guardrailsText(store.rules, (n) => money(n, store.currency))}>
              Guardrails
            </Jargon>{" "}
            for this store
          </p>
          <ul className="space-y-0.5">
            <li>At most ±{Math.round(store.rules.maxMove * 100)}% per change</li>
            <li>
              Never above <Jargon k="maxCpc">max CPC</Jargon>
              {rec.maxCpc !== undefined ? ` (${money(rec.maxCpc, store.currency)} here)` : ""}
            </li>
            <li>
              Floor {money(store.rules.bidFloor, store.currency)} · ceiling {money(store.rules.bidCeiling, store.currency)}
            </li>
            <li>Raises need {store.rules.minOrdersToRaise}+ orders</li>
          </ul>
          <p>Editing the bid before approving overrides the suggestion in the bulk sheet.</p>
        </aside>
      ) : null}
    </div>
  );
}

interface HarvestControlsProps {
  item: RecItem;
  store: Store;
  dest: HarvestDestination;
  draft?: DecisionDraft;
  editable: boolean;
  options: AdGroupOption[];
  onDestination: (id: string, value: DestinationValue) => void;
  onSkipNegative: (id: string, skip: boolean) => void;
  destLabel: string;
}

function HarvestControls({ item, store, dest, draft, editable, options, onDestination, onSkipNegative, destLabel }: HarvestControlsProps) {
  const uid = useId();
  const rec = item.rec;
  const negIndex = item.companions.findIndex((c) => c.action.startsWith("negate"));
  const negative = negIndex >= 0 ? item.companions[negIndex] : undefined;
  const overridden = draft?.destination ?? item.decision?.destination;
  const value = destinationValue(overridden);
  const sameGroup = landsInSource(dest, rec);
  // Only ad groups that can take this harvest: manual, and not holding the other kind of target.
  const wrongKind = rec.action === "harvest-product" ? "keyword" : "product";
  const manualOptions = options.filter((o) => o.manual && o.holds !== wrongKind);
  const skip = draft?.skipNegative ?? (item.status !== "open" && negIndex >= 0 && item.companionStatus[negIndex] === "rejected");
  const moneyFmt = (n: number) => money(n, store.currency, { decimals: 0 });
  const defaultLabel = describeDestination(store.harvestDestination, rec, store, moneyFmt);
  const selectOptions = [
    { value: "default", label: `Store default — ${shorten(defaultLabel)}` },
    { value: "source", label: `Same ad group — ${shorten(`${rec.campaign} / ${rec.adGroup}`)}` },
    { value: "new", label: "New exact harvest campaign" },
    // Auto ad groups hold no keywords / product targets and an ad group never mixes the two, so those are not offered.
    ...manualOptions.map((o) => ({ value: `ag:${o.adGroupId}`, label: `${o.campaignName} / ${o.adGroupName}` })),
  ];
  if (value.startsWith("ag:") && !manualOptions.some((o) => `ag:${o.adGroupId}` === value) && dest.mode === "existing") {
    selectOptions.push({ value, label: `${dest.campaignName} / ${dest.adGroupName}` });
  }

  return (
    <aside className="h-fit min-w-0 space-y-3 rounded-lg border border-hairline bg-surface p-3">
      <Select
        id={`${uid}-dest`}
        label="Create the new keyword in"
        value={value}
        options={selectOptions}
        disabled={!editable}
        onChange={(e) => onDestination(rec.id, e.target.value)}
        hint={manualOptions.length ? undefined : "Import a bulk file to pick one of your existing ad groups."}
      />
      <p className="text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">
        Goes into <span className="font-medium text-ink">{destLabel}</span>.
        {item.status === "approved" ? " Saved with your approval." : " Saved when you approve."}
      </p>
      {negative ? (
        <div className={cn("space-y-1.5 rounded-lg border p-2.5", sameGroup ? "border-warn/35 bg-warn-soft" : "border-hairline bg-canvas")}>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink">
            <Link2 className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {sameGroup ? (
                <>
                  The <Jargon k="negativeExact">negative exact</Jargon> in {rec.campaign} / {rec.adGroup} is left out of the bulk sheet: the new keyword
                  goes into that same ad group, and the negative would block it.
                </>
              ) : (
                <>
                  Approving also adds a <Jargon k="negativeExact">negative exact</Jargon> for “{rec.subject}” in {rec.campaign} / {rec.adGroup}, so the old
                  ad group stops competing with the new keyword. Undo removes both.
                </>
              )}
            </span>
          </p>
          {!sameGroup ? (
            <Checkbox
              id={`${uid}-skipneg`}
              label="Keep the source ad group running too (skip the negative)"
              checked={!!skip}
              disabled={!editable || item.status === "approved"}
              onChange={(e) => onSkipNegative(rec.id, e.target.checked)}
              hint={item.status === "approved" ? "Undo the approval to change this." : undefined}
            />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function shorten(s: string, max = 48): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
