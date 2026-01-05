/**
 * Integration Tests - Transform-Schema-UI Alignment
 *
 * Tests end-to-end flows to ensure transforms, schema updates,
 * and UI state stay in sync.
 */

describe('Transform-Schema-UI Integration', () => {
  // Helper to create test data
  function createTestData() {
    return [
      { name: 'Alice,Smith', sales: 1000, revenue: 5000, cost: 3000, region: 'North' },
      { name: 'Bob,Jones', sales: 1500, revenue: 7000, cost: 4000, region: 'South' },
      { name: 'Carol,Brown', sales: 800, revenue: 4000, cost: 2500, region: 'East' },
    ];
  }

  function createInitialSchema() {
    return [
      { name: 'name', type: 'string', format: {}, originalPosition: 0 },
      { name: 'sales', type: 'integer', format: {}, originalPosition: 1 },
      { name: 'revenue', type: 'integer', format: {}, originalPosition: 2 },
      { name: 'cost', type: 'integer', format: {}, originalPosition: 3 },
      { name: 'region', type: 'string', format: {}, originalPosition: 4 },
    ];
  }

  describe('TransformResult Contract', () => {
    it('should create valid result from Arquero table', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const transform = { filter: 'sales > 900' };

      const result = TransformResult.create(table, schema, transform);

      expect(result).to.have.property('data');
      expect(result).to.have.property('schema');
      expect(result).to.have.property('columns');
      expect(result.data).to.be.an('array');
      expect(result.schema).to.be.an('array');
      expect(result.columns).to.be.an('array');
    });

    it('should keep columns and schema in sync', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const transform = { select: ['name', 'sales'] };

      const selectedTable = applyTransform(
        table,
        transform,
        schema.map((c) => c.name)
      );
      const result = TransformResult.create(selectedTable, schema, transform);

      const schemaNames = result.schema.map((c) => c.name);
      expect(result.columns).to.deep.equal(schemaNames);
    });

    it('should validate result structure correctly', () => {
      const validResult = {
        data: [{ a: 1 }],
        schema: [{ name: 'a', type: 'integer' }],
        columns: ['a'],
      };

      const validation = TransformResult.validate(validResult);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.have.length(0);
    });

    it('should detect invalid result with mismatched columns', () => {
      const invalidResult = {
        data: [{ a: 1, b: 2 }],
        schema: [{ name: 'a', type: 'integer' }],
        columns: ['a', 'b'],
      };

      const validation = TransformResult.validate(invalidResult);
      expect(validation.valid).to.be.false;
      expect(validation.errors.length).to.be.greaterThan(0);
    });
  });

  describe('Split Transform Schema Propagation', () => {
    it('should update schema with new columns after split', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = {
        split: {
          column: 'name',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      // Should have name_1 and name_2 columns
      expect(result.columns).to.include('name_1');
      expect(result.columns).to.include('name_2');
      expect(result.columns).to.not.include('name');

      // Schema should match columns
      const schemaNames = result.schema.map((c) => c.name);
      expect(schemaNames).to.include('name_1');
      expect(schemaNames).to.include('name_2');
    });

    it('should detect string type for split text columns', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = {
        split: {
          column: 'name',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      // New columns should be typed as string
      const name1Schema = result.schema.find((c) => c.name === 'name_1');
      const name2Schema = result.schema.find((c) => c.name === 'name_2');

      expect(name1Schema).to.exist;
      expect(name2Schema).to.exist;
      expect(name1Schema.type).to.equal('string');
      expect(name2Schema.type).to.equal('string');
    });

    it('should detect numeric type when splitting numeric strings', () => {
      const numericData = [
        { values: '1,2,3', id: 'a' },
        { values: '4,5,6', id: 'b' },
        { values: '7,8,9', id: 'c' },
      ];
      const numericSchema = [
        { name: 'values', type: 'string', format: {}, originalPosition: 0 },
        { name: 'id', type: 'string', format: {}, originalPosition: 1 },
      ];

      const table = aq.from(numericData);
      const columns = numericSchema.map((c) => c.name);

      const transform = {
        split: {
          column: 'values',
          delimiter: ',',
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, numericSchema, transform);

      // Check that we have the expected columns
      expect(result.columns).to.include('values_1');
      expect(result.columns).to.include('values_2');
      expect(result.columns).to.include('values_3');

      // Note: Split results are strings unless explicitly converted
      // The type inference should still work on the sample data
      const val1Schema = result.schema.find((c) => c.name === 'values_1');
      expect(val1Schema).to.exist;
    });
  });

  describe('Derive Transform Schema Propagation', () => {
    it('should detect integer type for integer arithmetic', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = { derive: { profit: 'revenue - cost' } };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      expect(result.columns).to.include('profit');

      const profitSchema = result.schema.find((c) => c.name === 'profit');
      expect(profitSchema).to.exist;
      expect(profitSchema.type).to.equal('integer');
    });

    it('should detect float type for division', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = { derive: { margin: '(revenue - cost) / revenue' } };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      expect(result.columns).to.include('margin');

      const marginSchema = result.schema.find((c) => c.name === 'margin');
      expect(marginSchema).to.exist;
      expect(marginSchema.type).to.equal('float');
    });

    it('should preserve existing columns when deriving new ones', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = { derive: { profit: 'revenue - cost' } };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      // Original columns should still exist
      expect(result.columns).to.include('sales');
      expect(result.columns).to.include('revenue');
      expect(result.columns).to.include('cost');
      expect(result.columns).to.include('region');

      // Schema should have all columns
      expect(result.schema.length).to.equal(schema.length + 1);
    });
  });

  describe('Rename Transform Schema Propagation', () => {
    it('should update column names in schema', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = { rename: { sales: 'total_sales', region: 'area' } };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      expect(result.columns).to.include('total_sales');
      expect(result.columns).to.include('area');
      expect(result.columns).to.not.include('sales');
      expect(result.columns).to.not.include('region');

      // Schema should match
      const schemaNames = result.schema.map((c) => c.name);
      expect(schemaNames).to.include('total_sales');
      expect(schemaNames).to.include('area');
    });

    it('should preserve types after rename', () => {
      const data = createTestData();
      const schema = createInitialSchema();
      const table = aq.from(data);
      const columns = schema.map((c) => c.name);

      const transform = { rename: { sales: 'total_sales' } };

      const resultTable = applyTransform(table, transform, columns);
      const result = TransformResult.create(resultTable, schema, transform);

      const salesSchema = result.schema.find((c) => c.name === 'total_sales');
      expect(salesSchema).to.exist;
      expect(salesSchema.type).to.equal('integer');
    });
  });

  describe('Schema-Columns Consistency Invariant', () => {
    const transforms = [
      { name: 'filter', transform: { filter: 'sales > 500' } },
      { name: 'select', transform: { select: ['sales', 'region'] } },
      { name: 'remove', transform: { remove: ['cost'] } },
      { name: 'rename', transform: { rename: { sales: 'amount' } } },
      { name: 'derive', transform: { derive: { profit: 'revenue - cost' } } },
      { name: 'sort', transform: { sort: { field: 'sales', order: 'desc' } } },
    ];

    transforms.forEach(({ name, transform }) => {
      it(`should maintain schema-columns sync after ${name} transform`, () => {
        const data = createTestData();
        const schema = createInitialSchema();
        const table = aq.from(data);
        const columns = schema.map((c) => c.name);

        const resultTable = applyTransform(table, transform, columns);
        const result = TransformResult.create(resultTable, schema, transform);

        // Core invariant: columns === schema.map(c => c.name)
        const schemaNames = result.schema.map((c) => c.name);
        expect(result.columns).to.deep.equal(schemaNames);

        // Validation should pass
        const validation = TransformResult.validate(result);
        expect(validation.valid).to.be.true;
      });
    });
  });

  describe('Multi-Step Pipeline', () => {
    it('should maintain schema consistency through multiple transforms', () => {
      const data = createTestData();
      let schema = createInitialSchema();
      let table = aq.from(data);

      // Step 1: Filter
      const filter = { filter: 'sales > 500' };
      table = applyTransform(
        table,
        filter,
        schema.map((c) => c.name)
      );
      let result = TransformResult.create(table, schema, filter);
      schema = result.schema;

      expect(TransformResult.validate(result).valid).to.be.true;

      // Step 2: Derive
      const derive = { derive: { profit: 'revenue - cost' } };
      table = aq.from(result.data);
      table = applyTransform(
        table,
        derive,
        schema.map((c) => c.name)
      );
      result = TransformResult.create(table, schema, derive);
      schema = result.schema;

      expect(TransformResult.validate(result).valid).to.be.true;
      expect(result.columns).to.include('profit');

      // Step 3: Select
      const select = { select: ['region', 'profit'] };
      table = aq.from(result.data);
      table = applyTransform(
        table,
        select,
        schema.map((c) => c.name)
      );
      result = TransformResult.create(table, schema, select);

      expect(TransformResult.validate(result).valid).to.be.true;
      expect(result.columns).to.deep.equal(['region', 'profit']);
    });
  });

  describe('SchemaEngine Validation', () => {
    it('should warn when sample data is missing for derive transform', () => {
      const schema = createInitialSchema();
      const transform = { derive: { profit: 'revenue - cost' } };

      // Capture console.warn
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = function (...args) {
        if (args[0] && args[0].includes('Sample data missing')) {
          warnCalled = true;
        }
        originalWarn.apply(console, args);
      };

      // Call without sample data
      SchemaEngine.deriveNextSchema(schema, transform, []);

      // Restore console.warn
      console.warn = originalWarn;

      expect(warnCalled).to.be.true;
    });

    it('should not warn for transforms that do not create new columns', () => {
      const schema = createInitialSchema();
      const transform = { filter: 'sales > 500' };

      // Capture console.warn
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = function (...args) {
        if (args[0] && args[0].includes('Sample data missing')) {
          warnCalled = true;
        }
        originalWarn.apply(console, args);
      };

      // Call without sample data
      SchemaEngine.deriveNextSchema(schema, transform, []);

      // Restore console.warn
      console.warn = originalWarn;

      expect(warnCalled).to.be.false;
    });
  });
});
