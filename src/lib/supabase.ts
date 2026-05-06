"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// IMPORTANT: Next.js only inlines `process.env.NEXT_PUBLIC_*` when accessed statically.
// Do NOT use `process.env[name]` here (will be undefined in the browser bundle).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
const FIXED_EMAIL = process.env.NEXT_PUBLIC_FIXED_EMAIL ?? null;

export function getMissingSupabaseEnvs(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!FIXED_EMAIL) missing.push("NEXT_PUBLIC_FIXED_EMAIL");
  return missing;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  return client;
}

export function getFixedEmail(): string | null {
  return FIXED_EMAIL;
}
