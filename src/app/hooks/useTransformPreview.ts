/**
 * useTransformPreview — Debounced preview hook for transform dialogs
 *
 * Wraps the existing createDebouncedPreview() from preview-engine.ts
 * into a Preact hook that auto-triggers on signal changes and
 * cleans up on unmount.
 */

import { useRef, useEffect } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import {
  createDebouncedPreview,
  type PreviewResult,
  type PreviewHandle,
} from '../handlers/preview-engine';

export interface TransformPreviewConfig {
  /**
   * Compute function called on signal changes.
   * Return null to clear the preview (e.g., when validation fails).
   */
  compute: () => PreviewResult | null;

  /**
   * Signal dependency tracker. Called inside useSignalEffect —
   * any signals read here trigger a debounced preview recompute.
   *
   * @example
   * deps: () => { state.expression.value; state.column.value; }
   */
  deps: () => void;

  /** Debounce delay in ms. Default: 150 */
  debounceMs?: number;

  /** Called when preview computation throws */
  onError?: (error: Error) => void;
}

export interface TransformPreviewResult {
  /** Manually trigger a debounced preview update */
  trigger: () => void;
  /** Cancel any pending debounced computation */
  cancel: () => void;
}

/**
 * Hook that manages debounced preview computation for transform dialogs.
 *
 * @example
 * ```tsx
 * const preview = useTransformPreview({
 *   compute: () => {
 *     const expr = state.expression.value;
 *     if (!expr || state.error.value) return null;
 *     // ... compute preview rows ...
 *     return { title: 'Filter Preview', stats: '...', columns: [...], rows: [...] };
 *   },
 *   deps: () => { state.expression.value; state.error.value; },
 * });
 * ```
 */
export function useTransformPreview(config: TransformPreviewConfig): TransformPreviewResult {
  const handleRef = useRef<PreviewHandle | null>(null);

  // Create the preview handle once on mount
  if (handleRef.current === null) {
    handleRef.current = createDebouncedPreview({
      compute: config.compute,
      debounceMs: config.debounceMs,
      onError: config.onError,
    });
  }
  const handle = handleRef.current;

  // Auto-trigger preview when dependency signals change
  useSignalEffect(() => {
    config.deps();
    handle.trigger();
  });

  // Cleanup on unmount: cancel pending timers and clear preview state
  useEffect(() => {
    return () => {
      handle.clear();
    };
  }, []);

  return {
    trigger: () => handle.trigger(),
    cancel: () => handle.cancel(),
  };
}
