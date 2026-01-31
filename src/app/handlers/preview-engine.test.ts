import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DialogStore } from '../stores/DialogStore';
import {
  createDebouncedPreview,
  updatePreviewState,
  clearPreview,
  setPreviewLoading,
  PreviewResult,
} from './preview-engine';

describe('preview-engine', () => {
  beforeEach(() => {
    DialogStore.resetAll();
  });

  describe('createDebouncedPreview', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces multiple rapid trigger calls', () => {
      const computeFn = vi.fn(() => ({
        title: 'Test',
        stats: 'Stats',
        columns: ['a'],
        rows: [],
      }));

      const preview = createDebouncedPreview({ compute: computeFn });

      preview.trigger();
      preview.trigger();
      preview.trigger();

      expect(computeFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(150);

      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('respects custom debounce delay', () => {
      const computeFn = vi.fn(() => ({ title: '', stats: '', columns: [], rows: [] }));
      const preview = createDebouncedPreview({ compute: computeFn, debounceMs: 300 });

      preview.trigger();
      vi.advanceTimersByTime(200);
      expect(computeFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('compute() bypasses debounce and executes immediately', () => {
      const computeFn = vi.fn(() => ({ title: '', stats: '', columns: [], rows: [] }));
      const preview = createDebouncedPreview({ compute: computeFn });

      preview.compute();

      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('updates preview state on successful compute', () => {
      const preview = createDebouncedPreview({
        compute: () => ({
          title: 'Test Title',
          stats: '10 rows',
          columns: ['col1', 'col2'],
          newColumns: ['col2'],
          rows: [{ col1: 'a', col2: 'b' }],
        }),
      });

      preview.compute();

      expect(DialogStore.previewState.title.value).toBe('Test Title');
      expect(DialogStore.previewState.stats.value).toBe('10 rows');
      expect(DialogStore.previewState.columns.value).toEqual(['col1', 'col2']);
      expect(DialogStore.previewState.newColumns.value).toEqual(['col2']);
      expect(DialogStore.previewState.rows.value).toHaveLength(1);
    });

    it('clears preview when compute returns null', () => {
      DialogStore.previewState.title.value = 'Previous';
      DialogStore.previewState.rows.value = [{ a: 1 }];

      const preview = createDebouncedPreview({
        compute: () => null,
      });

      preview.compute();

      expect(DialogStore.previewState.title.value).toBe('');
      expect(DialogStore.previewState.rows.value).toEqual([]);
    });

    it('calls onError callback when compute throws', () => {
      const onError = vi.fn();
      const error = new Error('Compute failed');

      const preview = createDebouncedPreview({
        compute: () => {
          throw error;
        },
        onError,
      });

      preview.compute();

      expect(onError).toHaveBeenCalledWith(error);
      expect(DialogStore.previewState.title.value).toBe('');
    });

    it('cancel() prevents pending debounced compute', () => {
      const computeFn = vi.fn(() => ({ title: '', stats: '', columns: [], rows: [] }));
      const preview = createDebouncedPreview({ compute: computeFn });

      preview.trigger();
      preview.cancel();
      vi.advanceTimersByTime(200);

      expect(computeFn).not.toHaveBeenCalled();
    });

    it('clear() cancels pending and clears state', () => {
      const computeFn = vi.fn(() => ({ title: '', stats: '', columns: [], rows: [] }));
      const preview = createDebouncedPreview({ compute: computeFn });

      DialogStore.previewState.title.value = 'Previous';

      preview.trigger();
      preview.clear();

      vi.advanceTimersByTime(200);

      expect(computeFn).not.toHaveBeenCalled();
      expect(DialogStore.previewState.title.value).toBe('');
    });

    it('passes state parameter to compute function', () => {
      const computeFn = vi.fn((state: { value: number }) => ({
        title: String(state.value),
        stats: '',
        columns: [],
        rows: [],
      }));

      const preview = createDebouncedPreview({ compute: computeFn });

      preview.compute({ value: 42 });

      expect(computeFn).toHaveBeenCalledWith({ value: 42 });
      expect(DialogStore.previewState.title.value).toBe('42');
    });

    it('trigger() resets debounce timer on each call', () => {
      const computeFn = vi.fn(() => ({ title: 'Done', stats: '', columns: [], rows: [] }));
      const preview = createDebouncedPreview({ compute: computeFn });

      preview.trigger();
      vi.advanceTimersByTime(100); // 100ms elapsed

      preview.trigger(); // reset timer
      vi.advanceTimersByTime(100); // 100ms more (total 200ms from start, but only 100ms since last trigger)

      expect(computeFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50); // now 150ms since last trigger

      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePreviewState', () => {
    it('sets all preview state properties', () => {
      updatePreviewState({
        title: 'Title',
        stats: 'Stats',
        columns: ['a', 'b'],
        newColumns: ['b'],
        rows: [{ a: 1, b: 2 }],
      });

      expect(DialogStore.previewState.title.value).toBe('Title');
      expect(DialogStore.previewState.stats.value).toBe('Stats');
      expect(DialogStore.previewState.columns.value).toEqual(['a', 'b']);
      expect(DialogStore.previewState.newColumns.value).toEqual(['b']);
      expect(DialogStore.previewState.rows.value).toEqual([{ a: 1, b: 2 }]);
      expect(DialogStore.previewState.isLoading.value).toBe(false);
    });

    it('defaults newColumns to empty array', () => {
      updatePreviewState({
        title: 'T',
        stats: 'S',
        columns: ['a'],
        rows: [],
      });

      expect(DialogStore.previewState.newColumns.value).toEqual([]);
    });
  });

  describe('clearPreview', () => {
    it('resets all preview state to empty values', () => {
      DialogStore.previewState.title.value = 'Title';
      DialogStore.previewState.stats.value = 'Stats';
      DialogStore.previewState.columns.value = ['a'];
      DialogStore.previewState.newColumns.value = ['b'];
      DialogStore.previewState.rows.value = [{ a: 1 }];
      DialogStore.previewState.isLoading.value = true;

      clearPreview();

      expect(DialogStore.previewState.title.value).toBe('');
      expect(DialogStore.previewState.stats.value).toBe('');
      expect(DialogStore.previewState.columns.value).toEqual([]);
      expect(DialogStore.previewState.newColumns.value).toEqual([]);
      expect(DialogStore.previewState.rows.value).toEqual([]);
      expect(DialogStore.previewState.isLoading.value).toBe(false);
    });
  });

  describe('setPreviewLoading', () => {
    it('sets loading state to true', () => {
      setPreviewLoading(true);
      expect(DialogStore.previewState.isLoading.value).toBe(true);
    });

    it('sets loading state to false', () => {
      DialogStore.previewState.isLoading.value = true;
      setPreviewLoading(false);
      expect(DialogStore.previewState.isLoading.value).toBe(false);
    });
  });
});
