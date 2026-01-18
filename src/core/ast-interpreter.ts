import { ASTNode } from './expression-parser';

/**
 * Chumak AST Interpreter - Safe expression evaluation
 */

const BINARY_OPS: Record<string, (l: any, r: any) => any> = {
  '+': (l, r) => l + r,
  '-': (l, r) => l - r,
  '*': (l, r) => l * r,
  '/': (l, r) => l / r,
  '%': (l, r) => l % r,
  '>': (l, r) => l > r,
  '<': (l, r) => l < r,
  '>=': (l, r) => l >= r,
  '<=': (l, r) => l <= r,
  '==': (l, r) => l == r,
  '===': (l, r) => l === r,
  '!=': (l, r) => l != r,
  '!==': (l, r) => l !== r,
};

const UNARY_OPS: Record<string, (a: any) => any> = {
  '!': (a) => !a,
  not: (a) => !a, // Word-form alternative to !
  '-': (a) => -a,
  '+': (a) => +a,
};

const NULL_COMPARISON_OPS = new Set(['==', '===', '!=', '!==']);

/**
 * Parse input to Date object, handling multiple input formats
 */
export function parseToDate(value: any): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // ISO Date only (YYYY-MM-DD) - forced to local midnight to avoid UTC shift
    // by default JS parses YYYY-MM-DD as UTC which is inconsistent with other formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function parseRegexFlags(pattern: string) {
  const flagMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
  if (flagMatch) {
    return {
      pattern: pattern.slice(flagMatch[0].length),
      flags: flagMatch[1],
    };
  }
  return { pattern, flags: '' };
}

