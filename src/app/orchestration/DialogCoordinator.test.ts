import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';

vi.mock('./UrlStateSync', () => ({
  syncDialogToUrl: vi.fn(),
  clearDialogFromUrl: vi.fn(),
}));

vi.mock('../handlers/transform/date-handlers', () => ({
  getDateColumns: vi.fn().mockReturnValue([]),
  clearDatePreview: vi.fn(),
}));

vi.mock('../handlers/transform/parse-date-handlers', () => ({
  getStringColumns: vi.fn().mockReturnValue([]),
  clearParseDatePreview: vi.fn(),
}));

import {
  getDialogState,
  activeDialogHasError,
  hasUnsavedChanges,
  snapshotDialogState,
  hasPreviewData,
  getPreviewTitle,
  isNewPreviewColumn,
  clearPreview,
} from './DialogCoordinator';

describe('DialogCoordinator', () => {
  beforeEach(() => {
    AppStore.reset();
    DialogStore.resetAll();
  });

  // ──────────────────────────────────────────────
  // getDialogState
  // ──────────────────────────────────────────────
  describe('getDialogState', () => {
    it('returns null for unknown dialog', () => {
      expect(getDialogState('nonexistent')).toBeNull();
    });

    it('returns filter state', () => {
      DialogStore.filterState.expression.value = 'age > 30';
      DialogStore.filterState.previewMode.value = 'matching';

      const state = getDialogState('filter');
      expect(state).toEqual({ expression: 'age > 30', previewMode: 'matching' });
    });

    it('returns derive state', () => {
      DialogStore.deriveState.columnName.value = 'full_name';
      DialogStore.deriveState.expression.value = 'first + " " + last';

      const state = getDialogState('derive');
      expect(state).toEqual({ columnName: 'full_name', expression: 'first + " " + last' });
    });

    it('returns sliceRows state from bridge signal', () => {
      // sliceRows uses useDialogState hook — state comes from bridge signal
      DialogStore.activeDialogState.value = { count: 50, mode: 'last' };

      const state = getDialogState('sliceRows');
      expect(state).toEqual({ count: 50, mode: 'last' });
    });

    it('returns index state from bridge signal', () => {
      // index uses useDialogState hook — state comes from bridge signal
      DialogStore.activeDialogState.value = { columnName: 'row_num', startFrom: 0 };

      const state = getDialogState('index');
      expect(state).toEqual({ columnName: 'row_num', startFrom: 0 });
    });

    it('returns aggregate state', () => {
      DialogStore.aggregateState.groupBy.value = ['category'];
      DialogStore.aggregateState.aggregations.value = [
        { output: 'total', func: 'sum', col: 'amount' },
      ];

      const state = getDialogState('aggregate');
      expect(state.groupBy).toEqual(['category']);
      expect(state.aggregations).toHaveLength(1);
    });

    it('returns join state', () => {
      DialogStore.joinState.rightModel.value = 'mdl_2';
      DialogStore.joinState.joinType.value = 'left';
      DialogStore.joinState.keyPairs.value = [['id', 'employee_id']];
      DialogStore.joinState.suffixes.value = ['_left', '_right'];

      const state = getDialogState('join');
      expect(state).toEqual({
        rightModel: 'mdl_2',
        joinType: 'left',
        keyPairs: [['id', 'employee_id']],
        suffixes: ['_left', '_right'],
      });
    });

    it('returns fold state', () => {
      DialogStore.foldState.keyName.value = 'metric';
      DialogStore.foldState.valueName.value = 'value';
      DialogStore.foldState.selectedColumns.value = [true, false, true];
      DialogStore.foldState.mode.value = 'keep';

      const state = getDialogState('fold');
      expect(state.keyName).toBe('metric');
      expect(state.selectedColumns).toEqual([true, false, true]);
    });

    it('returns pivot state', () => {
      DialogStore.pivotState.rowColumns.value = ['date'];
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = 'amount';
      DialogStore.pivotState.aggregation.value = 'sum';

      const state = getDialogState('pivot');
      expect(state.rowColumns).toEqual(['date']);
      expect(state.columnColumn).toBe('category');
    });

    it('returns sort state from bridge signal', () => {
      // sort uses useDialogState hook — state comes from bridge signal
      DialogStore.activeDialogState.value = { fields: [{ field: 'name', order: 'desc' }] };

      const state = getDialogState('sort');
      expect(state).toEqual({ fields: [{ field: 'name', order: 'desc' }] });
    });

    it('returns sample state from bridge signal', () => {
      // sample uses useDialogState hook — state comes from bridge signal
      DialogStore.activeDialogState.value = { count: 50, seed: 42 };

      const state = getDialogState('sample');
      expect(state).toEqual({ count: 50, seed: 42 });
    });

    it('returns spread state', () => {
      DialogStore.spreadState.column.value = 'tags';
      DialogStore.spreadState.limit.value = 5;
      DialogStore.spreadState.keepOriginal.value = true;

      const state = getDialogState('spread');
      expect(state).toEqual({ column: 'tags', limit: 5, keepOriginal: true });
    });

    it('returns unroll state', () => {
      DialogStore.unrollState.column.value = 'items';
      DialogStore.unrollState.indices.value = true;
      DialogStore.unrollState.keepOriginal.value = false;

      const state = getDialogState('unroll');
      expect(state).toEqual({ column: 'items', indices: true, keepOriginal: false });
    });

    // replace: state now managed by useDialogState bridge signals

    it('returns split state', () => {
      DialogStore.splitState.column.value = 'name';
      DialogStore.splitState.delimiter.value = ',';
      DialogStore.splitState.isRegex.value = false;
      DialogStore.splitState.mode.value = 'spread';
      DialogStore.splitState.maxColumns.value = 10;

      const state = getDialogState('split');
      expect(state).toEqual({
        column: 'name',
        delimiter: ',',
        isRegex: false,
        mode: 'spread',
        maxColumns: 10,
      });
    });

    it('returns merge state', () => {
      DialogStore.mergeState.columns.value = ['first', 'last'];
      DialogStore.mergeState.separator.value = ' ';
      DialogStore.mergeState.columnName.value = 'full_name';
      DialogStore.mergeState.removeOriginal.value = true;

      const state = getDialogState('merge');
      expect(state).toEqual({
        columns: ['first', 'last'],
        separator: ' ',
        columnName: 'full_name',
        removeOriginal: true,
      });
    });

    // regexpMatch, regexpExtract: state now managed by useDialogState bridge signals

    it('returns import-csv state', () => {
      DialogStore.importCsvState.sourceName.value = 'sales.csv';
      DialogStore.importCsvState.headerMode.value = 'first-row';
      DialogStore.importCsvState.delimiter.value = ',';

      const state = getDialogState('import-csv');
      expect(state).toEqual({
        sourceName: 'sales.csv',
        headerMode: 'first-row',
        delimiter: ',',
        selectedSheetIndex: 0,
      });
    });

    it('returns import-url state', () => {
      DialogStore.importUrlState.url.value = 'https://example.com/data.csv';

      const state = getDialogState('import-url');
      expect(state).toEqual({ url: 'https://example.com/data.csv' });
    });

    it('returns generate state', () => {
      DialogStore.generateState.sourceName.value = 'generated';
      DialogStore.generateState.rowCount.value = 100;
      DialogStore.generateState.columnName.value = 'id';
      DialogStore.generateState.type.value = 'sequential';

      const state = getDialogState('generate');
      expect(state.sourceName).toBe('generated');
      expect(state.rowCount).toBe(100);
    });

    it('returns dedupe state', () => {
      DialogStore.dedupeState.selectedColumns.value = [true, false, true];
      DialogStore.dedupeState.useAllColumns.value = false;
      DialogStore.dedupeState.mode.value = 'keep';

      const state = getDialogState('dedupe');
      expect(state).toEqual({
        selectedColumns: [true, false, true],
        useAllColumns: false,
        mode: 'keep',
      });
    });

    it('returns column-editor state', () => {
      const cols = [{ original: 'a', renamed: 'b', selected: true }];
      DialogStore.columnEditorState.columns.value = cols;

      const state = getDialogState('column-editor');
      expect(state).toEqual(cols);
    });

    it('returns impute state', () => {
      DialogStore.imputeState.column.value = 'salary';
      DialogStore.imputeState.strategy.value = 'mean';
      DialogStore.imputeState.value.value = '';

      const state = getDialogState('impute');
      expect(state).toEqual({ column: 'salary', strategy: 'mean', value: '' });
    });

    it('returns null for settings (changes applied immediately)', () => {
      const state = getDialogState('settings');
      expect(state).toBeNull();
    });

    it('returns append state', () => {
      DialogStore.appendState.targetModel.value = 'mdl_2';
      DialogStore.appendState.removeDuplicates.value = true;

      const state = getDialogState('append');
      expect(state).toEqual({ targetModel: 'mdl_2', removeDuplicates: true });
    });
  });

  // ──────────────────────────────────────────────
  // activeDialogHasError
  // ──────────────────────────────────────────────
  describe('activeDialogHasError', () => {
    it('returns false when no dialog is active', () => {
      AppStore.activeDialog.value = null;
      expect(activeDialogHasError()).toBe(false);
    });

    it('returns false for unknown dialog', () => {
      AppStore.activeDialog.value = 'nonexistent' as any;
      expect(activeDialogHasError()).toBe(false);
    });

    // filter
    it('filter: returns true when error present', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.filterState.error.value = 'Syntax error';
      expect(activeDialogHasError()).toBe(true);
    });

    it('filter: returns false when no error', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.filterState.error.value = null;
      expect(activeDialogHasError()).toBe(false);
    });

    // derive
    it('derive: returns true when error present', () => {
      AppStore.activeDialog.value = 'derive';
      DialogStore.deriveState.error.value = 'Bad expression';
      DialogStore.deriveState.columnName.value = 'col';
      DialogStore.deriveState.expression.value = 'x + 1';
      expect(activeDialogHasError()).toBe(true);
    });

    it('derive: returns true when columnName empty', () => {
      AppStore.activeDialog.value = 'derive';
      DialogStore.deriveState.error.value = null;
      DialogStore.deriveState.columnName.value = '';
      DialogStore.deriveState.expression.value = 'x + 1';
      expect(activeDialogHasError()).toBe(true);
    });

    it('derive: returns true when expression empty', () => {
      AppStore.activeDialog.value = 'derive';
      DialogStore.deriveState.error.value = null;
      DialogStore.deriveState.columnName.value = 'col';
      DialogStore.deriveState.expression.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('derive: returns false when all valid', () => {
      AppStore.activeDialog.value = 'derive';
      DialogStore.deriveState.error.value = null;
      DialogStore.deriveState.columnName.value = 'col';
      DialogStore.deriveState.expression.value = 'x + 1';
      expect(activeDialogHasError()).toBe(false);
    });

    // sliceRows (uses bridge signals from useDialogState hook)
    it('sliceRows: returns true when bridge hasError is true', () => {
      AppStore.activeDialog.value = 'sliceRows';
      DialogStore.activeDialogHasError.value = true;
      expect(activeDialogHasError()).toBe(true);
    });

    it('sliceRows: returns false when bridge hasError is false', () => {
      AppStore.activeDialog.value = 'sliceRows';
      DialogStore.activeDialogHasError.value = false;
      expect(activeDialogHasError()).toBe(false);
    });

    // index (uses bridge signals from useDialogState hook)
    it('index: returns true when bridge hasError is true', () => {
      AppStore.activeDialog.value = 'index';
      DialogStore.activeDialogHasError.value = true;
      expect(activeDialogHasError()).toBe(true);
    });

    it('index: returns false when bridge hasError is false', () => {
      AppStore.activeDialog.value = 'index';
      DialogStore.activeDialogHasError.value = false;
      expect(activeDialogHasError()).toBe(false);
    });

    // sample (uses bridge signals from useDialogState hook)
    it('sample: returns true when bridge hasError is true', () => {
      AppStore.activeDialog.value = 'sample';
      DialogStore.activeDialogHasError.value = true;
      expect(activeDialogHasError()).toBe(true);
    });

    it('sample: returns false when bridge hasError is false', () => {
      AppStore.activeDialog.value = 'sample';
      DialogStore.activeDialogHasError.value = false;
      expect(activeDialogHasError()).toBe(false);
    });

    // spread
    it('spread: returns true when column is empty', () => {
      AppStore.activeDialog.value = 'spread';
      DialogStore.spreadState.column.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('spread: returns false when column is set', () => {
      AppStore.activeDialog.value = 'spread';
      DialogStore.spreadState.column.value = 'tags';
      expect(activeDialogHasError()).toBe(false);
    });

    // unroll
    it('unroll: returns true when column is empty', () => {
      AppStore.activeDialog.value = 'unroll';
      DialogStore.unrollState.column.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('unroll: returns false when column is set', () => {
      AppStore.activeDialog.value = 'unroll';
      DialogStore.unrollState.column.value = 'items';
      expect(activeDialogHasError()).toBe(false);
    });

    // merge
    it('merge: returns true when no columns selected', () => {
      AppStore.activeDialog.value = 'merge';
      DialogStore.mergeState.error.value = null;
      DialogStore.mergeState.columns.value = [];
      DialogStore.mergeState.columnName.value = 'merged';
      expect(activeDialogHasError()).toBe(true);
    });

    it('merge: returns true when columnName is empty', () => {
      AppStore.activeDialog.value = 'merge';
      DialogStore.mergeState.error.value = null;
      DialogStore.mergeState.columns.value = ['a', 'b'];
      DialogStore.mergeState.columnName.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('merge: returns false when valid', () => {
      AppStore.activeDialog.value = 'merge';
      DialogStore.mergeState.error.value = null;
      DialogStore.mergeState.columns.value = ['a', 'b'];
      DialogStore.mergeState.columnName.value = 'merged';
      expect(activeDialogHasError()).toBe(false);
    });

    // join
    it('join: returns true when no right model', () => {
      AppStore.activeDialog.value = 'join';
      DialogStore.joinState.rightModel.value = '';
      DialogStore.joinState.joinType.value = 'inner';
      DialogStore.joinState.keyPairs.value = [['id', 'id']];
      expect(activeDialogHasError()).toBe(true);
    });

    it('join: returns true when no valid key pairs', () => {
      AppStore.activeDialog.value = 'join';
      DialogStore.joinState.rightModel.value = 'mdl_2';
      DialogStore.joinState.joinType.value = 'inner';
      DialogStore.joinState.keyPairs.value = [['', '']];
      expect(activeDialogHasError()).toBe(true);
    });

    it('join: returns false for cross join without key pairs', () => {
      AppStore.activeDialog.value = 'join';
      DialogStore.joinState.rightModel.value = 'mdl_2';
      DialogStore.joinState.joinType.value = 'cross';
      DialogStore.joinState.keyPairs.value = [];
      expect(activeDialogHasError()).toBe(false);
    });

    // append
    it('append: returns true when no target model', () => {
      AppStore.activeDialog.value = 'append';
      DialogStore.appendState.targetModel.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('append: returns false when target model set', () => {
      AppStore.activeDialog.value = 'append';
      DialogStore.appendState.targetModel.value = 'mdl_2';
      expect(activeDialogHasError()).toBe(false);
    });

    // pivot
    it('pivot: returns true when columnColumn is missing', () => {
      AppStore.activeDialog.value = 'pivot';
      DialogStore.pivotState.columnColumn.value = '';
      DialogStore.pivotState.valueColumn.value = 'amount';
      expect(activeDialogHasError()).toBe(true);
    });

    it('pivot: returns true when valueColumn is missing', () => {
      AppStore.activeDialog.value = 'pivot';
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('pivot: returns false when both set', () => {
      AppStore.activeDialog.value = 'pivot';
      DialogStore.pivotState.columnColumn.value = 'category';
      DialogStore.pivotState.valueColumn.value = 'amount';
      expect(activeDialogHasError()).toBe(false);
    });

    // dedupe
    it('dedupe: returns true when not using all columns and none selected', () => {
      AppStore.activeDialog.value = 'dedupe';
      DialogStore.dedupeState.useAllColumns.value = false;
      DialogStore.dedupeState.selectedColumns.value = [false, false];
      expect(activeDialogHasError()).toBe(true);
    });

    it('dedupe: returns false when using all columns', () => {
      AppStore.activeDialog.value = 'dedupe';
      DialogStore.dedupeState.useAllColumns.value = true;
      DialogStore.dedupeState.selectedColumns.value = [false, false];
      expect(activeDialogHasError()).toBe(false);
    });

    it('dedupe: returns false when some columns selected', () => {
      AppStore.activeDialog.value = 'dedupe';
      DialogStore.dedupeState.useAllColumns.value = false;
      DialogStore.dedupeState.selectedColumns.value = [true, false];
      expect(activeDialogHasError()).toBe(false);
    });

    // import-url
    it('import-url: returns true when url is empty', () => {
      AppStore.activeDialog.value = 'import-url';
      DialogStore.importUrlState.url.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('import-url: returns true when fetching', () => {
      AppStore.activeDialog.value = 'import-url';
      DialogStore.importUrlState.url.value = 'https://example.com';
      DialogStore.importUrlState.isFetching.value = true;
      expect(activeDialogHasError()).toBe(true);
    });

    it('import-url: returns false when url set and not fetching', () => {
      AppStore.activeDialog.value = 'import-url';
      DialogStore.importUrlState.url.value = 'https://example.com';
      DialogStore.importUrlState.isFetching.value = false;
      expect(activeDialogHasError()).toBe(false);
    });

    // impute
    it('impute: returns true when no column selected', () => {
      AppStore.activeDialog.value = 'impute';
      DialogStore.imputeState.column.value = '';
      DialogStore.imputeState.strategy.value = 'mean';
      expect(activeDialogHasError()).toBe(true);
    });

    it('impute: returns true when constant strategy with empty value', () => {
      AppStore.activeDialog.value = 'impute';
      DialogStore.imputeState.column.value = 'salary';
      DialogStore.imputeState.strategy.value = 'constant';
      DialogStore.imputeState.value.value = '';
      expect(activeDialogHasError()).toBe(true);
    });

    it('impute: returns false when constant strategy with value', () => {
      AppStore.activeDialog.value = 'impute';
      DialogStore.imputeState.column.value = 'salary';
      DialogStore.imputeState.strategy.value = 'constant';
      DialogStore.imputeState.value.value = '0';
      expect(activeDialogHasError()).toBe(false);
    });

    it('impute: returns false for non-constant strategy without value', () => {
      AppStore.activeDialog.value = 'impute';
      DialogStore.imputeState.column.value = 'salary';
      DialogStore.imputeState.strategy.value = 'mean';
      DialogStore.imputeState.value.value = '';
      expect(activeDialogHasError()).toBe(false);
    });

    // regexpMatch / regexpExtract / split error signals
    it('regexpMatch: returns true when bridge error present', () => {
      AppStore.activeDialog.value = 'regexpMatch';
      DialogStore.activeDialogHasError.value = true;
      expect(activeDialogHasError()).toBe(true);
    });

    it('regexpMatch: returns false when no bridge error', () => {
      AppStore.activeDialog.value = 'regexpMatch';
      DialogStore.activeDialogHasError.value = false;
      expect(activeDialogHasError()).toBe(false);
    });

    it('regexpExtract: returns true when bridge error present', () => {
      AppStore.activeDialog.value = 'regexpExtract';
      DialogStore.activeDialogHasError.value = true;
      expect(activeDialogHasError()).toBe(true);
    });

    it('split: returns true when error present', () => {
      AppStore.activeDialog.value = 'split';
      DialogStore.splitState.error.value = 'Invalid delimiter';
      expect(activeDialogHasError()).toBe(true);
    });

    it('split: returns false when no error', () => {
      AppStore.activeDialog.value = 'split';
      DialogStore.splitState.error.value = null;
      expect(activeDialogHasError()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // hasUnsavedChanges
  // ──────────────────────────────────────────────
  describe('hasUnsavedChanges', () => {
    it('returns false when no dialog is active', () => {
      AppStore.activeDialog.value = null;
      expect(hasUnsavedChanges()).toBe(false);
    });

    it('returns false when no snapshot exists', () => {
      AppStore.activeDialog.value = 'filter';
      AppStore.dialogSnapshot.value = null;
      expect(hasUnsavedChanges()).toBe(false);
    });

    it('returns false when state matches snapshot', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.filterState.expression.value = 'age > 30';
      DialogStore.filterState.previewMode.value = 'all';
      snapshotDialogState();

      expect(hasUnsavedChanges()).toBe(false);
    });

    it('returns true when state differs from snapshot', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.filterState.expression.value = 'age > 30';
      DialogStore.filterState.previewMode.value = 'all';
      snapshotDialogState();

      DialogStore.filterState.expression.value = 'age > 50';
      expect(hasUnsavedChanges()).toBe(true);
    });

    it('returns false for unknown dialog with snapshot', () => {
      AppStore.activeDialog.value = 'nonexistent' as any;
      AppStore.dialogSnapshot.value = '{}';
      expect(hasUnsavedChanges()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // snapshotDialogState
  // ──────────────────────────────────────────────
  describe('snapshotDialogState', () => {
    it('captures current dialog state as JSON', () => {
      // sort uses bridge signal — set it directly for this unit test
      AppStore.activeDialog.value = 'sort';
      DialogStore.activeDialogState.value = { fields: [{ field: 'name', order: 'desc' }] };

      snapshotDialogState();

      expect(AppStore.dialogSnapshot.value).toBe(
        JSON.stringify({ fields: [{ field: 'name', order: 'desc' }] })
      );
    });

    it('does nothing when no dialog is active', () => {
      AppStore.activeDialog.value = null;
      AppStore.dialogSnapshot.value = null;

      snapshotDialogState();

      expect(AppStore.dialogSnapshot.value).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // hasPreviewData
  // ──────────────────────────────────────────────
  describe('hasPreviewData', () => {
    it('returns false when no preview rows', () => {
      DialogStore.previewState.rows.value = [];
      expect(hasPreviewData()).toBe(false);
    });

    it('returns true when preview rows exist', () => {
      DialogStore.previewState.rows.value = [{ a: 1 }];
      expect(hasPreviewData()).toBe(true);
    });

    it('checks importCsvState for import-csv dialog', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewDataRows.value = [['a', 'b']];
      expect(hasPreviewData()).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // getPreviewTitle
  // ──────────────────────────────────────────────
  describe('getPreviewTitle', () => {
    it('returns "Import Preview" for import-csv dialog', () => {
      AppStore.activeDialog.value = 'import-csv';
      expect(getPreviewTitle()).toBe('Import Preview');
    });

    it('returns previewState title for other dialogs', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.previewState.title.value = 'Filter Preview';
      expect(getPreviewTitle()).toBe('Filter Preview');
    });
  });

  // ──────────────────────────────────────────────
  // isNewPreviewColumn
  // ──────────────────────────────────────────────
  describe('isNewPreviewColumn', () => {
    it('returns true for columns in newColumns list', () => {
      DialogStore.previewState.newColumns.value = ['derived_col'];
      expect(isNewPreviewColumn('derived_col')).toBe(true);
    });

    it('returns false for columns not in newColumns list', () => {
      DialogStore.previewState.newColumns.value = ['derived_col'];
      expect(isNewPreviewColumn('original_col')).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // clearPreview
  // ──────────────────────────────────────────────
  describe('clearPreview', () => {
    it('clears all preview state', () => {
      DialogStore.previewState.title.value = 'Preview';
      DialogStore.previewState.stats.value = '3 rows';
      DialogStore.previewState.columns.value = ['a', 'b'];
      DialogStore.previewState.newColumns.value = ['b'];
      DialogStore.previewState.rows.value = [{ a: 1, b: 2 }];

      clearPreview();

      expect(DialogStore.previewState.title.value).toBe('');
      expect(DialogStore.previewState.stats.value).toBe('');
      expect(DialogStore.previewState.columns.value).toEqual([]);
      expect(DialogStore.previewState.newColumns.value).toEqual([]);
      expect(DialogStore.previewState.rows.value).toEqual([]);
    });
  });
});
