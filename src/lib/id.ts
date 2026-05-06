export function newId(prefix = "id"): string {
  // readable, collision-resistant enough for local-only usage
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

