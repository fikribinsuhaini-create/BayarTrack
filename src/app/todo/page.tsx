"use client";

import { useMemo, useState } from "react";
import type { TodoItem, TodoPriority } from "@/lib/types";
import { newId } from "@/lib/id";
import { toISODate } from "@/lib/date";
import { useAppState } from "@/lib/state";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

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

export default function TodoPage() {
  const { state, api } = useAppState();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("Medium");
  const [dueDate, setDueDate] = useState<string>(() => toISODate(new Date()));

  const todos = useMemo(() => [...state.todos].sort(sortTodos), [state.todos]);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    const nowIso = new Date().toISOString();
    const item: TodoItem = {
      id: newId("t"),
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
        <div className="text-sm font-medium">Tambah Task</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
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

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Task ({todos.length})</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {todos.filter((t) => t.done).length} siap
          </div>
        </div>
        <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-900">
          {todos.length === 0 ? (
            <div className="py-6 text-sm text-zinc-600 dark:text-zinc-400">Belum ada task.</div>
          ) : (
            todos.map((t) => (
              <div key={t.id} className="flex items-start gap-3 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-emerald-600"
                  checked={t.done}
                  onChange={(e) => toggleDone(t.id, e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`truncate font-medium ${t.done ? "line-through opacity-70" : ""}`}>{t.title}</div>
                    <Badge tone={t.priority === "High" ? "amber" : t.priority === "Medium" ? "neutral" : "neutral"}>
                      {t.priority}
                    </Badge>
                    {t.dueDate ? <span className="text-xs text-zinc-500 dark:text-zinc-400">Due {t.dueDate}</span> : null}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Input
                        value={t.title}
                        onChange={(e) => update(t.id, { title: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="flex gap-2">
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
                      <Button variant="ghost" size="sm" onClick={() => remove(t.id)} title="Padam">
                        Padam
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

