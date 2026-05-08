"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState, broadcastStoreChange } from "@/lib/state";
import { getCurrentMonthKey, ensureMonthRecord } from "@/lib/month";
import { canNotify, computeNotifCandidates, sendLocalNotifications } from "@/lib/notifications";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { pullRemoteState, pushRemoteState } from "@/lib/remoteState";
import { readState, writeState } from "@/lib/storage";
import { migrateState } from "@/lib/migrations";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/komitmen", label: "Komitmen" },
  { href: "/sejarah", label: "Sejarah" },
  { href: "/todo", label: "To-do" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, api } = useAppState();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    // Require session for all pages except /login
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session && pathname !== "/login") router.replace("/login");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session && pathname !== "/login") router.replace("/login");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    // First login sync: pull remote -> overwrite local -> emit update
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const res = await pullRemoteState();
        if (cancelled) return;

        if (res.kind === "found") {
          writeState(res.state);
          broadcastStoreChange();
          return;
        }

        if (res.kind === "missing") {
          // seed remote with local ONLY when we are sure remote row doesn't exist
          const local = readState();
          await pushRemoteState(local);
          return;
        }

        // res.kind === "error" -> do nothing (avoid overwriting remote with empty local on transient/RLS errors)
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    // Push any local changes to remote (best-effort)
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      try {
        await pushRemoteState(state);
      } catch {
        // ignore
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [state]);

  useEffect(() => {
    // Local migrations (e.g. add todoLists, listId)
    const { state: next, changed } = migrateState(readState());
    if (changed) {
      writeState(next);
      broadcastStoreChange();
    }
  }, []);

  useEffect(() => {
    const monthKey = getCurrentMonthKey();
    const ensured = ensureMonthRecord(state.months, state.templates, monthKey);
    if (ensured.months !== state.months) api.setMonths(ensured.months);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canNotify(state.settings)) return;
    const monthKey = getCurrentMonthKey();
    const record = state.months[monthKey] ?? null;
    const candidates = computeNotifCandidates({
      now: new Date(),
      settings: state.settings,
      monthRecord: record,
      todos: state.todos,
    });
    if (candidates.length === 0) return;
    const { sentKeys, nextNotifs } = sendLocalNotifications(candidates, state.notifs);
    if (sentKeys.length > 0) api.setNotifs(nextNotifs);
  }, [api, state.months, state.notifs, state.settings, state.todos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Dev safety: prevent SW from caching dev bundles (causes stale runtime errors).
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-2 py-2">
          {navItems.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
