import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, suppressConsole } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);

import { applyImputeTransform } from './simple-handlers';
import { StepService } from '../../services/StepService';

describe('simple-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('applyImputeTransform', () => {
    it('errors when no column selected', async () => {
      DialogStore.imputeState.column.value = '';
      const callbacks = { onError: vi.fn() };

      await applyImputeTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select a column');
    });

    it('runs transform with strategy', async () => {
      DialogStore.imputeState.column.value = 'value';
      DialogStore.imputeState.strategy.value = 'mean';
      DialogStore.imputeState.includeEmptyString.value = false;
      const callbacks = { onError: vi.fn() };

      await applyImputeTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Impute',
        {
          impute: {
            column: 'value',
            strategy: 'mean',
            value: undefined,
            includeEmptyString: false,
          },
        },
        callbacks
      );
    });

    it('includes value when strategy is constant', async () => {
      DialogStore.imputeState.column.value = 'value';
      DialogStore.imputeState.strategy.value = 'constant';
      DialogStore.imputeState.value.value = '42';
      DialogStore.imputeState.includeEmptyString.value = true;
      const callbacks = { onError: vi.fn() };

      await applyImputeTransform(callbacks);

      const transform = vi.mocked(StepService.runTransform).mock.calls[0][1] as any;
      expect(transform.impute.value).toBe('42');
      expect(transform.impute.includeEmptyString).toBe(true);
    });
  });
});
