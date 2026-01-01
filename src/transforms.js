/**
 * Chumak Transform Engine
 *
 * Minimal Phase 1 implementation - just enough to get started
 * Applies transform specifications to Arquero tables
 */

// Note: Arquero is loaded globally as window.aq from CDN

/**
 * Match columns based on pattern (prefix/suffix/exact)
 * @param {Array<string>} columns - All column names
 * @param {Object} options - Pattern matching options
 * @param {string} options.pattern - Pattern to match
 * @param {string} options.matchType - 'prefix', 'suffix', or 'exact'
 * @param {string} options.mode - 'include' or 'exclude'
 * @returns {Array<string>} Filtered column names
 */
function matchColumnPattern(columns, options) {
  const { pattern, matchType, mode } = options;

  // If pattern is empty, return all columns for include mode, none for exclude
  if (!pattern || pattern.trim() === '') {
    return mode === 'include' ? [...columns] : [];
  }

  let matched = [];

  if (matchType === 'prefix') {
    matched = columns.filter(col => col.startsWith(pattern));
  } else if (matchType === 'suffix') {
    matched = columns.filter(col => col.endsWith(pattern));
  } else if (matchType === 'exact') {
    matched = columns.filter(col => col === pattern);
  }

  // Return matched or inverse based on mode
  if (mode === 'include') {
    return matched;
  } else {
    return columns.filter(col => !matched.includes(col));
  }
}

/**
 * Apply a single transform to an Arquero table
 * @param {Object} table - Arquero table
 * @param {Object} transform - Transform specification
 * @param {Array<string>} schema - Column names for validation
 * @param {Object} context - Workflow context for joins (optional)
 * @param {Array} context.sources - All sources in workflow
 * @param {Array} context.models - All models in workflow
 * @returns {Object} Transformed Arquero table
 * @throws {Error} If transform fails
 */
function applyTransform(table, transform, schema, context = null) {
  const start = performance.now();

  // SELECT: Keep only specified columns
  if (transform.select) {
    const result = table.select(...transform.select);
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
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

    const result = aq.from(filteredRows);
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
  }

  // JOIN: Join with another model or source
  if (transform.join) {
    if (!context || !context.sources || !context.models) {
      throw new Error('Join requires workflow context (sources and models)');
    }

    const { right, on, how, suffixes } = transform.join;

    // Find the right table (can be a model or a source)
    let rightTable = null;
    let rightName = 'unknown';

    // Try to find in models first
    const rightModel = context.models.find(m => m.id === right);
    if (rightModel) {
      rightTable = aq.from(rightModel.data);
      rightName = rightModel.name;
    } else {
      // Try to find in sources
      const rightSource = context.sources.find(s => s.id === right);
      if (rightSource) {
        rightTable = aq.from(rightSource.data);
        rightName = rightSource.name;
      }
    }

    if (!rightTable) {
      throw new Error(`Join target '${right}' not found in models or sources`);
    }

    // Build join keys
    // on: [["leftKey", "rightKey"], ["leftKey2", "rightKey2"], ...]
    const leftKeys = on.map(pair => pair[0]);
    const rightKeys = on.map(pair => pair[1]);

    // Determine join method based on 'how'
    let result;
    const joinSuffixes = suffixes || ['_x', '_y'];

    try {
      if (how === 'inner' || !how) {
        result = table.join(rightTable, leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys], null, { suffix: joinSuffixes });
      } else if (how === 'left') {
        result = table.join_left(rightTable, leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys], null, { suffix: joinSuffixes });
      } else if (how === 'right') {
        result = table.join_right(rightTable, leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys], null, { suffix: joinSuffixes });
      } else if (how === 'full') {
        result = table.join_full(rightTable, leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys], null, { suffix: joinSuffixes });
      } else if (how === 'cross') {
        result = table.cross(rightTable, null, { suffix: joinSuffixes });
      } else {
        throw new Error(`Unknown join type: ${how}`);
      }
    } catch (error) {
      throw new Error(`Join failed: ${error.message}`);
    }

    perfLogger.log(describeTransform(transform, rightName), table, result, performance.now() - start);
    return result;
  }

  // TODO: Add more transforms
  // - derive (needs expression parser)
  // - sort, rename, remove, etc.

  const transformType = Object.keys(transform)[0];
  throw new Error(`Transform type '${transformType}' not implemented yet`);
}

/**
 * Generate human-readable description for steps list
 * @param {Object} transform - Transform specification
 * @param {string} rightName - Name of right table (for joins)
 * @returns {string} Description text
 */
function describeTransform(transform, rightName = null) {
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

  if (transform.join) {
    const how = transform.join.how || 'inner';
    const name = rightName || 'table';
    return `Join (${how}): ${name}`;
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
