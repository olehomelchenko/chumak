/**
 * Unit Tests for Aggregate Handlers
 *
 * Tests aggregation operations including groupby, rollup functions, and preview generation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import {
  resetStores,
  setTestData,
  TestData,
  suppressConsole,
  expectPreviewState,
  expectPreviewCleared,
} from '../test-utils';
import * as AggregateHandlers from './aggregate-handlers';

describe('aggregate-handlers', () => {
  beforeEach(() => {
    resetStores();
    setTestData(TestData.numeric);
    suppressConsole();
  });

  describe('addAggregation', () => {
    it('adds a new aggregation with default values', () => {
      expect(DialogStore.aggregateState.aggregations.value).toHaveLength(0);

      AggregateHandlers.addAggregation();

      expect(DialogStore.aggregateState.aggregations.value).toHaveLength(1);
      expect(DialogStore.aggregateState.aggregations.value[0]).toEqual({
        output: '',
        func: 'mean',
        col: '',
      });
    });

    it('appends to existing aggregations', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: 'sum_amount', func: 'sum', col: 'amount' },
      ];

      AggregateHandlers.addAggregation();

      expect(DialogStore.aggregateState.aggregations.value).toHaveLength(2);
    });
  });

  describe('removeAggregation', () => {
    it('removes aggregation at specified index', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: 'sum_amount', func: 'sum', col: 'amount' },
        { output: 'mean_quantity', func: 'mean', col: 'quantity' },
        { output: 'count', func: 'count', col: '' },
      ];

      AggregateHandlers.removeAggregation(1);

      expect(DialogStore.aggregateState.aggregations.value).toHaveLength(2);
      expect(DialogStore.aggregateState.aggregations.value).toEqual([
        { output: 'sum_amount', func: 'sum', col: 'amount' },
        { output: 'count', func: 'count', col: '' },
      ]);
    });

    it('removes first aggregation correctly', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: 'first', func: 'sum', col: 'amount' },
        { output: 'second', func: 'mean', col: 'quantity' },
      ];

      AggregateHandlers.removeAggregation(0);

      expect(DialogStore.aggregateState.aggregations.value).toHaveLength(1);
      expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('second');
    });

    it('removes last aggregation correctly', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: 'first', func: 'sum', col: 'amount' },
        { output: 'second', func: 'mean', col: 'quantity' },
      ];

      AggregateHandlers.removeAggregation(1);

      expect(DialogStore.aggregateState.aggregations.value).toHaveLength(1);
      expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('first');
    });
  });

  describe('updateAggregateOutputName', () => {
    it('auto-generates output name for count function', () => {
      DialogStore.aggregateState.aggregations.value = [{ output: '', func: 'count', col: '' }];

      AggregateHandlers.updateAggregateOutputName(0);

      expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('count');
    });

    it('auto-generates output name from function and column', () => {
      DialogStore.aggregateState.aggregations.value = [{ output: '', func: 'sum', col: 'amount' }];

      AggregateHandlers.updateAggregateOutputName(0);

      expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('sum_amount');
    });

    it('does not generate output name when column is empty for non-count functions', () => {
      DialogStore.aggregateState.aggregations.value = [{ output: '', func: 'mean', col: '' }];

      AggregateHandlers.updateAggregateOutputName(0);

      expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('');
    });

    it('generates distinct output name correctly', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: '', func: 'distinct', col: 'category' },
      ];

      AggregateHandlers.updateAggregateOutputName(0);

      expect(DialogStore.aggregateState.aggregations.value[0].output).toBe('distinct_category');
    });
  });

  describe('constructAggregateStep', () => {
    it('throws error when no aggregations defined', () => {
      DialogStore.aggregateState.aggregations.value = [];

      expect(() => AggregateHandlers.constructAggregateStep()).toThrow(
        'At least one aggregation is required'
      );
    });

    it('throws error when output name is empty', () => {
      DialogStore.aggregateState.aggregations.value = [{ output: '', func: 'sum', col: 'amount' }];

      expect(() => AggregateHandlers.constructAggregateStep()).toThrow(
        'All aggregations must have an output name'
      );
    });

    it('throws error when output name is whitespace only', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: '   ', func: 'sum', col: 'amount' },
      ];

      expect(() => AggregateHandlers.constructAggregateStep()).toThrow(
        'Output name cannot be empty'
      );
    });

    it('throws error when non-count function has no column', () => {
      DialogStore.aggregateState.aggregations.value = [{ output: 'my_sum', func: 'sum', col: '' }];

      expect(() => AggregateHandlers.constructAggregateStep()).toThrow('Column required for sum');
    });

    it('constructs count aggregation correctly', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [{ output: 'count', func: 'count', col: '' }];

      const step = AggregateHandlers.constructAggregateStep();

      expect(step).toEqual({
        aggregate: {
          groupby: ['category'],
          rollup: { count: 'op.count()' },
        },
      });
    });

    it('constructs sum aggregation correctly', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total_amount', func: 'sum', col: 'amount' },
      ];

      const step = AggregateHandlers.constructAggregateStep();

      expect(step).toEqual({
        aggregate: {
          groupby: ['category'],
          rollup: { total_amount: "op.sum('amount')" },
        },
      });
    });

    it('constructs distinct aggregation correctly', () => {
      DialogStore.aggregateState.groupBy.value = [];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'unique_categories', func: 'distinct', col: 'category' },
      ];

      const step = AggregateHandlers.constructAggregateStep();

      expect(step).toEqual({
        aggregate: {
          groupby: [],
          rollup: { unique_categories: "op.distinct('category')" },
        },
      });
    });

    it('constructs multiple aggregations correctly', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: 'amount' },
        { output: 'average', func: 'mean', col: 'quantity' },
        { output: 'count', func: 'count', col: '' },
      ];

      const step = AggregateHandlers.constructAggregateStep();

      expect(step.aggregate.rollup).toEqual({
        total: "op.sum('amount')",
        average: "op.mean('quantity')",
        count: 'op.count()',
      });
    });
  });

  describe('updateAggregatePreview', () => {
    it('generates preview for valid aggregation', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: 'amount' },
      ];

      AggregateHandlers.updateAggregatePreview();

      expectPreviewState({
        title: 'Aggregate Preview',
        columns: ['category', 'total'],
        newColumns: ['total'],
      });

      // Verify aggregated values - 3 unique categories
      const rows = DialogStore.previewState.rows.value;
      expect(rows).toHaveLength(3);

      // Category A: 100 + 200 = 300
      const catA = rows.find((r: any) => r.category === 'A');
      expect(catA?.total).toBe(300);

      // Category B: 150 + 250 = 400
      const catB = rows.find((r: any) => r.category === 'B');
      expect(catB?.total).toBe(400);

      // Category C: 300
      const catC = rows.find((r: any) => r.category === 'C');
      expect(catC?.total).toBe(300);
    });

    it('sets error when aggregation construction fails', () => {
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: '' }, // Missing column
      ];

      AggregateHandlers.updateAggregatePreview();

      expect(DialogStore.aggregateState.previewError.value).toBe('Column required for sum');
    });

    it('handles empty data gracefully', () => {
      setTestData({ columns: ['category', 'amount'], rows: [] });
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: 'amount' },
      ];

      AggregateHandlers.updateAggregatePreview();

      expectPreviewCleared();
    });

    it('handles no aggregations gracefully', () => {
      DialogStore.aggregateState.aggregations.value = [];

      AggregateHandlers.updateAggregatePreview();

      expectPreviewCleared();
    });

    it('generates count aggregation preview', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [{ output: 'count', func: 'count', col: '' }];

      AggregateHandlers.updateAggregatePreview();

      const rows = DialogStore.previewState.rows.value;
      expect(rows).toHaveLength(3);

      // Category A has 2 rows
      const catA = rows.find((r: any) => r.category === 'A');
      expect(catA?.count).toBe(2);

      // Category B has 2 rows
      const catB = rows.find((r: any) => r.category === 'B');
      expect(catB?.count).toBe(2);

      // Category C has 1 row
      const catC = rows.find((r: any) => r.category === 'C');
      expect(catC?.count).toBe(1);
    });

    it('generates mean aggregation preview', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'avg_amount', func: 'mean', col: 'amount' },
      ];

      AggregateHandlers.updateAggregatePreview();

      const rows = DialogStore.previewState.rows.value;

      // Category A: (100 + 200) / 2 = 150
      const catA = rows.find((r: any) => r.category === 'A');
      expect(catA?.avg_amount).toBe(150);

      // Category B: (150 + 250) / 2 = 200
      const catB = rows.find((r: any) => r.category === 'B');
      expect(catB?.avg_amount).toBe(200);
    });

    it('generates preview without groupby (total aggregation)', () => {
      DialogStore.aggregateState.groupBy.value = [];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: 'amount' },
      ];

      AggregateHandlers.updateAggregatePreview();

      const rows = DialogStore.previewState.rows.value;
      expect(rows).toHaveLength(1);
      // Total: 100 + 200 + 150 + 250 + 300 = 1000
      expect(rows[0].total).toBe(1000);
    });
  });

  describe('debouncedUpdateAggregatePreview', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Clear any previous preview state
      AggregateHandlers.clearPreview();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces multiple rapid calls', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: 'amount' },
      ];

      // Verify preview is cleared
      expect(DialogStore.previewState.rows.value).toEqual([]);

      // Call multiple times rapidly
      AggregateHandlers.debouncedUpdateAggregatePreview();
      AggregateHandlers.debouncedUpdateAggregatePreview();
      AggregateHandlers.debouncedUpdateAggregatePreview();

      // Preview should not be updated immediately (debounce not yet elapsed)
      expect(DialogStore.previewState.rows.value).toEqual([]);

      // Advance timers past debounce threshold
      vi.advanceTimersByTime(150);

      // Now preview should be updated
      expect(DialogStore.previewState.rows.value.length).toBeGreaterThan(0);
    });
  });

  describe('clearPreview', () => {
    it('clears all preview state', () => {
      // Set up some preview data
      DialogStore.previewState.title.value = 'Test Title';
      DialogStore.previewState.stats.value = 'Test Stats';
      DialogStore.previewState.columns.value = ['col1'];
      DialogStore.previewState.newColumns.value = ['col2'];
      DialogStore.previewState.rows.value = [{ col1: 'value' }];

      AggregateHandlers.clearPreview();

      expectPreviewCleared();
    });
  });
});
