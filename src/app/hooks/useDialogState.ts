/**
 * useDialogState — Local signal-based state for dialogs
 *
 * Replaces the per-dialog global state pattern (sort-state.ts, etc.)
 * and the DialogCoordinator init switch case.
 *
 * State is created locally in the component via a factory function,
 * then bridged to the existing dialog lifecycle (snapshot/dirty detection,
 * error state for Apply button) via signals on DialogStore.
 */

import { Signal } from '@preact/signals';
import { useRef, useEffect } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import type { ColumnSchema, TransformStep } from '../../core/schema-engine';

/**
 * Context available to the state factory when creating dialog state.
 */
export interface DialogContext {
  /** Current column names */
  columns: string[];
  /** User's selected columns (from column header clicks) */
  selectedColumns: string[];
  /** Current schema with type info */
  schema: ColumnSchema[];
  /** Non-null when editing an existing step (from AppStore.editingStepIndex) */
  editingStep: TransformStep | null;
}

/**
 * Options for customizing dialog state behavior.
 */
export interface DialogStateOptions<T> {
  /**
   * Serialize state for change detection (snapshot/dirty check).
   * Defaults to reading all signal `.value` properties from state.
   */
  getState?: (state: T) => Record<string, any>;
  /** Return true if the Apply button should be disabled */
  hasError?: (state: T) => boolean;
  /** Return error message for Apply button tooltip */
  getError?: (state: T) => string | null;
}

export interface DialogStateResult<T> {
  /** The signal-based state created by the factory */
  state: T;
  /** Whether state has diverged from the initial snapshot */
  isDirty: () => boolean;
}

/**
 * Default state serializer: reads `.value` from all Signal properties.
 */
function defaultGetState<T extends Record<string, any>>(state: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(state)) {
    const val = state[key];
    if (val && typeof val === 'object' && 'value' in val && val instanceof Signal) {
      result[key] = val.value;
    }
  }
  return result;
}

/**
 * Builds DialogContext from current AppStore state.
 */
function buildContext(): DialogContext {
  const columns = AppStore.columns.value;
  const selectedColumns = AppStore.selectedColumns.value;
  const schema = AppStore.activeModel.value?.schema ?? [];

  const editingIndex = AppStore.editingStepIndex.value;
  const editingStep =
    editingIndex !== null ? (AppStore.activeModel.value?.steps[editingIndex] ?? null) : null;

  return { columns, selectedColumns, schema, editingStep };
}

/**
 * Hook that creates local signal-based state for a dialog.
 *
 * @example
 * ```tsx
 * const { state } = useDialogState(
 *   (ctx) => ({
 *     fields: signal<SortField[]>(
 *       ctx.selectedColumns.length > 0
 *         ? ctx.selectedColumns.map(col => ({ field: col, order: 'asc' as const }))
 *         : [{ field: ctx.columns[0] || '', order: 'asc' as const }]
 *     ),
 *   }),
 *   {
 *     hasError: (s) => s.fields.value.filter(f => f.field !== '').length === 0,
 *   }
 * );
 * ```
 */
export function useDialogState<T extends Record<string, any>>(
  factory: (context: DialogContext) => T,
  options?: DialogStateOptions<T>
): DialogStateResult<T> {
  const getState = options?.getState ?? defaultGetState;
  const hasError = options?.hasError;
  const getError = options?.getError;

  // Create state once on mount (ref guards against re-creation)
  const stateRef = useRef<T | null>(null);
  if (stateRef.current === null) {
    stateRef.current = factory(buildContext());
  }
  const state = stateRef.current;

  // Snapshot on mount for dirty detection
  const snapshotRef = useRef<string | null>(null);
  if (snapshotRef.current === null) {
    const serialized = getState(state);
    snapshotRef.current = JSON.stringify(serialized);
    // Also write to AppStore.dialogSnapshot so hasUnsavedChanges() works
    AppStore.dialogSnapshot.value = snapshotRef.current;
  }

  // Bridge state changes to DialogStore for the existing lifecycle
  useSignalEffect(() => {
    const serialized = getState(state);
    DialogStore.activeDialogState.value = serialized;
  });

  // Bridge error state
  useSignalEffect(() => {
    DialogStore.activeDialogHasError.value = hasError ? hasError(state) : false;
    DialogStore.activeDialogError.value = getError ? getError(state) : null;
  });

  // Cleanup on unmount: clear bridge signals
  useEffect(() => {
    return () => {
      DialogStore.activeDialogState.value = null;
      DialogStore.activeDialogHasError.value = false;
      DialogStore.activeDialogError.value = null;
    };
  }, []);

  const isDirty = (): boolean => {
    if (snapshotRef.current === null) return false;
    const current = JSON.stringify(getState(state));
    return current !== snapshotRef.current;
  };

  return { state, isDirty };
}
