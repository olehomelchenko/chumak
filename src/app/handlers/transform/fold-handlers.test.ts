import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, setTestData, suppressConsole, TestData } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);
vi.mock('../core/notification-handlers', async () =>
  (await import('../test-utils')).MockFactories.notificationHandlers()
);
vi.mock('../preview-engine', async () =>
  (await import('../test-utils')).MockFactories.previewEngine()
);

import { computeColumnsToFold, applyFoldTransform } from './fold-handlers';
import { StepService } from '../../services/StepService';

describe('fold-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();
    setTestData(TestData.simple);
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('computeColumnsToFold', () => {
    it('returns selected columns in fold mode', () => {
      const result = computeColumnsToFold(['name', 'age', 'city'], [true, false, true], 'fold');
      expect(result).toEqual(['name', 'city']);
    });

    it('returns unselected columns in keep mode', () => {
      const result = computeColumnsToFold(['name', 'age', 'city'], [true, false, true], 'keep');
      expect(result).toEqual(['age']);
    });

    it('returns empty when none selected in fold mode', () => {
      expect(computeColumnsToFold(['name', 'age', 'city'], [false, false, false], 'fold')).toEqual(
        []
      );
    });

    it('returns all columns when all selected in fold mode', () => {
      expect(computeColumnsToFold(['name', 'age', 'city'], [true, true, true], 'fold')).toEqual([
        'name',
        'age',
        'city',
      ]);
    });
  });

  describe('applyFoldTransform', () => {
    it('calls onError when no columns selected to fold', async () => {
      DialogStore.activeDialogState.value = {
        keyName: 'key',
        valueName: 'value',
        selectedColumns: [false, false, false],
        mode: 'fold',
      };
      const callbacks = { onError: vi.fn() };

      await applyFoldTransform(callbacks);

      expect(StepService.runTransform).not.toHaveBeenCalled();
      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('runs transform with selected columns', async () => {
      DialogStore.activeDialogState.value = {
        keyName: 'metric',
        valueName: 'val',
        selectedColumns: [false, true, true],
        mode: 'fold',
      };
      const callbacks = { onError: vi.fn() };

      await applyFoldTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Fold',
        {
          fold: {
            columns: ['age', 'city'],
            as: ['metric', 'val'],
          },
        },
        callbacks
      );
    });

    it('uses default key/value names when empty', async () => {
      DialogStore.activeDialogState.value = {
        keyName: '',
        valueName: '',
        selectedColumns: [true, false, false],
        mode: 'fold',
      };
      const callbacks = { onError: vi.fn() };

      await applyFoldTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Fold',
        {
          fold: {
            columns: ['name'],
            as: ['key', 'value'],
          },
        },
        callbacks
      );
    });
  });
});
