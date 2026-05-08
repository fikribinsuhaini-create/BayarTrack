"use client";

import type { AppSettings, CommitmentTemplate, Habit, MonthRecord, TodoItem, TodoList } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

type StorageKey =
  | "komitmen.v1.templates"
  | "komitmen.v1.months"
  | "komitmen.v1.todoLists"
  | "komitmen.v1.todos"
  | "komitmen.v1.habits"
  | "komitmen.v1.habitChecks"
  | "komitmen.v1.settings"
  | "komitmen.v1.notifs";

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

export function readKey<T>(key: StorageKey, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  const parsed = safeParseJson<T>(storage.getItem(key));
  return parsed ?? fallback;
}

export function writeKey<T>(key: StorageKey, value: T): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

export type AppState = {
  templates: CommitmentTemplate[];
  months: Record<string, MonthRecord>;
  todoLists: TodoList[];
  todos: TodoItem[];
  habits: Habit[];
  habitChecks: Record<string, string[]>; // YYYY-MM-DD -> habitIds[]
  settings: AppSettings;
  notifs: Record<string, string>; // notifKey -> lastSentISO
};

export function readState(): AppState {
  const templates = readKey<CommitmentTemplate[]>("komitmen.v1.templates", []);
  const months = readKey<Record<string, MonthRecord>>("komitmen.v1.months", {});
  const todoLists = readKey<TodoList[]>("komitmen.v1.todoLists", []);
  const todos = readKey<TodoItem[]>("komitmen.v1.todos", []);
  const habits = readKey<Habit[]>("komitmen.v1.habits", []);
  const habitChecks = readKey<Record<string, string[]>>("komitmen.v1.habitChecks", {});
  const settings = readKey<AppSettings>("komitmen.v1.settings", DEFAULT_SETTINGS);
  const notifs = readKey<Record<string, string>>("komitmen.v1.notifs", {});

  return {
    templates: Array.isArray(templates) ? templates : [],
    months: months && typeof months === "object" ? months : {},
    todoLists: Array.isArray(todoLists) ? todoLists : [],
    todos: Array.isArray(todos) ? todos : [],
    habits: Array.isArray(habits) ? habits : [],
    habitChecks: habitChecks && typeof habitChecks === "object" ? habitChecks : {},
    settings: settings && typeof settings === "object" ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS,
    notifs: notifs && typeof notifs === "object" ? notifs : {},
  };
}

export function writeState(state: AppState): void {
  writeKey("komitmen.v1.templates", state.templates);
  writeKey("komitmen.v1.months", state.months);
  writeKey("komitmen.v1.todoLists", state.todoLists);
  writeKey("komitmen.v1.todos", state.todos);
  writeKey("komitmen.v1.habits", state.habits);
  writeKey("komitmen.v1.habitChecks", state.habitChecks);
  writeKey("komitmen.v1.settings", state.settings);
  writeKey("komitmen.v1.notifs", state.notifs);
}
