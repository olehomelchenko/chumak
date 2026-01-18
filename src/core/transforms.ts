import * as aq from 'arquero';
import { parseExpression } from './expression-parser';
import { validateAST } from './ast-validator';
import { interpretAST } from './ast-interpreter';
import { TransformStep, ColumnType, SchemaEngine } from './schema-engine';
import { convertType } from './type-converter';
import type { Source, Model } from '../app/types';

/**
 * Chumak Transform Engine
 */

export interface MatchOptions {
  pattern: string;
  matchType: 'prefix' | 'suffix' | 'exact' | 'contains' | 'regex';
  mode: 'include' | 'exclude';
}

export interface TransformContext {
  sources: Source[];
  models: Model[];
}

/**
 * Match columns based on pattern (prefix/suffix/exact/contains/regex)
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
  } else if (matchType === 'contains') {
    matched = columns.filter((col) => col.includes(pattern));
  } else if (matchType === 'regex') {
    try {
      const regex = new RegExp(pattern);
      matched = columns.filter((col) => regex.test(col));
    } catch (e) {
      // Invalid regex - return empty array
      return mode === 'include' ? [] : [...columns];
    }
  }

  if (mode === 'include') {
    return matched;
  } else {
    return columns.filter((col) => !matched.includes(col));
  }
}

// Extended transform step that includes all transform types (superset of schema-engine's TransformStep)
export interface FullTransformStep extends TransformStep {
  sliceRows?: { count: number; mode: 'first' | 'last' | 'removeFirst' | 'removeLast' };
  addIndex?: { columnName: string; startFrom?: number };
  impute?: {
    column: string;
    strategy:
      | 'constant'
      | 'mean'
      | 'median'
      | 'min'
      | 'max'
      | 'forwardFill'
      | 'backwardFill'
      | 'linearInterpolation';
    value?: any;
    includeEmptyString?: boolean;
  };
  selectPattern?: {
    pattern: string;
    matchType: 'prefix' | 'suffix' | 'contains' | 'regex';
    include?: string[];
  };
  removePattern?: {
    pattern: string;
    matchType: 'prefix' | 'suffix' | 'contains' | 'regex';
  };
  conditional?: {
    column: string;
    conditions: Array<{ when: string; then: string }>;
    else: string;
  };
  renamePattern?: {
    find: string;
    replace: string;
    regex?: boolean;
  };
}

/**
 * List of known transform keys (future-proofing: unknown transforms are skipped with warning)
 */
const KNOWN_TRANSFORM_KEYS: readonly string[] = [
  'select',
  'remove',
  'rename',
  'derive',
  'filter',
  'sort',
  'replace',
  'dedupe',
  'join',
  'import',
  'types',
  'aggregate',
  'fold',
  'pivot',
  'split',
  'sliceRows',
  'addIndex',
  'impute',
  'selectPattern',
  'removePattern',
  'conditional',
  'renamePattern',
] as const;

/**
 * Check if a transform step has any unknown transform keys
 * @returns The unknown key if found, null otherwise
 */
function getUnknownTransformKey(transform: any): string | null {
  const keys = Object.keys(transform).filter((k) => k !== '__v'); // Ignore version field
  const unknownKey = keys.find((k) => !KNOWN_TRANSFORM_KEYS.includes(k as any));
  return unknownKey || null;
}

/**
 * Apply a single transform to an Arquero table
 * Note: We use 'any' for the table type because arquero's ColumnTable type is complex
 * and doesn't play well with TypeScript's structural typing in some cases.
 */
