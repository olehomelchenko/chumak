/**
 * Chumak Schema Engine
 *
 * Handles granular type inference and schema propagation through transformation steps.
 */

const SchemaEngine = {
  /**
   * Infer granular type from an array of values
   * @param {Array} values - Sample values from a column
   * @returns {string} One of: 'string', 'integer', 'float', 'boolean', 'date', 'datetime'
   */
  inferType(values) {
    if (!values || values.length === 0) return 'string';

    // Filter out nulls/undefined/empty strings for type inference
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 'string';

    // 1. Check for Boolean (standard JS type from PapaParse dynamicTyping)
    if (nonNullValues.every((v) => typeof v === 'boolean')) {
      return 'boolean';
    }

    // 2. Check for Numeric
    if (nonNullValues.every((v) => typeof v === 'number')) {
      const allIntegers = nonNullValues.every((v) => Number.isInteger(v));
      return allIntegers ? 'integer' : 'float';
    }

    // 3. Check for Date/DateTime (strings matching patterns)
    if (nonNullValues.every((v) => typeof v === 'string')) {
      // ISO DateTime: 2024-01-01T12:00:00...
      // ISO DateTime: 2024-01-01T12:00:00... OR SQL: 2024-01-01 12:00:00...
      const isDateTime = nonNullValues.every((v) =>
        /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(v)
      );
      if (isDateTime) return 'datetime';

      // Simple Date: 2024-01-01 or 2024/01/01
      const isDate = nonNullValues.every((v) => /^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(v));
      if (isDate) return 'date';

      // American Date: MM/DD/YYYY or M/D/YYYY
      const isAmericanDate = nonNullValues.every((v) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v));
      if (isAmericanDate) return 'date';
    }

    // Default to string
    return 'string';
  },

  /**
   * Create initial schema for a raw dataset
   * @param {Array<Object>} data - Array of row objects
   * @returns {Array<Object>} Array of ColumnSchema objects
   */
  createInitialSchema(data) {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0]);
    return columns.map((name, index) => {
      const sample = data.slice(0, 20).map((row) => row[name]);
      return {
        name,
        type: this.inferType(sample),
        format: {}, // Placeholder for future use
        originalPosition: index,
      };
    });
  },

  /**
   * Calculate resulting schema after applying a transform to a model
   * @param {Array<Object>} currentSchema - Current ColumnSchema array
   * @param {Object} transform - Transform step specification
   * @param {Array<Object>} sampleData - Sample of the data AFTER transform (for type inference of new columns)
   * @returns {Array<Object>} New ColumnSchema array
   */
  deriveNextSchema(currentSchema, transform, sampleData = []) {
    // 1. SELECT: Keep only specified columns
    if (transform.select) {
      return transform.select.map((name) => {
        const existing = currentSchema.find((c) => c.name === name);
        return existing ? { ...existing } : { name, type: 'string', format: {} };
      });
    }

    // 2. REMOVE: Drop specified columns
    if (transform.remove) {
      return currentSchema.filter((c) => !transform.remove.includes(c.name));
    }

    // 3. RENAME: Update column names
    if (transform.rename) {
      return currentSchema.map((c) => {
        const newName = transform.rename[c.name];
        if (newName) {
          return { ...c, name: newName };
        }
        return { ...c };
      });
    }

    // 4. DERIVE: Add new columns
    if (transform.derive) {
      const nextSchema = [...currentSchema];
      for (const newColName of Object.keys(transform.derive)) {
        // If column exists, we overwrite it, otherwise append
        const existingIndex = nextSchema.findIndex((c) => c.name === newColName);

        // Get sample values for type inference if available
        const sampleValues = sampleData.map((row) => row[newColName]);
        const type = sampleValues.length > 0 ? this.inferType(sampleValues) : 'string';

        const newColSchema = {
          name: newColName,
          type: type,
          format: {},
          originalPosition:
            existingIndex !== -1 ? nextSchema[existingIndex].originalPosition : nextSchema.length,
        };

        if (existingIndex !== -1) {
          nextSchema[existingIndex] = newColSchema;
        } else {
          nextSchema.push(newColSchema);
        }
      }
      return nextSchema;
    }

    // 5. JOIN: Merge schemas from left and right tables
    if (transform.join) {
      // Note: Full join schema logic would require context of the right table's schema.
      // For now, we'll return the schema from the sample data as a simple approximation
      // if we're doing this during full propagation.
      if (sampleData && sampleData.length > 0) {
        const names = Object.keys(sampleData[0]);
        return names.map((name, i) => {
          const existing = currentSchema.find((c) => c.name === name);
          if (existing) return { ...existing };

          const sample = sampleData.slice(0, 20).map((row) => row[name]);
          return {
            name,
            type: this.inferType(sample),
            format: {},
            originalPosition: i,
          };
        });
      }
    }

    // 6. TYPES: Update column types
    if (transform.types) {
      return currentSchema.map((c) => {
        if (transform.types[c.name]) {
          return { ...c, type: transform.types[c.name] };
        }
        return { ...c };
      });
    }

    // 7. AGGREGATE: New schema based on groups + rollups
    if (transform.aggregate) {
      const { groupby, rollup } = transform.aggregate;
      const newSchema = [];
      let pos = 0;

      // Add GroupBy columns
      if (groupby) {
        groupby.forEach((colName) => {
          const existing = currentSchema.find((c) => c.name === colName);
          newSchema.push(
            existing
              ? { ...existing, originalPosition: pos++ }
              : { name: colName, type: 'string', originalPosition: pos++ }
          );
        });
      }

      // Add Rollup columns
      if (rollup) {
        for (const [outName, expr] of Object.entries(rollup)) {
          // Infer type from function
          let type = 'float'; // Default to numeric
          const match = typeof expr === 'string' ? expr.match(/^op\.(\w+)\(/) : null;
          const funcName = match ? match[1] : 'unknown';

          if (['count', 'distinct', 'valid', 'invalid'].includes(funcName)) {
            type = 'integer';
          } else if (['first', 'last', 'min', 'max'].includes(funcName)) {
            // Inherit type from input column if possible
            // Parse col from expr: op.min('col')
            const colMatch = typeof expr === 'string' ? expr.match(/\(['"]?([^'"]+)['"]?\)/) : null;
            if (colMatch) {
              const inCol = colMatch[1];
              const existing = currentSchema.find((c) => c.name === inCol);
              if (existing) type = existing.type;
            }
          }

          newSchema.push({
            name: outName,
            type: type,
            format: {},
            originalPosition: pos++,
          });
        }
      }
      return newSchema;
    }

    // 8. FOLD (Unpivot)
    if (transform.fold) {
      const { columns, as } = transform.fold;
      const keyName = as && as[0] ? as[0] : 'key';
      const valueName = as && as[1] ? as[1] : 'value';

      // 1. Keep columns NOT in the fold list
      const newSchema = currentSchema.filter((c) => !columns.includes(c.name));
      let pos = newSchema.length;

      // 2. Add Key column
      // Keys come from headers, so usually string
      newSchema.push({
        name: keyName,
        type: 'string', // keys are column names
        format: {},
        originalPosition: pos++,
      });

      // 3. Add Value column
      // Infer from sample data if available
      let valType = 'string';
      if (sampleData && sampleData.length > 0) {
        const sampleValues = sampleData.map((row) => row[valueName]);
        valType = this.inferType(sampleValues);
      } else {
        // Fallback: try to guess from the folded columns in currentSchema
        // If all folded columns are integer, value is integer, etc.
        const foldedTypes = currentSchema
          .filter((c) => columns.includes(c.name))
          .map((c) => c.type);

        const uniqueTypes = [...new Set(foldedTypes)];
        if (uniqueTypes.length === 1) {
          valType = uniqueTypes[0];
        } else if (foldedTypes.every((t) => t === 'integer' || t === 'float')) {
          valType = 'float';
        } else {
          valType = 'string';
        }
      }

      newSchema.push({
        name: valueName,
        type: valType,
        format: {},
        originalPosition: pos++,
      });

      return newSchema;
    }

    // 9. SPLIT: Split column into multiple columns
    if (transform.split) {
      const { column, mode, keepOriginal, maxColumns } = transform.split;

      // Start with current schema
      let newSchema = [...currentSchema];

      // Remove original column if not keeping it
      if (!keepOriginal) {
        newSchema = newSchema.filter((c) => c.name !== column);
      }

      // Determine how many new columns are created
      let newColumnNames = [];
      if (sampleData && sampleData.length > 0) {
        // Infer from sample data
        const sampleColumns = Object.keys(sampleData[0]);
        // Find columns matching pattern: {column}_1, {column}_2, etc.
        newColumnNames = sampleColumns.filter((name) => name.startsWith(`${column}_`));
      } else {
        // Fallback: estimate based on mode
        // left/right are both normalized to produce a single column with _1 suffix
        if (mode === 'left' || mode === 'right') {
          newColumnNames = [`${column}_1`];
        } else if ((mode === 'firstN' || mode === 'lastN') && maxColumns) {
          for (let i = 1; i <= maxColumns; i++) {
            newColumnNames.push(`${column}_${i}`);
          }
        } else {
          // For spread mode without sample data, can't determine count
          // This will be corrected when schema is recalculated with data
          newColumnNames = [`${column}_1`];
        }
      }

      // Add new columns to schema
      let pos = newSchema.length;
      for (const newColName of newColumnNames) {
        // Infer type from sample data if available
        let type = 'string'; // Default for split columns
        if (sampleData && sampleData.length > 0) {
          const sampleValues = sampleData.map((row) => row[newColName]);
          type = this.inferType(sampleValues);
        }

        newSchema.push({
          name: newColName,
          type: type,
          format: {},
          originalPosition: pos++,
        });
      }

      return newSchema;
    }

    // Filters, Sorts, etc. don't change the schema
    return currentSchema.map((c) => ({ ...c }));
  },
};

// Export to window
window.SchemaEngine = SchemaEngine;
