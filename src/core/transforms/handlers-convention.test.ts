import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Structural invariants for transform handlers.
 *
 * New transforms are added by dropping a handler file into `handlers/` and
 * wiring it in `handlers/index.ts`. When a handler auto-generates column
 * names from user data (pivot key values, split segments, spread array
 * indices, unroll index), it must call `assertNoCollisions` from
 * `unique-names.ts`; otherwise arquero will silently overwrite an existing
 * column and lose the user's data. This file pins that invariant so a future
 * handler can't sneak past review.
 *
 * To classify a new handler, add it to exactly ONE of the sets below.
 */

const HANDLERS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'handlers');

// Handlers that auto-generate column names from data — they MUST import
// `assertNoCollisions` from '../unique-names' and call it before mutating.
const MUST_GUARD = new Set(['reshape.ts', 'aggregate.ts']);

// Handlers where the user explicitly names outputs or the transform only
// touches existing columns — no collision guard required.
const EXEMPT = new Set([
  'basic.ts',
  'combine.ts',
  'derive.ts',
  'filter.ts',
  'impute.ts',
  'index.ts',
  'join.ts',
  'pattern.ts',
  'row-ops.ts',
  'type-conversion.ts',
  'window.ts',
]);

function listHandlerFiles(): string[] {
  return readdirSync(HANDLERS_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
}

describe('handlers convention', () => {
  it('classifies every handler file as either guarded or exempt', () => {
    const files = listHandlerFiles();
    const unclassified = files.filter((f) => !MUST_GUARD.has(f) && !EXEMPT.has(f));
    expect(
      unclassified,
      `Unclassified handler file(s): ${unclassified.join(', ')}. ` +
        `Add to MUST_GUARD (if it generates column names from data) or EXEMPT (otherwise) ` +
        `in handlers-convention.test.ts.`
    ).toEqual([]);
  });

  it('does not reference handler files that no longer exist', () => {
    const files = new Set(listHandlerFiles());
    const phantom = [...MUST_GUARD, ...EXEMPT].filter((f) => !files.has(f));
    expect(phantom, `Stale entries in handlers-convention.test.ts: ${phantom.join(', ')}`).toEqual(
      []
    );
  });

  it.each([...MUST_GUARD])('%s imports and calls assertNoCollisions', (file) => {
    const source = readFileSync(join(HANDLERS_DIR, file), 'utf8');
    expect(source).toMatch(/from ['"]\.\.\/unique-names['"]/);
    expect(source).toMatch(/\bassertNoCollisions\s*\(/);
  });
});
