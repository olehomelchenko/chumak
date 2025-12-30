/**
 * Chumak AST Validator - Security and schema validation
 *
 * Phase 0: Minimal implementation
 * - Whitelist allowed node types
 * - Whitelist allowed operators
 * - Validate column names exist in schema
 * - No suggestions yet (Phase 1)
 * - No bracket notation yet (Phase 1)
 */

// Allowed AST node types (from ESTree spec)
const ALLOWED_NODE_TYPES = [
  'Literal',           // Numbers, strings, booleans, null
  'Identifier',        // Column references
  'BinaryExpression',  // +, -, *, /, %, >, <, >=, <=, ==, ===, !=, !==
  'LogicalExpression', // &&, ||
  'UnaryExpression'    // !, -, +
];

// Allowed operators for each expression type
// Note: jsep treats && and || as BinaryExpression by default, not LogicalExpression
const ALLOWED_BINARY_OPS = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '===', '!=', '!==', '&&', '||'];
const ALLOWED_LOGICAL_OPS = ['&&', '||'];
const ALLOWED_UNARY_OPS = ['!', '-', '+'];

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
        // Preserve additional properties (columnName, availableColumns, etc.)
        ...error
      }
    };
  }
}

/**
 * Recursively validate a single AST node
 * @param {Object} node - AST node
 * @param {Array<string>} schema - Valid column names
 * @throws {Error} If validation fails
 */
function validateNode(node, schema) {
  if (!node || typeof node !== 'object') {
    throw {
      message: 'Invalid AST node',
      position: 0
    };
  }

  // Check if node type is allowed
  if (!ALLOWED_NODE_TYPES.includes(node.type)) {
    throw {
      message: `Expression type '${node.type}' is not allowed`,
      position: node.start || 0,
      type: 'disallowed-node-type'
    };
  }

  // Validate based on node type
  switch (node.type) {
    case 'Literal':
      // Literals are always safe
      break;

    case 'Identifier':
      // Check if column exists in schema
      if (!schema.includes(node.name)) {
        throw {
          message: `Column '${node.name}' not found`,
          position: node.start || 0,
          type: 'unknown-column',
          columnName: node.name,
          availableColumns: schema
        };
      }
      break;

    case 'BinaryExpression':
      // Check if operator is allowed
      if (!ALLOWED_BINARY_OPS.includes(node.operator)) {
        throw {
          message: `Operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator'
        };
      }
      // Recursively validate left and right
      validateNode(node.left, schema);
      validateNode(node.right, schema);
      break;

    case 'LogicalExpression':
      // Check if operator is allowed
      if (!ALLOWED_LOGICAL_OPS.includes(node.operator)) {
        throw {
          message: `Logical operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator'
        };
      }
      // Recursively validate left and right
      validateNode(node.left, schema);
      validateNode(node.right, schema);
      break;

    case 'UnaryExpression':
      // Check if operator is allowed
      if (!ALLOWED_UNARY_OPS.includes(node.operator)) {
        throw {
          message: `Unary operator '${node.operator}' is not allowed`,
          position: node.start || 0,
          type: 'disallowed-operator'
        };
      }
      // Recursively validate argument
      validateNode(node.argument, schema);
      break;

    default:
      // This shouldn't happen if ALLOWED_NODE_TYPES is correct
      throw {
        message: `Unexpected node type: ${node.type}`,
        position: node.start || 0
      };
  }
}
