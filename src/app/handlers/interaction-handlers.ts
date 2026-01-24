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
import { convertType } from '../../core/type-converter';

export function handleBodyClick(event: any) {
  if (
    AppStore.selectedColumn.value &&
    !event.target.closest('.data-table__header') &&
    !event.target.closest('.floating-toolbar') &&
    !event.target.closest('.slide-panel') &&
    !event.target.closest('.centered-modal') &&
    !event.target.closest('[data-eda-panel="true"]') &&
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
    // Clear preview when type menu closes
    DialogStore.previewState.title.value = '';
    DialogStore.previewState.stats.value = '';
    DialogStore.previewState.columns.value = [];
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = [];
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

export function previewTypeConversion(col: string, newType: string) {
  const data = AppStore.currentData.value;
  if (!data || data.length === 0) {
    DialogStore.previewState.title.value = '';
    DialogStore.previewState.stats.value = '';
    DialogStore.previewState.columns.value = [];
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = [];
    return;
  }

  // Get current column type
  const model = AppStore.activeModel.value;
  const source = AppStore.activeSource.value;
  let fromType: ColumnType = 'string';

  if (model?.schema) {
    const colInfo = model.schema.find((c: any) => c.name === col);
    if (colInfo) fromType = colInfo.type;
  } else if (source) {
    const colInfo = source.columns.find((c: any) => c.name === col);
    if (colInfo) fromType = colInfo.type;
  }

  // Determine target type
  let toType: ColumnType = newType as ColumnType;
  if (newType === 'auto' && data) {
    const sample = data.slice(0, 50).map((row) => row[col]);
    toType = SchemaEngine.inferType(sample);
  }

  // If same type, clear preview
  if (fromType === toType) {
    DialogStore.previewState.title.value = '';
    DialogStore.previewState.stats.value = '';
    DialogStore.previewState.columns.value = [];
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = [];
    return;
  }

  // Get unique values from the column
  // Use a Map to preserve insertion order and track original values
  const uniqueValuesMap = new Map<any, any>();
  for (const row of data) {
    const value = row[col];
    // Use a key that handles objects/errors properly
    const key =
      value === null || value === undefined
        ? '__null__'
        : typeof value === 'object' && value !== null && 'type' in value && value.type === 'error'
          ? `__error__${value.message}`
          : JSON.stringify(value);

    if (!uniqueValuesMap.has(key)) {
      uniqueValuesMap.set(key, value);
    }
  }

  const uniqueValues = Array.from(uniqueValuesMap.values());
  const totalRows = data.length;
  const uniqueCount = uniqueValues.length;

  // Convert each unique value
  const previewRows = uniqueValues.map((originalValue) => {
    const convertedValue = convertType(originalValue, fromType, toType);

    // Format the preview row with before and after columns
    const row: any = {
      [`${col} (before)`]: originalValue,
      [`${col} (after)`]: convertedValue,
    };

    // Mark errors
    if (
      convertedValue &&
      typeof convertedValue === 'object' &&
      'type' in convertedValue &&
      convertedValue.type === 'error'
    ) {
      row._hasError = true;
    }

    return row;
  });

  // Count errors
  const errorCount = previewRows.filter((r) => r._hasError).length;
  const successCount = uniqueCount - errorCount;

  // Set preview state
  DialogStore.previewState.title.value = `Type Conversion: ${col}`;
  DialogStore.previewState.stats.value =
    `<strong>${uniqueCount}</strong> unique values (from ${totalRows} total rows). ` +
    `${successCount} convert successfully, ${errorCount} will produce errors.`;
  DialogStore.previewState.columns.value = [`${col} (before)`, `${col} (after)`];
  DialogStore.previewState.newColumns.value = [`${col} (after)`];
  DialogStore.previewState.rows.value = previewRows;
}

export async function changeColumnType(col: string, newType: string, callbacks: any) {
  AppStore.typeMenuOpen.value = false;

  // Clear preview when applying
  DialogStore.previewState.title.value = '';
  DialogStore.previewState.stats.value = '';
  DialogStore.previewState.columns.value = [];
  DialogStore.previewState.newColumns.value = [];
  DialogStore.previewState.rows.value = [];

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

export async function quickRename(
  prompt: (msg: string, def?: string) => Promise<string | null>,
  alert: (msg: string) => Promise<any>,
  callbacks: any
) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;

  const newName = await prompt(`Rename column "${col}" to:`, col);
  if (!newName || newName.trim() === '') return;

  const trimmedName = newName.trim();
  if (trimmedName === col) return; // No change

  // Check for duplicate column names
  const columns = AppStore.columns.value;
  if (columns.includes(trimmedName)) {
    await alert(`Column "${trimmedName}" already exists`);
    return;
  }

  const transform = {
    rename: {
      [col]: trimmedName,
    },
  };

  await StepService.runTransform('Rename Column', transform, callbacks);
  AppStore.selectedColumn.value = null;
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
