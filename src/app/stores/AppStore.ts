import { signal, computed } from '@preact/signals';
import { Source, Model, DataRow, DialogName, Notification } from '../types';
import { ColumnSchema } from '../../core/schema-engine';
import { UXSettings } from '../../core/ux-settings';

export type ViewMode = 'empty' | 'dataset-info' | 'model';

/**
 * AppStore
 *
 * Centralized signal-based store for global application state.
 * This is the "Source of Truth" that replaces individual properties in SytoApp.
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
  static theme = signal<'syto' | 'blues'>('syto');
  static isTransforming = signal(false);
  static transformMessage = signal('');
  static columnToolbarPos = signal({ x: 0, y: 0, arrowOffset: 0 });
  static selectedCell = signal<any>(null);
  static cellToolbarPos = signal({ x: 0, y: 0, arrowOffset: 0 });
  static edaStats = signal<any>(null);
  static edaChartView = signal<'boxplot' | 'histogram'>('boxplot');
  static edaBrushSelection = signal<{ min: number; max: number } | null>(null);
  static edaDateTreatment = signal<'temporal' | 'categorical'>('temporal');
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

  // Intermediate viewing state
  static viewingSchema = signal<ColumnSchema[] | null>(null);

  // UX Settings
  static uxSettings = signal<UXSettings>({
    pagination: { pageSize: 500 },
    preview: { rowLimit: 100 },
    theme: 'syto',
    analyticsOptOut: false,
  });

  // Type Menu State
  static typeMenuOpen = signal(false);
  static typeMenuPos = signal({ x: 0, y: 0 });
  static typeMenuCol = signal<string | null>(null);

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
    this.viewingSchema.value = null;
    this.typeMenuOpen.value = false;
    this.typeMenuCol.value = null;
  }
}
