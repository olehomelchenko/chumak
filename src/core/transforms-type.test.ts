import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform } from './transforms';
import { SchemaEngine, ColumnType } from './schema-engine';

describe('Transform Engine - Type Conversions', () => {
  describe('SchemaEngine - Complex Inference', () => {
    it('should infer types after split', () => {
      const initialSchema = [
        { name: 'date', type: 'string', format: {}, originalPosition: 0 },
        { name: 'id', type: 'integer', format: {}, originalPosition: 1 },
      ];

      const splitTransform = {
        split: {
          column: 'date',
          delimiter: '/',
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const sampleData = [
        { id: 1, date_1: '01', date_2: '15', date_3: '2023' },
        { id: 2, date_1: '12', date_2: '25', date_3: '2023' },
      ];

      const newSchema = SchemaEngine.deriveNextSchema(initialSchema, splitTransform, sampleData);

      expect(newSchema.length).toBe(4);
      expect(newSchema[0].name).toBe('id');
      expect(newSchema[1].name).toBe('date_1');
      expect(newSchema[1].type).toBe('integer');
    });
  });

  describe('applyTransform() - TYPES (Type Conversion)', () => {
    it('should convert integer to boolean (0/1)', () => {
      const table = (aq as any).from([
        { flag: 0, value: 'A' },
        { flag: 1, value: 'B' },
        { flag: 0, value: 'C' },
      ]);

      const transform = { types: { flag: 'boolean' as ColumnType } };
      const result = applyTransform(table, transform, ['flag', 'value'], null);

      const rows = result.objects();
      expect(rows[0].flag).toBe(false);
      expect(rows[1].flag).toBe(true);
      expect(rows[2].flag).toBe(false);
    });

    it('should convert string to integer', () => {
      const table = (aq as any).from([
        { count: '42', name: 'A' },
        { count: '123', name: 'B' },
        { count: '  99  ', name: 'C' },
      ]);

      const transform = { types: { count: 'integer' as ColumnType } };
      const result = applyTransform(table, transform, ['count', 'name'], null);

      const rows = result.objects();
      expect(rows[0].count).toBe(42);
      expect(rows[1].count).toBe(123);
      expect(rows[2].count).toBe(99);
    });

    it('should create error cells for invalid string to integer conversions', () => {
      const table = (aq as any).from([
        { count: '42', name: 'A' },
        { count: 'abc', name: 'B' },
        { count: '123', name: 'C' },
      ]);

      const transform = { types: { count: 'integer' as ColumnType } };
      const result = applyTransform(table, transform, ['count', 'name'], null);

      const rows = result.objects();
      expect(rows[0].count).toBe(42);
      expect(rows[1].count).toHaveProperty('type', 'error');
      expect(rows[1].count).toHaveProperty('message');
      expect((rows[1].count as any).message).toContain('Cannot convert');
      expect(rows[2].count).toBe(123);
    });

    it('should convert string to boolean (true/false patterns)', () => {
      const table = (aq as any).from([
        { active: 'true', name: 'A' },
        { active: 'false', name: 'B' },
        { active: '1', name: 'C' },
        { active: '0', name: 'D' },
        { active: 'yes', name: 'E' },
        { active: 'no', name: 'F' },
      ]);

      const transform = { types: { active: 'boolean' as ColumnType } };
      const result = applyTransform(table, transform, ['active', 'name'], null);

      const rows = result.objects();
      expect(rows[0].active).toBe(true);
      expect(rows[1].active).toBe(false);
      expect(rows[2].active).toBe(true);
      expect(rows[3].active).toBe(false);
      expect(rows[4].active).toBe(true);
      expect(rows[5].active).toBe(false);
    });

    it('should convert float to integer (truncation)', () => {
      const table = (aq as any).from([
        { value: 3.7, name: 'A' },
        { value: 2.0, name: 'B' },
        { value: 5.9, name: 'C' },
      ]);

      const transform = { types: { value: 'integer' as ColumnType } };
      const result = applyTransform(table, transform, ['value', 'name'], null);

      const rows = result.objects();
      expect(rows[0].value).toBe(3);
      expect(rows[1].value).toBe(2);
      expect(rows[2].value).toBe(5);
    });

    it('should convert boolean to string', () => {
      const table = (aq as any).from([
        { flag: true, name: 'A' },
        { flag: false, name: 'B' },
      ]);

      const transform = { types: { flag: 'string' as ColumnType } };
      const result = applyTransform(table, transform, ['flag', 'name'], null);

      const rows = result.objects();
      expect(rows[0].flag).toBe('true');
      expect(rows[1].flag).toBe('false');
    });

    it('should handle null values appropriately', () => {
      const table = (aq as any).from([
        { value: null, name: 'A' },
        { value: '42', name: 'B' },
      ]);

      const transform = { types: { value: 'integer' as ColumnType } };
      const result = applyTransform(table, transform, ['value', 'name'], null);

      const rows = result.objects();
      expect(rows[0].value).toBe(null);
      expect(rows[1].value).toBe(42);
    });

    it('should skip conversion if types already match', () => {
      const table = (aq as any).from([
        { value: 42, name: 'A' },
        { value: 123, name: 'B' },
      ]);

      const transform = { types: { value: 'integer' as ColumnType } };
      const result = applyTransform(table, transform, ['value', 'name'], null);

      const rows = result.objects();
      // Should remain unchanged if already integer
      expect(rows[0].value).toBe(42);
      expect(rows[1].value).toBe(123);
    });

    it('should handle empty table', () => {
      const table = (aq as any).from([]);
      const transform = { types: { value: 'boolean' as ColumnType } };
      const result = applyTransform(table, transform, ['value'], null);
      expect(result.numRows()).toBe(0);
    });

    it('should handle non-existent column gracefully', () => {
      const table = (aq as any).from([{ name: 'A' }]);
      const transform = { types: { nonexistent: 'boolean' as ColumnType } };
      const result = applyTransform(table, transform, ['name'], null);
      expect(result.columnNames()).toEqual(['name']);
      expect(result.numRows()).toBe(1);
    });

    it('should convert string to float', () => {
      const table = (aq as any).from([
        { price: '42.5', name: 'A' },
        { price: '123.99', name: 'B' },
        { price: '  99.0  ', name: 'C' },
      ]);

      const transform = { types: { price: 'float' as ColumnType } };
      const result = applyTransform(table, transform, ['price', 'name'], null);

      const rows = result.objects();
      expect(rows[0].price).toBe(42.5);
      expect(rows[1].price).toBe(123.99);
      expect(rows[2].price).toBe(99.0);
    });

    it('should create error cells for invalid string to float conversions', () => {
      const table = (aq as any).from([
        { price: '42.5', name: 'A' },
        { price: 'abc', name: 'B' },
        { price: '123.99', name: 'C' },
      ]);

      const transform = { types: { price: 'float' as ColumnType } };
      const result = applyTransform(table, transform, ['price', 'name'], null);

      const rows = result.objects();
      expect(rows[0].price).toBe(42.5);
      expect(rows[1].price).toHaveProperty('type', 'error');
      expect(rows[1].price).toHaveProperty('message');
      expect((rows[1].price as any).message).toContain('Cannot convert');
      expect(rows[2].price).toBe(123.99);
    });

    it('should convert boolean to integer', () => {
      const table = (aq as any).from([
        { flag: true, name: 'A' },
        { flag: false, name: 'B' },
      ]);

      const transform = { types: { flag: 'integer' as ColumnType } };
      const result = applyTransform(table, transform, ['flag', 'name'], null);

      const rows = result.objects();
      expect(rows[0].flag).toBe(1);
      expect(rows[1].flag).toBe(0);
    });

    it('should convert boolean to float', () => {
      const table = (aq as any).from([
        { flag: true, name: 'A' },
        { flag: false, name: 'B' },
      ]);

      const transform = { types: { flag: 'float' as ColumnType } };
      const result = applyTransform(table, transform, ['flag', 'name'], null);

      const rows = result.objects();
      expect(rows[0].flag).toBe(1);
      expect(rows[1].flag).toBe(0);
    });

    it('should convert string to date', () => {
      const table = (aq as any).from([
        { date: '2024-01-15', name: 'A' },
        { date: '2024-12-31', name: 'B' },
      ]);

      const transform = { types: { date: 'date' as ColumnType } };
      const result = applyTransform(table, transform, ['date', 'name'], null);

      const rows = result.objects();
      expect(rows[0].date).toBeInstanceOf(Date);
      expect(rows[0].date.getFullYear()).toBe(2024);
      expect(rows[0].date.getMonth()).toBe(0); // January
      expect(rows[0].date.getDate()).toBe(15);
      expect(rows[1].date).toBeInstanceOf(Date);
    });

    it('should create error cells for invalid date conversions', () => {
      const table = (aq as any).from([
        { date: '2024-01-15', name: 'A' },
        { date: 'not-a-date', name: 'B' },
      ]);

      const transform = { types: { date: 'date' as ColumnType } };
      const result = applyTransform(table, transform, ['date', 'name'], null);

      const rows = result.objects();
      expect(rows[0].date).toBeInstanceOf(Date);
      expect(rows[1].date).toHaveProperty('type', 'error');
      expect(rows[1].date).toHaveProperty('message');
      expect((rows[1].date as any).message).toContain('Cannot convert');
    });

    it('should handle multiple column type conversions', () => {
      const table = (aq as any).from([
        { count: '42', flag: 1, name: 'A' },
        { count: '123', flag: 0, name: 'B' },
      ]);

      const transform = {
        types: { count: 'integer' as ColumnType, flag: 'boolean' as ColumnType },
      };
      const result = applyTransform(table, transform, ['count', 'flag', 'name'], null);

      const rows = result.objects();
      expect(rows[0].count).toBe(42);
      expect(rows[0].flag).toBe(true);
      expect(rows[1].count).toBe(123);
      expect(rows[1].flag).toBe(false);
    });
  });
});
