import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetStores, setTestData, TestData } from '../test-utils';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';

vi.mock('../../services/StepService', async () =>
  (await import('../test-utils')).MockFactories.stepService()
);

import {
  findDuplicateRows,
  findAllDuplicateRowCount,
  toggleDedupeAllColumns,
  toggleDedupeColumn,
  selectAllForDedupe,
  selectNoneForDedupe,
  getDedupeColumns,
} from './dedupe-handlers';

describe('dedupe-handlers', () => {
  beforeEach(() => {
    resetStores();
    setTestData(TestData.simple);
    vi.clearAllMocks();
  });

  describe('findDuplicateRows', () => {
    it('returns empty set for unique data', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Carol', age: 35 },
      ];
      const dupes = findDuplicateRows(data, ['name', 'age']);
      expect(dupes.size).toBe(0);
    });

    it('finds duplicate rows', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Alice', age: 30 },
      ];
      const dupes = findDuplicateRows(data, ['name', 'age']);
      expect(dupes.size).toBe(1);
      expect(dupes.has(2)).toBe(true);
    });

    it('finds duplicates by subset of columns', () => {
      const data = [
        { name: 'Alice', age: 30, city: 'Boston' },
        { name: 'Alice', age: 30, city: 'Seattle' },
      ];
      const dupes = findDuplicateRows(data, ['name', 'age']);
      expect(dupes.size).toBe(1);
    });

    it('uses all columns when columns array is empty', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const dupes = findDuplicateRows(data, []);
      expect(dupes.size).toBe(1);
    });

    it('handles null values', () => {
      const data = [
        { name: null, age: 30 },
        { name: null, age: 30 },
      ];
      const dupes = findDuplicateRows(data, ['name', 'age']);
      expect(dupes.size).toBe(1);
    });

    it('returns empty set for empty data', () => {
      const dupes = findDuplicateRows([], ['name']);
      expect(dupes.size).toBe(0);
    });
  });

  describe('findAllDuplicateRowCount', () => {
    it('counts all rows involved in duplicates', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Alice', age: 30 },
        { name: 'Alice', age: 30 },
      ];
      // All 3 "Alice" rows are duplicates (including the first)
      expect(findAllDuplicateRowCount(data, ['name', 'age'])).toBe(3);
    });

    it('returns 0 when no duplicates', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      expect(findAllDuplicateRowCount(data, ['name'])).toBe(0);
    });
  });

  describe('column toggle functions', () => {
    beforeEach(() => {
      AppStore.columns.value = ['name', 'age', 'city'];
      DialogStore.dedupeState.selectedColumns.value = [true, true, true];
      DialogStore.dedupeState.useAllColumns.value = true;
    });

    it('toggleDedupeAllColumns sets useAllColumns and selects all when true', () => {
      toggleDedupeAllColumns(true);
      expect(DialogStore.dedupeState.useAllColumns.value).toBe(true);
      expect(DialogStore.dedupeState.selectedColumns.value).toEqual([true, true, true]);
    });

    it('toggleDedupeAllColumns sets useAllColumns to false', () => {
      toggleDedupeAllColumns(false);
      expect(DialogStore.dedupeState.useAllColumns.value).toBe(false);
    });

    it('toggleDedupeColumn flips individual column selection', () => {
      DialogStore.dedupeState.selectedColumns.value = [true, true, true];
      toggleDedupeColumn(1);
      expect(DialogStore.dedupeState.selectedColumns.value).toEqual([true, false, true]);
    });

    it('selectAllForDedupe sets all columns to true', () => {
      DialogStore.dedupeState.selectedColumns.value = [false, false, false];
      selectAllForDedupe();
      expect(DialogStore.dedupeState.selectedColumns.value).toEqual([true, true, true]);
    });

    it('selectNoneForDedupe sets all columns to false', () => {
      DialogStore.dedupeState.selectedColumns.value = [true, true, true];
      selectNoneForDedupe();
      expect(DialogStore.dedupeState.selectedColumns.value).toEqual([false, false, false]);
    });
  });

  describe('getDedupeColumns', () => {
    beforeEach(() => {
      AppStore.columns.value = ['name', 'age', 'city'];
    });

    it('returns empty array when useAllColumns is true', () => {
      DialogStore.dedupeState.useAllColumns.value = true;
      expect(getDedupeColumns()).toEqual([]);
    });

    it('returns selected column names', () => {
      DialogStore.dedupeState.useAllColumns.value = false;
      DialogStore.dedupeState.selectedColumns.value = [true, false, true];
      expect(getDedupeColumns()).toEqual(['name', 'city']);
    });

    it('returns empty array when no columns selected', () => {
      DialogStore.dedupeState.useAllColumns.value = false;
      DialogStore.dedupeState.selectedColumns.value = [false, false, false];
      expect(getDedupeColumns()).toEqual([]);
    });
  });
});
