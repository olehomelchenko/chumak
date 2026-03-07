import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as aq from 'arquero';
import { getDataShape, DEFAULT_METRICS_CONFIG } from './index';
import type { TransformMetric, MetricShape, MetricsConfig } from './types';

describe('Metrics Module', () => {
  describe('getDataShape', () => {
    it('returns zeros for null/undefined data', () => {
      expect(getDataShape(null)).toEqual({ rows: 0, cols: 0 });
      expect(getDataShape(undefined)).toEqual({ rows: 0, cols: 0 });
    });

    it('returns correct shape for Arquero table', () => {
      const table = aq.from([
        { a: 1, b: 2, c: 3 },
        { a: 4, b: 5, c: 6 },
      ]);
      const shape = getDataShape(table);
      expect(shape.rows).toBe(2);
      expect(shape.cols).toBe(3);
    });

    it('returns correct shape for array of objects', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];
      const shape = getDataShape(data);
      expect(shape.rows).toBe(3);
      expect(shape.cols).toBe(2);
    });

    it('handles empty array', () => {
      const shape = getDataShape([]);
      expect(shape.rows).toBe(0);
      expect(shape.cols).toBe(0);
    });

    it('handles array with empty objects', () => {
      const shape = getDataShape([{}]);
      expect(shape.rows).toBe(1);
      expect(shape.cols).toBe(0);
    });
  });

  describe('DEFAULT_METRICS_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_METRICS_CONFIG.enabled).toBe(true);
      expect(DEFAULT_METRICS_CONFIG.maxRecords).toBe(10000);
      expect(DEFAULT_METRICS_CONFIG.consoleLogging).toBe(true);
    });
  });
});

describe('MetricShape type', () => {
  it('can be used to structure shape data', () => {
    const shape: MetricShape = {
      inputRows: 100,
      inputCols: 5,
      outputRows: 50,
      outputCols: 6,
      rowDelta: -50,
      colDelta: 1,
      rowsPerMs: 10,
    };

    expect(shape.inputRows).toBe(100);
    expect(shape.rowDelta).toBe(-50);
    expect(shape.rowsPerMs).toBe(10);
  });
});

describe('TransformMetric type', () => {
  it('can be used to structure metric records', () => {
    const metric: TransformMetric = {
      id: 'test-id',
      timestamp: '2024-01-15T10:30:00.000Z',
      transformType: 'filter',
      durationMs: 45.5,
      success: true,
      shape: JSON.stringify({ inputRows: 100, inputCols: 5 }),
      metadata: null,
    };

    expect(metric.transformType).toBe('filter');
    expect(metric.success).toBe(true);
    expect(JSON.parse(metric.shape).inputRows).toBe(100);
  });
});

describe('Metrics Config localStorage', () => {
  let store: Record<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(async () => {
    // Create a fresh mock localStorage for each test
    store = {};
    originalLocalStorage = globalThis.localStorage;

    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          Object.keys(store).forEach((key) => delete store[key]);
        }),
      },
      writable: true,
    });

    // Clear the module cache to ensure fresh state
    const { invalidateMetricsCache } = await import('./metrics-storage');
    invalidateMetricsCache();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('loads default config when no stored config exists', async () => {
    const { loadMetricsConfig, invalidateMetricsCache } = await import('./metrics-storage');
    invalidateMetricsCache();

    const config = loadMetricsConfig();
    expect(config.enabled).toBe(true);
    expect(config.maxRecords).toBe(10000);
    expect(config.consoleLogging).toBe(true);
  });

  it('saves and loads custom config', async () => {
    const { saveMetricsConfig, loadMetricsConfig, invalidateMetricsCache } =
      await import('./metrics-storage');
    invalidateMetricsCache();

    const customConfig: MetricsConfig = {
      enabled: false,
      maxRecords: 5000,
      consoleLogging: false,
    };

    saveMetricsConfig(customConfig);
    invalidateMetricsCache(); // Clear cache to force reload

    const loaded = loadMetricsConfig();
    expect(loaded.enabled).toBe(false);
    expect(loaded.maxRecords).toBe(5000);
    expect(loaded.consoleLogging).toBe(false);
  });

  it('updates specific config options', async () => {
    const { updateMetricsConfig, loadMetricsConfig, invalidateMetricsCache } =
      await import('./metrics-storage');
    // Ensure we start fresh
    store = {};
    invalidateMetricsCache();

    // Start with defaults (nothing in localStorage)
    const initial = loadMetricsConfig();
    expect(initial.enabled).toBe(true);

    // Update just enabled
    updateMetricsConfig({ enabled: false });
    invalidateMetricsCache();

    const updated = loadMetricsConfig();
    expect(updated.enabled).toBe(false);
    expect(updated.consoleLogging).toBe(true); // Should remain unchanged
  });
});
