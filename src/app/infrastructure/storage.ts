/**
 * Syto Storage Layer - IndexedDB Persistence
 */

import { SchemaEngine } from '../../core/schema-engine';

const DB_NAME = 'syto-db';
const DB_VERSION = 1;

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
 * Open/create the IndexedDB database
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

      if (!db.objectStoreNames.contains('sources')) {
        db.createObjectStore('sources', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'id' });
      }

      console.log('Database upgraded to version', DB_VERSION);
    };
  });
}

/**
 * Save all sources to IndexedDB
 */
export async function saveSources(sources: any[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sources'], 'readwrite');
    const store = transaction.objectStore('sources');

    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      sources.forEach((source) => {
        // Convert Date objects to YYYY-MM-DD strings before serialization
        const converted = convertDatesForStorage(source);
        const cleanSource = JSON.parse(JSON.stringify(converted));
        store.put(cleanSource);
      });
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
 * Load all sources from IndexedDB
 */
export async function loadSources(): Promise<any[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sources'], 'readonly');
    const store = transaction.objectStore('sources');
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load sources: ' + request.error));
    };
  });
}

/**
 * Save all models to IndexedDB
 */
export async function saveModels(models: any[]): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');

    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      models.forEach((model) => {
        // Convert Date objects to YYYY-MM-DD strings before serialization
        const converted = convertDatesForStorage(model);
        const cleanModel = JSON.parse(JSON.stringify(converted));
        store.put(cleanModel);
      });
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

/**
 * Load all models from IndexedDB
 */
export async function loadModels(): Promise<any[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readonly');
    const store = transaction.objectStore('models');
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load models: ' + request.error));
    };
  });
}

/**
 * Auto-save current state
 */
export async function autoSave(sources: any[], models: any[]): Promise<void> {
  const start = performance.now();
  try {
    await saveSources(sources);
    await saveModels(models);
    console.log('Auto-saved:', sources.length, 'sources,', models.length, 'models');
    console.log(`⚡ Save to IndexedDB — ${(performance.now() - start).toFixed(1)}ms`);
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
    const transaction = db.transaction(['sources', 'models'], 'readwrite');

    transaction.objectStore('sources').clear();
    transaction.objectStore('models').clear();

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
 * Normalizes schemas to handle unknown types gracefully (future-proofing)
 */
export async function loadInitialData(): Promise<{ sources: any[]; models: any[] }> {
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

    console.log(
      'Loaded from IndexedDB:',
      normalizedSources.length,
      'sources,',
      normalizedModels.length,
      'models'
    );
    return { sources: normalizedSources, models: normalizedModels };
  } catch (error) {
    console.error('Failed to load initial data:', error);
    return { sources: [], models: [] };
  }
}
