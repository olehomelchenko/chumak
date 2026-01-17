import { describe, it, expect, vi } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform, matchColumnPattern } from './transforms';
import { SchemaEngine, ColumnType } from './schema-engine';

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
      expect(desc).toContain('Group by (1 column)');
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

  describe('applyTransform() - Unknown Transform Keys (Future-proofing)', () => {
    it('should skip unknown transform keys and return table unchanged', () => {
      const table = createTestTable();
      const originalColumns = table.columnNames();
      const originalRowCount = table.numRows();

      // Simulate a future transform that doesn't exist yet
      const transform = { futureTransform: { someParam: 'value' } } as any;

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = applyTransform(table, transform, originalColumns, null);

      // Table should be unchanged
      expect(result.columnNames()).toEqual(originalColumns);
      expect(result.numRows()).toBe(originalRowCount);
      expect(result.objects()).toEqual(table.objects());

      // Warning should be logged
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown transform key "futureTransform"')
      );

      spy.mockRestore();
    });

    it('should skip unknown transform keys and continue with remaining transforms', () => {
      const table = createTestTable();
      const transform1 = { futureTransform: { param: 'value' } } as any;
      const transform2 = { select: ['sales', 'region'] };

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // First apply unknown transform (should be skipped)
      const afterUnknown = applyTransform(table, transform1, ['sales', 'revenue', 'region'], null);
      expect(afterUnknown.columnNames()).toEqual(['sales', 'revenue', 'cost', 'region', 'status']);

      // Then apply known transform (should work normally)
      const result = applyTransform(afterUnknown, transform2, ['sales', 'region'], null);
      expect(result.columnNames()).toEqual(['sales', 'region']);

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown transform key "futureTransform"')
      );

      spy.mockRestore();
    });

    it('should ignore __v version field when checking for unknown keys', () => {
      const table = createTestTable();
      const transform = { select: ['sales'], __v: 1 } as any;

      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = applyTransform(table, transform, ['sales', 'revenue'], null);

      // Transform should work normally (__v is ignored)
      expect(result.columnNames()).toEqual(['sales']);
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
