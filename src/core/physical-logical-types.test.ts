import { describe, it, expect } from 'vitest';
import { SchemaEngine } from './schema-engine';

describe('Physical vs Logical Type Separation', () => {
  describe('detectPhysicalType', () => {
    it('detects boolean physical type', () => {
      const values = [true, false, true];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('boolean');
    });

    it('detects integer physical type', () => {
      const values = [123, 456, 789];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('integer');
    });

    it('detects float physical type', () => {
      const values = [1.23, 4.56, 7.89];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('float');
    });

    it('detects string physical type for date strings', () => {
      // Important: dates are strings in CSV/JSON, not converted to date type
      const values = ['2024-01-15', '2024-02-20', '2024-03-25'];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('string');
    });

    it('detects string physical type for numeric strings', () => {
      // Without dynamicTyping, these would be strings
      const values = ['123', '456', '789'];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('string');
    });

    it('detects string physical type for text', () => {
      const values = ['hello', 'world', 'test'];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('string');
    });

    it('handles mixed types by returning string', () => {
      const values = [123, 'hello', true];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('string');
    });

    it('handles nulls by filtering them out', () => {
      const values = [null, 123, null, 456];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('integer');
    });

    it('returns string for all-null values', () => {
      const values = [null, null, null];
      expect(SchemaEngine.detectPhysicalType(values)).toBe('string');
    });
  });

  describe('createPhysicalSchema', () => {
    it('creates physical schema with runtime types', () => {
      const data = [
        { id: 1, name: 'Alice', active: true, date: '2024-01-15' },
        { id: 2, name: 'Bob', active: false, date: '2024-02-20' },
      ];

      const schema = SchemaEngine.createPhysicalSchema(data);

      expect(schema).toHaveLength(4);
      expect(schema[0]).toEqual({
        name: 'id',
        type: 'integer',
        format: {},
        originalPosition: 0,
      });
      expect(schema[1]).toEqual({
        name: 'name',
        type: 'string',
        format: {},
        originalPosition: 1,
      });
      expect(schema[2]).toEqual({
        name: 'active',
        type: 'boolean',
        format: {},
        originalPosition: 2,
      });
      // Date strings remain as string type physically
      expect(schema[3]).toEqual({
        name: 'date',
        type: 'string',
        format: {},
        originalPosition: 3,
      });
    });
  });

  describe('Physical vs Logical: inferType comparison', () => {
    it('physical: date strings remain string', () => {
      const dateValues = ['2024-01-15', '2024-02-20', '2024-03-25'];
      expect(SchemaEngine.detectPhysicalType(dateValues)).toBe('string');
    });

    it('logical: date strings infer to date', () => {
      const dateValues = ['2024-01-15', '2024-02-20', '2024-03-25'];
      expect(SchemaEngine.inferType(dateValues)).toBe('date');
    });

    it('physical: numeric strings remain string (if dynamicTyping missed them)', () => {
      const numericStrings = ['123', '456', '789'];
      expect(SchemaEngine.detectPhysicalType(numericStrings)).toBe('string');
    });

    it('logical: numeric strings infer to integer', () => {
      const numericStrings = ['123', '456', '789'];
      expect(SchemaEngine.inferType(numericStrings)).toBe('integer');
    });

    it('physical: numbers from dynamicTyping are detected as number', () => {
      const numbers = [123, 456, 789];
      expect(SchemaEngine.detectPhysicalType(numbers)).toBe('integer');
    });

    it('logical: numbers infer to integer (same result)', () => {
      const numbers = [123, 456, 789];
      expect(SchemaEngine.inferType(numbers)).toBe('integer');
    });

    it('demonstrates the separation: CSV dates', () => {
      // In a CSV with "2024-01-15", after PapaParse dynamicTyping:
      const csvDateColumn = ['2024-01-15', '2024-02-20'];

      // Physical type (what parser gave us)
      const physical = SchemaEngine.detectPhysicalType(csvDateColumn);
      expect(physical).toBe('string');

      // Logical type (what we infer it should be)
      const logical = SchemaEngine.inferType(csvDateColumn);
      expect(logical).toBe('date');

      // This demonstrates the key separation!
      expect(physical).not.toBe(logical);
    });
  });
});
