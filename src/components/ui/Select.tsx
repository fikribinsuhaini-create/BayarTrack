"use client";

import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none ring-black/10 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10 ${className}`}
      {...props}
    />
  );
}

