"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function env(name: string): string | null {
  return process.env[name] ?? null;
}

export function getMissingSupabaseEnvs(): string[] {
  const missing: string[] = [];
  if (!env("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env("NEXT_PUBLIC_SUPABASE_ANON_KEY")) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!env("NEXT_PUBLIC_FIXED_EMAIL")) missing.push("NEXT_PUBLIC_FIXED_EMAIL");
  return missing;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  client = createClient(env("NEXT_PUBLIC_SUPABASE_URL")!, env("NEXT_PUBLIC_SUPABASE_ANON_KEY")!);
  return client;
}

export function getFixedEmail(): string | null {
  return env("NEXT_PUBLIC_FIXED_EMAIL");
}
