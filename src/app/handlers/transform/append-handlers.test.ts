/**
 * Unit Tests for Append Handlers
 *
 * Tests append/union operations including initialization, target selection,
 * circular dependency detection, and preview generation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signal } from '@preact/signals';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { resetStores, setTestData, TestData, suppressConsole } from '../test-utils';
import * as AppendHandlers from './append-handlers';
import type { AppendDialogState } from './append-handlers';
import type { Model, Source, DataRow } from '../../types';

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

  const createMockAppendState = (
    overrides: Partial<Record<keyof AppendDialogState, any>> = {}
  ): AppendDialogState => ({
    leftModel: signal<string | null>(overrides.leftModel ?? null),
    targetModel: signal<string | null>(overrides.targetModel ?? null),
    leftColumns: signal<string[]>(overrides.leftColumns ?? []),
    rightColumns: signal<string[]>(overrides.rightColumns ?? []),
    selectedLeftColumns: signal<string[]>(overrides.selectedLeftColumns ?? []),
    selectedRightColumns: signal<string[]>(overrides.selectedRightColumns ?? []),
    removeDuplicates: signal<boolean>(overrides.removeDuplicates ?? false),
    previewData: signal<any | null>(overrides.previewData ?? null),
    previewError: signal<string | null>(overrides.previewError ?? null),
    isPreviewing: signal<boolean>(overrides.isPreviewing ?? false),
    previewTableId: signal<string | null>(overrides.previewTableId ?? null),
  });

  describe('previewAppend', () => {
    it('sets error when no left model selected', async () => {
      const state = createMockAppendState({ targetModel: 'model-2' });

      await AppendHandlers.previewAppend(state);

      expect(state.previewError.value).toBe('Select a left table');
    });

    it('sets error when no target model selected', async () => {
      const state = createMockAppendState({ leftModel: 'model-1' });

      await AppendHandlers.previewAppend(state);

      expect(state.previewError.value).toBe('Select a model or source to append');
    });

    it('sets error when circular dependency detected', async () => {
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;

      const state = createMockAppendState({
        leftModel: 'model-1',
        targetModel: 'model-1',
        selectedLeftColumns: ['name', 'age'],
        selectedRightColumns: ['name', 'age'],
      });

      await AppendHandlers.previewAppend(state);

      expect(state.previewError.value).toContain('circular');
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

      const state = createMockAppendState({
        leftModel: 'model-1',
        targetModel: 'model-2',
        selectedLeftColumns: ['name', 'age'],
        selectedRightColumns: ['name', 'age'],
        removeDuplicates: false,
      });

      const previewPromise = AppendHandlers.previewAppend(state);

      // After preview completes, isPreviewing should be false
      await previewPromise;
      expect(state.isPreviewing.value).toBe(false);
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
      DialogStore.activeDialogState.value = {
        leftModel: null,
        targetModel: 'model-2',
        selectedLeftColumns: [],
        selectedRightColumns: [],
        removeDuplicates: false,
      };

      await AppendHandlers.applyAppendTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select a left table');
    });

    it('calls onError when no target model selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.activeDialogState.value = {
        leftModel: 'model-1',
        targetModel: null,
        selectedLeftColumns: [],
        selectedRightColumns: [],
        removeDuplicates: false,
      };

      await AppendHandlers.applyAppendTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select a model or source to append');
    });

    it('calls onError when circular dependency detected', async () => {
      const callbacks = createMockCallbacks();
      const source = createTestSource('source-1', 'Source 1', ['name', 'age']);
      const model1 = createTestModel('model-1', 'Model 1', 'source-1', ['name', 'age']);

      AppStore.sources.value = [source];
      AppStore.models.value = [model1];
      AppStore.activeModel.value = model1;

      DialogStore.activeDialogState.value = {
        leftModel: 'model-1',
        targetModel: 'model-1',
        selectedLeftColumns: ['name', 'age'],
        selectedRightColumns: ['name', 'age'],
        removeDuplicates: false,
      };

      await AppendHandlers.applyAppendTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalled();
      expect(callbacks.onError.mock.calls[0][0]).toContain('circular');
    });
  });
});
