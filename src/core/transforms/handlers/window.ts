import * as aq from 'arquero';
import type { FullTransformStep, TransformContext } from '../types';

/**
 * Pure window functions: operate on row position/order within the frame.
 */
const WINDOW_FUNCTIONS = [
  'lag',
  'lead',
  'row_number',
  'rank',
  'dense_rank',
  'avg_rank',
  'percent_rank',
  'cume_dist',
  'ntile',
  'first_value',
  'last_value',
  'nth_value',
  'fill_down',
  'fill_up',
];

/**
 * Aggregate functions: when used in a window context with aq.rolling(),
 * these compute cumulative or rolling aggregates over the window frame.
 * Default frame is [-Infinity, 0] (cumulative), matching SQL behavior.
 */
const AGGREGATE_FUNCTIONS = [
  'sum',
  'mean',
  'min',
  'max',
  'count',
  'product',
  'median',
  'mode',
  'stdev',
  'variance',
];

const ALLOWED_WINDOW_FUNCTIONS = [...WINDOW_FUNCTIONS, ...AGGREGATE_FUNCTIONS];

/**
 * Parse a window function expression like "op.lag('value', 1)" or "op.row_number()"
 * Returns the function name and parsed arguments.
 */
function parseWindowExpression(exprString: string): {
  funcName: string;
  args: (string | number | null | undefined)[];
} {
  const match = exprString.match(/^op\.(\w+)\(([^)]*)\)$/);
  if (!match) {
    throw new Error(`Invalid window expression: ${exprString}`);
  }

  const funcName = match[1];
  const argsStr = match[2].trim();

  if (!ALLOWED_WINDOW_FUNCTIONS.includes(funcName)) {
    throw new Error(
      `Unknown or disallowed window function: ${funcName}. Allowed: ${ALLOWED_WINDOW_FUNCTIONS.join(', ')}`
    );
  }

  // Parse arguments if present
  const args: (string | number | null | undefined)[] = [];
  if (argsStr) {
    // Split by comma, but respect quoted strings
    const argParts = argsStr.match(/(?:[^,'"]+|'[^']*'|"[^"]*")+/g) || [];

    for (const arg of argParts) {
      const trimmed = arg.trim();

      // String argument (column name) - single or double quoted
      if (
        (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        args.push(trimmed.slice(1, -1));
        continue;
      }

      // Number argument
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        args.push(Number(trimmed));
        continue;
      }

      // null/undefined
      if (trimmed === 'null') {
        args.push(null);
        continue;
      }
      if (trimmed === 'undefined') {
        args.push(undefined);
        continue;
      }

      // Unquoted string (treat as column name for backward compatibility)
      args.push(trimmed);
    }
  }

  return { funcName, args };
}

/**
 * Resolve a frame spec from the transform's frames map.
 * null values in the spec map to -Infinity/Infinity (unbounded).
 * Returns undefined for window functions that don't use frames.
 */
function resolveFrame(
  outCol: string,
  funcName: string,
  frames?: Record<string, [number | null, number | null]>
): [number, number] | undefined {
  if (!AGGREGATE_FUNCTIONS.includes(funcName)) return undefined;

  const raw = frames?.[outCol];
  if (raw) {
    return [raw[0] ?? -Infinity, raw[1] ?? Infinity];
  }
  // Default for aggregates: cumulative (SQL-consistent)
  return [-Infinity, 0];
}

/**
 * Handle window transform: apply window functions with ordering and optional partitioning.
 *
 * Window functions operate on ordered data and can compute values based on
 * relative row positions (lag, lead) or rankings (row_number, rank, etc.).
 * Aggregate functions are wrapped with aq.rolling() for cumulative/rolling behavior.
 */
export function handleWindow(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  _context: TransformContext | null
): any {
  const { orderBy, partitionBy, derive, frames } = transform.window!;
  const op = (aq as any).op;
  const rolling = (aq as any).rolling;

  // 1. Apply ordering if specified
  let workingTable = table;
  if (orderBy && orderBy.length > 0) {
    const orderSpec = orderBy.map(({ field, order }) =>
      order === 'desc' ? aq.desc(field) : field
    );
    workingTable = workingTable.orderby(...orderSpec);
  }

  // 2. Apply partitioning (groupby) if specified
  if (partitionBy && partitionBy.length > 0) {
    workingTable = workingTable.groupby(partitionBy);
  }

  // 3. Build derive specifications from window expressions
  const deriveSpecs: Record<string, any> = {};

  for (const [outCol, exprString] of Object.entries(derive)) {
    const { funcName, args } = parseWindowExpression(exprString as string);

    if (!op[funcName]) {
      throw new Error(`Unknown Arquero op function: ${funcName}`);
    }

    const opResult = op[funcName](...args);

    // Wrap aggregate functions with aq.rolling() for cumulative/rolling behavior
    const frame = resolveFrame(outCol, funcName, frames);
    deriveSpecs[outCol] = frame ? rolling(opResult, frame) : opResult;
  }

  // 4. Apply derive with window functions
  let result = workingTable.derive(deriveSpecs);

  // 5. Ungroup if we partitioned
  if (partitionBy && partitionBy.length > 0) {
    result = result.ungroup();
  }

  return result;
}

export const windowHandlers = {
  window: handleWindow,
};
