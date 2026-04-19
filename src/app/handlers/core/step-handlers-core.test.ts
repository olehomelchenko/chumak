/**
 * Core Step Handler Tests
 *
 * Tests setup and basic dispatch functionality.
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

describe('step-handlers - core', () => {
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

  describe('setStepCallbacks', () => {
    it('sets callbacks for step operations', () => {
      const callbacks = createMockStepCallbacks();

      // Should not throw
      expect(() => StepHandlers.setStepCallbacks(callbacks)).not.toThrow();
    });
  });

  describe('applyActiveTransform', () => {
    it('dispatches via registry for filter dialog', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'filter';

      // The registry applyHandler will call the actual filter handler,
      // which needs dialog state — just verify it doesn't throw unrelated errors
      await StepHandlers.applyActiveTransform();
    });

    it('dispatches via registry for sort dialog', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'sort';

      await StepHandlers.applyActiveTransform();
    });

    it('dispatches via registry for aggregate dialog', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'aggregate';

      await StepHandlers.applyActiveTransform();
    });

    it('dispatches via registry for join dialog', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'join';

      await StepHandlers.applyActiveTransform();
    });

    it('calls confirmImport when import-csv dialog is active', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'import-csv';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.confirmImport).toHaveBeenCalledTimes(1);
    });

    it('calls fetchAndImportFromUrl when import-url dialog is active', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'import-url';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.fetchAndImportFromUrl).toHaveBeenCalledTimes(1);
    });

    it('calls generateData when generate dialog is active', async () => {
      const callbacks = createMockStepCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'generate';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.generateData).toHaveBeenCalledTimes(1);
    });
  });

  describe('computeUpToStep', () => {
    it('throws error when no active model', () => {
      AppStore.activeModel.value = null;

      expect(() => StepHandlers.computeUpToStep(0)).toThrow('No active model');
    });

    it('computes model up to step when active model exists', () => {
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
        steps: [{ import: { source: 'source-1' } }],
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

      const result = StepHandlers.computeUpToStep(0);

      expect(result.data).toBeDefined();
      expect(result.columns).toBeDefined();
    });
  });
});
