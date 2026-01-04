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
    matched = columns.filter((col) => col.startsWith(pattern));
  } else if (matchType === 'suffix') {
    matched = columns.filter((col) => col.endsWith(pattern));
  } else if (matchType === 'exact') {
    matched = columns.filter((col) => col === pattern);
  }

  // Return matched or inverse based on mode
  if (mode === 'include') {
    return matched;
  } else {
    return columns.filter((col) => !matched.includes(col));
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
    const filteredRows = rows.filter((row) => {
      try {
        return interpretAST(ast, row);
      } catch (error) {
        console.error('Filter interpretation error for row:', error, row);
        return false; // Exclude row on error
      }
    });

    // Preserve column structure even if result is empty
    // Create an empty row with all columns set to undefined if no rows match
    let result;
    if (filteredRows.length === 0 && rows.length > 0) {
      const emptyRow = {};
      table.columnNames().forEach((col) => (emptyRow[col] = undefined));
      result = aq.from([emptyRow]).filter((d) => false); // Empty table with columns preserved
    } else {
      result = aq.from(filteredRows);
    }

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

    // Try to find in models first (by ID or name)
    const rightModel = context.models.find((m) => m.id === right || m.name === right);
    if (rightModel) {
      rightTable = aq.from(rightModel.data);
      rightName = rightModel.name;
    } else {
      // Try to find in sources (by ID or name)
      const rightSource = context.sources.find((s) => s.id === right || s.name === right);
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
    const leftKeys = on.map((pair) => pair[0]);
    const rightKeys = on.map((pair) => pair[1]);

    // Determine join method based on 'how'
    let result;
    const joinSuffixes = suffixes || ['_x', '_y'];

    try {
      if (how === 'inner' || !how) {
        result = table.join(
          rightTable,
          leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys],
          null,
          { suffix: joinSuffixes }
        );
      } else if (how === 'left') {
        result = table.join_left(
          rightTable,
          leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys],
          null,
          { suffix: joinSuffixes }
        );
      } else if (how === 'right') {
        result = table.join_right(
          rightTable,
          leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys],
          null,
          { suffix: joinSuffixes }
        );
      } else if (how === 'full') {
        result = table.join_full(
          rightTable,
          leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys],
          null,
          { suffix: joinSuffixes }
        );
      } else if (how === 'cross') {
        result = table.cross(rightTable, null, { suffix: joinSuffixes });
      } else {
        throw new Error(`Unknown join type: ${how}`);
      }
    } catch (error) {
      throw new Error(`Join failed: ${error.message}`);
    }

    perfLogger.log(
      describeTransform(transform, rightName),
      table,
      result,
      performance.now() - start
    );
    return result;
  }

  // DERIVE: Create new columns from expressions
  if (transform.derive) {
    const derivations = transform.derive;
    let resultRows = table.objects();

    for (const [newCol, expression] of Object.entries(derivations)) {
      const ast = parseExpression(expression);
      const validation = validateAST(ast, schema);
      if (!validation.valid) {
        throw new Error(
          `Derive validation failed for '${newCol}':\n${formatError(validation.error, expression)}`
        );
      }

      resultRows = resultRows.map((row) => {
        try {
          // Use a spread to avoid mutating the original row if possible,
          // though since we did .objects() we are already working on copies.
          const val = interpretAST(ast, row);
          return { ...row, [newCol]: val };
        } catch (error) {
          console.error(`Derive error for column '${newCol}' on row:`, error, row);
          return { ...row, [newCol]: { type: 'error', message: error.message } };
        }
      });
    }

    const result = aq.from(resultRows);
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
  }

  // SORT: Sort by column(s)
  if (transform.sort) {
    const { field, order } = transform.sort;
    const result = order === 'desc' ? table.orderby(aq.desc(field)) : table.orderby(field);
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
  }

  // RENAME: Rename columns
  if (transform.rename) {
    const result = table.rename(transform.rename);
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
  }

  // REMOVE: Drop columns
  if (transform.remove) {
    const result = table.select(aq.not(...transform.remove));
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
  }

  // AGGREGATE: Group and Summarize
  if (transform.aggregate) {
    const { groupby, rollup } = transform.aggregate;
    const op = aq.op;

    // 1. Grouping
    let groupedTable = table;
    if (groupby && groupby.length > 0) {
      groupedTable = table.groupby(groupby);
    }

    // 2. Rollup (Aggregations)
    // We need to convert our JSON string expressions (e.g., "op.mean('sales')")
    // into actual Arquero table expressions.
    const rollupSpecs = {};
    const floatCols = [];

    for (const [outCol, exprString] of Object.entries(rollup)) {
      // Simple parser for Phase 1: matches "op.func('col')" or "op.func()"
      // Regex matches: op.funcName( 'columnName' ) or op.funcName()
      const match = exprString.match(/^op\.(\w+)\((?:'([^']+)'|"?([^"]+)"?)?\)$/);

      if (!match) {
        throw new Error(
          `Invalid aggregation expression: "${exprString}". Supported format: op.mean('col')`
        );
      }

      const funcName = match[1]; // e.g., 'mean'
      const colName = match[2] || match[3]; // e.g., 'sales', or undefined for count()

      if (!op[funcName]) {
        throw new Error(`Unknown aggregation function: op.${funcName}`);
      }

      // Construct Arquero expression
      if (colName) {
        rollupSpecs[outCol] = op[funcName](colName);
      } else {
        rollupSpecs[outCol] = op[funcName]();
      }

      // Track columns that might produce floating point artifacts
      if (['mean', 'average', 'avg', 'sum', 'stdev', 'variance', 'median'].includes(funcName)) {
        floatCols.push(outCol);
      }
    }

    const result = groupedTable.rollup(rollupSpecs);

    // If grouped, Arquero returns a grouped table. Usually we want a flat table for the next steps/display.
    // .ungroup() is implicitly done by rollup if it creates a new table structure,
    // but explicit ungroup ensures it's a standard table.
    // However, rollup() output is usually flat unless it was preserved.
    // Arquero docs say: "The output table persists a groupby specification."
    // So we should ungroup to treat it as a new flat source.
    let flatResult = result.ungroup();

    // 3. Post-process floating point errors
    // Mitigate precision issues (e.g. 19999.99999999996) by rounding to 9 decimal places
    if (floatCols.length > 0) {
      const cleanups = {};
      floatCols.forEach((col) => {
        // cleanup: round(val * 1e9) / 1e9
        cleanups[col] = aq.escape((d) => {
          const val = d[col];
          return typeof val === 'number' ? Math.round(val * 1e9) / 1e9 : val;
        });
      });
      flatResult = flatResult.derive(cleanups);
    }

    perfLogger.log(describeTransform(transform), table, flatResult, performance.now() - start);
    return flatResult;
  }

  // TYPES: Metadata-only step for Phase 1 (pass-through)
  if (transform.types) {
    // In Phase 1, data types are inferred at import time.
    // This step serves as explicit documentation of those types in the workflow.
    // In Phase 3, this could handle actual type casting.
    perfLogger.log(describeTransform(transform), table, table, performance.now() - start);
    return table;
  }

  // FOLD (Unpivot): Convert columns to rows
  if (transform.fold) {
    const { columns, as } = transform.fold;

    // Arquero fold: table.fold(columns, { as: [key, value] })
    // columns is array of column names to fold
    const options = as ? { as } : undefined;

    const result = table.fold(columns, options);
    perfLogger.log(describeTransform(transform), table, result, performance.now() - start);
    return result;
  }

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

  if (transform.fold) {
    const { columns, as } = transform.fold;
    const count = columns.length;
    let desc = `Unpivot: ${count} column${count !== 1 ? 's' : ''}`;

    if (as && as.length === 2) {
      desc += ` -> ${as[0]}, ${as[1]}`;
    }

    return desc;
  }

  if (transform.types) {
    const count = Object.keys(transform.types).length;
    return `Detect types: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.select) {
    const count = transform.select.length;
    return `Select: ${count} column${count !== 1 ? 's' : ''}`;
  }

  if (transform.filter) {
    const expr = transform.filter;
    // Simple truncation for long expressions
    const displayExpr = expr.length > 30 ? expr.substring(0, 27) + '...' : expr;
    return `Filter: ${displayExpr}`;
  }

  if (transform.join) {
    const how = transform.join.how || 'inner';
    const name = rightName || (transform.join.right.startsWith('mdl_') ? 'model' : 'source');
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

  if (transform.aggregate) {
    const { groupby, rollup } = transform.aggregate;
    const groups = groupby && groupby.length > 0 ? groupby.join(', ') : 'All rows';
    const aggs = Object.keys(rollup).length;
    return `Aggregate: by[${groups}], ${aggs} summar${aggs !== 1 ? 'y' : 'ies'}`;
  }

  if (transform.remove) {
    return `Remove: ${transform.remove.length} column${transform.remove.length !== 1 ? 's' : ''}`;
  }

  return 'Unknown transform';
}
