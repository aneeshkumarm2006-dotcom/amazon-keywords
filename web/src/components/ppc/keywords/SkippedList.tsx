"use client";

import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { acos as acosOf, norm, type SkippedTerm, type Store } from "@/lib/ppc";

import { count, money, pct } from "../format";
import { ACTION_LABEL, SKIP_CATEGORY_LABEL, skipCategory, skipExplanation, type SkipCategory } from "../work/recs";
import { AcosText, ActionBadge, Figure, ShowMore } from "./common";

const STEP = 50;

/** Terms the rules looked at and left alone — with the reason, so nothing is dropped silently. */
export function SkippedList({ skipped, store, wide }: { skipped: SkippedTerm[]; store: Store; wide: boolean }) {
  const uid = useId();
  const [text, setText] = useState("");
  const [cat, setCat] = useState<SkipCategory | "">("");
  const [limit, setLimit] = useState(STEP);
  const withCat = useMemo(() => skipped.map((s) => ({ s, cat: skipCategory(s) })), [skipped]);
  const cats = useMemo(() => {
    const m = new Map<SkipCategory, number>();
    for (const x of withCat) m.set(x.cat, (m.get(x.cat) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [withCat]);
  const filtered = useMemo(() => {
    const q = norm(text);
    return withCat.filter((x) => (!cat || x.cat === cat) && (!q || `${norm(x.s.subject)} ${norm(x.s.campaign)} ${norm(x.s.adGroup)}`.includes(q)));
  }, [withCat, text, cat]);
  const shown = filtered.slice(0, limit);
  const E = store.economics;

  if (!skipped.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">Nothing was skipped in this window.</p>;
  }

  return (
    <div>
      <div className="grid gap-3 border-b border-hairline px-4 py-3 sm:grid-cols-[minmax(0,1fr)_16rem] sm:px-5">
        <Input
          id={`${uid}-q`}
          label="Search skipped terms"
          hideLabel
          placeholder="Search term, campaign or ad group"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLimit(STEP);
          }}
        />
        <Select
          id={`${uid}-cat`}
          label="Reason"
          hideLabel
          value={cat}
          onChange={(e) => {
            setCat(e.target.value as SkipCategory | "");
            setLimit(STEP);
          }}
          options={[{ value: "", label: `All reasons (${count(skipped.length)})` }, ...cats.map(([c, n]) => ({ value: c, label: `${SKIP_CATEGORY_LABEL[c]} (${count(n)})` }))]}
        />
      </div>
      {wide ? (
        <Table caption="Skipped terms and why" wrapperClassName="relative rounded-none border-0 bg-transparent">
          <THead>
            <tr>
              <TH className="px-2.5 pl-4 sm:pl-5">Term / target</TH>
              <TH className="px-2.5">Held back</TH>
              <TH numeric className="px-2.5">
                Clicks
              </TH>
              <TH numeric className="px-2.5">
                Orders
              </TH>
              <TH numeric className="px-2.5">
                Spend
              </TH>
              <TH numeric className="px-2.5">
                ACoS
              </TH>
              <TH className="px-2.5 pr-4 sm:pr-5">Why it was left alone</TH>
            </tr>
          </THead>
          <TBody>
            {shown.map(({ s, cat: c }, i) => (
              <TR key={`${s.subject}|${s.campaign}|${s.adGroup}|${s.action ?? ""}|${i}`}>
                <TD className="max-w-[18rem] px-2.5 pl-4 sm:pl-5">
                  <p className="font-medium break-words text-ink">{s.subject}</p>
                  <p className="truncate text-xs text-muted" title={`${s.campaign} → ${s.adGroup}`}>
                    {s.campaign} → {s.adGroup}
                    {s.matchType ? ` · ${s.matchType}` : ""}
                  </p>
                </TD>
                <TD className="px-2.5">{s.action ? <ActionBadge action={s.action} /> : <span className="text-xs text-muted">Bid review</span>}</TD>
                <TD numeric mono className="px-2.5">
                  {count(s.counters.clicks)}
                </TD>
                <TD numeric mono className="px-2.5">
                  {count(s.counters.orders)}
                </TD>
                <TD numeric mono className="px-2.5">
                  {money(s.counters.spend, store.currency)}
                </TD>
                <TD numeric className="px-2.5">
                  <AcosText acos={acosOf(s.counters)} target={E.targetAcos} breakEven={E.breakEvenAcos} spend={s.counters.spend} />
                </TD>
                <TD className="max-w-[26rem] px-2.5 pr-4 sm:pr-5">
                  <p className="text-xs font-medium text-ink">{SKIP_CATEGORY_LABEL[c]}</p>
                  <p className="text-xs leading-relaxed text-muted">{skipExplanation(s)}</p>
                  <p className="mt-0.5 text-[0.6875rem] break-words text-faint">Engine: {s.reason}</p>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <ul aria-label="Skipped terms and why" className="divide-y divide-hairline">
          {shown.map(({ s, cat: c }, i) => (
            <li key={`${s.subject}|${s.campaign}|${s.adGroup}|${s.action ?? ""}|${i}`} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {s.action ? <ActionBadge action={s.action} /> : null}
                <span className="text-xs font-medium text-ink">{SKIP_CATEGORY_LABEL[c]}</span>
              </div>
              <p className="text-sm font-medium break-words text-ink">{s.subject}</p>
              <p className="truncate text-xs text-muted">
                {s.campaign} → {s.adGroup}
              </p>
              <dl className="grid grid-cols-4 gap-2">
                <Figure label="Clicks">{count(s.counters.clicks)}</Figure>
                <Figure label="Orders">{count(s.counters.orders)}</Figure>
                <Figure label="Spend">{money(s.counters.spend, store.currency)}</Figure>
                <Figure label="ACoS">{pct(acosOf(s.counters))}</Figure>
              </dl>
              <p className="text-xs leading-relaxed text-muted">{skipExplanation(s)}</p>
              <p className="text-[0.6875rem] break-words text-faint">
                Engine: {s.reason}
                {s.action ? ` (${ACTION_LABEL[s.action]})` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {!filtered.length ? <p className="px-4 py-6 text-center text-sm text-muted">No skipped terms match.</p> : null}
      <ShowMore shown={shown.length} total={filtered.length} step={STEP} noun="skipped terms" onMore={() => setLimit((l) => l + STEP)} onAll={() => setLimit(filtered.length)} />
    </div>
  );
}