const FUNCTION_IMPLS: Record<string, (...args: any[]) => any> = {
  // Regex functions
  regexp_match: (value, pattern) => {
    if (value == null) return null;
    try {
      const { pattern: p, flags } = parseRegexFlags(pattern);
      return new RegExp(p, flags).test(String(value));
    } catch (e: any) {
      return { type: 'error', message: e.message };
    }
  },
  regexp_extract: (value, pattern, group = 0) => {
    if (value == null) return null;
    try {
      const { pattern: p, flags } = parseRegexFlags(pattern);
      const match = String(value).match(new RegExp(p, flags));
      if (!match) return null;
      return match[group] ?? null;
    } catch (e: any) {
      return { type: 'error', message: e.message };
    }
  },

  // Date extraction - Phase 1
  year: (value) => {
    const date = parseToDate(value);
    return date ? date.getFullYear() : null;
  },
  month: (value) => {
    const date = parseToDate(value);
    return date ? date.getMonth() + 1 : null; // 1-12 instead of 0-11
  },
  day: (value) => {
    const date = parseToDate(value);
    return date ? date.getDate() : null;
  },
  hour: (value) => {
    const date = parseToDate(value);
    return date ? date.getHours() : null;
  },
  minute: (value) => {
    const date = parseToDate(value);
    return date ? date.getMinutes() : null;
  },
  second: (value) => {
    const date = parseToDate(value);
    return date ? date.getSeconds() : null;
  },

  // Date extraction - Phase 2
  weekday: (value) => {
    const date = parseToDate(value);
    if (!date) return null;
    // Convert JS Sunday=0 to Monday=0 (ISO 8601)
    return (date.getDay() + 6) % 7;
  },
  week: (value) => {
    const date = parseToDate(value);
    if (!date) return null;
    // ISO week calculation
    const target = new Date(date.valueOf());
    const dayNum = (date.getDay() + 6) % 7; // Monday = 0
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  },
  quarter: (value) => {
    const date = parseToDate(value);
    if (!date) return null;
    return Math.floor(date.getMonth() / 3) + 1;
  },

  // Date utilities - Phase 3
  today: () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  now: () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },

  // Date arithmetic - Phase 4
  days_between: (date1, date2) => {
    const d1 = parseToDate(date1);
    const d2 = parseToDate(date2);
    if (!d1 || !d2) return null;
    // Use UTC to avoid DST issues
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc2 - utc1) / 86400000);
  },
  date_add: (value, amount, unit) => {
    const date = parseToDate(value);
    if (!date || typeof amount !== 'number') return null;

    const result = new Date(date);
    const unitLower = String(unit).toLowerCase();

    switch (unitLower) {
      case 'day':
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
      case 'month':
      case 'months':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'year':
      case 'years':
        result.setFullYear(result.getFullYear() + amount);
        break;
      case 'hour':
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'minute':
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'second':
      case 'seconds':
        result.setSeconds(result.getSeconds() + amount);
        break;
      default:
        return { type: 'error', message: `Unknown unit: ${unit}` };
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const resultDate = new Date(result);
    // If it's a date-level addition, return a date string, otherwise datetime
    if (['day', 'days', 'month', 'months', 'year', 'years'].includes(unitLower)) {
      return `${resultDate.getFullYear()}-${pad(resultDate.getMonth() + 1)}-${pad(
        resultDate.getDate()
      )}`;
    }
    return `${resultDate.getFullYear()}-${pad(resultDate.getMonth() + 1)}-${pad(
      resultDate.getDate()
    )}T${pad(resultDate.getHours())}:${pad(resultDate.getMinutes())}:${pad(
      resultDate.getSeconds()
    )}`;
  },
  date_trunc: (value, unit) => {
    const date = parseToDate(value);
    if (!date) return null;

    const result = new Date(date);
    const unitLower = String(unit).toLowerCase();

    switch (unitLower) {
      case 'year':
        result.setMonth(0, 1);
        result.setHours(0, 0, 0, 0);
        break;
      case 'quarter': {
        const quarter = Math.floor(result.getMonth() / 3);
        result.setMonth(quarter * 3, 1);
        result.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        break;
      case 'week': {
        const day = result.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // Adjust to previous Monday
        result.setDate(result.getDate() + diff);
        result.setHours(0, 0, 0, 0);
        break;
      }
      case 'day':
        result.setHours(0, 0, 0, 0);
        break;
      case 'hour':
        result.setMinutes(0, 0, 0);
        break;
      case 'minute':
        result.setSeconds(0, 0);
        break;
      case 'second':
        result.setMilliseconds(0);
        break;
      default:
        return { type: 'error', message: `Unknown truncation unit: ${unit}` };
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    if (['year', 'quarter', 'month', 'week', 'day'].includes(unitLower)) {
      return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`;
    }
    return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(
      result.getHours()
    )}:${pad(result.getMinutes())}:${pad(result.getSeconds())}`;
  },
  format_date: (value, format) => {
    const date = parseToDate(value);
    if (!date || typeof format !== 'string') return null;

    const pad = (n: number, len: number = 2) => String(n).padStart(len, '0');

    const tokens: Record<string, string> = {
      YYYY: String(date.getFullYear()),
      YY: String(date.getFullYear()).slice(-2),
      MM: pad(date.getMonth() + 1),
      M: String(date.getMonth() + 1),
      DD: pad(date.getDate()),
      D: String(date.getDate()),
      HH: pad(date.getHours()),
      H: String(date.getHours()),
      mm: pad(date.getMinutes()),
      m: String(date.getMinutes()),
      ss: pad(date.getSeconds()),
      s: String(date.getSeconds()),
    };

    // Replace tokens in order of specificity (longest first)
    let result = format;
    const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);
    for (const token of sortedTokens) {
      result = result.split(token).join(tokens[token]);
    }

    return result;
  },

  // String functions
  upper: (value) => {
    if (value == null) return null;
    return String(value).toUpperCase();
  },
  lower: (value) => {
    if (value == null) return null;
    return String(value).toLowerCase();
  },
  trim: (value) => {
    if (value == null) return null;
    return String(value).trim();
  },
  substring: (value, start, length) => {
    if (value == null) return null;
    const str = String(value);
    const startIdx = Math.max(0, Math.floor(start));
    if (length === undefined) {
      return str.substring(startIdx);
    }
    const len = Math.max(0, Math.floor(length));
    return str.substring(startIdx, startIdx + len);
  },
  len: (value) => {
    if (value == null) return null;
    // Uses JavaScript's string length which counts UTF-16 code units
    // This means surrogate pairs (emojis, etc.) count as 2
    return String(value).length;
  },
  split: (value, delimiter, index = 0) => {
    if (value == null) return null;
    const str = String(value);
    const delim = delimiter != null ? String(delimiter) : '';
    const parts = str.split(delim);
    // Handle negative index (count from end: -1 = last, -2 = second-to-last, etc.)
    const idx = index < 0 ? parts.length + index : index;
    if (idx < 0 || idx >= parts.length) return null;
    return parts[idx];
  },

  // String comparison functions (case-sensitive)
  equals: (value1, value2) => {
    if (value1 == null || value2 == null) return false;
    return String(value1) === String(value2);
  },
  contains: (value, substring) => {
    if (value == null || substring == null) return false;
    return String(value).includes(String(substring));
  },
  starts_with: (value, prefix) => {
    if (value == null || prefix == null) return false;
    return String(value).startsWith(String(prefix));
  },
  ends_with: (value, suffix) => {
    if (value == null || suffix == null) return false;
    return String(value).endsWith(String(suffix));
  },

  // Case-insensitive comparison functions
  equals_ci: (value1, value2) => {
    if (value1 == null || value2 == null) return false;
    return String(value1).toLowerCase() === String(value2).toLowerCase();
  },
  contains_ci: (value, substring) => {
    if (value == null || substring == null) return false;
    return String(value).toLowerCase().includes(String(substring).toLowerCase());
  },
  starts_with_ci: (value, prefix) => {
    if (value == null || prefix == null) return false;
    return String(value).toLowerCase().startsWith(String(prefix).toLowerCase());
  },
  ends_with_ci: (value, suffix) => {
    if (value == null || suffix == null) return false;
    return String(value).toLowerCase().endsWith(String(suffix).toLowerCase());
  },

  // Math functions
  abs: (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.abs(num);
  },
  round: (value, decimals = 0) => {
    if (value == null) return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    const factor = Math.pow(10, Math.floor(decimals));
    return Math.round(num * factor) / factor;
  },
  floor: (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.floor(num);
  },
  ceil: (value) => {
    if (value == null) return null;
    const num = Number(value);
    return isNaN(num) ? null : Math.ceil(num);
  },
  min: (...args) => {
    const nums = args
      .filter((v) => v != null)
      .map(Number)
      .filter((n) => !isNaN(n));
    return nums.length === 0 ? null : Math.min(...nums);
  },
  max: (...args) => {
    const nums = args
      .filter((v) => v != null)
      .map(Number)
      .filter((n) => !isNaN(n));
    return nums.length === 0 ? null : Math.max(...nums);
  },

  // Type conversion
  parse_int: (value) => {
    if (value == null) return null;
    const result = parseInt(String(value), 10);
    return isNaN(result) ? null : result;
  },
  parse_float: (value) => {
    if (value == null) return null;
    const result = parseFloat(String(value));
    return isNaN(result) ? null : result;
  },
  is_nan: (value) => {
    if (value == null) return false;
    return Number.isNaN(Number(value));
  },
};

export function interpretAST(ast: ASTNode, rowData: Record<string, any>): any {
  return evaluateNode(ast, rowData);
}

function evaluateNode(node: ASTNode, rowData: Record<string, any>): any {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      if (node.name && !Object.prototype.hasOwnProperty.call(rowData, node.name)) {
        throw new Error(`Column '${node.name}' not found in row data`);
      }
      return node.name ? rowData[node.name] : undefined;

    case 'BinaryExpression':
    case 'LogicalExpression': {
      // Short-circuit evaluation for && and 'and'
      if (node.operator === '&&' || node.operator === 'and') {
        const left = evaluateNode(node.left!, rowData);
        return left ? evaluateNode(node.right!, rowData) : left;
      }
      // Short-circuit evaluation for || and 'or'
      if (node.operator === '||' || node.operator === 'or') {
        const left = evaluateNode(node.left!, rowData);
        return left ? left : evaluateNode(node.right!, rowData);
      }
      if (node.operator === '??') {
        const left = evaluateNode(node.left!, rowData);
        return left !== null && left !== undefined ? left : evaluateNode(node.right!, rowData);
      }

      const left = evaluateNode(node.left!, rowData);
      const right = evaluateNode(node.right!, rowData);

      // Handle date comparisons
      const isComparison = ['>', '<', '>=', '<=', '==', '===', '!=', '!=='].includes(
        node.operator!
      );
      if (isComparison && (left instanceof Date || right instanceof Date)) {
        const ld = parseToDate(left);
        const rd = parseToDate(right);
        if (ld && rd) {
          const lv = ld.getTime();
          const rv = rd.getTime();
          switch (node.operator) {
            case '>':
              return lv > rv;
            case '<':
              return lv < rv;
            case '>=':
              return lv >= rv;
            case '<=':
              return lv <= rv;
            case '==':
            case '===':
              return lv === rv;
            case '!=':
            case '!==':
              return lv !== rv;
          }
        }
      }

      if (
        node.operator &&
        (left == null || right == null) &&
        !NULL_COMPARISON_OPS.has(node.operator)
      ) {
        return null;
      }

      const op = BINARY_OPS[node.operator!];
      if (!op) throw new Error(`Unknown operator: ${node.operator}`);
      return op(left, right);
    }

    case 'UnaryExpression': {
      const arg = evaluateNode(node.argument!, rowData);
      const op = UNARY_OPS[node.operator!];
      if (!op) throw new Error(`Unknown unary operator: ${node.operator}`);
      return op(arg);
    }

    case 'ConditionalExpression': {
      const test = evaluateNode(node.test!, rowData);
      return test
        ? evaluateNode(node.consequent!, rowData)
        : evaluateNode(node.alternate!, rowData);
    }

    case 'CallExpression': {
      const fnName = node.callee!.name!;
      const fn = FUNCTION_IMPLS[fnName];
      if (!fn) {
        throw new Error(`Unknown function: ${fnName}`);
      }
      const args = (node.arguments || []).map((arg) => evaluateNode(arg, rowData));
      return fn(...args);
    }

    default:
      throw new Error(`Cannot interpret node type: ${node.type}`);
  }
}
