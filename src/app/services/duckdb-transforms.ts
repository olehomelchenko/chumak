/**
 * DuckDB SQL translators — pure functions that convert Syto transform specs to SQL.
 *
 * Each translator returns a SQL string that references a table named "input".
 * Column names are always double-quoted to handle spaces and reserved words.
 */

import type { FullTransformStep } from '../../core/transforms/types';
import { decodeRollupSpec } from '../../core/transforms/rollup-spec';

/** Double-quote a column name for DuckDB SQL. */
export function quoteCol(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// Translators
// ---------------------------------------------------------------------------

export function sortToSQL(transform: FullTransformStep): string {
  const spec = transform.sort!;
  const specs = Array.isArray(spec) ? spec : [spec];
  const orderClauses = specs.map(
    (s) => `${quoteCol(s.field)} ${s.order === 'desc' ? 'DESC' : 'ASC'}`
  );
  return `SELECT * FROM input ORDER BY ${orderClauses.join(', ')}`;
}

export function selectToSQL(transform: FullTransformStep): string {
  const cols = transform.select!.map(quoteCol).join(', ');
  return `SELECT ${cols} FROM input`;
}

export function removeToSQL(transform: FullTransformStep, columns: string[]): string {
  const toRemove = new Set(transform.remove!);
  const remaining = columns.filter((c) => !toRemove.has(c));
  const cols = remaining.map(quoteCol).join(', ');
  return `SELECT ${cols} FROM input`;
}

export function dedupeToSQL(transform: FullTransformStep, columns: string[]): string {
  const { columns: dedupeCols, mode } = transform.dedupe!;

  // mode 'keep' marks duplicates; not supported in DuckDB path yet
  if (mode === 'keep') return '';

  // No columns specified → full row dedup
  if (!dedupeCols || dedupeCols.length === 0) {
    return 'SELECT DISTINCT * FROM input';
  }

  // Keep first occurrence per partition, preserving all columns
  const partitionBy = dedupeCols.map(quoteCol).join(', ');
  const allCols = columns.map(quoteCol).join(', ');
  return (
    `SELECT ${allCols} FROM (` +
    `SELECT *, ROW_NUMBER() OVER (PARTITION BY ${partitionBy}) AS _rn FROM input` +
    `) WHERE _rn = 1`
  );
}

/** Map Arquero op names to DuckDB SQL aggregate function names. */
const OP_TO_SQL: Record<string, string> = {
  count: 'COUNT',
  valid: 'COUNT',
  sum: 'SUM',
  mean: 'AVG',
  average: 'AVG',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
  median: 'MEDIAN',
  stdev: 'STDDEV_SAMP',
  variance: 'VAR_SAMP',
  distinct: 'COUNT(DISTINCT',
  mode: 'MODE',
  any: 'ANY_VALUE',
};

export function aggregateToSQL(transform: FullTransformStep): string {
  const { groupby, rollup } = transform.aggregate!;

  // Parse rollup specs: "op.funcName('colName')" or "op.count()"
  const selectParts: string[] = [];

  if (groupby && groupby.length > 0) {
    selectParts.push(...groupby.map(quoteCol));
  }

  for (const [outCol, exprString] of Object.entries(rollup)) {
    const { func: funcName, col } = decodeRollupSpec(exprString as string);
    const colName = col ?? null;
    const sqlFunc = OP_TO_SQL[funcName];

    if (!sqlFunc) {
      throw new Error(`Unsupported aggregate function for DuckDB: op.${funcName}`);
    }

    let expr: string;
    if (sqlFunc === 'COUNT(DISTINCT') {
      expr = colName ? `COUNT(DISTINCT ${quoteCol(colName)})` : 'COUNT(DISTINCT *)';
    } else if (colName) {
      expr = `${sqlFunc}(${quoteCol(colName)})`;
    } else {
      expr = `${sqlFunc}(*)`;
    }

    selectParts.push(`${expr} AS ${quoteCol(outCol)}`);
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM input`;

  if (groupby && groupby.length > 0) {
    sql += ` GROUP BY ${groupby.map(quoteCol).join(', ')}`;
  }

  return sql;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

type TranslatorFn = (transform: FullTransformStep, columns: string[]) => string;

/**
 * Registry of transforms that have DuckDB SQL implementations.
 * Each function returns a SQL string or empty string if unsupported variant.
 */
export const DUCKDB_TRANSLATORS: Record<string, TranslatorFn> = {
  sort: sortToSQL,
  select: selectToSQL,
  remove: removeToSQL,
  dedupe: dedupeToSQL,
  aggregate: aggregateToSQL,
};
