import { describe, it, expect } from 'vitest';
import { SchemaEngine } from './schema-engine';

describe('Schema Engine', () => {
  describe('inferType()', () => {
    it('should infer integer', () => {
      const values = [1, 2, 3, 100];
      expect(SchemaEngine.inferType(values)).toBe('integer');
    });

    it('should infer float', () => {
      const values = [1.1, 2.2, 3.3, 100.001];
      expect(SchemaEngine.inferType(values)).toBe('float');
    });

    it('should infer boolean', () => {
      const values = [true, false, true];
      expect(SchemaEngine.inferType(values)).toBe('boolean');
    });

    it('should infer string when mixed', () => {
      // @ts-ignore - testing mixed values
      const values = [1, 'two', 3];
      expect(SchemaEngine.inferType(values)).toBe('string');
    });

    it('should infer ISO date', () => {
      const values = ['2023-01-01', '2023-01-02', '2023-12-31'];
      expect(SchemaEngine.inferType(values)).toBe('date');
    });

    it('should infer ISO date with slashes', () => {
      const values = ['2023/01/01', '2023/01/02', '2023/12/31'];
      expect(SchemaEngine.inferType(values)).toBe('date');
    });

    it('should infer American date format (MM/DD/YYYY)', () => {
      const values = ['11/8/2016', '01/01/2023', '12/31/2022'];
      expect(SchemaEngine.inferType(values)).toBe('date');
    });

    it('should infer American date format (M/D/YYYY)', () => {
      const values = ['1/1/2023', '2/2/2023', '12/31/2022'];
      expect(SchemaEngine.inferType(values)).toBe('date');
    });

    it('should infer datetime', () => {
      const values = ['2023-01-01T12:00:00', '2023-01-01 12:00:00'];
      expect(SchemaEngine.inferType(values)).toBe('datetime');
    });

    it('should handle nulls and empty strings', () => {
      const values = [1, null, undefined, '', 2];
      expect(SchemaEngine.inferType(values)).toBe('integer');
    });

    it('should return string for empty input', () => {
      expect(SchemaEngine.inferType([])).toBe('string');
      expect(SchemaEngine.inferType(null)).toBe('string');
    });

    it('should infer json from JSON object strings', () => {
      const values = ['{"name":"Alice"}', '{"name":"Bob"}'];
      expect(SchemaEngine.inferType(values)).toBe('json');
    });

    it('should infer json from JSON array strings', () => {
      const values = ['[1,2,3]', '[4,5,6]'];
      expect(SchemaEngine.inferType(values)).toBe('json');
    });

    it('should infer json with nulls mixed in', () => {
      const values = ['{"a":1}', null, '{"b":2}'];
      expect(SchemaEngine.inferType(values)).toBe('json');
    });

    it('should not infer json for numeric strings', () => {
      const values = ['123', '456'];
      expect(SchemaEngine.inferType(values)).toBe('integer');
    });

    it('should not infer json for plain strings', () => {
      const values = ['hello', 'world'];
      expect(SchemaEngine.inferType(values)).toBe('string');
    });
  });

  describe('detectPhysicalType()', () => {
    it('should detect native objects as json', () => {
      const values = [{ a: 1 }, { b: 2 }];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('json');
    });

    it('should detect native arrays as json', () => {
      const values = [
        [1, 2],
        [3, 4],
      ];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('json');
    });

    it('should not detect Date objects as json', () => {
      const values = [new Date()];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('string');
    });
  });

  describe('getPromotedType()', () => {
    it('should return json when both are json', () => {
      expect(SchemaEngine.getPromotedType('json', 'json')).toBe('json');
    });

    it('should return string when json mixed with string', () => {
      expect(SchemaEngine.getPromotedType('json', 'string')).toBe('string');
    });

    it('should return string when json mixed with integer', () => {
      expect(SchemaEngine.getPromotedType('json', 'integer')).toBe('string');
    });
  });

  describe('normalizeSchema()', () => {
    it('should preserve valid column types', () => {
      const schema = [
        { name: 'col1', type: 'string' as const },
        { name: 'col2', type: 'integer' as const },
        { name: 'col3', type: 'float' as const },
      ];
      const normalized = SchemaEngine.normalizeSchema(schema);
      expect(normalized).toEqual(schema);
    });

    it('should convert unknown types to string', () => {
      const schema = [
        { name: 'col1', type: 'string' as const },
        { name: 'col2', type: 'xml' as any }, // Unknown type
        { name: 'col3', type: 'decimal' as any }, // Unknown type
      ];
      const normalized = SchemaEngine.normalizeSchema(schema);
      expect(normalized[0].type).toBe('string');
      expect(normalized[1].type).toBe('string'); // Converted
      expect(normalized[2].type).toBe('string'); // Converted
      expect(normalized[1].name).toBe('col2'); // Preserves other properties
    });

    it('should preserve json type as valid', () => {
      const schema = [{ name: 'col1', type: 'json' as const }];
      const normalized = SchemaEngine.normalizeSchema(schema);
      expect(normalized[0].type).toBe('json');
    });

    it('should handle empty schema', () => {
      const normalized = SchemaEngine.normalizeSchema([]);
      expect(normalized).toEqual([]);
    });

    it('should preserve all column properties when normalizing', () => {
      const schema = [
        {
          name: 'col1',
          type: 'unknown' as any,
          format: { currency: 'USD' },
          originalPosition: 0,
        },
      ];
      const normalized = SchemaEngine.normalizeSchema(schema);
      expect(normalized[0].type).toBe('string');
      expect(normalized[0].format).toEqual({ currency: 'USD' });
      expect(normalized[0].originalPosition).toBe(0);
    });
  });

  describe('deriveNextSchema() - Unknown Transform Keys (Future-proofing)', () => {
    it('should skip unknown transform keys and return schema unchanged', () => {
      const currentSchema = [
        { name: 'sales', type: 'integer' as const, format: {}, originalPosition: 0 },
        { name: 'region', type: 'string' as const, format: {}, originalPosition: 1 },
      ];

      // Simulate a future transform that doesn't exist yet
      const transform = { futureTransform: { someParam: 'value' } } as any;

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = SchemaEngine.deriveNextSchema(currentSchema, transform, []);

      // Schema should be unchanged
      expect(result).toEqual(currentSchema);

      // Warning should be logged
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown transform key "futureTransform"')
      );

      spy.mockRestore();
    });

    it('should ignore __v version field when checking for unknown keys', () => {
      const currentSchema = [
        { name: 'sales', type: 'integer' as const, format: {}, originalPosition: 0 },
      ];

      const transform = { select: ['sales'], __v: 1 } as any;

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = SchemaEngine.deriveNextSchema(currentSchema, transform, []);

      // Transform should work normally (__v is ignored)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('sales');
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('compareSchemas()', () => {
    const oldSchema: ColumnSchema[] = [
      { name: 'id', type: 'integer' as const },
      { name: 'name', type: 'string' as const },
      { name: 'age', type: 'integer' as const },
    ];

    it('detects identical schemas', () => {
      const diff = SchemaEngine.compareSchemas(oldSchema, [...oldSchema]);
      expect(diff.missingColumns).toHaveLength(0);
      expect(diff.newColumns).toHaveLength(0);
      expect(diff.typeChanges).toHaveLength(0);
      expect(diff.compatibilityWarning).toBeNull();
    });

    it('detects missing columns', () => {
      const newSchema: ColumnSchema[] = [
        { name: 'id', type: 'integer' as const },
        { name: 'name', type: 'string' as const },
      ];
      const diff = SchemaEngine.compareSchemas(oldSchema, newSchema);
      expect(diff.missingColumns).toEqual(['age']);
      expect(diff.compatibilityWarning).toContain('missing');
    });

    it('detects new columns', () => {
      const newSchema: ColumnSchema[] = [...oldSchema, { name: 'email', type: 'string' as const }];
      const diff = SchemaEngine.compareSchemas(oldSchema, newSchema);
      expect(diff.newColumns).toEqual(['email']);
      expect(diff.compatibilityWarning).toBeNull();
    });

    it('detects type changes', () => {
      const newSchema: ColumnSchema[] = [
        { name: 'id', type: 'integer' as const },
        { name: 'name', type: 'string' as const },
        { name: 'age', type: 'string' as const }, // type changed
      ];
      const diff = SchemaEngine.compareSchemas(oldSchema, newSchema);
      expect(diff.typeChanges).toEqual([{ column: 'age', oldType: 'integer', newType: 'string' }]);
    });

    it('handles combination of changes', () => {
      const newSchema: ColumnSchema[] = [
        { name: 'id', type: 'string' as const }, // type change
        { name: 'name', type: 'string' as const },
        { name: 'email', type: 'string' as const }, // new
      ];
      const diff = SchemaEngine.compareSchemas(oldSchema, newSchema);
      expect(diff.missingColumns).toEqual(['age']);
      expect(diff.newColumns).toEqual(['email']);
      expect(diff.typeChanges).toEqual([{ column: 'id', oldType: 'integer', newType: 'string' }]);
    });
  });
});
