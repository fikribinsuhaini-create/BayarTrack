"use client";

import { useEffect, useMemo, useState } from "react";
import type { TodoItem, TodoList, TodoPriority } from "@/lib/types";
import { newId } from "@/lib/id";
import { toISODate } from "@/lib/date";
import { useAppState } from "@/lib/state";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_LIST_ID } from "@/lib/migrations";

const PRIORITIES: TodoPriority[] = ["Low", "Medium", "High"];

function sortTodos(a: TodoItem, b: TodoItem) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pa = PRIORITIES.indexOf(a.priority);
  const pb = PRIORITIES.indexOf(b.priority);
  if (pa !== pb) return pb - pa; // High first
  const da = a.dueDate ?? "9999-12-31";
  const db = b.dueDate ?? "9999-12-31";
  if (da !== db) return da.localeCompare(db);
  return b.createdAt.localeCompare(a.createdAt);
}

function sortLists(a: TodoList, b: TodoList) {
  if (a.archived !== b.archived) return a.archived ? 1 : -1;
  return a.name.localeCompare(b.name);
}

export default function TodoPage() {
  const { state, api } = useAppState();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("Medium");
  const [dueDate, setDueDate] = useState<string>(() => toISODate(new Date()));
  const lists = useMemo(() => [...state.todoLists].sort(sortLists), [state.todoLists]);
  const [activeListId, setActiveListId] = useState<string>(() => lists[0]?.id ?? DEFAULT_LIST_ID);
  const [newListName, setNewListName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const todos = useMemo(() => [...state.todos].sort(sortTodos), [state.todos]);
  const todosByList = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const t of todos) {
      const arr = map.get(t.listId) ?? [];
      arr.push(t);
      map.set(t.listId, arr);
    }
    return map;
  }, [todos]);

  useEffect(() => {
    if (lists.length === 0) return;
    const exists = lists.some((l) => l.id === activeListId);
    if (!exists) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- selection must follow list data after hydration/migration
      setActiveListId(lists[0].id);
    }
  }, [activeListId, lists]);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    const nowIso = new Date().toISOString();
    const item: TodoItem = {
      id: newId("t"),
      listId: activeListId || (lists[0]?.id ?? DEFAULT_LIST_ID),
      title: t,
      done: false,
      priority,
      dueDate: dueDate || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    api.setTodos([...state.todos, item].sort(sortTodos));
    setTitle("");
  };

  const addList = () => {
    const name = newListName.trim();
    if (!name) return;
    const nowIso = new Date().toISOString();
    const list: TodoList = {
      id: newId("list"),
      name,
      archived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    api.setTodoLists([...state.todoLists, list].sort(sortLists));
    setActiveListId(list.id);
    setNewListName("");
  };

  const startRename = () => {
    const list = lists.find((l) => l.id === activeListId);
    if (!list) return;
    setRenameValue(list.name);
    setRenaming(true);
  };

  const saveRename = () => {
    const name = renameValue.trim();
    if (!name) return;
    const nowIso = new Date().toISOString();
    api.setTodoLists(
      state.todoLists
        .map((l) => (l.id === activeListId ? { ...l, name, updatedAt: nowIso } : l))
        .sort(sortLists)
    );
    setRenaming(false);
  };

  const deleteActiveList = () => {
    if (activeListId === DEFAULT_LIST_ID) {
      window.alert("List Umum tak boleh delete.");
      return;
    }
    if (lists.length <= 1) {
      window.alert("Kena ada sekurang-kurangnya 1 list.");
      return;
    }
    const list = lists.find((l) => l.id === activeListId);
    if (!list) return;
    const ok = window.confirm(`Delete list "${list.name}"? Task dalam list akan dipindahkan ke Umum.`);
    if (!ok) return;

    const nowIso = new Date().toISOString();
    const nextLists = state.todoLists.filter((l) => l.id !== activeListId);
    const nextTodos = state.todos.map((t) => (t.listId === activeListId ? { ...t, listId: DEFAULT_LIST_ID, updatedAt: nowIso } : t));
    api.patch({ todoLists: nextLists.sort(sortLists), todos: nextTodos.sort(sortTodos) });
    setActiveListId(DEFAULT_LIST_ID);
    setRenaming(false);
  };

  const toggleArchive = () => {
    if (activeListId === DEFAULT_LIST_ID) return;
    const nowIso = new Date().toISOString();
    api.setTodoLists(
      state.todoLists
        .map((l) => (l.id === activeListId ? { ...l, archived: !l.archived, updatedAt: nowIso } : l))
        .sort(sortLists)
    );
  };

  const toggleListDone = (listId: string, done: boolean) => {
    const nowIso = new Date().toISOString();
    api.setTodos(
      state.todos
        .map((t) => {
          if (t.listId !== listId) return t;
          return { ...t, done, updatedAt: nowIso, doneAt: done ? nowIso : undefined };
        })
        .sort(sortTodos)
    );
  };

  const toggleDone = (id: string, done: boolean) => {
    const nowIso = new Date().toISOString();
    api.setTodos(
      state.todos
        .map((t) =>
          t.id === id
            ? { ...t, done, updatedAt: nowIso, doneAt: done ? nowIso : undefined }
            : t
        )
        .sort(sortTodos)
    );
  };

  const update = (id: string, patch: Partial<TodoItem>) => {
    const nowIso = new Date().toISOString();
    api.setTodos(
      state.todos
        .map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso } : t))
        .sort(sortTodos)
    );
  };

  const remove = (id: string) => {
    api.setTodos(state.todos.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Senarai Task</div>
        <h1 className="text-xl font-semibold">To-do</h1>
      </header>

      <Card>
        <div className="text-sm font-medium">Urus List</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <div className="text-xs text-zinc-500">List aktif (untuk tambah task)</div>
            <Select value={activeListId} onChange={(e) => setActiveListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.archived ? `${l.name} (Archived)` : l.name}
                </option>
              ))}
            </Select>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={startRename}>
                Rename
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleArchive} disabled={activeListId === DEFAULT_LIST_ID}>
                Archive
              </Button>
              <Button variant="danger" size="sm" onClick={deleteActiveList} disabled={activeListId === DEFAULT_LIST_ID}>
                Delete
              </Button>
            </div>
          </div>
          {renaming ? (
            <>
              <div className="sm:col-span-2">
                <div className="text-xs text-zinc-500">Nama baru</div>
                <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nama list" />
              </div>
              <div className="flex items-end gap-2">
                <Button className="w-full" onClick={saveRename}>
                  Simpan
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setRenaming(false)}>
                  Batal
                </Button>
              </div>
            </>
          ) : null}
          <div className="sm:col-span-2">
            <div className="text-xs text-zinc-500">Nama list baru</div>
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Contoh: Rumah, Kerja, Shopping"
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" className="w-full" onClick={addList}>
              Tambah List
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium">Tambah Task</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <div className="text-xs text-zinc-500">Task</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Bayar bil internet" />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Priority</div>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Due date</div>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={add}>
              Tambah
            </Button>
          </div>
        </div>
      </Card>

      {lists.map((list) => {
        const listTodos = todosByList.get(list.id) ?? [];
        const doneCount = listTodos.filter((t) => t.done).length;
        const allDone = listTodos.length > 0 && doneCount === listTodos.length;
        return (
          <Card key={list.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-medium">{list.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {doneCount}/{listTodos.length} siap
                  </div>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={allDone}
                  onChange={(e) => toggleListDone(list.id, e.target.checked)}
                />
                Selesai semua
              </label>
            </div>

            <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
              {listTodos.length === 0 ? (
                <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">Belum ada task dalam list ini.</div>
              ) : (
                listTodos.map((t) => (
                  <div key={t.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-emerald-600"
                        checked={t.done}
                        onChange={(e) => toggleDone(t.id, e.target.checked)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className={`truncate font-medium ${t.done ? "line-through opacity-70" : ""}`}>{t.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge tone={t.priority === "High" ? "amber" : "neutral"}>{t.priority}</Badge>
                              {t.dueDate ? (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Due {t.dueDate}</span>
                              ) : (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">No due date</span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingId((cur) => (cur === t.id ? null : t.id))}
                            >
                              {editingId === t.id ? "Tutup" : "Edit"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => remove(t.id)} title="Padam">
                              Padam
                            </Button>
                          </div>
                        </div>

                        {editingId === t.id ? (
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                              <div className="text-xs text-zinc-500">Title</div>
                              <Input value={t.title} onChange={(e) => update(t.id, { title: e.target.value })} className="h-9" />
                            </div>
                            <div>
                              <div className="text-xs text-zinc-500">Priority</div>
                              <Select
                                value={t.priority}
                                onChange={(e) => update(t.id, { priority: e.target.value as TodoPriority })}
                                className="h-9"
                              >
                                {PRIORITIES.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="sm:col-span-2">
                              <div className="text-xs text-zinc-500">Due date</div>
                              <Input
                                type="date"
                                value={t.dueDate ?? ""}
                                onChange={(e) => update(t.id, { dueDate: e.target.value || undefined })}
                                className="h-9"
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
