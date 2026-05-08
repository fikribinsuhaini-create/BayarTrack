"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppState } from "@/lib/state";
import type { Habit } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { monthKeyToLabel, shiftMonthKey, toMonthKey, toISODate } from "@/lib/date";
import { addDays, parseISODateOnly, startOfWeekMonday } from "@/lib/habits";

function checkedCellClass(color: Habit["color"]): string {
  switch (color) {
    case "red":
      return "bg-red-500 ring-red-500/60";
    case "blue":
      return "bg-blue-500 ring-blue-500/60";
    case "green":
      return "bg-emerald-500 ring-emerald-500/60";
    case "purple":
      return "bg-purple-500 ring-purple-500/60";
    case "amber":
      return "bg-amber-500 ring-amber-500/60";
    case "zinc":
      return "bg-zinc-700 ring-zinc-700/60 dark:bg-zinc-200 dark:ring-zinc-200/60";
    case "cyan":
    default:
      return "bg-cyan-500 ring-cyan-500/60";
  }
}

function parseMonthKey(value: string): { y: number; m0: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const m0 = Number(m[2]) - 1;
  if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11) return null;
  return { y, m0 };
}

function getMonthGrid(monthKey: string): Date[][] {
  const parsed = parseMonthKey(monthKey);
  const base = parsed ? new Date(parsed.y, parsed.m0, 1) : new Date();
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const start = startOfWeekMonday(first);
  const weeks: Date[][] = [];
  for (let d = new Date(start); d <= last; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_v, i) => addDays(d, i)));
  }
  return weeks;
}

function isInMonth(d: Date, monthKey: string): boolean {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return true;
  return d.getFullYear() === parsed.y && d.getMonth() === parsed.m0;
}

function dayLabel(i: number): string {
  return ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][i] ?? "";
}

function getTickDatesForHabit(habitChecks: Record<string, string[]>, habitId: string): Date[] {
  const out: Date[] = [];
  for (const [k, ids] of Object.entries(habitChecks)) {
    if (!Array.isArray(ids) || !ids.includes(habitId)) continue;
    const m = /^habit:(\d{4}-\d{2}-\d{2}):([0-6])$/.exec(k);
    if (!m) continue;
    const weekStartIso = m[1]!;
    const dayIndex = Number(m[2]);
    const ws = parseISODateOnly(weekStartIso);
    if (!ws || !Number.isFinite(dayIndex)) continue;
    out.push(addDays(ws, dayIndex));
  }
  out.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

function fmtRange(dates: Date[]): string {
  if (dates.length === 0) return "No ticks yet";
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt.format(first)} – ${fmt.format(last)}`;
}

export default function ReportPage() {
  const { state } = useAppState();
  const habits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);
  const [habitId, setHabitId] = useState<string>(() => habits[0]?.id ?? "");
  const [monthKey, setMonthKey] = useState<string>(() => toMonthKey(new Date()));

  const habit = useMemo(() => habits.find((h) => h.id === habitId) ?? null, [habits, habitId]);
  const allTicks = useMemo(() => (habit ? getTickDatesForHabit(state.habitChecks, habit.id) : []), [habit, state.habitChecks]);
  const range = useMemo(() => fmtRange(allTicks), [allTicks]);

  const grid = useMemo(() => getMonthGrid(monthKey), [monthKey]);
  const tickSet = useMemo(() => {
    if (!habit) return new Set<string>();
    const set = new Set<string>();
    for (const d of allTicks) {
      const iso = toISODate(d);
      if (iso.startsWith(`${monthKey}-`)) set.add(iso);
    }
    return set;
  }, [allTicks, habit, monthKey]);

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Analytics</div>
        <h1 className="text-xl font-semibold">Report</h1>
      </header>

      {habits.length === 0 ? (
        <Card>
          <div className="text-sm font-medium">Tiada habit</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Buat habit dulu dekat Habits.
          </div>
          <div className="mt-3 text-sm">
            <Link href="/habits" className="font-medium underline">
              Pergi Habits
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-sm">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Habit</div>
              <div className="mt-1">
                <Select value={habitId} onChange={(e) => setHabitId(e.target.value)}>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Badge>Monthly</Badge>
                <span>{range}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMonthKey((k) => shiftMonthKey(k, -1))}>
                Prev
              </Button>
              <div className="text-sm font-medium">{monthKeyToLabel(monthKey)}</div>
              <Button variant="secondary" size="sm" onClick={() => setMonthKey((k) => shiftMonthKey(k, 1))}>
                Next
              </Button>
            </div>
          </div>

          {habit ? (
            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                {Array.from({ length: 7 }, (_v, i) => (
                  <div key={i} className="text-center">
                    {dayLabel(i)}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid gap-1">
                {grid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((d, di) => {
                      const inMonth = isInMonth(d, monthKey);
                      const iso = toISODate(d);
                      const checked = inMonth && tickSet.has(iso);
                      return (
                        <div
                          key={di}
                          className={`h-4 w-4 rounded-sm ring-1 ${
                            !inMonth
                              ? "bg-transparent ring-transparent"
                              : checked
                                ? `${checkedCellClass(habit.color)}`
                                : "bg-zinc-200 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-800"
                          }`}
                          title={iso}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Tick date detect dari `habitChecks` (weekStart + dayIndex) → render ikut bulan.
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
