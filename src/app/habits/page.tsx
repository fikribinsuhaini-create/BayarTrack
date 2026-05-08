"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/state";
import type { Habit } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  getWeekDates,
  getHabitScopeKey,
  addWeeks,
  toISODateOnly,
  parseISODateOnly,
  weeksBetween,
  isChecked,
  toggleChecked,
} from "@/lib/habits";
import { newId } from "@/lib/id";

function dayLabel(i: number): string {
  // Mon..Sun
  return ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][i] ?? "";
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function pickNextColor(existing: Habit["color"][]): Habit["color"] {
  const palette: Habit["color"][] = ["cyan", "green", "blue", "purple", "amber", "red", "zinc"];
  for (const c of palette) {
    if (!existing.includes(c)) return c;
  }
  return palette[existing.length % palette.length] ?? "cyan";
}

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

export default function HabitsPage() {
  const { state, api } = useAppState();
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState<number>(7);
  const [newProgramWeeks, setNewProgramWeeks] = useState<number>(7);
  const [activeWeekByHabitId, setActiveWeekByHabitId] = useState<Record<string, string>>({});

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const headerMonth = useMemo(() => monthLabel(now), [now]);
  const headerYear = useMemo(() => String(now.getFullYear()), [now]);

  const habits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    const goalPerWeek = Math.min(7, Math.max(1, Math.round(newGoal)));
    const programWeeks = Math.min(52, Math.max(1, Math.round(newProgramWeeks)));
    const startWeekStart = getHabitScopeKey("weekly", now);
    const existingColors = state.habits.filter((h) => !h.archived).map((h) => h.color);
    const color = pickNextColor(existingColors);
    const nowIso = new Date().toISOString();
    const habit: Habit = {
      id: newId("habit"),
      name,
      color,
      goalPerWeek,
      programWeeks,
      startWeekStart,
      archived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    api.setHabits([...state.habits, habit]);
    setNewName("");
    setNewGoal(goalPerWeek);
    setNewProgramWeeks(programWeeks);
  };

  const deleteHabit = (habitId: string) => {
    if (!window.confirm("Delete habit ni?")) return;
    api.setHabits(state.habits.filter((h) => h.id !== habitId));
    setActiveWeekByHabitId((m) => {
      if (!(habitId in m)) return m;
      const { [habitId]: __drop, ...rest } = m;
      void __drop;
      return rest;
    });

    const nextChecks: Record<string, string[]> = {};
    for (const [k, ids] of Object.entries(state.habitChecks)) {
      if (!Array.isArray(ids)) continue;
      const filtered = ids.filter((id) => id !== habitId);
      if (filtered.length > 0) nextChecks[k] = filtered;
    }
    api.setHabitChecks(nextChecks);
  };

  const headerLabel = "Weekly";

  const editHabitMeta = (habit: Habit) => {
    const goalRaw = window.prompt("Goal per week (1-7)", String(habit.goalPerWeek ?? 7));
    if (goalRaw === null) return;
    const goal = Math.min(7, Math.max(1, Math.round(Number(goalRaw || habit.goalPerWeek || 7))));

    const programRaw = window.prompt("Program weeks (1-52)", String(habit.programWeeks ?? 7));
    if (programRaw === null) return;
    const programWeeks = Math.min(52, Math.max(1, Math.round(Number(programRaw || habit.programWeeks || 7))));

    api.setHabits(
      state.habits.map((h) =>
        h.id === habit.id
          ? { ...h, goalPerWeek: goal, programWeeks, updatedAt: new Date().toISOString() }
          : h
      )
    );
  };

  const getActiveWeekStart = (habit: Habit): string => {
    const active = activeWeekByHabitId[habit.id];
    if (active && /^\d{4}-\d{2}-\d{2}$/.test(active)) return active;
    return getHabitScopeKey("weekly", now);
  };

  const setActiveWeekStart = (habitId: string, weekStart: string) => {
    setActiveWeekByHabitId((m) => ({ ...m, [habitId]: weekStart }));
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Habits</h1>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{headerLabel}</div>
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <div>
            <span className="hidden sm:inline">{headerMonth}</span>
            <span className="sm:hidden">{headerYear}</span>
          </div>
          <div />
        </div>
      </header>

      <Card>
        <div className="text-sm font-medium">Tambah habit</div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Nama habit</div>
            <div className="mt-1">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Contoh: Jogging" />
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Goal per week (1–7)</div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {Array.from({ length: 7 }, (_v, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 w-9 rounded-md text-xs font-semibold ring-1 ${
                    newGoal === n
                      ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-black dark:ring-white"
                      : "bg-zinc-50 text-zinc-700 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                  }`}
                  onClick={() => setNewGoal(n)}
                  title={`Goal ${n}/week`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Program weeks (berapa minggu nak repeat)</div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {[1, 2, 3, 4, 6, 7, 8, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 rounded-md px-3 text-xs font-semibold ring-1 ${
                    newProgramWeeks === n
                      ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-black dark:ring-white"
                      : "bg-zinc-50 text-zinc-700 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                  }`}
                  onClick={() => setNewProgramWeeks(n)}
                  title={`Program ${n} weeks`}
                >
                  {n}w
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button size="sm" onClick={addHabit} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Tracking weekly je (Isnin–Ahad). Set <span className="font-medium">goal/week</span> + <span className="font-medium">program weeks</span>.
        </div>
      </Card>

      {habits.length === 0 ? (
        <Card>
          <div className="text-sm font-medium">Belum ada habit</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tambah habit di atas untuk mula track.
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {habits.map((h) => {
          const activeWeekStart = getActiveWeekStart(h);
          const activeWeekDate = parseISODateOnly(activeWeekStart) ?? now;
          const activeWeekDates = getWeekDates(activeWeekDate);
          const scopeKey = activeWeekStart;
          const doneCount = activeWeekDates.filter((_d, i) => isChecked(state.habitChecks, scopeKey, i, h.id)).length;
          const goal = Math.min(7, Math.max(1, Math.round(h.goalPerWeek || 7)));
          const complete = doneCount >= goal;
          const weekIndex0 = weeksBetween(h.startWeekStart, activeWeekStart) ?? 0;
          const weekIndex = Math.max(0, weekIndex0) + 1;
          const totalWeeks = h.programWeeks ?? null;
          return (
            <Card key={h.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium">{h.name}</div>
                    <Badge>Goal {goal}/week</Badge>
                    <Badge>{totalWeeks ? `${totalWeeks}w` : "∞"}</Badge>
                    <Badge>
                      Week {weekIndex}
                      {totalWeeks ? `/${totalWeeks}` : ""}
                    </Badge>
                    {complete ? <Badge tone="green">Complete</Badge> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {doneCount}/7
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => editHabitMeta(h)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => deleteHabit(h.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {activeWeekDates.map((_d, i) => {
                  const checked = isChecked(state.habitChecks, scopeKey, i, h.id);
                  return (
                    <button
                      key={`${h.id}-${scopeKey}-${i}`}
                      type="button"
                      onClick={() => {
                        const nextChecks = toggleChecked(state.habitChecks, scopeKey, i, h.id);
                        api.setHabitChecks(nextChecks);

                        const nextDoneCount = activeWeekDates.filter((_d2, j) => isChecked(nextChecks, scopeKey, j, h.id)).length;
                        const nextComplete = nextDoneCount >= goal;
                        if (!nextComplete) return;
                        if (!totalWeeks) return;
                        if (weekIndex >= totalWeeks) return;
                        const dt = parseISODateOnly(activeWeekStart);
                        if (!dt) return;
                        const nextWeekStart = toISODateOnly(addWeeks(dt, 1));
                        setActiveWeekStart(h.id, nextWeekStart);
                      }}
                      className={`rounded-lg px-2 py-3 text-center ring-1 transition-colors ${
                        checked
                          ? `${checkedCellClass(h.color)} ${
                              h.color === "zinc" ? "text-black dark:text-black" : "text-white"
                            }`
                          : "bg-zinc-50 text-zinc-700 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-70">{dayLabel(i)}</div>
                      <div className="mt-1 text-xs font-semibold">{checked ? "✓" : ""}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const dt = parseISODateOnly(activeWeekStart);
                    if (!dt) return;
                    setActiveWeekStart(h.id, toISODateOnly(addWeeks(dt, -1)));
                  }}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const dt = parseISODateOnly(activeWeekStart);
                    if (!dt) return;
                    setActiveWeekStart(h.id, toISODateOnly(addWeeks(dt, 1)));
                  }}
                >
                  Next
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
