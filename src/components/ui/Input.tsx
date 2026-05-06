"use client";

import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none ring-black/10 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10 ${className}`}
      {...props}
    />
  );
}

