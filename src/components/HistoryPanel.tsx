"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/state";
import { isValidMonthKey } from "@/lib/date";
import { ensureMonthRecord, getMonthTotals } from "@/lib/month";
import { getCurrentMonthKey } from "@/lib/month";
import { formatMYRFromCents } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { MonthSwitcher } from "@/components/MonthSwitcher";

export type HistoryPanelVariant = "page" | "settings";

export function HistoryPanel({ variant }: { variant: HistoryPanelVariant }) {
  const { state, api } = useAppState();
  const monthKeys = useMemo(
    () => Object.keys(state.months).filter(isValidMonthKey).sort().reverse(),
    [state.months]
  );
  const [monthKey, setMonthKey] = useState<string>(() => getCurrentMonthKey());

  const displayMonthKey = useMemo(() => {
    const base = isValidMonthKey(monthKey) ? monthKey : getCurrentMonthKey();
    if (state.months[base]) return base;
    return monthKeys[0] ?? base;
  }, [monthKey, monthKeys, state.months]);

  const ensured = useMemo(
    () => ensureMonthRecord(state.months, state.templates, displayMonthKey),
    [displayMonthKey, state.months, state.templates]
  );
  const record = ensured.record;

  useEffect(() => {
    if (ensured.months !== state.months) api.setMonths(ensured.months);
  }, [api, ensured.months, state.months]);

  const totals = useMemo(() => getMonthTotals(record), [record]);

  const setPaid = (templateId: string, paid: boolean) => {
    const nowIso = new Date().toISOString();
    const next = {
      ...record,
      updatedAt: nowIso,
      commitments: record.commitments.map((c) => {
        if (c.templateId !== templateId) return c;
        if (paid) return { ...c, status: "paid" as const, paidAt: nowIso };
        return { ...c, status: "unpaid" as const, paidAt: undefined };
      }),
    };
    api.setMonths({ ...state.months, [monthKey]: next });
  };

  const title = variant === "page" ? "Sejarah" : "Sejarah (Rekod Bulanan)";
  const showQuickPick = variant === "page";

  return (
    <div className="space-y-4">
      <header className={variant === "page" ? "space-y-2" : "space-y-1"}>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Rekod Bulanan</div>
        <h1 className={variant === "page" ? "text-xl font-semibold" : "text-base font-semibold"}>{title}</h1>
        <MonthSwitcher monthKey={displayMonthKey} onChange={setMonthKey} />
      </header>

      {showQuickPick ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">Quick pilih bulan</div>
            <div className="flex flex-wrap gap-2">
              {/* menurun: latest -> older */}
              {monthKeys.slice(0, 6).map((k) => (
                <Button key={k} variant={k === monthKey ? "primary" : "secondary"} size="sm" onClick={() => setMonthKey(k)}>
                  {k}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={totals.progress} />
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {formatMYRFromCents(totals.paid)} / {formatMYRFromCents(totals.total)} dibayar
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardTitle>Jumlah</CardTitle>
          <CardValue>{formatMYRFromCents(totals.total)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Sudah Bayar</CardTitle>
          <CardValue>{formatMYRFromCents(totals.paid)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Baki</CardTitle>
          <CardValue>{formatMYRFromCents(totals.unpaid)}</CardValue>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-medium">Komitmen ({record.commitments.length})</div>
        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
          {record.commitments.map((c) => (
            <label key={c.templateId} className="flex cursor-pointer items-start gap-3 py-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-emerald-600"
                checked={c.status === "paid"}
                onChange={(e) => setPaid(c.templateId, e.target.checked)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate font-medium">{c.name}</div>
                  <Badge tone={c.status === "paid" ? "green" : "amber"}>{c.status === "paid" ? "Sudah Bayar" : "Belum Bayar"}</Badge>
                  <Badge>{c.category}</Badge>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Due {c.dueDay}</span>
                </div>
                <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{formatMYRFromCents(c.amountCents)}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

