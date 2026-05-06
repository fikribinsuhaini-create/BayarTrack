export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" aria-label="progress">
      <div className="h-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

