"use client";

import type { CommitmentTemplate, MonthRecord, MonthlyCommitment } from "@/lib/types";
import { isValidMonthKey, toMonthKey } from "@/lib/date";

export function getCurrentMonthKey(): string {
  return toMonthKey(new Date());
}

export function ensureMonthRecord(
  months: Record<string, MonthRecord>,
  templates: CommitmentTemplate[],
  monthKey: string
): { months: Record<string, MonthRecord>; record: MonthRecord } {
  if (!isValidMonthKey(monthKey)) monthKey = toMonthKey(new Date());
  const nowIso = new Date().toISOString();
  const existing = months[monthKey];

  const activeTemplates = templates.filter((t) => t.active);
  const toMonthly = (t: CommitmentTemplate): MonthlyCommitment => ({
    templateId: t.id,
    name: t.name,
    amountCents: t.amountCents,
    category: t.category,
    dueDay: t.dueDay,
    status: "unpaid",
  });

  if (!existing) {
    const record: MonthRecord = {
      monthKey,
      createdAt: nowIso,
      updatedAt: nowIso,
      commitments: activeTemplates.map(toMonthly).sort(sortCommitments),
    };
    return { months: { ...months, [monthKey]: record }, record };
  }

  // add any newly active templates that are not yet in this month record
  const existingIds = new Set(existing.commitments.map((c) => c.templateId));
  const newOnes = activeTemplates.filter((t) => !existingIds.has(t.id)).map(toMonthly);
  if (newOnes.length === 0) return { months, record: existing };

  const record: MonthRecord = {
    ...existing,
    updatedAt: nowIso,
    commitments: [...existing.commitments, ...newOnes].sort(sortCommitments),
  };
  return { months: { ...months, [monthKey]: record }, record };
}

export function sortCommitments(a: MonthlyCommitment, b: MonthlyCommitment): number {
  if (a.dueDay !== b.dueDay) return a.dueDay - b.dueDay;
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
}

export function sumCents(items: { amountCents: number }[]): number {
  return items.reduce((acc, it) => acc + (it.amountCents || 0), 0);
}

export function getMonthTotals(record: MonthRecord) {
  const total = sumCents(record.commitments);
  const paid = sumCents(record.commitments.filter((c) => c.status === "paid"));
  const unpaid = total - paid;
  const progress = total > 0 ? paid / total : 0;
  return { total, paid, unpaid, progress };
}
