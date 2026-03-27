/**
 * Storage Error Recovery Tests
 *
 * Tests error handling paths in the IndexedDB persistence layer.
 * Uses fake-indexeddb for happy paths and mocks for error simulation.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  openDatabase,
  autoSave,
  loadInitialData,
  clearAllData,
  saveSources,
  saveModels,
  loadSources,
  loadModels,
} from './storage';

describe('Storage - IndexedDB Integration', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Delete database before each test for isolation
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('syto-db');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Resolve even on error
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('openDatabase', () => {
    it('resolves with a database instance', async () => {
      const db = await openDatabase();

      expect(db).toBeDefined();
      expect(db.name).toBe('syto-db');
      db.close();
    });

    it('creates sources and models object stores', async () => {
      const db = await openDatabase();

      expect(db.objectStoreNames.contains('sources')).toBe(true);
      expect(db.objectStoreNames.contains('models')).toBe(true);
      db.close();
    });

    it('rejects when indexedDB.open throws', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('IndexedDB unavailable');
      });

      await expect(openDatabase()).rejects.toThrow('IndexedDB unavailable');
    });
  });

  describe('saveSources / loadSources', () => {
    it('round-trips source data correctly', async () => {
      const sources = [
        { id: 'src_1', name: 'Test Source', data: [{ a: 1 }] },
        { id: 'src_2', name: 'Another Source', data: [{ b: 2 }] },
      ];

      await saveSources(sources);
      const loaded = await loadSources();

      expect(loaded).toHaveLength(2);
      expect(loaded.find((s: any) => s.id === 'src_1')?.name).toBe('Test Source');
      expect(loaded.find((s: any) => s.id === 'src_2')?.name).toBe('Another Source');
    });

    it('handles empty sources array', async () => {
      await saveSources([]);
      const loaded = await loadSources();

      expect(loaded).toEqual([]);
    });

    it('overwrites previous data on save', async () => {
      await saveSources([{ id: 'src_1', name: 'First' }]);
      await saveSources([{ id: 'src_2', name: 'Second' }]);

      const loaded = await loadSources();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('src_2');
    });

    it('rejects when database open fails', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('DB unavailable');
      });

      await expect(saveSources([{ id: 'src_1' }])).rejects.toThrow('DB unavailable');
    });
  });

  describe('saveModels / loadModels', () => {
    it('round-trips model data correctly', async () => {
      const models = [{ id: 'mdl_1', name: 'Model A', steps: [{ filter: 'x > 0' }] }];

      await saveModels(models);
      const loaded = await loadModels();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Model A');
      expect(loaded[0].steps).toEqual([{ filter: 'x > 0' }]);
    });

    it('handles empty models array', async () => {
      await saveModels([]);
      const loaded = await loadModels();

      expect(loaded).toEqual([]);
    });

    it('rejects when database open fails', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('DB unavailable');
      });

      await expect(saveModels([{ id: 'mdl_1' }])).rejects.toThrow('DB unavailable');
    });
  });

  describe('autoSave', () => {
    it('saves sources and models successfully', async () => {
      await autoSave([{ id: 'src_1', name: 'Source' }], [{ id: 'mdl_1', name: 'Model' }]);

      const sources = await loadSources();
      const models = await loadModels();
      expect(sources).toHaveLength(1);
      expect(models).toHaveLength(1);
    });

    it('catches and logs errors when save fails', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      // Should not throw — error is caught internally
      await autoSave([{ id: 'src_1' }], [{ id: 'mdl_1' }]);

      expect(consoleSpy).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error));
    });

    it('completes without throwing on empty data', async () => {
      await autoSave([], []);

      const sources = await loadSources();
      const models = await loadModels();
      expect(sources).toEqual([]);
      expect(models).toEqual([]);
    });
  });

  describe('clearAllData', () => {
    it('removes all stored sources and models', async () => {
      await saveSources([{ id: 'src_1', name: 'Source' }]);
      await saveModels([{ id: 'mdl_1', name: 'Model' }]);

      await clearAllData();

      const sources = await loadSources();
      const models = await loadModels();

      expect(sources).toEqual([]);
      expect(models).toEqual([]);
    });

    it('succeeds on empty database', async () => {
      await expect(clearAllData()).resolves.toBeUndefined();
    });

    it('rejects when database open fails', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('DB unavailable');
      });

      await expect(clearAllData()).rejects.toThrow('DB unavailable');
    });
  });

  describe('loadInitialData', () => {
    it('returns empty arrays for empty database', async () => {
      const result = await loadInitialData();

      expect(result.sources).toEqual([]);
      expect(result.models).toEqual([]);
    });

    it('loads pre-populated data', async () => {
      await saveSources([
        { id: 'src_1', name: 'Source', columns: [{ name: 'a', type: 'string' }] },
      ]);
      await saveModels([{ id: 'mdl_1', name: 'Model', schema: [{ name: 'a', type: 'string' }] }]);

      const result = await loadInitialData();

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe('Source');
      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('Model');
    });

    it('returns empty arrays when database fails', async () => {
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('DB corrupted');
      });

      const result = await loadInitialData();

      expect(result).toEqual({ sources: [], models: [], validationWarnings: [] });
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load initial data:', expect.any(Error));
    });

    it('normalizes schemas with unknown column types', async () => {
      // Save a source with an unknown column type
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [{ name: 'col1', type: 'unknown_future_type' }],
        },
      ]);

      const result = await loadInitialData();

      // SchemaEngine.normalizeSchema should convert unknown types to 'string'
      expect(result.sources[0].columns[0].type).toBe('string');
    });
  });
});
