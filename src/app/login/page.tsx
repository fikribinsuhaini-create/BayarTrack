"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, getFixedEmail, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const fixedEmail = useMemo(() => {
    return getFixedEmail() ?? "";
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  const signIn = async () => {
    setError("");
    if (!isSupabaseConfigured()) return setError("Supabase env belum set. Isi `.env.local` ikut `.env.example`.");
    if (!fixedEmail) return setError("Env `NEXT_PUBLIC_FIXED_EMAIL` belum set. Rujuk `.env.example`.");
    if (!passcode.trim()) return setError("Passcode diperlukan.");
    const supabase = getSupabase();
    if (!supabase) return setError("Supabase client not configured.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: fixedEmail,
        password: passcode,
      });
      if (error) throw error;
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Supabase</div>
        <h1 className="text-xl font-semibold">Masuk</h1>
      </header>

      <Card>
        <div className="text-sm font-medium">Passcode</div>
        <div className="mt-3 space-y-3">
          <Input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Masukkan passcode"
          />
          <Button onClick={signIn} disabled={busy}>
            {busy ? "Masuk..." : "Masuk"}
          </Button>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Email fixed diset dalam env. App hanya minta passcode.
          </div>
        </div>
      </Card>
    </div>
  );
}
