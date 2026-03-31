/**
 * Storage Data Integrity Tests
 *
 * Tests that the v2 lazy-loading storage layer never loses user data.
 * Covers: v1→v2 migration, save with null data, orphan cleanup,
 * ensure* functions, and full round-trip scenarios.
 *
 * Uses fake-indexeddb to simulate real IndexedDB behavior.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  openDatabase,
  saveSources,
  saveModels,
  loadSources,
  loadModels,
  loadSourceData,
  loadModelData,
  ensureSourceData,
  ensureModelData,
  clearAllData,
} from './storage';

// Helper: seed a v1-format database (version 1, data embedded in records)
async function seedV1Database(sources: any[], models: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('syto-db', 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sources')) {
        db.createObjectStore('sources', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['sources', 'models'], 'readwrite');
      for (const source of sources) {
        tx.objectStore('sources').put(source);
      }
      for (const model of models) {
        tx.objectStore('models').put(model);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };

    request.onerror = () => reject(request.error);
  });
}

// Helper: read raw record from an object store (bypasses our API)
async function rawGet(storeName: string, key: string): Promise<any> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

// Helper: read all keys from a store
async function rawGetAllKeys(storeName: string): Promise<string[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const req = tx.objectStore(storeName).getAllKeys();
    req.onsuccess = () => {
      db.close();
      resolve(req.result as string[]);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

describe('Storage - Data Integrity', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('syto-db');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────
  // V1 → V2 Migration
  // ──────────────────────────────────────────────

  describe('v1→v2 migration', () => {
    it('moves source row data to source-data store', async () => {
      const sourceData = [{ name: 'Alice' }, { name: 'Bob' }];
      await seedV1Database(
        [
          {
            id: 'src_1',
            name: 'People',
            columns: [{ name: 'name', type: 'string' }],
            data: sourceData,
          },
        ],
        []
      );

      // Opening with v2 triggers migration
      const db = await openDatabase();
      db.close();

      // Data should now be in the separate store
      const data = await loadSourceData('src_1');
      expect(data).toEqual(sourceData);

      // Metadata should not contain data
      const meta = await rawGet('sources', 'src_1');
      expect(meta.data).toBeUndefined();
      expect(meta.rowCount).toBe(2);
      expect(meta.colCount).toBe(1);
    });

    it('moves model row data to model-data store', async () => {
      const modelData = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      await seedV1Database(
        [],
        [
          {
            id: 'mdl_1',
            name: 'Model A',
            schema: [
              { name: 'x', type: 'integer' },
              { name: 'y', type: 'integer' },
            ],
            data: modelData,
            steps: [],
          },
        ]
      );

      const db = await openDatabase();
      db.close();

      const data = await loadModelData('mdl_1');
      expect(data).toEqual(modelData);

      const meta = await rawGet('models', 'mdl_1');
      expect(meta.data).toBeUndefined();
      expect(meta.rowCount).toBe(2);
      expect(meta.colCount).toBe(2);
    });

    it('preserves all rows during migration (no truncation)', async () => {
      const largeData = Array.from({ length: 5000 }, (_, i) => ({ id: i, value: `row_${i}` }));
      await seedV1Database(
        [
          {
            id: 'src_big',
            name: 'Big',
            columns: [{ name: 'id' }, { name: 'value' }],
            data: largeData,
          },
        ],
        []
      );

      const db = await openDatabase();
      db.close();

      const data = await loadSourceData('src_big');
      expect(data).toHaveLength(5000);
      expect(data![0]).toEqual({ id: 0, value: 'row_0' });
      expect(data![4999]).toEqual({ id: 4999, value: 'row_4999' });
    });

    it('handles v1 sources with no data field gracefully', async () => {
      await seedV1Database([{ id: 'src_empty', name: 'Empty', columns: [] }], []);

      const db = await openDatabase();
      db.close();

      const data = await loadSourceData('src_empty');
      expect(data).toBeNull(); // No data was migrated
    });

    it('migrates multiple sources and models in one upgrade', async () => {
      await seedV1Database(
        [
          { id: 'src_1', name: 'S1', columns: [], data: [{ a: 1 }] },
          { id: 'src_2', name: 'S2', columns: [], data: [{ b: 2 }, { b: 3 }] },
        ],
        [
          { id: 'mdl_1', name: 'M1', schema: [], steps: [], data: [{ c: 10 }] },
          { id: 'mdl_2', name: 'M2', schema: [], steps: [], data: [{ d: 20 }] },
        ]
      );

      const db = await openDatabase();
      db.close();

      expect(await loadSourceData('src_1')).toEqual([{ a: 1 }]);
      expect(await loadSourceData('src_2')).toEqual([{ b: 2 }, { b: 3 }]);
      expect(await loadModelData('mdl_1')).toEqual([{ c: 10 }]);
      expect(await loadModelData('mdl_2')).toEqual([{ d: 20 }]);
    });
  });

  // ──────────────────────────────────────────────
  // Save with null data (lazy-loaded sources)
  // ──────────────────────────────────────────────

  describe('save preserves unloaded data', () => {
    it('saving source with null data does NOT overwrite existing data store entry', async () => {
      // First save with real data
      await saveSources([
        {
          id: 'src_1',
          name: 'People',
          columns: [{ name: 'name', type: 'string' }],
          data: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      ]);

      // Verify data was stored
      const dataBefore = await loadSourceData('src_1');
      expect(dataBefore).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);

      // Now save the same source with data=null (simulating unloaded state)
      await saveSources([
        {
          id: 'src_1',
          name: 'People (renamed)',
          columns: [{ name: 'name', type: 'string' }],
          data: null,
          rowCount: 2,
          colCount: 1,
        },
      ]);

      // Data in separate store must be preserved
      const dataAfter = await loadSourceData('src_1');
      expect(dataAfter).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);

      // Metadata should reflect the rename
      const sources = await loadSources();
      expect(sources[0].name).toBe('People (renamed)');
    });

    it('saving model with null data does NOT overwrite existing data store entry', async () => {
      await saveModels([
        {
          id: 'mdl_1',
          name: 'Model A',
          schema: [{ name: 'x', type: 'integer' }],
          steps: [],
          data: [{ x: 100 }, { x: 200 }],
        },
      ]);

      const dataBefore = await loadModelData('mdl_1');
      expect(dataBefore).toEqual([{ x: 100 }, { x: 200 }]);

      // Save with null data
      await saveModels([
        {
          id: 'mdl_1',
          name: 'Model A',
          schema: [{ name: 'x', type: 'integer' }],
          steps: [],
          data: null,
          rowCount: 2,
          colCount: 1,
        },
      ]);

      const dataAfter = await loadModelData('mdl_1');
      expect(dataAfter).toEqual([{ x: 100 }, { x: 200 }]);
    });

    it('saving source with loaded data DOES update data store', async () => {
      // Initial save
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [],
          data: [{ a: 1 }],
        },
      ]);

      // Save with new data
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [],
          data: [{ a: 1 }, { a: 2 }, { a: 3 }],
        },
      ]);

      const data = await loadSourceData('src_1');
      expect(data).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
    });

    it('multiple saves with mixed null/loaded data never loses rows', async () => {
      const originalData = [{ v: 1 }, { v: 2 }, { v: 3 }];

      // Save with real data
      await saveSources([{ id: 'src_1', name: 'S', columns: [], data: originalData }]);

      // Save again with null (metadata-only update)
      await saveSources([{ id: 'src_1', name: 'S renamed', columns: [], data: null }]);

      // Save again with null (another metadata-only update)
      await saveSources([{ id: 'src_1', name: 'S renamed again', columns: [], data: null }]);

      // Data must still be intact
      const data = await loadSourceData('src_1');
      expect(data).toEqual(originalData);
    });
  });

  // ──────────────────────────────────────────────
  // Orphan cleanup
  // ──────────────────────────────────────────────

  describe('orphan data cleanup', () => {
    it('removes data entry when source is deleted', async () => {
      await saveSources([
        { id: 'src_1', name: 'Keep', columns: [], data: [{ a: 1 }] },
        { id: 'src_2', name: 'Delete', columns: [], data: [{ b: 2 }] },
      ]);

      // Delete src_2 by saving without it
      await saveSources([{ id: 'src_1', name: 'Keep', columns: [], data: null }]);

      const keys = await rawGetAllKeys('source-data');
      expect(keys).toEqual(['src_1']);
      expect(await loadSourceData('src_2')).toBeNull();
    });

    it('removes data entry when model is deleted', async () => {
      await saveModels([
        { id: 'mdl_1', name: 'Keep', schema: [], steps: [], data: [{ x: 1 }] },
        { id: 'mdl_2', name: 'Delete', schema: [], steps: [], data: [{ y: 2 }] },
      ]);

      await saveModels([{ id: 'mdl_1', name: 'Keep', schema: [], steps: [], data: null }]);

      const keys = await rawGetAllKeys('model-data');
      expect(keys).toEqual(['mdl_1']);
      expect(await loadModelData('mdl_2')).toBeNull();
    });

    it('clearAllData removes all four stores', async () => {
      await saveSources([{ id: 'src_1', name: 'S', columns: [], data: [{ a: 1 }] }]);
      await saveModels([{ id: 'mdl_1', name: 'M', schema: [], steps: [], data: [{ x: 1 }] }]);

      await clearAllData();

      expect(await rawGetAllKeys('sources')).toEqual([]);
      expect(await rawGetAllKeys('models')).toEqual([]);
      expect(await rawGetAllKeys('source-data')).toEqual([]);
      expect(await rawGetAllKeys('model-data')).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // Lazy loading (ensure* functions)
  // ──────────────────────────────────────────────

  describe('ensureSourceData', () => {
    it('loads data from IndexedDB when data is null', async () => {
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [{ name: 'name', type: 'string' }],
          data: [{ name: 'Alice' }, { name: 'Bob' }],
        },
      ]);

      // Simulate app startup: metadata loaded, data is null
      const source = { id: 'src_1', data: null } as any;
      const data = await ensureSourceData(source);

      expect(data).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
      expect(source.data).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
    });

    it('returns existing data immediately when already loaded', async () => {
      const existingData = [{ name: 'Carol' }];
      const source = { id: 'src_1', data: existingData } as any;

      const data = await ensureSourceData(source);

      expect(data).toBe(existingData); // Same reference, no IDB call
    });

    it('sets empty array when no data exists in store', async () => {
      // No data was ever saved for this source
      const source = { id: 'src_nonexistent', data: null } as any;
      const data = await ensureSourceData(source);

      expect(data).toEqual([]);
      expect(source.data).toEqual([]);
    });

    it('handles undefined data the same as null', async () => {
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [],
          data: [{ a: 1 }],
        },
      ]);

      const source = { id: 'src_1', data: undefined } as any;
      const data = await ensureSourceData(source);

      expect(data).toEqual([{ a: 1 }]);
    });
  });

  describe('ensureModelData', () => {
    it('loads data from IndexedDB when data is null', async () => {
      await saveModels([
        {
          id: 'mdl_1',
          name: 'Model',
          schema: [],
          steps: [],
          data: [{ x: 10 }, { x: 20 }],
        },
      ]);

      const model = { id: 'mdl_1', data: null } as any;
      const data = await ensureModelData(model);

      expect(data).toEqual([{ x: 10 }, { x: 20 }]);
      expect(model.data).toEqual([{ x: 10 }, { x: 20 }]);
    });

    it('returns existing data immediately when already loaded', async () => {
      const existingData = [{ x: 99 }];
      const model = { id: 'mdl_1', data: existingData } as any;

      const data = await ensureModelData(model);

      expect(data).toBe(existingData);
    });
  });

  // ──────────────────────────────────────────────
  // Full round-trip: save → load metadata → ensure data
  // ──────────────────────────────────────────────

  describe('full round-trip', () => {
    it('source: save → load (null data) → ensure → verify data intact', async () => {
      const originalData = [
        { name: 'Alice', age: 30, city: 'Boston' },
        { name: 'Bob', age: 25, city: 'Austin' },
        { name: 'Carol', age: 35, city: 'Seattle' },
      ];

      await saveSources([
        {
          id: 'src_1',
          name: 'People',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'age', type: 'integer' },
            { name: 'city', type: 'string' },
          ],
          data: originalData,
        },
      ]);

      // Load metadata (simulates app startup)
      const sources = await loadSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].data).toBeNull(); // Not loaded yet
      expect(sources[0].name).toBe('People');

      // Lazy-load data (simulates user clicking on source)
      const data = await ensureSourceData(sources[0]);
      expect(data).toEqual(originalData);
      expect(sources[0].data).toEqual(originalData);
    });

    it('model: save → load (null data) → ensure → verify data intact', async () => {
      const originalData = [{ result: 42, label: 'answer' }];

      await saveModels([
        {
          id: 'mdl_1',
          name: 'Answers',
          schema: [
            { name: 'result', type: 'integer' },
            { name: 'label', type: 'string' },
          ],
          steps: [{ import: {} }],
          data: originalData,
        },
      ]);

      const models = await loadModels();
      expect(models[0].data).toBeNull();

      const data = await ensureModelData(models[0]);
      expect(data).toEqual(originalData);
    });

    it('save with data → save with null → load → ensure → data still intact', async () => {
      const originalData = [{ key: 'important', value: 999 }];

      // Initial save with data
      await saveSources([
        {
          id: 'src_1',
          name: 'Critical Data',
          columns: [],
          data: originalData,
        },
      ]);

      // Subsequent save with null (metadata-only update, data not in memory)
      await saveSources([
        {
          id: 'src_1',
          name: 'Critical Data (updated name)',
          columns: [],
          data: null,
        },
      ]);

      // Full round-trip
      const sources = await loadSources();
      expect(sources[0].name).toBe('Critical Data (updated name)');
      expect(sources[0].data).toBeNull();

      const data = await ensureSourceData(sources[0]);
      expect(data).toEqual(originalData);
    });

    it('rowCount and colCount are accurate after save with loaded data', async () => {
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
          data: [
            { a: 1, b: 2, c: 3 },
            { a: 4, b: 5, c: 6 },
          ],
        },
      ]);

      const meta = await rawGet('sources', 'src_1');
      expect(meta.rowCount).toBe(2);
      expect(meta.colCount).toBe(3);
      expect(meta.data).toBeUndefined(); // data stripped from metadata
    });
  });

  // ──────────────────────────────────────────────
  // Edge cases that could cause data loss
  // ──────────────────────────────────────────────

  describe('data loss edge cases', () => {
    it('saving empty data array DOES update the data store (intentional clear)', async () => {
      // Save with real data first
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [],
          data: [{ a: 1 }],
        },
      ]);

      // Explicitly save with empty array (user cleared the data)
      await saveSources([
        {
          id: 'src_1',
          name: 'Source',
          columns: [],
          data: [],
        },
      ]);

      const data = await loadSourceData('src_1');
      expect(data).toEqual([]); // Empty is intentional, not loss
    });

    it('new source added alongside existing unloaded source preserves both', async () => {
      // Save initial source
      await saveSources([
        {
          id: 'src_1',
          name: 'Existing',
          columns: [],
          data: [{ a: 1 }],
        },
      ]);

      // Add new source while existing has null data (unloaded)
      await saveSources([
        { id: 'src_1', name: 'Existing', columns: [], data: null },
        { id: 'src_2', name: 'New', columns: [], data: [{ b: 2 }] },
      ]);

      // Both should have their data
      expect(await loadSourceData('src_1')).toEqual([{ a: 1 }]);
      expect(await loadSourceData('src_2')).toEqual([{ b: 2 }]);
    });

    it('v2 database object stores are created on fresh install', async () => {
      const db = await openDatabase();

      expect(db.objectStoreNames.contains('sources')).toBe(true);
      expect(db.objectStoreNames.contains('models')).toBe(true);
      expect(db.objectStoreNames.contains('source-data')).toBe(true);
      expect(db.objectStoreNames.contains('model-data')).toBe(true);

      db.close();
    });

    it('metadata load sets data to null, not undefined', async () => {
      await saveSources([{ id: 'src_1', name: 'S', columns: [], data: [{ a: 1 }] }]);
      await saveModels([{ id: 'mdl_1', name: 'M', schema: [], steps: [], data: [{ x: 1 }] }]);

      const sources = await loadSources();
      const models = await loadModels();

      // Must be null (not undefined) so ensure* functions detect "not loaded"
      expect(sources[0].data).toBeNull();
      expect(models[0].data).toBeNull();
    });
  });
});
