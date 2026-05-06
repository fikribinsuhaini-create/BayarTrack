import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{children}</div>;
}

export function CardValue({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-2xl font-semibold tracking-tight">{children}</div>;
}

