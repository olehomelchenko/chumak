/**
 * Chumak Transform Engine
 *
 * Minimal Phase 1 implementation - just enough to get started
 * Applies transform specifications to Arquero tables
 */

// Note: Arquero is loaded globally as window.aq from CDN

/**
 * Apply a single transform to an Arquero table
 * @param {Object} table - Arquero table
 * @param {Object} transform - Transform specification
 * @param {Array<string>} schema - Column names for validation
 * @returns {Object} Transformed Arquero table
 * @throws {Error} If transform fails
 */
function applyTransform(table, transform, schema) {
  // SELECT: Keep only specified columns
  if (transform.select) {
    return table.select(...transform.select);
  }

  // FILTER: Keep rows matching expression
  if (transform.filter) {
    const expression = transform.filter;

    // Parse expression
    const ast = parseExpression(expression);

    // Validate AST against schema
    const validation = validateAST(ast, schema);
    if (!validation.valid) {
      const errorMsg = formatError(validation.error, expression);
      throw new Error(`Filter validation failed:\n${errorMsg}`);
    }

    // Convert table to array, filter with our interpreter, convert back
    // (Arquero's filter doesn't support try-catch in functions)
    const rows = table.objects();
    const filteredRows = rows.filter(row => {
      try {
        return interpretAST(ast, row);
      } catch (error) {
        console.error('Filter interpretation error for row:', error, row);
        return false; // Exclude row on error
      }
    });

    return aq.from(filteredRows);
  }

  // TODO: Add more transforms
  // - derive (needs expression parser)
  // - sort, rename, remove, etc.

  throw new Error(`Transform type '${Object.keys(transform)[0]}' not implemented yet`);
}

/**
 * Generate human-readable description for steps list
 * @param {Object} transform - Transform specification
 * @returns {string} Description text
 */
function describeTransform(transform) {
  if (transform.import) {
    const config = transform.import;
    let desc = `Import: ${config.source}`;

    // Add header mode description
    if (config.headerMode === 'first-row') {
      desc += ' (headers from first row)';
    } else if (config.headerMode === 'auto-generate') {
      desc += ' (auto-generated headers)';
    } else if (config.headerMode === 'manual') {
      desc += ' (custom headers)';
    }

    return desc;
  }

  if (transform.select) {
    const count = transform.select.length;
    return `Select: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.filter) {
    // TODO: Pretty-print filter expression
    return 'Filter';
  }

  if (transform.derive) {
    const names = Object.keys(transform.derive);
    return `Derive: ${names.join(', ')}`;
  }

  if (transform.sort) {
    return `Sort: ${transform.sort.field}`;
  }

  if (transform.rename) {
    const count = Object.keys(transform.rename).length;
    return `Rename: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.remove) {
    return `Remove: ${transform.remove.length} column${transform.remove.length !== 1 ? 's' : ''}`;
  }

  return 'Unknown transform';
}
