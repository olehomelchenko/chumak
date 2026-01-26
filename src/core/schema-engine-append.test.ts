import { describe, it, expect } from 'vitest';
import { SchemaEngine } from './schema-engine';

describe('SchemaEngine - Concat / Union / Promotion', () => {
  describe('getPromotedType()', () => {
    it('promotes integer + float to float', () => {
      expect(SchemaEngine.getPromotedType('integer', 'float')).toBe('float');
      expect(SchemaEngine.getPromotedType('float', 'integer')).toBe('float');
    });

    it('promotes date + datetime to datetime', () => {
      expect(SchemaEngine.getPromotedType('date', 'datetime')).toBe('datetime');
      expect(SchemaEngine.getPromotedType('datetime', 'date')).toBe('datetime');
    });

    it('promotes mismatched types to string', () => {
      expect(SchemaEngine.getPromotedType('integer', 'string')).toBe('string');
      expect(SchemaEngine.getPromotedType('date', 'float')).toBe('string');
      expect(SchemaEngine.getPromotedType('boolean', 'integer')).toBe('string');
    });

    it('preserves same type', () => {
      expect(SchemaEngine.getPromotedType('integer', 'integer')).toBe('integer');
      expect(SchemaEngine.getPromotedType('string', 'string')).toBe('string');
    });
  });

  describe('deriveNextSchema() - concat/union', () => {
    it('merges schemas and promotes types for concat', () => {
      const currentSchema = [
        { name: 'id', type: 'integer' as const, format: {}, originalPosition: 0 },
        { name: 'val', type: 'integer' as const, format: {}, originalPosition: 1 },
      ];

      const transform = { concat: { with: 'other' } };

      // sampleData contains columns from both sides
      const sampleData = [
        { id: 1, val: 10, bonus: 'A' },
        { id: 2, val: 11.5, bonus: 'B' }, // val is now float in sample
      ];

      const result = SchemaEngine.deriveNextSchema(currentSchema, transform, sampleData);

      expect(result).toHaveLength(3);

      // 'id' remains integer (1 and 2 are integers)
      expect(result.find((c) => c.name === 'id')?.type).toBe('integer');

      // 'val' promoted to float because of 11.5
      expect(result.find((c) => c.name === 'val')?.type).toBe('float');

      // 'bonus' added as string
      expect(result.find((c) => c.name === 'bonus')?.type).toBe('string');
    });

    it('handles union similarly', () => {
      const currentSchema = [
        { name: 'name', type: 'string' as const, format: {}, originalPosition: 0 },
      ];

      const transform = { union: { with: 'other' } };

      const sampleData = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ];

      const result = SchemaEngine.deriveNextSchema(currentSchema, transform, sampleData);

      expect(result).toHaveLength(2);
      expect(result.find((c) => c.name === 'name')?.type).toBe('string');
      expect(result.find((c) => c.name === 'age')?.type).toBe('integer');
    });
  });
});
