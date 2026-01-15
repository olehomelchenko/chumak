/**
 * Component Library Index
 *
 * Exports all Preact components and utilities for the Chumak app.
 */

// Bridge utilities for Alpine ↔ Preact communication
export { mountComponent, unmountComponent, createMounter } from './PreactBridge';

// Dialog components
export { SortDialog } from './SortDialog';
export type { SortDialogProps } from './SortDialog';

export { IndexDialog } from './IndexDialog';
export type { IndexDialogProps } from './IndexDialog';

export { ReplaceDialog } from './ReplaceDialog';
export type { ReplaceDialogProps } from './ReplaceDialog';

export { SliceRowsDialog } from './SliceRowsDialog';
export type { SliceRowsDialogProps, SliceMode } from './SliceRowsDialog';

export { UnpivotDialog } from './UnpivotDialog';
export type { UnpivotDialogProps, UnpivotMode } from './UnpivotDialog';

export { FilterDialog } from './FilterDialog';
export type { FilterDialogProps, FilterPreviewMode } from './FilterDialog';

export { PivotDialog } from './PivotDialog';
export type { PivotDialogProps, PivotAggregation } from './PivotDialog';

export { DateDialog } from './DateDialog';
export type { DateDialogProps, DateOperation } from './DateDialog';

export { SplitDialog } from './SplitDialog';
export type { SplitDialogProps, SplitMode } from './SplitDialog';

export { DeriveDialog } from './DeriveDialog';
export type { DeriveDialogProps } from './DeriveDialog';

export { JoinDialog } from './JoinDialog';
export type { JoinDialogProps, JoinType, JoinTarget } from './JoinDialog';

export { AggregateDialog } from './AggregateDialog';
export type { AggregateDialogProps, Aggregation } from './AggregateDialog';

export { ImportCsvDialog } from './ImportCsvDialog';
export type { ImportCsvDialogProps } from './ImportCsvDialog';

export { ColumnEditorDialog } from './ColumnEditorDialog';
export type {
  ColumnEditorDialogProps,
  ColumnEditorItem,
  ColumnEditorChanges,
} from './ColumnEditorDialog';

export { SettingsDialog } from './SettingsDialog';
export type { SettingsDialogProps } from './SettingsDialog';

// Layout components
export { RibbonToolbar } from './RibbonToolbar';
export type { RibbonToolbarProps } from './RibbonToolbar';

export { AppHeader } from './AppHeader';
export type { AppHeaderProps } from './AppHeader';
