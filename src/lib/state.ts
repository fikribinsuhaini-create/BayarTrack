"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { AppSettings, CommitmentTemplate, MonthRecord, TodoItem } from "@/lib/types";
import { readState, writeState, type AppState } from "@/lib/storage";

type Listener = () => void;
const listeners = new Set<Listener>();

const SERVER_SNAPSHOT: AppState = {
  templates: [],
  months: {},
  todos: [],
  settings: {
    notificationsEnabled: false,
    notifyCommitmentsDaysBefore: 3,
    notifyTodosDaysBefore: 1,
    quietHoursStart: 8,
    quietHoursEnd: 22,
  },
  notifs: {},
};

const SIGNATURE_KEYS = [
  "komitmen.v1.templates",
  "komitmen.v1.months",
  "komitmen.v1.todos",
  "komitmen.v1.settings",
  "komitmen.v1.notifs",
] as const;

let cachedSignature: string | null = null;
let cachedSnapshot: AppState = SERVER_SNAPSHOT;

function emit() {
  for (const l of listeners) l();
}

export function broadcastStoreChange() {
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (typeof window === "undefined" || !window.localStorage) return SERVER_SNAPSHOT;

  // React expects referentially stable snapshots when store not changed.
  // Build lightweight signature from raw LocalStorage values.
  let sig = "";
  for (const k of SIGNATURE_KEYS) sig += `${k}=${window.localStorage.getItem(k) ?? ""}\n`;

  if (sig === cachedSignature) return cachedSnapshot;
  cachedSignature = sig;
  cachedSnapshot = readState();
  return cachedSnapshot;
}

function getServerSnapshot(): AppState {
  // Must be referentially stable to avoid infinite loop warnings
  return SERVER_SNAPSHOT;
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (!e.key.startsWith("komitmen.v1.")) return;
      emit();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    const next = updater(readState());
    writeState(next);
    emit();
  }, []);

  const api = useMemo(() => {
    return {
      setTemplates: (templates: CommitmentTemplate[]) =>
        setState((s) => ({ ...s, templates })),
      setMonths: (months: Record<string, MonthRecord>) => setState((s) => ({ ...s, months })),
      setTodos: (todos: TodoItem[]) => setState((s) => ({ ...s, todos })),
      setSettings: (settings: AppSettings) => setState((s) => ({ ...s, settings })),
      setNotifs: (notifs: Record<string, string>) => setState((s) => ({ ...s, notifs })),
      patch: (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch })),
    };
  }, [setState]);

  return { state, api };
}
