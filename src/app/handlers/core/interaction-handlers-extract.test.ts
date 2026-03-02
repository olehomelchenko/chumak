import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import {
  resetStores,
  suppressConsole,
  createTestSource,
  createTestModel,
  createTestSchema,
} from '../test-utils';

vi.mock('../../services/PersistenceService', () => ({
  PersistenceService: { autoSave: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./notification-handlers', () => ({
  prompt: vi.fn().mockResolvedValue('Extracted'),
  alert: vi.fn().mockResolvedValue(undefined),
  showSuccess: vi.fn(),
}));

vi.mock('../../services/DependencyService', () => ({
  DependencyService: {
    getDependentModelsForUI: vi.fn().mockReturnValue([]),
    markDependentsStale: vi.fn().mockReturnValue([]),
  },
}));

import { extractSelectedRows } from './interaction-handlers';
import { PersistenceService } from '../../services/PersistenceService';
import * as NotificationHandlers from './notification-handlers';

const schema = createTestSchema(['name', 'string'], ['age', 'integer'], ['city', 'string']);
const data = [
  { name: 'Alice', age: 30, city: 'Boston' },
  { name: 'Bob', age: 25, city: 'Austin' },
  { name: 'Carol', age: 35, city: 'Seattle' },
];

describe('extractSelectedRows', () => {
  let source: ReturnType<typeof createTestSource>;
  let model: ReturnType<typeof createTestModel>;
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    consoleSpy = suppressConsole();

    source = createTestSource({ columns: schema, data });
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
      schema,
      data,
    });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];
    AppStore.activeModel.value = model;
    AppStore.currentData.value = data;
    AppStore.columns.value = ['name', 'age', 'city'];
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  it('does nothing when no rows are selected', async () => {
    AppStore.selectedRows.value = [];
    const switchToModel = vi.fn();

    await extractSelectedRows(switchToModel);

    expect(switchToModel).not.toHaveBeenCalled();
  });

  it('does nothing when user cancels prompt', async () => {
    AppStore.selectedRows.value = [0, 1];
    vi.mocked(NotificationHandlers.prompt).mockResolvedValueOnce(null);
    const switchToModel = vi.fn();

    await extractSelectedRows(switchToModel);

    expect(switchToModel).not.toHaveBeenCalled();
  });

  it('does nothing when user provides empty name', async () => {
    AppStore.selectedRows.value = [0, 1];
    vi.mocked(NotificationHandlers.prompt).mockResolvedValueOnce('  ');
    const switchToModel = vi.fn();

    await extractSelectedRows(switchToModel);

    expect(switchToModel).not.toHaveBeenCalled();
  });

  it('rejects duplicate model names', async () => {
    AppStore.selectedRows.value = [0];
    vi.mocked(NotificationHandlers.prompt).mockResolvedValueOnce('Test Model');
    const switchToModel = vi.fn();

    await extractSelectedRows(switchToModel);

    expect(NotificationHandlers.alert).toHaveBeenCalledWith(
      'A model with this name already exists for this source.'
    );
    expect(switchToModel).not.toHaveBeenCalled();
  });

  it('creates a new model with selected rows', async () => {
    AppStore.selectedRows.value = [0, 2]; // Alice and Carol
    const switchToModel = vi.fn();

    await extractSelectedRows(switchToModel);

    // New model should be added
    expect(AppStore.models.value).toHaveLength(2);
    const newModel = AppStore.models.value[1];
    expect(newModel.name).toBe('Extracted');

    // Should have original steps + keepRows
    const lastStep = newModel.steps[newModel.steps.length - 1];
    expect(lastStep).toHaveProperty('keepRows');
    expect((lastStep as any).keepRows.indices).toEqual([0, 2]);

    // Should switch to the new model
    expect(switchToModel).toHaveBeenCalledWith(newModel);

    // Should persist
    expect(PersistenceService.autoSave).toHaveBeenCalled();

    // Should show success
    expect(NotificationHandlers.showSuccess).toHaveBeenCalledWith(
      'Model "Extracted" created with 2 rows'
    );
  });

  it('clears selection after extraction', async () => {
    AppStore.selectedRows.value = [0];
    AppStore.selectedColumns.value = ['name'];

    await extractSelectedRows(vi.fn());

    expect(AppStore.selectedRows.value).toEqual([]);
    expect(AppStore.selectedColumns.value).toEqual([]);
  });

  it('uses default name with _extract suffix', async () => {
    AppStore.selectedRows.value = [0];

    await extractSelectedRows(vi.fn());

    expect(NotificationHandlers.prompt).toHaveBeenCalledWith(
      'Enter name for extracted model:',
      'Test Model_extract'
    );
  });
});
