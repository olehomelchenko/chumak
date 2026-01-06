/**
 * Chumak AST Validator - Security and schema validation
 *
 * Validates parsed AST nodes against:
 * - Whitelist of allowed node types (security)
 * - Whitelist of allowed operators (security)
 * - Schema validation (column names exist)
 */

// Allowed AST node types (security whitelist)
const ALLOWED_NODE_TYPES = new Set([
  'Literal', // Numbers, strings, booleans, null
  'Identifier', // Column references
  'BinaryExpression', // Arithmetic, comparison, logical ops
  'LogicalExpression', // && and || (jsep may use either type)
  'UnaryExpression', // !, -, +
  'ConditionalExpression', // Ternary: a ? b : c
  'CallExpression', // Function calls (whitelisted functions only)
]);

// Allowed operators by expression type
const ALLOWED_OPS = {
  binary: new Set([
    '+',
    '-',
    '*',
    '/',
    '%',
    '>',
    '<',
    '>=',
    '<=',
    '==',
    '===',
    '!=',
    '!==',
    '&&',
    '||',
    '??',
  ]),
  logical: new Set(['&&', '||', '??']),
  unary: new Set(['!', '-', '+']),
};

// Allowed functions with arity constraints
const ALLOWED_FUNCTIONS = {
  regexp_match: { minArgs: 2, maxArgs: 2 },
  regexp_extract: { minArgs: 2, maxArgs: 3 },
};

/**
 * Validate an AST against security rules and schema
 * @param {Object} ast - AST node from jsep
 * @param {Array<string>} schema - Array of valid column names
 * @returns {Object} { valid: boolean, error?: Object }
 */
function validateAST(ast, schema) {
  try {
    validateNode(ast, schema);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: {
        message: error.message,
        position: error.position || 0,
        type: error.type || 'validation-error',
        ...error,
      },
    };
  }
}

/**
 * Recursively validate a single AST node
 */
function validateNode(node, schema) {
  if (!node || typeof node !== 'object') {
    throw { message: 'Invalid AST node', position: 0 };
  }

  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    throw {
      message: `Expression type '${node.type}' is not allowed`,
      position: node.start || 0,
      type: 'disallowed-node-type',
    };
  }

  switch (node.type) {
    case 'Literal':
      break; // Always safe

    case 'Identifier':
      if (!schema.includes(node.name)) {
        throw {
          message: `Column '${node.name}' not found`,
          position: node.start || 0,
          type: 'unknown-column',
          columnName: node.name,
          availableColumns: schema,
        };
      }
      break;

    case 'BinaryExpression':
    case 'LogicalExpression':
      const opSet = node.type === 'LogicalExpression' ? ALLOWED_OPS.logical : ALLOWED_OPS.binary;
      if (!opSet.has(node.operator)) {
        throw {
          message: `Operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator',
        };
      }
      validateNode(node.left, schema);
      validateNode(node.right, schema);
      break;

    case 'UnaryExpression':
      if (!ALLOWED_OPS.unary.has(node.operator)) {
        throw {
          message: `Unary operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator',
        };
      }
      validateNode(node.argument, schema);
      break;

    case 'ConditionalExpression':
      validateNode(node.test, schema);
      validateNode(node.consequent, schema);
      validateNode(node.alternate, schema);
      break;

    case 'CallExpression':
      validateCallExpression(node, schema);
      break;
  }
}

/**
 * Validate a function call expression
 */
function validateCallExpression(node, schema) {
  // Check callee is an Identifier (not computed)
  if (!node.callee || node.callee.type !== 'Identifier') {
    throw {
      message: 'Invalid function call syntax',
      position: node.start || 0,
      type: 'invalid-call',
    };
  }

  const fnName = node.callee.name;
  const fnSpec = ALLOWED_FUNCTIONS[fnName];

  // Check function is whitelisted
  if (!fnSpec) {
    throw {
      message: `Function '${fnName}' is not allowed`,
      position: node.callee.start || 0,
      type: 'unknown-function',
    };
  }

  // Check argument count
  const argCount = node.arguments ? node.arguments.length : 0;
  if (argCount < fnSpec.minArgs || argCount > fnSpec.maxArgs) {
    const expected =
      fnSpec.minArgs === fnSpec.maxArgs
        ? `${fnSpec.minArgs}`
        : `${fnSpec.minArgs}-${fnSpec.maxArgs}`;
    throw {
      message: `Function '${fnName}' expects ${expected} arguments, got ${argCount}`,
      position: node.start || 0,
      type: 'wrong-arity',
    };
  }

  // Validate each argument
  if (node.arguments) {
    node.arguments.forEach((arg) => validateNode(arg, schema));
  }

  // Validate regex pattern for regexp functions
  if (fnName === 'regexp_match' || fnName === 'regexp_extract') {
    const patternArg = node.arguments[1];
    if (patternArg && patternArg.type === 'Literal' && typeof patternArg.value === 'string') {
      validateRegexPattern(patternArg.value, patternArg.start || 0);
    }
  }
}

/**
 * Parse inline flags from regex pattern (e.g., (?i) for case-insensitive)
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

/**
 * Validate a regex pattern string
 */
function validateRegexPattern(pattern, position) {
  try {
    const { pattern: p, flags } = parseRegexFlags(pattern);
    new RegExp(p, flags);
  } catch (e) {
    throw {
      message: `Invalid regex pattern: ${e.message}`,
      position,
      type: 'invalid-regex',
    };
  }
}
