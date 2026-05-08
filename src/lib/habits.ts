"use client";

import { toISODate } from "@/lib/date";

export type HabitCadence = "weekly";

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const offset = (day + 6) % 7; // Mon=0, Sun=6
  d.setDate(d.getDate() - offset);
  return d;
}

export function getWeekDates(date: Date): Date[] {
  const start = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_v, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function getWeekLabel(dates: Date[]): string {
  if (dates.length === 0) return "";
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const left = fmt.format(first);
  const right = fmt.format(last);
  return `${left} - ${right}`;
}

export function getHabitScopeKey(cadence: HabitCadence, now: Date): string {
  void cadence;
  return toISODate(startOfWeekMonday(now));
}

export function getHabitCheckKey(scopeKey: string, dayIndex: number): string {
  return `habit:${scopeKey}:${dayIndex}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function toISODateOnly(date: Date): string {
  return toISODate(date);
}

export function parseISODateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  dt.setHours(0, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function weeksBetween(startWeekStartIso: string, endWeekStartIso: string): number | null {
  const a = parseISODateOnly(startWeekStartIso);
  const b = parseISODateOnly(endWeekStartIso);
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function getWeekStartsForMonth(now: Date): Date[] {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = startOfWeekMonday(first);
  const out: Date[] = [];
  for (let d = new Date(start); d <= last; d = addDays(d, 7)) out.push(new Date(d));
  return out;
}

export function getRecentMonths(now: Date, count: number): Date[] {
  const out: Date[] = [];
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = count - 1; i >= 0; i--) out.push(new Date(base.getFullYear(), base.getMonth() - i, 1));
  return out;
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function countCheckedInMonth(
  habitChecks: Record<string, string[]>,
  habitId: string,
  now: Date
): { done: number; total: number } {
  const weeks = getWeekStartsForMonth(now);
  const mk = monthKey(now);
  const total = daysInMonth(now);
  let done = 0;

  for (const ws of weeks) {
    const weekStartIso = ws.toISOString().slice(0, 10);
    const scopeKey = `${mk}:${weekStartIso}`;
    for (let i = 0; i < 7; i++) {
      const day = addDays(ws, i);
      if (!isSameMonth(day, now)) continue;
      if (isChecked(habitChecks, scopeKey, i, habitId)) done++;
    }
  }

  return { done, total };
}

export function countCheckedInYear(
  habitChecks: Record<string, string[]>,
  habitId: string,
  now: Date
): { done: number; total: number } {
  const y = now.getFullYear();
  let done = 0;
  let total = 0;

  for (let month = 0; month < 12; month++) {
    const m = new Date(y, month, 1);
    const weeks = getWeekStartsForMonth(m);
    const days = daysInMonth(m);
    total += days;

    for (const ws of weeks) {
      const weekStartIso = ws.toISOString().slice(0, 10);
      const scopeKey = `${y}:${weekStartIso}`;
      for (let i = 0; i < 7; i++) {
        const day = addDays(ws, i);
        if (!isSameMonth(day, m)) continue;
        if (isChecked(habitChecks, scopeKey, i, habitId)) done++;
      }
    }
  }

  return { done, total };
}

export function isChecked(
  habitChecks: Record<string, string[]>,
  scopeKey: string,
  dayIndex: number,
  habitId: string
): boolean {
  const key = getHabitCheckKey(scopeKey, dayIndex);
  const list = habitChecks[key] ?? [];
  return Array.isArray(list) ? list.includes(habitId) : false;
}

export function toggleChecked(
  habitChecks: Record<string, string[]>,
  scopeKey: string,
  dayIndex: number,
  habitId: string
): Record<string, string[]> {
  const key = getHabitCheckKey(scopeKey, dayIndex);
  const prev = Array.isArray(habitChecks[key]) ? habitChecks[key]! : [];
  const has = prev.includes(habitId);
  const next = has ? prev.filter((x) => x !== habitId) : [...prev, habitId];
  const out = { ...habitChecks, [key]: next };
  if (out[key].length === 0) delete out[key];
  return out;
}
