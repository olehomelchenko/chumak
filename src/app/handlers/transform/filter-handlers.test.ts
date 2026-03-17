import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  resetStores,
  setTestData,
  suppressConsole,
  TestData,
  createMockExecutionCallbacks,
  createTestModel,
  createTestSchema,
} from '../test-utils';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);

import * as FilterHandlers from './filter-handlers';
import { StepService } from '../../services/StepService';

describe('filter-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    setTestData(TestData.simple);
    consoleSpy = suppressConsole();
    vi.clearAllMocks();

    AppStore.activeModel.value = createTestModel({
      name: 'Test',
      steps: [],
      schema: createTestSchema(
        ...TestData.simple.columns.map((c) => [c, 'string'] as [string, 'string'])
      ),
      data: TestData.simple.rows,
    });
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('toggleFilterPreviewMode', () => {
    it('toggles from "all" to "matching"', () => {
      DialogStore.filterState.previewMode.value = 'all';
      FilterHandlers.toggleFilterPreviewMode();
      expect(DialogStore.filterState.previewMode.value).toBe('matching');
    });

    it('toggles from "matching" to "all"', () => {
      DialogStore.filterState.previewMode.value = 'matching';
      FilterHandlers.toggleFilterPreviewMode();
      expect(DialogStore.filterState.previewMode.value).toBe('all');
    });
  });

  describe('applyFilterTransform', () => {
    it('calls onError when expression is empty', async () => {
      DialogStore.filterState.expression.value = '';
      const callbacks = createMockExecutionCallbacks();

      await FilterHandlers.applyFilterTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Enter a filter expression');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('calls onError when expression has error', async () => {
      DialogStore.filterState.expression.value = 'age > 30';
      DialogStore.filterState.error.value = 'Syntax error at position 5';
      const callbacks = createMockExecutionCallbacks();

      await FilterHandlers.applyFilterTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Fix the expression errors before applying');
      expect(StepService.runTransform).not.toHaveBeenCalled();
    });

    it('calls StepService.runTransform with valid expression', async () => {
      DialogStore.filterState.expression.value = 'age > 30';
      DialogStore.filterState.error.value = null;
      const callbacks = createMockExecutionCallbacks();

      await FilterHandlers.applyFilterTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Filter',
        { filter: 'age > 30' },
        callbacks
      );
    });

    it('trims whitespace from expression', async () => {
      DialogStore.filterState.expression.value = '  age > 30  ';
      DialogStore.filterState.error.value = null;
      const callbacks = createMockExecutionCallbacks();

      await FilterHandlers.applyFilterTransform(callbacks);

      expect(StepService.runTransform).toHaveBeenCalledWith(
        'Filter',
        { filter: 'age > 30' },
        callbacks
      );
    });
  });

  describe('updateFilterPreview', () => {
    it('clears preview when expression is empty', () => {
      DialogStore.filterState.expression.value = '';

      FilterHandlers.updateFilterPreview();

      expect(DialogStore.previewState.title.value).toBe('');
    });

    it('clears preview when expression has error', () => {
      DialogStore.filterState.expression.value = 'age > 30';
      DialogStore.filterState.error.value = 'Bad expression';

      FilterHandlers.updateFilterPreview();

      expect(DialogStore.previewState.title.value).toBe('');
    });

    it('shows preview for valid expression', () => {
      DialogStore.filterState.expression.value = 'age > 25';
      DialogStore.filterState.error.value = null;
      DialogStore.filterState.previewMode.value = 'all';

      FilterHandlers.updateFilterPreview();

      expect(DialogStore.previewState.title.value).toBe('Filter Preview');
      expect(DialogStore.previewState.rows.value.length).toBeGreaterThan(0);
    });
  });
});
