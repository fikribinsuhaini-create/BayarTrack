"use client";

import type { AppSettings, MonthRecord, TodoItem } from "@/lib/types";
import { parseISODate, toISODate } from "@/lib/date";

function isWithinQuietHours(settings: AppSettings, now: Date): boolean {
  const h = now.getHours();
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;
  if (start === end) return false; // no quiet hours
  if (start < end) return h < start || h >= end;
  // wraps midnight
  return h < start && h >= end;
}

export function canNotify(settings: AppSettings): boolean {
  if (!settings.notificationsEnabled) return false;
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined") return "denied";
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

type NotifCandidate = { key: string; title: string; body: string };

export function computeNotifCandidates(params: {
  now: Date;
  settings: AppSettings;
  monthRecord: MonthRecord | null;
  todos: TodoItem[];
}): NotifCandidate[] {
  const { now, settings, monthRecord, todos } = params;
  if (isWithinQuietHours(settings, now)) return [];

  const today = toISODate(now);
  const candidates: NotifCandidate[] = [];

  if (monthRecord) {
    for (const c of monthRecord.commitments) {
      if (c.status === "paid") continue;
      const due = new Date(now.getFullYear(), now.getMonth(), c.dueDay);
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) continue;
      if (daysLeft > settings.notifyCommitmentsDaysBefore) continue;
      candidates.push({
        key: `commitment:${monthRecord.monthKey}:${c.templateId}:${today}`,
        title: "Komitmen hampir due date",
        body: `${c.name} due ${c.dueDay}/${now.getMonth() + 1}. (${daysLeft} hari lagi)`,
      });
    }
  }

  for (const t of todos) {
    if (t.done) continue;
    if (!t.dueDate) continue;
    const due = parseISODate(t.dueDate);
    if (!due) continue;
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) continue;
    if (daysLeft > settings.notifyTodosDaysBefore) continue;
    candidates.push({
      key: `todo:${t.id}:${today}`,
      title: "To-do belum siap",
      body: `${t.title} due ${t.dueDate}. (${daysLeft} hari lagi)`,
    });
  }

  return candidates.slice(0, 5);
}

export function sendLocalNotifications(
  candidates: NotifCandidate[],
  notifs: Record<string, string>
): { sentKeys: string[]; nextNotifs: Record<string, string> } {
  const nowIso = new Date().toISOString();
  const sentKeys: string[] = [];
  let nextNotifs = notifs;

  for (const c of candidates) {
    if (nextNotifs[c.key]) continue;
    try {
      new Notification(c.title, { body: c.body });
      if (nextNotifs === notifs) nextNotifs = { ...notifs };
      nextNotifs[c.key] = nowIso;
      sentKeys.push(c.key);
    } catch {
      // ignore
    }
  }

  return { sentKeys, nextNotifs };
}
