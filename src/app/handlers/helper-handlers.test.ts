import { describe, it, expect, vi } from 'vitest';
import { formatCellValue, formatCellValueForTooltip } from './helper-handlers';
import type { ChumakApp } from '../../chumak-app';

describe('helper-handlers', () => {
  describe('formatCellValue', () => {
    const mockApp = {} as ChumakApp;

    it('should format null/undefined/empty as "null"', () => {
      expect(formatCellValue.call(mockApp, null)).toBe('null');
      expect(formatCellValue.call(mockApp, undefined)).toBe('null');
      expect(formatCellValue.call(mockApp, '')).toBe('null');
    });

    it('should format error objects as "Error"', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      expect(formatCellValue.call(mockApp, errorObj)).toBe('Error');
    });

    it('should format boolean values as checkmarks', () => {
      expect(formatCellValue.call(mockApp, true)).toBe('✓');
      expect(formatCellValue.call(mockApp, false)).toBe('✗');
    });

    it('should format Date objects as ISO date strings', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatCellValue.call(mockApp, date)).toBe('2024-01-15');
    });

    it('should format invalid Date as "Invalid Date"', () => {
      const invalidDate = new Date('invalid');
      expect(formatCellValue.call(mockApp, invalidDate)).toBe('Invalid Date');
    });

    it('should format strings as-is', () => {
      expect(formatCellValue.call(mockApp, 'hello')).toBe('hello');
      expect(formatCellValue.call(mockApp, '123')).toBe('123');
    });

    it('should format numbers as-is', () => {
      expect(formatCellValue.call(mockApp, 42)).toBe(42);
      expect(formatCellValue.call(mockApp, 3.14)).toBe(3.14);
    });

    it('should stringify unexpected objects', () => {
      const obj = { a: 1, b: 2 };
      const result = formatCellValue.call(mockApp, obj);
      expect(typeof result).toBe('string');
      expect(result).toContain('[object Object]');
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      const result = formatCellValue.call(mockApp, arr);
      expect(typeof result).toBe('string');
    });
  });

  describe('formatCellValueForTooltip', () => {
    const mockApp = {} as ChumakApp;

    it('should format error objects as "Error"', () => {
      const errorObj = { type: 'error', message: 'Cannot convert "abc" to integer' };
      expect(formatCellValueForTooltip.call(mockApp, errorObj)).toBe('Error');
    });

    it('should format null/undefined/empty as "null"', () => {
      expect(formatCellValueForTooltip.call(mockApp, null)).toBe('null');
      expect(formatCellValueForTooltip.call(mockApp, undefined)).toBe('null');
      expect(formatCellValueForTooltip.call(mockApp, '')).toBe('null');
    });

    it('should format boolean values as "true"/"false"', () => {
      expect(formatCellValueForTooltip.call(mockApp, true)).toBe('true');
      expect(formatCellValueForTooltip.call(mockApp, false)).toBe('false');
    });

    it('should format Date objects as ISO date strings', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatCellValueForTooltip.call(mockApp, date)).toBe('2024-01-15');
    });

    it('should format strings as strings', () => {
      expect(formatCellValueForTooltip.call(mockApp, 'hello')).toBe('hello');
      expect(formatCellValueForTooltip.call(mockApp, '123')).toBe('123');
    });

    it('should format numbers as strings', () => {
      expect(formatCellValueForTooltip.call(mockApp, 42)).toBe('42');
      expect(formatCellValueForTooltip.call(mockApp, 3.14)).toBe('3.14');
    });

    it('should format unexpected objects as "Error"', () => {
      const obj = { a: 1, b: 2 };
      expect(formatCellValueForTooltip.call(mockApp, obj)).toBe('Error');
    });
  });
});
