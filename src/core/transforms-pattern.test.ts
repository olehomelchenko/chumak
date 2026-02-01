import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, matchColumnPattern } from './transforms';

describe('Transform Engine - Pattern Operations', () => {
  describe('applyTransform() - SELECT_PATTERN', () => {
    it('should select columns matching prefix pattern', () => {
      const table = (aq as any).from([
        { sales_2023: 100, sales_2024: 200, revenue: 500, cost_2023: 50 },
      ]);
      const transform = { selectPattern: { pattern: 'sales_', matchType: 'prefix' } };
      const result = applyTransform(table, transform, [
        'sales_2023',
        'sales_2024',
        'revenue',
        'cost_2023',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales_2023', 'sales_2024']);
      expect(result.numRows()).toBe(1);
    });

    it('should select columns matching suffix pattern', () => {
      const table = (aq as any).from([
        { sales_2023: 100, revenue_2023: 500, cost: 50, profit_2023: 40 },
      ]);
      const transform = { selectPattern: { pattern: '_2023', matchType: 'suffix' } };
      const result = applyTransform(table, transform, [
        'sales_2023',
        'revenue_2023',
        'cost',
        'profit_2023',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales_2023', 'revenue_2023', 'profit_2023']);
    });

    it('should select columns matching contains pattern', () => {
      const table = (aq as any).from([{ sales_q1: 100, revenue_q1: 500, cost: 50, sales_q2: 200 }]);
      const transform = { selectPattern: { pattern: 'sales', matchType: 'contains' } };
      const result = applyTransform(table, transform, [
        'sales_q1',
        'revenue_q1',
        'cost',
        'sales_q2',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales_q1', 'sales_q2']);
    });

    it('should select columns matching regex pattern', () => {
      const table = (aq as any).from([{ sales_2023: 100, sales_2024: 200, revenue: 500 }]);
      const transform = { selectPattern: { pattern: '^sales_', matchType: 'regex' } };
      const result = applyTransform(table, transform, ['sales_2023', 'sales_2024', 'revenue']);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales_2023', 'sales_2024']);
    });

    it('should include additional columns when specified', () => {
      const table = (aq as any).from([{ sales_2023: 100, sales_2024: 200, id: 1, name: 'Test' }]);
      const transform = {
        selectPattern: { pattern: 'sales_', matchType: 'prefix', include: ['id'] },
      };
      const result = applyTransform(table, transform, ['sales_2023', 'sales_2024', 'id', 'name']);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales_2023', 'sales_2024', 'id']);
    });
  });

  describe('applyTransform() - REMOVE_PATTERN', () => {
    it('should remove columns matching prefix pattern', () => {
      const table = (aq as any).from([
        { sales_2023: 100, sales_2024: 200, revenue: 500, cost: 50 },
      ]);
      const transform = { removePattern: { pattern: 'sales_', matchType: 'prefix' } };
      const result = applyTransform(table, transform, [
        'sales_2023',
        'sales_2024',
        'revenue',
        'cost',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['revenue', 'cost']);
    });

    it('should remove columns matching regex pattern', () => {
      const table = (aq as any).from([
        { sales_2023: 100, sales_backup: 200, revenue: 500, cost: 50 },
      ]);
      const transform = { removePattern: { pattern: '_backup$', matchType: 'regex' } };
      const result = applyTransform(table, transform, [
        'sales_2023',
        'sales_backup',
        'revenue',
        'cost',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales_2023', 'revenue', 'cost']);
    });
  });

  describe('applyTransform() - CONDITIONAL', () => {
    it('should create column based on conditions', () => {
      const table = (aq as any).from([
        { sales: 12000 },
        { sales: 6000 },
        { sales: 2000 },
        { sales: 300 },
      ]);
      const transform = {
        conditional: {
          column: 'tier',
          conditions: [
            { when: 'sales > 10000', then: "'platinum'" },
            { when: 'sales > 5000', then: "'gold'" },
            { when: 'sales > 1000', then: "'silver'" },
          ],
          else: "'bronze'",
        },
      };
      const result = applyTransform(table, transform, ['sales']);
      const rows = result.objects();

      expect(rows[0].tier).toBe('platinum');
      expect(rows[1].tier).toBe('gold');
      expect(rows[2].tier).toBe('silver');
      expect(rows[3].tier).toBe('bronze');
    });

    it('should use else value when no conditions match', () => {
      const table = (aq as any).from([{ value: 50 }]);
      const transform = {
        conditional: {
          column: 'status',
          conditions: [{ when: 'value > 100', then: "'high'" }],
          else: "'low'",
        },
      };
      const result = applyTransform(table, transform, ['value']);
      const rows = result.objects();

      expect(rows[0].status).toBe('low');
    });

    it('should evaluate conditions in order', () => {
      const table = (aq as any).from([{ sales: 15000 }]);
      const transform = {
        conditional: {
          column: 'tier',
          conditions: [
            { when: 'sales > 5000', then: "'gold'" },
            { when: 'sales > 10000', then: "'platinum'" },
          ],
          else: "'bronze'",
        },
      };
      const result = applyTransform(table, transform, ['sales']);
      const rows = result.objects();

      // First matching condition should win (sales > 5000)
      expect(rows[0].tier).toBe('gold');
    });
  });

  describe('applyTransform() - RENAME_PATTERN', () => {
    it('should rename columns by text pattern', () => {
      const table = (aq as any).from([{ sales_old: 100, revenue_old: 500, cost: 50 }]);
      const transform = { renamePattern: { find: '_old', replace: '_new', regex: false } };
      const result = applyTransform(table, transform, ['sales_old', 'revenue_old', 'cost']);
      const rows = result.objects();

      expect(result.columnNames()).toEqual(['sales_new', 'revenue_new', 'cost']);
      expect(rows[0].sales_new).toBe(100);
      expect(rows[0].revenue_new).toBe(500);
    });

    it('should rename columns by regex pattern', () => {
      const table = (aq as any).from([{ sales_2023: 100, revenue_2023: 500, cost: 50 }]);
      const transform = { renamePattern: { find: '_2023$', replace: '_2024', regex: true } };
      const result = applyTransform(table, transform, ['sales_2023', 'revenue_2023', 'cost']);
      const rows = result.objects();

      expect(result.columnNames()).toEqual(['sales_2024', 'revenue_2024', 'cost']);
      expect(rows[0].sales_2024).toBe(100);
    });

    it('should handle invalid regex gracefully', () => {
      const table = (aq as any).from([{ sales: 100 }]);
      const transform = { renamePattern: { find: '[invalid', replace: '_new', regex: true } };
      // Should not crash, just leave columns unchanged
      const result = applyTransform(table, transform, ['sales']);
      expect(result.columnNames()).toEqual(['sales']);
    });
  });

  describe('matchColumnPattern() - extended', () => {
    it('should match columns with contains pattern', () => {
      const columns = ['sales_q1', 'revenue_q1', 'cost', 'sales_q2'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: 'sales',
        matchType: 'contains',
      });
      expect(result).toEqual(['sales_q1', 'sales_q2']);
    });

    it('should match columns with regex pattern', () => {
      const columns = ['sales_2023', 'sales_2024', 'revenue', 'cost_2023'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: '^sales_',
        matchType: 'regex',
      });
      expect(result).toEqual(['sales_2023', 'sales_2024']);
    });

    it('should handle invalid regex gracefully', () => {
      const columns = ['sales_2023', 'revenue'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: '[invalid',
        matchType: 'regex',
      });
      // Should return empty array for invalid regex
      expect(result).toEqual([]);
    });
  });
});
