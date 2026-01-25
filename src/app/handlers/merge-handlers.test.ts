import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as MergeHandlers from './merge-handlers';

describe('merge-handlers', () => {
  beforeEach(() => {
    DialogStore.resetAll();
    AppStore.columns.value = ['first_name', 'last_name', 'city', 'state'];
    AppStore.currentData.value = [
      { first_name: 'Alice', last_name: 'Smith', city: 'Boston', state: 'MA' },
      { first_name: 'Bob', last_name: 'Jones', city: 'Austin', state: 'TX' },
      { first_name: 'Carol', last_name: null, city: 'Seattle', state: 'WA' },
    ];
  });

  describe('selectMergeColumns', () => {
    it('updates columns in state', () => {
      MergeHandlers.selectMergeColumns(['first_name', 'last_name']);
      expect(DialogStore.mergeState.columns.value).toEqual(['first_name', 'last_name']);
    });
  });

  describe('updateMergePreview', () => {
    it('clears error when validation passes', () => {
      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.columnName.value = 'full_name';
      DialogStore.mergeState.error.value = 'Previous error';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.mergeState.error.value).toBeNull();
    });

    it('sets error when no columns selected', () => {
      DialogStore.mergeState.columns.value = [];
      DialogStore.mergeState.columnName.value = 'output';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value).toEqual([]);
    });

    it('sets error when column name is empty', () => {
      DialogStore.mergeState.columns.value = ['first_name'];
      DialogStore.mergeState.columnName.value = '';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.mergeState.error.value).toBe('Please enter an output column name');
    });

    it('sets error when selected column does not exist', () => {
      DialogStore.mergeState.columns.value = ['nonexistent'];
      DialogStore.mergeState.columnName.value = 'output';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.mergeState.error.value).toContain('Columns not found: nonexistent');
    });

    it('generates preview with space separator', () => {
      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.separator.value = ' ';
      DialogStore.mergeState.columnName.value = 'full_name';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value).toHaveLength(3);
      expect(DialogStore.previewState.rows.value[0].full_name).toBe('Alice Smith');
      expect(DialogStore.previewState.rows.value[1].full_name).toBe('Bob Jones');
    });

    it('handles null values correctly', () => {
      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.separator.value = ' ';
      DialogStore.mergeState.columnName.value = 'full_name';

      MergeHandlers.updateMergePreview();

      // Carol has null last_name, should become "Carol "
      expect(DialogStore.previewState.rows.value[2].full_name).toBe('Carol ');
    });

    it('generates preview with comma separator', () => {
      DialogStore.mergeState.columns.value = ['city', 'state'];
      DialogStore.mergeState.separator.value = ', ';
      DialogStore.mergeState.columnName.value = 'location';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value[0].location).toBe('Boston, MA');
      expect(DialogStore.previewState.rows.value[1].location).toBe('Austin, TX');
    });

    it('generates preview with no separator', () => {
      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.separator.value = '';
      DialogStore.mergeState.columnName.value = 'name';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value[0].name).toBe('AliceSmith');
    });

    it('handles single column merge', () => {
      DialogStore.mergeState.columns.value = ['first_name'];
      DialogStore.mergeState.separator.value = '';
      DialogStore.mergeState.columnName.value = 'name_copy';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value[0].name_copy).toBe('Alice');
    });

    it('sets preview metadata correctly', () => {
      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.separator.value = ' ';
      DialogStore.mergeState.columnName.value = 'full_name';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.title.value).toBe('Merge: full_name');
      expect(DialogStore.previewState.stats.value).toBe('Merging 2 columns');
      expect(DialogStore.previewState.columns.value).toEqual([
        'first_name',
        'last_name',
        'full_name',
      ]);
      expect(DialogStore.previewState.newColumns.value).toEqual(['full_name']);
    });

    it('handles columns with special characters', () => {
      AppStore.columns.value = ['First Name', 'Last Name'];
      AppStore.currentData.value = [{ 'First Name': 'Alice', 'Last Name': 'Smith' }];

      DialogStore.mergeState.columns.value = ['First Name', 'Last Name'];
      DialogStore.mergeState.separator.value = ' ';
      DialogStore.mergeState.columnName.value = 'Full Name';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value[0]['Full Name']).toBe('Alice Smith');
    });

    it('limits preview to 50 rows', () => {
      // Create 100 rows
      const manyRows = Array.from({ length: 100 }, (_, i) => ({
        first_name: `Name${i}`,
        last_name: `Last${i}`,
        city: 'City',
        state: 'ST',
      }));
      AppStore.currentData.value = manyRows;

      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.separator.value = ' ';
      DialogStore.mergeState.columnName.value = 'full_name';

      MergeHandlers.updateMergePreview();

      expect(DialogStore.previewState.rows.value).toHaveLength(50);
    });
  });

  describe('clearPreview', () => {
    it('clears all preview state', () => {
      DialogStore.previewState.title.value = 'Test';
      DialogStore.previewState.stats.value = 'Stats';
      DialogStore.previewState.columns.value = ['col1'];
      DialogStore.previewState.newColumns.value = ['col2'];
      DialogStore.previewState.rows.value = [{ col1: 'value' }];

      MergeHandlers.clearPreview();

      expect(DialogStore.previewState.title.value).toBe('');
      expect(DialogStore.previewState.stats.value).toBe('');
      expect(DialogStore.previewState.columns.value).toEqual([]);
      expect(DialogStore.previewState.newColumns.value).toEqual([]);
      expect(DialogStore.previewState.rows.value).toEqual([]);
    });
  });

  describe('debouncedUpdateMergePreview', () => {
    it('debounces preview updates', async () => {
      vi.useFakeTimers();

      DialogStore.mergeState.columns.value = ['first_name', 'last_name'];
      DialogStore.mergeState.columnName.value = 'full_name';

      // Call multiple times rapidly
      MergeHandlers.debouncedUpdateMergePreview();
      MergeHandlers.debouncedUpdateMergePreview();
      MergeHandlers.debouncedUpdateMergePreview();

      // Preview should not be updated yet
      expect(DialogStore.previewState.rows.value).toEqual([]);

      // Fast-forward time
      vi.advanceTimersByTime(150);

      // Now preview should be updated (only once)
      expect(DialogStore.previewState.rows.value.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
