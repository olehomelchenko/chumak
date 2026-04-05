import { describe, it, expect, beforeEach } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { computeMergePreview, buildConcatExpression, escapeColumnName } from './merge-handlers';

describe('merge-handlers', () => {
  beforeEach(() => {
    AppStore.columns.value = ['first_name', 'last_name', 'city', 'state'];
    AppStore.currentData.value = [
      { first_name: 'Alice', last_name: 'Smith', city: 'Boston', state: 'MA' },
      { first_name: 'Bob', last_name: 'Jones', city: 'Austin', state: 'TX' },
      { first_name: 'Carol', last_name: null, city: 'Seattle', state: 'WA' },
    ];
  });

  describe('computeMergePreview', () => {
    it('returns null when no columns selected', () => {
      const result = computeMergePreview([], ' ', 'output', ['first_name']);
      expect(result).toBeNull();
    });

    it('returns null when column name is empty', () => {
      const result = computeMergePreview(['first_name'], ' ', '', ['first_name']);
      expect(result).toBeNull();
    });

    it('throws when selected column does not exist', () => {
      expect(() => computeMergePreview(['nonexistent'], ' ', 'output', ['first_name'])).toThrow(
        'Columns not found: nonexistent'
      );
    });

    it('generates preview with space separator', () => {
      const result = computeMergePreview(['first_name', 'last_name'], ' ', 'full_name', [
        'first_name',
        'last_name',
      ]);
      expect(result).not.toBeNull();
      expect(result!.rows).toHaveLength(3);
      expect(result!.rows[0].full_name).toBe('Alice Smith');
      expect(result!.rows[1].full_name).toBe('Bob Jones');
    });

    it('handles null values correctly', () => {
      const result = computeMergePreview(['first_name', 'last_name'], ' ', 'full_name', [
        'first_name',
        'last_name',
      ]);
      // Carol has null last_name, should become "Carol "
      expect(result!.rows[2].full_name).toBe('Carol ');
    });

    it('generates preview with comma separator', () => {
      const result = computeMergePreview(['city', 'state'], ', ', 'location', ['city', 'state']);
      expect(result!.rows[0].location).toBe('Boston, MA');
      expect(result!.rows[1].location).toBe('Austin, TX');
    });

    it('generates preview with no separator', () => {
      const result = computeMergePreview(['first_name', 'last_name'], '', 'name', [
        'first_name',
        'last_name',
      ]);
      expect(result!.rows[0].name).toBe('AliceSmith');
    });

    it('handles single column merge', () => {
      const result = computeMergePreview(['first_name'], '', 'name_copy', ['first_name']);
      expect(result!.rows[0].name_copy).toBe('Alice');
    });

    it('sets preview metadata correctly', () => {
      const result = computeMergePreview(['first_name', 'last_name'], ' ', 'full_name', [
        'first_name',
        'last_name',
      ]);
      expect(result!.title).toBe('Merge: full_name');
      expect(result!.stats).toBe('Merging 2 columns');
      expect(result!.columns).toEqual(['first_name', 'last_name', 'full_name']);
      expect(result!.newColumns).toEqual(['full_name']);
    });

    it('handles columns with special characters', () => {
      AppStore.columns.value = ['First Name', 'Last Name'];
      AppStore.currentData.value = [{ 'First Name': 'Alice', 'Last Name': 'Smith' }];

      const result = computeMergePreview(['First Name', 'Last Name'], ' ', 'Full Name', [
        'First Name',
        'Last Name',
      ]);
      expect(result!.rows[0]['Full Name']).toBe('Alice Smith');
    });

    it('limits preview to 50 rows', () => {
      const manyRows = Array.from({ length: 100 }, (_, i) => ({
        first_name: `Name${i}`,
        last_name: `Last${i}`,
        city: 'City',
        state: 'ST',
      }));
      AppStore.currentData.value = manyRows;

      const result = computeMergePreview(['first_name', 'last_name'], ' ', 'full_name', [
        'first_name',
        'last_name',
      ]);
      expect(result!.rows).toHaveLength(50);
    });
  });

  describe('buildConcatExpression', () => {
    it('returns empty string expression for no columns', () => {
      expect(buildConcatExpression([], ' ')).toBe('""');
    });

    it('wraps single column with null coalescing', () => {
      expect(buildConcatExpression(['name'], ' ')).toBe('(name ?? "")');
    });

    it('joins multiple columns with separator', () => {
      const expr = buildConcatExpression(['first', 'last'], ' ');
      expect(expr).toBe('(first ?? "") + " " + (last ?? "")');
    });
  });

  describe('escapeColumnName', () => {
    it('returns simple names as-is', () => {
      expect(escapeColumnName('name')).toBe('name');
    });

    it('wraps names with spaces in brackets', () => {
      expect(escapeColumnName('First Name')).toBe('[First Name]');
    });
  });
});
