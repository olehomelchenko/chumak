import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform, matchColumnPattern } from './transforms';
import { SchemaEngine } from './schema-engine';

describe('Transform Engine', () => {
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

  describe('applyTransform() - SELECT', () => {
    it('should select single column', () => {
      const table = createTestTable();
      const transform = { select: ['sales'] };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales']);
      expect(result.numRows()).toBe(5);
    });

    it('should select multiple columns', () => {
      const table = createTestTable();
      const transform = { select: ['sales', 'region', 'status'] };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      const columns = result.columnNames();
      expect(columns).toEqual(['sales', 'region', 'status']);
      expect(result.numRows()).toBe(5);
    });
  });

  describe('matchColumnPattern()', () => {
    it('should match columns with prefix pattern', () => {
      const columns = ['sales_2023', 'sales_2024', 'revenue', 'cost'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: 'sales_',
        matchType: 'prefix',
      });
      expect(result).toEqual(['sales_2023', 'sales_2024']);
    });

    it('should match columns with suffix pattern', () => {
      const columns = ['sales_2023', 'revenue_2023', 'cost', 'profit_2023'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: '_2023',
        matchType: 'suffix',
      });
      expect(result).toEqual(['sales_2023', 'revenue_2023', 'profit_2023']);
    });
  });

  describe('applyTransform() - FILTER', () => {
    it('should filter with simple comparison', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 1000' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(2); // 1500 and 2000
      const rows = result.objects();
      expect(rows[0].sales).toBe(1500);
      expect(rows[1].sales).toBe(2000);
    });

    it('should filter with equality', () => {
      const table = createTestTable();
      const transform = { filter: 'region == "North"' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(2);
      const rows = result.objects();
      expect(rows.every((r: any) => r.region === 'North')).toBe(true);
    });

    it('should filter with regexp_match', () => {
      const table = (aq as any).from([
        { code: 'AB123', name: 'Alpha' },
        { code: 'ab456', name: 'Beta' },
        { code: 'XY789', name: 'Gamma' },
        { code: '12345', name: 'Delta' },
      ]);
      const transform = { filter: 'regexp_match(code, "^[A-Z]{2}")' };
      const result = applyTransform(table, transform, ['code', 'name']);

      expect(result.numRows()).toBe(2);
      const rows = result.objects();
      expect(rows[0].code).toBe('AB123');
      expect(rows[1].code).toBe('XY789');
    });
  });

  describe('applyTransform() - DERIVE', () => {
    it('should derive boolean column with regexp_match', () => {
      const table = (aq as any).from([{ code: 'AB123' }, { code: 'abc' }, { code: 'XY999' }]);
      const transform = { derive: { valid: 'regexp_match(code, "^[A-Z]{2}[0-9]+")' } };
      const result = applyTransform(table, transform, ['code']);
      const data = result.objects();

      expect(data[0].valid).toBe(true);
      expect(data[1].valid).toBe(false);
      expect(data[2].valid).toBe(true);
    });

    it('should derive string column with regexp_extract', () => {
      const table = (aq as any).from([{ email: 'alice@gmail.com' }, { email: 'bob@company.org' }]);
      const transform = { derive: { domain: 'regexp_extract(email, "@(.+)$", 1)' } };
      const result = applyTransform(table, transform, ['email']);
      const data = result.objects();

      expect(data[0].domain).toBe('gmail.com');
      expect(data[1].domain).toBe('company.org');
    });
  });

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

  describe('applyTransform() - SLICE ROWS', () => {
    it('should keep first N rows', () => {
      const table = createTestTable();
      const transform = { sliceRows: { count: 2, mode: 'first' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(2);
      const rows = result.objects();
      expect(rows[0].sales).toBe(1000);
      expect(rows[1].sales).toBe(1500);
    });

    it('should keep last N rows', () => {
      const table = createTestTable();
      const transform = { sliceRows: { count: 2, mode: 'last' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(2);
      const rows = result.objects();
      expect(rows[0].sales).toBe(2000);
      expect(rows[1].sales).toBe(500);
    });

    it('should remove first N rows', () => {
      const table = createTestTable();
      const transform = { sliceRows: { count: 2, mode: 'removeFirst' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(3);
      const rows = result.objects();
      expect(rows[0].sales).toBe(800);
      expect(rows[1].sales).toBe(2000);
      expect(rows[2].sales).toBe(500);
    });

    it('should remove last N rows', () => {
      const table = createTestTable();
      const transform = { sliceRows: { count: 2, mode: 'removeLast' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(3);
      const rows = result.objects();
      expect(rows[0].sales).toBe(1000);
      expect(rows[1].sales).toBe(1500);
      expect(rows[2].sales).toBe(800);
    });

    it('should handle count greater than total rows', () => {
      const table = createTestTable();
      const transform = { sliceRows: { count: 100, mode: 'first' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(5);
    });

    it('should return empty table when removing all rows', () => {
      const table = createTestTable();
      const transform = { sliceRows: { count: 100, mode: 'removeFirst' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).toBe(0);
    });
  });

  describe('applyTransform() - ADD INDEX', () => {
    it('should add index column starting from 1', () => {
      const table = createTestTable();
      const transform = { addIndex: { columnName: 'row_num', startFrom: 1 } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.columnNames()).toContain('row_num');
      const rows = result.objects();
      expect(rows[0].row_num).toBe(1);
      expect(rows[1].row_num).toBe(2);
      expect(rows[4].row_num).toBe(5);
    });

    it('should add index column starting from 0', () => {
      const table = createTestTable();
      const transform = { addIndex: { columnName: 'idx', startFrom: 0 } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      const rows = result.objects();
      expect(rows[0].idx).toBe(0);
      expect(rows[1].idx).toBe(1);
      expect(rows[4].idx).toBe(4);
    });

    it('should add index column with custom start value', () => {
      const table = createTestTable();
      const transform = { addIndex: { columnName: 'id', startFrom: 100 } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      const rows = result.objects();
      expect(rows[0].id).toBe(100);
      expect(rows[1].id).toBe(101);
      expect(rows[4].id).toBe(104);
    });

    it('should preserve existing columns when adding index', () => {
      const table = createTestTable();
      const transform = { addIndex: { columnName: 'row_index', startFrom: 1 } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.columnNames()).toEqual([
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
        'row_index',
      ]);
      expect(result.numRows()).toBe(5);
    });
  });

  describe('describeTransform()', () => {
    it('should describe import transform', () => {
      const transform = {
        import: {
          source: 'data.csv',
          headerMode: 'first-row',
        },
      };
      const desc = describeTransform(transform);
      expect(desc).toContain('Import: data.csv');
      expect(desc).toContain('headers from first row');
    });

    it('should describe select transform', () => {
      const transform = { select: ['sales', 'revenue', 'cost'] };
      const desc = describeTransform(transform);
      expect(desc).toBe('Select: 3 columns');
    });

    it('should describe filter transform', () => {
      const transform = { filter: 'sales > 1000' };
      const desc = describeTransform(transform);
      expect(desc).toBe('Filter: sales > 1000');
    });

    it('should describe aggregation', () => {
      const transform = {
        aggregate: {
          groupby: ['region'],
          rollup: { total: "op.sum('sales')", avg: "op.mean('sales')" },
        },
      };
      const desc = describeTransform(transform);
      expect(desc).toContain('Aggregate: by[region]');
      expect(desc).toContain('2 summaries');
    });

    it('should describe sliceRows transform', () => {
      expect(describeTransform({ sliceRows: { count: 10, mode: 'first' } })).toBe(
        'Keep first 10 rows'
      );
      expect(describeTransform({ sliceRows: { count: 5, mode: 'last' } })).toBe('Keep last 5 rows');
      expect(describeTransform({ sliceRows: { count: 3, mode: 'removeFirst' } })).toBe(
        'Remove first 3 rows'
      );
      expect(describeTransform({ sliceRows: { count: 1, mode: 'removeLast' } })).toBe(
        'Remove last 1 row'
      );
    });

    it('should describe addIndex transform', () => {
      expect(describeTransform({ addIndex: { columnName: 'row_num', startFrom: 1 } })).toBe(
        'Add Index: row_num'
      );
      expect(describeTransform({ addIndex: { columnName: 'idx', startFrom: 0 } })).toBe(
        'Add Index: idx'
      );
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
});
