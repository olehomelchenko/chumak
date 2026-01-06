/**
 * Chumak AST Interpreter - Safe expression evaluation
 *
 * Interprets validated AST nodes without using Function() constructor.
 * Supports: arithmetic, comparison, logical ops, ternary, nullish coalescing.
 */

// Operator lookup tables for cleaner evaluation
const BINARY_OPS = {
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

const UNARY_OPS = {
  '!': (a) => !a,
  '-': (a) => -a,
  '+': (a) => +a,
};

// Operators that should NOT propagate null (allow null comparisons)
const NULL_COMPARISON_OPS = new Set(['==', '===', '!=', '!==']);

/**
 * Parse inline flags from regex pattern (e.g., (?i) for case-insensitive)
 * Returns { pattern, flags } where flags is extracted from (?...) prefix
 */
function parseRegexFlags(pattern) {
  const flagMatch = pattern.match(/^\(\?([gimsuy]+)\)/);
  if (flagMatch) {
    return {
      pattern: pattern.slice(flagMatch[0].length),
      flags: flagMatch[1],
    };
  }
  return { pattern, flags: '' };
}

// Function implementations (whitelisted)
const FUNCTION_IMPLS = {
  regexp_match: (value, pattern) => {
    if (value == null) return null;
    try {
      const { pattern: p, flags } = parseRegexFlags(pattern);
      return new RegExp(p, flags).test(String(value));
    } catch (e) {
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
    } catch (e) {
      return { type: 'error', message: e.message };
    }
  },
};

/**
 * Interpret (execute) an AST node with given row data
 * @param {Object} ast - Validated AST node
 * @param {Object} rowData - Row object with column values
 * @returns {*} Result value
 */
function interpretAST(ast, rowData) {
  return evaluateNode(ast, rowData);
}

function evaluateNode(node, rowData) {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      if (!rowData.hasOwnProperty(node.name)) {
        throw new Error(`Column '${node.name}' not found in row data`);
      }
      return rowData[node.name];

    case 'BinaryExpression':
    case 'LogicalExpression': {
      // Short-circuit operators
      if (node.operator === '&&') {
        const left = evaluateNode(node.left, rowData);
        return left ? evaluateNode(node.right, rowData) : left;
      }
      if (node.operator === '||') {
        const left = evaluateNode(node.left, rowData);
        return left ? left : evaluateNode(node.right, rowData);
      }
      if (node.operator === '??') {
        const left = evaluateNode(node.left, rowData);
        return left !== null && left !== undefined ? left : evaluateNode(node.right, rowData);
      }

      // Standard binary operators
      const left = evaluateNode(node.left, rowData);
      const right = evaluateNode(node.right, rowData);

      // Null propagation (except for equality checks)
      if ((left == null || right == null) && !NULL_COMPARISON_OPS.has(node.operator)) {
        return null;
      }

      const op = BINARY_OPS[node.operator];
      if (!op) throw new Error(`Unknown operator: ${node.operator}`);
      return op(left, right);
    }

    case 'UnaryExpression': {
      const arg = evaluateNode(node.argument, rowData);
      const op = UNARY_OPS[node.operator];
      if (!op) throw new Error(`Unknown unary operator: ${node.operator}`);
      return op(arg);
    }

    case 'ConditionalExpression': {
      // Ternary: test ? consequent : alternate
      const test = evaluateNode(node.test, rowData);
      return test ? evaluateNode(node.consequent, rowData) : evaluateNode(node.alternate, rowData);
    }

    case 'CallExpression': {
      const fnName = node.callee.name;
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
