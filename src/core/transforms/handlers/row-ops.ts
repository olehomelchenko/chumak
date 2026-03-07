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

export function handleRemoveRows(table: any, transform: FullTransformStep): any {
  const indexSet = new Set(transform.removeRows!.indices);
  const rows = table.objects();
  return (aq as any).from(rows.filter((_: any, i: number) => !indexSet.has(i)));
}

export function handleKeepRows(table: any, transform: FullTransformStep): any {
  const indexSet = new Set(transform.keepRows!.indices);
  const rows = table.objects();
  return (aq as any).from(rows.filter((_: any, i: number) => indexSet.has(i)));
}

export function handlePromoteHeader(table: any, transform: FullTransformStep): any {
  const { skipRows } = transform.promoteHeader!;
  const rows = table.objects();
  const oldColumns = table.columnNames();

  if (rows.length <= skipRows) {
    throw new Error('Not enough rows to promote header');
  }

  const headerRow = rows[skipRows];

  // Build new column names from header row values
  const seen: Record<string, number> = {};
  const newNames: string[] = oldColumns.map((oldCol: string, i: number) => {
    let newName = headerRow[oldCol];
    if (newName == null || String(newName).trim() === '') {
      newName = `Column ${i + 1}`;
    } else {
      newName = String(newName).trim();
    }
    // Deduplicate
    if (seen[newName] !== undefined) {
      seen[newName]++;
      newName = `${newName}_${seen[newName]}`;
    } else {
      seen[newName] = 1;
    }
    return newName;
  });

  // Rebuild remaining rows with new column names
  const dataRows = rows.slice(skipRows + 1);
  const newRows = dataRows.map((row: any) => {
    const obj: any = {};
    oldColumns.forEach((oldCol: string, i: number) => {
      obj[newNames[i]] = row[oldCol];
    });
    return obj;
  });

  return (aq as any).from(newRows);
}

export const rowOpsHandlers = {
  sliceRows: handleSliceRows,
  addIndex: handleAddIndex,
  dedupe: handleDedupe,
  sample: handleSample,
  removeRows: handleRemoveRows,
  keepRows: handleKeepRows,
  promoteHeader: handlePromoteHeader,
};
