/**
 * Syto Storage Layer - IndexedDB Persistence
 *
 * V2 schema: data arrays are stored in separate object stores (`source-data`, `model-data`)
 * so that metadata loads fast and row data is loaded lazily per source/model.
 */

import { SchemaEngine } from '../../core/schema-engine';
import { validateSteps } from '../linters/transform-linter';
import { metricsCollector } from './metrics';

const DB_NAME = 'syto-db';
const DB_VERSION = 2;

/**
 * Deep clone an object while converting Date objects to local date strings (YYYY-MM-DD).
 * This ensures dates are serialized without timezone conversion issues.
 *
 * Why not use JSON replacer? Date objects have a toJSON() method that is called BEFORE
 * the replacer function, converting to UTC ISO strings. We must convert dates before
 * JSON.stringify sees them.
 */
export function convertDatesForStorage(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    // Always serialize dates as YYYY-MM-DD (local date, no timezone conversion)
    return `${obj.getFullYear()}-${pad(obj.getMonth() + 1)}-${pad(obj.getDate())}`;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => convertDatesForStorage(item));
  }

  // Handle plain objects
  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = convertDatesForStorage(obj[key]);
      }
    }
    return result;
  }

  // Return primitives and other types as-is
  return obj;
}

/**
 * Open/create the IndexedDB database.
 * Handles v1→v2 migration: moves .data from source/model records into separate stores.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database: ' + request.error));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      const transaction = event.target.transaction;

      // Create stores that don't exist yet
      if (!db.objectStoreNames.contains('sources')) {
        db.createObjectStore('sources', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('source-data')) {
        db.createObjectStore('source-data', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('model-data')) {
        db.createObjectStore('model-data', { keyPath: 'id' });
      }

      // Migrate v1→v2: extract .data from existing records
      if (event.oldVersion < 2) {
        migrateV1ToV2(transaction);
      }

      console.log('Database upgraded to version', DB_VERSION);
    };
  });
}

/**
 * V1→V2 migration: extract .data from source/model records into separate stores.
 * Runs inside the onupgradeneeded transaction.
 */
function migrateV1ToV2(transaction: IDBTransaction): void {
  // Migrate sources
  const sourceStore = transaction.objectStore('sources');
  const sourceDataStore = transaction.objectStore('source-data');
  const sourceRequest = sourceStore.getAll();

  sourceRequest.onsuccess = () => {
    const sources = sourceRequest.result || [];
    for (const source of sources) {
      if (source.data && Array.isArray(source.data)) {
        // Save data to separate store
        sourceDataStore.put({ id: source.id, data: source.data });
        // Update metadata with row/col counts, remove data
        source.rowCount = source.data.length;
        source.colCount = source.columns?.length ?? 0;
        delete source.data;
        sourceStore.put(source);
      }
    }
  };

  // Migrate models
  const modelStore = transaction.objectStore('models');
  const modelDataStore = transaction.objectStore('model-data');
  const modelRequest = modelStore.getAll();

  modelRequest.onsuccess = () => {
    const models = modelRequest.result || [];
    for (const model of models) {
      if (model.data && Array.isArray(model.data)) {
        // Save data to separate store
        modelDataStore.put({ id: model.id, data: model.data });
        // Update metadata with row/col counts, remove data
        model.rowCount = model.data.length;
        model.colCount = model.schema?.length ?? 0;
        delete model.data;
        modelStore.put(model);
      }
    }
  };
}

// ─── Save Functions ───

/**
 * Save all sources to IndexedDB (metadata only, data saved separately)
 */
export async function saveSources(sources: any[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sources', 'source-data'], 'readwrite');
    const metaStore = transaction.objectStore('sources');
    const dataStore = transaction.objectStore('source-data');

    const clearMeta = metaStore.clear();

    clearMeta.onsuccess = () => {
      const currentIds = new Set(sources.map((s) => s.id));

      sources.forEach((source) => {
        const converted = convertDatesForStorage(source);
        const clean = JSON.parse(JSON.stringify(converted));

        // Separate data from metadata
        const data = clean.data;
        delete clean.data;

        // Only update data store for sources with loaded data
        if (data && Array.isArray(data)) {
          clean.rowCount = data.length;
          clean.colCount = clean.columns?.length ?? 0;
          dataStore.put({ id: clean.id, data });
        }
        // If data is null (not loaded), preserve existing data store entry and counts

        metaStore.put(clean);
      });

      // Remove data entries for deleted sources
      const cursorReq = dataStore.openKeyCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          if (!currentIds.has(cursor.key as string)) {
            dataStore.delete(cursor.key);
          }
          cursor.continue();
        }
      };
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to save sources: ' + transaction.error));
    };
  });
}

/**
 * Save all models to IndexedDB (metadata only, data saved separately)
 */
export async function saveModels(models: any[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models', 'model-data'], 'readwrite');
    const metaStore = transaction.objectStore('models');
    const dataStore = transaction.objectStore('model-data');

    const clearMeta = metaStore.clear();

    clearMeta.onsuccess = () => {
      const currentIds = new Set(models.map((m) => m.id));

      models.forEach((model) => {
        const converted = convertDatesForStorage(model);
        const clean = JSON.parse(JSON.stringify(converted));

        // Separate data from metadata
        const data = clean.data;
        delete clean.data;

        // Only update data store for models with loaded data
        if (data && Array.isArray(data)) {
          clean.rowCount = data.length;
          clean.colCount = clean.schema?.length ?? 0;
          dataStore.put({ id: clean.id, data });
        }

        metaStore.put(clean);
      });

      // Remove data entries for deleted models
      const cursorReq = dataStore.openKeyCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          if (!currentIds.has(cursor.key as string)) {
            dataStore.delete(cursor.key);
          }
          cursor.continue();
        }
      };
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to save models: ' + transaction.error));
    };
  });
}

