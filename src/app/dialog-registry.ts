/**
 * Dialog Registry
 *
 * Centralized configuration for all dialogs in Syto.
 * This single source of truth reduces maintenance burden and prevents inconsistencies.
 *
 * When adding a new dialog:
 * 1. Add entry to DIALOG_REGISTRY below (including applyHandler if transform dialog)
 * 2. Create dialog component in src/app/components/
 * 3. Add dialog state to DialogStore (if needed)
 * 4. Implement handler function (if transform dialog)
 */

import type { ComponentType } from 'preact';
import type { DialogName } from './types';
import type { ExecutionCallbacks } from './services/StepService';
import { DialogStore } from './stores/DialogStore';
import i18n from '../i18n';

// Transform handlers
import * as FilterHandlers from './handlers/transform/filter-handlers';
import * as DeriveHandlers from './handlers/transform/derive-handlers';
import * as SimpleHandlers from './handlers/transform/simple-handlers';
import * as SampleHandlers from './handlers/transform/sample-handlers';
import * as SpreadHandlers from './handlers/transform/spread-handlers';
import * as UnrollHandlers from './handlers/transform/unroll-handlers';
import * as SplitHandlers from './handlers/transform/split-handlers';
import * as MergeHandlers from './handlers/transform/merge-handlers';
import * as RegexpHandlers from './handlers/transform/regexp-handlers';
import * as DateHandlers from './handlers/transform/date-handlers';
import * as ParseDateHandlers from './handlers/transform/parse-date-handlers';
import * as TextHandlers from './handlers/transform/text-handlers';
import * as FoldHandlers from './handlers/transform/fold-handlers';
import * as PivotHandlers from './handlers/transform/pivot-handlers';
import * as AggregateHandlers from './handlers/transform/aggregate-handlers';
import * as WindowHandlers from './handlers/transform/window-handlers';
import * as JoinHandlers from './handlers/transform/join-handlers';
import * as AppendHandlers from './handlers/transform/append-handlers';
import * as DedupeHandlers from './handlers/transform/dedupe-handlers';
import * as PatternHandlers from './handlers/transform/pattern-handlers';
import * as ColumnEditorHandlers from './handlers/dialog/column-editor-handlers';

// Dialog type determines rendering location and style
export type DialogType = 'slide-panel' | 'centered-modal' | 'full-page';

// Apply handler function type
export type ApplyHandler = (callbacks: ExecutionCallbacks) => Promise<void>;

// Dialog metadata interface
export interface DialogConfig {
  name: DialogName;
  title: string;
  type: DialogType;
  component?: ComponentType<any>; // Optional: can be lazy-loaded
  buttonText?: string; // Custom button text (defaults to "Apply")
  initState?: (section?: string) => void; // Optional initialization logic
  isUrlNavigable?: boolean; // Whether dialog should update URL hash
  applyHandler?: ApplyHandler; // Handler called when Apply is clicked
}

/**
 * Dialog Registry
 *
 * Centralized metadata for all dialogs.
 * Order doesn't matter - this is a lookup table, not execution order.
 */
