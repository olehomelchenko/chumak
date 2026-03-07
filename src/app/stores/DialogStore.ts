/**
 * DialogStore
 *
 * Centralized state management for all dialogs in the application.
 * States are organized in subdirectories under ./dialogs/ and re-exported here
 * for backward compatibility.
 */

// Import all states from organized subdirectories
import {
  // Transform states
  sortState,
  sliceRowsState,
  sampleState,
  indexState,
  replaceState,
  filterState,
  deriveState,
  imputeState,
  conditionalState,
  promoteHeaderState,
  // Column states
  spreadState,
  unrollState,
  typeConversionState,
  mergeState,
  dedupeState,
  splitState,
  columnEditorState,
  // Aggregate states
  foldState,
  aggregateState,
  pivotState,
  windowState,
  // Text states
  textState,
  regexpMatchState,
  regexpExtractState,
  dateState,
  parseDateState,
  // Pattern states
  selectPatternState,
  removePatternState,
  renamePatternState,
  // Combine states
  joinState,
  appendState,
  // Import states
  importUrlState,
  settingsState,
  previewState,
  generateState,
  importCsvState,
  importTextState,
  // Reset function
  resetAllDialogStates,
} from './dialogs';

// Re-export types for backward compatibility
export type { Aggregation, PivotOptions } from './dialogs/aggregate';
export type { ColumnEditorColumn } from './dialogs/column';
export type { KeyPairAnalysis, MismatchPreview } from './dialogs/combine';

/**
 * DialogStore class
 *
 * Provides static access to all dialog states for backward compatibility.
 * All states are now defined in separate modules under ./dialogs/
 */
export class DialogStore {
  // Transform states
  static sortState = sortState;
  static sliceRowsState = sliceRowsState;
  static sampleState = sampleState;
  static indexState = indexState;
  static replaceState = replaceState;
  static filterState = filterState;
  static deriveState = deriveState;
  static imputeState = imputeState;
  static conditionalState = conditionalState;
  static promoteHeaderState = promoteHeaderState;

  // Column states
  static spreadState = spreadState;
  static unrollState = unrollState;
  static typeConversionState = typeConversionState;
  static mergeState = mergeState;
  static dedupeState = dedupeState;
  static splitState = splitState;
  static columnEditorState = columnEditorState;

  // Aggregate states
  static foldState = foldState;
  static aggregateState = aggregateState;
  static pivotState = pivotState;
  static windowState = windowState;

  // Text states
  static textState = textState;
  static regexpMatchState = regexpMatchState;
  static regexpExtractState = regexpExtractState;
  static dateState = dateState;
  static parseDateState = parseDateState;

  // Pattern states
  static selectPatternState = selectPatternState;
  static removePatternState = removePatternState;
  static renamePatternState = renamePatternState;

  // Combine states
  static joinState = joinState;
  static appendState = appendState;

  // Import states
  static importUrlState = importUrlState;
  static settingsState = settingsState;
  static previewState = previewState;
  static generateState = generateState;
  static importCsvState = importCsvState;
  static importTextState = importTextState;

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
  }
}
