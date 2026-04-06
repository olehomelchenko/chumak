/**
 * Unit Tests for Column Editor Handlers
 *
 * Tests pure functions: getColumnEditorChanges, getPatternMatchedColumns,
 * getPatternRenamePreview, validateColumnEditorText, and applyColumnEditorTransform.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { resetStores, setTestData, TestData, suppressConsole } from '../test-utils';
import * as ColumnEditorHandlers from './column-editor-handlers';

describe('column-editor-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  const simpleColumns = ['name', 'age', 'city'];

  beforeEach(() => {
    resetStores();
    setTestData(TestData.simple);
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('setColumnEditorSection / consumeColumnEditorSection', () => {
    it('stores and consumes a section value', () => {
      ColumnEditorHandlers.setColumnEditorSection('select');
      expect(ColumnEditorHandlers.consumeColumnEditorSection()).toBe('select');
      // Second consume returns null
      expect(ColumnEditorHandlers.consumeColumnEditorSection()).toBeNull();
    });

    it('returns null when no section set', () => {
      expect(ColumnEditorHandlers.consumeColumnEditorSection()).toBeNull();
    });
  });

  describe('getColumnEditorChanges', () => {
    describe('list mode', () => {
      it('returns no changes when nothing has changed', () => {
        const columns = simpleColumns.map((c) => ({
          original: c,
          renamed: c,
          selected: true,
        }));
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'list',
          '',
          'rename',
          columns,
          simpleColumns
        );

        expect(changes.hasChanges).toBe(false);
        expect(changes.removed).toEqual([]);
        expect(changes.renamed).toEqual([]);
        expect(changes.reordered).toBe(false);
      });

      it('detects removed columns', () => {
        const columns = [
          { original: 'name', renamed: 'name', selected: true },
          { original: 'age', renamed: 'age', selected: false },
          { original: 'city', renamed: 'city', selected: true },
        ];
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'list',
          '',
          'rename',
          columns,
          simpleColumns
        );

        expect(changes.hasChanges).toBe(true);
        expect(changes.removed).toEqual(['age']);
      });

      it('detects renamed columns', () => {
        const columns = [
          { original: 'name', renamed: 'full_name', selected: true },
          { original: 'age', renamed: 'age', selected: true },
          { original: 'city', renamed: 'city', selected: true },
        ];
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'list',
          '',
          'rename',
          columns,
          simpleColumns
        );

        expect(changes.hasChanges).toBe(true);
        expect(changes.renamed).toEqual([{ from: 'name', to: 'full_name' }]);
      });

      it('detects reordered columns', () => {
        const columns = [
          { original: 'age', renamed: 'age', selected: true },
          { original: 'name', renamed: 'name', selected: true },
          { original: 'city', renamed: 'city', selected: true },
        ];
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'list',
          '',
          'rename',
          columns,
          simpleColumns
        );

        expect(changes.hasChanges).toBe(true);
        expect(changes.reordered).toBe(true);
      });

      it('ignores empty renamed values', () => {
        const columns = [
          { original: 'name', renamed: '', selected: true },
          { original: 'age', renamed: 'age', selected: true },
          { original: 'city', renamed: 'city', selected: true },
        ];
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'list',
          '',
          'rename',
          columns,
          simpleColumns
        );

        expect(changes.renamed).toEqual([]);
      });

      it('ignores whitespace-only renamed values', () => {
        const columns = [
          { original: 'name', renamed: '   ', selected: true },
          { original: 'age', renamed: 'age', selected: true },
          { original: 'city', renamed: 'city', selected: true },
        ];
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'list',
          '',
          'rename',
          columns,
          simpleColumns
        );

        expect(changes.renamed).toEqual([]);
      });
    });

    describe('text mode', () => {
      it('detects renames in rename sub-mode', () => {
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'text',
          'full_name\nage\ncity',
          'rename',
          [],
          simpleColumns
        );

        expect(changes.hasChanges).toBe(true);
        expect(changes.renamed).toEqual([{ from: 'name', to: 'full_name' }]);
      });

      it('detects reorder in reorder sub-mode', () => {
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'text',
          'city\nage\nname',
          'reorder',
          [],
          simpleColumns
        );

        expect(changes.hasChanges).toBe(true);
        expect(changes.reordered).toBe(true);
      });

      it('detects removed columns in select sub-mode', () => {
        const changes = ColumnEditorHandlers.getColumnEditorChanges(
          'text',
          'name\ncity',
          'select',
          [],
          simpleColumns
        );

        expect(changes.hasChanges).toBe(true);
        expect(changes.removed).toEqual(['age']);
      });
    });
  });

  describe('getPatternMatchedColumns', () => {
    it('returns empty array when pattern is empty', () => {
      const matched = ColumnEditorHandlers.getPatternMatchedColumns('', 'prefix', simpleColumns);
      expect(matched).toEqual([]);
    });

    it('matches columns with prefix pattern', () => {
      const matched = ColumnEditorHandlers.getPatternMatchedColumns('na', 'prefix', simpleColumns);
      expect(matched).toContain('name');
      expect(matched).not.toContain('age');
    });

    it('matches columns with suffix pattern', () => {
      const matched = ColumnEditorHandlers.getPatternMatchedColumns('ty', 'suffix', simpleColumns);
      expect(matched).toContain('city');
      expect(matched).not.toContain('name');
    });

    it('matches columns with contains pattern', () => {
      const matched = ColumnEditorHandlers.getPatternMatchedColumns('a', 'contains', simpleColumns);
      expect(matched).toContain('name');
      expect(matched).toContain('age');
      expect(matched).not.toContain('city');
    });

    it('matches columns with regex pattern', () => {
      const matched = ColumnEditorHandlers.getPatternMatchedColumns(
        '^[nc]',
        'regex',
        simpleColumns
      );
      expect(matched).toContain('name');
      expect(matched).toContain('city');
      expect(matched).not.toContain('age');
    });

    it('returns empty array for invalid regex', () => {
      const matched = ColumnEditorHandlers.getPatternMatchedColumns(
        '[invalid',
        'regex',
        simpleColumns
      );
      expect(matched).toEqual([]);
    });
  });

  describe('getPatternRenamePreview', () => {
    it('returns empty array when find pattern is empty', () => {
      const preview = ColumnEditorHandlers.getPatternRenamePreview('', '', false, simpleColumns);
      expect(preview).toEqual([]);
    });

    it('returns rename preview for text pattern', () => {
      const preview = ColumnEditorHandlers.getPatternRenamePreview(
        'name',
        'title',
        false,
        simpleColumns
      );
      expect(preview).toEqual([{ from: 'name', to: 'title' }]);
    });

    it('returns rename preview for regex pattern', () => {
      const preview = ColumnEditorHandlers.getPatternRenamePreview(
        'e$',
        '_col',
        true,
        simpleColumns
      );
      expect(preview).toContainEqual({ from: 'name', to: 'nam_col' });
      expect(preview).toContainEqual({ from: 'age', to: 'ag_col' });
    });

    it('returns empty array for invalid regex', () => {
      const preview = ColumnEditorHandlers.getPatternRenamePreview(
        '[invalid',
        '',
        true,
        simpleColumns
      );
      expect(preview).toEqual([]);
    });

    it('excludes columns that would not change', () => {
      const preview = ColumnEditorHandlers.getPatternRenamePreview(
        'xyz',
        'abc',
        false,
        simpleColumns
      );
      expect(preview).toEqual([]);
    });
  });

  describe('validateColumnEditorText', () => {
    it('returns invalid when text is empty', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText('', 'rename', simpleColumns);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Enter at least one column name');
    });

    it('returns invalid when duplicate column names exist', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'name\nname\nage',
        'rename',
        simpleColumns
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Duplicate column name: "name"');
    });

    it('returns invalid when rename mode has wrong number of lines', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'col1\ncol2',
        'rename',
        simpleColumns
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exactly 3 lines');
    });

    it('returns valid when rename mode has correct number of lines', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'col1\ncol2\ncol3',
        'rename',
        simpleColumns
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid when reorder mode has unknown column', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'name\nunknown\ncity',
        'reorder',
        simpleColumns
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown column: "unknown"');
    });

    it('returns invalid when reorder mode is missing columns', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'name\nage',
        'reorder',
        simpleColumns
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('all 3 columns');
    });

    it('returns valid when reorder mode has all columns', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'city\nage\nname',
        'reorder',
        simpleColumns
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid when select mode has unknown column', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'name\nunknown',
        'select',
        simpleColumns
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown column: "unknown"');
    });

    it('returns valid when select mode has valid subset of columns', () => {
      const result = ColumnEditorHandlers.validateColumnEditorText(
        'name\ncity',
        'select',
        simpleColumns
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('applyColumnEditorTransform', () => {
    const createMockCallbacks = () => ({
      onError: vi.fn(),
      onDialogClose: vi.fn(),
      runTransform: vi.fn().mockResolvedValue(true),
    });

    describe('pattern mode - select', () => {
      it('calls onError when pattern is empty', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'pattern',
          patternOperationMode: 'select',
          patternText: '',
          patternMatchType: 'prefix',
          columns: [],
          textValue: '',
          textSubMode: 'rename',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalledWith('Enter a pattern');
      });

      it('sets pattern error for invalid regex', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'pattern',
          patternOperationMode: 'select',
          patternText: '[invalid',
          patternMatchType: 'regex',
          columns: [],
          textValue: '',
          textSubMode: 'rename',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(DialogStore.activeDialogState.value?.patternError).toContain('Invalid regex');
      });
    });

    describe('pattern mode - remove', () => {
      it('calls onError when pattern is empty', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'pattern',
          patternOperationMode: 'remove',
          patternText: '',
          patternMatchType: 'prefix',
          columns: [],
          textValue: '',
          textSubMode: 'rename',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalledWith('Enter a pattern');
      });
    });

    describe('pattern mode - rename', () => {
      it('calls onError when find pattern is empty', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'pattern',
          patternOperationMode: 'rename',
          patternText: '',
          patternMatchType: 'prefix',
          columns: [],
          textValue: '',
          textSubMode: 'rename',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalledWith('Enter a find pattern');
      });

      it('sets pattern error for invalid regex in rename mode', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'pattern',
          patternOperationMode: 'rename',
          patternText: '',
          patternMatchType: 'prefix',
          columns: [],
          textValue: '',
          textSubMode: 'rename',
          patternFind: '[invalid',
          patternReplace: '',
          patternRegex: true,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(DialogStore.activeDialogState.value?.patternError).toContain('Invalid regex');
      });
    });

    describe('text mode', () => {
      it('calls onError when validation fails', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'text',
          textSubMode: 'rename',
          textValue: '',
          columns: [],
          patternOperationMode: 'select',
          patternText: '',
          patternMatchType: 'prefix',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalled();
      });

      it('closes dialog when no rename changes in rename mode', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'text',
          textSubMode: 'rename',
          textValue: 'name\nage\ncity',
          columns: [],
          patternOperationMode: 'select',
          patternText: '',
          patternMatchType: 'prefix',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onDialogClose).toHaveBeenCalledWith(true);
      });
    });

    describe('list mode', () => {
      it('closes dialog when no changes', async () => {
        const callbacks = createMockCallbacks();
        DialogStore.activeDialogState.value = {
          mode: 'list',
          textSubMode: 'rename',
          textValue: '',
          columns: simpleColumns.map((c) => ({ original: c, renamed: c, selected: true })),
          patternOperationMode: 'select',
          patternText: '',
          patternMatchType: 'prefix',
          patternFind: '',
          patternReplace: '',
          patternRegex: false,
          patternError: null,
        };

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onDialogClose).toHaveBeenCalledWith(true);
      });
    });
  });
});
