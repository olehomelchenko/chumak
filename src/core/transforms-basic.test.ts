import { describe, it, expect, vi } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform, matchColumnPattern } from './transforms';

describe('Transform Engine - Basic Operations', () => {
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

    it('should exclude rows where expression evaluates to ConversionError', () => {
      const table = (aq as any).from([
        { value: 10 },
        { value: { type: 'error', message: 'conversion failed' } },
        { value: null },
        { value: 20 },
      ]);
      const transform = { filter: 'not is_error(value) or value != null' };
      const result = applyTransform(table, transform, ['value']);

      const rows = result.objects();
      // ConversionError rows should be excluded (not treated as truthy)
      // null passes because `not is_error(null)` is true (short-circuits the `or`)
      expect(rows.length).toBe(3);
      expect(rows[0].value).toBe(10);
      expect(rows[1].value).toBe(null);
      expect(rows[2].value).toBe(20);
    });

    it('should filter with compound logical expressions on error values', () => {
      const table = (aq as any).from([
        { value: 10 },
        { value: { type: 'error', message: 'bad' } },
        { value: null },
        { value: 30 },
      ]);
      const transform = { filter: 'not is_error(value) and value != null' };
      const result = applyTransform(table, transform, ['value']);

      const rows = result.objects();
      expect(rows.length).toBe(2);
      expect(rows[0].value).toBe(10);
      expect(rows[1].value).toBe(30);
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

  describe('applyTransform() - REMOVE ROWS', () => {
    it('should remove rows by indices', () => {
      const table = createTestTable();
      const cols = ['sales', 'revenue', 'cost', 'region', 'status'];
      const result = applyTransform(table, { removeRows: { indices: [1, 3] } }, cols);

      expect(result.numRows()).toBe(3);
      const rows = result.objects();
      expect(rows[0].sales).toBe(1000);
      expect(rows[1].sales).toBe(800);
      expect(rows[2].sales).toBe(500);
    });

    it('should handle removing all rows', () => {
      const table = createTestTable();
      const cols = ['sales', 'revenue', 'cost', 'region', 'status'];
      const result = applyTransform(table, { removeRows: { indices: [0, 1, 2, 3, 4] } }, cols);

      expect(result.numRows()).toBe(0);
    });

    it('should handle empty indices array', () => {
      const table = createTestTable();
      const cols = ['sales', 'revenue', 'cost', 'region', 'status'];
      const result = applyTransform(table, { removeRows: { indices: [] } }, cols);

      expect(result.numRows()).toBe(5);
    });
  });

  describe('applyTransform() - KEEP ROWS', () => {
    it('should keep only specified rows', () => {
      const table = createTestTable();
      const cols = ['sales', 'revenue', 'cost', 'region', 'status'];
      const result = applyTransform(table, { keepRows: { indices: [0, 2, 4] } }, cols);

      expect(result.numRows()).toBe(3);
      const rows = result.objects();
      expect(rows[0].sales).toBe(1000);
      expect(rows[1].sales).toBe(800);
      expect(rows[2].sales).toBe(500);
    });

    it('should handle keeping a single row', () => {
      const table = createTestTable();
      const cols = ['sales', 'revenue', 'cost', 'region', 'status'];
      const result = applyTransform(table, { keepRows: { indices: [2] } }, cols);

      expect(result.numRows()).toBe(1);
      expect(result.objects()[0].region).toBe('North');
    });

    it('should handle empty indices array', () => {
      const table = createTestTable();
      const cols = ['sales', 'revenue', 'cost', 'region', 'status'];
      const result = applyTransform(table, { keepRows: { indices: [] } }, cols);

      expect(result.numRows()).toBe(0);
    });
  });

  describe('applyTransform() - PROMOTE HEADER', () => {
    it('should promote first row to header (skipRows=0)', () => {
      const table = (aq as any).from([
        { col1: 'Name', col2: 'Age', col3: 'City' },
        { col1: 'Alice', col2: '30', col3: 'London' },
        { col1: 'Bob', col2: '25', col3: 'Paris' },
      ]);
      const cols = ['col1', 'col2', 'col3'];
      const result = applyTransform(table, { promoteHeader: { skipRows: 0 } }, cols);

      expect(result.columnNames()).toEqual(['Name', 'Age', 'City']);
      expect(result.numRows()).toBe(2);
      expect(result.objects()[0]).toEqual({ Name: 'Alice', Age: '30', City: 'London' });
    });

    it('should skip rows before promoting (skipRows=1)', () => {
      const table = (aq as any).from([
        { col1: 'garbage', col2: 'junk', col3: 'skip' },
        { col1: 'Name', col2: 'Age', col3: 'City' },
        { col1: 'Alice', col2: '30', col3: 'London' },
      ]);
      const cols = ['col1', 'col2', 'col3'];
      const result = applyTransform(table, { promoteHeader: { skipRows: 1 } }, cols);

      expect(result.columnNames()).toEqual(['Name', 'Age', 'City']);
      expect(result.numRows()).toBe(1);
      expect(result.objects()[0]).toEqual({ Name: 'Alice', Age: '30', City: 'London' });
    });

    it('should handle empty/null values in header row', () => {
      const table = (aq as any).from([
        { col1: 'Name', col2: '', col3: null },
        { col1: 'Alice', col2: '30', col3: 'London' },
      ]);
      const cols = ['col1', 'col2', 'col3'];
      const result = applyTransform(table, { promoteHeader: { skipRows: 0 } }, cols);

      expect(result.columnNames()[0]).toBe('Name');
      expect(result.columnNames()[1]).toBe('Column 2');
      expect(result.columnNames()[2]).toBe('Column 3');
    });

    it('should deduplicate header names', () => {
      const table = (aq as any).from([
        { col1: 'X', col2: 'X', col3: 'X' },
        { col1: 'a', col2: 'b', col3: 'c' },
      ]);
      const cols = ['col1', 'col2', 'col3'];
      const result = applyTransform(table, { promoteHeader: { skipRows: 0 } }, cols);

      const names = result.columnNames();
      expect(names[0]).toBe('X');
      expect(names[1]).toBe('X_2');
      expect(names[2]).toBe('X_3');
    });

    it('should throw when not enough rows', () => {
      const table = (aq as any).from([{ col1: 'only' }]);
      const cols = ['col1'];
      expect(() => applyTransform(table, { promoteHeader: { skipRows: 5 } }, cols)).toThrow(
        'Not enough rows'
      );
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

    it('should describe removeRows transform', () => {
      expect(describeTransform({ removeRows: { indices: [0, 2, 4] } })).toBe('Remove 3 rows');
      expect(describeTransform({ removeRows: { indices: [1] } })).toBe('Remove 1 row');
    });

    it('should describe keepRows transform', () => {
      expect(describeTransform({ keepRows: { indices: [0, 1] } })).toBe('Keep 2 rows');
      expect(describeTransform({ keepRows: { indices: [3] } })).toBe('Keep 1 row');
    });

    it('should describe promoteHeader transform', () => {
      expect(describeTransform({ promoteHeader: { skipRows: 0 } })).toBe('Headers from row 1');
      expect(describeTransform({ promoteHeader: { skipRows: 4 } })).toBe('Headers from row 5');
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

  describe('applyTransform() - SORT', () => {
    it('should sort ascending by single field (object form)', () => {
      const table = createTestTable();
      const result = applyTransform(table, { sort: { field: 'sales', order: 'asc' } }, ['sales']);
      const rows = result.objects();
      expect(rows[0].sales).toBe(500);
      expect(rows[rows.length - 1].sales).toBe(2000);
    });

    it('should sort descending by single field (object form)', () => {
      const table = createTestTable();
      const result = applyTransform(table, { sort: { field: 'sales', order: 'desc' } }, ['sales']);
      const rows = result.objects();
      expect(rows[0].sales).toBe(2000);
      expect(rows[rows.length - 1].sales).toBe(500);
    });

    it('should sort by single field (array form)', () => {
      const table = createTestTable();
      const result = applyTransform(table, { sort: [{ field: 'sales', order: 'asc' }] }, ['sales']);
      const rows = result.objects();
      expect(rows[0].sales).toBe(500);
      expect(rows[rows.length - 1].sales).toBe(2000);
    });

    it('should sort by multiple fields', () => {
      const table = createTestTable();
      const result = applyTransform(
        table,
        {
          sort: [
            { field: 'region', order: 'asc' },
            { field: 'sales', order: 'desc' },
          ],
        },
        ['region', 'sales']
      );
      const rows = result.objects();
      // East first, then North (sorted by sales desc within group), South, West
      expect(rows[0].region).toBe('East');
      expect(rows[1].region).toBe('North');
      expect(rows[1].sales).toBe(1000); // higher North sales first (desc)
      expect(rows[2].region).toBe('North');
      expect(rows[2].sales).toBe(800);
    });

    it('should handle mixed asc/desc in multi-field sort', () => {
      const table = createTestTable();
      const result = applyTransform(
        table,
        {
          sort: [
            { field: 'status', order: 'desc' },
            { field: 'sales', order: 'asc' },
          ],
        },
        ['status', 'sales']
      );
      const rows = result.objects();
      // 'pending' > 'inactive' > 'active' (desc), then sales asc within
      expect(rows[0].status).toBe('pending');
      expect(rows[rows.length - 1].status).toBe('active');
    });
  });

  describe('applyTransform() - REPLACE', () => {
    it('should replace exact value', () => {
      const table = (aq as any).from([
        { name: 'Alice', city: 'London' },
        { name: 'Bob', city: 'Paris' },
        { name: 'Carol', city: 'London' },
      ]);
      const transform = {
        replace: { column: 'city', find: 'London', replace: 'Berlin', isRegex: false },
      };
      const result = applyTransform(table, transform, ['name', 'city']);
      const rows = result.objects();
      expect(rows[0].city).toBe('Berlin');
      expect(rows[1].city).toBe('Paris');
      expect(rows[2].city).toBe('Berlin');
    });

    it('should replace conversion errors with matchMode "errors"', () => {
      const table = (aq as any).from([
        { value: 10 },
        { value: { type: 'error', message: 'Cannot convert "abc"' } },
        { value: 20 },
        { value: { type: 'error', message: 'Cannot convert "xyz"' } },
      ]);
      const transform = {
        replace: { column: 'value', find: null, replace: '0', matchMode: 'errors' },
      };
      const result = applyTransform(table, transform, ['value']);
      const rows = result.objects();
      expect(rows[0].value).toBe(10);
      expect(rows[1].value).toBe('0');
      expect(rows[2].value).toBe(20);
      expect(rows[3].value).toBe('0');
    });

    it('should replace null values with matchMode "null"', () => {
      const table = (aq as any).from([
        { value: 'hello' },
        { value: null },
        { value: 'world' },
        { value: undefined },
      ]);
      const transform = {
        replace: { column: 'value', find: null, replace: 'N/A', matchMode: 'null' },
      };
      const result = applyTransform(table, transform, ['value']);
      const rows = result.objects();
      expect(rows[0].value).toBe('hello');
      expect(rows[1].value).toBe('N/A');
      expect(rows[2].value).toBe('world');
      expect(rows[3].value).toBe('N/A');
    });

    it('should not replace non-error values in matchMode "errors"', () => {
      const table = (aq as any).from([{ value: null }, { value: 'text' }, { value: 0 }]);
      const transform = {
        replace: { column: 'value', find: null, replace: 'replaced', matchMode: 'errors' },
      };
      const result = applyTransform(table, transform, ['value']);
      const rows = result.objects();
      expect(rows[0].value).toBe(null);
      expect(rows[1].value).toBe('text');
      expect(rows[2].value).toBe(0);
    });
  });

  describe('describeTransform() - SORT', () => {
    it('should describe single-field sort (object form)', () => {
      expect(describeTransform({ sort: { field: 'name', order: 'asc' } })).toBe(
        'Sort: name \u2191'
      );
    });

    it('should describe single-field sort (array form)', () => {
      expect(describeTransform({ sort: [{ field: 'name', order: 'desc' }] })).toBe(
        'Sort: name \u2193'
      );
    });

    it('should describe multi-field sort', () => {
      expect(
        describeTransform({
          sort: [
            { field: 'region', order: 'asc' },
            { field: 'sales', order: 'desc' },
          ],
        })
      ).toBe('Sort: region \u2191, sales \u2193');
    });
  });
});
