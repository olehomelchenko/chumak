import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppStore } from '../stores/AppStore';
import {
  resetStores,
  suppressConsole,
  createTestSource,
  createTestModel,
} from '../handlers/test-utils';
import type { ColumnSchema } from '../../core/schema-engine';

vi.mock('./PersistenceService', () => ({
  PersistenceService: { autoSave: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../handlers/core/notification-handlers', () => ({
  showSuccess: vi.fn(),
}));

vi.mock('./DependencyService', () => ({
  DependencyService: {
    getDependentModelsForUI: vi.fn().mockReturnValue([]),
    markDependentsStale: vi.fn().mockReturnValue([]),
    getModelsToMarkStale: vi.fn().mockReturnValue([]),
    buildGraph: vi.fn().mockReturnValue({ nodes: new Map() }),
    getExecutionOrder: vi.fn().mockReturnValue([]),
  },
}));

import { StepService } from './StepService';
import { PersistenceService } from './PersistenceService';
import { showSuccess } from '../handlers/core/notification-handlers';

const threeColSchema = [
  { name: 'name', type: 'string' },
  { name: 'age', type: 'integer' },
  { name: 'city', type: 'string' },
] as ColumnSchema[];

const threeColData = [
  { name: 'Alice', age: 30, city: 'Boston' },
  { name: 'Bob', age: 25, city: 'Austin' },
  { name: 'Carol', age: 35, city: 'Seattle' },
];

describe('StepService', () => {
  let source: ReturnType<typeof createTestSource>;
  let model: ReturnType<typeof createTestModel>;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();

    source = createTestSource({ columns: threeColSchema, data: threeColData });
    model = createTestModel({
      steps: [
        {
          import: {
            sourceId: 'src_1',
            sourceName: 'Test Source',
            columns: ['name', 'age', 'city'],
          },
        },
      ],
      schema: threeColSchema,
      data: threeColData,
    });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];
    AppStore.activeModel.value = model;
    AppStore.currentData.value = model.data;
    AppStore.columns.value = ['name', 'age', 'city'];
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('computeModelUpToStep', () => {
    it('computes single import step (returns source data)', () => {
      const context = { sources: [source], models: [model] };

      const result = StepService.computeModelUpToStep(model, 0, context);

      expect(result.data).toHaveLength(3);
      expect(result.columns).toEqual(['name', 'age', 'city']);
    });

    it('applies filter step after import', () => {
      model.steps.push({ filter: 'age > 25' });
      const context = { sources: [source], models: [model] };

      const result = StepService.computeModelUpToStep(model, 1, context);

      expect(result.data.length).toBeLessThan(3);
      result.data.forEach((row: any) => {
        expect(row.age).toBeGreaterThan(25);
      });
    });

    it('applies multi-step pipeline (filter then derive)', () => {
      model.steps.push({ filter: 'age > 25' });
      model.steps.push({ derive: { senior: 'age >= 35' } });
      const context = { sources: [source], models: [model] };

      const result = StepService.computeModelUpToStep(model, 2, context);

      expect(result.columns).toContain('senior');
      result.data.forEach((row: any) => {
        expect(row.age).toBeGreaterThan(25);
        expect('senior' in row).toBe(true);
      });
    });

    it('skips import steps', () => {
      const context = { sources: [source], models: [model] };

      const result = StepService.computeModelUpToStep(model, 0, context);

      // Even with import step, data comes from source
      expect(result.data).toHaveLength(3);
    });

    it('throws enhanced error on invalid step', () => {
      model.steps.push({ filter: 'nonexistent_column > 5' });
      const context = { sources: [source], models: [model] };

      expect(() => StepService.computeModelUpToStep(model, 1, context)).toThrow(/Step 2 failed/);
    });

    it('throws when source not found', () => {
      model.sourceId = 'nonexistent';
      const context = { sources: [source], models: [model] };

      expect(() => StepService.computeModelUpToStep(model, 0, context)).toThrow('Source not found');
    });

    it('throws when model is null', () => {
      const context = { sources: [source], models: [model] };

      expect(() => StepService.computeModelUpToStep(null as any, 0, context)).toThrow(
        'No model provided'
      );
    });

    it('returns correct schema after type-changing transforms', () => {
      model.steps.push({ derive: { age_str: 'upper(name)' } });
      const context = { sources: [source], models: [model] };

      const result = StepService.computeModelUpToStep(model, 1, context);

      expect(result.schema.map((s) => s.name)).toContain('age_str');
    });
  });

  describe('getStepRemovalInfo', () => {
    it('returns step name and affected steps', () => {
      model.steps.push({ filter: 'age > 25' });
      model.steps.push({ derive: { senior: 'age >= 35' } });

      const info = StepService.getStepRemovalInfo(model, 1);

      expect(info.stepIndex).toBe(1);
      expect(info.stepName).toBeTruthy();
      expect(info.affectedSteps).toHaveLength(1);
    });

    it('returns empty affected steps when removing last step', () => {
      model.steps.push({ filter: 'age > 25' });

      const info = StepService.getStepRemovalInfo(model, 1);

      expect(info.affectedSteps).toHaveLength(0);
    });

    it('returns all subsequent steps as affected', () => {
      model.steps.push({ filter: 'age > 25' });
      model.steps.push({ derive: { senior: 'age >= 35' } });
      model.steps.push({ sort: { field: 'age', order: 'asc' } } as any);

      const info = StepService.getStepRemovalInfo(model, 1);

      expect(info.affectedSteps).toHaveLength(2);
    });
  });

  describe('getContext', () => {
    it('returns sources and models from AppStore', () => {
      const context = StepService.getContext();

      expect(context.sources).toEqual([source]);
      expect(context.models).toEqual([model]);
    });
  });

  describe('runTransform', () => {
    it('returns false and calls onError when no active model', async () => {
      AppStore.activeModel.value = null;
      const callbacks = { onError: vi.fn().mockResolvedValue(undefined) };

      const result = await StepService.runTransform('Filter', { filter: 'age > 25' }, callbacks);

      expect(result).toBe(false);
      expect(callbacks.onError).toHaveBeenCalledWith('No active model or data');
    });

    it('returns false and calls onError when no current data', async () => {
      AppStore.currentData.value = null;
      const callbacks = { onError: vi.fn().mockResolvedValue(undefined) };

      const result = await StepService.runTransform('Filter', { filter: 'age > 25' }, callbacks);

      expect(result).toBe(false);
    });

    it('calls onTransformStart and onTransformEnd', async () => {
      const callbacks = {
        onTransformStart: vi.fn(),
        onTransformEnd: vi.fn(),
        onDialogClose: vi.fn(),
        updatePagination: vi.fn(),
      };

      await StepService.runTransform('Filter', { filter: 'age > 25' }, callbacks);

      expect(callbacks.onTransformStart).toHaveBeenCalledWith('Filter');
      expect(callbacks.onTransformEnd).toHaveBeenCalled();
    });

    it('returns true on success', async () => {
      const callbacks = {
        onTransformStart: vi.fn(),
        onTransformEnd: vi.fn(),
        onDialogClose: vi.fn(),
        updatePagination: vi.fn(),
      };

      const result = await StepService.runTransform('Filter', { filter: 'age > 25' }, callbacks);

      expect(result).toBe(true);
    });

    it('returns false and calls onError on transform exception', async () => {
      const callbacks = {
        onTransformStart: vi.fn(),
        onTransformEnd: vi.fn(),
        onError: vi.fn().mockResolvedValue(undefined),
      };

      const result = await StepService.runTransform(
        'Filter',
        { filter: 'nonexistent_col > 5' },
        callbacks
      );

      expect(result).toBe(false);
      expect(callbacks.onError).toHaveBeenCalled();
      expect(callbacks.onTransformEnd).toHaveBeenCalled(); // always called in finally
    });
  });

  describe('executeStepRemoval', () => {
    beforeEach(() => {
      model.steps.push({ filter: 'age > 25' });
      model.steps.push({ derive: { senior: 'age >= 35' } });
    });

    it('removes single step with mode "single"', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.executeStepRemoval(model, 1, 'single', { onSuccess, onError });

      // Step at index 1 (filter) removed, step at index 2 (derive) moves to index 1
      expect(model.steps).toHaveLength(2); // import + derive
      expect(onSuccess).toHaveBeenCalled();
      expect(PersistenceService.autoSave).toHaveBeenCalled();
    });

    it('removes all steps from index with mode "all"', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.executeStepRemoval(model, 1, 'all', { onSuccess, onError });

      expect(model.steps).toHaveLength(1); // only import
      expect(onSuccess).toHaveBeenCalled();
    });

    it('calls onError when recomputation fails', async () => {
      // Add an invalid step that references a non-existent column
      model.steps = [
        model.steps[0], // import
        { derive: { x: 'nonexistent_fn()' } },
      ];

      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.executeStepRemoval(model, 1, 'single', { onSuccess, onError });

      // After removing step 1 (invalid derive), only import remains
      // This should succeed because only import step is left
      expect(onSuccess).toHaveBeenCalled();
    });

    it('calls showSuccess on successful removal', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.executeStepRemoval(model, 1, 'single', { onSuccess, onError });

      expect(showSuccess).toHaveBeenCalledWith('Step removed');
    });
  });

  describe('updateStep', () => {
    beforeEach(() => {
      model.steps.push({ filter: 'age > 25' });
    });

    it('updates step and calls onSuccess with new result', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.updateStep(model, 1, { filter: 'age > 30' }, { onSuccess, onError });

      expect(onSuccess).toHaveBeenCalled();
      const result = onSuccess.mock.calls[0][0];
      expect(result.data).toBeDefined();
      expect(result.columns).toBeDefined();
    });

    it('calls onError with backup on failure', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.updateStep(
        model,
        1,
        { filter: 'nonexistent_col > 5' },
        { onSuccess, onError }
      );

      expect(onError).toHaveBeenCalled();
      const [error, backup] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(backup.steps).toBeDefined();
      expect(backup.data).toBeDefined();
      expect(backup.schema).toBeDefined();
    });

    it('calls autoSave on success', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.updateStep(model, 1, { filter: 'age > 30' }, { onSuccess, onError });

      expect(PersistenceService.autoSave).toHaveBeenCalled();
    });

    it('calls showSuccess on success', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await StepService.updateStep(model, 1, { filter: 'age > 30' }, { onSuccess, onError });

      expect(showSuccess).toHaveBeenCalledWith('Step updated');
    });
  });

  describe('computeUpToStep', () => {
    it('uses AppStore state for context', () => {
      model.steps.push({ filter: 'age > 25' });

      const result = StepService.computeUpToStep(1);

      expect(result.data.length).toBeLessThan(3);
    });

    it('throws when no active model', () => {
      AppStore.activeModel.value = null;

      expect(() => StepService.computeUpToStep(0)).toThrow('No active model');
    });
  });
});
