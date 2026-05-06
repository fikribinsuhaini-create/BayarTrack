"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { monthKeyToLabel, shiftMonthKey } from "@/lib/date";

export function MonthSwitcher({
  monthKey,
  onChange,
  ariaLabel,
}: {
  monthKey: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}) {
  const monthInputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el = monthInputRef.current;
    if (!el) return;
    // @ts-expect-error - showPicker not in TS lib yet for all targets
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
    el.focus();
  };

  return (
    <div
      className="w-full rounded-full border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-label={ariaLabel ?? "Pilih bulan"}
    >
      <div className="grid grid-cols-3 items-center">
        <Button
          aria-label="Bulan sebelum"
          variant="ghost"
          size="sm"
          className="h-10 w-10 justify-self-start rounded-full"
          onClick={() => onChange(shiftMonthKey(monthKey, -1))}
        >
          {"<"}
        </Button>

        <button
          type="button"
          onClick={openPicker}
          className="px-3 text-center text-sm font-semibold hover:underline"
          aria-label="Klik untuk pilih bulan & tahun"
        >
          {monthKeyToLabel(monthKey).toUpperCase()}
        </button>

        <Button
          aria-label="Bulan seterusnya"
          variant="ghost"
          size="sm"
          className="h-10 w-10 justify-self-end rounded-full"
          onClick={() => onChange(shiftMonthKey(monthKey, 1))}
        >
          {">"}
        </Button>
      </div>

      <input
        ref={monthInputRef}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        type="month"
        value={monthKey}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

