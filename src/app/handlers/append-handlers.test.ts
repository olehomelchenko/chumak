/**
 * Unit Tests for Append Handlers
 *
 * Tests append/union operations including initialization, target selection,
 * circular dependency detection, and preview generation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { resetStores, setTestData, TestData, suppressConsole } from './test-utils';
import * as AppendHandlers from './append-handlers';
import type { Model, Source, DataRow } from '../types';

describe('append-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  const createTestSource = (id: string, name: string, columns: string[]): Source => ({
    id,
    name,
    columns: columns.map((col) => ({ name: col, type: 'string' })),
    data: [{ [columns[0]]: 'value1' }, { [columns[0]]: 'value2' }] as DataRow[],
    headerMode: 'first-row',
    delimiter: ',',
    customHeaders: null,
    origin: 'file',
  });

  const createTestModel = (
    id: string,
    name: string,
    sourceId: string,
    columns: string[],
    data: DataRow[] = []
  ): Model => ({
    id,
    name,
    sourceId,
    steps: [{ import: { source: sourceId } }],
    schema: columns.map((col) => ({ name: col, type: 'string' })),
    data: data.length > 0 ? data : [{ [columns[0]]: 'value1' }],
  });

  beforeEach(() => {
    resetStores();
    setTestData(TestData.simple);
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('initializeAppendDialog', () => {
    it('sets up dialog state with active model as left table', () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);
      const model2 = createTestModel('model-2', 'Model 2', 'source-1', ['name', 'city']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1, model2];
      AppStore.activeModel.value = model1;
      AppStore.activeSource.value = source;

      AppendHandlers.initializeAppendDialog();

      const state = DialogStore.appendState;
      expect(state.leftModel.value).toBe('model-1');
      expect(state.leftColumns.value).toEqual(['name', 'age']);
      expect(state.selectedLeftColumns.value).toEqual(['name', 'age']);
      expect(state.targetModel.value).toBe('model-2');
      expect(state.removeDuplicates.value).toBe(false);
      expect(AppStore.activeDialog.value).toBe('append');
    });

    it('sets first source as target when no other models exist', () => {
      const source1 = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const source2 = createTestSource('source-2', 'Source 2', ['name', 'city']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source1, source2];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;
      AppStore.activeSource.value = source1;

      AppendHandlers.initializeAppendDialog();

      const state = DialogStore.appendState;
      expect(state.targetModel.value).toBe('source-1');
    });

    it('uses source as left table when no active model', () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [];
      AppStore.activeModel.value = null;
      AppStore.activeSource.value = source;

      AppendHandlers.initializeAppendDialog();

      const state = DialogStore.appendState;
      expect(state.leftModel.value).toBe('source-1');
    });

    it('resets preview state', () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;

      // Set some existing preview data
      DialogStore.appendState.previewData.value = { rows: [], totalRows: 0, columns: [] };
      DialogStore.appendState.previewError.value = 'Some error';
      DialogStore.appendState.isPreviewing.value = true;

      AppendHandlers.initializeAppendDialog();

      const state = DialogStore.appendState;
      expect(state.previewData.value).toBeNull();
      expect(state.previewError.value).toBeNull();
      expect(state.isPreviewing.value).toBe(false);
    });
  });

  describe('onAppendLeftModelChange', () => {
    it('updates left columns when model changes', () => {
      // Note: getColumnsForTarget uses the source's data columns, not the model's schema
      const source1 = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const source2 = createTestSource('source-2', 'Source 2', ['city', 'state']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);
      const model2 = createTestModel('model-2', 'Model 2', 'source-2', ['city', 'state']);

      AppStore.sources.value = [source1, source2];
      AppStore.models.value = [model1, model2];
      AppStore.activeModel.value = model1;

      DialogStore.appendState.leftModel.value = 'model-2';

      AppendHandlers.onAppendLeftModelChange();

      const state = DialogStore.appendState;
      // Columns come from computed model data
      expect(state.leftColumns.value.length).toBeGreaterThan(0);
    });

    it('clears columns when no model selected', () => {
      DialogStore.appendState.leftModel.value = null;
      DialogStore.appendState.leftColumns.value = ['col1', 'col2'];
      DialogStore.appendState.selectedLeftColumns.value = ['col1'];

      AppendHandlers.onAppendLeftModelChange();

      const state = DialogStore.appendState;
      expect(state.leftColumns.value).toEqual([]);
      expect(state.selectedLeftColumns.value).toEqual([]);
    });
  });

  describe('onAppendTargetChange', () => {
    it('updates right columns when target changes', () => {
      const source1 = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const source2 = createTestSource('source-2', 'Source 2', ['city', 'country']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);
      const model2 = createTestModel('model-2', 'Model 2', 'source-2', ['city', 'country']);

      AppStore.sources.value = [source1, source2];
      AppStore.models.value = [model1, model2];

      DialogStore.appendState.targetModel.value = 'model-2';

      AppendHandlers.onAppendTargetChange();

      const state = DialogStore.appendState;
      // Columns come from computed model data
      expect(state.rightColumns.value.length).toBeGreaterThan(0);
    });

    it('clears columns when no target selected', () => {
      DialogStore.appendState.targetModel.value = null;
      DialogStore.appendState.rightColumns.value = ['col1', 'col2'];
      DialogStore.appendState.selectedRightColumns.value = ['col1'];

      AppendHandlers.onAppendTargetChange();

      const state = DialogStore.appendState;
      expect(state.rightColumns.value).toEqual([]);
      expect(state.selectedRightColumns.value).toEqual([]);
    });
  });

  describe('onAppendConfigChange', () => {
    it('clears preview data and error', () => {
      DialogStore.appendState.previewData.value = { rows: [], totalRows: 0, columns: [] };
      DialogStore.appendState.previewError.value = 'Some error';

      AppendHandlers.onAppendConfigChange();

      const state = DialogStore.appendState;
      expect(state.previewData.value).toBeNull();
      expect(state.previewError.value).toBeNull();
    });
  });

  describe('checkCircularDependency', () => {
    it('returns false when no circular dependency', () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);
      const model2 = createTestModel('model-2', 'Model 2', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1, model2];
      AppStore.activeModel.value = model1;

      const result = AppendHandlers.checkCircularDependency('model-2');

      expect(result.isCyclic).toBe(false);
    });

    it('returns true when self-reference detected', () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;

      const result = AppendHandlers.checkCircularDependency('model-1');

      expect(result.isCyclic).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe('previewAppend', () => {
    it('sets error when no left model selected', async () => {
      DialogStore.appendState.leftModel.value = null;
      DialogStore.appendState.targetModel.value = 'model-2';

      await AppendHandlers.previewAppend();

      expect(DialogStore.appendState.previewError.value).toBe('Please select a left table');
    });

    it('sets error when no target model selected', async () => {
      DialogStore.appendState.leftModel.value = 'model-1';
      DialogStore.appendState.targetModel.value = null;

      await AppendHandlers.previewAppend();

      expect(DialogStore.appendState.previewError.value).toBe(
        'Please select a model or source to append'
      );
    });

    it('sets error when circular dependency detected', async () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;

      DialogStore.appendState.leftModel.value = 'model-1';
      DialogStore.appendState.targetModel.value = 'model-1';
      DialogStore.appendState.selectedLeftColumns.value = ['name', 'age'];
      DialogStore.appendState.selectedRightColumns.value = ['name', 'age'];

      await AppendHandlers.previewAppend();

      expect(DialogStore.appendState.previewError.value).toContain('circular');
    });

    it('sets isPreviewing during preview', async () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel(
        'model-1',
        'Model 1',
        'source-1',
        ['name', 'age'],
        [{ name: 'Alice', age: 30 }]
      );
      const model2 = createTestModel(
        'model-2',
        'Model 2',
        'source-1',
        ['name', 'age'],
        [{ name: 'Bob', age: 25 }]
      );

      AppStore.sources.value = [source];
      AppStore.models.value = [model1, model2];
      AppStore.activeModel.value = model1;

      DialogStore.appendState.leftModel.value = 'model-1';
      DialogStore.appendState.targetModel.value = 'model-2';
      DialogStore.appendState.selectedLeftColumns.value = ['name', 'age'];
      DialogStore.appendState.selectedRightColumns.value = ['name', 'age'];
      DialogStore.appendState.removeDuplicates.value = false;

      const previewPromise = AppendHandlers.previewAppend();

      // After preview completes, isPreviewing should be false
      await previewPromise;
      expect(DialogStore.appendState.isPreviewing.value).toBe(false);
    });
  });

  describe('applyAppendTransform', () => {
    const createMockCallbacks = () => ({
      onError: vi.fn(),
      onDialogClose: vi.fn(),
      onSuccess: vi.fn(),
    });

    it('calls onError when no left model selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.appendState.leftModel.value = null;
      DialogStore.appendState.targetModel.value = 'model-2';

      await AppendHandlers.applyAppendTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Please select a left table');
    });

    it('calls onError when no target model selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.appendState.leftModel.value = 'model-1';
      DialogStore.appendState.targetModel.value = null;

      await AppendHandlers.applyAppendTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Please select a model or source to append');
    });

    it('calls onError when circular dependency detected', async () => {
      const callbacks = createMockCallbacks();
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;

      DialogStore.appendState.leftModel.value = 'model-1';
      DialogStore.appendState.targetModel.value = 'model-1';
      DialogStore.appendState.selectedLeftColumns.value = ['name', 'age'];
      DialogStore.appendState.selectedRightColumns.value = ['name', 'age'];

      await AppendHandlers.applyAppendTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      expect(callbacks.onError.mock.calls[0][0]).toContain('circular');
    });
  });
});
