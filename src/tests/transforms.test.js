/**
 * Tests for transforms.js
 */

describe('Transform Engine', () => {
  // Helper to create test data
  function createTestTable() {
    return aq.from([
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
      expect(columns).to.deep.equal(['sales']);
      expect(result.numRows()).to.equal(5);
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
      expect(columns).to.deep.equal(['sales', 'region', 'status']);
      expect(result.numRows()).to.equal(5);
    });

    it('should preserve column order in select', () => {
      const table = createTestTable();
      const transform = { select: ['status', 'region', 'sales'] };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      const columns = result.columnNames();
      expect(columns).to.deep.equal(['status', 'region', 'sales']);
    });

    it('should select all columns', () => {
      const table = createTestTable();
      const schema = ['sales', 'revenue', 'cost', 'region', 'status'];
      const transform = { select: schema };
      const result = applyTransform(table, transform, schema);

      const columns = result.columnNames();
      expect(columns).to.deep.equal(schema);
      expect(result.numRows()).to.equal(5);
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
      expect(result).to.deep.equal(['sales_2023', 'sales_2024']);
    });

    it('should match columns with suffix pattern', () => {
      const columns = ['sales_2023', 'revenue_2023', 'cost', 'profit_2023'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: '_2023',
        matchType: 'suffix',
      });
      expect(result).to.deep.equal(['sales_2023', 'revenue_2023', 'profit_2023']);
    });

    it('should match columns with exact pattern', () => {
      const columns = ['sales', 'Sales', 'revenue', 'SALES'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: 'sales',
        matchType: 'exact',
      });
      expect(result).to.deep.equal(['sales']);
    });

    it('should exclude columns with prefix pattern', () => {
      const columns = ['sales_2023', 'sales_2024', 'revenue', 'cost'];
      const result = matchColumnPattern(columns, {
        mode: 'exclude',
        pattern: 'sales_',
        matchType: 'prefix',
      });
      expect(result).to.deep.equal(['revenue', 'cost']);
    });

    it('should exclude columns with suffix pattern', () => {
      const columns = ['sales_2023', 'revenue_2023', 'cost', 'profit'];
      const result = matchColumnPattern(columns, {
        mode: 'exclude',
        pattern: '_2023',
        matchType: 'suffix',
      });
      expect(result).to.deep.equal(['cost', 'profit']);
    });

    it('should return all columns when pattern is empty', () => {
      const columns = ['sales', 'revenue', 'cost'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: '',
        matchType: 'prefix',
      });
      expect(result).to.deep.equal(['sales', 'revenue', 'cost']);
    });

    it('should return empty array when no columns match', () => {
      const columns = ['sales', 'revenue', 'cost'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: 'profit_',
        matchType: 'prefix',
      });
      expect(result).to.deep.equal([]);
    });

    it('should be case-sensitive', () => {
      const columns = ['Sales', 'sales', 'SALES'];
      const result = matchColumnPattern(columns, {
        mode: 'include',
        pattern: 'sales',
        matchType: 'prefix',
      });
      expect(result).to.deep.equal(['sales']);
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

      expect(result.numRows()).to.equal(2); // 1500 and 2000
      const rows = result.objects();
      expect(rows[0].sales).to.equal(1500);
      expect(rows[1].sales).to.equal(2000);
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

      expect(result.numRows()).to.equal(2);
      const rows = result.objects();
      expect(rows.every((r) => r.region === 'North')).to.be.true;
    });

    it('should filter with logical AND', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 1000 && region == "South"' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(1);
      const rows = result.objects();
      expect(rows[0].sales).to.equal(1500);
      expect(rows[0].region).to.equal('South');
    });

    it('should filter with logical OR', () => {
      const table = createTestTable();
      const transform = { filter: 'region == "North" || region == "South"' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(3); // 2 North + 1 South
    });

    it('should filter with complex expression', () => {
      const table = createTestTable();
      const transform = { filter: '(sales > 1000 && region == "South") || status == "inactive"' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(2); // South with sales > 1000, and inactive
    });

    it('should filter with arithmetic expression', () => {
      const table = createTestTable();
      const transform = { filter: 'revenue - cost > 3000' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(1); // Only row 4: 10000 - 6000 = 4000 > 3000
      const rows = result.objects();
      expect(rows.every((r) => r.revenue - r.cost > 3000)).to.be.true;
    });

    it('should return empty table when no rows match', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 10000' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(0);
    });

    it('should return all rows when all match', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 0' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(5);
    });

    it('should throw error for invalid expression syntax', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > > 1000' };

      expect(() => {
        applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);
      }).to.throw();
    });

    it('should throw error for unknown column', () => {
      const table = createTestTable();
      const transform = { filter: 'unknownColumn > 1000' };

      expect(() => {
        applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);
      }).to.throw('Filter validation failed');
    });

    it('should handle filters with all comparison operators', () => {
      const table = createTestTable();
      const operators = [
        { op: '>', expected: 2 },
        { op: '<', expected: 2 },
        { op: '>=', expected: 3 },
        { op: '<=', expected: 3 },
        { op: '==', expected: 1 },
        { op: '!=', expected: 4 },
      ];

      operators.forEach(({ op, expected }) => {
        const transform = { filter: `sales ${op} 1000` };
        const result = applyTransform(table, transform, [
          'sales',
          'revenue',
          'cost',
          'region',
          'status',
        ]);
        expect(result.numRows()).to.equal(expected);
      });
    });

    it('should handle filter with NOT operator', () => {
      const table = aq.from([
        { active: true, name: 'A' },
        { active: false, name: 'B' },
        { active: true, name: 'C' },
      ]);

      const transform = { filter: '!active' };
      const result = applyTransform(table, transform, ['active', 'name']);

      expect(result.numRows()).to.equal(1);
      expect(result.objects()[0].name).to.equal('B');
    });

    it('should preserve all columns after filter', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 1000' };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      const columns = result.columnNames();
      expect(columns).to.deep.equal(['sales', 'revenue', 'cost', 'region', 'status']);
    });

    it('should handle empty table', () => {
      const table = aq.from([]);
      const transform = { filter: 'sales > 1000' };
      const result = applyTransform(table, transform, ['sales']);

      expect(result.numRows()).to.equal(0);
    });
  });

  describe('applyTransform() - TYPES', () => {
    it('should pass through data unchanged', () => {
      const table = createTestTable();
      const transform = { types: { sales: 'integer', region: 'string' } };
      const result = applyTransform(table, transform, [
        'sales',
        'revenue',
        'cost',
        'region',
        'status',
      ]);

      expect(result.numRows()).to.equal(5);
      expect(result.columnNames()).to.deep.equal(table.columnNames());
      expect(result.objects()).to.deep.equal(table.objects());
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

      expect(result.numRows()).to.equal(4); // North, South, East, West
      const rows = result.orderby('region').objects();

      expect(rows[0].region).to.equal('East');
      expect(rows[0].count).to.equal(1);

      expect(rows[1].region).to.equal('North');
      expect(rows[1].count).to.equal(2);
    });

    it('should aggregate with mean', () => {
      const table = createTestTable();
      const transform = {
        aggregate: {
          groupby: ['region'],
          rollup: { avg_sales: "op.mean('sales')" },
        },
      };

      const result = applyTransform(table, transform, ['region', 'sales']);

      const rows = result.orderby('region').objects();
      // North: (1000 + 800) / 2 = 900
      expect(rows.find((r) => r.region === 'North').avg_sales).to.equal(900);
    });

    it('should mitigate floating point errors in sum/mean', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      const floatTable = aq.from([
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

      // Without mitigation, this would be 0.30000000000000004
      expect(row.total).to.equal(0.3);
      expect(row.avg).to.equal(0.15);
    });
  });

  describe('applyTransform() - Error Handling', () => {
    it('should throw error for unimplemented transform', () => {
      const table = createTestTable();
      const transform = { unknownTransform: {} };

      expect(() => {
        applyTransform(table, transform, ['sales']);
      }).to.throw('not implemented yet');
    });
  });

  describe('applyTransform() - SPLIT', () => {
    it('should split column with comma delimiter (spread all)', () => {
      const table = aq.from([
        { name: 'John,Doe,25', id: 1 },
        { name: 'Jane,Smith,30', id: 2 },
        { name: 'Bob,Jones,35', id: 3 },
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

      expect(result.columnNames()).to.deep.equal(['id', 'name_1', 'name_2', 'name_3']);
      expect(result.numRows()).to.equal(3);
      const rows = result.objects();
      expect(rows[0]).to.deep.equal({ id: 1, name_1: 'John', name_2: 'Doe', name_3: '25' });
    });

    it('should split column and keep original', () => {
      const table = aq.from([{ email: 'user@domain.com', id: 1 }]);
      const transform = {
        split: {
          column: 'email',
          delimiter: '@',
          mode: 'spread',
          keepOriginal: true,
        },
      };
      const result = applyTransform(table, transform, ['email', 'id']);

      expect(result.columnNames()).to.deep.equal(['email', 'id', 'email_1', 'email_2']);
      const row = result.object(0);
      expect(row.email).to.equal('user@domain.com');
      expect(row.email_1).to.equal('user');
      expect(row.email_2).to.equal('domain.com');
    });

    it('should split with keep left mode', () => {
      const table = aq.from([
        { fullname: 'John Doe', id: 1 },
        { fullname: 'Jane Smith', id: 2 },
      ]);
      const transform = {
        split: {
          column: 'fullname',
          delimiter: ' ',
          mode: 'left',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['fullname', 'id']);

      expect(result.columnNames()).to.deep.equal(['id', 'fullname_1']);
      const rows = result.objects();
      expect(rows[0].fullname_1).to.equal('John');
      expect(rows[1].fullname_1).to.equal('Jane');
    });

    it('should split with keep right mode', () => {
      const table = aq.from([
        { email: 'user@example.com', id: 1 },
        { email: 'admin@test.org', id: 2 },
      ]);
      const transform = {
        split: {
          column: 'email',
          delimiter: '@',
          mode: 'right',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['email', 'id']);

      // right mode is now equivalent to lastN with maxColumns=1, so produces _1
      expect(result.columnNames()).to.deep.equal(['id', 'email_1']);
      const rows = result.objects();
      expect(rows[0].email_1).to.equal('example.com');
      expect(rows[1].email_1).to.equal('test.org');
    });

    it('should split with first N mode', () => {
      const table = aq.from([{ data: 'a,b,c,d,e,f', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'firstN',
          maxColumns: 3,
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      expect(result.columnNames()).to.deep.equal(['id', 'data_1', 'data_2', 'data_3']);
      const row = result.object(0);
      expect(row.data_1).to.equal('a');
      expect(row.data_2).to.equal('b');
      expect(row.data_3).to.equal('c');
    });

    it('should split with last N mode', () => {
      const table = aq.from([{ data: 'a,b,c,d,e,f', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'lastN',
          maxColumns: 3,
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      expect(result.columnNames()).to.deep.equal(['id', 'data_1', 'data_2', 'data_3']);
      const row = result.object(0);
      expect(row.data_1).to.equal('d');
      expect(row.data_2).to.equal('e');
      expect(row.data_3).to.equal('f');
    });

    it('should handle empty segments (keep empty strings)', () => {
      const table = aq.from([{ data: 'a,,c', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      const row = result.object(0);
      expect(row.data_1).to.equal('a');
      expect(row.data_2).to.equal('');
      expect(row.data_3).to.equal('c');
    });

    it('should handle rows with fewer segments than max', () => {
      const table = aq.from([
        { data: 'a,b,c', id: 1 },
        { data: 'x', id: 2 },
      ]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      expect(result.columnNames()).to.deep.equal(['id', 'data_1', 'data_2', 'data_3']);
      const rows = result.objects();
      expect(rows[0]).to.deep.equal({ id: 1, data_1: 'a', data_2: 'b', data_3: 'c' });
      expect(rows[1]).to.deep.equal({ id: 2, data_1: 'x', data_2: undefined, data_3: undefined });
    });

    it('should split with regex delimiter (whitespace)', () => {
      const table = aq.from([{ data: 'one   two\tthree', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: '\\s+',
          isRegex: true,
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      const row = result.object(0);
      expect(row.data_1).to.equal('one');
      expect(row.data_2).to.equal('two');
      expect(row.data_3).to.equal('three');
    });

    it('should split with regex delimiter (multiple chars)', () => {
      const table = aq.from([{ data: 'a-b_c-d', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: '[-_]',
          isRegex: true,
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      const row = result.object(0);
      expect(row.data_1).to.equal('a');
      expect(row.data_2).to.equal('b');
      expect(row.data_3).to.equal('c');
      expect(row.data_4).to.equal('d');
    });

    it('should throw error for invalid regex', () => {
      const table = aq.from([{ data: 'a,b', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: '[',
          isRegex: true,
          mode: 'spread',
          keepOriginal: false,
        },
      };

      expect(() => {
        applyTransform(table, transform, ['data', 'id']);
      }).to.throw();
    });

    it('should handle delimiter not found in data', () => {
      const table = aq.from([{ data: 'no-delimiter-here', id: 1 }]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      expect(result.columnNames()).to.deep.equal(['id', 'data_1']);
      const row = result.object(0);
      expect(row.data_1).to.equal('no-delimiter-here');
    });

    it('should handle null/undefined values', () => {
      const table = aq.from([
        { data: 'a,b', id: 1 },
        { data: null, id: 2 },
        { data: undefined, id: 3 },
      ]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data', 'id']);

      const rows = result.objects();
      expect(rows[0]).to.deep.equal({ id: 1, data_1: 'a', data_2: 'b' });
      expect(rows[1]).to.deep.equal({ id: 2, data_1: undefined, data_2: undefined });
      expect(rows[2]).to.deep.equal({ id: 3, data_1: undefined, data_2: undefined });
    });

    it('should preserve column order when dropping original', () => {
      const table = aq.from([{ id: 1, name: 'John,Doe', age: 25 }]);
      const transform = {
        split: {
          column: 'name',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['id', 'name', 'age']);

      expect(result.columnNames()).to.deep.equal(['id', 'age', 'name_1', 'name_2']);
    });

    it('should handle empty table', () => {
      const table = aq.from([]);
      const transform = {
        split: {
          column: 'data',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const result = applyTransform(table, transform, ['data']);

      expect(result.numRows()).to.equal(0);
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
      expect(desc).to.include('Import: data.csv');
      expect(desc).to.include('headers from first row');
    });

    it('should describe select transform', () => {
      const transform = { select: ['sales', 'revenue', 'cost'] };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Select: 3 columns');
    });

    it('should describe select transform (singular)', () => {
      const transform = { select: ['sales'] };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Select: 1 column');
    });

    it('should describe filter transform', () => {
      const transform = { filter: 'sales > 1000' };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Filter: sales > 1000');
    });

    it('should describe derive transform', () => {
      const transform = { derive: { profit: 'revenue - cost', margin: 'profit / revenue' } };
      const desc = describeTransform(transform);
      expect(desc).to.include('Derive:');
      expect(desc).to.include('profit');
      expect(desc).to.include('margin');
    });

    it('should describe join transform', () => {
      const transform = {
        join: {
          right: 'mdl_123',
          how: 'left',
        },
      };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Join (left): model');

      const descWithName = describeTransform(transform, 'Sales Data');
      expect(descWithName).to.equal('Join (left): Sales Data');
    });

    it('should describe sort transform', () => {
      const transform = { sort: { field: 'sales', order: 'desc' } };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Sort: sales');
    });

    it('should describe rename transform', () => {
      const transform = { rename: { sales: 'Sales Amount', revenue: 'Total Revenue' } };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Rename: 2 columns');
    });

    it('should describe remove transform', () => {
      const transform = { remove: ['cost', 'revenue'] };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Remove: 2 columns');
    });

    it('should describe remove transform (singular)', () => {
      const transform = { remove: ['cost'] };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Remove: 1 column');
    });

    it('should describe unknown transform', () => {
      const transform = { unknownType: {} };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Unknown transform');
    });

    it('should describe import with auto-generated headers', () => {
      const transform = {
        import: {
          source: 'data.csv',
          headerMode: 'auto-generate',
        },
      };
      const desc = describeTransform(transform);
      expect(desc).to.include('auto-generated headers');
    });

    it('should describe import with manual headers', () => {
      const transform = {
        import: {
          source: 'data.csv',
          headerMode: 'manual',
        },
      };
      const desc = describeTransform(transform);
      expect(desc).to.include('custom headers');
    });

    it('should describe types transform', () => {
      const transform = { types: { col1: 'integer', col2: 'string' } };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Detect types: 2 columns');
    });

    it('should describe split transform', () => {
      const transform = { split: { column: 'name', delimiter: ',', mode: 'spread' } };
      const desc = describeTransform(transform);
      expect(desc).to.equal('Split: name');
    });
  });

  describe('SchemaEngine - Split Type Inference', () => {
    it('should infer integer types after splitting date column', () => {
      const table = aq.from([
        { date: '01/15/2023', id: 1 },
        { date: '12/25/2023', id: 2 },
        { date: '06/30/2024', id: 3 },
      ]);

      // Step 1: Apply split
      const splitTransform = {
        split: {
          column: 'date',
          delimiter: '/',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const splitResult = applyTransform(table, splitTransform, ['date', 'id']);

      // Get sample data for type inference
      const sampleData = splitResult.objects();

      // Verify SchemaEngine infers integer types for the split columns
      // (since mm/dd/yyyy splits into numeric strings)
      const inferredMonth = SchemaEngine.inferType(sampleData.map((row) => Number(row.date_1)));
      const inferredDay = SchemaEngine.inferType(sampleData.map((row) => Number(row.date_2)));
      const inferredYear = SchemaEngine.inferType(sampleData.map((row) => Number(row.date_3)));

      expect(inferredMonth).to.equal('integer');
      expect(inferredDay).to.equal('integer');
      expect(inferredYear).to.equal('integer');
    });

    it('should infer string types for non-numeric split results', () => {
      const table = aq.from([
        { fullname: 'John Doe', id: 1 },
        { fullname: 'Jane Smith', id: 2 },
      ]);

      const splitTransform = {
        split: {
          column: 'fullname',
          delimiter: ' ',
          mode: 'spread',
          keepOriginal: false,
        },
      };
      const splitResult = applyTransform(table, splitTransform, ['fullname', 'id']);
      const sampleData = splitResult.objects();

      // Names should be inferred as strings
      const inferredFirst = SchemaEngine.inferType(sampleData.map((row) => row.fullname_1));
      const inferredLast = SchemaEngine.inferType(sampleData.map((row) => row.fullname_2));

      expect(inferredFirst).to.equal('string');
      expect(inferredLast).to.equal('string');
    });

    it('should correctly derive schema after split', () => {
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

      // Mock sample data of what we'd have after split
      const sampleData = [
        { id: 1, date_1: '01', date_2: '15', date_3: '2023' },
        { id: 2, date_1: '12', date_2: '25', date_3: '2023' },
      ];

      const newSchema = SchemaEngine.deriveNextSchema(initialSchema, splitTransform, sampleData);

      // date column should be removed, id kept, and 3 new columns added
      expect(newSchema.length).to.equal(4);
      expect(newSchema[0].name).to.equal('id');
      expect(newSchema[0].type).to.equal('integer');
      expect(newSchema[1].name).to.equal('date_1');
      expect(newSchema[2].name).to.equal('date_2');
      expect(newSchema[3].name).to.equal('date_3');
    });
  });
});
