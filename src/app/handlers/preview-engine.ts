import { DialogStore } from '../stores/DialogStore';
import { DataRow } from '../types';

/**
 * Result of a preview computation.
 */
export interface PreviewResult {
  title: string;
  stats: string;
  columns: string[];
  newColumns?: string[];
  rows: DataRow[];
}

/**
 * Configuration for creating a debounced preview function.
 */
export interface PreviewConfig<TState = void> {
  /**
   * Function that computes the preview data.
   * Return null to clear the preview (e.g., when validation fails).
   * Throw an error to trigger onError callback.
   */
  compute: (state: TState) => PreviewResult | null;

  /**
   * Optional callback when preview computation fails.
   * If not provided, preview is simply cleared.
   */
  onError?: (error: Error) => void;

  /**
   * Debounce delay in milliseconds.
   * @default 150
   */
  debounceMs?: number;
}

/**
 * Handle returned by createDebouncedPreview for managing the preview lifecycle.
 */
export interface PreviewHandle<TState = void> {
  /** Trigger a debounced preview update. */
  trigger: (state?: TState) => void;

  /** Immediately compute and display preview (bypasses debounce). */
  compute: (state?: TState) => void;

  /** Cancel any pending debounced preview. */
  cancel: () => void;

  /** Clear the preview display and cancel pending updates. */
  clear: () => void;
}

/**
 * Creates a debounced preview function with centralized state management.
 *
 * @example
 * const filterPreview = createDebouncedPreview({
 *   compute: () => {
 *     const expr = DialogStore.filterState.expression.value;
 *     if (!expr || DialogStore.filterState.error.value) return null;
 *     // ... compute preview rows ...
 *     return {
 *       title: 'Filter Preview',
 *       stats: `${matchCount} of ${total} rows match`,
 *       columns: columns.slice(0, 8),
 *       rows: previewRows
 *     };
 *   }
 * });
 *
 * // Debounced update (150ms default)
 * filterPreview.trigger();
 *
 * // Immediate update
 * filterPreview.compute();
 */
export function createDebouncedPreview<TState = void>(
  config: PreviewConfig<TState>
): PreviewHandle<TState> {
  const debounceMs = config.debounceMs ?? 150;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const executeCompute = (state: TState) => {
    try {
      const result = config.compute(state);

      if (result === null) {
        clearPreview();
        return;
      }

      updatePreviewState(result);
    } catch (error) {
      clearPreview();
      config.onError?.(error as Error);
    }
  };

  return {
    trigger: (state?: TState) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        executeCompute(state as TState);
        timer = null;
      }, debounceMs);
    },

    compute: (state?: TState) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      executeCompute(state as TState);
    },

    cancel: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },

    clear: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      clearPreview();
    },
  };
}

/**
 * Updates DialogStore.previewState with the given result.
 * This is the single source of truth for preview state mutations.
 */
export function updatePreviewState(result: PreviewResult): void {
  DialogStore.previewState.title.value = result.title;
  DialogStore.previewState.stats.value = result.stats;
  DialogStore.previewState.columns.value = result.columns;
  DialogStore.previewState.newColumns.value = result.newColumns ?? [];
  DialogStore.previewState.rows.value = result.rows;
  DialogStore.previewState.isLoading.value = false;
}

/**
 * Clears all preview state.
 * Single implementation replacing duplicate clearPreview() functions across handlers.
 */
export function clearPreview(): void {
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];
  DialogStore.previewState.isLoading.value = false;
}

/**
 * Sets the preview loading state.
 */
export function setPreviewLoading(loading: boolean): void {
  DialogStore.previewState.isLoading.value = loading;
}
