/**
 * Unit Tests for Date Handlers
 *
 * Tests date extraction, truncation, and preview functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { resetStores, setTestData, suppressConsole } from './test-utils';
import * as DateHandlers from './date-handlers';
import type { Model, DataRow } from '../types';

describe('date-handlers', () => {
  let consoleSpy: ReturnType<typeof suppressConsole>;

  const testDateData = {
    columns: ['id', 'created_at', 'updated_at', 'name'],
    rows: [
      {
        id: 1,
        created_at: new Date('2024-03-15T10:30:00'),
        updated_at: new Date('2024-03-20T14:00:00'),
        name: 'Alice',
      },
      {
        id: 2,
        created_at: new Date('2024-06-01T08:00:00'),
        updated_at: new Date('2024-06-15T16:30:00'),
        name: 'Bob',
      },
      {
        id: 3,
        created_at: new Date('2024-12-25T00:00:00'),
        updated_at: new Date('2024-12-31T23:59:59'),
        name: 'Carol',
      },
    ] as DataRow[],
  };

  beforeEach(() => {
    resetStores();
    setTestData(testDateData);
    consoleSpy = suppressConsole();

    // Initialize date state
    const state = DialogStore.dateState;
    state.column.value = '';
    state.operation.value = 'extract';
    state.extractParts.value = ['year'];
    state.truncateUnits.value = ['day'];
    state.removeOrigin.value = false;

    // Set up schema with date columns
    const testModel: Model = {
      id: 'model-1',
      name: 'Test Model',
      sourceId: 'source-1',
      steps: [],
      schema: [
        { name: 'id', type: 'number' },
        { name: 'created_at', type: 'date' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'name', type: 'string' },
      ],
      data: testDateData.rows,
    };

    AppStore.activeModel.value = testModel;
    AppStore.viewingIntermediate.value = false;
    AppStore.viewingSchema.value = null;
  });

  afterEach(() => {
    consoleSpy.errorSpy.mockRestore();
    consoleSpy.warnSpy.mockRestore();
  });

  describe('getDateColumns', () => {
    it('returns only date and datetime columns', () => {
      const dateColumns = DateHandlers.getDateColumns();

      expect(dateColumns).toContain('created_at');
      expect(dateColumns).toContain('updated_at');
      expect(dateColumns).not.toContain('id');
      expect(dateColumns).not.toContain('name');
    });

    it('returns empty array when no schema', () => {
      AppStore.activeModel.value = null;

      const dateColumns = DateHandlers.getDateColumns();

      expect(dateColumns).toEqual([]);
    });
  });

  describe('getExtractParts', () => {
    it('returns list of date parts with examples', () => {
      const parts = DateHandlers.getExtractParts();

      expect(parts.length).toBeGreaterThan(0);
      expect(parts.find((p) => p.value === 'year')).toBeDefined();
      expect(parts.find((p) => p.value === 'month')).toBeDefined();
      expect(parts.find((p) => p.value === 'day')).toBeDefined();
      expect(parts.find((p) => p.value === 'hour')).toBeDefined();
    });

    it('includes example values for each part', () => {
      const parts = DateHandlers.getExtractParts();
      const yearPart = parts.find((p) => p.value === 'year');

      expect(yearPart?.example).toBeDefined();
      expect(yearPart?.label).toBe('Year');
    });
  });

  describe('getTruncateUnits', () => {
    it('returns list of truncation units', () => {
      const units = DateHandlers.getTruncateUnits();

      expect(units.length).toBeGreaterThan(0);
      expect(units.find((u) => u.value === 'year')).toBeDefined();
      expect(units.find((u) => u.value === 'month')).toBeDefined();
      expect(units.find((u) => u.value === 'day')).toBeDefined();
    });

    it('includes labels for each unit', () => {
      const units = DateHandlers.getTruncateUnits();
      const monthUnit = units.find((u) => u.value === 'month');

      expect(monthUnit?.label).toBe('Month');
    });
  });

  describe('toggleDateSelection', () => {
    it('replaces selection when no modifier key', () => {
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year', 'month'];

      DateHandlers.toggleDateSelection('day', undefined);

      expect(DialogStore.dateState.extractParts.value).toEqual(['day']);
    });

    it('adds to selection with meta key in extract mode', () => {
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year'];

      DateHandlers.toggleDateSelection('month', { metaKey: true } as MouseEvent);

      expect(DialogStore.dateState.extractParts.value).toContain('year');
      expect(DialogStore.dateState.extractParts.value).toContain('month');
    });

    it('adds to selection with ctrl key in extract mode', () => {
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year'];

      DateHandlers.toggleDateSelection('month', { ctrlKey: true } as MouseEvent);

      expect(DialogStore.dateState.extractParts.value).toContain('year');
      expect(DialogStore.dateState.extractParts.value).toContain('month');
    });

    it('removes from selection with modifier key if already selected', () => {
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year', 'month'];

      DateHandlers.toggleDateSelection('year', { metaKey: true } as MouseEvent);

      expect(DialogStore.dateState.extractParts.value).not.toContain('year');
      expect(DialogStore.dateState.extractParts.value).toContain('month');
    });

    it('does not remove last item with modifier key', () => {
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year'];

      DateHandlers.toggleDateSelection('year', { metaKey: true } as MouseEvent);

      expect(DialogStore.dateState.extractParts.value).toEqual(['year']);
    });

    it('works with truncate mode', () => {
      DialogStore.dateState.operation.value = 'truncate';
      DialogStore.dateState.truncateUnits.value = ['month'];

      DateHandlers.toggleDateSelection('day', undefined);

      expect(DialogStore.dateState.truncateUnits.value).toEqual(['day']);
    });
  });

  describe('toggleExtractSelection', () => {
    it('adds part if not already selected', () => {
      DialogStore.dateState.extractParts.value = ['year'];

      DateHandlers.toggleExtractSelection('month');

      expect(DialogStore.dateState.extractParts.value).toContain('year');
      expect(DialogStore.dateState.extractParts.value).toContain('month');
    });

    it('removes part if already selected', () => {
      DialogStore.dateState.extractParts.value = ['year', 'month'];

      DateHandlers.toggleExtractSelection('year');

      expect(DialogStore.dateState.extractParts.value).not.toContain('year');
      expect(DialogStore.dateState.extractParts.value).toContain('month');
    });
  });

  describe('toggleTruncateSelection', () => {
    it('adds unit if not already selected', () => {
      DialogStore.dateState.truncateUnits.value = ['day'];

      DateHandlers.toggleTruncateSelection('month');

      expect(DialogStore.dateState.truncateUnits.value).toContain('day');
      expect(DialogStore.dateState.truncateUnits.value).toContain('month');
    });

    it('removes unit if already selected', () => {
      DialogStore.dateState.truncateUnits.value = ['day', 'month'];

      DateHandlers.toggleTruncateSelection('day');

      expect(DialogStore.dateState.truncateUnits.value).not.toContain('day');
      expect(DialogStore.dateState.truncateUnits.value).toContain('month');
    });
  });

  describe('getDateOutputPlaceholder', () => {
    it('returns empty string when no column selected', () => {
      DialogStore.dateState.column.value = '';

      const placeholder = DateHandlers.getDateOutputPlaceholder();

      expect(placeholder).toBe('');
    });

    it('returns single extract part placeholder', () => {
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year'];

      const placeholder = DateHandlers.getDateOutputPlaceholder();

      expect(placeholder).toBe('created_at_year');
    });

    it('returns multiple columns indicator for multiple extract parts', () => {
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.operation.value = 'extract';
      DialogStore.dateState.extractParts.value = ['year', 'month'];

      const placeholder = DateHandlers.getDateOutputPlaceholder();

      expect(placeholder).toBe('(Multiple columns)');
    });

    it('returns truncate placeholder', () => {
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.operation.value = 'truncate';
      DialogStore.dateState.truncateUnits.value = ['month'];

      const placeholder = DateHandlers.getDateOutputPlaceholder();

      expect(placeholder).toBe('created_at_month_trunc');
    });
  });

  describe('updateDatePreview', () => {
    it('updates preview state with extract results', () => {
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.extractParts.value = ['year'];

      DateHandlers.updateDatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toContain('Extract');
      expect(preview.columns.value).toContain('created_at');
      expect(preview.newColumns.value).toContain('created_at_year');
    });

    it('does not update preview when no column selected', () => {
      DialogStore.dateState.column.value = '';

      DateHandlers.updateDatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('');
    });

    it('does not update preview when no parts selected', () => {
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.extractParts.value = [];
      DialogStore.dateState.truncateUnits.value = [];

      DateHandlers.updateDatePreview();

      const preview = DialogStore.previewState;
      expect(preview.title.value).toBe('');
    });
  });

  describe('getDatePartPreview', () => {
    it('returns dash when no column selected', () => {
      DialogStore.dateState.column.value = '';

      const preview = DateHandlers.getDatePartPreview('year', 'extract');

      expect(preview).toBe('—');
    });

    it('returns dash when no data', () => {
      DialogStore.dateState.column.value = 'created_at';
      AppStore.currentData.value = [];

      const preview = DateHandlers.getDatePartPreview('year', 'extract');

      expect(preview).toBe('—');
    });

    it('returns year extract result', () => {
      DialogStore.dateState.column.value = 'created_at';

      const preview = DateHandlers.getDatePartPreview('year', 'extract');

      expect(preview).toBe('2024');
    });

    it('returns month extract result', () => {
      DialogStore.dateState.column.value = 'created_at';

      const preview = DateHandlers.getDatePartPreview('month', 'extract');

      expect(preview).toBe('3');
    });

    it('returns truncate result', () => {
      DialogStore.dateState.column.value = 'created_at';

      const preview = DateHandlers.getDatePartPreview('year', 'truncate');

      // Truncate to year should return a date string starting with 2024
      expect(preview).toContain('2024');
    });
  });

  describe('applyDateTransform', () => {
    const createMockCallbacks = () => ({
      onError: vi.fn(),
      onDialogClose: vi.fn(),
      onSuccess: vi.fn(),
    });

    it('calls onError when no column selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.dateState.column.value = '';

      await DateHandlers.applyDateTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Please select a source column');
    });

    it('calls onError when no parts selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.extractParts.value = [];
      DialogStore.dateState.truncateUnits.value = [];

      await DateHandlers.applyDateTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        'Please select at least one date part or unit to extract/truncate'
      );
    });
  });

  describe('debouncedUpdateDatePreview', () => {
    it('triggers preview update', () => {
      vi.useFakeTimers();

      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.extractParts.value = ['year'];

      DateHandlers.debouncedUpdateDatePreview();

      // Preview should update after debounce
      vi.advanceTimersByTime(200);

      const preview = DialogStore.previewState;
      expect(preview.title.value).toContain('Extract');

      vi.useRealTimers();
    });
  });

  describe('clearDatePreview', () => {
    it('clears preview state', () => {
      // First set up preview
      DialogStore.dateState.column.value = 'created_at';
      DialogStore.dateState.extractParts.value = ['year'];
      DateHandlers.updateDatePreview();

      // Verify preview is set
      expect(DialogStore.previewState.title.value).not.toBe('');

      // Clear it
      DateHandlers.clearDatePreview();

      expect(DialogStore.previewState.title.value).toBe('');
      expect(DialogStore.previewState.rows.value).toEqual([]);
    });
  });
});
