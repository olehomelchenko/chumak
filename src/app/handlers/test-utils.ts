/**
 * Handler Testing Utilities
 *
 * Provides common setup, teardown, and factory functions for testing handlers.
 * Use these utilities to reduce boilerplate and ensure consistent test patterns.
 */

import { vi, expect } from 'vitest';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import type { DataRow, Source, Model } from '../types';
import type { ColumnSchema, ColumnType } from '../../core/schema-engine';
import type { StepCallbacks } from './core/step-handlers';
import type { ExecutionCallbacks } from '../services/StepService';

/**
 * Standard test data for handler tests
 */
export const TestData = {
  /** Simple 3-column, 3-row dataset for basic tests */
  simple: {
    columns: ['name', 'age', 'city'],
    rows: [
      { name: 'Alice', age: 30, city: 'Boston' },
      { name: 'Bob', age: 25, city: 'Austin' },
      { name: 'Carol', age: 35, city: 'Seattle' },
    ] as DataRow[],
  },

  /** Dataset with null values for edge case testing */
  withNulls: {
    columns: ['name', 'value', 'optional'],
    rows: [
      { name: 'Alice', value: 100, optional: 'yes' },
      { name: 'Bob', value: null, optional: null },
      { name: 'Carol', value: 200, optional: 'no' },
    ] as DataRow[],
  },

  /** Numeric dataset for aggregation testing */
  numeric: {
    columns: ['category', 'amount', 'quantity'],
    rows: [
      { category: 'A', amount: 100, quantity: 10 },
      { category: 'A', amount: 200, quantity: 20 },
      { category: 'B', amount: 150, quantity: 15 },
      { category: 'B', amount: 250, quantity: 25 },
      { category: 'C', amount: 300, quantity: 30 },
    ] as DataRow[],
  },

  /** Large dataset for pagination/limit testing */
  large: (count: number) => ({
    columns: ['id', 'value'],
    rows: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      value: `Value ${i + 1}`,
    })) as DataRow[],
  }),

  /** Dataset with various types */
  mixed: {
    columns: ['string', 'number', 'boolean', 'date'],
    rows: [
      { string: 'text', number: 42, boolean: true, date: new Date(2024, 0, 15) },
      { string: 'more', number: 3.14, boolean: false, date: new Date(2024, 5, 20) },
    ] as DataRow[],
  },

  /** Two datasets for join testing */
  joinPair: {
    left: {
      columns: ['id', 'name', 'department'],
      rows: [
        { id: 1, name: 'Alice', department: 'Engineering' },
        { id: 2, name: 'Bob', department: 'Sales' },
        { id: 3, name: 'Carol', department: 'Engineering' },
      ] as DataRow[],
    },
    right: {
      columns: ['employee_id', 'salary', 'bonus'],
      rows: [
        { employee_id: 1, salary: 80000, bonus: 5000 },
        { employee_id: 2, salary: 60000, bonus: 3000 },
        { employee_id: 4, salary: 90000, bonus: 7000 },
      ] as DataRow[],
    },
  },
};

/**
 * Default UX settings for tests
 */
export const defaultUxSettings = {
  theme: 'syto' as const,
  preview: {
    rowLimit: 10,
  },
  pagination: {
    pageSize: 500,
  },
  analyticsOptOut: false,
  language: 'en' as const,
};

/**
 * Reset all stores and set up common test state.
 * Call this in beforeEach().
 */
export function resetStores() {
  AppStore.reset();
  DialogStore.resetAll();
  AppStore.uxSettings.value = { ...defaultUxSettings };
}

/**
 * Set up test data in AppStore.
 * Call this after resetStores() with the data you need.
 */
export function setTestData(data: { columns: string[]; rows: DataRow[] }) {
  AppStore.columns.value = data.columns;
  AppStore.currentData.value = data.rows;
}

/**
 * Suppress console output during tests.
 * Returns cleanup functions to restore them.
 */
export function suppressConsole() {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  return { errorSpy, warnSpy };
}

/**
 * Create a mock app object with common methods mocked.
 * Use for tests that need dialog/notification mocks.
 */
export function createMockApp(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    // Dialog methods
    alert: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue(true),
    prompt: vi.fn().mockResolvedValue('test'),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    activeDialog: null,

    // Data access (proxied from AppStore)
    get columns() {
      return AppStore.columns.value;
    },
    get currentData() {
      return AppStore.currentData.value;
    },

    // File handling
    importFileData: null,
    importDialogState: {
      fileName: '',
      sourceName: '',
      rawPreviewData: [],
      previewHeaders: [],
      previewDataRows: [],
      headerMode: 'first-row' as const,
      delimiter: ',',
      originalHeaders: [],
      customHeaders: [],
      duplicateWarning: '',
      isJson: false,
      jsonData: null,
    },

    // Override with provided values
    ...overrides,
  };
}

/**
 * Wait for debounced operations to complete.
 * Use with vi.useFakeTimers().
 */
export function advanceDebounce(ms = 150) {
  vi.advanceTimersByTime(ms);
}

/**
 * Assert preview state matches expected values.
 */
