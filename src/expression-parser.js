/**
 * Chumak Expression Parser - jsep wrapper
 *
 * Phase 0: Minimal implementation
 * - Parse expression strings to AST using jsep
 * - Basic error handling
 * - No bracket notation support yet (Phase 1)
 * - No custom plugins yet (Phase 1+)
 */

/**
 * Parse an expression string into an Abstract Syntax Tree
 * @param {string} expression - Expression string (e.g., "sales > 1000")
 * @returns {Object} AST node from jsep
 * @throws {Error} If parsing fails
 */
function parseExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Expression must be a non-empty string');
  }

  try {
    const ast = jsep(expression.trim());
    return ast;
  } catch (error) {
    // jsep throws errors with index property for position
    throw {
      message: error.message,
      position: error.index || 0,
      expression: expression
    };
  }
}
