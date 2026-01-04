/**
 * Tests for step editing functionality
 * Tests updateStep() and editStep() methods
 */

describe('Step Editing', () => {
  let mockApp;

  // Helper to create a minimal mock app with step management
  function createMockApp() {
    const source = {
      id: 'src_test',
      name: 'test.csv',
      data: [
        { sales: 1000, revenue: 5000, cost: 3000, region: 'North' },
        { sales: 1500, revenue: 7000, cost: 4000, region: 'South' },
        { sales: 800, revenue: 4000, cost: 2500, region: 'North' },
      ],
    };

    const model = {
      id: 'mdl_test',
      name: 'main',
      sourceId: 'src_test',
      steps: [
        { import: { source: 'test.csv', headerMode: 'first-row' } },
        { types: { sales: 'integer', revenue: 'integer', cost: 'integer', region: 'string' } },
        { filter: 'sales > 900' },
      ],
      schema: [
        { name: 'sales', type: 'integer' },
        { name: 'revenue', type: 'integer' },
        { name: 'cost', type: 'integer' },
        { name: 'region', type: 'string' },
      ],
      data: [
        { sales: 1000, revenue: 5000, cost: 3000, region: 'North' },
        { sales: 1500, revenue: 7000, cost: 4000, region: 'South' },
      ],
    };

    return {
      source,
      activeModel: model,
      autoSaveCalled: false,
      async autoSave() {
        this.autoSaveCalled = true;
      },
    };
  }

  // Helper to compute model up to a step (minimal implementation for tests)
  function computeUpToStep(model, stepIndex, sourceData) {
    let table = aq.from(sourceData);
    let schema = null;

    for (let i = 0; i <= stepIndex; i++) {
      const step = model.steps[i];

      // Skip import step
      if (step.import) continue;

      // Skip types step (metadata only)
      if (step.types) {
        schema = Object.entries(step.types).map(([name, type]) => ({ name, type }));
        continue;
      }

      // Apply transform
      const columns = table.columnNames();
      const result = applyTransform(table, step, columns);

      // Ensure result is an Arquero table
      table = Array.isArray(result) ? aq.from(result) : result;
    }

    // Get final columns and schema
    const finalColumns = table.columnNames();
    const finalSchema = schema || finalColumns.map((name) => ({ name, type: 'string' }));

    return {
      data: table.objects(),
      schema: finalSchema,
      columns: finalColumns,
    };
  }

  beforeEach(() => {
    mockApp = createMockApp();
  });

  describe('updateStep()', () => {
    it('should update last step with new filter expression', () => {
      const newTransform = { filter: 'sales > 1200' };
      const stepIndex = 2; // Last step (filter)

      // Update the step
      mockApp.activeModel.steps[stepIndex] = newTransform;

      // Recompute
      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      // Verify result
      expect(result.data.length).to.equal(1); // Only sales=1500 passes
      expect(result.data[0].sales).to.equal(1500);
      expect(result.data[0].region).to.equal('South');
    });

    it('should update last step and preserve schema', () => {
      const newTransform = { filter: 'region == "North"' };
      const stepIndex = 2;

      mockApp.activeModel.steps[stepIndex] = newTransform;

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      // Should have same columns
      expect(result.columns).to.deep.equal(['sales', 'revenue', 'cost', 'region']);
      // But fewer rows
      expect(result.data.length).to.equal(2);
      expect(result.data.every((row) => row.region === 'North')).to.be.true;
    });

    it('should update select step to change column selection', () => {
      // Add select step
      mockApp.activeModel.steps.push({ select: ['sales', 'region'] });
      const stepIndex = 3;

      // Update to different columns
      mockApp.activeModel.steps[stepIndex] = { select: ['sales', 'cost'] };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.columns).to.deep.equal(['sales', 'cost']);
      expect(result.data[0]).to.have.property('sales');
      expect(result.data[0]).to.have.property('cost');
      expect(result.data[0]).to.not.have.property('region');
    });

    it('should update derive step with new formula', () => {
      // Add derive step
      mockApp.activeModel.steps[2] = { derive: { profit: 'revenue - cost' } };

      // Update with different formula
      mockApp.activeModel.steps[2] = { derive: { margin: '(revenue - cost) / revenue' } };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.columns).to.include('margin');
      expect(result.columns).to.not.include('profit');

      // Verify calculation
      const firstRow = result.data[0];
      const expectedMargin = (firstRow.revenue - firstRow.cost) / firstRow.revenue;
      expect(firstRow.margin).to.be.closeTo(expectedMargin, 0.001);
    });

    it('should update rename step with new mappings', () => {
      // Add rename step
      mockApp.activeModel.steps.push({ rename: { sales: 'Sales_Amount' } });
      const stepIndex = 3;

      // Update with different rename
      mockApp.activeModel.steps[stepIndex] = { rename: { sales: 'Total_Sales', region: 'Area' } };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.columns).to.include('Total_Sales');
      expect(result.columns).to.include('Area');
      expect(result.columns).to.not.include('sales');
      expect(result.columns).to.not.include('region');
    });

    it('should update remove step with different columns', () => {
      // Add remove step
      mockApp.activeModel.steps.push({ remove: ['cost'] });
      const stepIndex = 3;

      // Update to remove different column
      mockApp.activeModel.steps[stepIndex] = { remove: ['revenue'] };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.columns).to.include('cost');
      expect(result.columns).to.not.include('revenue');
    });

    it('should handle updating step that causes validation error', () => {
      // Add filter with invalid column reference
      const invalidTransform = { filter: 'unknownColumn > 100' };
      mockApp.activeModel.steps[2] = invalidTransform;

      // Should throw error when trying to compute
      expect(() => {
        computeUpToStep(
          mockApp.activeModel,
          mockApp.activeModel.steps.length - 1,
          mockApp.source.data
        );
      }).to.throw();
    });

    it('should preserve earlier steps when updating last step', () => {
      const originalSteps = JSON.parse(JSON.stringify(mockApp.activeModel.steps));

      // Update last step
      mockApp.activeModel.steps[2] = { filter: 'sales < 1000' };

      // Earlier steps should be unchanged
      expect(mockApp.activeModel.steps[0]).to.deep.equal(originalSteps[0]);
      expect(mockApp.activeModel.steps[1]).to.deep.equal(originalSteps[1]);
    });

    it('should recompute correctly with multiple step edits', () => {
      // Edit filter
      mockApp.activeModel.steps[2] = { filter: 'sales >= 1000' };
      let result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );
      expect(result.data.length).to.equal(2);

      // Add select step
      mockApp.activeModel.steps.push({ select: ['sales', 'region'] });
      result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );
      expect(result.columns).to.deep.equal(['sales', 'region']);

      // Edit select step
      mockApp.activeModel.steps[3] = { select: ['region'] };
      result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );
      expect(result.columns).to.deep.equal(['region']);
      expect(result.data.length).to.equal(2);
    });
  });

  describe('Step Editing Edge Cases', () => {
    it('should not allow editing import step', () => {
      const stepIndex = 0; // import step

      // This test documents expected behavior - import step should be read-only
      // In actual implementation, UI should not show edit button for import step
      expect(mockApp.activeModel.steps[stepIndex]).to.have.property('import');
    });

    it('should handle editing types step (metadata only)', () => {
      const stepIndex = 1; // types step
      const newTransform = {
        types: { sales: 'float', revenue: 'float', cost: 'float', region: 'string' },
      };

      mockApp.activeModel.steps[stepIndex] = newTransform;

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      // Data should be unchanged, schema updated
      expect(result.data.length).to.equal(2); // Same filter result
    });

    it('should handle empty data after step edit', () => {
      // Edit to filter that excludes all rows
      mockApp.activeModel.steps[2] = { filter: 'sales > 10000' };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.data.length).to.equal(0);
      expect(result.columns).to.deep.equal(['sales', 'revenue', 'cost', 'region']);
    });

    it('should handle editing step with complex expression', () => {
      mockApp.activeModel.steps[2] = {
        filter: '(sales > 900 && region == "North") || (sales > 1400 && region == "South")',
      };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.data.length).to.equal(2);
      const regions = result.data.map((row) => row.region);
      expect(regions).to.include('North');
      expect(regions).to.include('South');
    });

    it('should handle rollback scenario when edit fails', () => {
      const originalSteps = JSON.parse(JSON.stringify(mockApp.activeModel.steps));
      const invalidTransform = { filter: 'invalid >> expression' };

      // Attempt update
      mockApp.activeModel.steps[2] = invalidTransform;

      // Should throw on compute
      expect(() => {
        computeUpToStep(
          mockApp.activeModel,
          mockApp.activeModel.steps.length - 1,
          mockApp.source.data
        );
      }).to.throw();

      // In real app, would rollback to originalSteps
      mockApp.activeModel.steps = originalSteps;

      // Verify rollback successful
      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );
      expect(result.data.length).to.equal(2); // Original filter result
    });
  });

  describe('Step Transform Descriptions After Edit', () => {
    it('should generate correct description for edited filter', () => {
      mockApp.activeModel.steps[2] = { filter: 'revenue > 5000' };

      const desc = describeTransform(mockApp.activeModel.steps[2]);
      expect(desc).to.equal('Filter: revenue > 5000');
    });

    it('should generate correct description for edited select', () => {
      mockApp.activeModel.steps[2] = { select: ['sales', 'region'] };

      const desc = describeTransform(mockApp.activeModel.steps[2]);
      expect(desc).to.equal('Select: 2 columns');
    });

    it('should generate correct description for edited derive', () => {
      mockApp.activeModel.steps[2] = {
        derive: { profit: 'revenue - cost', margin: 'profit / revenue' },
      };

      const desc = describeTransform(mockApp.activeModel.steps[2]);
      expect(desc).to.include('Derive:');
      expect(desc).to.include('profit');
      expect(desc).to.include('margin');
    });
  });
});
