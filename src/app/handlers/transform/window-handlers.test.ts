import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, suppressConsole, createMockExecutionCallbacks } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);

import {
  constructWindowStep,
  applyWindowTransform,
  parseWindowDeriveToFunctions,
  type OrderByItem,
  type WindowFunction,
} from './window-handlers';
import { StepService } from '../../services/StepService';

// Helper to create full WindowFunction objects for tests
function wf(partial: Partial<WindowFunction> & { func: string; output: string }): WindowFunction {
  return {
    sourceCol: '',
    offset: 1,
    defaultValue: '',
    frameStart: null,
    frameEnd: 0,
    ...partial,
  };
}

describe('window-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    consoleSpy = suppressConsole();
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('constructWindowStep', () => {
    it('throws when orderBy is empty', () => {
      expect(() =>
        constructWindowStep([], [], [wf({ func: 'row_number', output: 'rn' })])
      ).toThrow('At least one order by column is required');
    });

    it('throws when no window functions', () => {
      expect(() =>
        constructWindowStep([{ field: 'date', order: 'asc' }], [], [])
      ).toThrow('At least one window function is required');
    });

    it('throws when output name is empty', () => {
      expect(() =>
        constructWindowStep(
          [{ field: 'date', order: 'asc' }],
          [],
          [wf({ func: 'row_number', output: '' })]
        )
      ).toThrow('must have an output column name');
    });

    it('throws when column-required function lacks sourceCol', () => {
      expect(() =>
        constructWindowStep(
          [{ field: 'date', order: 'asc' }],
          [],
          [wf({ func: 'lag', output: 'prev_val' })]
        )
      ).toThrow('Source column is required for lag');
    });

    it('builds step for row_number', () => {
      const step = constructWindowStep(
        [{ field: 'date', order: 'asc' }],
        [],
        [wf({ func: 'row_number', output: 'rn' })]
      );

      expect(step.window.orderBy).toEqual([{ field: 'date', order: 'asc' }]);
      expect(step.window.derive.rn).toBe('op.row_number()');
      expect(step.window.partitionBy).toBeUndefined();
    });

    it('builds step for rank with partitionBy', () => {
      const step = constructWindowStep(
        [{ field: 'score', order: 'asc' }],
        ['department'],
        [wf({ func: 'rank', output: 'dept_rank' })]
      );

      expect(step.window.partitionBy).toEqual(['department']);
      expect(step.window.derive.dept_rank).toBe('op.rank()');
    });

    it('builds step for lag with sourceCol and offset', () => {
      const step = constructWindowStep(
        [{ field: 'date', order: 'asc' }],
        [],
        [wf({ func: 'lag', output: 'prev_val', sourceCol: 'price', offset: 2, defaultValue: '0' })]
      );

      expect(step.window.derive.prev_val).toBe("op.lag('price', 2, 0)");
    });

    it('builds step for lead without default', () => {
      const step = constructWindowStep(
        [{ field: 'date', order: 'asc' }],
        [],
        [wf({ func: 'lead', output: 'next_val', sourceCol: 'price', offset: 1 })]
      );

      expect(step.window.derive.next_val).toBe("op.lead('price', 1)");
    });

    it('builds step for first_value', () => {
      const step = constructWindowStep(
        [{ field: 'date', order: 'asc' }],
        [],
        [wf({ func: 'first_value', output: 'first_price', sourceCol: 'price' })]
      );

      expect(step.window.derive.first_price).toBe("op.first_value('price')");
    });

    it('builds step for avg_rank', () => {
      const step = constructWindowStep(
        [{ field: 'score', order: 'asc' }],
        [],
        [wf({ func: 'avg_rank', output: 'avg_rnk' })]
      );

      expect(step.window.derive.avg_rnk).toBe('op.avg_rank()');
    });

    it('builds step for cume_dist', () => {
      const step = constructWindowStep(
        [{ field: 'score', order: 'asc' }],
        [],
        [wf({ func: 'cume_dist', output: 'cdist' })]
      );

      expect(step.window.derive.cdist).toBe('op.cume_dist()');
    });

    it('builds step for nth_value', () => {
      const step = constructWindowStep(
        [{ field: 'date', order: 'asc' }],
        [],
        [wf({ func: 'nth_value', output: 'second_price', sourceCol: 'price', offset: 2 })]
      );

      expect(step.window.derive.second_price).toBe("op.nth_value('price', 2)");
    });

    it('throws when nth_value lacks sourceCol', () => {
      expect(() =>
        constructWindowStep(
          [{ field: 'date', order: 'asc' }],
          [],
          [wf({ func: 'nth_value', output: 'nth' })]
        )
      ).toThrow('Source column is required for nth_value');
    });

    it('builds step with multiple window functions', () => {
      const step = constructWindowStep(
        [{ field: 'date', order: 'asc' }],
        [],
        [wf({ func: 'row_number', output: 'rn' }), wf({ func: 'rank', output: 'rank' })]
      );

      expect(Object.keys(step.window.derive)).toEqual(['rn', 'rank']);
    });
  });

  describe('parseWindowDeriveToFunctions', () => {
    it('parses row_number', () => {
      const result = parseWindowDeriveToFunctions({ rn: 'op.row_number()' });
      expect(result).toEqual([
        expect.objectContaining({ func: 'row_number', output: 'rn', sourceCol: '' }),
      ]);
    });

    it('parses lag with args', () => {
      const result = parseWindowDeriveToFunctions({ prev: "op.lag('price', 2, 0)" });
      expect(result[0].func).toBe('lag');
      expect(result[0].sourceCol).toBe('price');
      expect(result[0].offset).toBe(2);
      expect(result[0].defaultValue).toBe('0');
    });

    it('reads frame spec', () => {
      const result = parseWindowDeriveToFunctions(
        { rolling_sum: "op.sum('price')" },
        { rolling_sum: [-2, 0] }
      );
      expect(result[0].frameStart).toBe(-2);
      expect(result[0].frameEnd).toBe(0);
    });
  });

  describe('applyWindowTransform', () => {
    it('calls StepService.runTransform with valid step', async () => {
      DialogStore.activeDialogState.value = {
        orderBy: [{ field: 'date', order: 'asc' }],
        partitionBy: [],
        windowFunctions: [{ func: 'row_number', output: 'rn', sourceCol: '', offset: 1, defaultValue: '', frameStart: null, frameEnd: 0 }],
      };
      const callbacks = createMockExecutionCallbacks();

      await applyWindowTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Window',
        expect.objectContaining({ window: expect.any(Object) }),
        callbacks
      );
    });

    it('calls onError when constructWindowStep throws', async () => {
      DialogStore.activeDialogState.value = {
        orderBy: [],
        partitionBy: [],
        windowFunctions: [],
      };
      const callbacks = createMockExecutionCallbacks();

      await applyWindowTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });
  });
});
