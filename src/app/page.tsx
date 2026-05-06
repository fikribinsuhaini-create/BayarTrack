"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/state";
import { ensureMonthRecord, getMonthTotals } from "@/lib/month";
import { formatMYRFromCents } from "@/lib/money";
import { getCurrentMonthKey } from "@/lib/month";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

export default function DashboardPage() {
  const { state, api } = useAppState();
  const [monthKey, setMonthKey] = useState<string>(() => getCurrentMonthKey());

  useEffect(() => {
    const ensured = ensureMonthRecord(state.months, state.templates, monthKey);
    if (ensured.months !== state.months) api.setMonths(ensured.months);
  }, [api, monthKey, state.months, state.templates]);

  const record = state.months[monthKey] ?? null;

  const totals = useMemo(() => (record ? getMonthTotals(record) : { total: 0, paid: 0, unpaid: 0, progress: 0 }), [record]);

  const setPaid = (templateId: string, paid: boolean) => {
    if (!record) return;
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

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Dashboard Bulanan</div>
        <MonthSwitcher monthKey={monthKey} onChange={setMonthKey} />
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardTitle>Jumlah Komitmen</CardTitle>
          <CardValue>{formatMYRFromCents(totals.total)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Sudah Bayar</CardTitle>
          <CardValue>{formatMYRFromCents(totals.paid)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Baki Belum Bayar</CardTitle>
          <CardValue>{formatMYRFromCents(totals.unpaid)}</CardValue>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Progress Bayaran</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{Math.round(totals.progress * 100)}%</div>
        </div>
        <div className="mt-3">
          <ProgressBar value={totals.progress} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Senarai Komitmen</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{record ? record.commitments.length : 0} item</div>
        </div>

        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
          {!record || record.commitments.length === 0 ? (
            <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">
              Tiada komitmen lagi. Pergi ke tab <span className="font-medium">Komitmen</span> untuk tambah.
            </div>
          ) : (
            record.commitments.map((c) => (
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
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
