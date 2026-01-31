/**
 * Unit Tests for Step Handlers
 *
 * Tests step orchestration including viewing, editing, removing steps,
 * and dispatching transforms based on active dialog.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { resetStores, setTestData, TestData, suppressConsole } from './test-utils';
import * as StepHandlers from './step-handlers';
import type { Model, Source } from '../types';

describe('step-handlers', () => {
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
      const callbacks = {
        updatePagination: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        onJoinTargetChange: vi.fn(),
        onAppendTargetChange: vi.fn(),
        onPivotConfigChange: vi.fn(),
        applyFilterTransform: vi.fn().mockResolvedValue(undefined),
        applySortTransform: vi.fn().mockResolvedValue(undefined),
        applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
        applySampleTransform: vi.fn().mockResolvedValue(undefined),
        applySpreadTransform: vi.fn().mockResolvedValue(undefined),
        applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
        applyIndexTransform: vi.fn().mockResolvedValue(undefined),
        applySplitTransform: vi.fn().mockResolvedValue(undefined),
        applyMergeTransform: vi.fn().mockResolvedValue(undefined),
        applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
        applyFoldTransform: vi.fn().mockResolvedValue(undefined),
        applyPivotTransform: vi.fn().mockResolvedValue(undefined),
        applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
        applyJoinTransform: vi.fn().mockResolvedValue(undefined),
        applyAppendTransform: vi.fn().mockResolvedValue(undefined),
        applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
        applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
        applyImputeTransform: vi.fn().mockResolvedValue(undefined),
        confirmImport: vi.fn(),
        fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
        generateData: vi.fn().mockResolvedValue(undefined),
        runTransform: vi.fn().mockResolvedValue(true),
      };

      // Should not throw
      expect(() => StepHandlers.setStepCallbacks(callbacks)).not.toThrow();
    });
  });

  describe('applyActiveTransform', () => {
    const createMockCallbacks = () => ({
      updatePagination: vi.fn(),
      openDialog: vi.fn(),
      closeDialog: vi.fn(),
      onJoinTargetChange: vi.fn(),
      onAppendTargetChange: vi.fn(),
      onPivotConfigChange: vi.fn(),
      applyFilterTransform: vi.fn().mockResolvedValue(undefined),
      applySortTransform: vi.fn().mockResolvedValue(undefined),
      applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
      applySampleTransform: vi.fn().mockResolvedValue(undefined),
      applySpreadTransform: vi.fn().mockResolvedValue(undefined),
      applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
      applyIndexTransform: vi.fn().mockResolvedValue(undefined),
      applySplitTransform: vi.fn().mockResolvedValue(undefined),
      applyMergeTransform: vi.fn().mockResolvedValue(undefined),
      applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
      applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
      applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
      applyFoldTransform: vi.fn().mockResolvedValue(undefined),
      applyPivotTransform: vi.fn().mockResolvedValue(undefined),
      applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
      applyJoinTransform: vi.fn().mockResolvedValue(undefined),
      applyAppendTransform: vi.fn().mockResolvedValue(undefined),
      applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
      applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
      applyImputeTransform: vi.fn().mockResolvedValue(undefined),
      confirmImport: vi.fn(),
      fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
      generateData: vi.fn().mockResolvedValue(undefined),
      runTransform: vi.fn().mockResolvedValue(true),
    });

    it('calls applyFilterTransform when filter dialog is active', async () => {
      const callbacks = createMockCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'filter';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.applyFilterTransform).toHaveBeenCalledTimes(1);
    });

    it('calls applySortTransform when sort dialog is active', async () => {
      const callbacks = createMockCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'sort';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.applySortTransform).toHaveBeenCalledTimes(1);
    });

    it('calls applyAggregateTransform when aggregate dialog is active', async () => {
      const callbacks = createMockCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'aggregate';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.applyAggregateTransform).toHaveBeenCalledTimes(1);
    });

    it('calls applyJoinTransform when join dialog is active', async () => {
      const callbacks = createMockCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'join';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.applyJoinTransform).toHaveBeenCalledTimes(1);
    });

    it('calls confirmImport when import-csv dialog is active', async () => {
      const callbacks = createMockCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'import-csv';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.confirmImport).toHaveBeenCalledTimes(1);
    });

    it('calls fetchAndImportFromUrl when import-url dialog is active', async () => {
      const callbacks = createMockCallbacks();
      StepHandlers.setStepCallbacks(callbacks);
      AppStore.activeDialog.value = 'import-url';

      await StepHandlers.applyActiveTransform();

      expect(callbacks.fetchAndImportFromUrl).toHaveBeenCalledTimes(1);
    });

    it('calls generateData when generate dialog is active', async () => {
      const callbacks = createMockCallbacks();
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

  describe('viewStep', () => {
    it('updates app state when viewing a step', () => {
      const callbacks = {
        updatePagination: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        onJoinTargetChange: vi.fn(),
        onAppendTargetChange: vi.fn(),
        onPivotConfigChange: vi.fn(),
        applyFilterTransform: vi.fn().mockResolvedValue(undefined),
        applySortTransform: vi.fn().mockResolvedValue(undefined),
        applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
        applySampleTransform: vi.fn().mockResolvedValue(undefined),
        applySpreadTransform: vi.fn().mockResolvedValue(undefined),
        applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
        applyIndexTransform: vi.fn().mockResolvedValue(undefined),
        applySplitTransform: vi.fn().mockResolvedValue(undefined),
        applyMergeTransform: vi.fn().mockResolvedValue(undefined),
        applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
        applyFoldTransform: vi.fn().mockResolvedValue(undefined),
        applyPivotTransform: vi.fn().mockResolvedValue(undefined),
        applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
        applyJoinTransform: vi.fn().mockResolvedValue(undefined),
        applyAppendTransform: vi.fn().mockResolvedValue(undefined),
        applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
        applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
        applyImputeTransform: vi.fn().mockResolvedValue(undefined),
        confirmImport: vi.fn(),
        fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
        generateData: vi.fn().mockResolvedValue(undefined),
        runTransform: vi.fn().mockResolvedValue(true),
      };
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
      const callbacks = {
        updatePagination: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        onJoinTargetChange: vi.fn(),
        onAppendTargetChange: vi.fn(),
        onPivotConfigChange: vi.fn(),
        applyFilterTransform: vi.fn().mockResolvedValue(undefined),
        applySortTransform: vi.fn().mockResolvedValue(undefined),
        applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
        applySampleTransform: vi.fn().mockResolvedValue(undefined),
        applySpreadTransform: vi.fn().mockResolvedValue(undefined),
        applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
        applyIndexTransform: vi.fn().mockResolvedValue(undefined),
        applySplitTransform: vi.fn().mockResolvedValue(undefined),
        applyMergeTransform: vi.fn().mockResolvedValue(undefined),
        applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
        applyFoldTransform: vi.fn().mockResolvedValue(undefined),
        applyPivotTransform: vi.fn().mockResolvedValue(undefined),
        applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
        applyJoinTransform: vi.fn().mockResolvedValue(undefined),
        applyAppendTransform: vi.fn().mockResolvedValue(undefined),
        applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
        applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
        applyImputeTransform: vi.fn().mockResolvedValue(undefined),
        confirmImport: vi.fn(),
        fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
        generateData: vi.fn().mockResolvedValue(undefined),
        runTransform: vi.fn().mockResolvedValue(true),
      };
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
      const callbacks = {
        updatePagination: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        onJoinTargetChange: vi.fn(),
        onAppendTargetChange: vi.fn(),
        onPivotConfigChange: vi.fn(),
        applyFilterTransform: vi.fn().mockResolvedValue(undefined),
        applySortTransform: vi.fn().mockResolvedValue(undefined),
        applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
        applySampleTransform: vi.fn().mockResolvedValue(undefined),
        applySpreadTransform: vi.fn().mockResolvedValue(undefined),
        applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
        applyIndexTransform: vi.fn().mockResolvedValue(undefined),
        applySplitTransform: vi.fn().mockResolvedValue(undefined),
        applyMergeTransform: vi.fn().mockResolvedValue(undefined),
        applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
        applyFoldTransform: vi.fn().mockResolvedValue(undefined),
        applyPivotTransform: vi.fn().mockResolvedValue(undefined),
        applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
        applyJoinTransform: vi.fn().mockResolvedValue(undefined),
        applyAppendTransform: vi.fn().mockResolvedValue(undefined),
        applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
        applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
        applyImputeTransform: vi.fn().mockResolvedValue(undefined),
        confirmImport: vi.fn(),
        fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
        generateData: vi.fn().mockResolvedValue(undefined),
        runTransform: vi.fn().mockResolvedValue(true),
      };
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

  describe('editStep', () => {
    const createMockCallbacks = () => ({
      updatePagination: vi.fn(),
      openDialog: vi.fn(),
      closeDialog: vi.fn(),
      onJoinTargetChange: vi.fn(),
      onAppendTargetChange: vi.fn(),
      onPivotConfigChange: vi.fn(),
      applyFilterTransform: vi.fn().mockResolvedValue(undefined),
      applySortTransform: vi.fn().mockResolvedValue(undefined),
      applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
      applySampleTransform: vi.fn().mockResolvedValue(undefined),
      applySpreadTransform: vi.fn().mockResolvedValue(undefined),
      applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
      applyIndexTransform: vi.fn().mockResolvedValue(undefined),
      applySplitTransform: vi.fn().mockResolvedValue(undefined),
      applyMergeTransform: vi.fn().mockResolvedValue(undefined),
      applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
      applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
      applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
      applyFoldTransform: vi.fn().mockResolvedValue(undefined),
      applyPivotTransform: vi.fn().mockResolvedValue(undefined),
      applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
      applyJoinTransform: vi.fn().mockResolvedValue(undefined),
      applyAppendTransform: vi.fn().mockResolvedValue(undefined),
      applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
      applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
      applyImputeTransform: vi.fn().mockResolvedValue(undefined),
      confirmImport: vi.fn(),
      fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
      generateData: vi.fn().mockResolvedValue(undefined),
      runTransform: vi.fn().mockResolvedValue(true),
      updateSplitPreview: vi.fn(),
      updateDedupePreview: vi.fn(),
    });

    it('does nothing when no active model', () => {
      AppStore.activeModel.value = null;

      // Should not throw
      expect(() => StepHandlers.editStep(0)).not.toThrow();
    });

    it('does nothing when step has import property', () => {
      const callbacks = createMockCallbacks();
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
      const callbacks = createMockCallbacks();
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
      const callbacks = createMockCallbacks();
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

    it('opens sort dialog and sets state for sort step', () => {
      const callbacks = createMockCallbacks();
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
      expect(DialogStore.sortState.field.value).toBe('age');
      expect(DialogStore.sortState.order.value).toBe('desc');
    });

    it('opens sample dialog and sets state for sample step', () => {
      const callbacks = createMockCallbacks();
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
      expect(DialogStore.sampleState.count.value).toBe(10);
      expect(DialogStore.sampleState.seed.value).toBe(42);
    });

    it('opens replace dialog and sets state for replace step', () => {
      const callbacks = createMockCallbacks();
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
      expect(DialogStore.replaceState.column.value).toBe('city');
      expect(DialogStore.replaceState.findValue.value).toBe('Boston');
      expect(DialogStore.replaceState.replaceValue.value).toBe('NYC');
    });

    it('opens split dialog and sets state for split step', () => {
      const callbacks = createMockCallbacks();
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
      const callbacks = createMockCallbacks();
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
      const callbacks = {
        updatePagination: vi.fn(),
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        onJoinTargetChange: vi.fn(),
        onAppendTargetChange: vi.fn(),
        onPivotConfigChange: vi.fn(),
        applyFilterTransform: vi.fn().mockResolvedValue(undefined),
        applySortTransform: vi.fn().mockResolvedValue(undefined),
        applySliceRowsTransform: vi.fn().mockResolvedValue(undefined),
        applySampleTransform: vi.fn().mockResolvedValue(undefined),
        applySpreadTransform: vi.fn().mockResolvedValue(undefined),
        applyUnrollTransform: vi.fn().mockResolvedValue(undefined),
        applyIndexTransform: vi.fn().mockResolvedValue(undefined),
        applySplitTransform: vi.fn().mockResolvedValue(undefined),
        applyMergeTransform: vi.fn().mockResolvedValue(undefined),
        applyDeriveTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpMatchTransform: vi.fn().mockResolvedValue(undefined),
        applyRegexpExtractTransform: vi.fn().mockResolvedValue(undefined),
        applyFoldTransform: vi.fn().mockResolvedValue(undefined),
        applyPivotTransform: vi.fn().mockResolvedValue(undefined),
        applyAggregateTransform: vi.fn().mockResolvedValue(undefined),
        applyJoinTransform: vi.fn().mockResolvedValue(undefined),
        applyAppendTransform: vi.fn().mockResolvedValue(undefined),
        applyReplaceTransform: vi.fn().mockResolvedValue(undefined),
        applyDedupeTransform: vi.fn().mockResolvedValue(undefined),
        applyImputeTransform: vi.fn().mockResolvedValue(undefined),
        confirmImport: vi.fn(),
        fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
        generateData: vi.fn().mockResolvedValue(undefined),
        runTransform: vi.fn().mockResolvedValue(true),
      };
      StepHandlers.setStepCallbacks(callbacks);

      AppStore.editingStepIndex.value = 5;

      StepHandlers.cancelEdit();

      expect(AppStore.editingStepIndex.value).toBeNull();
      expect(callbacks.closeDialog).toHaveBeenCalledWith(true);
    });
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
