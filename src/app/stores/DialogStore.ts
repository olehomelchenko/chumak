import { signal, Signal } from '@preact/signals';
import { FilterPreviewMode } from '../components/FilterDialog';
import { JoinType, JoinTarget } from '../components/JoinDialog';

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
 *
 * NOTE: activeDialog is now managed by AppStore to avoid duplication.
 */
export class DialogStore {
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
}
