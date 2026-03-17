import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetStores, suppressConsole } from '../test-utils';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);
vi.mock('../core/notification-handlers', async () =>
  (await import('../test-utils')).MockFactories.notificationHandlers()
);

import {
  applySortTransform,
  applySliceRowsTransform,
  applyIndexTransform,
  applyReplaceTransform,
  applyImputeTransform,
} from './simple-handlers';
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

  describe('applySortTransform', () => {
    it('errors when no field selected', async () => {
      DialogStore.sortState.fields.value = [{ field: '', order: 'asc' }];
      const callbacks = { onError: vi.fn() };

      await applySortTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select at least one column to sort by');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('runs transform with field and order', async () => {
      DialogStore.sortState.fields.value = [{ field: 'age', order: 'desc' }];
      const callbacks = { onError: vi.fn() };

      await applySortTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Sort',
        { sort: { field: 'age', order: 'desc' } },
        callbacks
      );
    });
  });

  describe('applySliceRowsTransform', () => {
    it('errors when count is empty', async () => {
      DialogStore.sliceRowsState.count.value = 0;
      const callbacks = { onError: vi.fn() };

      await applySliceRowsTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a valid number of rows');
    });

    it('errors when count is negative', async () => {
      DialogStore.sliceRowsState.count.value = -5;
      const callbacks = { onError: vi.fn() };

      await applySliceRowsTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a valid number of rows');
    });

    it('runs transform with count and mode', async () => {
      DialogStore.sliceRowsState.count.value = 10;
      DialogStore.sliceRowsState.mode.value = 'first';
      const callbacks = { onError: vi.fn() };

      await applySliceRowsTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Slice Rows',
        { sliceRows: { count: 10, mode: 'first' } },
        callbacks
      );
    });
  });

  describe('applyIndexTransform', () => {
    it('errors when column name is empty', async () => {
      DialogStore.indexState.columnName.value = '';
      const callbacks = { onError: vi.fn() };

      await applyIndexTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a column name');
    });

    it('errors when column name is whitespace', async () => {
      DialogStore.indexState.columnName.value = '   ';
      const callbacks = { onError: vi.fn() };

      await applyIndexTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a column name');
    });

    it('runs transform with column name and start value', async () => {
      DialogStore.indexState.columnName.value = 'row_num';
      DialogStore.indexState.startFrom.value = 0;
      const callbacks = { onError: vi.fn() };

      await applyIndexTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Add Index',
        { addIndex: { columnName: 'row_num', startFrom: 0 } },
        callbacks
      );
    });

    it('defaults startFrom to 1 when null', async () => {
      DialogStore.indexState.columnName.value = 'idx';
      DialogStore.indexState.startFrom.value = null as any;
      const callbacks = { onError: vi.fn() };

      await applyIndexTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Add Index',
        { addIndex: { columnName: 'idx', startFrom: 1 } },
        callbacks
      );
    });
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
