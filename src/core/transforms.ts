import * as aq from 'arquero';
import { parseExpression } from './expression-parser';
import { validateAST } from './ast-validator';
import { interpretAST } from './ast-interpreter';

/**
 * Chumak Transform Engine
 */

export interface MatchOptions {
  pattern: string;
  matchType: 'prefix' | 'suffix' | 'exact';
  mode: 'include' | 'exclude';
}

/**
 * Match columns based on pattern (prefix/suffix/exact)
 */
export function matchColumnPattern(columns: string[], options: MatchOptions): string[] {
  const { pattern, matchType, mode } = options;

  if (!pattern || pattern.trim() === '') {
    return mode === 'include' ? [...columns] : [];
  }

  let matched: string[] = [];

  if (matchType === 'prefix') {
    matched = columns.filter((col) => col.startsWith(pattern));
  } else if (matchType === 'suffix') {
    matched = columns.filter((col) => col.endsWith(pattern));
  } else if (matchType === 'exact') {
    matched = columns.filter((col) => col === pattern);
  }

  if (mode === 'include') {
    return matched;
  } else {
    return columns.filter((col) => !matched.includes(col));
  }
}

/**
 * Apply a single transform to an Arquero table
 */
export function applyTransform(
  table: any,
  transform: any,
  schema: string[],
  context: any = null
): any {
  // Since we're in the process of migrating, we'll keep the logic mostly the same
  // but use the imported engines.

  if (transform.select) {
    return table.select(...transform.select);
  }

  if (transform.filter) {
    const expression = transform.filter;
    const ast = parseExpression(expression);
    const validation = validateAST(ast, schema);
    if (!validation.valid) {
      throw new Error(`Filter validation failed: ${validation.error?.message}`);
    }

    const rows = table.objects();
    const filteredRows = rows.filter((row: any) => {
      try {
        return interpretAST(ast, row);
      } catch (error) {
        return false;
      }
    });

    if (filteredRows.length === 0 && rows.length > 0) {
      const emptyRow: any = {};
      table.columnNames().forEach((col: string) => (emptyRow[col] = undefined));
      return (aq as any).from([emptyRow]).filter(() => false);
    } else {
      return (aq as any).from(filteredRows);
    }
  }

  if (transform.join) {
    const { right, on, how, suffixes } = transform.join;
    let rightTable = null;

    const rightModel = context?.models.find((m: any) => m.id === right || m.name === right);
    if (rightModel) {
      rightTable = (aq as any).from(rightModel.data);
    } else {
      const rightSource = context?.sources.find((s: any) => s.id === right || s.name === right);
      if (rightSource) {
        rightTable = (aq as any).from(rightSource.data);
      }
    }

    if (!rightTable) {
      throw new Error(`Join target '${right}' not found`);
    }

    const leftKeys = on.map((pair: any) => pair[0]);
    const rightKeys = on.map((pair: any) => pair[1]);
    const joinSuffixes = suffixes || ['_x', '_y'];

    const joinOptions = { suffix: joinSuffixes };
    const keys = leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys];

    if (how === 'inner' || !how) return table.join(rightTable, keys, null, joinOptions);
    if (how === 'left') return table.join_left(rightTable, keys, null, joinOptions);
    if (how === 'right') return table.join_right(rightTable, keys, null, joinOptions);
    if (how === 'full') return table.join_full(rightTable, keys, null, joinOptions);
    if (how === 'cross') return table.cross(rightTable, null, joinOptions);

    throw new Error(`Unknown join type: ${how}`);
  }

  if (transform.derive) {
    const derivations = transform.derive;
    let resultRows = table.objects();

    for (const [newCol, expression] of Object.entries(derivations)) {
      const ast = parseExpression(expression as string);
      const validation = validateAST(ast, schema);
      if (!validation.valid) {
        throw new Error(`Derive validation failed for '${newCol}': ${validation.error?.message}`);
      }

      resultRows = resultRows.map((row: any) => {
        try {
          const val = interpretAST(ast, row);
          return { ...row, [newCol]: val };
        } catch (error: any) {
          return { ...row, [newCol]: { type: 'error', message: error.message } };
        }
      });
    }

    return (aq as any).from(resultRows);
  }

  if (transform.sort) {
    const { field, order } = transform.sort;
    return order === 'desc' ? table.orderby((aq as any).desc(field)) : table.orderby(field);
  }

  if (transform.rename) {
    return table.rename(transform.rename);
  }

  if (transform.remove) {
    return table.select((aq as any).not(...transform.remove));
  }

  if (transform.aggregate) {
    const { groupby, rollup } = transform.aggregate;
    const op = (aq as any).op;

    let groupedTable = table;
    if (groupby && groupby.length > 0) {
      groupedTable = table.groupby(groupby);
    }

    const rollupSpecs: any = {};
    const floatCols: string[] = [];

    for (const [outCol, exprString] of Object.entries(rollup)) {
      const match = (exprString as string).match(/^op\.(\w+)\((?:'([^']+)'|"?([^"]+)"?)?\)$/);
      if (!match) throw new Error(`Invalid aggregation: ${exprString}`);

      const funcName = match[1];
      const colName = match[2] || match[3];

      if (!op[funcName]) throw new Error(`Unknown op: ${funcName}`);

      rollupSpecs[outCol] = colName ? op[funcName](colName) : op[funcName]();
      if (['mean', 'average', 'avg', 'sum', 'stdev', 'variance', 'median'].includes(funcName)) {
        floatCols.push(outCol);
      }
    }

    let result = groupedTable.rollup(rollupSpecs).ungroup();

    if (floatCols.length > 0) {
      const cleanups: any = {};
      floatCols.forEach((col) => {
        cleanups[col] = (aq as any).escape((d: any) => {
          const val = d[col];
          return typeof val === 'number' ? Math.round(val * 1e9) / 1e9 : val;
        });
      });
      result = result.derive(cleanups);
    }

    return result;
  }

  if (transform.split) {
    const { column, delimiter, mode, keepOriginal, maxColumns, isRegex } = transform.split;
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

  if (transform.types) return table;

  if (transform.fold) {
    const { columns, as } = transform.fold;
    return table.fold(columns, as ? { as } : undefined);
  }

  if (transform.pivot) {
    const { rows, keys, values, aggregation, options } = transform.pivot;
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

  if (transform.replace) {
    const { column, find, replace } = transform.replace;
    const rows = table.objects();
    const resultRows = rows.map((row: any) => {
      const currentValue = row[column];
      if (currentValue === find || (find === null && currentValue === null)) {
        return { ...row, [column]: replace };
      }
      return row;
    });
    return (aq as any).from(resultRows);
  }

  if (transform.sliceRows) {
    const { count, mode } = transform.sliceRows;
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
  }

  if (transform.addIndex) {
    const { columnName, startFrom } = transform.addIndex;
    const start = startFrom ?? 1;
    const rows = table.objects();
    const indexedRows = rows.map((row: any, i: number) => ({
      ...row,
      [columnName]: i + start,
    }));
    return (aq as any).from(indexedRows);
  }

  if (transform.dedupe) {
    const { columns, mode } = transform.dedupe;
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

  throw new Error(`Transform not implemented: ${Object.keys(transform)[0]}`);
}

/**
 * Generate human-readable description for steps list
 */
export function describeTransform(transform: any, rightName: string | null = null): string {
  if (transform.import) {
    const config = transform.import;
    let desc = `Import: ${config.source}`;

    // Add header mode description
    if (config.headerMode === 'first-row') {
      desc += ' (headers from first row)';
    } else if (config.headerMode === 'auto-generate') {
      desc += ' (auto-generated headers)';
    } else if (config.headerMode === 'manual') {
      desc += ' (custom headers)';
    }

    return desc;
  }

  if (transform.fold) {
    const { columns, as } = transform.fold;
    const count = columns.length;
    let desc = `Unpivot: ${count} column${count !== 1 ? 's' : ''}`;

    if (as && as.length === 2) {
      desc += ` -> ${as[0]}, ${as[1]}`;
    }

    return desc;
  }

  if (transform.pivot) {
    const { keys, values, aggregation } = transform.pivot;
    return `Pivot: ${aggregation}(${values}) by ${keys}`;
  }

  if (transform.types) {
    const count = Object.keys(transform.types).length;
    return `Detect types: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.select) {
    const count = transform.select.length;
    return `Select: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.filter) {
    const expr = transform.filter;
    // Simple truncation for long expressions
    const displayExpr = expr.length > 30 ? expr.substring(0, 27) + '...' : expr;
    return `Filter: ${displayExpr}`;
  }

  if (transform.join) {
    const how = transform.join.how || 'inner';
    const name = rightName || (transform.join.right.startsWith('mdl_') ? 'model' : 'source');
    return `Join (${how}): ${name}`;
  }

  if (transform.derive) {
    const names = Object.keys(transform.derive);
    return `Derive: ${names.join(', ')}`;
  }

  if (transform.sort) {
    return `Sort: ${transform.sort.field}`;
  }

  if (transform.rename) {
    const count = Object.keys(transform.rename).length;
    return `Rename: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.aggregate) {
    const { groupby, rollup } = transform.aggregate;
    const groupCount = groupby && groupby.length > 0 ? groupby.length : 0;
    const aggs = Object.keys(rollup).length;
    const groupLabel =
      groupCount > 0 ? `${groupCount} column${groupCount !== 1 ? 's' : ''}` : 'all rows';
    return `Group by (${groupLabel}), ${aggs} summar${aggs !== 1 ? 'ies' : 'y'}`;
  }

  if (transform.remove) {
    const count = transform.remove.length;
    return `Remove: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.replace) {
    const { column, find } = transform.replace;
    const findDisplay = find === null ? '(null)' : String(find).substring(0, 20);
    return `Replace: ${column} = ${findDisplay}`;
  }

  if (transform.split) {
    return `Split: ${transform.split.column}`;
  }

  if (transform.sliceRows) {
    const { count, mode } = transform.sliceRows;
    const modeLabels: Record<string, string> = {
      first: 'Keep first',
      last: 'Keep last',
      removeFirst: 'Remove first',
      removeLast: 'Remove last',
    };
    return `${modeLabels[mode] || mode} ${count} row${count !== 1 ? 's' : ''}`;
  }

  if (transform.addIndex) {
    return `Add Index: ${transform.addIndex.columnName}`;
  }

  if (transform.dedupe) {
    const cols = transform.dedupe.columns;
    const mode = transform.dedupe.mode || 'remove';
    const colInfo =
      !cols || cols.length === 0
        ? 'all columns'
        : cols.length === 1
          ? `"${cols[0]}"`
          : `${cols.length} columns`;
    if (mode === 'keep') {
      return `Keep only duplicates: by ${colInfo}`;
    }
    return `Remove duplicates: by ${colInfo}`;
  }

  return 'Unknown transform';
}
