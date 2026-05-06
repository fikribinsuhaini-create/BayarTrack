"use client";

import { useMemo, useState } from "react";
import type { CommitmentCategory, CommitmentTemplate } from "@/lib/types";
import { clampDay } from "@/lib/date";
import { newId } from "@/lib/id";
import { formatMYRFromCents, parseAmountToCents } from "@/lib/money";
import { useAppState } from "@/lib/state";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

const CATEGORIES: CommitmentCategory[] = ["Rumah", "Bil", "Loan", "Subscription", "Simpanan", "Lain-lain"];

function sortTemplates(a: CommitmentTemplate, b: CommitmentTemplate) {
  if (a.active !== b.active) return a.active ? -1 : 1;
  if (a.dueDay !== b.dueDay) return a.dueDay - b.dueDay;
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
}

type Draft = {
  id?: string;
  name: string;
  amount: string; // MYR as string
  category: CommitmentCategory;
  dueDay: string;
  active: boolean;
};

const emptyDraft = (): Draft => ({
  name: "",
  amount: "",
  category: "Bil",
  dueDay: "1",
  active: true,
});

export default function KomitmenPage() {
  const { state, api } = useAppState();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string>("");

  const templates = useMemo(() => [...state.templates].sort(sortTemplates), [state.templates]);

  const startEdit = (t: CommitmentTemplate) => {
    setError("");
    setDraft({
      id: t.id,
      name: t.name,
      amount: String((t.amountCents / 100).toFixed(2)),
      category: t.category,
      dueDay: String(t.dueDay),
      active: t.active,
    });
  };

  const resetDraft = () => {
    setError("");
    setDraft(emptyDraft());
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) return setError("Nama komitmen diperlukan.");
    const cents = parseAmountToCents(draft.amount);
    if (cents == null) return setError("Jumlah bayaran tidak sah.");
    const dueDay = clampDay(Number(draft.dueDay));

    const nowIso = new Date().toISOString();
    const isEdit = Boolean(draft.id);
    const id = draft.id ?? newId("c");

    const next: CommitmentTemplate = {
      id,
      name,
      amountCents: cents,
      category: draft.category,
      dueDay,
      active: draft.active,
      createdAt: isEdit ? (state.templates.find((t) => t.id === id)?.createdAt ?? nowIso) : nowIso,
      updatedAt: nowIso,
    };

    const others = state.templates.filter((t) => t.id !== id);
    api.setTemplates([...others, next].sort(sortTemplates));
    resetDraft();
  };

  const toggleActive = (id: string, active: boolean) => {
    const nowIso = new Date().toISOString();
    api.setTemplates(
      state.templates
        .map((t) => (t.id === id ? { ...t, active, updatedAt: nowIso } : t))
        .sort(sortTemplates)
    );
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Pengurusan</div>
          <h1 className="text-xl font-semibold">Komitmen</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={resetDraft}>
          Reset
        </Button>
      </header>

      <Card>
        <div className="text-sm font-medium">{draft.id ? "Edit Komitmen" : "Tambah Komitmen"}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="text-xs text-zinc-500">Nama</div>
            <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Contoh: Sewa rumah" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Jumlah (MYR)</div>
            <Input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} placeholder="Contoh: 1200" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Kategori</div>
            <Select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as CommitmentCategory }))}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Due day (1-31)</div>
            <Input inputMode="numeric" value={draft.dueDay} onChange={(e) => setDraft((d) => ({ ...d, dueDay: e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex h-10 flex-1 cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} />
              Aktif
            </label>
            <Button className="w-28" onClick={save}>
              Simpan
            </Button>
          </div>
        </div>
        {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Senarai Komitmen</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{templates.length} item</div>
        </div>
        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
          {templates.length === 0 ? (
            <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">Belum ada komitmen. Tambah di atas.</div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-medium">{t.name}</div>
                    <Badge>{t.category}</Badge>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Due {t.dueDay}</span>
                    {t.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="amber">Nyahaktif</Badge>}
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{formatMYRFromCents(t.amountCents)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(t)}>
                    Edit
                  </Button>
                  <Button
                    variant={t.active ? "ghost" : "secondary"}
                    size="sm"
                    onClick={() => toggleActive(t.id, !t.active)}
                    title={t.active ? "Nyahaktifkan" : "Aktifkan"}
                  >
                    {t.active ? "Off" : "On"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

