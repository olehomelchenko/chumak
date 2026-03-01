import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppStore } from '../stores/AppStore';
import {
  resetStores,
  suppressConsole,
  createTestSource,
  createTestModel,
} from '../handlers/test-utils';

vi.mock('./PersistenceService', () => ({
  PersistenceService: {
    autoSave: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../handlers/core/notification-handlers', () => ({
  showSuccess: vi.fn(),
}));

vi.mock('./DependencyService', () => ({
  DependencyService: {
    canDeleteModel: vi.fn().mockReturnValue({ canDelete: true }),
    canDeleteSource: vi.fn().mockReturnValue({ canDelete: true }),
    clearStaleFlag: vi.fn(),
    getDependentModelsForUI: vi.fn().mockReturnValue([]),
    markDependentsStale: vi.fn().mockReturnValue([]),
    getModelsToMarkStale: vi.fn().mockReturnValue([]),
    buildGraph: vi.fn().mockReturnValue({ nodes: new Map() }),
    getExecutionOrder: vi.fn().mockReturnValue([]),
  },
}));

import { ModelService } from './ModelService';
import { PersistenceService } from './PersistenceService';
import { DependencyService } from './DependencyService';
import { showSuccess } from '../handlers/core/notification-handlers';

describe('ModelService', () => {
  let source: ReturnType<typeof createTestSource>;
  let model: ReturnType<typeof createTestModel>;
  let consoleSpy: ReturnType<typeof suppressConsole>;
  const clearColumnSelection = vi.fn();

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();

    source = createTestSource();
    model = createTestModel({ name: 'Model A' });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];
    AppStore.activeSource.value = source;
    AppStore.activeModel.value = model;
    AppStore.currentData.value = model.data;
    AppStore.columns.value = ['name', 'age'];
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('switchToSource', () => {
    it('sets source as active and clears model', () => {
      ModelService.switchToSource(source, clearColumnSelection);

      expect(AppStore.activeSource.value).toBe(source);
      expect(AppStore.activeModel.value).toBeNull();
      expect(AppStore.viewMode.value).toBe('dataset-info');
      expect(AppStore.currentData.value).toBe(source.data);
      expect(clearColumnSelection).toHaveBeenCalled();
    });

    it('extracts column names from source schema', () => {
      ModelService.switchToSource(source, clearColumnSelection);

      expect(AppStore.columns.value).toEqual(['name', 'age']);
    });
  });

  describe('showDatasetInfo', () => {
    it('sets viewMode to dataset-info', () => {
      ModelService.showDatasetInfo(source, clearColumnSelection);

      expect(AppStore.viewMode.value).toBe('dataset-info');
      expect(AppStore.activeSource.value).toBe(source);
      expect(AppStore.activeModel.value).toBeNull();
    });
  });

  describe('showModelInfo', () => {
    it('sets viewMode to model-info', () => {
      ModelService.showModelInfo(model, clearColumnSelection);

      expect(AppStore.viewMode.value).toBe('model-info');
      expect(AppStore.activeModel.value).toBe(model);
      expect(AppStore.activeSource.value).toBeNull();
    });
  });

  describe('switchToModel', () => {
    const updatePagination = vi.fn();
    const setRibbonTab = vi.fn();

    it('sets model as active', () => {
      ModelService.switchToModel(
        model,
        clearColumnSelection,
        updatePagination,
        'data',
        setRibbonTab
      );

      expect(AppStore.activeModel.value).toBe(model);
      expect(AppStore.viewMode.value).toBe('model');
      expect(updatePagination).toHaveBeenCalled();
    });

    it('sets ribbon tab to "prepare" when current is "data"', () => {
      ModelService.switchToModel(
        model,
        clearColumnSelection,
        updatePagination,
        'data',
        setRibbonTab
      );

      expect(setRibbonTab).toHaveBeenCalledWith('rows');
    });

    it('does not change ribbon tab when already on valid tab', () => {
      ModelService.switchToModel(
        model,
        clearColumnSelection,
        updatePagination,
        'rows',
        setRibbonTab
      );

      expect(setRibbonTab).not.toHaveBeenCalled();
    });

    it('sets columns from schema', () => {
      ModelService.switchToModel(
        model,
        clearColumnSelection,
        updatePagination,
        'rows',
        setRibbonTab
      );

      expect(AppStore.columns.value).toEqual(['name', 'age']);
    });

    it('sets empty columns when model has no data', () => {
      model.data = [];
      model.schema = [];

      ModelService.switchToModel(
        model,
        clearColumnSelection,
        updatePagination,
        'rows',
        setRibbonTab
      );

      expect(AppStore.columns.value).toEqual([]);
    });
  });

  describe('copyCurrentModel', () => {
    const switchToModelFn = vi.fn();

    it('alerts when no active model', async () => {
      AppStore.activeModel.value = null;
      const prompt = vi.fn();
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.copyCurrentModel(prompt, alert, switchToModelFn);

      expect(alert).toHaveBeenCalledWith('No active model selected');
    });

    it('does nothing when prompt returns null', async () => {
      const prompt = vi.fn().mockResolvedValue(null);
      const alert = vi.fn();

      await ModelService.copyCurrentModel(prompt, alert, switchToModelFn);

      expect(AppStore.models.value).toHaveLength(1);
    });

    it('alerts on duplicate name', async () => {
      const prompt = vi.fn().mockResolvedValue('Model A');
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.copyCurrentModel(prompt, alert, switchToModelFn);

      expect(alert).toHaveBeenCalledWith('A model with this name already exists for this source.');
    });

    it('creates copy with new name', async () => {
      const prompt = vi.fn().mockResolvedValue('Model B');
      const alert = vi.fn();

      await ModelService.copyCurrentModel(prompt, alert, switchToModelFn);

      expect(AppStore.models.value).toHaveLength(2);
      const copied = AppStore.models.value[1];
      expect(copied.name).toBe('Model B');
      expect(copied.sourceId).toBe('src_1');
      expect(switchToModelFn).toHaveBeenCalledWith(copied);
      expect(PersistenceService.autoSave).toHaveBeenCalled();
    });

    it('deep copies steps and schema', async () => {
      const prompt = vi.fn().mockResolvedValue('Model B');
      const alert = vi.fn();

      await ModelService.copyCurrentModel(prompt, alert, switchToModelFn);

      const copied = AppStore.models.value[1];
      expect(copied.steps).not.toBe(model.steps);
      expect(copied.steps).toEqual(model.steps);
    });
  });

  describe('renameCurrentModel', () => {
    it('alerts when no active model', async () => {
      AppStore.activeModel.value = null;
      const prompt = vi.fn();
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.renameCurrentModel(prompt, alert);

      expect(alert).toHaveBeenCalledWith('No active model selected');
    });

    it('does nothing when prompt returns null', async () => {
      const prompt = vi.fn().mockResolvedValue(null);
      const alert = vi.fn();

      await ModelService.renameCurrentModel(prompt, alert);

      expect(model.name).toBe('Model A');
    });

    it('does nothing when name unchanged', async () => {
      const prompt = vi.fn().mockResolvedValue('Model A');
      const alert = vi.fn();

      await ModelService.renameCurrentModel(prompt, alert);

      expect(PersistenceService.autoSave).not.toHaveBeenCalled();
    });

    it('renames model and saves', async () => {
      const prompt = vi.fn().mockResolvedValue('Model Renamed');
      const alert = vi.fn();

      await ModelService.renameCurrentModel(prompt, alert);

      expect(model.name).toBe('Model Renamed');
      expect(PersistenceService.autoSave).toHaveBeenCalled();
      expect(showSuccess).toHaveBeenCalledWith('Model renamed to "Model Renamed"');
    });

    it('alerts on duplicate name (case-insensitive)', async () => {
      const model2 = createTestModel({ id: 'mdl_2', name: 'Existing' });
      AppStore.models.value = [model, model2];

      const prompt = vi.fn().mockResolvedValue('existing');
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.renameCurrentModel(prompt, alert);

      expect(alert).toHaveBeenCalledWith('A model with this name already exists for this source.');
    });
  });

  describe('deleteCurrentModel', () => {
    const switchToModelFn = vi.fn();

    it('alerts when no active model', async () => {
      AppStore.activeModel.value = null;
      const confirm = vi.fn();
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.deleteCurrentModel(confirm, alert, switchToModelFn);

      expect(alert).toHaveBeenCalledWith('No active model selected');
    });

    it('alerts when only one model for source', async () => {
      const confirm = vi.fn();
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.deleteCurrentModel(confirm, alert, switchToModelFn);

      expect(alert).toHaveBeenCalledWith('Cannot delete the last model for this source.');
    });

    it('alerts when model has dependents', async () => {
      const model2 = createTestModel({ id: 'mdl_2', name: 'Model B' });
      AppStore.models.value = [model, model2];
      vi.mocked(DependencyService.canDeleteModel).mockReturnValueOnce({
        canDelete: false,
        message: 'Referenced by Model B',
      });

      const confirm = vi.fn();
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.deleteCurrentModel(confirm, alert, switchToModelFn);

      expect(alert).toHaveBeenCalledWith('Referenced by Model B');
    });

    it('does nothing when user declines confirm', async () => {
      const model2 = createTestModel({ id: 'mdl_2', name: 'Model B' });
      AppStore.models.value = [model, model2];

      const confirm = vi.fn().mockResolvedValue(false);
      const alert = vi.fn();

      await ModelService.deleteCurrentModel(confirm, alert, switchToModelFn);

      expect(AppStore.models.value).toHaveLength(2);
    });

    it('deletes model and switches to remaining one', async () => {
      const model2 = createTestModel({ id: 'mdl_2', name: 'Model B' });
      AppStore.models.value = [model, model2];

      const confirm = vi.fn().mockResolvedValue(true);
      const alert = vi.fn();

      await ModelService.deleteCurrentModel(confirm, alert, switchToModelFn);

      expect(AppStore.models.value).toHaveLength(1);
      expect(AppStore.models.value[0].id).toBe('mdl_2');
      expect(switchToModelFn).toHaveBeenCalledWith(model2);
      expect(PersistenceService.autoSave).toHaveBeenCalled();
    });
  });

  describe('renameSource', () => {
    it('does nothing when prompt returns null', async () => {
      const prompt = vi.fn().mockResolvedValue(null);

      await ModelService.renameSource(source, prompt);

      expect(source.name).toBe('Test Source');
    });

    it('does nothing when name unchanged', async () => {
      const prompt = vi.fn().mockResolvedValue('Test Source');

      await ModelService.renameSource(source, prompt);

      expect(PersistenceService.autoSave).not.toHaveBeenCalled();
    });

    it('renames source and saves', async () => {
      const prompt = vi.fn().mockResolvedValue('Renamed Source');

      await ModelService.renameSource(source, prompt);

      expect(source.name).toBe('Renamed Source');
      expect(PersistenceService.autoSave).toHaveBeenCalled();
      expect(showSuccess).toHaveBeenCalledWith('Source renamed to "Renamed Source"');
    });
  });

  describe('deleteSource', () => {
    it('alerts when source has dependents', async () => {
      vi.mocked(DependencyService.canDeleteSource).mockReturnValueOnce({
        canDelete: false,
        message: 'Models reference this source',
      });

      const confirm = vi.fn();
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.deleteSource(source, confirm, alert);

      expect(alert).toHaveBeenCalledWith('Models reference this source');
    });

    it('does nothing when user declines confirm', async () => {
      const confirm = vi.fn().mockResolvedValue(false);
      const alert = vi.fn();

      await ModelService.deleteSource(source, confirm, alert);

      expect(AppStore.sources.value).toHaveLength(1);
    });

    it('deletes source and its models', async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const alert = vi.fn();

      await ModelService.deleteSource(source, confirm, alert);

      expect(AppStore.sources.value).toHaveLength(0);
      expect(AppStore.models.value).toHaveLength(0);
      expect(PersistenceService.autoSave).toHaveBeenCalled();
    });

    it('clears active state when deleting active source', async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const alert = vi.fn();

      await ModelService.deleteSource(source, confirm, alert);

      expect(AppStore.activeSource.value).toBeNull();
      expect(AppStore.activeModel.value).toBeNull();
      expect(AppStore.viewMode.value).toBe('empty');
    });

    it('includes model count in confirmation message', async () => {
      const confirm = vi.fn().mockResolvedValue(false);
      const alert = vi.fn();

      await ModelService.deleteSource(source, confirm, alert);

      const msg = confirm.mock.calls[0][0];
      expect(msg).toContain('1 model');
    });
  });

  describe('clearAllData', () => {
    it('delegates to PersistenceService', async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const alert = vi.fn().mockResolvedValue(undefined);

      await ModelService.clearAllData(confirm, alert);

      expect(PersistenceService.clearAllData).toHaveBeenCalledWith(confirm, alert);
    });
  });
});
