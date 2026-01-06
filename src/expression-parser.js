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
 * Replace bracket notation [ColumnName] only when outside string literals.
 * This prevents corruption of regex patterns inside strings like "^[A-Z]+"
 * @param {string} expression - The expression string
 * @param {Function} replacer - Function(fullMatch, innerContent) => replacement
 * @returns {string} Expression with brackets replaced outside strings
 */
function replaceBracketsOutsideStrings(expression, replacer) {
  let result = '';
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    // Handle string literals - copy them verbatim
    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      // Find closing quote, respecting escapes
      while (j < expression.length) {
        if (expression[j] === '\\' && j + 1 < expression.length) {
          j += 2; // Skip escaped character
        } else if (expression[j] === quote) {
          j++; // Include closing quote
          break;
        } else {
          j++;
        }
      }
      result += expression.slice(i, j);
      i = j;
      continue;
    }

    // Handle bracket notation outside strings
    if (char === '[') {
      const closeBracket = expression.indexOf(']', i);
      if (closeBracket !== -1) {
        const fullMatch = expression.slice(i, closeBracket + 1);
        const innerContent = expression.slice(i + 1, closeBracket);
        result += replacer(fullMatch, innerContent);
        i = closeBracket + 1;
        continue;
      }
    }

    // Regular character
    result += char;
    i++;
  }

  return result;
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
  // ONLY outside of string literals (don't corrupt regex patterns like "^[A-Z]+")
  const colMatches = [];
  const processedExpr = replaceBracketsOutsideStrings(expression, (match, colName) => {
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
