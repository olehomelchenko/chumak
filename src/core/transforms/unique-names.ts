/**
 * Shared helpers for column-name collision handling across transforms.
 *
 * Transforms that generate new column names (split, spread, unroll, pivot,
 * describe) can silently overwrite existing columns when they pass a spec
 * to Arquero's `derive` / `pivot` / `spread`. `assertNoCollisions` is the
 * pre-check each such transform calls before mutating the table.
 */

export function assertNoCollisions(
  generated: Iterable<string>,
  existing: Iterable<string>,
  transformName: string
): void {
  const existingSet = new Set(existing);
  const clashes: string[] = [];
  for (const name of generated) {
    if (existingSet.has(name)) clashes.push(name);
  }
  if (clashes.length === 0) return;

  const plural = clashes.length > 1;
  const list = clashes.map((c) => `"${c}"`).join(', ');
  throw new Error(
    `${transformName} would overwrite existing column${plural ? 's' : ''}: ${list}. ` +
      `Rename or remove ${plural ? 'them' : 'it'} before running this transform.`
  );
}

/**
 * Return a column name that doesn't collide with `existing`. Falls back to
 * `${base}_2`, `${base}_3`, … until a free slot is found. Intended for
 * internal scratch columns where a clash with user data is implausible
 * but should still be handled defensively.
 */
export function pickUniqueName(base: string, existing: Iterable<string>): string {
  const set = new Set(existing);
  if (!set.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}_${i}`;
    if (!set.has(candidate)) return candidate;
  }
}