// ─── Load Functions ───

/**
 * Load all source metadata from IndexedDB (no row data)
 */
export async function loadSources(): Promise<any[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sources'], 'readonly');
    const store = transaction.objectStore('sources');
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      // Sources come back without .data — set to null to indicate "not loaded"
      const sources = request.result || [];
      for (const source of sources) {
        if (source.data === undefined) {
          source.data = null;
        }
      }
      resolve(sources);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load sources: ' + request.error));
    };
  });
}

/**
 * Load all model metadata from IndexedDB (no row data)
 */
export async function loadModels(): Promise<any[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      const models = request.result || [];
      for (const model of models) {
        if (model.data === undefined) {
          model.data = null;
        }
      }
      resolve(models);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load models: ' + request.error));
    };
  });
}

/**
 * Load row data for a specific source
 */
export async function loadSourceData(sourceId: string): Promise<any[] | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['source-data'], 'readonly');
    const store = transaction.objectStore('source-data');
    const request = store.get(sourceId);

    request.onsuccess = () => {
      db.close();
      resolve(request.result?.data ?? null);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load source data: ' + request.error));
    };
  });
}

/**
 * Load row data for a specific model
 */
export async function loadModelData(modelId: string): Promise<any[] | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['model-data'], 'readonly');
    const store = transaction.objectStore('model-data');
    const request = store.get(modelId);

    request.onsuccess = () => {
      db.close();
      resolve(request.result?.data ?? null);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load model data: ' + request.error));
    };
  });
}

/**
 * Ensure a source's data is loaded. Returns the data array.
 * If already loaded, returns immediately. Otherwise loads from IndexedDB.
 */
export async function ensureSourceData(source: any): Promise<any[]> {
  if (source.data !== null && source.data !== undefined) {
    return source.data;
  }
  const data = await loadSourceData(source.id);
  source.data = data || [];
  return source.data;
}

/**
 * Ensure a model's data is loaded. Returns the data array.
 * If already loaded, returns immediately. Otherwise loads from IndexedDB.
 */
export async function ensureModelData(model: any): Promise<any[]> {
  if (model.data !== null && model.data !== undefined) {
    return model.data;
  }
  const data = await loadModelData(model.id);
  model.data = data || [];
  return model.data;
}

// ─── Auto-save & Clear ───

/**
 * Auto-save current state
 */
export async function autoSave(sources: any[], models: any[]): Promise<void> {
  try {
    await metricsCollector.time('storage:save', async () => {
      await saveSources(sources);
      await saveModels(models);
    });
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
}

/**
 * Clear all data from IndexedDB
 */
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ['sources', 'models', 'source-data', 'model-data'],
      'readwrite'
    );

    transaction.objectStore('sources').clear();
    transaction.objectStore('models').clear();
    transaction.objectStore('source-data').clear();
    transaction.objectStore('model-data').clear();

    transaction.oncomplete = () => {
      db.close();
      console.log('All data cleared from IndexedDB');
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to clear data: ' + transaction.error));
    };
  });
}

/**
 * Load initial data on app startup
 * Loads metadata only (no row data) — data is loaded lazily per source/model.
 * Normalizes schemas to handle unknown types gracefully (future-proofing)
 * Validates model steps and returns warnings for invalid pipelines
 */
export async function loadInitialData(): Promise<{
  sources: any[];
  models: any[];
  validationWarnings: string[];
}> {
  const loadStart = performance.now();
  try {
    const [sources, models] = await Promise.all([loadSources(), loadModels()]);

    // Normalize schemas to handle unknown types (future-proofing)
    const normalizedSources = sources.map((source) => {
      if (source.columns && Array.isArray(source.columns)) {
        return { ...source, columns: SchemaEngine.normalizeSchema(source.columns) };
      }
      return source;
    });

    const normalizedModels = models.map((model) => {
      if (model.schema && Array.isArray(model.schema)) {
        return { ...model, schema: SchemaEngine.normalizeSchema(model.schema) };
      }
      return model;
    });

    // Validate model steps
    const validationWarnings: string[] = [];
    for (const model of normalizedModels) {
      if (model.steps && Array.isArray(model.steps) && model.steps.length > 0) {
        const stepWarnings = validateSteps(model.steps);
        if (stepWarnings.length > 0) {
          validationWarnings.push(...stepWarnings.map((w) => `${model.name || model.id}: ${w}`));
        }
      }
    }

    if (validationWarnings.length > 0) {
      console.warn('Workflow validation warnings:', validationWarnings);
    }

    metricsCollector.record({
      transformType: 'storage:load',
      durationMs: performance.now() - loadStart,
      success: true,
    });
    return { sources: normalizedSources, models: normalizedModels, validationWarnings };
  } catch (error) {
    console.error('Failed to load initial data:', error);
    return { sources: [], models: [], validationWarnings: [] };
  }
}
