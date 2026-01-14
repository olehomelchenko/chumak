/**
 * Chumak Schema Engine
 *
 * Handles granular type inference and schema propagation through transformation steps.
 */

export type ColumnType = 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime';

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  format?: Record<string, any>;
  originalPosition?: number;
}

export interface TransformStep {
  select?: string[];
  remove?: string[];
  rename?: Record<string, string>;
  derive?: Record<string, string>;
  filter?: string;
  sort?: { field: string; order: 'asc' | 'desc' };
  replace?: { column: string; find: any; replace: any };
  dedupe?: { columns?: string[]; mode?: 'remove' | 'keep' };
  join?: any;
  import?: {
    source: string;
    fileName: string;
    delimiter: string;
    headerMode: string;
    customHeaders?: string[];
  };
  types?: Record<string, ColumnType>;
  aggregate?: {
    groupby: string[];
    rollup: Record<string, string>;
  };
  fold?: {
    columns: string[];
    as: [string, string];
  };
  pivot?: {
    rows?: string[];
    keys: string;
    values: string;
    aggregation: string;
    options?: {
      sort?: boolean;
      limit?: number;
    };
  };
  split?: {
    column: string;
    mode: 'left' | 'right' | 'firstN' | 'lastN' | 'spread';
    keepOriginal: boolean;
    maxColumns?: number;
    delimiter: string;
    isRegex?: boolean;
  };
}

