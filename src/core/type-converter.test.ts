import { describe, it, expect } from 'vitest';
import { convertType } from './type-converter';

describe('Type Converter', () => {
  describe('convertType()', () => {
    describe('String to Integer', () => {
      it('should convert valid numeric strings', () => {
        expect(convertType('42', 'string', 'integer')).toBe(42);
        expect(convertType('123', 'string', 'integer')).toBe(123);
        expect(convertType('  99  ', 'string', 'integer')).toBe(99);
      });

      it('should return error for invalid strings', () => {
        const result = convertType('abc', 'string', 'integer');
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('Cannot convert');
      });

      it('should return error for empty strings', () => {
        const result = convertType('', 'string', 'integer');
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('empty string');
      });
    });

    describe('String to Boolean', () => {
      it('should convert common truthy patterns', () => {
        expect(convertType('true', 'string', 'boolean')).toBe(true);
        expect(convertType('1', 'string', 'boolean')).toBe(true);
        expect(convertType('yes', 'string', 'boolean')).toBe(true);
        expect(convertType('Y', 'string', 'boolean')).toBe(true);
        expect(convertType('on', 'string', 'boolean')).toBe(true);
      });

      it('should convert common falsy patterns', () => {
        expect(convertType('false', 'string', 'boolean')).toBe(false);
        expect(convertType('0', 'string', 'boolean')).toBe(false);
        expect(convertType('no', 'string', 'boolean')).toBe(false);
        expect(convertType('N', 'string', 'boolean')).toBe(false);
        expect(convertType('off', 'string', 'boolean')).toBe(false);
      });

      it('should convert numeric strings to boolean', () => {
        expect(convertType('42', 'string', 'boolean')).toBe(true);
        expect(convertType('0', 'string', 'boolean')).toBe(false);
      });

      it('should return error for unknown patterns', () => {
        const result = convertType('maybe', 'string', 'boolean');
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('Cannot convert');
      });
    });

    describe('Integer to Boolean', () => {
      it('should convert 0 to false', () => {
        expect(convertType(0, 'integer', 'boolean')).toBe(false);
      });

      it('should convert non-zero to true', () => {
        expect(convertType(1, 'integer', 'boolean')).toBe(true);
        expect(convertType(-1, 'integer', 'boolean')).toBe(true);
        expect(convertType(42, 'integer', 'boolean')).toBe(true);
      });
    });

    describe('Float to Integer', () => {
      it('should truncate floats', () => {
        expect(convertType(3.7, 'float', 'integer')).toBe(3);
        expect(convertType(2.0, 'float', 'integer')).toBe(2);
        expect(convertType(5.9, 'float', 'integer')).toBe(5);
      });

      it('should keep integers as-is', () => {
        expect(convertType(42, 'float', 'integer')).toBe(42);
      });
    });

    describe('Boolean to String', () => {
      it('should convert boolean to string', () => {
        expect(convertType(true, 'boolean', 'string')).toBe('true');
        expect(convertType(false, 'boolean', 'string')).toBe('false');
      });
    });

    describe('String to Float', () => {
      it('should convert valid numeric strings', () => {
        expect(convertType('42.5', 'string', 'float')).toBe(42.5);
        expect(convertType('123.99', 'string', 'float')).toBe(123.99);
        expect(convertType('  99.0  ', 'string', 'float')).toBe(99.0);
      });

      it('should return error for invalid strings', () => {
        const result = convertType('abc', 'string', 'float');
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('Cannot convert');
      });
    });

    describe('Date conversions', () => {
      it('should convert valid date strings to formatted date string', () => {
        const result = convertType('2024-01-15', 'string', 'date');
        expect(result).toBe('2024-01-15');
      });

      it('should return error for invalid date strings', () => {
        const result = convertType('not-a-date', 'string', 'date');
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('Cannot convert');
      });

      it('should handle null for date conversions', () => {
        expect(convertType(null, 'string', 'date')).toBe(null);
      });
    });

    describe('Boolean to Integer', () => {
      it('should convert true to 1', () => {
        expect(convertType(true, 'boolean', 'integer')).toBe(1);
      });

      it('should convert false to 0', () => {
        expect(convertType(false, 'boolean', 'integer')).toBe(0);
      });
    });

    describe('Boolean to Float', () => {
      it('should convert true to 1', () => {
        expect(convertType(true, 'boolean', 'float')).toBe(1);
      });

      it('should convert false to 0', () => {
        expect(convertType(false, 'boolean', 'float')).toBe(0);
      });
    });

    describe('Date to String', () => {
      it('should convert Date to YYYY-MM-DD string using local time', () => {
        // Use local midnight to avoid timezone shifts
        const date = new Date(2024, 0, 15); // Jan 15, 2024 local
        const result = convertType(date, 'date', 'string');
        expect(result).toBe('2024-01-15');
      });

      it('should format Date objects consistently', () => {
        const date = new Date(2024, 11, 31, 12, 0, 0); // Dec 31, 2024 local
        const result = convertType(date, 'date', 'string');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result).toBe('2024-12-31');
      });
    });

    describe('Error handling', () => {
      it('should return error for unknown target type', () => {
        const result = convertType('test', 'string', 'unknown' as any);
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('Unknown target type');
      });

      it('should return error for objects that cannot be converted', () => {
        // Objects without proper conversion path should return error
        const result = convertType({ a: 1, b: 2 }, 'string', 'integer');
        expect(result).toHaveProperty('type', 'error');
        expect(result).toHaveProperty('message');
        expect((result as any).message).toContain('Cannot convert');
      });
    });

    describe('String to JSON', () => {
      it('should pass through valid JSON strings', () => {
        expect(convertType('{"a":1}', 'string', 'json')).toBe('{"a":1}');
        expect(convertType('[1,2,3]', 'string', 'json')).toBe('[1,2,3]');
      });

      it('should return error for invalid JSON strings', () => {
        const result = convertType('not json', 'string', 'json');
        expect(result).toHaveProperty('type', 'error');
        expect((result as any).message).toContain('Cannot convert');
      });

      it('should return error for empty string', () => {
        const result = convertType('', 'string', 'json');
        expect(result).toHaveProperty('type', 'error');
        expect((result as any).message).toContain('empty string');
      });
    });

    describe('JSON to String', () => {
      it('should pass through JSON strings as-is', () => {
        expect(convertType('{"a":1}', 'json', 'string')).toBe('{"a":1}');
      });
    });

    describe('Object to JSON', () => {
      it('should stringify native objects', () => {
        expect(convertType({ a: 1 }, 'string', 'json')).toBe('{"a":1}');
      });

      it('should stringify native arrays', () => {
        expect(convertType([1, 2, 3], 'string', 'json')).toBe('[1,2,3]');
      });
    });

    describe('Primitive to JSON', () => {
      it('should stringify numbers', () => {
        expect(convertType(42, 'integer', 'json')).toBe('42');
      });

      it('should stringify booleans', () => {
        expect(convertType(true, 'boolean', 'json')).toBe('true');
      });
    });

    describe('Null handling', () => {
      it('should handle null values', () => {
        expect(convertType(null, 'string', 'integer')).toBe(null);
        expect(convertType(null, 'integer', 'string')).toBe(null);
      });

      it('should handle undefined values', () => {
        expect(convertType(undefined, 'string', 'integer')).toBe(null);
      });

      it('should handle null for date conversions', () => {
        expect(convertType(null, 'string', 'date')).toBe(null);
        expect(convertType(null, 'string', 'datetime')).toBe(null);
      });

      it('should handle null for json conversions', () => {
        expect(convertType(null, 'string', 'json')).toBe(null);
      });
    });
  });
});
