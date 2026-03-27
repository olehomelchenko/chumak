import { AppStore } from '../../stores/AppStore';
import { DialogStore } from '../../stores/DialogStore';
import * as FilterHandlers from '../transform/filter-handlers';
import * as HelperHandlers from './helper-handlers';

/**
 * Callbacks for EDA operations that need UI interaction
 */
export type EdaCallbacks = {
  updateToolbarPosition: () => void;
  clearColumnSelection: () => void;
};

let callbacks: EdaCallbacks | null = null;

/**
 * Set EDA callbacks for store-based operations
 */
export function setEdaCallbacks(cb: EdaCallbacks): void {
  callbacks = cb;
}

/**
 * Select a column for EDA analysis
 */
export function selectColumn(col: string, modifiers?: { shift?: boolean; meta?: boolean }): void {
  AppStore.selectedCell.value = null;
  AppStore.typeMenuOpen.value = false;

  if (modifiers?.meta) {
    // Cmd/Ctrl+Click: toggle column in multi-selection
    const current = [...AppStore.selectedColumns.value];
    const idx = current.indexOf(col);
    if (idx >= 0) {
      current.splice(idx, 1);
      if (current.length === 0) {
        AppStore.selectedColumn.value = null;
        AppStore.selectedColumns.value = [];
        AppStore.columnSelectionAnchor.value = null;
        AppStore.edaStats.value = null;
        AppStore.edaBrushSelection.value = null;
        return;
      }
      AppStore.selectedColumns.value = current;
      // Set primary to last remaining
      AppStore.selectedColumn.value = current[current.length - 1];
    } else {
      current.push(col);
      AppStore.selectedColumns.value = current;
      AppStore.selectedColumn.value = col;
      AppStore.columnSelectionAnchor.value = col;
    }
    AppStore.selectedRows.value = [];
    AppStore.rowSelectionAnchor.value = null;
    requestAnimationFrame(() => callbacks?.updateToolbarPosition());
  } else if (modifiers?.shift && AppStore.columnSelectionAnchor.value) {
    // Shift+Click: range selection from anchor to clicked column
    const allCols = AppStore.columns.value;
    const anchorIdx = allCols.indexOf(AppStore.columnSelectionAnchor.value);
    const clickIdx = allCols.indexOf(col);
    if (anchorIdx >= 0 && clickIdx >= 0) {
      const min = Math.min(anchorIdx, clickIdx);
      const max = Math.max(anchorIdx, clickIdx);
      AppStore.selectedColumns.value = allCols.slice(min, max + 1);
      AppStore.selectedColumn.value = col;
      AppStore.selectedRows.value = [];
      AppStore.rowSelectionAnchor.value = null;
    }
    requestAnimationFrame(() => callbacks?.updateToolbarPosition());
  } else {
    // Plain click: single selection (toggle if same column)
    if (AppStore.selectedColumn.value === col && AppStore.selectedColumns.value.length <= 1) {
      AppStore.selectedColumn.value = null;
      AppStore.selectedColumns.value = [];
      AppStore.columnSelectionAnchor.value = null;
      return;
    }

    AppStore.selectedColumn.value = col;
    AppStore.selectedColumns.value = [col];
    AppStore.columnSelectionAnchor.value = col;
    AppStore.selectedRows.value = [];
    AppStore.rowSelectionAnchor.value = null;
    requestAnimationFrame(() => callbacks?.updateToolbarPosition());
  }
}

/**
 * Select an EDA stat value for cell toolbar display
 */
export function selectEdaStat(label: string, rawValue: any, event: any): void {
  const el = event.currentTarget;
  const selectedColumn = AppStore.selectedColumn.value;

  AppStore.selectedCell.value = null;
  AppStore.selectedCell.value = {
    col: selectedColumn!,
    value: rawValue,
    type: 'number',
    isEda: true,
    edaLabel: label,
  };

  requestAnimationFrame(() => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const toolbarWidth = 220;
    const windowWidth = window.innerWidth;
    const margin = 12;
    const x = Math.max(
      toolbarWidth / 2 + margin,
      Math.min(windowWidth - toolbarWidth / 2 - margin, center)
    );
    AppStore.cellToolbarPos.value = { x, y: rect.top - 8, arrowOffset: center - x };
  });
}

/**
 * Set chart view type (boxplot or histogram)
 */
export function setEdaChartView(view: 'boxplot' | 'histogram'): void {
  AppStore.edaChartView.value = view;
  AppStore.edaBrushSelection.value = null;
}

/**
 * Set date treatment (temporal or categorical)
 */
export function setEdaDateTreatment(treatment: 'temporal' | 'categorical'): void {
  AppStore.edaDateTreatment.value = treatment;
}

/**
 * Handle brush selection on histogram
 */
export function handleBrushSelection(selection: any): void {
  AppStore.edaBrushSelection.value = selection;
}

/**
 * Apply a filter based on current brush selection
 */
export async function applyBrushFilter(): Promise<void> {
  const edaBrushSelection = AppStore.edaBrushSelection.value;
  const selectedColumn = AppStore.selectedColumn.value;

  if (!edaBrushSelection || !selectedColumn) return;

  const { min, max } = edaBrushSelection;
  const fmtMin = Number.isInteger(min) ? min : min.toFixed(4);
  const fmtMax = Number.isInteger(max) ? max : max.toFixed(4);
  const expr = `[${selectedColumn}] >= ${fmtMin} && [${selectedColumn}] <= ${fmtMax}`;

  DialogStore.filterState.expression.value = expr;
  DialogStore.filterState.error.value = null;

  await FilterHandlers.applyFilterTransform(HelperHandlers.createExecutionCallbacks());
  callbacks?.clearColumnSelection();
}
