import { signal, Signal } from '@preact/signals';
import { FilterPreviewMode } from '../components/FilterDialog';
import { JoinType, JoinTarget } from '../components/JoinDialog';

// Defines all possible dialog names in the application
export type DialogName =
  | 'sort'
  | 'index'
  | 'replace'
  | 'sliceRows'
  | 'fold' // Unpivot
  | 'filter'
  | 'pivot'
  | 'date'
  | 'derive'
  | 'split'
  | 'join'
  | 'aggregate'
  | 'import-csv'
  | 'import-url'
  | 'column-editor'
  | 'settings'
  | 'download'
  | 'regexpMatch'
  | 'regexpExtract'
  | 'dedupe'
  | 'about'
  | 'expressions'
  | 'reference'
  | null;

export interface SortDialogState {
  field: string;
  order: 'asc' | 'desc';
}

export interface JoinState {
  rightModel: Signal<string | null>;
  joinType: Signal<JoinType>;
  keyPairs: Signal<(string | null)[][]>;
  suffixes: Signal<string[]>;
  targets: Signal<JoinTarget[]>;
  rightColumns: Signal<string[]>;
  previewData: Signal<any | null>;
  previewError: Signal<string | null>;
  isPreviewing: Signal<boolean>;
}

export interface FilterState {
  expression: Signal<string>;
  error: Signal<string | null>;
  previewMode: Signal<FilterPreviewMode>;
}

export interface DeriveState {
  columnName: Signal<string>;
  expression: Signal<string>;
  error: Signal<string | null>;
}

/**
 * DialogStore
 *
 * Centralized state management for all dialogs in the application.
 * Replaces the fragmented state logic previously found in dialog-handlers.ts and Alpine models.
 */
export class DialogStore {
  // Global Dialog State
  static activeDialog = signal<DialogName>(null);

  // Dialog-Specific States
  // Using signals allows components to subscribe directly without glue code.

  // Sort Dialog State
  static sortState = {
    field: signal(''),
    order: signal<'asc' | 'desc'>('asc'),
  };

  // Join Dialog State
  static joinState = {
    rightModel: signal<string | null>(null),
    joinType: signal<JoinType>('left'),
    keyPairs: signal<(string | null)[][]>([[null, null]]),
    suffixes: signal<string[]>(['_x', '_y']),
    targets: signal<JoinTarget[]>([]),
    rightColumns: signal<string[]>([]),
    previewData: signal<any | null>(null),
    previewError: signal<string | null>(null),
    isPreviewing: signal(false),
  };

  // Filter Dialog State
  static filterState = {
    expression: signal(''),
    error: signal<string | null>(null),
    previewMode: signal<FilterPreviewMode>('all'),
  };

  // Derive Dialog State
  static deriveState = {
    columnName: signal(''),
    expression: signal(''),
    error: signal<string | null>(null),
  };

  /**
   * Opens a dialog and initializes it with default or provided values.
   */
  static openDialog(name: DialogName, initialState?: Partial<any>) {
    // Reset specific state based on dialog name if needed
    if (name === 'sort' && initialState) {
      if (initialState.field !== undefined) this.sortState.field.value = initialState.field;
      if (initialState.order !== undefined) this.sortState.order.value = initialState.order;
    }

    // Initialize Filter defaults if needed
    if (name === 'filter') {
      // Reset or use initial state
      this.filterState.expression.value = initialState?.expression || '';
      this.filterState.error.value = null;
      this.filterState.previewMode.value = initialState?.previewMode || 'all';
    }

    // Initialize Derive defaults if needed
    if (name === 'derive') {
      this.deriveState.columnName.value = initialState?.columnName || '';
      this.deriveState.expression.value = initialState?.expression || '';
      this.deriveState.error.value = null;
    }

    this.activeDialog.value = name;
  }

  /**
   * Closes the currently active dialog.
   */
  static closeDialog() {
    this.activeDialog.value = null;
  }
}
