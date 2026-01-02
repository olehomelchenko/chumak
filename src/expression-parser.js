/**
 * Chumak Expression Parser - jsep wrapper
 *
 * Phase 0: Minimal implementation
 * - Parse expression strings to AST using jsep
 * - Basic error handling
 * - Bracket notation support [Column Name] (Phase 1)
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

  // Pre-process for bracket notation [Column Name]
  // We replace [Col Name] with placeholders of the PRECISE same length
  // to maintain accurate error positions (pointers).
  const colMatches = [];
  const processedExpr = expression.replace(/\[([^\]]+)\]/g, (match, colName) => {
    const index = colMatches.length;
    // Create a placeholder like _0_______ that matches the total length of [colName]
    // Identifiers in jsep can start with _ and contain digits
    let placeholder = `_${index}_`;
    if (placeholder.length < match.length) {
      placeholder = placeholder.padEnd(match.length, '_');
    } else if (placeholder.length > match.length) {
      // Fallback if match is extremely short (e.g. [])
      placeholder = placeholder.substring(0, match.length);
    }

    colMatches.push({ placeholder, colName });
    return placeholder;
  });

  try {
    const ast = jsep(processedExpr.trim());

    // Post-process AST to restore original column names
    if (colMatches.length > 0) {
      restoreColumnNames(ast, colMatches);
    }

    return ast;
  } catch (error) {
    // jsep throws errors with index property for position
    throw {
      message: error.message,
      position: error.index || 0,
      expression: expression,
    };
  }
}

/**
 * Recursively walk AST and restore column names from placeholders
 * @param {Object} node
 * @param {Array} colMatches
 */
function restoreColumnNames(node, colMatches) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'Identifier') {
    const match = colMatches.find((m) => m.placeholder === node.name);
    if (match) {
      node.name = match.colName;
    }
  }

  // Handle all possible child nodes
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
