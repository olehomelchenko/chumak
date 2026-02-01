/**
 * Unit Tests for Column Editor Handlers
 *
 * Tests column selection, renaming, reordering, pattern matching,
 * and text mode editing functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { resetStores, setTestData, TestData, suppressConsole } from '../test-utils';
import * as ColumnEditorHandlers from './column-editor-handlers';

describe('column-editor-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  beforeEach(() => {
    resetStores();
    setTestData(TestData.simple);
    consoleSpy = suppressConsole();

    // Initialize column editor state
    const state = DialogStore.columnEditorState;
    state.columns.value = [
      { original: 'name', renamed: 'name', selected: true },
      { original: 'age', renamed: 'age', selected: true },
      { original: 'city', renamed: 'city', selected: true },
    ];
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';
    state.textValue.value = '';
    state.textError.value = null;
    state.patternText.value = '';
    state.patternMode.value = 'include';
    state.patternMatchType.value = 'prefix';
    state.draggedIndex.value = null;
    state.patternOperationMode.value = 'select';
    state.patternFind.value = '';
    state.patternReplace.value = '';
    state.patternRegex.value = false;
    state.patternError.value = null;
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('toggleColumnEditorColumn', () => {
    it('toggles column selection from selected to unselected', () => {
      expect(DialogStore.columnEditorState.columns.value[0].selected).toBe(true);

      ColumnEditorHandlers.toggleColumnEditorColumn(0);

      expect(DialogStore.columnEditorState.columns.value[0].selected).toBe(false);
    });

    it('toggles column selection from unselected to selected', () => {
      DialogStore.columnEditorState.columns.value[0].selected = false;

      ColumnEditorHandlers.toggleColumnEditorColumn(0);

      expect(DialogStore.columnEditorState.columns.value[0].selected).toBe(true);
    });

    it('does not affect other columns', () => {
      ColumnEditorHandlers.toggleColumnEditorColumn(0);

      expect(DialogStore.columnEditorState.columns.value[1].selected).toBe(true);
      expect(DialogStore.columnEditorState.columns.value[2].selected).toBe(true);
    });
  });

  describe('selectAllColumnEditor', () => {
    it('selects all columns', () => {
      // Deselect some columns first
      const state = DialogStore.columnEditorState;
      state.columns.value = state.columns.value.map((c) => ({ ...c, selected: false }));

      ColumnEditorHandlers.selectAllColumnEditor();

      expect(state.columns.value.every((c) => c.selected)).toBe(true);
    });

    it('preserves column order and rename values', () => {
      const state = DialogStore.columnEditorState;
      state.columns.value = [
        { original: 'name', renamed: 'full_name', selected: false },
        { original: 'age', renamed: 'years', selected: false },
        { original: 'city', renamed: 'city', selected: false },
      ];

      ColumnEditorHandlers.selectAllColumnEditor();

      expect(state.columns.value[0].renamed).toBe('full_name');
      expect(state.columns.value[1].renamed).toBe('years');
      expect(state.columns.value[0].original).toBe('name');
    });
  });

  describe('selectNoneColumnEditor', () => {
    it('deselects all columns', () => {
      ColumnEditorHandlers.selectNoneColumnEditor();

      const state = DialogStore.columnEditorState;
      expect(state.columns.value.every((c) => !c.selected)).toBe(true);
    });

    it('preserves column order and rename values', () => {
      const state = DialogStore.columnEditorState;
      state.columns.value = [
        { original: 'name', renamed: 'full_name', selected: true },
        { original: 'age', renamed: 'years', selected: true },
        { original: 'city', renamed: 'city', selected: true },
      ];

      ColumnEditorHandlers.selectNoneColumnEditor();

      expect(state.columns.value[0].renamed).toBe('full_name');
      expect(state.columns.value[1].renamed).toBe('years');
    });
  });

  describe('applyColumnEditorPattern', () => {
    it('does nothing when pattern is empty', () => {
      const state = DialogStore.columnEditorState;
      state.patternText.value = '';
      state.columns.value = state.columns.value.map((c) => ({ ...c, selected: false }));

      ColumnEditorHandlers.applyColumnEditorPattern();

      expect(state.columns.value.every((c) => !c.selected)).toBe(true);
    });

    it('selects columns matching prefix pattern in include mode', () => {
      const state = DialogStore.columnEditorState;
      state.patternText.value = 'na';
      state.patternMode.value = 'include';
      state.patternMatchType.value = 'prefix';
      state.columns.value = state.columns.value.map((c) => ({ ...c, selected: false }));

      ColumnEditorHandlers.applyColumnEditorPattern();

      expect(state.columns.value.find((c) => c.original === 'name')?.selected).toBe(true);
      expect(state.columns.value.find((c) => c.original === 'age')?.selected).toBe(false);
      expect(state.columns.value.find((c) => c.original === 'city')?.selected).toBe(false);
    });

    it('selects columns matching suffix pattern', () => {
      const state = DialogStore.columnEditorState;
      state.patternText.value = 'ty';
      state.patternMode.value = 'include';
      state.patternMatchType.value = 'suffix';
      state.columns.value = state.columns.value.map((c) => ({ ...c, selected: false }));

      ColumnEditorHandlers.applyColumnEditorPattern();

      expect(state.columns.value.find((c) => c.original === 'city')?.selected).toBe(true);
      expect(state.columns.value.find((c) => c.original === 'name')?.selected).toBe(false);
    });

    it('deselects matching columns in exclude mode', () => {
      const state = DialogStore.columnEditorState;
      state.patternText.value = 'name';
      state.patternMode.value = 'exclude';
      state.patternMatchType.value = 'exact';
      state.columns.value = state.columns.value.map((c) => ({ ...c, selected: true }));

      ColumnEditorHandlers.applyColumnEditorPattern();

      expect(state.columns.value.find((c) => c.original === 'name')?.selected).toBe(false);
      expect(state.columns.value.find((c) => c.original === 'age')?.selected).toBe(true);
    });

    it('is case insensitive', () => {
      const state = DialogStore.columnEditorState;
      state.patternText.value = 'NAME';
      state.patternMode.value = 'include';
      state.patternMatchType.value = 'exact';
      state.columns.value = state.columns.value.map((c) => ({ ...c, selected: false }));

      ColumnEditorHandlers.applyColumnEditorPattern();

      expect(state.columns.value.find((c) => c.original === 'name')?.selected).toBe(true);
    });
  });

  describe('handleColumnEditorDragStart', () => {
    it('sets dragged index', () => {
      const event = {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      } as unknown as DragEvent;

      ColumnEditorHandlers.handleColumnEditorDragStart(1, event);

      expect(DialogStore.columnEditorState.draggedIndex.value).toBe(1);
      expect(event.dataTransfer!.effectAllowed).toBe('move');
      expect(event.dataTransfer!.setData).toHaveBeenCalledWith('text/plain', '1');
    });

    it('handles missing dataTransfer', () => {
      const event = {} as DragEvent;

      // Should not throw
      expect(() => ColumnEditorHandlers.handleColumnEditorDragStart(1, event)).not.toThrow();
      expect(DialogStore.columnEditorState.draggedIndex.value).toBe(1);
    });
  });

  describe('handleColumnEditorDragOver', () => {
    it('prevents default and sets drop effect', () => {
      const event = {
        preventDefault: vi.fn(),
        dataTransfer: {
          dropEffect: '',
        },
      } as unknown as DragEvent;

      ColumnEditorHandlers.handleColumnEditorDragOver(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.dataTransfer!.dropEffect).toBe('move');
    });
  });

  describe('handleColumnEditorDrop', () => {
    it('reorders columns when dropped at different position', () => {
      DialogStore.columnEditorState.draggedIndex.value = 0;

      ColumnEditorHandlers.handleColumnEditorDrop(2);

      // When dragging from index 0 to index 2:
      // [name, age, city] -> remove name -> [age, city] -> insert at 2 -> [age, city, name]
      const cols = DialogStore.columnEditorState.columns.value;
      expect(cols[0].original).toBe('age');
      expect(cols[1].original).toBe('city');
      expect(cols[2].original).toBe('name');
      expect(DialogStore.columnEditorState.draggedIndex.value).toBeNull();
    });

    it('does nothing when dropped at same position', () => {
      DialogStore.columnEditorState.draggedIndex.value = 1;

      ColumnEditorHandlers.handleColumnEditorDrop(1);

      const cols = DialogStore.columnEditorState.columns.value;
      expect(cols[0].original).toBe('name');
      expect(cols[1].original).toBe('age');
      expect(cols[2].original).toBe('city');
    });

    it('does nothing when dragged index is null', () => {
      DialogStore.columnEditorState.draggedIndex.value = null;

      ColumnEditorHandlers.handleColumnEditorDrop(2);

      const cols = DialogStore.columnEditorState.columns.value;
      expect(cols[0].original).toBe('name');
    });
  });

  describe('handleColumnEditorDragEnd', () => {
    it('clears dragged index', () => {
      DialogStore.columnEditorState.draggedIndex.value = 1;

      ColumnEditorHandlers.handleColumnEditorDragEnd();

      expect(DialogStore.columnEditorState.draggedIndex.value).toBeNull();
    });
  });

  describe('switchColumnEditorToText', () => {
    it('populates text value with renamed names in rename mode', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'rename';
      state.columns.value = [
        { original: 'name', renamed: 'full_name', selected: true },
        { original: 'age', renamed: 'years', selected: true },
        { original: 'city', renamed: 'city', selected: true },
      ];

      ColumnEditorHandlers.switchColumnEditorToText();

      expect(state.textValue.value).toBe('full_name\nyears\ncity');
      expect(state.mode.value).toBe('text');
      expect(state.textError.value).toBeNull();
    });

    it('populates text value with selected column names in reorder mode', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'reorder';
      state.columns.value = [
        { original: 'name', renamed: 'name', selected: true },
        { original: 'age', renamed: 'age', selected: false },
        { original: 'city', renamed: 'city', selected: true },
      ];

      ColumnEditorHandlers.switchColumnEditorToText();

      expect(state.textValue.value).toBe('name\ncity');
      expect(state.mode.value).toBe('text');
    });

    it('populates text value with selected column names in select mode', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'select';
      state.columns.value = [
        { original: 'name', renamed: 'name', selected: true },
        { original: 'age', renamed: 'age', selected: true },
        { original: 'city', renamed: 'city', selected: false },
      ];

      ColumnEditorHandlers.switchColumnEditorToText();

      expect(state.textValue.value).toBe('name\nage');
    });
  });

  describe('validateColumnEditorText', () => {
    it('returns false when text is empty', () => {
      const state = DialogStore.columnEditorState;
      state.textValue.value = '';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(false);
      expect(state.textError.value).toBe('Please enter at least one column name');
    });

    it('returns false when duplicate column names exist', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'rename';
      state.textValue.value = 'name\nname\nage';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(false);
      expect(state.textError.value).toBe('Duplicate column name: "name"');
    });

    it('returns false when rename mode has wrong number of lines', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'rename';
      state.textValue.value = 'col1\ncol2'; // Only 2 lines but we have 3 columns

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(false);
      expect(state.textError.value).toContain('exactly 3 lines');
    });

    it('returns true when rename mode has correct number of lines', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'rename';
      state.textValue.value = 'col1\ncol2\ncol3';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(true);
      expect(state.textError.value).toBeNull();
    });

    it('returns false when reorder mode has unknown column', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'reorder';
      state.textValue.value = 'name\nunknown\ncity';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(false);
      expect(state.textError.value).toBe('Unknown column: "unknown"');
    });

    it('returns false when reorder mode is missing columns', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'reorder';
      state.textValue.value = 'name\nage'; // Missing city

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(false);
      expect(state.textError.value).toContain('all 3 columns');
    });

    it('returns true when reorder mode has all columns', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'reorder';
      state.textValue.value = 'city\nage\nname';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(true);
      expect(state.textError.value).toBeNull();
    });

    it('returns false when select mode has unknown column', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'select';
      state.textValue.value = 'name\nunknown';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(false);
      expect(state.textError.value).toBe('Unknown column: "unknown"');
    });

    it('returns true when select mode has valid subset of columns', () => {
      const state = DialogStore.columnEditorState;
      state.textSubMode.value = 'select';
      state.textValue.value = 'name\ncity';

      const result = ColumnEditorHandlers.validateColumnEditorText();

      expect(result).toBe(true);
      expect(state.textError.value).toBeNull();
    });
  });

  describe('getColumnEditorChanges', () => {
    describe('list mode', () => {
      it('returns no changes when nothing has changed', () => {
        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(false);
        expect(changes.removed).toEqual([]);
        expect(changes.renamed).toEqual([]);
        expect(changes.reordered).toBe(false);
      });

      it('detects removed columns', () => {
        DialogStore.columnEditorState.columns.value[1].selected = false;

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(true);
        expect(changes.removed).toEqual(['age']);
      });

      it('detects renamed columns', () => {
        DialogStore.columnEditorState.columns.value[0].renamed = 'full_name';

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(true);
        expect(changes.renamed).toEqual([{ from: 'name', to: 'full_name' }]);
      });

      it('detects reordered columns', () => {
        DialogStore.columnEditorState.columns.value = [
          { original: 'age', renamed: 'age', selected: true },
          { original: 'name', renamed: 'name', selected: true },
          { original: 'city', renamed: 'city', selected: true },
        ];

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(true);
        expect(changes.reordered).toBe(true);
      });

      it('ignores empty renamed values', () => {
        DialogStore.columnEditorState.columns.value[0].renamed = '';

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.renamed).toEqual([]);
      });

      it('ignores whitespace-only renamed values', () => {
        DialogStore.columnEditorState.columns.value[0].renamed = '   ';

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.renamed).toEqual([]);
      });
    });

    describe('text mode', () => {
      beforeEach(() => {
        DialogStore.columnEditorState.mode.value = 'text';
      });

      it('detects renames in rename sub-mode', () => {
        const state = DialogStore.columnEditorState;
        state.textSubMode.value = 'rename';
        state.textValue.value = 'full_name\nage\ncity';

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(true);
        expect(changes.renamed).toEqual([{ from: 'name', to: 'full_name' }]);
      });

      it('detects reorder in reorder sub-mode', () => {
        const state = DialogStore.columnEditorState;
        state.textSubMode.value = 'reorder';
        state.textValue.value = 'city\nage\nname';

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(true);
        expect(changes.reordered).toBe(true);
      });

      it('detects removed columns in select sub-mode', () => {
        const state = DialogStore.columnEditorState;
        state.textSubMode.value = 'select';
        state.textValue.value = 'name\ncity';

        const changes = ColumnEditorHandlers.getColumnEditorChanges();

        expect(changes.hasChanges).toBe(true);
        expect(changes.removed).toEqual(['age']);
      });
    });
  });

  describe('getPatternMatchedColumns', () => {
    it('returns empty array when pattern is empty', () => {
      DialogStore.columnEditorState.patternText.value = '';

      const matched = ColumnEditorHandlers.getPatternMatchedColumns('select');

      expect(matched).toEqual([]);
    });

    it('matches columns with prefix pattern', () => {
      DialogStore.columnEditorState.patternText.value = 'na';
      DialogStore.columnEditorState.patternMatchType.value = 'prefix';

      const matched = ColumnEditorHandlers.getPatternMatchedColumns('select');

      expect(matched).toContain('name');
      expect(matched).not.toContain('age');
    });

    it('matches columns with suffix pattern', () => {
      DialogStore.columnEditorState.patternText.value = 'ty';
      DialogStore.columnEditorState.patternMatchType.value = 'suffix';

      const matched = ColumnEditorHandlers.getPatternMatchedColumns('select');

      expect(matched).toContain('city');
      expect(matched).not.toContain('name');
    });

    it('matches columns with contains pattern', () => {
      DialogStore.columnEditorState.patternText.value = 'a';
      DialogStore.columnEditorState.patternMatchType.value = 'contains';

      const matched = ColumnEditorHandlers.getPatternMatchedColumns('select');

      expect(matched).toContain('name');
      expect(matched).toContain('age');
      expect(matched).not.toContain('city');
    });

    it('matches columns with regex pattern', () => {
      DialogStore.columnEditorState.patternText.value = '^[nc]';
      DialogStore.columnEditorState.patternMatchType.value = 'regex';

      const matched = ColumnEditorHandlers.getPatternMatchedColumns('select');

      expect(matched).toContain('name');
      expect(matched).toContain('city');
      expect(matched).not.toContain('age');
    });

    it('returns empty array for invalid regex', () => {
      DialogStore.columnEditorState.patternText.value = '[invalid';
      DialogStore.columnEditorState.patternMatchType.value = 'regex';

      const matched = ColumnEditorHandlers.getPatternMatchedColumns('select');

      expect(matched).toEqual([]);
    });
  });

  describe('getPatternRenamePreview', () => {
    it('returns empty array when find pattern is empty', () => {
      DialogStore.columnEditorState.patternFind.value = '';

      const preview = ColumnEditorHandlers.getPatternRenamePreview();

      expect(preview).toEqual([]);
    });

    it('returns rename preview for text pattern', () => {
      DialogStore.columnEditorState.patternFind.value = 'name';
      DialogStore.columnEditorState.patternReplace.value = 'title';
      DialogStore.columnEditorState.patternRegex.value = false;

      const preview = ColumnEditorHandlers.getPatternRenamePreview();

      expect(preview).toEqual([{ from: 'name', to: 'title' }]);
    });

    it('returns rename preview for regex pattern', () => {
      DialogStore.columnEditorState.patternFind.value = 'e$';
      DialogStore.columnEditorState.patternReplace.value = '_col';
      DialogStore.columnEditorState.patternRegex.value = true;

      const preview = ColumnEditorHandlers.getPatternRenamePreview();

      expect(preview).toContainEqual({ from: 'name', to: 'nam_col' });
      expect(preview).toContainEqual({ from: 'age', to: 'ag_col' });
    });

    it('returns empty array for invalid regex', () => {
      DialogStore.columnEditorState.patternFind.value = '[invalid';
      DialogStore.columnEditorState.patternRegex.value = true;

      const preview = ColumnEditorHandlers.getPatternRenamePreview();

      expect(preview).toEqual([]);
    });

    it('excludes columns that would not change', () => {
      DialogStore.columnEditorState.patternFind.value = 'xyz';
      DialogStore.columnEditorState.patternReplace.value = 'abc';
      DialogStore.columnEditorState.patternRegex.value = false;

      const preview = ColumnEditorHandlers.getPatternRenamePreview();

      expect(preview).toEqual([]);
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
        const state = DialogStore.columnEditorState;
        state.mode.value = 'pattern';
        state.patternOperationMode.value = 'select';
        state.patternText.value = '';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalledWith('Please enter a pattern');
      });

      it('sets pattern error for invalid regex', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'pattern';
        state.patternOperationMode.value = 'select';
        state.patternText.value = '[invalid';
        state.patternMatchType.value = 'regex';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(state.patternError.value).toContain('Invalid regex');
      });
    });

    describe('pattern mode - remove', () => {
      it('calls onError when pattern is empty', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'pattern';
        state.patternOperationMode.value = 'remove';
        state.patternText.value = '';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalledWith('Please enter a pattern');
      });
    });

    describe('pattern mode - rename', () => {
      it('calls onError when find pattern is empty', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'pattern';
        state.patternOperationMode.value = 'rename';
        state.patternFind.value = '';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalledWith('Please enter a find pattern');
      });

      it('sets pattern error for invalid regex in rename mode', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'pattern';
        state.patternOperationMode.value = 'rename';
        state.patternFind.value = '[invalid';
        state.patternRegex.value = true;

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(state.patternError.value).toContain('Invalid regex');
      });
    });

    describe('text mode', () => {
      it('calls onError when validation fails', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'text';
        state.textSubMode.value = 'rename';
        state.textValue.value = '';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onError).toHaveBeenCalled();
      });

      it('closes dialog when no rename changes in rename mode', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'text';
        state.textSubMode.value = 'rename';
        state.textValue.value = 'name\nage\ncity';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onDialogClose).toHaveBeenCalledWith(true);
      });
    });

    describe('list mode', () => {
      it('closes dialog when no changes', async () => {
        const callbacks = createMockCallbacks();
        const state = DialogStore.columnEditorState;
        state.mode.value = 'list';

        await ColumnEditorHandlers.applyColumnEditorTransform(callbacks);

        expect(callbacks.onDialogClose).toHaveBeenCalledWith(true);
      });
    });
  });
});
