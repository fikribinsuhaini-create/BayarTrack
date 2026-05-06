"use client";

import type { AppState } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

export type RemoteRow = {
  user_id: string;
  data: AppState;
  updated_at: string;
};

export async function pullRemoteState(): Promise<AppState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase.from("app_state").select("data").eq("user_id", userId).single();
  if (error) {
    // 406 / PGRST116 = no rows; treat as empty state
    return null;
  }
  return (data as { data: AppState }).data ?? null;
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
