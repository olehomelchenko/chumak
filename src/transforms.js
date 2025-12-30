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
 * @returns {Object} Transformed Arquero table
 */
function applyTransform(table, transform) {
  // Phase 1: Support only 'select' transform (simplest)
  if (transform.select) {
    return table.select(...transform.select);
  }

  // TODO: Add more transforms incrementally
  // - filter (needs expression parser)
  // - derive (needs expression parser)
  // - sort, rename, remove, etc.

  throw new Error(`Transform type not implemented yet`);
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
