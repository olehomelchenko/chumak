/**
 * Chumak Storage Layer - IndexedDB Persistence
 *
 * Phase 0: Minimal implementation for architecture validation
 * - Simple save/load for sources and models
 * - No debouncing (save immediately)
 * - No step snapshots (deferred to Phase 1)
 *
 * TODO (Phase 1): Refactor to separate data from metadata
 * Currently: sources and models embed data directly (inefficient, duplicates data)
 * Spec: Use separate 'sourceData' object store, models reference via sourceId
 * Impact: 2x memory usage, serialization overhead, won't scale to large files
 * Acceptable for Phase 0 (validates architecture), must fix in Phase 1
 */

const DB_NAME = 'chumak-db';
const DB_VERSION = 1;

/**
 * Open/create the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database: ' + request.error));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
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
 * @param {Array} sources - Array of source objects
 * @returns {Promise<void>}
 */
async function saveSources(sources) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sources'], 'readwrite');
    const store = transaction.objectStore('sources');

    // Clear existing sources first
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      // Add all sources (with defensive cloning to ensure serializability)
      sources.forEach(source => {
        // Deep clone to remove any non-serializable properties
        const cleanSource = JSON.parse(JSON.stringify(source));
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
 * @returns {Promise<Array>}
 */
async function loadSources() {
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
 * @param {Array} models - Array of model objects
 * @returns {Promise<void>}
 */
async function saveModels(models) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['models'], 'readwrite');
    const store = transaction.objectStore('models');

    // Clear existing models first
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      // Add all models (with defensive cloning to ensure serializability)
      models.forEach(model => {
        // Deep clone to remove any non-serializable properties
        const cleanModel = JSON.parse(JSON.stringify(model));
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
 * @returns {Promise<Array>}
 */
async function loadModels() {
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
 * Auto-save current state (sources + models)
 * Phase 0: No debouncing - save immediately
 * @param {Array} sources
 * @param {Array} models
 * @returns {Promise<void>}
 */
async function autoSave(sources, models) {
  const start = performance.now();
  try {
    await saveSources(sources);
    await saveModels(models);
    console.log('Auto-saved:', sources.length, 'sources,', models.length, 'models');
    console.log(`⚡ Save to IndexedDB — ${(performance.now() - start).toFixed(1)}ms`);
  } catch (error) {
    console.error('Auto-save failed:', error);
    // Don't throw - auto-save failures shouldn't break the app
  }
}

/**
 * Clear all data from IndexedDB (for debugging)
 * @returns {Promise<void>}
 */
async function clearAllData() {
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
 * @returns {Promise<{sources: Array, models: Array}>}
 */
async function loadInitialData() {
  try {
    const [sources, models] = await Promise.all([
      loadSources(),
      loadModels()
    ]);

    console.log('Loaded from IndexedDB:', sources.length, 'sources,', models.length, 'models');

    return { sources, models };
  } catch (error) {
    console.error('Failed to load initial data:', error);
    return { sources: [], models: [] };
  }
}
