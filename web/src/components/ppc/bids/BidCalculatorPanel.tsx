"use client";

import { Check, Database, RotateCcw, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import type { BiddableMatch } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { NumField } from "../FormBits";
import { count, money, pct } from "../format";
import { Jargon } from "../keywords/common";
import { amountText, bidCalc, DEFAULT_MULTIPLIERS, parseAmount, parsePercent, percentText, WORKBOOK_DEFAULTS } from "../work/calculator";

export interface CalcSeed {
  targetAcos: number;
  aov: number;
  cvr: number;
  currentCpc: number;
}

export interface BidCalculatorPanelProps {
  currency: string;
  multipliers?: Record<BiddableMatch, number>;
  /** The store's own numbers (window totals + target), when there is a store with data. */
  mine?: CalcSeed & { clicks: number; orders: number; windowLabel: string };
}

interface Texts {
  target: string;
  aov: string;
  cvr: string;
  cpc: string;
}

function textsFrom(s: CalcSeed): Texts {
  return { target: percentText(s.targetAcos), aov: amountText(s.aov), cvr: percentText(s.cvr), cpc: amountText(s.currentCpc) };
}

const MATCH_LABEL: Record<BiddableMatch, { label: string; note: string }> = {
  exact: { label: "Exact", note: "That search only — highest intent, full bid." },
  phrase: { label: "Phrase", note: "Searches containing it — a little looser." },
  broad: { label: "Broad", note: "Related searches — for discovery." },
  auto: { label: "Auto", note: "Amazon picks — keep it cheap." },
};

/**
 * Bid-Calculator.xlsx: max CPC = target ACoS × AOV × CVR, then 60 / 80 / 100%
 * of it, per-match-type bids and a CVR sensitivity table against the current CPC.
 */
export function BidCalculatorPanel({ currency, multipliers = DEFAULT_MULTIPLIERS, mine }: BidCalculatorPanelProps) {
  const uid = useId();
  const usable = mine && Number.isFinite(mine.aov) && Number.isFinite(mine.cvr) && mine.cvr > 0;
  const [texts, setTexts] = useState<Texts>(() => textsFrom(usable ? mine : WORKBOOK_DEFAULTS));
  const [source, setSource] = useState<"mine" | "workbook" | "edited">(usable ? "mine" : "workbook");
  // The store's numbers change under an open page (economics saved, a new
  // import): while the fields show "my data", follow them instead of keeping
  // the values the panel was opened with.
  const seedKey = usable ? `${mine.targetAcos}|${mine.aov}|${mine.cvr}|${mine.currentCpc}` : "";
  const [seenSeed, setSeenSeed] = useState(seedKey);
  if (seedKey !== seenSeed) {
    setSeenSeed(seedKey);
    if (usable && (source === "mine" || (source === "workbook" && seenSeed === ""))) {
      setTexts(textsFrom(mine));
      setSource("mine");
    } else if (!usable && source === "mine") {
      setTexts(textsFrom(WORKBOOK_DEFAULTS));
      setSource("workbook");
    }
  }
  const set = (patch: Partial<Texts>) => {
    setTexts((t) => ({ ...t, ...patch }));
    setSource("edited");
  };
  const input = {
    targetAcos: parsePercent(texts.target),
    aov: parseAmount(texts.aov) ?? NaN,
    cvr: parsePercent(texts.cvr),
    currentCpc: parseAmount(texts.cpc) ?? NaN,
  };
  // A handful of multiplications: cheaper to redo than to memoise.
  const r = bidCalc({ ...input, multipliers });
  const err = (v: number, label: string) => (Number.isFinite(v) && v > 0 ? undefined : `Enter ${label} above 0`);
  const hasCpc = Number.isFinite(input.currentCpc) && input.currentCpc > 0;

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-xl border border-hairline bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-[1_1_18rem]">
          <h2 id={`${uid}-h`} className="font-display text-base font-semibold text-ink">
            Bid calculator
          </h2>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
            The most you can pay per click and still hit your target, and what to bid for each match type. Same maths as the Bid-Calculator
            workbook.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mine ? (
            <Button
              size="sm"
              variant={source === "mine" ? "primary" : "secondary"}
              icon={Database}
              disabled={!usable}
              onClick={() => {
                if (!usable) return;
                setTexts(textsFrom(mine));
                setSource("mine");
              }}
              aria-describedby={usable ? undefined : `${uid}-mine-why`}
            >
              Use my data
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={source === "workbook" ? "primary" : "secondary"}
            icon={RotateCcw}
            onClick={() => {
              setTexts(textsFrom(WORKBOOK_DEFAULTS));
              setSource("workbook");
            }}
          >
            Workbook example
          </Button>
          {mine && !usable ? (
            <p id={`${uid}-mine-why`} className="basis-full text-xs text-muted">
              Use my data needs at least one order in {mine.windowLabel}; this store has {count(mine.orders)} orders on {count(mine.clicks)} clicks there.
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <NumField id={`${uid}-t`} label="Target ACoS" unit="%" value={texts.target} onChange={(v) => set({ target: v })} error={err(input.targetAcos, "a target")} />
          <NumField
            id={`${uid}-aov`}
            label="Average order value (or price)"
            unit={currency}
            value={texts.aov}
            onChange={(v) => set({ aov: v })}
            error={err(input.aov, "an order value")}
          />
          <NumField
            id={`${uid}-cvr`}
            label="Conversion rate"
            unit="%"
            value={texts.cvr}
            onChange={(v) => set({ cvr: v })}
            error={err(input.cvr, "a conversion rate")}
            hint="Orders ÷ clicks"
          />
          <NumField id={`${uid}-cpc`} label="Current CPC" unit={currency} value={texts.cpc} onChange={(v) => set({ cpc: v })} hint="What a click costs you today" />
          <p className="text-xs leading-relaxed text-muted" aria-live="polite">
            {source === "mine" && mine
              ? `From ${mine.windowLabel}: ${count(mine.orders)} orders on ${count(mine.clicks)} clicks, target from the store.`
              : source === "workbook"
                ? `Workbook example: ${pct(WORKBOOK_DEFAULTS.targetAcos, 0)} target, ${money(WORKBOOK_DEFAULTS.aov, currency)}, ${pct(WORKBOOK_DEFAULTS.cvr, 0)} CVR, ${money(WORKBOOK_DEFAULTS.currentCpc, currency)} CPC.`
                : "Your own numbers."}
          </p>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="rounded-lg border border-hairline bg-canvas p-4">
            <p className="text-xs font-medium text-muted">
              <Jargon k="maxCpc" />
            </p>
            <p className="mt-1 tabular text-3xl font-semibold text-ink">{money(r.maxCpc, currency)}</p>
            <p className="mt-1 scroll-well overflow-x-auto tabular text-xs whitespace-nowrap text-muted">
              {r.valid
                ? `${pct(input.targetAcos)} target × ${money(input.aov, currency)} AOV × ${pct(input.cvr)} CVR = ${Number(r.maxCpc.toFixed(4))}`
                : "Fill in target, order value and conversion rate."}
            </p>
            {r.valid && hasCpc ? (
              <p className={cn("mt-2 flex items-start gap-1.5 text-[0.8125rem] leading-relaxed", input.currentCpc <= r.maxCpc ? "text-good" : "text-bad")}>
                {input.currentCpc <= r.maxCpc ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                <span>
                  At {money(input.currentCpc, currency)} a click you run at <strong className="tabular">{pct(r.acosAtCurrent)}</strong> ACoS —{" "}
                  {input.currentCpc <= r.maxCpc ? "inside" : "over"} your {pct(input.targetAcos)} target.
                </span>
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Conservative", "60%", r.conservative, "New or unproven keywords; leaves room for a bad week."],
                ["Recommended", "80%", r.recommended, "The usual starting bid."],
                ["Aggressive", "100%", r.aggressive, "Proven winners you want more of. Lands exactly on target."],
              ] as const
            ).map(([label, share, value, note]) => (
              <div key={label} className={cn("rounded-lg border p-3", label === "Recommended" ? "border-brand/40 bg-brand-soft" : "border-hairline bg-surface")}>
                <p className="text-xs font-medium text-muted">
                  {label} <span className="text-faint">· {share} of max CPC</span>
                </p>
                <p className="mt-1 tabular text-xl font-semibold text-ink">{money(value, currency)}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{note}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-[0.8125rem] font-semibold text-ink">
              By <Jargon k="matchType">match type</Jargon>
            </h3>
            <p className="text-xs text-muted">Recommended bid × this store&apos;s match multiplier.</p>
            <Table caption="Recommended bid by match type" wrapperClassName="relative mt-2">
              <THead>
                <tr>
                  <TH className="px-3">Match</TH>
                  <TH numeric className="px-3">
                    Multiplier
                  </TH>
                  <TH numeric className="px-3">
                    Bid
                  </TH>
                  <TH className="px-3">When</TH>
                </tr>
              </THead>
              <TBody>
                {r.perMatch.map((m) => (
                  <TR key={m.match}>
                    <TD className="px-3 font-medium">{MATCH_LABEL[m.match].label}</TD>
                    <TD numeric mono className="px-3">
                      × {m.factor.toFixed(2)}
                    </TD>
                    <TD numeric mono className="px-3 font-semibold">
                      {money(m.bid, currency)}
                    </TD>
                    <TD className="px-3 text-xs text-muted">{MATCH_LABEL[m.match].note}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div>
            <h3 className="text-[0.8125rem] font-semibold text-ink">If the conversion rate were…</h3>
            <p className="text-xs text-muted">
              {hasCpc
                ? `Is a ${money(input.currentCpc, currency)} click affordable at each conversion rate?`
                : "Add your current CPC to see which rates make it affordable."}
            </p>
            <Table caption="Conversion rate sensitivity" wrapperClassName="relative mt-2">
              <THead>
                <tr>
                  <TH className="px-3">
                    <Jargon k="cvr" />
                  </TH>
                  <TH numeric className="px-3">
                    Max CPC
                  </TH>
                  <TH numeric className="px-3">
                    Bid (80%)
                  </TH>
                  <TH numeric className="px-3">
                    ACoS at current CPC
                  </TH>
                  <TH className="px-3">Verdict</TH>
                </tr>
              </THead>
              <TBody>
                {r.sensitivity.map((s) => (
                  <TR key={s.cvr} className={cn(s.current && "bg-brand-soft/60")}>
                    <TD mono className="px-3">
                      {pct(s.cvr)}
                      {s.current ? <span className="ml-1.5 font-sans text-[0.6875rem] text-brand">yours</span> : null}
                    </TD>
                    <TD numeric mono className="px-3">
                      {money(s.maxCpc, currency)}
                    </TD>
                    <TD numeric mono className="px-3">
                      {money(s.recommended, currency)}
                    </TD>
                    <TD numeric mono className="px-3">
                      {pct(s.acosAtCurrent)}
                    </TD>
                    <TD className="px-3">
                      {hasCpc && Number.isFinite(s.maxCpc) ? (
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", s.affordable ? "text-good" : "text-bad")}>
                          {s.affordable ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                          {s.affordable ? "Affordable" : "Too expensive"}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  );
}
