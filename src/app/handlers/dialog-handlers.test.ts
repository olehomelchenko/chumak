/**
 * Unit Tests for Dialog Handlers
 *
 * Tests dialog helper functions, preview data handlers, and dialog type checks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import * as DialogHandlers from './dialog-handlers';
import { ChumakApp } from '../../chumak-app';

describe('Dialog Handlers', () => {
  let app: ChumakApp;

  beforeEach(() => {
    // Reset all stores
    AppStore.reset();
    DialogStore.resetAll();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create app instance
    app = new ChumakApp();

    // Mock dialog methods
    app.alert = vi.fn().mockResolvedValue(undefined);
    app.confirm = vi.fn().mockResolvedValue(true);
    app.prompt = vi.fn().mockResolvedValue('test');
    app.closeDialog = vi.fn();
    app.openDialog = vi.fn();

    // Set up default UX settings
    AppStore.uxSettings.value = {
      theme: 'chumak',
      preview: {
        rowLimit: 10,
      },
    };
  });

  describe('isSlidePanel', () => {
    it('should return true for import-csv dialog', () => {
      app.activeDialog = 'import-csv';
      expect(DialogHandlers.isSlidePanel.call(app, 'import-csv')).toBe(true);
    });

    it('should return true for import-url dialog', () => {
      app.activeDialog = 'import-url';
      expect(DialogHandlers.isSlidePanel.call(app, 'import-url')).toBe(true);
    });

    it('should return false for settings dialog', () => {
      app.activeDialog = 'settings';
      expect(DialogHandlers.isSlidePanel.call(app, 'settings')).toBe(false);
    });

    it('should return false for null dialog', () => {
      app.activeDialog = null;
      expect(DialogHandlers.isSlidePanel.call(app, null)).toBe(false);
    });
  });

  describe('isCenteredModal', () => {
    it('should return false for import-csv dialog', () => {
      app.activeDialog = 'import-csv';
      expect(DialogHandlers.isCenteredModal.call(app, 'import-csv')).toBe(false);
    });

    it('should return true for settings dialog', () => {
      app.activeDialog = 'settings';
      expect(DialogHandlers.isCenteredModal.call(app, 'settings')).toBe(true);
    });

    it('should return false for null dialog', () => {
      app.activeDialog = null;
      expect(DialogHandlers.isCenteredModal.call(app, null)).toBe(false);
    });
  });

  describe('hasPreviewData', () => {
    it('should return true for import-csv when preview data exists', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewDataRows.value = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      expect(DialogHandlers.hasPreviewData.call(app)).toBe(true);
    });

    it('should return false for import-csv when preview data is empty', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewDataRows.value = [];
      expect(DialogHandlers.hasPreviewData.call(app)).toBe(false);
    });

    it('should use previewState for non-import-csv dialogs', () => {
      app.activeDialog = 'filter';
      DialogStore.previewState.rows.value = [{ col1: 'value1' }];
      expect(DialogHandlers.hasPreviewData.call(app)).toBe(true);
    });
  });

  describe('getPreviewTitle', () => {
    it('should return "Import Preview" for import-csv dialog', () => {
      app.activeDialog = 'import-csv';
      expect(DialogHandlers.getPreviewTitle.call(app)).toBe('Import Preview');
    });

    it('should use previewState title for other dialogs', () => {
      app.activeDialog = 'filter';
      DialogStore.previewState.title.value = 'Filter Preview';
      expect(DialogHandlers.getPreviewTitle.call(app)).toBe('Filter Preview');
    });
  });

  describe('getPreviewStats', () => {
    it('should generate stats for import-csv dialog with correct row limit', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1', 'col2', 'col3'];
      DialogStore.importCsvState.previewDataRows.value = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
        ['g', 'h', 'i'],
      ];
      AppStore.uxSettings.value.preview.rowLimit = 10;

      const stats = DialogHandlers.getPreviewStats.call(app);
      expect(stats).toBe('3 rows, 3 columns (first 3 rows shown)');
    });

    it('should respect row limit when data exceeds limit', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1'];
      // Create 15 rows
      DialogStore.importCsvState.previewDataRows.value = Array(15).fill(['data']);
      AppStore.uxSettings.value.preview.rowLimit = 10;

      const stats = DialogHandlers.getPreviewStats.call(app);
      expect(stats).toBe('15 rows, 1 columns (first 10 rows shown)');
    });

    it('should use previewState stats for other dialogs', () => {
      app.activeDialog = 'filter';
      DialogStore.previewState.stats.value = '5 rows filtered';
      expect(DialogHandlers.getPreviewStats.call(app)).toBe('5 rows filtered');
    });
  });

  describe('getPreviewColumns', () => {
    it('should return headers from importCsvState for import-csv dialog', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['header1', 'header2', 'header3'];
      expect(DialogHandlers.getPreviewColumns.call(app)).toEqual(['header1', 'header2', 'header3']);
    });

    it('should use previewState columns for other dialogs', () => {
      app.activeDialog = 'filter';
      DialogStore.previewState.columns.value = ['col1', 'col2'];
      expect(DialogHandlers.getPreviewColumns.call(app)).toEqual(['col1', 'col2']);
    });
  });

  describe('getPreviewRows', () => {
    it('should convert array rows to object rows for import-csv dialog', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['name', 'age'];
      DialogStore.importCsvState.previewDataRows.value = [
        ['Alice', '30'],
        ['Bob', '25'],
      ];

      const rows = DialogHandlers.getPreviewRows.call(app);
      expect(rows).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ]);
    });

    it('should handle empty rows for import-csv dialog', () => {
      app.activeDialog = 'import-csv';
      DialogStore.importCsvState.previewHeaders.value = ['col1'];
      DialogStore.importCsvState.previewDataRows.value = [];

      const rows = DialogHandlers.getPreviewRows.call(app);
      expect(rows).toEqual([]);
    });

    it('should use previewState rows for other dialogs', () => {
      app.activeDialog = 'filter';
      const testRows = [{ col1: 'value1' }, { col1: 'value2' }];
      DialogStore.previewState.rows.value = testRows;
      expect(DialogHandlers.getPreviewRows.call(app)).toEqual(testRows);
    });
  });

  describe('formatPreviewCell', () => {
    it('should return "—" for null values', () => {
      const row = { col1: null };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('—');
    });

    it('should return "—" for empty strings', () => {
      const row = { col1: '' };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('—');
    });

    it('should return "✓" for true booleans', () => {
      const row = { col1: true };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('✓');
    });

    it('should return "✗" for false booleans', () => {
      const row = { col1: false };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('✗');
    });

    it('should stringify object values', () => {
      const row = { col1: { nested: 'value' } };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('{"nested":"value"}');
    });

    it('should convert numbers to strings', () => {
      const row = { col1: 42 };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('42');
    });

    it('should return strings as-is', () => {
      const row = { col1: 'test value' };
      expect(DialogHandlers.formatPreviewCell.call(app, row, 'col1')).toBe('test value');
    });
  });

  describe('initDialogState - replace dialog', () => {
    beforeEach(() => {
      app.columns = ['col1', 'col2', 'col3'];
    });

    it('should initialize replace dialog state when findValue is empty', () => {
      DialogStore.replaceState.findValue.value = '';
      DialogStore.replaceState.column.value = '';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState.call(app, 'replace');

      expect(DialogStore.replaceState.column.value).toBe('col1');
      expect(DialogStore.replaceState.findValue.value).toBe('');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });

    it('should preserve values when findValue is already set (quickReplace scenario)', () => {
      // Simulate quickReplace setting values
      DialogStore.replaceState.column.value = 'col2';
      DialogStore.replaceState.findValue.value = 'Alice';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState.call(app, 'replace');

      // Values should be preserved
      expect(DialogStore.replaceState.column.value).toBe('col2');
      expect(DialogStore.replaceState.findValue.value).toBe('Alice');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });

    it('should set column to first column if findValue is set but column is empty', () => {
      DialogStore.replaceState.column.value = '';
      DialogStore.replaceState.findValue.value = 'some value';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState.call(app, 'replace');

      expect(DialogStore.replaceState.column.value).toBe('col1');
      expect(DialogStore.replaceState.findValue.value).toBe('some value');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });

    it('should handle empty columns array gracefully', () => {
      app.columns = [];
      DialogStore.replaceState.findValue.value = '';
      DialogStore.replaceState.column.value = '';
      DialogStore.replaceState.replaceValue.value = '';

      DialogHandlers.initDialogState.call(app, 'replace');

      expect(DialogStore.replaceState.column.value).toBe('');
      expect(DialogStore.replaceState.findValue.value).toBe('');
      expect(DialogStore.replaceState.replaceValue.value).toBe('');
    });
  });
});
