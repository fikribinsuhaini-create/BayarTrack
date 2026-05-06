"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/state";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { requestNotificationPermission } from "@/lib/notifications";

export default function SettingsPage() {
  const { state, api } = useAppState();
  const [msg, setMsg] = useState<string>("");

  const [perm, setPerm] = useState<string>("unknown");

  useEffect(() => {
    if (!("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate-safe: server renders "unknown", client updates after mount
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
  }, []);

  const setSettings = (patch: Partial<typeof state.settings>) => {
    api.setSettings({ ...DEFAULT_SETTINGS, ...state.settings, ...patch });
  };

  const enableNotifications = async () => {
    setMsg("");
    const res = await requestNotificationPermission();
    if (res !== "granted") {
      setSettings({ notificationsEnabled: false });
      setMsg("Permission not granted. Sila allow notification di browser.");
      return;
    }
    setSettings({ notificationsEnabled: true });
    setMsg("Notification diaktifkan.");
  };

  return (
    <div className="space-y-4">
      <header>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Konfigurasi</div>
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Notifications</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Status permission: {perm}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSettings({ notificationsEnabled: false })}>
              Off
            </Button>
            <Button size="sm" onClick={enableNotifications}>
              On
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">Remind komitmen (hari sebelum due)</div>
            <Input
              inputMode="numeric"
              value={String(state.settings.notifyCommitmentsDaysBefore)}
              onChange={(e) => setSettings({ notifyCommitmentsDaysBefore: Math.max(0, Math.round(Number(e.target.value || 0))) })}
            />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Remind to-do (hari sebelum due)</div>
            <Input
              inputMode="numeric"
              value={String(state.settings.notifyTodosDaysBefore)}
              onChange={(e) => setSettings({ notifyTodosDaysBefore: Math.max(0, Math.round(Number(e.target.value || 0))) })}
            />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Quiet hours start (0-23)</div>
            <Input
              inputMode="numeric"
              value={String(state.settings.quietHoursStart)}
              onChange={(e) => setSettings({ quietHoursStart: Math.min(23, Math.max(0, Math.round(Number(e.target.value || 0)))) })}
            />
          </div>
          <div>
            <div className="text-xs text-zinc-500">Quiet hours end (0-23)</div>
            <Input
              inputMode="numeric"
              value={String(state.settings.quietHoursEnd)}
              onChange={(e) => setSettings({ quietHoursEnd: Math.min(23, Math.max(0, Math.round(Number(e.target.value || 0)))) })}
            />
          </div>
        </div>

        {msg ? <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{msg}</div> : null}
      </Card>

      <Card>
        <div className="text-sm font-medium">Data</div>
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Data sekarang disimpan dalam <span className="font-medium">LocalStorage</span>. Bila dah ready, kita boleh migrate ke Supabase/Firebase.
        </div>
      </Card>
    </div>
  );
}
