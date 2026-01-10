import { describe, it, expect, vi } from 'vitest';
import * as aq from 'arquero';
import { SchemaEngine } from './schema-engine';
import { applyTransform } from './transforms';
import { TransformResult } from './transform-result';

describe('Transform-Schema-UI Integration', () => {
  // Helper to create test data
  function createTestData() {
    return [
      { name: 'Alice,Smith', sales: 1000, revenue: 5000, cost: 3000, region: 'North' },
      { name: 'Bob,Jones', sales: 1500, revenue: 7000, cost: 4000, region: 'South' },
      { name: 'Carol,Brown', sales: 800, revenue: 4000, cost: 2500, region: 'East' },
    ];
  }

  function createInitialSchema() {
    return [
      { name: 'name', type: 'string', format: {}, originalPosition: 0 },
      { name: 'sales', type: 'integer', format: {}, originalPosition: 1 },
      { name: 'revenue', type: 'integer', format: {}, originalPosition: 2 },
      { name: 'cost', type: 'integer', format: {}, originalPosition: 3 },
      { name: 'region', type: 'string', format: {}, originalPosition: 4 },
    ] as any;
  }

  describe('TransformResult Contract', () => {
    it('should create valid result from Arquero table', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = (aq as any).from(data);
      const transform = { filter: 'sales > 900' };

      const result = TransformResult.create(table, schema, transform);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('schema');
      expect(result).toHaveProperty('columns');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should keep columns and schema in sync', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = (aq as any).from(data);
      const transform = { select: ['name', 'sales'] };

      const selectedTable = applyTransform(
        table,
        transform,
        schema.map((c: any) => c.name)
      );
      const result = TransformResult.create(selectedTable, schema, transform);

      const schemaNames = result.schema.map((c: any) => c.name);
      expect(result.columns).toEqual(schemaNames);
    });
  });

  describe('Split Transform Schema Propagation', () => {
    it('should update schema with new columns after split', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = (aq as any).from(data);
      const columns = schema.map((c: any) => c.name);

      const transform = {
        split: {
          column: 'name',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      expect(result.columns).toContain('name_1');
      expect(result.columns).toContain('name_2');
      expect(result.columns).not.toContain('name');

      const schemaNames = result.schema.map((c: any) => c.name);
      expect(schemaNames).toContain('name_1');
    });
  });

  describe('Derive Transform Schema Propagation', () => {
    it('should detect integer type for integer arithmetic', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = (aq as any).from(data);
      const columns = schema.map((c: any) => c.name);

      const transform = { derive: { profit: 'revenue - cost' } };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      expect(result.columns).toContain('profit');

      const profitSchema = result.schema.find((c: any) => c.name === 'profit');
      expect(profitSchema).toBeDefined();
      expect(profitSchema.type).toBe('integer');
    });
  });

  describe('Multi-Step Pipeline', () => {
    it('should maintain schema consistency through multiple transforms', () => {
      const data = createTestData();
      let schema = createInitialSchema();
      let table = (aq as any).from(data);

      // Step 1: Filter
      const filter = { filter: 'sales > 500' };
      table = applyTransform(
        table,
        filter,
        schema.map((c: any) => c.name)
      );
      let result = TransformResult.create(table, schema, filter);
      schema = result.schema;

      expect(TransformResult.validate(result).valid).toBe(true);

      // Step 2: Derive
      const derive = { derive: { profit: 'revenue - cost' } };
      table = (aq as any).from(result.data);
      table = applyTransform(
        table,
        derive,
        schema.map((c: any) => c.name)
      );
      result = TransformResult.create(table, schema, derive);
      schema = result.schema;

      expect(TransformResult.validate(result).valid).toBe(true);
      expect(result.columns).toContain('profit');

      // Step 3: Select
      const select = { select: ['region', 'profit'] };
      table = (aq as any).from(result.data);
      table = applyTransform(
        table,
        select,
        schema.map((c: any) => c.name)
      );
      result = TransformResult.create(table, schema, select);

      expect(TransformResult.validate(result).valid).toBe(true);
      expect(result.columns).toEqual(['region', 'profit']);
    });
  });

  describe('SchemaEngine Validation', () => {
    it('should warn when sample data is missing for derive transform', () => {
      const schema = createInitialSchema();
      const transform = { derive: { profit: 'revenue - cost' } };

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      SchemaEngine.deriveNextSchema(schema, transform, []);

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Sample data missing'));
      spy.mockRestore();
    });
  });
});
