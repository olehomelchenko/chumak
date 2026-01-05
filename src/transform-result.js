/**
 * TransformResult - Contract ensuring transforms always return complete state
 *
 * Every transform operation MUST return this structure to guarantee
 * schema, data, and columns are always in sync.
 *
 * This module centralizes the logic for creating transform results,
 * ensuring that schema derivation always receives sample data.
 */

/**
 * Check if two arrays contain the same elements in the same order
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {boolean}
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const TransformResult = {
  /**
   * Create a validated TransformResult from Arquero table
   *
   * @param {Object} table - Arquero table result from applyTransform
   * @param {Array} previousSchema - Schema before this transform
   * @param {Object} transform - The transform that was applied
   * @returns {Object} { data: Array, schema: Array, columns: Array }
   */
  create(table, previousSchema, transform) {
    const data = table.objects();
    const columns = table.columnNames();

    // Always derive schema with sample data - this is the key fix
    // Previously, some code paths didn't provide sample data
    const sampleData = data.slice(0, 20);
    const schema = SchemaEngine.deriveNextSchema(previousSchema, transform, sampleData);

    // Validate: columns must match schema
    const schemaNames = schema.map((c) => c.name);
    if (!arraysEqual(columns, schemaNames)) {
      console.warn('TransformResult: Schema/columns mismatch detected', {
        columns,
        schemaNames,
        transform: Object.keys(transform)[0],
      });
      // Self-heal: recreate schema from actual data
      return this.createFromData(data, previousSchema, transform);
    }

    return { data, schema, columns };
  },

  /**
   * Create result directly from data array (fallback/pass-through transforms)
   *
   * @param {Array} data - Array of row objects
   * @param {Array} previousSchema - Schema before this transform
   * @param {Object} transform - The transform that was applied
   * @returns {Object} { data: Array, schema: Array, columns: Array }
   */
  createFromData(data, previousSchema, transform) {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const sampleData = data.slice(0, 20);
    const schema = SchemaEngine.deriveNextSchema(previousSchema, transform, sampleData);

    // Final validation - ensure schema matches actual columns
    const schemaNames = schema.map((c) => c.name);
    if (!arraysEqual(columns, schemaNames)) {
      // Last resort: build schema directly from column names
      console.warn('TransformResult: Creating fallback schema from columns', { columns });
      const fallbackSchema = columns.map((name, idx) => {
        // Try to find existing schema entry
        const existing = previousSchema.find((c) => c.name === name);
        if (existing) return { ...existing };

        // Infer type from sample data
        const sampleValues = sampleData.map((row) => row[name]);
        return {
          name,
          type: SchemaEngine.inferType(sampleValues),
          format: {},
          originalPosition: idx,
        };
      });
      return { data, schema: fallbackSchema, columns };
    }

    return { data, schema, columns };
  },

  /**
   * Validate that a result object has the expected structure
   * Used for debugging and testing
   *
   * @param {Object} result - Result to validate
   * @returns {Object} { valid: boolean, errors: Array<string> }
   */
  validate(result) {
    const errors = [];

    if (!result) {
      errors.push('Result is null or undefined');
      return { valid: false, errors };
    }

    if (!Array.isArray(result.data)) {
      errors.push('result.data is not an array');
    }

    if (!Array.isArray(result.schema)) {
      errors.push('result.schema is not an array');
    }

    if (!Array.isArray(result.columns)) {
      errors.push('result.columns is not an array');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Check schema-columns alignment
    const schemaNames = result.schema.map((c) => c.name);
    if (!arraysEqual(result.columns, schemaNames)) {
      errors.push(
        `Columns/schema mismatch: columns=[${result.columns.join(',')}] vs schema=[${schemaNames.join(',')}]`
      );
    }

    // Check data-columns alignment (if data exists)
    if (result.data.length > 0) {
      const dataColumns = Object.keys(result.data[0]);
      if (!arraysEqual(result.columns, dataColumns)) {
        errors.push(
          `Columns/data mismatch: columns=[${result.columns.join(',')}] vs data=[${dataColumns.join(',')}]`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  },
};

// Export to window for browser usage
window.TransformResult = TransformResult;
