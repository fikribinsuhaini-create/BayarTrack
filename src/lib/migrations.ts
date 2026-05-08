"use client";

import type { AppState } from "@/lib/storage";
import type { TodoList } from "@/lib/types";
import { newId } from "@/lib/id";

export const DEFAULT_LIST_ID = "list_umum";

function defaultList(nowIso: string): TodoList {
  return {
    id: DEFAULT_LIST_ID,
    name: "Umum",
    archived: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function migrateState(state: AppState): { state: AppState; changed: boolean } {
  const nowIso = new Date().toISOString();
  let changed = false;

  let todoLists = Array.isArray(state.todoLists) ? state.todoLists : [];
  if (todoLists.length === 0) {
    todoLists = [defaultList(nowIso)];
    changed = true;
  }

  const knownListIds = new Set(todoLists.map((l) => l.id));
  const fallbackListId = todoLists[0]?.id ?? DEFAULT_LIST_ID;

  const todos = (Array.isArray(state.todos) ? state.todos : []).map((t) => {
    // Backward compat: older todos had no listId
    const listId = (t as unknown as { listId?: string }).listId;
    if (listId && knownListIds.has(listId)) return t;
    changed = true;
    return { ...t, listId: fallbackListId };
  });

  // Ensure lists have ids
  todoLists = todoLists.map((l) => {
    if (l.id) return l;
    changed = true;
    return { ...l, id: newId("list") };
  });

  let habits = Array.isArray((state as unknown as { habits?: unknown }).habits) ? state.habits : [];
  const habitChecksRaw = (state as unknown as { habitChecks?: unknown }).habitChecks;
  let habitChecks =
    habitChecksRaw && typeof habitChecksRaw === "object"
      ? (habitChecksRaw as Record<string, string[]>)
      : ({} as Record<string, string[]>);

  if (!Array.isArray((state as unknown as { habits?: unknown }).habits)) changed = true;
  if (!habitChecksRaw || typeof habitChecksRaw !== "object") changed = true;

  habits = habits.map((h) => {
    const goal = (h as unknown as { goalPerWeek?: unknown }).goalPerWeek;
    const goalPerWeek = Number.isFinite(goal) ? Math.min(7, Math.max(1, Math.round(Number(goal)))) : 7;

    const programRaw = (h as unknown as { programWeeks?: unknown }).programWeeks;
    const programWeeks =
      programRaw === null
        ? null
        : Number.isFinite(programRaw)
          ? Math.min(52, Math.max(1, Math.round(Number(programRaw))))
          : null;

    const startWeekStartRaw = (h as unknown as { startWeekStart?: unknown }).startWeekStart;
    const startWeekStart =
      typeof startWeekStartRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startWeekStartRaw)
        ? startWeekStartRaw
        : (() => {
            const x = new Date();
            x.setHours(0, 0, 0, 0);
            const day = x.getDay();
            const offset = (day + 6) % 7;
            x.setDate(x.getDate() - offset);
            const y = x.getFullYear();
            const m = String(x.getMonth() + 1).padStart(2, "0");
            const d = String(x.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
          })();

    const next = { ...h, goalPerWeek, programWeeks, startWeekStart };
    if (
      goalPerWeek === (h as unknown as { goalPerWeek?: number }).goalPerWeek &&
      programWeeks === (h as unknown as { programWeeks?: number | null }).programWeeks &&
      startWeekStart === (h as unknown as { startWeekStart?: string }).startWeekStart
    )
      return h;

    changed = true;
    return next;
  });

  // Migrate old habitChecks format: YYYY-MM-DD -> habit:<scopeKey>:<dayIndex>
  // Old value shape: dateKey -> habitIds[]
  const oldDateKey = /^\d{4}-\d{2}-\d{2}$/;
  const oldKeys = Object.keys(habitChecks).filter((k) => oldDateKey.test(k));
  if (oldKeys.length > 0) {
    const byId = new Map(habits.map((h) => [h.id, h]));
    const next: Record<string, string[]> = { ...habitChecks };

    const startOfWeekMonday = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      const day = x.getDay(); // Sun=0
      const offset = (day + 6) % 7; // Mon=0
      x.setDate(x.getDate() - offset);
      return x;
    };

    for (const k of oldKeys) {
      const ids = Array.isArray(next[k]) ? next[k]! : [];
      if (ids.length === 0) {
        delete next[k];
        continue;
      }

      const y = Number(k.slice(0, 4));
      const m = Number(k.slice(5, 7)) - 1;
      const dayNum = Number(k.slice(8, 10));
      const dt = new Date(y, m, dayNum);
      if (Number.isNaN(dt.getTime())) continue;

      // Mon=0..Sun=6
      const dayIndex = (dt.getDay() + 6) % 7;

      for (const habitId of ids) {
        const habit = byId.get(habitId);
        if (!habit) continue;

        // new tracking model: always weekly scope (weekStart ISO)
        const ws = startOfWeekMonday(dt);
        const weekStart =
          `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
        const newKey = `habit:${weekStart}:${dayIndex}`;
        const prev = Array.isArray(next[newKey]) ? next[newKey]! : [];
        if (!prev.includes(habitId)) next[newKey] = [...prev, habitId];
      }

      delete next[k];
      changed = true;
    }

    habitChecks = next;
  }


  // Migrate any cadence-scoped keys into weekly-only keys:
  // - habit:YYYY-MM:WEEKSTART:<dayIndex>
  // - habit:YYYY:WEEKSTART:<dayIndex>
  // - habit:YYYY-MM:WEEKSTART:<dayIndex> (already handled)
  {
    const scopedRe = /^habit:(.+):([0-6])$/; // grab scopeKey (may contain colons) + dayIndex
    const keys = Object.keys(habitChecks);
    for (const k of keys) {
      const m = scopedRe.exec(k);
      if (!m) continue;
      const scopeKey = m[1]!;
      const dayIndex = m[2]!;
      if (/^\d{4}-\d{2}-\d{2}$/.test(scopeKey)) continue; // already weekly-only

      // weekly anchor is last YYYY-MM-DD inside scopeKey
      const weekStartMatch = /(\d{4}-\d{2}-\d{2})$/.exec(scopeKey);
      if (!weekStartMatch) continue;
      const weekStart = weekStartMatch[1]!;
      const newKey = `habit:${weekStart}:${dayIndex}`;
      if (!habitChecks[newKey]) habitChecks[newKey] = habitChecks[k]!;
      delete habitChecks[k];
      changed = true;
    }
  }

  return { state: { ...state, todoLists, todos, habits, habitChecks }, changed };
}
