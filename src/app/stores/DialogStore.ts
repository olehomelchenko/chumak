/**
 * DialogStore
 *
 * Centralized state management for dialogs.
 * Transform dialogs use useDialogState hook (local signals).
 * Non-transform dialogs (import, settings, etc.) still use global state here.
 */

import { signal } from '@preact/signals';

// Import states from organized subdirectories
import {
  // Column states (only type-conversion remains — non-transform)
  typeConversionState,
  // Import states
  importUrlState,
  settingsState,
  previewState,
  generateState,
  importCsvState,
  importTextState,
  workflowImportState,
  // Reset function
  resetAllDialogStates,
} from './dialogs';

// Re-export types for backward compatibility
export type { ColumnEditorColumn } from '../handlers/dialog/column-editor-handlers';
export type { KeyPairAnalysis, MismatchPreview } from '../handlers/transform/join-handlers';

/**
 * DialogStore class
 *
 * Provides static access to dialog states.
 * Transform dialogs have been migrated to useDialogState — only
 * non-transform dialog states remain here.
 */
export class DialogStore {
  // Column states (non-transform only)
  static typeConversionState = typeConversionState;

  // Import states
  static importUrlState = importUrlState;
  static settingsState = settingsState;
  static previewState = previewState;
  static generateState = generateState;
  static importCsvState = importCsvState;
  static importTextState = importTextState;
  static workflowImportState = workflowImportState;

  // Bridge signals for useDialogState hook
  // These are written by the hook and read by the dialog lifecycle
  // (hasUnsavedChanges, activeDialogError, Apply button state).
  static activeDialogState = signal<Record<string, any> | null>(null);
  static activeDialogHasError = signal(false);
  static activeDialogError = signal<string | null>(null);

  /**
   * Creates a reactive proxy for a signal-based state object.
   * Allows direct property access and assignment to be transparently
   * mapped to Preact signals (e.g., `state.foo` instead of `state.foo.value`).
   */
  static createSignalProxy<T extends object>(state: T): any {
    return new Proxy(
      {},
      {
        get(_, prop) {
          const s = (state as any)[prop];
          return s && typeof s === 'object' && 'value' in s ? s.value : s;
        },
        set(_, prop, value) {
          const s = (state as any)[prop];
          if (s && typeof s === 'object' && 'value' in s) {
            s.value = value;
            return true;
          }
          return false;
        },
      }
    );
  }

  /**
   * Resets all dialog states to their initial values.
   */
  static resetAll() {
    resetAllDialogStates();
    // Reset bridge signals used by useDialogState hook
    DialogStore.activeDialogState.value = null;
    DialogStore.activeDialogHasError.value = false;
    DialogStore.activeDialogError.value = null;
  }
}
