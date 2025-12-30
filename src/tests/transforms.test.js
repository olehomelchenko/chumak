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
      { sales: 500, revenue: 3000, cost: 2000, region: 'West', status: 'inactive' }
    ]);
  }

  describe('applyTransform() - SELECT', () => {
    it('should select single column', () => {
      const table = createTestTable();
      const transform = { select: ['sales'] };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      const columns = result.columnNames();
      expect(columns).to.deep.equal(['sales']);
      expect(result.numRows()).to.equal(5);
    });

    it('should select multiple columns', () => {
      const table = createTestTable();
      const transform = { select: ['sales', 'region', 'status'] };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      const columns = result.columnNames();
      expect(columns).to.deep.equal(['sales', 'region', 'status']);
      expect(result.numRows()).to.equal(5);
    });

    it('should preserve column order in select', () => {
      const table = createTestTable();
      const transform = { select: ['status', 'region', 'sales'] };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

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

  describe('applyTransform() - FILTER', () => {
    it('should filter with simple comparison', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 1000' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(2); // 1500 and 2000
      const rows = result.objects();
      expect(rows[0].sales).to.equal(1500);
      expect(rows[1].sales).to.equal(2000);
    });

    it('should filter with equality', () => {
      const table = createTestTable();
      const transform = { filter: 'region == "North"' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(2);
      const rows = result.objects();
      expect(rows.every(r => r.region === 'North')).to.be.true;
    });

    it('should filter with logical AND', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 1000 && region == "South"' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(1);
      const rows = result.objects();
      expect(rows[0].sales).to.equal(1500);
      expect(rows[0].region).to.equal('South');
    });

    it('should filter with logical OR', () => {
      const table = createTestTable();
      const transform = { filter: 'region == "North" || region == "South"' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(3); // 2 North + 1 South
    });

    it('should filter with complex expression', () => {
      const table = createTestTable();
      const transform = { filter: '(sales > 1000 && region == "South") || status == "inactive"' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(2); // South with sales > 1000, and inactive
    });

    it('should filter with arithmetic expression', () => {
      const table = createTestTable();
      const transform = { filter: 'revenue - cost > 3000' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(1); // Only row 4: 10000 - 6000 = 4000 > 3000
      const rows = result.objects();
      expect(rows.every(r => r.revenue - r.cost > 3000)).to.be.true;
    });

    it('should return empty table when no rows match', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 10000' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

      expect(result.numRows()).to.equal(0);
    });

    it('should return all rows when all match', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 0' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

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
        { op: '!=', expected: 4 }
      ];

      operators.forEach(({ op, expected }) => {
        const transform = { filter: `sales ${op} 1000` };
        const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);
        expect(result.numRows()).to.equal(expected);
      });
    });

    it('should handle filter with NOT operator', () => {
      const table = aq.from([
        { active: true, name: 'A' },
        { active: false, name: 'B' },
        { active: true, name: 'C' }
      ]);

      const transform = { filter: '!active' };
      const result = applyTransform(table, transform, ['active', 'name']);

      expect(result.numRows()).to.equal(1);
      expect(result.objects()[0].name).to.equal('B');
    });

    it('should preserve all columns after filter', () => {
      const table = createTestTable();
      const transform = { filter: 'sales > 1000' };
      const result = applyTransform(table, transform, ['sales', 'revenue', 'cost', 'region', 'status']);

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

  describe('applyTransform() - Error Handling', () => {
    it('should throw error for unimplemented transform', () => {
      const table = createTestTable();
      const transform = { unknownTransform: {} };

      expect(() => {
        applyTransform(table, transform, ['sales']);
      }).to.throw('not implemented yet');
    });
  });

  describe('describeTransform()', () => {
    it('should describe import transform', () => {
      const transform = {
        import: {
          source: 'data.csv',
          headerMode: 'first-row'
        }
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
      expect(desc).to.equal('Filter');
    });

    it('should describe derive transform', () => {
      const transform = { derive: { profit: 'revenue - cost', margin: 'profit / revenue' } };
      const desc = describeTransform(transform);
      expect(desc).to.include('Derive:');
      expect(desc).to.include('profit');
      expect(desc).to.include('margin');
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
          headerMode: 'auto-generate'
        }
      };
      const desc = describeTransform(transform);
      expect(desc).to.include('auto-generated headers');
    });

    it('should describe import with manual headers', () => {
      const transform = {
        import: {
          source: 'data.csv',
          headerMode: 'manual'
        }
      };
      const desc = describeTransform(transform);
      expect(desc).to.include('custom headers');
    });
  });
});
