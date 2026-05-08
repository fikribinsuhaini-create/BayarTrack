"use client";

import type { AppState } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

export type RemoteRow = {
  user_id: string;
  data: AppState;
  updated_at: string;
};

export type PullRemoteStateResult =
  | { kind: "found"; state: AppState }
  | { kind: "missing" }
  | { kind: "error"; error: unknown };

function isMissingRowError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: unknown; status?: unknown };
  // PostgREST "Results contain 0 rows" when using `.single()`.
  return anyErr.code === "PGRST116" || anyErr.status === 406;
}

export async function pullRemoteState(): Promise<PullRemoteStateResult> {
  const supabase = getSupabase();
  if (!supabase) return { kind: "error", error: new Error("Supabase not configured") };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { kind: "error", error: new Error("No user session") };

  const { data, error } = await supabase.from("app_state").select("data").eq("user_id", userId).single();
  if (error) {
    if (isMissingRowError(error)) return { kind: "missing" };
    return { kind: "error", error };
  }

  const state = (data as { data: AppState | null }).data ?? null;
  if (!state) return { kind: "missing" };
  return { kind: "found", state };
}

export async function pushRemoteState(state: AppState): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("app_state")
    .upsert({ user_id: userId, data: state }, { onConflict: "user_id" });
  if (error) throw error;
}
