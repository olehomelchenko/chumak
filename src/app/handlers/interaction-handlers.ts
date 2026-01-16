import { SchemaEngine, ColumnType } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as HelperHandlers from './helper-handlers';
import * as NotificationHandlers from './notification-handlers';
import * as FilterHandlers from './filter-handlers';
import * as SimpleHandlers from './simple-handlers';
import * as SplitHandlers from './split-handlers';
import * as DedupeHandlers from './dedupe-handlers';
import { StepService } from '../services/StepService';

export function handleBodyClick(event: any) {
  if (
    AppStore.selectedColumn.value &&
    !event.target.closest('.data-table__header') &&
    !event.target.closest('.floating-toolbar') &&
    !event.target.closest('.slide-panel') &&
    !event.target.closest('.centered-modal') &&
    !event.target.closest('[class*="edaPanel"]')
  ) {
    AppStore.selectedColumn.value = null;
  }
  if (
    AppStore.typeMenuOpen.value &&
    !event.target.closest('.type-menu') &&
    !event.target.closest('.type-indicator')
  ) {
    AppStore.typeMenuOpen.value = false;
    AppStore.typeMenuCol.value = null;
  }
}

export function openTypeMenu(col: string, event: any) {
  AppStore.typeMenuCol.value = col;
  AppStore.typeMenuOpen.value = true;
  AppStore.selectedColumn.value = null;
  AppStore.selectedCell.value = null;
  const rect = event.target.getBoundingClientRect();
  const menuWidth = 140; // Approximate width of type menu
  const margin = 8;
  const windowWidth = window.innerWidth;
  // Clamp x position to keep menu within viewport
  const x = Math.min(rect.left, windowWidth - menuWidth - margin);
  AppStore.typeMenuPos.value = { x, y: rect.bottom + 4 };
}

export async function changeColumnType(col: string, newType: string, callbacks: any) {
  AppStore.typeMenuOpen.value = false;
  let typeToSet = newType;
  const data = AppStore.currentData.value;
  if (newType === 'auto' && data) {
    const sample = data.slice(0, 50).map((row) => row[col]);
    typeToSet = SchemaEngine.inferType(sample);
  }
  const typeStep = { types: { [col]: typeToSet as ColumnType } };
  await StepService.runTransform('Change Type', typeStep, callbacks);
}

export async function autoDetectSchema(callbacks: any) {
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;
  if (!data || !columns) return;
  const types: Record<string, ColumnType> = {};
  columns.forEach((col) => {
    const sample = data!.slice(0, 50).map((row) => row[col]);
    types[col] = SchemaEngine.inferType(sample);
  });
  const typeStep = { types };
  await StepService.runTransform('Auto-Detect Types', typeStep, callbacks);
}

export function clearColumnSelection() {
  AppStore.selectedColumn.value = null;
  AppStore.selectedCell.value = null;
  AppStore.edaStats.value = null;
  AppStore.edaBrushSelection.value = null;
}

export function calculateToolbarPosition(rect: DOMRect, toolbarWidth: number) {
  const center = rect.left + rect.width / 2;
  const windowWidth = window.innerWidth;
  const margin = 12;
  let x = Math.max(
    toolbarWidth / 2 + margin,
    Math.min(windowWidth - toolbarWidth / 2 - margin, center)
  );
  // Position toolbar above the element (top of toolbar at top of element minus spacing)
  // Account for toolbar height (~40px) plus arrow height (6px) plus spacing (8px)
  const toolbarHeight = 40;
  const arrowHeight = 6;
  const spacing = 8;
  const y = rect.top - toolbarHeight - arrowHeight - spacing;
  return { x: x, y: y, arrowOffset: center - x };
}

export function updateToolbarPosition() {
  const selectedColumn = AppStore.selectedColumn.value;
  const selectedCell = AppStore.selectedCell.value;

  if (selectedColumn) {
    // Use data-col attribute selector which is more reliable than CSS class
    const header = document.querySelector(`th[data-col="${selectedColumn}"]`);
    if (header) {
      const rect = header.getBoundingClientRect();
      AppStore.columnToolbarPos.value = calculateToolbarPosition(rect, 200);
    }
  }
  if (selectedCell) {
    if (selectedCell.isEda) return;
    // Use data-col and data-row attributes which are more reliable than CSS classes
    const cell = document.querySelector(
      `td[data-col="${selectedCell.col}"][data-row="${selectedCell.rowIdx}"]`
    );
    if (cell) {
      const rect = cell.getBoundingClientRect();
      const toolbarWidth = ['number', 'integer', 'float'].includes(selectedCell.type) ? 220 : 80;
      AppStore.cellToolbarPos.value = calculateToolbarPosition(rect, toolbarWidth);
    }
  }
}

