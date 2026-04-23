/**
 * Rollup spec encoding for the `aggregate` transform.
 *
 * Persisted form: `op.<func>()` or `op.<func>(<arg>)` where `<arg>` may be:
 *   - a JSON-quoted string (preferred — safely carries any characters): op.sum("O'Brien")
 *   - a single-quoted string (legacy): op.sum('amount')
 *   - a bare identifier (legacy, simple names only): op.sum(amount)
 *
 * The encoder emits the single-quoted form when it is lossless and falls back
 * to the JSON-quoted form for names containing single quotes or backslashes.
 * The decoder accepts all three forms to stay backward-compatible with
 * workflows saved by earlier versions.
 */

export interface RollupSpec {
  func: string;
  col?: string;
}

export function encodeRollupSpec(func: string, col?: string): string {
  if (col === undefined || col === '') return `op.${func}()`;
  if (!/['\\]/.test(col)) return `op.${func}('${col}')`;
  return `op.${func}(${JSON.stringify(col)})`;
}

export function decodeRollupSpec(expr: string): RollupSpec {
  const match = expr.match(/^op\.(\w+)\((.*)\)$/s);
  if (!match) throw new Error(`Invalid aggregation expression: ${expr}`);

  const func = match[1];
  const argRaw = match[2].trim();
  if (argRaw === '') return { func };

  if (argRaw.startsWith('"')) {
    try {
      const parsed = JSON.parse(argRaw);
      if (typeof parsed === 'string') return { func, col: parsed };
    } catch {
      // fall through to other forms
    }
  }

  if (argRaw.length >= 2 && argRaw.startsWith("'") && argRaw.endsWith("'")) {
    return { func, col: argRaw.slice(1, -1) };
  }

  return { func, col: argRaw };
}

export function tryDecodeRollupSpec(expr: string): RollupSpec | null {
  try {
    return decodeRollupSpec(expr);
  } catch {
    return null;
  }
}
