/**
 * Chumak Expression Parser - jsep wrapper
 *
 * Parses expression strings to AST using jsep.
 * Features:
 * - Bracket notation [Column Name] for columns with spaces
 * - Ternary operator (? :) support (built-in)
 * - Nullish coalescing (??) support (configured)
 */

// Configure jsep for nullish coalescing operator
// Precedence 1 (lowest, so it binds last - after || which is 2 in jsep)
if (typeof jsep !== 'undefined') {
  jsep.addBinaryOp('??', 1);
}

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

  // Pre-process bracket notation [Column Name] into same-length placeholders
  // to maintain accurate error positions
  const colMatches = [];
  const processedExpr = expression.replace(/\[([^\]]+)\]/g, (match, colName) => {
    const index = colMatches.length;
    let placeholder = `_${index}_`.padEnd(match.length, '_');
    if (placeholder.length > match.length) {
      placeholder = placeholder.substring(0, match.length);
    }
    colMatches.push({ placeholder, colName });
    return placeholder;
  });

  try {
    const ast = jsep(processedExpr.trim());

    // Restore original column names from placeholders
    if (colMatches.length > 0) {
      restoreColumnNames(ast, colMatches);
    }

    return ast;
  } catch (error) {
    throw { message: error.message, position: error.index || 0, expression };
  }
}

/**
 * Recursively walk AST and restore column names from placeholders
 */
function restoreColumnNames(node, colMatches) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'Identifier') {
    const match = colMatches.find((m) => m.placeholder === node.name);
    if (match) node.name = match.colName;
  }

  // Recurse through all child properties
  for (const key in node) {
    const child = node[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        child.forEach((c) => restoreColumnNames(c, colMatches));
      } else {
        restoreColumnNames(child, colMatches);
      }
    }
  }
}
