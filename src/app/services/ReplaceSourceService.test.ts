import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReplaceSourceService } from './ReplaceSourceService';
import { AppStore } from '../stores/AppStore';
import { PersistenceService } from './PersistenceService';
import { createTestSource, createTestModel, createTestSchema } from '../handlers/test-utils';

vi.mock('./PersistenceService', () => ({
  PersistenceService: {
    autoSave: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ReplaceSourceService', () => {
  beforeEach(() => {
    AppStore.sources.value = [];
    AppStore.models.value = [];
    AppStore.activeSource.value = null;
    AppStore.notifications.value = [];
    AppStore.notificationIdCounter.value = 0;
    vi.clearAllMocks();
  });

  it('replaces source data and metadata and creates backup', async () => {
    const source = createTestSource({
      name: 'Old Source',
      data: [{ a: 1 }],
      columns: createTestSchema(['a', 'integer']),
      rowCount: 1,
    });
    AppStore.sources.value = [source];

    const newData = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ];
    const newColumns = createTestSchema(['a', 'integer'], ['b', 'integer']);

    await ReplaceSourceService.replaceSource('src_1', newData, newColumns, {
      fileName: 'new.csv',
      headerMode: 'manual',
      delimiter: ';',
    });

    const updated = AppStore.sources.value[0];
    expect(updated.data).toEqual(newData);
    expect(updated.columns).toEqual(newColumns);
    expect(updated.backup).toBeDefined();
    expect(updated.backup?.name).toBe('Old Source');
    expect(updated.backup?.data).toEqual([{ a: 1 }]);
    expect(PersistenceService.autoSave).toHaveBeenCalled();
  });

  it('restores source from backup', async () => {
    const source = createTestSource({
      name: 'New Name',
      data: [{ x: 100 }],
      columns: createTestSchema(['x', 'integer']),
      rowCount: 1,
      backup: {
        id: 'src_1',
        name: 'Old Name',
        data: [{ a: 1 }, { a: 2 }],
        columns: createTestSchema(['a', 'integer']),
        rowCount: 2,
        headerMode: 'first-row',
        delimiter: ',',
        customHeaders: null,
        origin: 'file',
      },
    });
    AppStore.sources.value = [source];

    await ReplaceSourceService.restoreBackup('src_1');

    const restored = AppStore.sources.value[0];
    expect(restored.name).toBe('Old Name');
    expect(restored.data).toEqual([{ a: 1 }, { a: 2 }]);
    expect(restored.rowCount).toBe(2);
    // Swapped backup for undo/redo
    expect(restored.backup.name).toBe('New Name');
  });

  it('marks dependent models as stale on replace and restore', async () => {
    const source = createTestSource({ name: 'S1', data: [], columns: [] });
    const model = createTestModel({ name: 'M1', steps: [], isStale: false });

    AppStore.sources.value = [source];
    AppStore.models.value = [model];

    await ReplaceSourceService.replaceSource('src_1', [], [], {
      headerMode: 'first-row',
      delimiter: ',',
    });
    expect(AppStore.models.value[0].isStale).toBe(true);

    AppStore.models.value[0].isStale = false;
    await ReplaceSourceService.restoreBackup('src_1');
    expect(AppStore.models.value[0].isStale).toBe(true);
  });

  it('updates AppStore.activeSource if it is the current source', async () => {
    const source = createTestSource({ name: 'S1', data: [], columns: [] });
    AppStore.sources.value = [source];
    AppStore.activeSource.value = { ...source };

    const newData = [{ x: 1 }];
    const newColumns = createTestSchema(['x', 'integer']);

    await ReplaceSourceService.replaceSource('src_1', newData, newColumns, {
      headerMode: 'first-row',
      delimiter: ',',
    });

    expect(AppStore.activeSource.value?.id).toBe('src_1');
    expect(AppStore.currentData.value).toEqual(newData);
    expect(AppStore.columns.value).toEqual(['x']);
  });

  it('shows notifications', async () => {
    const source = createTestSource({ name: 'S1', data: [], columns: [] });
    AppStore.sources.value = [source];

    await ReplaceSourceService.replaceSource('src_1', [], [], {
      headerMode: 'first-row',
      delimiter: ',',
    });

    expect(AppStore.notifications.value).toHaveLength(1);
    expect(AppStore.notifications.value[0].message).toContain('Source replaced');
  });
});
