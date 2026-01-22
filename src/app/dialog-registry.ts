/**
 * Dialog Registry
 *
 * Centralized configuration for all dialogs in Syto.
 * This single source of truth reduces maintenance burden and prevents inconsistencies.
 *
 * When adding a new dialog:
 * 1. Add entry to DIALOG_REGISTRY below
 * 2. Create dialog component in src/app/components/
 * 3. Add dialog state to DialogStore (if needed)
 * 4. Implement handler function (if transform dialog)
 */

import type { ComponentType } from 'preact';
import type { DialogName } from './types';
import type { SytoApp } from '../syto-app';

// Dialog type determines rendering location and style
export type DialogType = 'slide-panel' | 'centered-modal' | 'full-page';

// Dialog metadata interface
export interface DialogConfig {
  name: DialogName;
  title: string;
  type: DialogType;
  component?: ComponentType<any>; // Optional: can be lazy-loaded
  buttonText?: string; // Custom button text (defaults to "Apply")
  initState?: (app: SytoApp, section?: string) => void; // Optional initialization logic
  isUrlNavigable?: boolean; // Whether dialog should update URL hash
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
  },

  derive: {
    name: 'derive',
    title: 'Derive Column',
    type: 'slide-panel',
  },

  sort: {
    name: 'sort',
    title: 'Sort Rows',
    type: 'slide-panel',
  },

  sliceRows: {
    name: 'sliceRows',
    title: 'Keep / Remove Rows',
    type: 'slide-panel',
  },

  index: {
    name: 'index',
    title: 'Add Index Column',
    type: 'slide-panel',
  },

  split: {
    name: 'split',
    title: 'Split Column',
    type: 'slide-panel',
  },

  regexpMatch: {
    name: 'regexpMatch',
    title: 'Regexp Match',
    type: 'slide-panel',
  },

  regexpExtract: {
    name: 'regexpExtract',
    title: 'Regexp Extract',
    type: 'slide-panel',
  },

  date: {
    name: 'date',
    title: 'Date Operations',
    type: 'slide-panel',
  },

  dedupe: {
    name: 'dedupe',
    title: 'Duplicates',
    type: 'slide-panel',
  },

  fold: {
    name: 'fold',
    title: 'Unpivot Data (Fold)',
    type: 'slide-panel',
  },

  pivot: {
    name: 'pivot',
    title: 'Pivot Data (Wide)',
    type: 'slide-panel',
  },

  aggregate: {
    name: 'aggregate',
    title: 'Group By',
    type: 'slide-panel',
  },

  join: {
    name: 'join',
    title: 'Join Data',
    type: 'slide-panel',
    buttonText: 'Apply Join',
  },

  concat: {
    name: 'concat',
    title: 'Concat Data',
    type: 'slide-panel',
    buttonText: 'Apply Concat',
  },

  union: {
    name: 'union',
    title: 'Union Data',
    type: 'slide-panel',
    buttonText: 'Apply Union',
  },

  replace: {
    name: 'replace',
    title: 'Replace Values',
    type: 'slide-panel',
  },

  'column-editor': {
    name: 'column-editor',
    title: 'Edit Columns',
    type: 'slide-panel',
  },

  impute: {
    name: 'impute',
    title: 'Impute Missing Values',
    type: 'slide-panel',
  },

  selectPattern: {
    name: 'selectPattern',
    title: 'Select Pattern',
    type: 'slide-panel',
  },

  removePattern: {
    name: 'removePattern',
    title: 'Remove Pattern',
    type: 'slide-panel',
  },

  conditional: {
    name: 'conditional',
    title: 'Conditional Column',
    type: 'slide-panel',
  },

  renamePattern: {
    name: 'renamePattern',
    title: 'Rename Pattern',
    type: 'slide-panel',
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

  about: {
    name: 'about',
    title: 'About Syto',
    type: 'centered-modal',
    isUrlNavigable: true,
  },

  expressions: {
    name: 'expressions',
    title: 'Expression Reference',
    type: 'centered-modal',
    isUrlNavigable: true,
  },

  reference: {
    name: 'reference',
    title: 'Reference',
    type: 'centered-modal',
    isUrlNavigable: true,
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

export function getDialogTitle(dialogName: DialogName, app?: SytoApp): string {
  if (!dialogName) return '';

  // Special case: import-csv title changes based on file type
  if (dialogName === 'import-csv' && app?.importDialogState?.isJson) {
    return 'Import JSON';
  }

  const config = getDialogConfig(dialogName);
  return config?.title || '';
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
