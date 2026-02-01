/**
 * Step Handler Navigation Tests
 *
 * Tests viewing steps and final results.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import {
  resetStores,
  setTestData,
  TestData,
  suppressConsole,
  createMockStepCallbacks,
} from '../test-utils';
import * as StepHandlers from './step-handlers';
import type { Model, Source } from '../../types';

describe('step-handlers - navigation', () => {
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

  describe('viewStep', () => {
    it('updates app state when viewing a step', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testSource: Source = {
        id: 'source-1',
        name: 'Test Source',
        columns: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'number' },
        ],
        data: TestData.simple.rows,
        headerMode: 'first-row',
        delimiter: ',',
        customHeaders: null,
        origin: 'file',
      };

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { filter: 'age > 25' }],
        schema: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'number' },
        ],
        data: TestData.simple.rows,
      };

      AppStore.sources.value = [testSource];
      AppStore.models.value = [testModel];
      AppStore.activeModel.value = testModel;
      AppStore.activeSource.value = testSource;

      StepHandlers.viewStep(0);

      expect(AppStore.activeStepIndex.value).toBe(0);
      expect(callbacks.updatePagination).toHaveBeenCalled();
    });
  });

  describe('viewFinalResult', () => {
    it('does nothing when no active model', () => {
      AppStore.activeModel.value = null;

      // Should not throw
      expect(() => StepHandlers.viewFinalResult()).not.toThrow();
    });

    it('updates state with final result data', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }],
        schema: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'number' },
        ],
        data: TestData.simple.rows,
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.viewFinalResult();

      expect(AppStore.currentData.value).toEqual(testModel.data);
      expect(AppStore.columns.value).toEqual(['name', 'age']);
      expect(AppStore.viewingIntermediate.value).toBe(false);
      expect(callbacks.updatePagination).toHaveBeenCalled();
    });

    it('derives columns from data when schema is empty', () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);

      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [],
        schema: [],
        data: TestData.simple.rows,
      };

      AppStore.activeModel.value = testModel;

      StepHandlers.viewFinalResult();

      expect(AppStore.columns.value).toEqual(['name', 'age', 'city']);
    });
  });
});
