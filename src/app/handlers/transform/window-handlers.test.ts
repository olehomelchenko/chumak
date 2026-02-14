import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, suppressConsole, createMockExecutionCallbacks } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', () => ({
  StepService: { runTransform: vi.fn().mockResolvedValue(true) },
}));

import { constructWindowStep, applyWindowTransform } from './window-handlers';
import { StepService } from '../../services/StepService';

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
      DialogStore.windowState.orderBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'row_number', output: 'rn', sourceCol: '' },
      ];

      expect(() => constructWindowStep()).toThrow('At least one order by column is required');
    });

    it('throws when no window functions', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.windowFunctions.value = [];

      expect(() => constructWindowStep()).toThrow('At least one window function is required');
    });

    it('throws when output name is empty', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'row_number', output: '', sourceCol: '' },
      ];

      expect(() => constructWindowStep()).toThrow('must have an output column name');
    });

    it('throws when column-required function lacks sourceCol', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'lag', output: 'prev_val', sourceCol: '' },
      ];

      expect(() => constructWindowStep()).toThrow('Source column is required for lag');
    });

    it('builds step for row_number', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.partitionBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'row_number', output: 'rn', sourceCol: '' },
      ];

      const step = constructWindowStep();

      expect(step.window.orderBy).toEqual(['date']);
      expect(step.window.derive.rn).toBe('op.row_number()');
      expect(step.window.partitionBy).toBeUndefined();
    });

    it('builds step for rank with partitionBy', () => {
      DialogStore.windowState.orderBy.value = ['score'];
      DialogStore.windowState.partitionBy.value = ['department'];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'rank', output: 'dept_rank', sourceCol: '' },
      ];

      const step = constructWindowStep();

      expect(step.window.partitionBy).toEqual(['department']);
      expect(step.window.derive.dept_rank).toBe('op.rank()');
    });

    it('builds step for lag with sourceCol and offset', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.partitionBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'lag', output: 'prev_val', sourceCol: 'price', offset: 2, defaultValue: '0' },
      ];

      const step = constructWindowStep();

      expect(step.window.derive.prev_val).toBe("op.lag('price', 2, 0)");
    });

    it('builds step for lead without default', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.partitionBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'lead', output: 'next_val', sourceCol: 'price', offset: 1 },
      ];

      const step = constructWindowStep();

      expect(step.window.derive.next_val).toBe("op.lead('price', 1)");
    });

    it('builds step for first_value', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.partitionBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'first_value', output: 'first_price', sourceCol: 'price' },
      ];

      const step = constructWindowStep();

      expect(step.window.derive.first_price).toBe("op.first_value('price')");
    });

    it('builds step with multiple window functions', () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.partitionBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'row_number', output: 'rn', sourceCol: '' },
        { func: 'rank', output: 'rank', sourceCol: '' },
      ];

      const step = constructWindowStep();

      expect(Object.keys(step.window.derive)).toEqual(['rn', 'rank']);
    });
  });

  describe('applyWindowTransform', () => {
    it('calls StepService.runTransform with valid step', async () => {
      DialogStore.windowState.orderBy.value = ['date'];
      DialogStore.windowState.partitionBy.value = [];
      DialogStore.windowState.windowFunctions.value = [
        { func: 'row_number', output: 'rn', sourceCol: '' },
      ];
      const callbacks = createMockExecutionCallbacks();

      await applyWindowTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Window',
        expect.objectContaining({ window: expect.any(Object) }),
        callbacks
      );
    });

    it('calls onError when constructWindowStep throws', async () => {
      DialogStore.windowState.orderBy.value = [];
      DialogStore.windowState.windowFunctions.value = [];
      const callbacks = createMockExecutionCallbacks();

      await applyWindowTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });
  });
});
