import * as aq from 'arquero';
import type { FullTransformStep } from '../types';
import { checkIfNeedsJsonParsing } from '../utils';

export function handleFold(table: any, transform: FullTransformStep): any {
  const { columns, as } = transform.fold!;
  return table.fold(columns, as ? { as } : undefined);
}

export function handlePivot(table: any, transform: FullTransformStep): any {
  const { rows, keys, values, aggregation, options } = transform.pivot!;
  const op = (aq as any).op;

  // Row identity columns are explicitly specified (or empty for a single row result)
  const rowIdentityCols = rows || [];

  // Build the value expression based on aggregation
  const aggFunc = aggregation || 'sum';
  let valueSpec: any;
  if (aggFunc === 'count') {
    valueSpec = { [values]: op.count() };
  } else if (op[aggFunc]) {
    valueSpec = { [values]: op[aggFunc](values) };
  } else {
    valueSpec = { [values]: op.any(values) };
  }

  const pivotOptions: any = {};
  if (options?.sort !== undefined) pivotOptions.sort = options.sort;
  if (options?.limit) pivotOptions.limit = options.limit;

  // Group by row identity columns before pivoting
  let workTable = table;
  if (rowIdentityCols.length > 0) {
    workTable = table.groupby(rowIdentityCols);
  }

  let result = workTable.pivot(keys, valueSpec, pivotOptions);

  // Ungroup if we grouped
  if (rowIdentityCols.length > 0) {
    result = result.ungroup();
  }

  return result;
}

export function handleSplit(table: any, transform: FullTransformStep): any {
  const { column, delimiter, mode, keepOriginal, maxColumns, isRegex } = transform.split!;
  let delimiterPattern: string | RegExp = delimiter;
  if (isRegex) delimiterPattern = new RegExp(delimiter);

  const arrayCol = `__split_temp_${column}`;
  let resultTable = table.derive({
    [arrayCol]: (aq as any).escape((d: any) => {
      const value = d[column];
      if (value == null) return [];
      return String(value).split(delimiterPattern);
    }),
  });

  const normalizedMode = mode === 'left' ? 'firstN' : mode === 'right' ? 'lastN' : mode;
  const effectiveMaxColumns = mode === 'left' || mode === 'right' ? 1 : maxColumns;

  const arrays = resultTable.array(arrayCol);
  let maxSegments = arrays.reduce(
    (max: number, arr: any[]) => Math.max(max, arr ? arr.length : 0),
    0
  );

  if ((normalizedMode === 'firstN' || normalizedMode === 'lastN') && effectiveMaxColumns) {
    maxSegments = Math.min(maxSegments, effectiveMaxColumns);
  }

  const newColumns: any = {};
  for (let i = 0; i < maxSegments; i++) {
    const colName = `${column}_${i + 1}`;
    newColumns[colName] = (aq as any).escape((d: any) => {
      const arr = d[arrayCol];
      if (!arr) return undefined;
      if (normalizedMode === 'lastN') {
        const index = arr.length - maxSegments + i;
        return index >= 0 ? arr[index] : undefined;
      }
      return arr[i];
    });
  }

  resultTable = resultTable.derive(newColumns).select((aq as any).not(arrayCol));
  if (!keepOriginal) resultTable = resultTable.select((aq as any).not(column));

  return resultTable;
}

export function handleSpread(table: any, transform: FullTransformStep): any {
  const { column, limit, keepOriginal } = transform.spread!;
  const options = limit !== undefined ? { limit } : {};

  // Check if column contains JSON strings and parse if needed
  const needsParsing = checkIfNeedsJsonParsing(table, column);
  if (needsParsing) {
    const tempCol = `__temp_spread_${column}`;
    table = table.derive({
      [tempCol]: (aq as any).escape((d: any) => {
        const val = d[column];
        if (typeof val === 'string' && val.trim().startsWith('[')) {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      }),
    });
    let result = table.spread(tempCol, options);
    // Rename spread columns from temp name to original
    const columnNames = result.columnNames();
    const spreadCols = columnNames.filter((c: string) => c.startsWith(`${tempCol}_`));
    if (spreadCols.length > 0) {
      const renameMap: Record<string, string> = {};
      spreadCols.forEach((c: string) => {
        const suffix = c.substring(tempCol.length);
        renameMap[c] = `${column}${suffix}`;
      });
      result = result.rename(renameMap);
    }
    // Remove the original column if keepOriginal is false
    if (!keepOriginal && result.columnNames().includes(column)) {
      result = result.select((aq as any).not(column));
    }
    return result;
  }

  // Native array handling
  // If keepOriginal is true, preserve the column before spread
  if (keepOriginal) {
    const preservedCol = `__preserve_${column}`;
    table = table.derive({
      [preservedCol]: (aq as any).escape((d: any) => d[column]),
    });
    const result = table.spread(column, options);
    const renameMap: Record<string, string> = {};
    renameMap[preservedCol] = column;
    return result.rename(renameMap);
  }

  // Default: spread without keeping original (arquero removes it automatically)
  return table.spread(column, options);
}

export function handleUnroll(table: any, transform: FullTransformStep): any {
  const { column, indices, keepOriginal } = transform.unroll!;
  const indexColName = indices ? `${column}__unroll_index` : undefined;
  const options = indexColName ? { index: indexColName } : {};

  // Check if column contains JSON strings and parse if needed
  const needsParsing = checkIfNeedsJsonParsing(table, column);
  if (needsParsing) {
    const tempCol = `__temp_unroll_${column}`;
    table = table.derive({
      [tempCol]: (aq as any).escape((d: any) => {
        const val = d[column];
        if (typeof val === 'string' && val.trim().startsWith('[')) {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      }),
    });
    // Unroll the temp column
    let result = table.unroll(tempCol, options);
    // Remove the original column if keepOriginal is false
    if (!keepOriginal && result.columnNames().includes(column)) {
      result = result.select((aq as any).not(column));
    }
    // Rename the temp column to the original column name
    const renameMap: Record<string, string> = {};
    renameMap[tempCol] = column;
    return result.rename(renameMap);
  }

  // Native array handling
  // If keepOriginal is true, preserve the column before unroll
  if (keepOriginal) {
    const preservedCol = `__preserve_${column}`;
    table = table.derive({
      [preservedCol]: (aq as any).escape((d: any) => d[column]),
    });
    const result = table.unroll(column, options);
    const renameMap: Record<string, string> = {};
    renameMap[preservedCol] = column;
    return result.rename(renameMap);
  }

  // Default: unroll without keeping original (arquero removes it automatically)
  return table.unroll(column, options);
}

export const reshapeHandlers = {
  fold: handleFold,
  pivot: handlePivot,
  split: handleSplit,
  spread: handleSpread,
  unroll: handleUnroll,
};
