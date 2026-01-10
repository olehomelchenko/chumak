import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { SchemaEngine } from './schema-engine';
import { applyTransform } from './transforms';

describe('SchemaEngine - Numeric String Detection', () => {
  describe('inferType with numeric strings', () => {
    it('should detect year strings as integers', () => {
      const years = ['2024', '2023', '2025', '1999', '2000'];
      expect(SchemaEngine.inferType(years)).toBe('integer');
    });

    it('should detect month/day strings as integers (with leading zeros)', () => {
      const months = ['01', '02', '03', '11', '12'];
      expect(SchemaEngine.inferType(months)).toBe('integer');

      const days = ['01', '15', '28', '31'];
      expect(SchemaEngine.inferType(days)).toBe('integer');
    });

    it('should detect decimal strings as floats', () => {
      const prices = ['19.99', '29.95', '100.00', '5.50'];
      expect(SchemaEngine.inferType(prices)).toBe('float');
    });

    it('should handle strings with whitespace', () => {
      const paddedNumbers = ['  2024  ', ' 01', '15 ', '  99  '];
      expect(SchemaEngine.inferType(paddedNumbers)).toBe('integer');
    });

    it('should NOT detect mixed numeric/text as numbers', () => {
      const mixed = ['2024', 'abc', '15'];
      expect(SchemaEngine.inferType(mixed)).toBe('string');
    });

    it('should handle empty strings in sample', () => {
      const withEmpties = ['2024', '', '2023', null, '2025'];
      expect(SchemaEngine.inferType(withEmpties)).toBe('integer');
    });

    it('should still detect actual date strings as dates, not numbers', () => {
      const dates = ['2024-01-15', '2023-12-31', '2025-06-01'];
      expect(SchemaEngine.inferType(dates)).toBe('date');
    });
  });

  describe('Full split workflow type detection', () => {
    it('should correctly infer types after splitting YYYY-MM-DD dates', () => {
      const data = [{ date: '2024-01-15' }, { date: '2023-12-31' }];

      const table = (aq as any).from(data);
      const splitTransform = {
        split: {
          column: 'date',
          delimiter: '-',
          isRegex: false,
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const result = applyTransform(table, splitTransform, ['date']);
      const resultData = result.objects();

      const yearValues = resultData.map((row) => row.date_1);
      expect(SchemaEngine.inferType(yearValues)).toBe('integer');
    });
  });
});
