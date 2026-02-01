/**
 * Syto Metrics - IndexedDB Storage
 *
 * Separate database for metrics to avoid bumping main syto-db version.
 */

import { TransformMetric, MetricsConfig, DEFAULT_METRICS_CONFIG } from './types';

const METRICS_DB_NAME = 'syto-metrics';
const METRICS_DB_VERSION = 1;
const STORE_NAME = 'transforms';
const CONFIG_KEY = 'syto-metrics-config';

// In-memory cache for fast access
let metricsCache: TransformMetric[] | null = null;
let configCache: MetricsConfig | null = null;

/**
 * Open/create the metrics IndexedDB database
 */
function openMetricsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(METRICS_DB_NAME, METRICS_DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open metrics database: ' + request.error));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Indices for querying
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('transformType', 'transformType', { unique: false });
      }

      console.log('Metrics database created/upgraded to version', METRICS_DB_VERSION);
    };
  });
}

/**
 * Load all metrics from IndexedDB
 */
export async function loadMetrics(): Promise<TransformMetric[]> {
  if (metricsCache !== null) {
    return metricsCache;
  }

  const db = await openMetricsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      metricsCache = request.result || [];
      // Sort by timestamp descending (newest first)
      metricsCache.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      resolve(metricsCache);
    };

    request.onerror = () => {
      db.close();
      reject(new Error('Failed to load metrics: ' + request.error));
    };
  });
}

/**
 * Add a single metric record
 */
export async function addMetric(metric: TransformMetric): Promise<void> {
  const db = await openMetricsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.add(metric);

    transaction.oncomplete = () => {
      db.close();
      // Update cache
      if (metricsCache !== null) {
        metricsCache.unshift(metric); // Add to front (newest first)
      }
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to add metric: ' + transaction.error));
    };
  });
}

/**
 * Delete oldest metrics beyond the retention limit
 */
export async function enforceRetention(maxRecords: number): Promise<number> {
  const metrics = await loadMetrics();

  if (metrics.length <= maxRecords) {
    return 0;
  }

  // Get IDs to delete (oldest ones, which are at the end since sorted newest-first)
  const toDelete = metrics.slice(maxRecords).map((m) => m.id);

  if (toDelete.length === 0) {
    return 0;
  }

  const db = await openMetricsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const id of toDelete) {
      store.delete(id);
    }

    transaction.oncomplete = () => {
      db.close();
      // Update cache
      if (metricsCache !== null) {
        metricsCache = metricsCache.slice(0, maxRecords);
      }
      resolve(toDelete.length);
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to enforce retention: ' + transaction.error));
    };
  });
}

/**
 * Clear all metrics
 */
export async function clearMetrics(): Promise<void> {
  const db = await openMetricsDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    transaction.oncomplete = () => {
      db.close();
      metricsCache = [];
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error('Failed to clear metrics: ' + transaction.error));
    };
  });
}

/**
 * Get metrics count
 */
export async function getMetricsCount(): Promise<number> {
  const metrics = await loadMetrics();
  return metrics.length;
}

// --- Configuration ---

/**
 * Load metrics configuration from localStorage
 */
export function loadMetricsConfig(): MetricsConfig {
  if (configCache !== null) {
    return configCache;
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const config: MetricsConfig = {
        ...DEFAULT_METRICS_CONFIG,
        ...parsed,
      };
      configCache = config;
      return config;
    }
  } catch (error) {
    console.error('Failed to load metrics config:', error);
  }

  const defaultConfig = { ...DEFAULT_METRICS_CONFIG };
  configCache = defaultConfig;
  return defaultConfig;
}

/**
 * Save metrics configuration to localStorage
 */
export function saveMetricsConfig(config: MetricsConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    configCache = config;
  } catch (error) {
    console.error('Failed to save metrics config:', error);
  }
}

/**
 * Update a specific config option
 */
export function updateMetricsConfig(updates: Partial<MetricsConfig>): MetricsConfig {
  const current = loadMetricsConfig();
  const updated = { ...current, ...updates };
  saveMetricsConfig(updated);
  return updated;
}

/**
 * Invalidate the in-memory caches (useful for testing or manual refresh)
 */
export function invalidateMetricsCache(): void {
  metricsCache = null;
  configCache = null;
}
