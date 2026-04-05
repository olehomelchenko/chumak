/**
 * Step Handler Editing Tests
 *
 * Tests editing and canceling step modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import {
  resetStores,
  setTestData,
  TestData,
  suppressConsole,
  createMockStepCallbacks,
} from '../test-utils';
import * as StepHandlers from './step-handlers';
import type { Model } from '../../types';

describe('step-handlers - editing', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    setTestData(TestData.simple);
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('editStep', () => {
    it('does nothing when no active model', () => {
      AppStore.activeModel.value = null;

      // Should not throw
      expect(() => StepHandlers.editStep(0)).not.toThrow();
    });

    it('does nothing when step has import property', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(0);

      expect(callbacks.openDialog).not.toHaveBeenCalled();
    });

    it('opens filter dialog and sets expression for filter step', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { filter: 'age > 25' }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('filter');
      expect(DialogStore.filterState.expression.value).toBe('age > 25');
    });

    it('opens derive dialog and sets state for derive step', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { derive: { double_age: 'age * 2' } }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('derive');
      expect(DialogStore.deriveState.columnName.value).toBe('double_age');
      expect(DialogStore.deriveState.expression.value).toBe('age * 2');
    });

    it('opens sort dialog for sort step (state managed by component hook)', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { sort: { field: 'age', order: 'desc' } }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('sort');
      // State initialization handled by useDialogState hook via editingStep context
    });

    it('opens sample dialog for sample step (state managed by component hook)', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { sample: { count: 10, seed: 42 } }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('sample');
      // State initialization handled by useDialogState hook via editingStep context
    });

    it('opens replace dialog and sets state for replace step', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [
          { import: { source: 'source-1' } },
          { replace: { column: 'city', find: 'Boston', replace: 'NYC' } },
        ],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('replace');
    });

    it('opens split dialog and sets state for split step', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [
          { import: { source: 'source-1' } },
          {
            split: {
              column: 'name',
              delimiter: ',',
              mode: 'spread',
              maxColumns: 5,
              keepOriginal: true,
            },
          },
        ],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('split');
      expect(DialogStore.splitState.column.value).toBe('name');
      expect(DialogStore.splitState.delimiter.value).toBe(',');
      expect(DialogStore.splitState.mode.value).toBe('spread');
      expect(DialogStore.splitState.maxColumns.value).toBe(5);
      expect(DialogStore.splitState.keepOriginal.value).toBe(true);
    });

    it('opens impute dialog and sets state for impute step', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [
          { import: { source: 'source-1' } },
          { impute: { column: 'age', strategy: 'mean', value: '' } },
        ],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.editStep(1);

      expect(AppStore.editingStepIndex.value).toBe(1);
      expect(callbacks.openDialog).toHaveBeenCalledWith('impute');
      expect(DialogStore.imputeState.column.value).toBe('age');
      expect(DialogStore.imputeState.strategy.value).toBe('mean');
    });
  });

  describe('cancelEdit', () => {
    it('clears editing step index and closes dialog', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      AppStore.editingStepIndex.value = 5;

      StepHandlers.cancelEdit();

      expect(AppStore.editingStepIndex.value).toBeNull();
      expect(callbacks.closeDialog).toHaveBeenCalledWith(true);
    });
  });
});
