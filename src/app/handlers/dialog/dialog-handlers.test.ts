/**
 * Unit Tests for Dialog Handlers
 *
 * Tests dialog helper functions, preview data handlers, and dialog type checks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';
import * as DialogHandlers from './dialog-handlers';

describe('Dialog Handlers', () => {
  beforeEach(() => {
    // Reset all stores
    AppStore.reset();
    DialogStore.resetAll();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Set up default UX settings
    AppStore.uxSettings.value = {
      theme: 'syto',
      preview: {
        rowLimit: 10,
      },
      pagination: {
        pageSize: 500,
      },
      analyticsOptOut: false,
    };
  });

  describe('isSlidePanel', () => {
    it('should return true for import-csv dialog', () => {
      expect(DialogHandlers.isSlidePanel('import-csv')).toBe(true);
    });

    it('should return true for import-url dialog', () => {
      expect(DialogHandlers.isSlidePanel('import-url')).toBe(true);
    });

    it('should return false for settings dialog', () => {
      expect(DialogHandlers.isSlidePanel('settings')).toBe(false);
    });

    it('should return false for null dialog', () => {
      expect(DialogHandlers.isSlidePanel(null)).toBe(false);
    });
  });

  describe('isCenteredModal', () => {
    it('should return false for import-csv dialog', () => {
      expect(DialogHandlers.isCenteredModal('import-csv')).toBe(false);
    });

    it('should return true for settings dialog', () => {
      expect(DialogHandlers.isCenteredModal('settings')).toBe(true);
    });

    it('should return false for null dialog', () => {
      expect(DialogHandlers.isCenteredModal(null)).toBe(false);
    });
  });

  describe('hasPreviewData', () => {
    it('should return true for import-csv when preview data exists', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewDataRows.value = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      expect(DialogHandlers.hasPreviewData()).toBe(true);
    });

    it('should return false for import-csv when preview data is empty', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewDataRows.value = [];
      expect(DialogHandlers.hasPreviewData()).toBe(false);
    });

    it('should use previewState for non-import-csv dialogs', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.previewState.rows.value = [{ col1: 'value1' }];
      expect(DialogHandlers.hasPreviewData()).toBe(true);
    });
  });

  describe('getPreviewTitle', () => {
    it('should return "Import Preview" for import-csv dialog', () => {
      AppStore.activeDialog.value = 'import-csv';
      expect(DialogHandlers.getPreviewTitle()).toBe('Import Preview');
    });

    it('should use previewState title for other dialogs', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.previewState.title.value = 'Filter Preview';
      expect(DialogHandlers.getPreviewTitle()).toBe('Filter Preview');
    });
  });

  describe('getPreviewStats', () => {
    it('should generate stats for import-csv dialog with correct row limit', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1', 'col2', 'col3'];
      DialogStore.importCsvState.previewDataRows.value = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ];
      AppStore.uxSettings.value.preview.rowLimit = 10;

      const stats = DialogHandlers.getPreviewStats();
      expect(stats).toBe('3 rows, 3 columns (first 3 rows shown)');
    });

    it('should respect row limit when data exceeds limit', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1'];
      // Create 15 rows
      DialogStore.importCsvState.previewDataRows.value = Array(15).fill(['data']);
      AppStore.uxSettings.value.preview.rowLimit = 10;

      const stats = DialogHandlers.getPreviewStats();
      expect(stats).toBe('15 rows, 1 columns (first 10 rows shown)');
    });

    it('should use previewState stats for other dialogs', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.previewState.stats.value = '5 rows filtered';
      expect(DialogHandlers.getPreviewStats()).toBe('5 rows filtered');
    });
  });

  describe('getPreviewColumns', () => {
    it('should return headers from importCsvState for import-csv dialog', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['header1', 'header2', 'header3'];
      expect(DialogHandlers.getPreviewColumns()).toEqual(['header1', 'header2', 'header3']);
    });

    it('should use previewState columns for other dialogs', () => {
      AppStore.activeDialog.value = 'filter';
      DialogStore.previewState.columns.value = ['col1', 'col2'];
      expect(DialogHandlers.getPreviewColumns()).toEqual(['col1', 'col2']);
    });
  });

  describe('getPreviewRows', () => {
    it('should convert array rows to object rows for import-csv dialog', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['name', 'age'];
      DialogStore.importCsvState.previewDataRows.value = [
        ['Alice', '30'],
        ['Bob', '25'],
      ];

      const rows = DialogHandlers.getPreviewRows();
      expect(rows).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('should handle empty rows for import-csv dialog', () => {
      AppStore.activeDialog.value = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1'];
      DialogStore.importCsvState.previewDataRows.value = [];

      const rows = DialogHandlers.getPreviewRows();
      expect(rows).toEqual([]);
    });

    it('should use previewState rows for other dialogs', () => {
      AppStore.activeDialog.value = 'filter';
      const testRows = [{ col1: 'value1' }, { col1: 'value2' }];
      DialogStore.previewState.rows.value = testRows;
      expect(DialogHandlers.getPreviewRows()).toEqual(testRows);
    });
  });

  describe('initDialogState - replace dialog', () => {
    beforeEach(() => {
      AppStore.columns.value = ['col1', 'col2', 'col3'];
    });

    it('should initialize replace dialog state when findValue is empty', () => {
      DialogStore.replaceState.findValue.value = '';
      DialogStore.replaceState.column.value = '';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState('replace');

      expect(DialogStore.replaceState.column.value).toBe('col1');
      expect(DialogStore.replaceState.findValue.value).toBe('');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });

    it('should preserve values when findValue is already set (quickReplace scenario)', () => {
      // Simulate quickReplace setting values
      DialogStore.replaceState.column.value = 'col2';
      DialogStore.replaceState.findValue.value = 'Alice';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState('replace');

      // Values should be preserved
      expect(DialogStore.replaceState.column.value).toBe('col2');
      expect(DialogStore.replaceState.findValue.value).toBe('Alice');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });

    it('should set column to first column if findValue is set but column is empty', () => {
      DialogStore.replaceState.column.value = '';
      DialogStore.replaceState.findValue.value = 'some value';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState('replace');

      expect(DialogStore.replaceState.column.value).toBe('col1');
      expect(DialogStore.replaceState.findValue.value).toBe('some value');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });

    it('should preserve column when set by quickReplace in error/null mode', () => {
      // quickReplace sets column but findValue is empty for error/null matchMode
      DialogStore.replaceState.column.value = 'col2';
      DialogStore.replaceState.findValue.value = '';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState('replace');

      // Column should NOT be overwritten to col1
      expect(DialogStore.replaceState.column.value).toBe('col2');
    });

    it('should handle empty columns array gracefully', () => {
      AppStore.columns.value = [];
      DialogStore.replaceState.findValue.value = '';
      DialogStore.replaceState.column.value = '';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState('replace');

      expect(DialogStore.replaceState.column.value).toBe('');
      expect(DialogStore.replaceState.findValue.value).toBe('');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });
  });
});