export const SchemaEngine = {
  /**
   * Infer granular type from an array of values
   * @param {any[]} values - Sample values from a column
   * @returns {ColumnType}
   */
  inferType(values: any[] | null | undefined): ColumnType {
    if (!values || values.length === 0) return 'string';

    // Filter out nulls/undefined/empty strings for type inference
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 'string';

    // 1. Check for Boolean (standard JS type from PapaParse dynamicTyping)
    if (nonNullValues.every((v) => typeof v === 'boolean')) {
      return 'boolean';
    }

    // 2. Check for Numeric (actual numbers)
    if (nonNullValues.every((v) => typeof v === 'number')) {
      const allIntegers = nonNullValues.every((v) => Number.isInteger(v));
      return allIntegers ? 'integer' : 'float';
    }

    // 3. Check for Numeric Strings (strings that parse cleanly as numbers)
    // Common after splitting date strings like "2024-01-15" -> ["2024", "01", "15"]
    if (nonNullValues.every((v) => typeof v === 'string')) {
      // Check if all strings are valid numbers (not NaN, not empty after trim)
      const allNumericStrings = nonNullValues.every((v) => {
        const trimmed = (v as string).trim();
        if (trimmed === '') return false;
        const num = Number(trimmed);
        return !isNaN(num) && isFinite(num);
      });

      if (allNumericStrings) {
        // Determine if integers or floats
        const allIntegers = nonNullValues.every((v) => {
          const num = Number((v as string).trim());
          return Number.isInteger(num);
        });
        return allIntegers ? 'integer' : 'float';
      }
    }

    // 4. Check for Date/DateTime (strings matching patterns)
    if (nonNullValues.every((v) => typeof v === 'string')) {
      // ISO DateTime: 2024-01-01T12:00:00...
      // ISO DateTime: 2024-01-01T12:00:00... OR SQL: 2024-01-01 12:00:00...
      const isDateTime = nonNullValues.every((v) =>
        /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(v as string)
      );
      if (isDateTime) return 'datetime';

      // Simple Date: 2024-01-01 or 2024/01/01
      const isDate = nonNullValues.every((v) => /^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(v as string));
      if (isDate) return 'date';

      // American Date: MM/DD/YYYY or M/D/YYYY
      const isAmericanDate = nonNullValues.every((v) =>
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v as string)
      );
      if (isAmericanDate) return 'date';
    }

    // Default to string
    return 'string';
  },

  /**
   * Create initial schema for a raw dataset
   * @param {Record<string, any>[]} data - Array of row objects
   * @returns {ColumnSchema[]} Array of ColumnSchema objects
   */
  createInitialSchema(data: Record<string, any>[]): ColumnSchema[] {
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
   *
   * @param {ColumnSchema[]} currentSchema - Current ColumnSchema array
   * @param {TransformStep} transform - Transform step specification
   * @param {Record<string, any>[]} sampleData - Sample of the data AFTER transform
   * @returns {ColumnSchema[]} New ColumnSchema array
   */
  deriveNextSchema(
    currentSchema: ColumnSchema[],
    transform: TransformStep,
    sampleData: Record<string, any>[] = []
  ): ColumnSchema[] {
    // 1. SELECT: Keep only specified columns
    if (transform.select) {
      return transform.select.map((name) => {
        const existing = currentSchema.find((c) => c.name === name);
        return existing ? { ...existing } : { name, type: 'string', format: {} };
      });
    }

    // 2. REMOVE: Drop specified columns
    if (transform.remove) {
      return currentSchema.filter((c) => !transform.remove!.includes(c.name));
    }

    // 3. RENAME: Update column names
    if (transform.rename) {
      const renameMap = transform.rename;
      return currentSchema.map((c) => {
        const newName = renameMap[c.name];
        if (newName) {
          return { ...c, name: newName };
        }
        return { ...c };
      });
    }

    // 4. DERIVE: Add new columns
    if (transform.derive) {
      if (!sampleData || sampleData.length === 0) {
        console.warn(
          'SchemaEngine: Sample data missing for derive transform, cannot infer new column types'
        );
      }
      const nextSchema = [...currentSchema];
      for (const newColName of Object.keys(transform.derive)) {
        // If column exists, we overwrite it, otherwise append
        const existingIndex = nextSchema.findIndex((c) => c.name === newColName);

        // Get sample values for type inference if available
        const sampleValues = sampleData.map((row) => row[newColName]);
        const type = sampleValues.length > 0 ? this.inferType(sampleValues) : 'string';

        const newColSchema: ColumnSchema = {
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
      const typesMap = transform.types;
      return currentSchema.map((c) => {
        if (typesMap[c.name]) {
          return { ...c, type: typesMap[c.name] };
        }
        return { ...c };
      });
    }

    // 7. AGGREGATE: New schema based on groups + rollups
    if (transform.aggregate) {
      const { groupby, rollup } = transform.aggregate;
      const newSchema: ColumnSchema[] = [];
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
          let type: ColumnType = 'float'; // Default to numeric
          const match = typeof expr === 'string' ? expr.match(/^op\.(\w+)\(/) : null;
          const funcName = match ? match[1] : 'unknown';

          if (['count', 'distinct', 'valid', 'invalid'].includes(funcName)) {
            type = 'integer';
          } else if (['first', 'last', 'min', 'max'].includes(funcName)) {
            // Inherit type from input column if possible
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
      newSchema.push({
        name: keyName,
        type: 'string',
        format: {},
        originalPosition: pos++,
      });

      // 3. Add Value column
      let valType: ColumnType = 'string';
      if (sampleData && sampleData.length > 0) {
        const sampleValues = sampleData.map((row) => row[valueName]);
        const inferred = this.inferType(sampleValues);

        if (inferred === 'string' && sampleValues.every((v) => v === null || v === undefined)) {
          // Sparse column or no values in sample - try to inherit from source columns
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
        } else {
          valType = inferred;
        }
      } else {
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

    // 9. PIVOT (Wide)
    if (transform.pivot) {
      const { rows, values, aggregation } = transform.pivot;

      // For pivot, we need sample data to know the new column names
      // since they come from the unique values of the key column
      if (sampleData && sampleData.length > 0) {
        const sampleColumns = Object.keys(sampleData[0]);
        const newSchema: ColumnSchema[] = [];
        let pos = 0;

        for (const colName of sampleColumns) {
          // Check if this is an existing column (row identity from rows array)
          const existing = currentSchema.find((c) => c.name === colName);
          if (existing && rows?.includes(colName)) {
            newSchema.push({ ...existing, originalPosition: pos++ });
          } else {
            // This is a pivoted column - determine type based on aggregation
            let type: ColumnType;
            const sampleValues = sampleData.map((row) => row[colName]);
            if (['count'].includes(aggregation)) {
              type = 'integer';
            } else if (
              ['sum', 'mean', 'avg', 'median', 'stdev', 'variance'].includes(aggregation)
            ) {
              type = 'float';
            } else {
              const inferred = this.inferType(sampleValues);
              if (
                inferred === 'string' &&
                sampleValues.every((v) => v === null || v === undefined)
              ) {
                // Sparse column - fallback to values column type
                const valCol = currentSchema.find((c) => c.name === values);
                type = valCol ? valCol.type : 'string';
              } else {
                type = inferred;
              }
            }

            newSchema.push({
              name: colName,
              type,
              format: {},
              originalPosition: pos++,
            });
          }
        }

        return newSchema;
      }

      // Fallback: keep row columns, can't determine pivoted columns without data
      const rowCols = rows || [];
      const newSchema = currentSchema.filter((c) => rowCols.includes(c.name));
      return newSchema.map((c, i) => ({ ...c, originalPosition: i }));
    }

    // 10. SPLIT: Split column into multiple columns
    if (transform.split) {
      const { column, mode, keepOriginal, maxColumns } = transform.split;

      let newSchema = [...currentSchema];

      if (!keepOriginal) {
        newSchema = newSchema.filter((c) => c.name !== column);
      }

      let newColumnNames: string[] = [];
      if (sampleData && sampleData.length > 0) {
        const sampleColumns = Object.keys(sampleData[0]);
        newColumnNames = sampleColumns.filter((name) => name.startsWith(`${column}_`));
      } else {
        if (mode === 'left' || mode === 'right') {
          newColumnNames = [`${column}_1`];
        } else if ((mode === 'firstN' || mode === 'lastN') && maxColumns) {
          for (let i = 1; i <= maxColumns; i++) {
            newColumnNames.push(`${column}_${i}`);
          }
        } else {
          newColumnNames = [`${column}_1`];
        }
      }

      let pos = newSchema.length;
      for (const newColName of newColumnNames) {
        let type: ColumnType = 'string';
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

    return currentSchema.map((c) => ({ ...c }));
  },
};