export const DIALOG_REGISTRY: Record<string, DialogConfig> = {
  // === Transform Dialogs (Slide Panels) ===

  filter: {
    name: 'filter',
    title: 'Filter Rows',
    type: 'slide-panel',
    applyHandler: (cb) => FilterHandlers.applyFilterTransform(cb),
  },

  derive: {
    name: 'derive',
    title: 'Derive Column',
    type: 'slide-panel',
    applyHandler: (cb) => DeriveHandlers.applyDeriveTransform(cb),
  },

  sort: {
    name: 'sort',
    title: 'Sort Rows',
    type: 'slide-panel',
    applyHandler: (cb) => SimpleHandlers.applySortTransform(cb),
  },

  sliceRows: {
    name: 'sliceRows',
    title: 'Keep / Remove Rows',
    type: 'slide-panel',
    applyHandler: (cb) => SimpleHandlers.applySliceRowsTransform(cb),
  },

  index: {
    name: 'index',
    title: 'Add Index Column',
    type: 'slide-panel',
    applyHandler: (cb) => SimpleHandlers.applyIndexTransform(cb),
  },

  sample: {
    name: 'sample',
    title: 'Sample Rows',
    type: 'slide-panel',
    applyHandler: (cb) => SampleHandlers.applySampleTransform(cb),
  },

  spread: {
    name: 'spread',
    title: 'Spread Array Column',
    type: 'slide-panel',
    applyHandler: (cb) => SpreadHandlers.applySpreadTransform(cb),
  },

  unroll: {
    name: 'unroll',
    title: 'Unroll Array Column',
    type: 'slide-panel',
    applyHandler: (cb) => UnrollHandlers.applyUnrollTransform(cb),
  },

  split: {
    name: 'split',
    title: 'Split Column',
    type: 'slide-panel',
    applyHandler: (cb) => SplitHandlers.applySplitTransform(cb),
  },

  merge: {
    name: 'merge',
    title: 'Merge Columns',
    type: 'slide-panel',
    applyHandler: (cb) => MergeHandlers.applyMergeTransform(cb),
  },

  regexpMatch: {
    name: 'regexpMatch',
    title: 'Regexp Match',
    type: 'slide-panel',
    applyHandler: (cb) => RegexpHandlers.applyRegexpMatchTransform(cb),
  },

  regexpExtract: {
    name: 'regexpExtract',
    title: 'Regexp Extract',
    type: 'slide-panel',
    applyHandler: (cb) => RegexpHandlers.applyRegexpExtractTransform(cb),
  },

  date: {
    name: 'date',
    title: 'Date Operations',
    type: 'slide-panel',
    applyHandler: (cb) => DateHandlers.applyDateTransform(cb),
  },

  parseDate: {
    name: 'parseDate',
    title: 'Parse Date',
    type: 'slide-panel',
    applyHandler: (cb) => ParseDateHandlers.applyParseDateTransform(cb),
  },

  text: {
    name: 'text',
    title: 'Text Operations',
    type: 'slide-panel',
    applyHandler: (cb) => TextHandlers.applyTextTransform(cb),
  },

  dedupe: {
    name: 'dedupe',
    title: 'Duplicates',
    type: 'slide-panel',
    applyHandler: (cb) => DedupeHandlers.applyDedupeTransform(cb),
  },

  fold: {
    name: 'fold',
    title: 'Unpivot Data (Fold)',
    type: 'slide-panel',
    applyHandler: (cb) => FoldHandlers.applyFoldTransform(cb),
  },

  pivot: {
    name: 'pivot',
    title: 'Pivot Data (Wide)',
    type: 'slide-panel',
    applyHandler: (cb) => PivotHandlers.applyPivotTransform(cb),
  },

  aggregate: {
    name: 'aggregate',
    title: 'Group By',
    type: 'slide-panel',
    applyHandler: (cb) => AggregateHandlers.applyAggregateTransform(cb),
  },

  window: {
    name: 'window',
    title: 'Window Functions',
    type: 'slide-panel',
    applyHandler: (cb) => WindowHandlers.applyWindowTransform(cb),
  },

  join: {
    name: 'join',
    title: 'Join Data',
    type: 'slide-panel',
    buttonText: 'Apply Join',
    applyHandler: (cb) => JoinHandlers.applyJoinTransform(cb),
  },

  append: {
    name: 'append',
    title: 'Append Data',
    type: 'slide-panel',
    buttonText: 'Apply Append',
    applyHandler: (cb) => AppendHandlers.applyAppendTransform(cb),
  },

  replace: {
    name: 'replace',
    title: 'Replace Values',
    type: 'slide-panel',
    applyHandler: (cb) => SimpleHandlers.applyReplaceTransform(cb),
  },

  'column-editor': {
    name: 'column-editor',
    title: 'Edit Columns',
    type: 'slide-panel',
    applyHandler: (cb) => ColumnEditorHandlers.applyColumnEditorTransform(cb),
  },

  impute: {
    name: 'impute',
    title: 'Impute Missing Values',
    type: 'slide-panel',
    applyHandler: (cb) => SimpleHandlers.applyImputeTransform(cb),
  },

  selectPattern: {
    name: 'selectPattern',
    title: 'Select Pattern',
    type: 'slide-panel',
    applyHandler: (cb) => PatternHandlers.applySelectPatternTransform(cb),
  },

  removePattern: {
    name: 'removePattern',
    title: 'Remove Pattern',
    type: 'slide-panel',
    applyHandler: (cb) => PatternHandlers.applyRemovePatternTransform(cb),
  },

  conditional: {
    name: 'conditional',
    title: 'Conditional Column',
    type: 'slide-panel',
    applyHandler: (cb) => PatternHandlers.applyConditionalTransform(cb),
  },

  renamePattern: {
    name: 'renamePattern',
    title: 'Rename Pattern',
    type: 'slide-panel',
    applyHandler: (cb) => PatternHandlers.applyRenamePatternTransform(cb),
  },

  // === Import Dialogs ===

  'import-csv': {
    name: 'import-csv',
    title: 'Import CSV', // Note: title changes dynamically for JSON
    type: 'slide-panel',
    buttonText: 'Import',
  },

  'import-url': {
    name: 'import-url',
    title: 'Import from URL',
    type: 'slide-panel',
    buttonText: 'Fetch Data',
  },

  generate: {
    name: 'generate',
    title: 'Generate Data',
    type: 'slide-panel',
    buttonText: 'Generate',
  },

  // === Utility Dialogs (Centered Modals) ===

  settings: {
    name: 'settings',
    title: 'Settings',
    type: 'centered-modal',
    isUrlNavigable: true,
  },

  download: {
    name: 'download',
    title: 'Download Data',
    type: 'centered-modal',
    buttonText: 'Download',
  },

  'type-conversion': {
    name: 'type-conversion',
    title: 'Type Conversion',
    type: 'centered-modal',
  },

  // === Info Pages (Centered Modals, URL Navigable) ===

  expressions: {
    name: 'expressions',
    title: 'Reference',
    type: 'centered-modal',
    isUrlNavigable: true,
  },

  reference: {
    name: 'reference',
    title: 'Reference',
    type: 'centered-modal',
    isUrlNavigable: true,
    // Workaround: globalThis is used because initState runs before the component mounts,
    // so a prop/signal can't reach FunctionReferenceDialog in time. Cleaned up on mount.
    initState: (section?: string) => {
      if (section) {
        (globalThis as any).__referenceSection = section;
      }
    },
  },

  'dependency-graph': {
    name: 'dependency-graph',
    title: 'Dependency Graph',
    type: 'centered-modal',
    isUrlNavigable: false,
  },
};

