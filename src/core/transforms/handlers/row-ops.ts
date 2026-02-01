import * as aq from 'arquero';
import type { FullTransformStep } from '../types';

export function handleSliceRows(table: any, transform: FullTransformStep): any {
  const { count, mode } = transform.sliceRows!;
  const numRows = table.numRows();

  if (mode === 'first') {
    return table.slice(0, Math.min(count, numRows));
  } else if (mode === 'last') {
    return table.slice(Math.max(0, numRows - count), numRows);
  } else if (mode === 'removeFirst') {
    return table.slice(Math.min(count, numRows), numRows);
  } else if (mode === 'removeLast') {
    return table.slice(0, Math.max(0, numRows - count));
  }
  return table;
}

export function handleAddIndex(table: any, transform: FullTransformStep): any {
  const { columnName, startFrom } = transform.addIndex!;
  const start = startFrom ?? 1;
  const rows = table.objects();
  const indexedRows = rows.map((row: any, i: number) => ({
    ...row,
    [columnName]: i + start,
  }));
  return (aq as any).from(indexedRows);
}

export function handleDedupe(table: any, transform: FullTransformStep): any {
  const { columns, mode } = transform.dedupe!;
  const dedupeMode = mode || 'remove';

  if (dedupeMode === 'remove') {
    // Remove duplicates (keep first occurrence)
    if (!columns || columns.length === 0) {
      return table.dedupe();
    }
    return table.dedupe(...columns);
  } else {
    // Keep only duplicates
    const rows = table.objects();
    const keys = columns && columns.length > 0 ? columns : Object.keys(rows[0] || {});
    const seen = new Map<string, number[]>();

    // First pass: group row indices by composite key
    rows.forEach((row: any, i: number) => {
      const key = keys
        .map((c: string) => {
          const v = row[c];
          return v == null ? '\0null\0' : String(v);
        })
        .join('\0');
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(i);
    });

    // Second pass: keep only rows that are part of a duplicate group
    const duplicateIndices = new Set<number>();
    for (const indices of seen.values()) {
      if (indices.length > 1) {
        indices.forEach((i) => duplicateIndices.add(i));
      }
    }

    const duplicateRows = rows.filter((_: any, i: number) => duplicateIndices.has(i));
    return (aq as any).from(duplicateRows);
  }
}

export function handleSample(table: any, transform: FullTransformStep): any {
  const { count, seed } = transform.sample!;
  const numRows = table.numRows();
  const sampleSize = Math.min(count, numRows);

  if (seed !== undefined) {
    // Seeded sampling: use a seeded random approach
    // Create an array of indices, shuffle with seeded random, take first N
    const rows = table.objects();
    const indices = Array.from({ length: numRows }, (_, i) => i);

    // Simple seeded shuffle (Fisher-Yates with seeded random)
    const seededRandom = (s: number) => {
      return () => {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
    };
    const rng = seededRandom(seed);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const sampledRows = indices.slice(0, sampleSize).map((i) => rows[i]);
    return (aq as any).from(sampledRows);
  }

  return table.sample(sampleSize);
}

export const rowOpsHandlers = {
  sliceRows: handleSliceRows,
  addIndex: handleAddIndex,
  dedupe: handleDedupe,
  sample: handleSample,
};
