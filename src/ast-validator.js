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
  }
}
