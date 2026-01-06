/**
 * Chumak Storage Layer - IndexedDB Persistence
 */

const DB_NAME = 'chumak-db';
const DB_VERSION = 1;

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
 */
export async function loadInitialData(): Promise<{ sources: any[]; models: any[] }> {
  try {
    const [sources, models] = await Promise.all([loadSources(), loadModels()]);
    console.log('Loaded from IndexedDB:', sources.length, 'sources,', models.length, 'models');
    return { sources, models };
  } catch (error) {
    console.error('Failed to load initial data:', error);
    return { sources: [], models: [] };
  }
}
