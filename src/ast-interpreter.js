/**
 * Chumak AST Interpreter - Safe expression evaluation
 *
 * Phase 0: Minimal implementation
 * - Interpret validated AST nodes
 * - No Function() constructor (security)
 * - Basic null propagation
 * - No error-as-value pattern yet (Phase 1)
 * - No type coercion warnings yet (Phase 1)
 */

/**
 * Interpret (execute) an AST node with given row data
 * @param {Object} ast - Validated AST node
 * @param {Object} rowData - Row object with column values
 * @returns {*} Result value
 * @throws {Error} If interpretation fails
 */
function interpretAST(ast, rowData) {
  return evaluateNode(ast, rowData);
}

/**
 * Recursively evaluate a single AST node
 * @param {Object} node - AST node
 * @param {Object} rowData - Row object
 * @returns {*} Evaluated value
 */
function evaluateNode(node, rowData) {
  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier':
      // Get column value from row data
      if (!rowData.hasOwnProperty(node.name)) {
        throw new Error(`Column '${node.name}' not found in row data`);
      }
      return rowData[node.name];

    case 'BinaryExpression':
      // Short-circuit evaluation for logical operators (jsep uses BinaryExpression for && and ||)
      if (node.operator === '&&') {
        const leftVal = evaluateNode(node.left, rowData);
        if (!leftVal) return leftVal; // Short-circuit on falsy
        return evaluateNode(node.right, rowData);
      }

      if (node.operator === '||') {
        const leftVal = evaluateNode(node.left, rowData);
        if (leftVal) return leftVal; // Short-circuit on truthy
        return evaluateNode(node.right, rowData);
      }

      // For other operators, evaluate both sides
      const left = evaluateNode(node.left, rowData);
      const right = evaluateNode(node.right, rowData);

      // Null propagation (except for == and !=)
      if (
        (left === null || left === undefined || right === null || right === undefined) &&
        node.operator !== '==' &&
        node.operator !== '!=' &&
        node.operator !== '===' &&
        node.operator !== '!=='
      ) {
        return null;
      }

      // Arithmetic and comparison operators
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '%':
          return left % right;
        case '>':
          return left > right;
        case '<':
          return left < right;
        case '>=':
          return left >= right;
        case '<=':
          return left <= right;
        case '==':
          return left == right;
        case '===':
          return left === right;
        case '!=':
          return left != right;
        case '!==':
          return left !== right;
        default:
          throw new Error(`Unknown binary operator: ${node.operator}`);
      }

    case 'LogicalExpression':
      // Short-circuit evaluation
      const leftVal = evaluateNode(node.left, rowData);

      if (node.operator === '&&') {
        // If left is falsy, return it (short-circuit)
        if (!leftVal) return leftVal;
        // Otherwise evaluate and return right
        return evaluateNode(node.right, rowData);
      }

      if (node.operator === '||') {
        // If left is truthy, return it (short-circuit)
        if (leftVal) return leftVal;
        // Otherwise evaluate and return right
        return evaluateNode(node.right, rowData);
      }

      throw new Error(`Unknown logical operator: ${node.operator}`);

    case 'UnaryExpression':
      const arg = evaluateNode(node.argument, rowData);

      switch (node.operator) {
        case '!':
          return !arg;
        case '-':
          return -arg;
        case '+':
          return +arg;
        default:
          throw new Error(`Unknown unary operator: ${node.operator}`);
      }

    default:
      throw new Error(`Cannot interpret node type: ${node.type}`);
  }
}
