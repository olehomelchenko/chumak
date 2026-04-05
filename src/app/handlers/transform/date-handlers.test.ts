/**
 * Unit Tests for Date Handlers
 *
 * Tests date extraction, truncation, and preview functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { resetStores, suppressConsole } from '../test-utils';
import * as DateHandlers from './date-handlers';
import type { Model, DataRow } from '../../types';

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
    consoleSpy = suppressConsole();

    AppStore.columns.value = testDateData.columns;
    AppStore.currentData.value = testDateData.rows;

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

  describe('getDatePartPreview', () => {
    it('returns dash when no column', () => {
      const preview = DateHandlers.getDatePartPreview('', 'year', 'extract');
      expect(preview).toBe('—');
    });

    it('returns dash when no data', () => {
      AppStore.currentData.value = [];
      const preview = DateHandlers.getDatePartPreview('created_at', 'year', 'extract');
      expect(preview).toBe('—');
    });

    it('returns year extract result', () => {
      const preview = DateHandlers.getDatePartPreview('created_at', 'year', 'extract');
      expect(preview).toBe('2024');
    });

    it('returns month extract result', () => {
      const preview = DateHandlers.getDatePartPreview('created_at', 'month', 'extract');
      expect(preview).toBe('3');
    });

    it('returns truncate result', () => {
      const preview = DateHandlers.getDatePartPreview('created_at', 'year', 'truncate');
      expect(preview).toContain('2024');
    });
  });

  describe('computeDatePreview', () => {
    it('returns null when no column', () => {
      const result = DateHandlers.computeDatePreview('', ['year'], [], {});
      expect(result).toBeNull();
    });

    it('returns null when no parts selected', () => {
      const result = DateHandlers.computeDatePreview('created_at', [], [], {});
      expect(result).toBeNull();
    });

    it('computes extract preview', () => {
      const result = DateHandlers.computeDatePreview('created_at', ['year'], [], {});
      expect(result).not.toBeNull();
      expect(result!.title).toContain('Extract');
      expect(result!.columns).toContain('created_at');
      expect(result!.newColumns).toContain('created_at_year');
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
      DialogStore.activeDialogState.value = {
        column: '',
        extractParts: [],
        truncateUnits: [],
        truncateIntervals: {},
        removeOrigin: false,
      };

      await DateHandlers.applyDateTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith('Select a source column');
    });

    it('calls onError when no parts selected', async () => {
      const callbacks = createMockCallbacks();
      DialogStore.activeDialogState.value = {
        column: 'created_at',
        extractParts: [],
        truncateUnits: [],
        truncateIntervals: {},
        removeOrigin: false,
      };

      await DateHandlers.applyDateTransform(callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        'Select at least one date part or unit to extract/truncate'
      );
    });
  });
});
