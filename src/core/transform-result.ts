import { SchemaEngine, ColumnSchema, TransformStep } from './schema-engine';

/**
 * TransformResult - Contract ensuring transforms always return complete state
 */

/**
 * Check if two arrays contain the same elements in the same order
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface TransformResultData {
  data: any[];
  schema: ColumnSchema[];
  columns: string[];
}

export const TransformResult = {
  /**
   * Create a validated TransformResult from Arquero table
   */
  create(table: any, previousSchema: ColumnSchema[], transform: TransformStep): TransformResultData {
    const data = table.objects();
    const columns = table.columnNames();

    const sampleData = data.slice(0, 100);
    const schema = SchemaEngine.deriveNextSchema(previousSchema, transform, sampleData);

    const schemaNames = schema.map((c) => c.name);
    if (!arraysEqual(columns, schemaNames)) {
      console.warn('TransformResult: Schema/columns mismatch detected', {
        columns,
        schemaNames,
        transform: Object.keys(transform)[0],
      });
      return this.createFromData(data, previousSchema, transform);
    }

    return { data, schema, columns };
  },

  /**
   * Create result directly from data array
   */
  createFromData(data: any[], previousSchema: ColumnSchema[], transform: TransformStep): TransformResultData {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const sampleData = data.slice(0, 100);
    const schema = SchemaEngine.deriveNextSchema(previousSchema, transform, sampleData);

    const schemaNames = schema.map((c) => c.name);
    if (!arraysEqual(columns, schemaNames)) {
      console.warn('TransformResult: Creating fallback schema from columns', { columns });
      const fallbackSchema = columns.map((name, idx) => {
        const existing = previousSchema.find((c) => c.name === name);
        if (existing) return { ...existing };

        const sampleValues = sampleData.map((row) => row[name]);
        return {
          name,
          type: SchemaEngine.inferType(sampleValues),
          format: {},
          originalPosition: idx,
        } as ColumnSchema;
      });
      return { data, schema: fallbackSchema, columns };
    }

    return { data, schema, columns };
  },

  /**
   * Validate that a result object has the expected structure
   */
  validate(result: TransformResultData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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

    const schemaNames = result.schema.map((c) => c.name);
    if (!arraysEqual(result.columns, schemaNames)) {
      errors.push(
        `Columns/schema mismatch: columns=[${result.columns.join(',')}] vs schema=[${schemaNames.join(',')}]`
      );
    }

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
