import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform } from './transforms';

describe('Transform Engine - Aggregation Operations', () => {
  // Helper to create test data
  function createTestTable() {
    return (aq as any).from([
      { sales: 1000, revenue: 5000, cost: 3000, region: 'North', status: 'active' },
      { sales: 1500, revenue: 7000, cost: 4000, region: 'South', status: 'active' },
      { sales: 800, revenue: 4000, cost: 2500, region: 'North', status: 'pending' },
      { sales: 2000, revenue: 10000, cost: 6000, region: 'East', status: 'active' },
      { sales: 500, revenue: 3000, cost: 2000, region: 'West', status: 'inactive' },
    ]);
  }

  describe('applyTransform() - AGGREGATE', () => {
    it('should aggregate with count', () => {
      const table = createTestTable();
      const transform = {
        aggregate: {
          groupby: ['region'],
          rollup: { count: 'op.count()' },
        },
      };

      const result = applyTransform(table, transform, ['region']);

      expect(result.numRows()).toBe(4);
      const rows = result.orderby('region').objects();

      expect(rows[0].region).toBe('East');
      expect(rows[0].count).toBe(1);

      expect(rows[1].region).toBe('North');
      expect(rows[1].count).toBe(2);
    });

    it('should mitigate floating point errors in sum/mean', () => {
      const floatTable = (aq as any).from([
        { id: 1, val: 0.1 },
        { id: 1, val: 0.2 },
      ]);

      const transform = {
        aggregate: {
          groupby: ['id'],
          rollup: {
            total: "op.sum('val')",
            avg: "op.mean('val')",
          },
        },
      };

      const result = applyTransform(floatTable, transform, ['id', 'val']);
      const row = result.object(0);

      expect(row.total).toBe(0.3);
      expect(row.avg).toBe(0.15);
    });
  });

  describe('applyTransform() - SPLIT', () => {
    it('should split column with comma delimiter', () => {
      const table = (aq as any).from([
        { name: 'John,Doe,25', id: 1 },
        { name: 'Jane,Smith,30', id: 2 },
      ]);
      const transform = {
        split: {
          column: 'name',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['name', 'id']);

      expect(result.columnNames()).toEqual(['id', 'name_1', 'name_2', 'name_3']);
      const rows = result.objects();
      expect(rows[0]).toEqual({ id: 1, name_1: 'John', name_2: 'Doe', name_3: '25' });
    });
  });

  describe('applyTransform() - PIVOT', () => {
    it('should pivot with rows, columns, and values', () => {
      const table = (aq as any).from([
        { product: 'Widget', region: 'North', sales: 100 },
        { product: 'Widget', region: 'South', sales: 150 },
        { product: 'Gadget', region: 'North', sales: 200 },
        { product: 'Gadget', region: 'South', sales: 250 },
      ]);
      const transform = {
        pivot: {
          rows: ['product'],
          keys: 'region',
          values: 'sales',
          aggregation: 'any',
          options: { sort: true },
        },
      };
      const result = applyTransform(table, transform, ['product', 'region', 'sales']);

      expect(result.columnNames()).toContain('product');
      expect(result.columnNames()).toContain('North');
      expect(result.columnNames()).toContain('South');
      expect(result.numRows()).toBe(2);

      const rows = result.orderby('product').objects();
      expect(rows[0].product).toBe('Gadget');
      expect(rows[0].North).toBe(200);
      expect(rows[0].South).toBe(250);
      expect(rows[1].product).toBe('Widget');
      expect(rows[1].North).toBe(100);
      expect(rows[1].South).toBe(150);
    });

    it('should pivot with sum aggregation', () => {
      const table = (aq as any).from([
        { product: 'Widget', region: 'North', sales: 100 },
        { product: 'Widget', region: 'North', sales: 50 },
        { product: 'Widget', region: 'South', sales: 150 },
      ]);
      const transform = {
        pivot: {
          rows: ['product'],
          keys: 'region',
          values: 'sales',
          aggregation: 'sum',
          options: { sort: true },
        },
      };
      const result = applyTransform(table, transform, ['product', 'region', 'sales']);

      const rows = result.objects();
      expect(rows[0].North).toBe(150); // 100 + 50
      expect(rows[0].South).toBe(150);
    });

    it('should pivot without row columns (single aggregated row)', () => {
      const table = (aq as any).from([
        { product: 'Widget', region: 'North', sales: 100 },
        { product: 'Widget', region: 'South', sales: 150 },
        { product: 'Gadget', region: 'North', sales: 200 },
      ]);
      const transform = {
        pivot: {
          keys: 'region',
          values: 'sales',
          aggregation: 'sum',
          options: { sort: true },
        },
      };
      const result = applyTransform(table, transform, ['product', 'region', 'sales']);

      expect(result.numRows()).toBe(1);
      const rows = result.objects();
      expect(rows[0].North).toBe(300); // 100 + 200
      expect(rows[0].South).toBe(150);
    });

    it('should respect limit option', () => {
      const table = (aq as any).from([
        { product: 'Widget', region: 'North', sales: 100 },
        { product: 'Widget', region: 'South', sales: 150 },
        { product: 'Widget', region: 'East', sales: 120 },
        { product: 'Widget', region: 'West', sales: 80 },
      ]);
      const transform = {
        pivot: {
          rows: ['product'],
          keys: 'region',
          values: 'sales',
          aggregation: 'any',
          options: { sort: true, limit: 2 },
        },
      };
      const result = applyTransform(table, transform, ['product', 'region', 'sales']);

      // Should only have product + 2 pivoted columns
      expect(result.columnNames().length).toBe(3);
    });

    it('should pivot with multiple row columns', () => {
      const table = (aq as any).from([
        { category: 'Electronics', product: 'Phone', region: 'North', sales: 100 },
        { category: 'Electronics', product: 'Phone', region: 'South', sales: 150 },
        { category: 'Electronics', product: 'Laptop', region: 'North', sales: 200 },
      ]);
      const transform = {
        pivot: {
          rows: ['category', 'product'],
          keys: 'region',
          values: 'sales',
          aggregation: 'sum',
          options: { sort: true },
        },
      };
      const result = applyTransform(table, transform, ['category', 'product', 'region', 'sales']);

      expect(result.columnNames()).toContain('category');
      expect(result.columnNames()).toContain('product');
      expect(result.columnNames()).toContain('North');
      expect(result.columnNames()).toContain('South');
      expect(result.numRows()).toBe(2);
    });
  });

  describe('describeTransform() - PIVOT', () => {
    it('should describe pivot transform', () => {
      const transform = {
        pivot: {
          rows: ['product'],
          keys: 'region',
          values: 'sales',
          aggregation: 'sum',
        },
      };
      const desc = describeTransform(transform);
      expect(desc).toBe('Pivot: sum(sales) by region');
    });

    it('should describe pivot transform with count aggregation', () => {
      const transform = {
        pivot: {
          keys: 'category',
          values: 'id',
          aggregation: 'count',
        },
      };
      const desc = describeTransform(transform);
      expect(desc).toBe('Pivot: count(id) by category');
    });
  });

  describe('applyTransform() - IMPUTE', () => {
    function createImputeTable() {
      return (aq as any).from([
        { id: 1, val: 10, category: 'A' },
        { id: 2, val: null, category: null },
        { id: 3, val: 30, category: 'B' },
        { id: 4, val: null, category: 'A' },
        { id: 5, val: 50, category: null },
      ]);
    }

    it('should impute with constant', () => {
      const table = createImputeTable();
      const transform = { impute: { column: 'val', strategy: 'constant' as const, value: 0 } };
      const result = applyTransform(table, transform, ['id', 'val', 'category']);
      const rows = result.objects();
      expect(rows[1].val).toBe(0);
      expect(rows[3].val).toBe(0);
    });

    it('should impute with mean', () => {
      const table = createImputeTable();
      const transform = { impute: { column: 'val', strategy: 'mean' as const } };
      const result = applyTransform(table, transform, ['id', 'val', 'category']);
      const rows = result.objects();
      // (10 + 30 + 50) / 3 = 30
      expect(rows[1].val).toBe(30);
      expect(rows[3].val).toBe(30);
    });

    it('should impute with forward fill', () => {
      const table = createImputeTable();
      const transform = { impute: { column: 'val', strategy: 'forwardFill' as const } };
      const result = applyTransform(table, transform, ['id', 'val', 'category']);
      const rows = result.objects();
      expect(rows[1].val).toBe(10);
      expect(rows[3].val).toBe(30);
    });

    it('should impute with backward fill', () => {
      const table = createImputeTable();
      const transform = { impute: { column: 'val', strategy: 'backwardFill' as const } };
      const result = applyTransform(table, transform, ['id', 'val', 'category']);
      const rows = result.objects();
      expect(rows[1].val).toBe(30);
      expect(rows[3].val).toBe(50);
    });

    it('should impute with linear interpolation', () => {
      const table = createImputeTable();
      const transform = { impute: { column: 'id', strategy: 'linearInterpolation' as const } };
      // id has no nulls, let's create a table with nulls in id
      const tableWithNulls = (aq as any).from([{ id: 10 }, { id: null }, { id: null }, { id: 40 }]);
      const result = applyTransform(
        tableWithNulls,
        {
          impute: { column: 'id', strategy: 'linearInterpolation' as const },
        },
        ['id']
      );
      const rows = result.objects();
      // 10, 20, 30, 40
      expect(rows[2].id).toBe(30);
    });

    it('should impute empty strings when includeEmptyString is true', () => {
      const table = (aq as any).from([
        { id: 1, name: 'Alice' },
        { id: 2, name: '' },
        { id: 3, name: null },
      ]);
      const transform = {
        impute: {
          column: 'name',
          strategy: 'constant' as const,
          value: 'Unknown',
          includeEmptyString: true,
        },
      };
      const result = applyTransform(table, transform, ['id', 'name']);
      const rows = result.objects();
      expect(rows[1].name).toBe('Unknown');
      expect(rows[2].name).toBe('Unknown');
    });

    it('should NOT impute empty strings when includeEmptyString is false', () => {
      const table = (aq as any).from([
        { id: 1, name: 'Alice' },
        { id: 2, name: '' },
        { id: 3, name: null },
      ]);
      const transform = {
        impute: {
          column: 'name',
          strategy: 'constant' as const,
          value: 'Unknown',
          includeEmptyString: false,
        },
      };
      const result = applyTransform(table, transform, ['id', 'name']);
      const rows = result.objects();
      expect(rows[1].name).toBe('');
      expect(rows[2].name).toBe('Unknown');
    });
  });
});
