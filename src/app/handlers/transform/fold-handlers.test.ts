import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, setTestData, suppressConsole, TestData } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';

vi.mock('../../services/StepService', () => ({
  StepService: {
    runTransform: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../core/notification-handlers', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../preview-engine', () => ({
  createDebouncedPreview: vi.fn().mockReturnValue({
    trigger: vi.fn(),
    compute: vi.fn(),
  }),
  clearPreview: vi.fn(),
}));

import {
  toggleColumnForFold,
  toggleFoldMode,
  getColumnsToFold,
  selectAllForFold,
  selectNoneForFold,
  applyFoldTransform,
} from './fold-handlers';
import { StepService } from '../../services/StepService';

describe('fold-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();
    setTestData(TestData.simple);
    // Initialize selectedColumns to match column count
    DialogStore.foldState.selectedColumns.value = [false, false, false];
    DialogStore.foldState.mode.value = 'fold';
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('toggleColumnForFold', () => {
    it('toggles a column from false to true', () => {
      toggleColumnForFold(1);

      expect(DialogStore.foldState.selectedColumns.value[1]).toBe(true);
    });

    it('toggles a column from true to false', () => {
      DialogStore.foldState.selectedColumns.value = [true, true, false];

      toggleColumnForFold(0);

      expect(DialogStore.foldState.selectedColumns.value[0]).toBe(false);
    });
  });

  describe('toggleFoldMode', () => {
    it('toggles from fold to keep', () => {
      DialogStore.foldState.mode.value = 'fold';

      toggleFoldMode();

      expect(DialogStore.foldState.mode.value).toBe('keep');
    });

    it('toggles from keep to fold', () => {
      DialogStore.foldState.mode.value = 'keep';

      toggleFoldMode();

      expect(DialogStore.foldState.mode.value).toBe('fold');
    });
  });

  describe('getColumnsToFold', () => {
    it('returns selected columns in fold mode', () => {
      DialogStore.foldState.mode.value = 'fold';
      DialogStore.foldState.selectedColumns.value = [true, false, true];

      const result = getColumnsToFold();

      expect(result).toEqual(['name', 'city']);
    });

    it('returns unselected columns in keep mode', () => {
      DialogStore.foldState.mode.value = 'keep';
      DialogStore.foldState.selectedColumns.value = [true, false, true];

      const result = getColumnsToFold();

      expect(result).toEqual(['age']);
    });

    it('returns empty when none selected in fold mode', () => {
      DialogStore.foldState.mode.value = 'fold';
      DialogStore.foldState.selectedColumns.value = [false, false, false];

      expect(getColumnsToFold()).toEqual([]);
    });

    it('returns all columns when all selected in fold mode', () => {
      DialogStore.foldState.mode.value = 'fold';
      DialogStore.foldState.selectedColumns.value = [true, true, true];

      expect(getColumnsToFold()).toEqual(['name', 'age', 'city']);
    });
  });

  describe('selectAllForFold', () => {
    it('selects all columns', () => {
      selectAllForFold();

      expect(DialogStore.foldState.selectedColumns.value).toEqual([true, true, true]);
    });
  });

  describe('selectNoneForFold', () => {
    it('deselects all columns', () => {
      DialogStore.foldState.selectedColumns.value = [true, true, true];

      selectNoneForFold();

      expect(DialogStore.foldState.selectedColumns.value).toEqual([false, false, false]);
    });
  });

  describe('applyFoldTransform', () => {
    it('alerts when no columns selected to fold', async () => {
      DialogStore.foldState.selectedColumns.value = [false, false, false];
      const callbacks = { onError: vi.fn() };

      await applyFoldTransform(callbacks);

      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('runs transform with selected columns', async () => {
      DialogStore.foldState.selectedColumns.value = [false, true, true];
      DialogStore.foldState.keyName.value = 'metric';
      DialogStore.foldState.valueName.value = 'val';
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
      DialogStore.foldState.selectedColumns.value = [true, false, false];
      DialogStore.foldState.keyName.value = '';
      DialogStore.foldState.valueName.value = '';
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
