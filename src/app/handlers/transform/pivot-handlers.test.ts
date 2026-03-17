import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, setTestData, suppressConsole, TestData } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepServiceFull()
);
vi.mock('../core/helper-handlers', () => ({
  preparePreviewData: vi.fn(),
  getPreviewRowLimit: vi.fn().mockReturnValue(10),
}));
vi.mock('../preview-engine', async () =>
  (await import('../test-utils')).MockFactories.previewEngine()
);

import { constructPivotStep, onPivotConfigChange } from './pivot-handlers';
import { AppStore } from '../../stores/AppStore';

describe('pivot-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();
    setTestData(TestData.numeric);
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('constructPivotStep', () => {
    it('throws when no column column selected', () => {
      DialogStore.pivotState.columnColumn.value = '';
      DialogStore.pivotState.valueColumn.value = 'amount';

      expect(() => constructPivotStep()).toThrow('Please select a column for pivot headers');
    });

    it('throws when no value column selected', () => {
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = '';

      expect(() => constructPivotStep()).toThrow('Please select a value column');
    });

    it('throws when column and value columns are the same', () => {
      DialogStore.pivotState.columnColumn.value = 'amount';
      DialogStore.pivotState.valueColumn.value = 'amount';

      expect(() => constructPivotStep()).toThrow('Column and value columns must be different');
    });

    it('throws when column column is used as a row', () => {
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = 'amount';
      DialogStore.pivotState.rowColumns.value = ['category'];

      expect(() => constructPivotStep()).toThrow('Column column cannot be used as a row');
    });

    it('throws when value column is used as a row', () => {
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = 'amount';
      DialogStore.pivotState.rowColumns.value = ['amount'];

      expect(() => constructPivotStep()).toThrow('Value column cannot be used as a row');
    });

    it('constructs valid pivot step', () => {
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = 'amount';
      DialogStore.pivotState.rowColumns.value = [];
      DialogStore.pivotState.aggregation.value = 'sum';
      DialogStore.pivotState.options.value = { sort: true, limit: 0 };

      const step = constructPivotStep();

      expect(step).toEqual({
        pivot: {
          rows: undefined,
          keys: 'category',
          values: 'amount',
          aggregation: 'sum',
          options: {
            sort: true,
            limit: undefined,
          },
        },
      });
    });

    it('includes row columns when specified', () => {
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = 'amount';
      DialogStore.pivotState.rowColumns.value = ['quantity'];
      DialogStore.pivotState.aggregation.value = 'mean';
      DialogStore.pivotState.options.value = { sort: false, limit: 10 };

      const step = constructPivotStep();

      expect(step.pivot.rows).toEqual(['quantity']);
      expect(step.pivot.aggregation).toBe('mean');
      expect(step.pivot.options.limit).toBe(10);
    });
  });

  describe('onPivotConfigChange', () => {
    it('calculates unique value count for selected column', () => {
      DialogStore.pivotState.columnColumn.value = 'category';

      onPivotConfigChange();

      expect(DialogStore.pivotState.uniqueValueCount.value).toBe(3); // A, B, C
    });

    it('sets count to 0 when no column selected', () => {
      DialogStore.pivotState.columnColumn.value = '';

      onPivotConfigChange();

      expect(DialogStore.pivotState.uniqueValueCount.value).toBe(0);
    });

    it('sets count to 0 when no data', () => {
      AppStore.currentData.value = null;
      DialogStore.pivotState.columnColumn.value = 'category';

      onPivotConfigChange();

      expect(DialogStore.pivotState.uniqueValueCount.value).toBe(0);
    });
  });
});
