/**
 * Unit Tests for Aggregate Handlers
 *
 * Tests aggregation operations including groupby, rollup functions, and preview generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resetStores,
  setTestData,
  TestData,
  suppressConsole,
  expectPreviewState,
  expectPreviewCleared,
} from '../test-utils';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepServiceFull()
);
vi.mock('../core/helper-handlers', () => ({
  preparePreviewData: vi.fn((table: any, limit: number) => {
    const rows = table.objects().slice(0, limit);
    const columns = table.columnNames();
    return { rows, columns };
  }),
  getPreviewRowLimit: vi.fn().mockReturnValue(10),
}));
vi.mock('../preview-engine', async () =>
  (await import('../test-utils')).MockFactories.previewEngine()
);

import {
  constructAggregateStep,
  generateOutputName,
  parseRollupToAggregations,
  computeAggregatePreview,
  type Aggregation,
} from './aggregate-handlers';

describe('aggregate-handlers', () => {
  beforeEach(() => {
    resetStores();
    setTestData(TestData.numeric);
    suppressConsole();
  });

  describe('generateOutputName', () => {
    it('returns "count" for count function', () => {
      expect(generateOutputName({ col: '', func: 'count', output: '' })).toBe('count');
    });

    it('generates name from function and column', () => {
      expect(generateOutputName({ col: 'amount', func: 'sum', output: '' })).toBe('sum_amount');
    });

    it('returns existing output when column is empty for non-count', () => {
      expect(generateOutputName({ col: '', func: 'mean', output: '' })).toBe('');
    });

    it('generates distinct output name correctly', () => {
      expect(generateOutputName({ col: 'category', func: 'distinct', output: '' })).toBe(
        'distinct_category'
      );
    });
  });

  describe('constructAggregateStep', () => {
    it('throws error when no aggregations defined', () => {
      expect(() => constructAggregateStep(['category'], [])).toThrow(
        'At least one aggregation is required'
      );
    });

    it('throws error when output name is empty', () => {
      expect(() =>
        constructAggregateStep([], [{ output: '', func: 'sum', col: 'amount' }])
      ).toThrow('All aggregations must have an output name');
    });

    it('throws error when output name is whitespace only', () => {
      expect(() =>
        constructAggregateStep([], [{ output: '   ', func: 'sum', col: 'amount' }])
      ).toThrow('Output name cannot be empty');
    });

    it('throws error when non-count function has no column', () => {
      expect(() =>
        constructAggregateStep([], [{ output: 'my_sum', func: 'sum', col: '' }])
      ).toThrow('Column required for sum');
    });

    it('constructs count aggregation correctly', () => {
      const step = constructAggregateStep(
        ['category'],
        [{ output: 'count', func: 'count', col: '' }]
      );

      expect(step).toEqual({
        aggregate: {
          groupby: ['category'],
          rollup: { count: 'op.count()' },
        },
      });
    });

    it('constructs sum aggregation correctly', () => {
      const step = constructAggregateStep(
        ['category'],
        [{ output: 'total_amount', func: 'sum', col: 'amount' }]
      );

      expect(step).toEqual({
        aggregate: {
          groupby: ['category'],
          rollup: { total_amount: "op.sum('amount')" },
        },
      });
    });

    it('constructs distinct aggregation correctly', () => {
      const step = constructAggregateStep(
        [],
        [{ output: 'unique_categories', func: 'distinct', col: 'category' }]
      );

      expect(step).toEqual({
        aggregate: {
          groupby: [],
          rollup: { unique_categories: "op.distinct('category')" },
        },
      });
    });

    it('constructs multiple aggregations correctly', () => {
      const step = constructAggregateStep(
        ['category'],
        [
          { output: 'total', func: 'sum', col: 'amount' },
          { output: 'average', func: 'mean', col: 'quantity' },
          { output: 'count', func: 'count', col: '' },
        ]
      );

      expect(step.aggregate.rollup).toEqual({
        total: "op.sum('amount')",
        average: "op.mean('quantity')",
        count: 'op.count()',
      });
    });
  });

  describe('parseRollupToAggregations', () => {
    it('parses count op', () => {
      const result = parseRollupToAggregations({ count: 'op.count()' });
      expect(result).toEqual([{ output: 'count', func: 'count', col: '' }]);
    });

    it('parses standard op with column', () => {
      const result = parseRollupToAggregations({ total: "op.sum('amount')" });
      expect(result).toEqual([{ output: 'total', func: 'sum', col: 'amount' }]);
    });

    it('parses distinct op', () => {
      const result = parseRollupToAggregations({ unique: "op.distinct('category')" });
      expect(result).toEqual([{ output: 'unique', func: 'distinct', col: 'category' }]);
    });

    it('falls back to custom for unknown patterns', () => {
      const result = parseRollupToAggregations({ custom: 'something.unknown()' });
      expect(result).toEqual([{ output: 'custom', func: 'custom', col: '' }]);
    });
  });

  describe('computeAggregatePreview', () => {
    it('generates preview for valid aggregation', () => {
      const result = computeAggregatePreview(
        ['category'],
        [{ output: 'total', func: 'sum', col: 'amount' }]
      );

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Aggregate Preview');
      expect(result!.columns).toContain('category');
      expect(result!.columns).toContain('total');
      expect(result!.newColumns).toEqual(['total']);
    });

    it('returns null when no data', () => {
      setTestData({ columns: ['category', 'amount'], rows: [] });
      const result = computeAggregatePreview(
        ['category'],
        [{ output: 'total', func: 'sum', col: 'amount' }]
      );
      expect(result).toBeNull();
    });

    it('returns null when no aggregations', () => {
      const result = computeAggregatePreview(['category'], []);
      expect(result).toBeNull();
    });
  });
});
