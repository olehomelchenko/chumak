/**
 * Step Handler Removal Tests
 *
 * Tests step removal modal and confirmation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { resetStores, setTestData, TestData, suppressConsole } from '../test-utils';
import * as StepHandlers from './step-handlers';
import type { Model } from '../../types';

describe('step-handlers - removal', () => {
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

  describe('showStepRemovalModal', () => {
    it('returns null when no active model', async () => {
      AppStore.activeModel.value = null;

      const result = await StepHandlers.showStepRemovalModal(0);

      expect(result).toBeNull();
    });

    it('sets step removal modal state and returns promise', () => {
      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [
          { import: { source: 'source-1' } },
          { filter: 'age > 25' },
          { derive: { double_age: 'age * 2' } },
        ],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      // Start the promise but don't await it
      const promise = StepHandlers.showStepRemovalModal(1);

      // Check that modal state was updated
      expect(AppStore.stepRemovalModal.value.visible).toBe(true);
      expect(AppStore.stepRemovalModal.value.stepIndex).toBe(1);
      expect(typeof AppStore.stepRemovalModal.value.resolve).toBe('function');

      // Resolve the promise by calling closeStepRemovalModal
      StepHandlers.closeStepRemovalModal(false);

      return promise.then((result) => {
        expect(result).toBeNull();
      });
    });
  });

  describe('closeStepRemovalModal', () => {
    it('resolves with removeMode when confirmed', async () => {
      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { filter: 'age > 25' }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      const promise = StepHandlers.showStepRemovalModal(1);

      // Set remove mode to 'all'
      AppStore.stepRemovalModal.value = {
        ...AppStore.stepRemovalModal.value,
        removeMode: 'all',
      };

      StepHandlers.closeStepRemovalModal(true);

      const result = await promise;
      expect(result).toBe('all');
      expect(AppStore.stepRemovalModal.value.visible).toBe(false);
    });

    it('resolves with null when not confirmed', async () => {
      const testModel: Model = {
        id: 'model-1',
        name: 'Test Model',
        sourceId: 'source-1',
        steps: [{ import: { source: 'source-1' } }, { filter: 'age > 25' }],
        schema: [],
        data: [],
      };

      AppStore.activeModel.value = testModel;

      const promise = StepHandlers.showStepRemovalModal(1);

      StepHandlers.closeStepRemovalModal(false);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});
