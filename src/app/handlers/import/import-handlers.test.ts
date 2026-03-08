/**
 * Unit Tests for Import Handlers
 *
 * Tests import-related logic including path resolution, duplicate header handling,
 * data flattening, and nested value serialization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';
import { resetStores, suppressConsole, createTestSource } from '../test-utils';
import * as ImportHandlers from './import-handlers';

describe('import-handlers', () => {
  beforeEach(() => {
    resetStores();
    suppressConsole();
  });

  describe('resolvePath', () => {
    it('returns the object when path is empty', () => {
      const data = { foo: 'bar' };
      expect(ImportHandlers.resolvePath(data, '')).toEqual(data);
    });

    it('resolves single-level path', () => {
      const data = { foo: { bar: 'baz' } };
      expect(ImportHandlers.resolvePath(data, 'foo')).toEqual({ bar: 'baz' });
    });

    it('resolves multi-level path', () => {
      const data = { level1: { level2: { level3: 'value' } } };
      expect(ImportHandlers.resolvePath(data, 'level1.level2.level3')).toBe('value');
    });

    it('resolves array indices', () => {
      const data = { items: ['a', 'b', 'c'] };
      expect(ImportHandlers.resolvePath(data, 'items.1')).toBe('b');
    });

    it('resolves nested array with object', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      };
      expect(ImportHandlers.resolvePath(data, 'users.0.name')).toBe('Alice');
      expect(ImportHandlers.resolvePath(data, 'users.1.age')).toBe(25);
    });

    it('returns undefined for non-existent path', () => {
      const data = { foo: 'bar' };
      expect(ImportHandlers.resolvePath(data, 'baz')).toBeUndefined();
    });

    it('returns undefined when path goes through null', () => {
      const data = { foo: null };
      expect(ImportHandlers.resolvePath(data, 'foo.bar')).toBeUndefined();
    });

    it('returns undefined when path goes through undefined', () => {
      const data = { foo: undefined };
      expect(ImportHandlers.resolvePath(data, 'foo.bar')).toBeUndefined();
    });

    it('handles deeply nested structures', () => {
      const data = {
        a: { b: { c: { d: { e: { f: 'deep' } } } } },
      };
      expect(ImportHandlers.resolvePath(data, 'a.b.c.d.e.f')).toBe('deep');
    });
  });

  describe('getSuggestedKeys', () => {
    it('returns empty array for null', () => {
      expect(ImportHandlers.getSuggestedKeys(null)).toEqual([]);
    });

    it('returns empty array for non-object primitives', () => {
      expect(ImportHandlers.getSuggestedKeys('string')).toEqual([]);
      expect(ImportHandlers.getSuggestedKeys(123)).toEqual([]);
      expect(ImportHandlers.getSuggestedKeys(true)).toEqual([]);
    });

    it('returns object keys with types for objects', () => {
      const data = { foo: 1, bar: 2, baz: 3 };
      expect(ImportHandlers.getSuggestedKeys(data)).toEqual([
        { key: 'foo', type: 'primitive' },
        { key: 'bar', type: 'primitive' },
        { key: 'baz', type: 'primitive' },
      ]);
    });

    it('returns index and first element keys with types for arrays', () => {
      const data = [{ name: 'Alice', age: 30 }];
      expect(ImportHandlers.getSuggestedKeys(data)).toEqual([
        { key: '0', type: 'object', count: 2 },
        { key: 'name', type: 'primitive' },
        { key: 'age', type: 'primitive' },
      ]);
    });

    it('returns just index for empty array', () => {
      expect(ImportHandlers.getSuggestedKeys([])).toEqual([]);
    });

    it('handles array of primitives', () => {
      const data = ['a', 'b', 'c'];
      // First element is string 'a', not an object — only index shown
      expect(ImportHandlers.getSuggestedKeys(data)).toEqual([{ key: '0', type: 'primitive' }]);
    });
  });

  describe('resolveDuplicateHeaders', () => {
    it('returns original headers when no duplicates', () => {
      const headers = ['name', 'age', 'city'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders(headers);

      expect(resolvedHeaders).toEqual(['name', 'age', 'city']);
      expect(warning).toBe('');
    });

    it('appends suffix to duplicate headers', () => {
      const headers = ['name', 'name', 'name'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders(headers);

      expect(resolvedHeaders).toEqual(['name', 'name_2', 'name_3']);
      expect(warning).toContain('Found 1 duplicate column name');
      expect(warning).toContain('"name"');
    });

    it('handles multiple different duplicates', () => {
      const headers = ['a', 'b', 'a', 'b', 'c'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders(headers);

      expect(resolvedHeaders).toEqual(['a', 'b', 'a_2', 'b_2', 'c']);
      expect(warning).toContain('Found 2 duplicate column names');
    });

    it('reports correct positions in warning', () => {
      const headers = ['col', 'other', 'col'];
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders(headers);

      expect(resolvedHeaders).toEqual(['col', 'other', 'col_2']);
      expect(warning).toContain('at positions 1, 3');
    });

    it('handles empty headers array', () => {
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders([]);

      expect(resolvedHeaders).toEqual([]);
      expect(warning).toBe('');
    });

    it('handles single header', () => {
      const { resolvedHeaders, warning } = ImportHandlers.resolveDuplicateHeaders(['solo']);

      expect(resolvedHeaders).toEqual(['solo']);
      expect(warning).toBe('');
    });

    it('increments suffix correctly for many duplicates', () => {
      const headers = ['col', 'col', 'col', 'col', 'col'];
      const { resolvedHeaders } = ImportHandlers.resolveDuplicateHeaders(headers);

      expect(resolvedHeaders).toEqual(['col', 'col_2', 'col_3', 'col_4', 'col_5']);
    });
  });

  describe('flattenData', () => {
    it('flattens nested objects with underscore separator', () => {
      const data = [{ user: { name: 'Alice', address: { city: 'Boston' } } }];

      const result = ImportHandlers.flattenData(data);

      expect(result[0]).toEqual({
        user_name: 'Alice',
        user_address_city: 'Boston',
      });
    });

    it('preserves primitive values at top level', () => {
      const data = [{ name: 'Alice', age: 30, active: true }];

      const result = ImportHandlers.flattenData(data);

      expect(result[0]).toEqual({
        name: 'Alice',
        age: 30,
        active: true,
      });
    });

    it('handles arrays as values (not flattened)', () => {
      const data = [{ tags: ['a', 'b', 'c'] }];

      const result = ImportHandlers.flattenData(data);

      expect(result[0]).toEqual({
        tags: ['a', 'b', 'c'],
      });
    });

    it('handles null values', () => {
      const data = [{ value: null, nested: { inner: null } }];

      const result = ImportHandlers.flattenData(data);

      expect(result[0]).toEqual({
        value: null,
        nested_inner: null,
      });
    });

    it('handles empty objects', () => {
      const data = [{}];

      const result = ImportHandlers.flattenData(data);

      expect(result[0]).toEqual({});
    });

    it('handles deeply nested objects', () => {
      const data = [{ a: { b: { c: { d: 'deep' } } } }];

      const result = ImportHandlers.flattenData(data);

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

      const result = ImportHandlers.flattenData(data);

      expect(result[0]).toEqual({
        id: 1,
        profile_name: 'Alice',
        profile_settings_theme: 'dark',
        active: true,
      });
    });
  });

  describe('serializeNestedData', () => {
    it('serializes nested objects to JSON strings', () => {
      const data = [{ name: 'Alice', metadata: { role: 'admin', level: 5 } }];

      const result = ImportHandlers.serializeNestedData(data);

      expect(result[0].name).toBe('Alice');
      expect(result[0].metadata).toBe('{"role":"admin","level":5}');
    });

    it('serializes arrays to JSON strings', () => {
      const data = [{ tags: ['a', 'b', 'c'] }];

      const result = ImportHandlers.serializeNestedData(data);

      expect(result[0].tags).toBe('["a","b","c"]');
    });

    it('preserves primitive values', () => {
      const data = [{ string: 'text', number: 42, boolean: true, nullable: null }];

      const result = ImportHandlers.serializeNestedData(data);

      expect(result[0]).toEqual({
        string: 'text',
        number: 42,
        boolean: true,
        nullable: null,
      });
    });

    it('handles empty objects', () => {
      const data = [{ empty: {} }];

      const result = ImportHandlers.serializeNestedData(data);

      expect(result[0].empty).toBe('{}');
    });

    it('handles empty arrays', () => {
      const data = [{ items: [] }];

      const result = ImportHandlers.serializeNestedData(data);

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

      const result = ImportHandlers.serializeNestedData(data);

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

      const result = ImportHandlers.serializeNestedData(data);

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
      // Set some initial values in DialogStore
      DialogStore.importUrlState.url.value = 'previous-url';
      DialogStore.importUrlState.isFetching.value = true;
      DialogStore.importUrlState.error.value = 'previous-error';

      // Set up callbacks to capture openDialog call
      const openDialogSpy = vi.fn();
      ImportHandlers.setImportCallbacks({
        openDialog: openDialogSpy,
        closeDialog: vi.fn(),
        createSource: vi.fn(),
      });

      ImportHandlers.showImportUrlDialog();

      expect(DialogStore.importUrlState.url.value).toBe('');
      expect(DialogStore.importUrlState.isFetching.value).toBe(false);
      expect(DialogStore.importUrlState.error.value).toBe(null);
      expect(openDialogSpy).toHaveBeenCalledWith('import-url');
    });
  });

  describe('fetchAndImportFromUrl error handling', () => {
    it('sets error when URL is empty', async () => {
      DialogStore.importUrlState.url.value = '';

      await ImportHandlers.fetchAndImportFromUrl();

      expect(DialogStore.importUrlState.error.value).toBe('Please enter a valid URL');
    });

    it('sets error when URL is whitespace only', async () => {
      DialogStore.importUrlState.url.value = '   ';

      await ImportHandlers.fetchAndImportFromUrl();

      expect(DialogStore.importUrlState.error.value).toBe('Please enter a valid URL');
    });
  });

  describe('DialogStore import text state', () => {
    it('initializes import text state correctly', () => {
      expect(DialogStore.importTextState.text.value).toBe('');
      expect(DialogStore.importTextState.isEditMode.value).toBe(false);
      expect(DialogStore.importTextState.targetSourceId.value).toBeNull();
    });
  });

  describe('confirmTextEntry', () => {
    it('does nothing when text is empty', () => {
      const openDialogSpy = vi.fn();
      ImportHandlers.setImportCallbacks({
        openDialog: openDialogSpy,
        closeDialog: vi.fn(),
        createSource: vi.fn(),
      });

      DialogStore.importTextState.text.value = '';
      ImportHandlers.confirmTextEntry();

      // Should not transition to import-csv
      expect(DialogStore.importCsvState.fromTextEntry.value).toBe(false);
    });

    it('does nothing when text is whitespace only', () => {
      DialogStore.importTextState.text.value = '   \n  ';
      ImportHandlers.confirmTextEntry();

      expect(DialogStore.importCsvState.fromTextEntry.value).toBe(false);
    });

    it('sets fromTextEntry flag on import-csv state', () => {
      ImportHandlers.setImportCallbacks({
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        createSource: vi.fn(),
      });

      DialogStore.importTextState.text.value = 'Name,Age\nAlice,30';
      ImportHandlers.confirmTextEntry();

      expect(DialogStore.importCsvState.fromTextEntry.value).toBe(true);
    });

    it('sets replace mode when in edit mode with target source', () => {
      const source = createTestSource({ id: 'src_edit' });
      AppStore.sources.value = [source];

      ImportHandlers.setImportCallbacks({
        openDialog: vi.fn(),
        closeDialog: vi.fn(),
        createSource: vi.fn(),
      });

      DialogStore.importTextState.text.value = 'Name,Age\nAlice,30';
      DialogStore.importTextState.isEditMode.value = true;
      DialogStore.importTextState.targetSourceId.value = 'src_edit';

      ImportHandlers.confirmTextEntry();

      expect(DialogStore.importCsvState.isReplaceMode.value).toBe(true);
      expect(DialogStore.importCsvState.targetSourceId.value).toBe('src_edit');
      expect(DialogStore.importCsvState.sourceName.value).toBe('Test Source');
    });
  });

  describe('showEditTextDialog', () => {
    it('sets text state from source rawText', () => {
      const openDialogSpy = vi.fn();
      ImportHandlers.setImportCallbacks({
        openDialog: openDialogSpy,
        closeDialog: vi.fn(),
        createSource: vi.fn(),
      });

      const source = createTestSource({ id: 'src_1', rawText: 'Name,Age\nAlice,30' });
      ImportHandlers.showEditTextDialog(source);

      expect(DialogStore.importTextState.text.value).toBe('Name,Age\nAlice,30');
      expect(DialogStore.importTextState.isEditMode.value).toBe(true);
      expect(DialogStore.importTextState.targetSourceId.value).toBe('src_1');
      expect(openDialogSpy).toHaveBeenCalledWith('import-text');
    });

    it('does nothing when source has no rawText', () => {
      const openDialogSpy = vi.fn();
      ImportHandlers.setImportCallbacks({
        openDialog: openDialogSpy,
        closeDialog: vi.fn(),
        createSource: vi.fn(),
      });

      const source = createTestSource({ id: 'src_1' });
      ImportHandlers.showEditTextDialog(source);

      expect(openDialogSpy).not.toHaveBeenCalled();
    });
  });

  describe('backToTextEntry', () => {
    it('preserves text state across dialog transition', () => {
      const openDialogSpy = vi.fn();
      const closeDialogSpy = vi.fn();
      ImportHandlers.setImportCallbacks({
        openDialog: openDialogSpy,
        closeDialog: closeDialogSpy,
        createSource: vi.fn(),
      });

      DialogStore.importTextState.text.value = 'original text';
      DialogStore.importTextState.isEditMode.value = true;
      DialogStore.importTextState.targetSourceId.value = 'src_1';
      DialogStore.importCsvState.fromTextEntry.value = true;

      ImportHandlers.backToTextEntry();

      expect(DialogStore.importCsvState.fromTextEntry.value).toBe(false);
      expect(closeDialogSpy).toHaveBeenCalledWith(true);
      expect(DialogStore.importTextState.text.value).toBe('original text');
      expect(DialogStore.importTextState.isEditMode.value).toBe(true);
      expect(DialogStore.importTextState.targetSourceId.value).toBe('src_1');
      expect(openDialogSpy).toHaveBeenCalledWith('import-text');
    });
  });

  describe('showReplaceSourceDialog', () => {
    it('sets replace mode flags and opens file picker', () => {
      const source = createTestSource({ id: 'source-123' });

      // Mock document.getElementById
      const mockInput = { click: vi.fn() };
      vi.spyOn(document, 'getElementById').mockReturnValue(mockInput as any);

      ImportHandlers.showReplaceSourceDialog(source);

      expect(DialogStore.importCsvState.isReplaceMode.value).toBe(true);
      expect(DialogStore.importCsvState.targetSourceId.value).toBe('source-123');
      expect(DialogStore.importCsvState.sourceName.value).toBe('Test Source');
      expect(mockInput.click).toHaveBeenCalled();
    });
  });
});