export function selectCell(col: string, value: any, rowIdx: number) {
  AppStore.selectedColumn.value = null;
  AppStore.typeMenuOpen.value = false;
  let type = 'string';
  const model = AppStore.activeModel.value;
  const source = AppStore.activeSource.value;

  if (model?.schema) {
    const colInfo = model.schema.find((c: any) => c.name === col);
    if (colInfo) type = colInfo.type;
  } else if (source) {
    const colInfo = source.columns.find((c: any) => c.name === col);
    if (colInfo) type = colInfo.type;
  } else {
    type = typeof value === 'number' ? 'number' : 'string';
  }
  AppStore.selectedCell.value = { col, value, type, rowIdx };
  requestAnimationFrame(() => updateToolbarPosition());
}

export async function applyQuickCellFilter(op: string, callbacks: any) {
  const selectedCell = AppStore.selectedCell.value;
  if (!selectedCell) return;
  const { col, value, type } = selectedCell;
  let expr = '';
  const formattedValue = HelperHandlers.formatLiteral.call(null as any, value, type);
  if (op === 'exact') expr = `[${col}] == ${formattedValue}`;
  else if (op === 'not') expr = `[${col}] != ${formattedValue}`;
  else if (op === 'gt') expr = `[${col}] > ${formattedValue}`;
  else if (op === 'gte') expr = `[${col}] >= ${formattedValue}`;
  else if (op === 'lt') expr = `[${col}] < ${formattedValue}`;
  else if (op === 'lte') expr = `[${col}] <= ${formattedValue}`;
  if (expr) {
    DialogStore.filterState.expression.value = expr;
    DialogStore.filterState.error.value = null;
    await FilterHandlers.applyFilterTransform(callbacks);
  }
  AppStore.selectedCell.value = null;
}

export async function quickSort(order: 'asc' | 'desc', callbacks: any) {
  const selectedColumn = AppStore.selectedColumn.value;
  if (!selectedColumn) return;
  DialogStore.sortState.field.value = selectedColumn;
  DialogStore.sortState.order.value = order;
  await SimpleHandlers.applySortTransform(callbacks);
  AppStore.selectedColumn.value = null;
}

export function quickFilter(onOpenDialog: (name: string) => void) {
  const selectedColumn = AppStore.selectedColumn.value;
  if (!selectedColumn) return;

  const initialExpr = `[${selectedColumn}] == `;
  DialogStore.filterState.expression.value = initialExpr;
  DialogStore.filterState.error.value = null;

  onOpenDialog('filter');
}

export function quickRename(onOpenDialog: (name: string, section?: string) => void) {
  if (!AppStore.selectedColumn.value) return;
  onOpenDialog('column-editor', 'rename');
}

export async function quickRemove(callbacks: any) {
  const selectedColumn = AppStore.selectedColumn.value;
  if (!selectedColumn) return;
  const col = selectedColumn;
  const confirmed = await NotificationHandlers.confirm.call(
    null as any,
    `Are you sure you want to remove column "${col}"?`
  );
  if (confirmed) {
    await StepService.runTransform('Remove Column', { remove: [col] }, callbacks);
    AppStore.selectedColumn.value = null;
  }
}

export function quickDate(onOpenDialog: (name: string) => void) {
  if (!AppStore.selectedColumn.value) return;
  onOpenDialog('date');
  AppStore.selectedColumn.value = null;
}

export function quickSplit(onOpenDialog: (name: string) => void) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;

  const detected = SplitHandlers.detectDelimiter(col);

  const state = DialogStore.splitState;
  state.column.value = col;
  if (detected) {
    state.delimiter.value = detected.char;
    state.isRegex.value = detected.isRegex;
    state.autoDetectedDelimiter.value = detected.name;
  } else {
    state.autoDetectedDelimiter.value = null;
  }

  onOpenDialog('split');
  SplitHandlers.updateSplitPreview();
}

export function quickReplace(onOpenDialog: (name: string) => void) {
  const selectedCell = AppStore.selectedCell.value;
  if (!selectedCell) return;
  const { col, value } = selectedCell;

  const state = DialogStore.replaceState;
  state.column.value = col;
  state.findValue.value = value;
  state.replaceValue.value = '';

  onOpenDialog('replace');
}

export function quickDedupe(onOpenDialog: (name: string) => void) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;

  const state = DialogStore.dedupeState;
  state.useAllColumns.value = false;
  state.selectedColumns.value = AppStore.columns.value.map((c) => c === col);

  onOpenDialog('dedupe');
  DedupeHandlers.updateDedupePreview();
}
