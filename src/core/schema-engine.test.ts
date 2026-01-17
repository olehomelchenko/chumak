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
        { name: 'col2', type: 'json' as any }, // Unknown type
        { name: 'col3', type: 'decimal' as any }, // Unknown type
      ];
      const normalized = SchemaEngine.normalizeSchema(schema);
      expect(normalized[0].type).toBe('string');
      expect(normalized[1].type).toBe('string'); // Converted
      expect(normalized[2].type).toBe('string'); // Converted
      expect(normalized[1].name).toBe('col2'); // Preserves other properties
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
});
