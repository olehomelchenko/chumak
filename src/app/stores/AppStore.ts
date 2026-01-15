import { signal, computed } from '@preact/signals';
import { Source, Model, DataRow, DialogName } from '../types';

export type ViewMode = 'empty' | 'dataset-info' | 'model';

/**
 * AppStore
 *
 * Centralized signal-based store for global application state.
 * This is the "Source of Truth" that replaces individual properties in ChumakApp.
 */
export class AppStore {
  // Data State
  static sources = signal<Source[]>([]);
  static models = signal<Model[]>([]);
  static activeSource = signal<Source | null>(null);
  static activeModel = signal<Model | null>(null);
  static currentData = signal<DataRow[] | null>(null);
  static columns = signal<string[]>([]);

  // Navigation / View State
  static viewMode = signal<ViewMode>('empty');
  static activeStepIndex = signal<number | null>(null);
  static viewingIntermediate = signal(false);

  // UI State
  static ribbonTab = signal('prepare');
  static activeTab = signal('steps');
  static activeDialog = signal<DialogName>(null);
  static isDragging = signal(false);
  static selectedColumn = signal<string | null>(null);
  static theme = signal<'chumak' | 'blues'>('chumak');
  static isTransforming = signal(false);
  static transformMessage = signal('');

  // Computed properties
  static hasData = computed(() => AppStore.sources.value.length > 0);

  /**
   * Resets the entire store to initial state
   */
  static reset() {
    this.sources.value = [];
    this.models.value = [];
    this.activeSource.value = null;
    this.activeModel.value = null;
    this.currentData.value = null;
    this.columns.value = [];
    this.viewMode.value = 'empty';
    this.activeStepIndex.value = null;
    this.viewingIntermediate.value = false;
    this.ribbonTab.value = 'prepare';
    this.activeTab.value = 'steps';
    this.activeDialog.value = null;
    this.isDragging.value = false;
    this.selectedColumn.value = null;
    this.isTransforming.value = false;
    this.transformMessage.value = '';
  }
}
