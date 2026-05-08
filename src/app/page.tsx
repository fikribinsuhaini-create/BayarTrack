"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/state";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getHabitScopeKey, isChecked } from "@/lib/habits";
import type { Habit, TodoItem } from "@/lib/types";
import { ensureMonthRecord, getMonthTotals } from "@/lib/month";
import { formatMYRFromCents } from "@/lib/money";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCurrentMonthKey } from "@/lib/month";

function sortTodosForDashboard(a: TodoItem, b: TodoItem) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const da = a.dueDate ?? "9999-12-31";
  const db = b.dueDate ?? "9999-12-31";
  if (da !== db) return da.localeCompare(db);
  return b.createdAt.localeCompare(a.createdAt);
}

export default function DashboardPage() {
  const router = useRouter();
  const { state, api } = useAppState();

  const activeHabits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);
  const weekStart = useMemo(() => getHabitScopeKey("weekly", new Date()), []);

  const habitProgress = useMemo(() => {
    const res: Array<{ habit: Habit; done: number; goal: number }> = [];
    for (const h of activeHabits) {
      let done = 0;
      for (let i = 0; i < 7; i++) if (isChecked(state.habitChecks, weekStart, i, h.id)) done++;
      const goal = Math.min(7, Math.max(1, Math.round(h.goalPerWeek || 7)));
      res.push({ habit: h, done, goal });
    }
    res.sort((a, b) => b.done / b.goal - a.done / a.goal);
    return res.slice(0, 5);
  }, [activeHabits, state.habitChecks, weekStart]);

  const upcomingTodos = useMemo(() => {
    return [...state.todos].filter((t) => !t.done).sort(sortTodosForDashboard).slice(0, 6);
  }, [state.todos]);

  const monthKey = useMemo(() => getCurrentMonthKey(), []);
  useEffect(() => {
    const ensured = ensureMonthRecord(state.months, state.templates, monthKey);
    if (ensured.months !== state.months) api.setMonths(ensured.months);
  }, [api, monthKey, state.months, state.templates]);
  const record = state.months[monthKey] ?? null;
  const totals = useMemo(
    () => (record ? getMonthTotals(record) : { total: 0, paid: 0, unpaid: 0, progress: 0 }),
    [record]
  );

  return (
    <div className="space-y-4">
      <Card
        className="group cursor-pointer border-emerald-200/70 bg-gradient-to-b from-emerald-50/70 to-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-zinc-950"
        onClick={() => router.push("/komitmen?tab=bulan")}
        role="button"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Komitmen</div>
          </div>
          <div className="text-sm text-emerald-700/80 opacity-0 transition group-hover:opacity-100 dark:text-emerald-200/80">
            →
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Jumlah</div>
            <div className="mt-1 text-lg font-semibold">{formatMYRFromCents(totals.total)}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Sudah bayar</div>
            <div className="mt-1 text-lg font-semibold">{formatMYRFromCents(totals.paid)}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Baki</div>
            <div className="mt-1 text-lg font-semibold">{formatMYRFromCents(totals.unpaid)}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm font-medium">Progress</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{Math.round(totals.progress * 100)}%</div>
        </div>
        <div className="mt-2">
          <ProgressBar value={totals.progress} />
        </div>
        <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Tap untuk buka</div>
      </Card>

      <Card
        className="group cursor-pointer border-cyan-200/70 bg-gradient-to-b from-cyan-50/70 to-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-cyan-900/40 dark:from-cyan-950/30 dark:to-zinc-950"
        onClick={() => router.push("/habits")}
        role="button"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
            <div className="text-sm font-medium">Habits</div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">This week</span>
          </div>
          <div className="text-sm text-cyan-700/80 opacity-0 transition group-hover:opacity-100 dark:text-cyan-200/80">
            →
          </div>
        </div>
        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
          {habitProgress.length === 0 ? (
            <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">Belum ada habit.</div>
          ) : (
            habitProgress.map(({ habit, done, goal }) => (
              <div key={habit.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{habit.name}</div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {done}/{goal} siap
                  </div>
                </div>
                {done >= goal ? <Badge tone="green">Complete</Badge> : <Badge tone="neutral">In progress</Badge>}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card
        className="group cursor-pointer border-amber-200/70 bg-gradient-to-b from-amber-50/70 to-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-zinc-950"
        onClick={() => router.push("/todo")}
        role="button"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <div className="text-sm font-medium">To-do</div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Next up</span>
          </div>
          <div className="text-sm text-amber-700/80 opacity-0 transition group-hover:opacity-100 dark:text-amber-200/80">
            →
          </div>
        </div>
        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
          {upcomingTodos.length === 0 ? (
            <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">Tiada task.</div>
          ) : (
            upcomingTodos.map((t) => (
              <div key={t.id} className="py-3">
                <div className="truncate font-medium">{t.title}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {t.dueDate ? `Due ${t.dueDate}` : "No due date"}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
