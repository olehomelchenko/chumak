import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform } from './transforms';

// Idempotence: applying a transform twice yields the same result as applying once.
// These are example-based witnesses, not property tests — one representative input
// per transform. A failure here signals state leaking between applications or a
// non-deterministic implementation.

describe('Transform Idempotence', () => {
  const cols = ['sales', 'region', 'status'] as const;

  const table = () =>
    (aq as any).from([
      { sales: 1000, region: 'North', status: 'active' },
      { sales: 1500, region: 'South', status: 'active' },
      { sales: 800, region: 'North', status: 'pending' },
      { sales: 2000, region: 'East', status: 'active' },
      { sales: 500, region: 'West', status: 'inactive' },
    ]);

  function applyTwice(transform: any, columns: readonly string[]) {
    const once = applyTransform(table(), transform, [...columns]);
    const twice = applyTransform(once, transform, once.columnNames());
    return { once, twice };
  }

  it('filter is idempotent', () => {
    const { once, twice } = applyTwice({ filter: 'sales > 1000' }, cols);
    expect(twice.objects()).toEqual(once.objects());
  });

  it('select is idempotent', () => {
    const { once, twice } = applyTwice({ select: ['sales', 'region'] }, cols);
    expect(twice.columnNames()).toEqual(once.columnNames());
    expect(twice.objects()).toEqual(once.objects());
  });

  it('sort is idempotent', () => {
    const { once, twice } = applyTwice({ sort: [{ field: 'sales', order: 'asc' }] }, cols);
    expect(twice.objects()).toEqual(once.objects());
  });

  it('sliceRows is idempotent when the slice fits', () => {
    // Slicing rows 0..2 twice should yield the same 2 rows (second slice is a
    // no-op on an already-sliced table).
    const { once, twice } = applyTwice({ sliceRows: { from: 0, to: 2 } }, cols);
    expect(twice.objects()).toEqual(once.objects());
  });

  it('removeRows is idempotent when the predicate stays constant', () => {
    const { once, twice } = applyTwice({ removeRows: 'sales < 1000' }, cols);
    expect(twice.objects()).toEqual(once.objects());
  });

  it('keepRows is idempotent when the predicate stays constant', () => {
    const { once, twice } = applyTwice({ keepRows: 'status == "active"' }, cols);
    expect(twice.objects()).toEqual(once.objects());
  });

  it('converting to the same type twice is idempotent', () => {
    const raw = (aq as any).from([
      { n: '1', s: 'a' },
      { n: '2', s: 'b' },
    ]);
    const transform = { types: { n: 'integer' as const } };
    const once = applyTransform(raw, transform, ['n', 's']);
    const twice = applyTransform(once, transform, ['n', 's']);
    expect(twice.objects()).toEqual(once.objects());
  });

  it('identity filter (always true) equals input', () => {
    const t = table();
    const result = applyTransform(t, { filter: 'true' }, [...cols]);
    expect(result.objects()).toEqual(t.objects());
  });

  it('identity select (all columns) equals input', () => {
    const t = table();
    const result = applyTransform(t, { select: [...cols] }, [...cols]);
    expect(result.objects()).toEqual(t.objects());
    expect(result.columnNames()).toEqual([...cols]);
  });
});
