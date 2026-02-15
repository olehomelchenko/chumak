import { describe, it, expect, vi } from 'vitest';
import { formatCellValue, formatCellValueForTooltip } from './helper-handlers';

describe('helper-handlers', () => {
  describe('formatCellValue', () => {
    // Note: formatCellValue no longer uses `this` context - it's now a pure function

    it('should format null/undefined/empty as "null"', () => {
      expect(formatCellValue(null)).toBe('null');
      expect(formatCellValue(undefined)).toBe('null');
      expect(formatCellValue('')).toBe('null');
    });

    it('should format error objects as "Error"', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      expect(formatCellValue(errorObj)).toBe('Error');
    });

    it('should format boolean values as checkmarks', () => {
      expect(formatCellValue(true)).toBe('✓');
      expect(formatCellValue(false)).toBe('✗');
    });

    it('should format Date objects as ISO date strings', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatCellValue(date)).toBe('2024-01-15');
    });

    it('should format invalid Date as "Invalid Date"', () => {
      const invalidDate = new Date('invalid');
      expect(formatCellValue(invalidDate)).toBe('Invalid Date');
    });

    it('should format strings as-is', () => {
      expect(formatCellValue('hello')).toBe('hello');
      expect(formatCellValue('123')).toBe('123');
    });

    it('should format numbers as strings', () => {
      expect(formatCellValue(42)).toBe('42');
      expect(formatCellValue(3.14)).toBe('3.14');
    });

    it('should stringify objects as JSON', () => {
      const obj = { a: 1, b: 2 };
      const result = formatCellValue(obj);
      expect(typeof result).toBe('string');
      expect(result).toBe('{"a":1,"b":2}');
    });

    it('should truncate long JSON objects', () => {
      const obj = { name: 'Alice', email: 'alice@example.com', role: 'admin' };
      const result = formatCellValue(obj);
      expect(result.length).toBeLessThanOrEqual(54); // 50 + "..."
      expect(result).toContain('...');
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      const result = formatCellValue(arr);
      expect(typeof result).toBe('string');
    });
  });

  describe('formatCellValueForTooltip', () => {
    // Note: formatCellValueForTooltip no longer uses `this` context - it's now a pure function

    it('should format error objects as "Error"', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      expect(formatCellValueForTooltip(errorObj)).toBe('Error');
    });

    it('should format null/undefined/empty as "null"', () => {
      expect(formatCellValueForTooltip(null)).toBe('null');
      expect(formatCellValueForTooltip(undefined)).toBe('null');
      expect(formatCellValueForTooltip('')).toBe('null');
    });

    it('should format boolean values as "true"/"false"', () => {
      expect(formatCellValueForTooltip(true)).toBe('true');
      expect(formatCellValueForTooltip(false)).toBe('false');
    });

    it('should format Date objects as ISO date strings', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatCellValueForTooltip(date)).toBe('2024-01-15');
    });

    it('should format strings as strings', () => {
      expect(formatCellValueForTooltip('hello')).toBe('hello');
      expect(formatCellValueForTooltip('123')).toBe('123');
    });

    it('should format numbers as strings', () => {
      expect(formatCellValueForTooltip(42)).toBe('42');
      expect(formatCellValueForTooltip(3.14)).toBe('3.14');
    });

    it('should pretty-print objects as JSON', () => {
      const obj = { a: 1, b: 2 };
      expect(formatCellValueForTooltip(obj)).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });
  });
});
