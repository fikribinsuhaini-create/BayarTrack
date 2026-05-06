export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}-${pad2(m)}`;
}

export function isValidMonthKey(value: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return false;
  const mo = Number(m[2]);
  return mo >= 1 && mo <= 12;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseISODate(value: string): Date | null {
  // expects YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function monthKeyToLabel(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const y = Number(m[1]);
  const moNum = Number(m[2]);
  if (moNum < 1 || moNum > 12) return monthKey;
  const mo = moNum - 1;
  const dt = new Date(y, mo, 1);
  return new Intl.DateTimeFormat("ms-MY", { month: "long", year: "numeric" }).format(dt);
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return toMonthKey(new Date());
  const y = Number(m[1]);
  const moNum = Number(m[2]);
  if (moNum < 1 || moNum > 12) return toMonthKey(new Date());
  const mo = moNum - 1;
  const dt = new Date(y, mo + deltaMonths, 1);
  return toMonthKey(dt);
}

export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(31, Math.max(1, Math.round(day)));
}
