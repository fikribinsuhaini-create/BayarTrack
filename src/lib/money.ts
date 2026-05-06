export function formatMYRFromCents(cents: number): string {
  const value = (cents || 0) / 100;
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
  }).format(value);
}

export function parseAmountToCents(input: string): number | null {
  const normalized = input.trim().replace(/,/g, "");
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.round(num * 100));
}

