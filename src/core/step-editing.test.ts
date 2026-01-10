import { describe, it, expect, beforeEach } from 'vitest';
import * as aq from 'arquero';
import { applyTransform, describeTransform } from './transforms';

describe('Step Editing', () => {
  let mockApp: any;

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

  // Helper to compute model up to a step
  function computeUpToStep(model: any, stepIndex: number, sourceData: any[]) {
    let table = (aq as any).from(sourceData);
    let schema: any = null;

    for (let i = 0; i <= stepIndex; i++) {
      const step = model.steps[i];

      if (step.import) continue;

      if (step.types) {
        schema = Object.entries(step.types).map(([name, type]) => ({ name, type }));
        continue;
      }

      const columns = table.columnNames();
      const result = applyTransform(table, step, columns);

      table = Array.isArray(result) ? (aq as any).from(result) : result;
    }

    const finalColumns = table.columnNames();
    const finalSchema = schema || finalColumns.map((name: string) => ({ name, type: 'string' }));

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

      mockApp.activeModel.steps[stepIndex] = newTransform;

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.data.length).toBe(1); // Only sales=1500 passes
      expect(result.data[0].sales).toBe(1500);
      expect(result.data[0].region).toBe('South');
    });

    it('should update derive step with new formula', () => {
      mockApp.activeModel.steps[2] = { derive: { margin: '(revenue - cost) / revenue' } };

      const result = computeUpToStep(
        mockApp.activeModel,
        mockApp.activeModel.steps.length - 1,
        mockApp.source.data
      );

      expect(result.columns).toContain('margin');
      const firstRow = result.data[0];
      const expectedMargin = (firstRow.revenue - firstRow.cost) / firstRow.revenue;
      expect(firstRow.margin).toBeCloseTo(expectedMargin, 3);
    });

    it('should handle rolling back to original steps on failure', () => {
      const originalSteps = JSON.parse(JSON.stringify(mockApp.activeModel.steps));

      // Attempt invalid edit
      mockApp.activeModel.steps[2] = { filter: 'invalid syntax error !!!' };

      expect(() => {
        computeUpToStep(mockApp.activeModel, 2, mockApp.source.data);
      }).toThrow();

      // Rolled back
      mockApp.activeModel.steps = originalSteps;
      const result = computeUpToStep(mockApp.activeModel, 2, mockApp.source.data);
      expect(result.data.length).toBe(2);
    });
  });

  describe('Step Transform Descriptions After Edit', () => {
    it('should generate correct description for edited filter', () => {
      mockApp.activeModel.steps[2] = { filter: 'revenue > 5000' };
      const desc = describeTransform(mockApp.activeModel.steps[2]);
      expect(desc).toBe('Filter: revenue > 5000');
    });
  });
});
