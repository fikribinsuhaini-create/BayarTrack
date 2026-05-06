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

  return { state: { ...state, todoLists, todos }, changed };
}
