import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetStores, setTestData, TestData } from '../test-utils';

import { findDuplicateRows, findAllDuplicateRowCount } from './dedupe-handlers';

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
});
