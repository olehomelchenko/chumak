/**
 * Unit Tests for Import Handlers
 *
 * Tests import-related logic including path resolution, duplicate header handling,
 * data flattening, and nested value serialization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DialogStore } from '../stores/DialogStore';
import { resetStores, setTestData, TestData, suppressConsole, createMockApp } from './test-utils';
import * as ImportHandlers from './import-handlers';

describe('import-handlers', () => {
  beforeEach(() => {
    resetStores();
    suppressConsole();
  });

  describe('resolvePath', () => {
    const mockApp = createMockApp();

    it('returns the object when path is empty', () => {
      const data = { foo: 'bar' };
      expect(ImportHandlers.resolvePath.call(mockApp, data, '')).toEqual(data);
    });

    it('resolves single-level path', () => {
      const data = { foo: { bar: 'baz' } };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'foo')).toEqual({ bar: 'baz' });
    });

    it('resolves multi-level path', () => {
      const data = { level1: { level2: { level3: 'value' } } };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'level1.level2.level3')).toBe('value');
    });

    it('resolves array indices', () => {
      const data = { items: ['a', 'b', 'c'] };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'items.1')).toBe('b');
    });

    it('resolves nested array with object', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'users.0.name')).toBe('Alice');
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'users.1.age')).toBe(25);
    });

    it('returns undefined for non-existent path', () => {
      const data = { foo: 'bar' };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'baz')).toBeUndefined();
    });

    it('returns undefined when path goes through null', () => {
      const data = { foo: null };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'foo.bar')).toBeUndefined();
    });

    it('returns undefined when path goes through undefined', () => {
      const data = { foo: undefined };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'foo.bar')).toBeUndefined();
    });

    it('handles deeply nested structures', () => {
      const data = {
        a: { b: { c: { d: { e: { f: 'deep' } } } } },
      };
      expect(ImportHandlers.resolvePath.call(mockApp, data, 'a.b.c.d.e.f')).toBe('deep');
    });
  });

  describe('getSuggestedKeys', () => {
    const mockApp = createMockApp();

    it('returns empty array for null', () => {
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, null)).toEqual([]);
    });

    it('returns empty array for non-object primitives', () => {
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, 'string')).toEqual([]);
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, 123)).toEqual([]);
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, true)).toEqual([]);
    });

    it('returns object keys for objects', () => {
      const data = { foo: 1, bar: 2, baz: 3 };
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, data)).toEqual(['foo', 'bar', 'baz']);
    });

    it('returns index and first element keys for arrays', () => {
      const data = [{ name: 'Alice', age: 30 }];
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, data)).toEqual(['0', 'name', 'age']);
    });

    it('returns just index for empty array', () => {
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, [])).toEqual([]);
    });

    it('handles array of primitives', () => {
      const data = ['a', 'b', 'c'];
      // First element is string 'a', Object.keys('a') returns ['0'] (string index)
      expect(ImportHandlers.getSuggestedKeys.call(mockApp, data)).toEqual(['0', '0']);
    });
  });

  describe('resolveDuplicateHeaders', () => {
    const mockApp = createMockApp();

    it('returns original headers when no duplicates', () => {
      const headers = ['name', 'age', 'city'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders.call(
        mockApp,
        headers
      );

      expect(resolvedHeaders).toEqual(['name', 'age', 'city']);
      expect(warning).toBe('');
    });

    it('appends suffix to duplicate headers', () => {
      const headers = ['name', 'name', 'name'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders.call(
        mockApp,
        headers
      );

      expect(resolvedHeaders).toEqual(['name', 'name_2', 'name_3']);
      expect(warning).toContain('Found 1 duplicate column name');
      expect(warning).toContain('"name"');
    });

    it('handles multiple different duplicates', () => {
      const headers = ['a', 'b', 'a', 'b', 'c'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders.call(
        mockApp,
        headers
      );

      expect(resolvedHeaders).toEqual(['a', 'b', 'a_2', 'b_2', 'c']);
      expect(warning).toContain('Found 2 duplicate column names');
    });

    it('reports correct positions in warning', () => {
      const headers = ['col', 'other', 'col'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders.call(
        mockApp,
        headers
      );

      expect(resolvedHeaders).toEqual(['col', 'other', 'col_2']);
      expect(warning).toContain('at positions 1, 3');
    });

    it('handles empty headers array', () => {
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders.call(mockApp, []);

      expect(resolvedHeaders).toEqual([]);
      expect(warning).toBe('');
    });

    it('handles single header', () => {
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders.call(mockApp, [
        'solo',
      ]);

      expect(resolvedHeaders).toEqual(['solo']);
      expect(warning).toBe('');
    });

    it('increments suffix correctly for many duplicates', () => {
      const headers = ['col', 'col', 'col', 'col', 'col'];
      const { resolvedHeaders } = ImportHandlers.resolveDuplicateHeaders.call(mockApp, headers);

      expect(resolvedHeaders).toEqual(['col', 'col_2', 'col_3', 'col_4', 'col_5']);
    });
  });

  describe('flattenData', () => {
    const mockApp = createMockApp();

    it('flattens nested objects with underscore separator', () => {
      const data = [{ user: { name: 'Alice', address: { city: 'Boston' } } }];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({
        user_name: 'Alice',
        user_address_city: 'Boston',
      });
    });

    it('preserves primitive values at top level', () => {
      const data = [{ name: 'Alice', age: 30, active: true }];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({
        name: 'Alice',
        age: 30,
        active: true,
      });
    });

    it('handles arrays as values (not flattened)', () => {
      const data = [{ tags: ['a', 'b', 'c'] }];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({
        tags: ['a', 'b', 'c'],
      });
    });

    it('handles null values', () => {
      const data = [{ value: null, nested: { inner: null } }];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({
        value: null,
        nested_inner: null,
      });
    });

    it('handles empty objects', () => {
      const data = [{}];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({});
    });

    it('handles deeply nested objects', () => {
      const data = [{ a: { b: { c: { d: 'deep' } } } }];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({
        a_b_c_d: 'deep',
      });
    });

    it('handles mixed nested and flat properties', () => {
      const data = [
        {
          id: 1,
          profile: {
            name: 'Alice',
            settings: {
              theme: 'dark',
            },
          },
          active: true,
        },
      ];

      const result = ImportHandlers.flattenData.call(mockApp, data);

      expect(result[0]).toEqual({
        id: 1,
        profile_name: 'Alice',
        profile_settings_theme: 'dark',
        active: true,
      });
    });
  });

  describe('serializeNestedData', () => {
    const mockApp = createMockApp();

    it('serializes nested objects to JSON strings', () => {
      const data = [{ name: 'Alice', metadata: { role: 'admin', level: 5 } }];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      expect(result[0].name).toBe('Alice');
      expect(result[0].metadata).toBe('{"role":"admin","level":5}');
    });

    it('serializes arrays to JSON strings', () => {
      const data = [{ tags: ['a', 'b', 'c'] }];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      expect(result[0].tags).toBe('["a","b","c"]');
    });

    it('preserves primitive values', () => {
      const data = [{ string: 'text', number: 42, boolean: true, nullable: null }];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      expect(result[0]).toEqual({
        string: 'text',
        number: 42,
        boolean: true,
        nullable: null,
      });
    });

    it('handles empty objects', () => {
      const data = [{ empty: {} }];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      expect(result[0].empty).toBe('{}');
    });

    it('handles empty arrays', () => {
      const data = [{ items: [] }];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      expect(result[0].items).toBe('[]');
    });

    it('handles complex nested structures', () => {
      const data = [
        {
          user: {
            profile: { name: 'Alice', preferences: ['dark', 'compact'] },
            stats: { visits: 100 },
          },
        },
      ];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      const parsed = JSON.parse(result[0].user);
      expect(parsed.profile.name).toBe('Alice');
      expect(parsed.profile.preferences).toEqual(['dark', 'compact']);
      expect(parsed.stats.visits).toBe(100);
    });

    it('handles multiple rows', () => {
      const data = [
        { id: 1, meta: { type: 'A' } },
        { id: 2, meta: { type: 'B' } },
      ];

      const result = ImportHandlers.serializeNestedData.call(mockApp, data);

      expect(result[0].id).toBe(1);
      expect(result[0].meta).toBe('{"type":"A"}');
      expect(result[1].id).toBe(2);
      expect(result[1].meta).toBe('{"type":"B"}');
    });
  });

  describe('DialogStore import state', () => {
    it('initializes import URL state correctly', () => {
      expect(DialogStore.importUrlState.url.value).toBe('');
      expect(DialogStore.importUrlState.isFetching.value).toBe(false);
      expect(DialogStore.importUrlState.error.value).toBeNull();
    });

    it('initializes import CSV state correctly', () => {
      expect(DialogStore.importCsvState.isReplaceMode.value).toBe(false);
      expect(DialogStore.importCsvState.targetSourceId.value).toBeNull();
      expect(DialogStore.importCsvState.schemaDiff.value).toBeNull();
    });
  });

  describe('showImportUrlDialog', () => {
    it('initializes URL dialog state', () => {
      const mockApp = createMockApp();

      // Set some initial values
      mockApp.importUrlDialogState = {
        url: 'previous-url',
        isFetching: true,
        error: 'previous-error',
      };

      ImportHandlers.showImportUrlDialog.call(mockApp);

      expect(mockApp.importUrlDialogState).toEqual({
        url: '',
        isFetching: false,
        error: null,
      });
      expect(mockApp.openDialog).toHaveBeenCalledWith('import-url');
    });
  });

  describe('fetchAndImportFromUrl error handling', () => {
    it('sets error when URL is empty', async () => {
      const mockApp = createMockApp();
      DialogStore.importUrlState.url.value = '';

      await ImportHandlers.fetchAndImportFromUrl.call(mockApp);

      expect(DialogStore.importUrlState.error.value).toBe('Please enter a valid URL');
    });

    it('sets error when URL is whitespace only', async () => {
      const mockApp = createMockApp();
      DialogStore.importUrlState.url.value = '   ';

      await ImportHandlers.fetchAndImportFromUrl.call(mockApp);

      expect(DialogStore.importUrlState.error.value).toBe('Please enter a valid URL');
    });
  });

  describe('showReplaceSourceDialog', () => {
    it('sets replace mode flags and opens file picker', () => {
      const mockApp = createMockApp();
      const source = {
        id: 'source-123',
        name: 'Test Source',
        columns: [],
        data: [],
      };

      // Mock document.getElementById
      const mockInput = { click: vi.fn() };
      vi.spyOn(document, 'getElementById').mockReturnValue(mockInput as any);

      ImportHandlers.showReplaceSourceDialog.call(mockApp, source as any);

      expect(DialogStore.importCsvState.isReplaceMode.value).toBe(true);
      expect(DialogStore.importCsvState.targetSourceId.value).toBe('source-123');
      expect(DialogStore.importCsvState.sourceName.value).toBe('Test Source');
      expect(mockInput.click).toHaveBeenCalled();
    });
  });
});