export function applyTransform(
  table: any,
  transform: FullTransformStep,
  schema: string[],
  context: TransformContext | null = null
): any {
  // Future-proofing: Check for unknown transform keys
  const unknownKey = getUnknownTransformKey(transform);
  if (unknownKey) {
    console.warn(
      `Unknown transform key "${unknownKey}" encountered. Skipping this transform. ` +
        `This may be from a newer version of Chumak. The workflow will continue with remaining transforms.`
    );
    return table; // Return table unchanged
  }

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

    // Always use ID for join references (future-proofing: names can change)
    const rightModel = context?.models.find((m: any) => m.id === right);
    if (rightModel) {
      rightTable = (aq as any).from(rightModel.data);
    } else {
      const rightSource = context?.sources.find((s: any) => s.id === right);
      if (rightSource) {
        rightTable = (aq as any).from(rightSource.data);
      }
    }

    if (!rightTable) {
      throw new Error(`Join target with ID '${right}' not found`);
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

  if (transform.selectPattern) {
    const { pattern, matchType, include } = transform.selectPattern;
    const columns = table.columnNames();
    const matched = matchColumnPattern(columns, { pattern, matchType, mode: 'include' });
    const finalColumns = include ? [...new Set([...matched, ...include])] : matched;
    return finalColumns.length > 0 ? table.select(...finalColumns) : table;
  }

  if (transform.removePattern) {
    const { pattern, matchType } = transform.removePattern;
    const columns = table.columnNames();
    const matched = matchColumnPattern(columns, { pattern, matchType, mode: 'include' });
    return matched.length > 0 ? table.select((aq as any).not(...matched)) : table;
  }

  if (transform.conditional) {
    const { column, conditions, else: elseValue } = transform.conditional;
    let resultRows = table.objects();

    // Validate all expressions first
    for (const cond of conditions) {
      const whenAST = parseExpression(cond.when);
      const whenValidation = validateAST(whenAST, schema);
      if (!whenValidation.valid) {
        throw new Error(
          `Conditional validation failed for 'when': ${whenValidation.error?.message}`
        );
      }

      const thenAST = parseExpression(cond.then);
      const thenValidation = validateAST(thenAST, schema);
      if (!thenValidation.valid) {
        throw new Error(
          `Conditional validation failed for 'then': ${thenValidation.error?.message}`
        );
      }
    }

    const elseAST = parseExpression(elseValue);
    const elseValidation = validateAST(elseAST, schema);
    if (!elseValidation.valid) {
      throw new Error(`Conditional validation failed for 'else': ${elseValidation.error?.message}`);
    }

    // Evaluate conditions sequentially
    resultRows = resultRows.map((row: any) => {
      let result: any = null;
      let matched = false;

      for (const cond of conditions) {
        if (!matched) {
          try {
            const whenAST = parseExpression(cond.when);
            const whenValue = interpretAST(whenAST, row);
            if (whenValue === true) {
              const thenAST = parseExpression(cond.then);
              result = interpretAST(thenAST, row);
              matched = true;
            }
          } catch (error: any) {
            // Skip this condition on error
          }
        }
      }

      if (!matched) {
        try {
          result = interpretAST(elseAST, row);
        } catch (error: any) {
          result = { type: 'error', message: error.message };
        }
      }

      return { ...row, [column]: result };
    });

    return (aq as any).from(resultRows);
  }

  if (transform.renamePattern) {
    const { find, replace: replacement, regex } = transform.renamePattern;
    const columns = table.columnNames();
    const renameMap: Record<string, string> = {};

    for (const col of columns) {
      let newName: string;
      if (regex) {
        try {
          const regexObj = new RegExp(find);
          newName = col.replace(regexObj, replacement);
        } catch (e) {
          // Invalid regex - skip this column
          continue;
        }
      } else {
        newName = col.replace(find, replacement);
      }

      if (newName !== col) {
        renameMap[col] = newName;
      }
    }

    return Object.keys(renameMap).length > 0 ? table.rename(renameMap) : table;
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

  if (transform.types) {
    const typeMap = transform.types;
    const conversions: Record<string, any> = {};

    // Sample some rows to infer current types
    const sampleRows = table.numRows() > 0 ? table.objects().slice(0, 50) : [];

    for (const [colName, targetType] of Object.entries(typeMap)) {
      if (!table.columnNames().includes(colName)) {
        continue; // Column doesn't exist
      }

      // Infer current type from sample data
      // Note: We infer the schema type, but conversion will handle actual runtime types
      let inferredType: ColumnType = 'string';
      if (sampleRows.length > 0) {
        const sampleValues = sampleRows.map((row: any) => row[colName]);
        inferredType = SchemaEngine.inferType(sampleValues);
      }

      // Check if we need conversion by looking at actual value types vs target type
      // If inferred type matches target AND all sample values are already the correct runtime type, skip
      let needsConversion = true;
      if (inferredType === targetType && sampleRows.length > 0) {
        const allCorrectType = sampleRows.every((row: any) => {
          const val = row[colName];
          if (targetType === 'integer' || targetType === 'float') {
            return typeof val === 'number';
          }
          if (targetType === 'boolean') {
            return typeof val === 'boolean';
          }
          if (targetType === 'date' || targetType === 'datetime') {
            return val instanceof Date;
          }
          if (targetType === 'string') {
            return typeof val === 'string';
          }
          return false;
        });
        if (allCorrectType) {
          needsConversion = false;
        }
      }

      if (!needsConversion) continue;

      // Create conversion function using type-converter utility
      // We use the inferred type as a hint, but convertType will handle runtime type checking
      conversions[colName] = (aq as any).escape((d: any) => {
        return convertType(d[colName], inferredType, targetType);
      });
    }

    if (Object.keys(conversions).length > 0) {
      return table.derive(conversions);
    }
    return table;
  }

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

  if (transform.impute) {
    const { column, strategy, value, includeEmptyString } = transform.impute;
    const op = (aq as any).op;

    // Helper to check for missing values
    const isMissing = includeEmptyString
      ? (v: any) => v == null || (typeof v === 'number' && isNaN(v)) || v === ''
      : (v: any) => v == null || (typeof v === 'number' && isNaN(v));

    switch (strategy) {
      case 'constant':
        return table.derive({
          [column]: aq.escape((d: any) => (isMissing(d[column]) ? value : d[column])),
        });

      case 'mean':
      case 'median':
      case 'min':
      case 'max': {
        const aggFunc = strategy === 'mean' ? op.mean : (op as any)[strategy];
        // For numeric aggregates, filter to strictly numeric values first
        // to avoid coercion of "" or other non-numeric types to 0.
        const numericTable = table.filter(
          aq.escape(
            (d: any) =>
              d[column] !== null &&
              d[column] !== undefined &&
              typeof d[column] === 'number' &&
              !isNaN(d[column])
          )
        );
        const aggValue =
          numericTable.numRows() > 0
            ? numericTable.rollup({ m: aggFunc(column) }).object(0)?.m
            : undefined;
        return table.derive({
          [column]: aq.escape((d: any) => (isMissing(d[column]) ? aggValue : d[column])),
        });
      }

      case 'forwardFill':
        // op.fill_down is a window function, but it only works on null/undefined.
        // If we need to include empty strings, we might need a manual pass.
        if (includeEmptyString) {
          const rows = table.objects();
          let lastVal: any = null;
          const resultRows = rows.map((r: any) => {
            const val = r[column];
            if (!isMissing(val)) {
              lastVal = val;
            }
            return { ...r, [column]: isMissing(val) ? lastVal : val };
          });
          return (aq as any).from(resultRows);
        }
        return table.derive({ [column]: op.fill_down(column) });

      case 'backwardFill':
        if (includeEmptyString) {
          const rows = table.objects();
          let lastVal: any = null;
          const resultRows = new Array(rows.length);
          for (let i = rows.length - 1; i >= 0; i--) {
            const r = rows[i];
            const val = r[column];
            if (!isMissing(val)) {
              lastVal = val;
            }
            resultRows[i] = { ...r, [column]: isMissing(val) ? lastVal : val };
          }
          return (aq as any).from(resultRows);
        }
        return table.derive({ [column]: op.fill_up(column) });

      case 'linearInterpolation': {
        const rows = table.objects();
        const n = rows.length;
        if (n < 2) return table;

        const resultRows = rows.map((r: any) => ({ ...r }));

        for (let i = 0; i < n; i++) {
          const val = resultRows[i][column];
          if (isMissing(val)) {
            // Find neighbors
            let prevIdx = i - 1;
            while (prevIdx >= 0) {
              const v = resultRows[prevIdx][column];
              if (!isMissing(v) && typeof v === 'number') break;
              prevIdx--;
            }

            let nextIdx = i + 1;
            while (nextIdx < n) {
              const v = resultRows[nextIdx][column];
              if (!isMissing(v) && typeof v === 'number') break;
              nextIdx++;
            }

            if (prevIdx >= 0 && nextIdx < n) {
              const v0 = resultRows[prevIdx][column];
              const v1 = resultRows[nextIdx][column];
              const dist = nextIdx - prevIdx;
              const step = (v1 - v0) / dist;
              resultRows[i][column] = v0 + step * (i - prevIdx);
            }
          }
        }
        return (aq as any).from(resultRows);
      }

      default:
        return table;
    }
  }

  // If we reach here, the transform object exists but none of the known keys matched
  // This should not happen if getUnknownTransformKey() catches it above, but as a safety fallback:
  const transformKeys = Object.keys(transform).filter((k) => k !== '__v');
  if (transformKeys.length > 0) {
    const key = transformKeys[0];
    console.warn(
      `Transform key "${key}" not recognized. Skipping this transform. ` +
        `This may be from a newer version of Chumak. The workflow will continue with remaining transforms.`
    );
    return table; // Return table unchanged
  }

  // Empty transform object - return table unchanged
  return table;
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

  if (transform.selectPattern) {
    const { pattern, matchType } = transform.selectPattern;
    return `Select pattern: ${matchType} "${pattern}"`;
  }

  if (transform.removePattern) {
    const { pattern, matchType } = transform.removePattern;
    return `Remove pattern: ${matchType} "${pattern}"`;
  }

  if (transform.conditional) {
    const { column, conditions } = transform.conditional;
    const count = conditions.length;
    return `Conditional: ${column} (${count} condition${count !== 1 ? 's' : ''})`;
  }

  if (transform.renamePattern) {
    const { find, replace: replacement, regex } = transform.renamePattern;
    const mode = regex ? 'regex' : 'text';
    return `Rename pattern: ${mode} "${find}" -> "${replacement}"`;
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

  if (transform.impute) {
    const { column, strategy } = transform.impute;
    const strategyLabels: Record<string, string> = {
      constant: 'Constant',
      mean: 'Mean',
      median: 'Median',
      min: 'Min',
      max: 'Max',
      forwardFill: 'Forward Fill',
      backwardFill: 'Backward Fill',
      linearInterpolation: 'Linear Interpolation',
    };
    return `Impute: ${column} (${strategyLabels[strategy] || strategy})`;
  }

  return 'Unknown transform';
}
