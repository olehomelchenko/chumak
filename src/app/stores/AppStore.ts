import { signal, computed } from '@preact/signals';
import { Source, Model, DataRow, DialogName, Notification } from '../types';
import { ColumnSchema, TransformStep } from '../../core/schema-engine';
import { UXSettings } from '../infrastructure/ux-settings';

export interface HistoryEntry {
  steps: TransformStep[];
  description: string;
}

export interface HistoryStack {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
}

export type ViewMode = 'empty' | 'dataset-info' | 'model' | 'model-info';

/**
 * AppStore
 *
 * Centralized signal-based store for global application state.
 * This is the "Source of Truth" for all application state.
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
  static ribbonTab = signal('rows');
  static activeTab = signal('steps');
  static activeDialog = signal<DialogName>(null);
  static isDragging = signal(false);
  static selectedColumn = signal<string | null>(null);
  static selectedColumns = signal<string[]>([]);
  static columnSelectionAnchor = signal<string | null>(null);
  static selectedRows = signal<number[]>([]);
  static rowSelectionAnchor = signal<number | null>(null);
  static theme = signal<'syto' | 'blues'>('syto');
  static isTransforming = signal(false);
  static transformMessage = signal('');
  static columnToolbarPos = signal({ x: 0, y: 0, arrowOffset: 0 });
  static selectedCell = signal<any>(null);
  static cellToolbarPos = signal({ x: 0, y: 0, arrowOffset: 0 });
  static rowToolbarPos = signal({ x: 0, y: 0, arrowOffset: 0 });
  static edaStats = signal<any>(null);
  static edaChartView = signal<'boxplot' | 'histogram'>('boxplot');
  static edaBrushSelection = signal<{ min: number; max: number } | null>(null);
  static edaDateTreatment = signal<'temporal' | 'categorical'>('temporal');
  static edaNumericTreatment = signal<'numeric' | 'categorical'>('numeric');
  static currentPage = signal(1);
  static pageSize = signal(500);
  static totalPages = signal(1);
  static activeStep = signal<any>(null);
  static editingStepIndex = signal<number | null>(null);
  static dialogSnapshot = signal<string | null>(null);
  static importFileData = signal<{ file: File } | null>(null);

  // JSON Editor
  static jsonEditMode = signal(false);
  static jsonEditContent = signal('');
  static jsonEditError = signal<string | null>(null);
  static jsonEditBackup = signal<any | null>(null);

  // Notifications
  static notifications = signal<Notification[]>([]);
  static notificationIdCounter = signal(0);

  // Custom Dialogs (Alert/Confirm/Prompt)
  static messageBox = signal<{
    visible: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'prompt';
    inputValue: string;
    confirmLabel?: string;
    resolve: ((result: any) => void) | null;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'alert',
    inputValue: '',
    resolve: null,
  });

  // Step removal modal
  static stepRemovalModal = signal<{
    visible: boolean;
    stepIndex: number;
    stepName: string;
    affectedSteps: string[];
    removeMode: 'single' | 'all';
    resolve: ((mode: 'single' | 'all' | null) => void) | null;
  }>({
    visible: false,
    stepIndex: -1,
    stepName: '',
    affectedSteps: [],
    removeMode: 'all',
    resolve: null,
  });

  // Dependency impact modal
  static dependencyImpactModal = signal<{
    visible: boolean;
    dependentModels: Array<{ id: string; name: string; sourceName: string }>;
    action: 'mark-stale' | 'recalculate';
    resolve: ((action: 'mark-stale' | 'recalculate' | null) => void) | null;
  }>({
    visible: false,
    dependentModels: [],
    action: 'mark-stale',
    resolve: null,
  });

  // Intermediate viewing state
  static viewingSchema = signal<ColumnSchema[] | null>(null);

  // UX Settings
  static uxSettings = signal<UXSettings>({
    pagination: { pageSize: 500 },
    preview: { rowLimit: 100 },
    theme: 'syto',
    analyticsOptOut: false,
    language: 'en',
  });

  // Column Menu State (dropdown menu on column header)
  static columnMenuOpen = signal<string | null>(null);
  static columnMenuPos = signal({ x: 0, y: 0 });

  // Type Menu State
  static typeMenuOpen = signal(false);
  static typeMenuPos = signal({ x: 0, y: 0 });
  static typeMenuCol = signal<string | null>(null);

  // Undo/Redo History (per model, session-only)
  static history = signal<Map<string, HistoryStack>>(new Map());

  // Ribbon Popover State
  static ribbonPopover = signal<string | null>(null);
  static ribbonPopoverRect = signal<DOMRect | null>(null);

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
    this.ribbonTab.value = 'rows';
    this.activeTab.value = 'steps';
    this.activeDialog.value = null;
    this.isDragging.value = false;
    this.selectedColumn.value = null;
    this.selectedColumns.value = [];
    this.columnSelectionAnchor.value = null;
    this.selectedRows.value = [];
    this.rowSelectionAnchor.value = null;
    this.isTransforming.value = false;
    this.transformMessage.value = '';
    this.jsonEditMode.value = false;
    this.jsonEditContent.value = '';
    this.notifications.value = [];
    this.notificationIdCounter.value = 0;
    this.messageBox.value = {
      visible: false,
      title: '',
      message: '',
      type: 'alert',
      inputValue: '',
      resolve: null,
    };
    this.stepRemovalModal.value = {
      visible: false,
      stepIndex: -1,
      stepName: '',
      affectedSteps: [],
      removeMode: 'all',
      resolve: null,
    };
    this.dependencyImpactModal.value = {
      visible: false,
      dependentModels: [],
      action: 'mark-stale',
      resolve: null,
    };
    this.viewingSchema.value = null;
    this.columnMenuOpen.value = null;
    this.typeMenuOpen.value = false;
    this.typeMenuCol.value = null;
    this.history.value = new Map();
    this.ribbonPopover.value = null;
    this.ribbonPopoverRect.value = null;
  }
}
