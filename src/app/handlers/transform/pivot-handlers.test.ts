import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, setTestData, suppressConsole, TestData } from '../test-utils';

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

import { constructPivotStep, countUniqueValues } from './pivot-handlers';
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
      expect(() =>
        constructPivotStep([], '', 'amount', 'sum', { sort: true, limit: null })
      ).toThrow('Please select a column for pivot headers');
    });

    it('throws when no value column selected', () => {
      expect(() =>
        constructPivotStep([], 'category', '', 'sum', { sort: true, limit: null })
      ).toThrow('Please select a value column');
    });

    it('throws when column and value columns are the same', () => {
      expect(() =>
        constructPivotStep([], 'amount', 'amount', 'sum', { sort: true, limit: null })
      ).toThrow('Column and value columns must be different');
    });

    it('throws when column column is used as a row', () => {
      expect(() =>
        constructPivotStep(['category'], 'category', 'amount', 'sum', { sort: true, limit: null })
      ).toThrow('Column column cannot be used as a row');
    });

    it('throws when value column is used as a row', () => {
      expect(() =>
        constructPivotStep(['amount'], 'category', 'amount', 'sum', { sort: true, limit: null })
      ).toThrow('Value column cannot be used as a row');
    });

    it('constructs valid pivot step', () => {
      const step = constructPivotStep([], 'category', 'amount', 'sum', {
        sort: true,
        limit: 0,
      });

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
      const step = constructPivotStep(['quantity'], 'category', 'amount', 'mean', {
        sort: false,
        limit: 10,
      });

      expect(step.pivot.rows).toEqual(['quantity']);
      expect(step.pivot.aggregation).toBe('mean');
      expect(step.pivot.options.limit).toBe(10);
    });
  });

  describe('countUniqueValues', () => {
    it('calculates unique value count for selected column', () => {
      const count = countUniqueValues('category');
      expect(count).toBe(3); // A, B, C
    });

    it('returns 0 when no column selected', () => {
      const count = countUniqueValues('');
      expect(count).toBe(0);
    });

    it('returns 0 when no data', () => {
      AppStore.currentData.value = null;
      const count = countUniqueValues('category');
      expect(count).toBe(0);
    });
  });
});
