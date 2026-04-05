import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, suppressConsole } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);
vi.mock('../core/notification-handlers', async () =>
  (await import('../test-utils')).MockFactories.notificationHandlers()
);

import { applyReplaceTransform, applyImputeTransform } from './simple-handlers';
import { StepService } from '../../services/StepService';
import { confirm } from '../core/notification-handlers';

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

  describe('applyReplaceTransform', () => {
    it('errors when no column selected', async () => {
      DialogStore.replaceState.column.value = '';
      const callbacks = { onError: vi.fn() };

      await applyReplaceTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select a column');
    });

    it('asks confirmation for null/empty replace', async () => {
      DialogStore.replaceState.column.value = 'name';
      DialogStore.replaceState.findValue.value = null as any;
      DialogStore.replaceState.replaceValue.value = 'default';
      DialogStore.replaceState.isRegex.value = false;
      const callbacks = { onError: vi.fn() };
      vi.mocked(confirm).mockResolvedValueOnce(false);

      await applyReplaceTransform(callbacks);

      expect(confirm).toHaveBeenCalledWith('Replace null/empty values?', undefined, 'Replace');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('errors when regex mode but no pattern', async () => {
      DialogStore.replaceState.column.value = 'name';
      DialogStore.replaceState.findValue.value = '';
      DialogStore.replaceState.isRegex.value = true;
      const callbacks = { onError: vi.fn() };

      await applyReplaceTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a regex pattern');
    });

    it('runs transform with correct shape', async () => {
      DialogStore.replaceState.column.value = 'name';
      DialogStore.replaceState.findValue.value = 'Alice';
      DialogStore.replaceState.replaceValue.value = 'Alicia';
      DialogStore.replaceState.isRegex.value = false;
      const callbacks = { onError: vi.fn() };

      await applyReplaceTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Replace',
        {
          replace: {
            column: 'name',
            find: 'Alice',
            replace: 'Alicia',
            isRegex: false,
          },
        },
        callbacks
      );
    });

    it('uses regex transform name when isRegex', async () => {
      DialogStore.replaceState.column.value = 'name';
      DialogStore.replaceState.findValue.value = 'A.*';
      DialogStore.replaceState.replaceValue.value = 'X';
      DialogStore.replaceState.isRegex.value = true;
      const callbacks = { onError: vi.fn() };

      await applyReplaceTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Replace (Regex)',
        expect.any(Object),
        callbacks
      );
    });

    it('converts empty replace value to null', async () => {
      DialogStore.replaceState.column.value = 'name';
      DialogStore.replaceState.findValue.value = 'Alice';
      DialogStore.replaceState.replaceValue.value = '';
      DialogStore.replaceState.isRegex.value = false;
      const callbacks = { onError: vi.fn() };

      await applyReplaceTransform(callbacks);

      const transform = vi.mocked(StepService.runTransform).mock.calls[0][1] as any;
      expect(transform.replace.replace).toBeNull();
    });
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