/**
 * Utility functions for querying dialog registry
 */

export function getDialogConfig(dialogName: DialogName): DialogConfig | undefined {
  if (!dialogName) return undefined;
  return DIALOG_REGISTRY[dialogName];
}

export function isSlidePanel(dialogName: DialogName): boolean {
  const config = getDialogConfig(dialogName);
  return config?.type === 'slide-panel';
}

export function isCenteredModal(dialogName: DialogName): boolean {
  const config = getDialogConfig(dialogName);
  return config?.type === 'centered-modal';
}

export function getDialogTitle(dialogName: DialogName): string {
  if (!dialogName) return '';

  // Special case: import-csv title changes based on file type
  if (dialogName === 'import-csv' && DialogStore.importCsvState.isJson.value) {
    return i18n.t('dialogs:titles.importJson');
  }
  if (dialogName === 'import-csv') {
    return i18n.t('dialogs:titles.importCsv');
  }

  // Map dialog name to translation key (convert kebab-case to camelCase)
  const keyMap: Record<string, string> = {
    'slice-rows': 'sliceRows',
    'regexp-match': 'regexpMatch',
    'regexp-extract': 'regexpExtract',
    'parse-date': 'parseDate',
    'column-editor': 'columnEditor',
    'select-pattern': 'selectPattern',
    'remove-pattern': 'removePattern',
    'rename-pattern': 'renamePattern',
    'import-url': 'importUrl',
    'type-conversion': 'typeConversion',
    'dependency-graph': 'dependencyGraph',
  };

  const key = keyMap[dialogName] || dialogName;
  const config = getDialogConfig(dialogName);
  return i18n.t(`dialogs:titles.${key}`, config?.title || '');
}

export function getDialogButtonText(dialogName: DialogName): string {
  if (!dialogName) return 'Apply';

  const config = getDialogConfig(dialogName);
  return config?.buttonText || 'Apply';
}

export function isUrlNavigableDialog(dialogName: DialogName): boolean {
  const config = getDialogConfig(dialogName);
  return config?.isUrlNavigable ?? false;
}

/**
 * Get list of all dialog names by type
 */
export function getDialogsByType(type: DialogType): DialogName[] {
  return Object.values(DIALOG_REGISTRY)
    .filter((config) => config.type === type)
    .map((config) => config.name);
}

/**
 * Get all URL-navigable dialog names
 */
export function getUrlNavigableDialogs(): DialogName[] {
  return Object.values(DIALOG_REGISTRY)
    .filter((config) => config.isUrlNavigable)
    .map((config) => config.name);
}