export function expectPreviewState(expected: {
  title?: string;
  stats?: string;
  columns?: string[];
  newColumns?: string[];
  rowCount?: number;
}) {
  const { previewState } = DialogStore;

  if (expected.title !== undefined) {
    expect(previewState.title.value).toBe(expected.title);
  }
  if (expected.stats !== undefined) {
    expect(previewState.stats.value).toBe(expected.stats);
  }
  if (expected.columns !== undefined) {
    expect(previewState.columns.value).toEqual(expected.columns);
  }
  if (expected.newColumns !== undefined) {
    expect(previewState.newColumns.value).toEqual(expected.newColumns);
  }
  if (expected.rowCount !== undefined) {
    expect(previewState.rows.value).toHaveLength(expected.rowCount);
  }
}

/**
 * Assert preview is cleared.
 */
export function expectPreviewCleared() {
  const { previewState } = DialogStore;
  expect(previewState.title.value).toBe('');
  expect(previewState.stats.value).toBe('');
  expect(previewState.columns.value).toEqual([]);
  expect(previewState.newColumns.value).toEqual([]);
  expect(previewState.rows.value).toEqual([]);
}

/**
 * Create a CSV string from test data for import testing.
 */
export function createCsvString(data: { columns: string[]; rows: DataRow[] }): string {
  const headerLine = data.columns.join(',');
  const dataLines = data.rows.map((row) =>
    data.columns
      .map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Create a File object from a string for import testing.
 */
export function createTestFile(content: string, name = 'test.csv', type = 'text/csv'): File {
  return new File([content], name, { type });
}

/**
 * Create mock StepCallbacks for handler tests.
 * All methods are vi.fn() mocks that can be inspected for calls.
 */
export function createMockStepCallbacks(overrides?: Partial<StepCallbacks>): StepCallbacks {
  return {
    updatePagination: vi.fn(),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    onJoinTargetChange: vi.fn(),
    onAppendTargetChange: vi.fn(),
    onPivotConfigChange: vi.fn(),
    updateSplitPreview: vi.fn(),
    updateDedupePreview: vi.fn(),
    confirmImport: vi.fn(),
    confirmTextEntry: vi.fn(),
    fetchAndImportFromUrl: vi.fn().mockResolvedValue(undefined),
    generateData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Create mock ExecutionCallbacks for transform execution tests.
 * All methods are vi.fn() mocks that can be inspected for calls.
 */
export function createMockExecutionCallbacks(
  overrides?: Partial<ExecutionCallbacks>
): ExecutionCallbacks {
  return {
    onTransformStart: vi.fn(),
    onTransformEnd: vi.fn(),
    onError: vi.fn().mockResolvedValue(undefined),
    onDialogClose: vi.fn(),
    updatePagination: vi.fn(),
    ...overrides,
  };
}

/**
 * Create a typed Source object with sensible defaults.
 * Override any field via the overrides parameter.
 */
export function createTestSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'src_1',
    name: 'Test Source',
    columns: [
      { name: 'name', type: 'string' },
      { name: 'age', type: 'integer' },
    ] as ColumnSchema[],
    data: [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ],
    headerMode: 'first-row',
    delimiter: ',',
    customHeaders: null,
    origin: 'file',
    ...overrides,
  };
}

/**
 * Create a typed Model object with sensible defaults.
 * Override any field via the overrides parameter.
 */
export function createTestModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'mdl_1',
    name: 'Test Model',
    sourceId: 'src_1',
    steps: [
      {
        import: {
          source: 'Test Source',
          fileName: 'test.csv',
          delimiter: ',',
          headerMode: 'first-row',
        },
      },
    ],
    schema: [
      { name: 'name', type: 'string' },
      { name: 'age', type: 'integer' },
    ] as ColumnSchema[],
    data: [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ],
    ...overrides,
  };
}

/**
 * Create a typed ColumnSchema array from name/type pairs.
 * Usage: createTestSchema(['name', 'string'], ['age', 'integer'])
 */
export function createTestSchema(...cols: [string, ColumnType][]): ColumnSchema[] {
  return cols.map(([name, type]) => ({ name, type }));
}

/**
 * Shared mock factories for vi.mock() calls.
 * Centralizes mock shapes so interface changes only need one update.
 *
 * Usage in test files:
 *   vi.mock('../../services/StepService', async () =>
 *     (await import('../test-utils')).MockFactories.stepService()
 *   );
 */
export const MockFactories = {
  stepService: () => ({
    StepService: { runTransform: vi.fn().mockResolvedValue(true) },
  }),
  stepServiceFull: () => ({
    StepService: {
      runTransform: vi.fn().mockResolvedValue(true),
      applyStepResult: vi.fn().mockResolvedValue(undefined),
    },
  }),
  notificationHandlers: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    alert: vi.fn().mockResolvedValue(undefined),
    prompt: vi.fn().mockResolvedValue(''),
  }),
  previewEngine: () => ({
    createDebouncedPreview: vi.fn().mockReturnValue({
      trigger: vi.fn(),
      compute: vi.fn(),
    }),
    clearPreview: vi.fn(),
  }),
  validationEngineExpression: () => ({
    validateExpression: vi.fn(),
  }),
  validationEngineRegex: () => ({
    validateRegexPattern: vi.fn().mockReturnValue({ valid: true }),
  }),
};
