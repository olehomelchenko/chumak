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
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        if (nonNullValues.length === 0) return 'string';

        // 1. Check for Boolean (standard JS type from PapaParse dynamicTyping)
        if (nonNullValues.every(v => typeof v === 'boolean')) {
            return 'boolean';
        }

        // 2. Check for Numeric
        if (nonNullValues.every(v => typeof v === 'number')) {
            const allIntegers = nonNullValues.every(v => Number.isInteger(v));
            return allIntegers ? 'integer' : 'float';
        }

        // 3. Check for Date/DateTime (strings matching patterns)
        if (nonNullValues.every(v => typeof v === 'string')) {
            // ISO DateTime: 2024-01-01T12:00:00...
            // ISO DateTime: 2024-01-01T12:00:00... OR SQL: 2024-01-01 12:00:00...
            const isDateTime = nonNullValues.every(v => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(v));
            if (isDateTime) return 'datetime';

            // Simple Date: 2024-01-01 or 2024/01/01
            const isDate = nonNullValues.every(v => /^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(v));
            if (isDate) return 'date';
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
            const sample = data.slice(0, 20).map(row => row[name]);
            return {
                name,
                type: this.inferType(sample),
                format: {}, // Placeholder for future use
                originalPosition: index
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
            return transform.select.map(name => {
                const existing = currentSchema.find(c => c.name === name);
                return existing ? { ...existing } : { name, type: 'string', format: {} };
            });
        }

        // 2. REMOVE: Drop specified columns
        if (transform.remove) {
            return currentSchema.filter(c => !transform.remove.includes(c.name));
        }

        // 3. RENAME: Update column names
        if (transform.rename) {
            return currentSchema.map(c => {
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
                const existingIndex = nextSchema.findIndex(c => c.name === newColName);

                // Get sample values for type inference if available
                const sampleValues = sampleData.map(row => row[newColName]);
                const type = sampleValues.length > 0 ? this.inferType(sampleValues) : 'string';

                const newColSchema = {
                    name: newColName,
                    type: type,
                    format: {},
                    originalPosition: existingIndex !== -1 ? nextSchema[existingIndex].originalPosition : nextSchema.length
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
                    const existing = currentSchema.find(c => c.name === name);
                    if (existing) return { ...existing };

                    const sample = sampleData.slice(0, 20).map(row => row[name]);
                    return {
                        name,
                        type: this.inferType(sample),
                        format: {},
                        originalPosition: i
                    };
                });
            }
        }

        // 6. TYPES: Update column types
        if (transform.types) {
            return currentSchema.map(c => {
                if (transform.types[c.name]) {
                    return { ...c, type: transform.types[c.name] };
                }
                return { ...c };
            });
        }

        // Filters, Sorts, etc. don't change the schema
        return currentSchema.map(c => ({ ...c }));
    }
};

// Export to window
window.SchemaEngine = SchemaEngine;
