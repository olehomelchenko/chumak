import type { ChumakApp } from '../../chumak-app';
import { SchemaEngine } from '../../core/schema-engine';

export function handleBodyClick(this: ChumakApp, event: any) {
  if (
    this.selectedColumn &&
    !event.target.closest('.data-table__header') &&
    !event.target.closest('.floating-toolbar') &&
    !event.target.closest('.modal')
  ) {
    this.selectedColumn = null;
  }
  if (
    this.typeMenuOpen &&
    !event.target.closest('.type-menu') &&
    !event.target.closest('.type-indicator')
  ) {
    this.typeMenuOpen = false;
    this.typeMenuCol = null;
  }
}

export function openTypeMenu(this: ChumakApp, col: string, event: any) {
  this.typeMenuCol = col;
  this.typeMenuOpen = true;
  this.selectedColumn = null;
  this.selectedCell = null;
  const rect = event.target.getBoundingClientRect();
  const menuWidth = 140; // Approximate width of type menu
  const margin = 8;
  const windowWidth = window.innerWidth;
  // Clamp x position to keep menu within viewport
  const x = Math.min(rect.left, windowWidth - menuWidth - margin);
  this.typeMenuPos = { x, y: rect.bottom + 4 };
}

export async function changeColumnType(this: ChumakApp, col: string, newType: string) {
  this.typeMenuOpen = false;
  let typeToSet = newType;
  if (newType === 'auto' && this.currentData) {
    const sample = this.currentData.slice(0, 50).map((row) => row[col]);
    typeToSet = SchemaEngine.inferType(sample);
  }
  const typeStep = { types: { [col]: typeToSet } };
  await (this as any).applyStepResult(typeStep, this.currentData);
}

export async function autoDetectSchema(this: ChumakApp) {
  if (!this.currentData || !this.columns) return;
  const types: Record<string, string> = {};
  this.columns.forEach((col) => {
    const sample = this.currentData!.slice(0, 50).map((row) => row[col]);
    types[col] = SchemaEngine.inferType(sample);
  });
  const typeStep = { types };
  await (this as any).applyStepResult(typeStep, this.currentData);
}

export function clearColumnSelection(this: ChumakApp) {
  this.selectedColumn = null;
  this.selectedCell = null;
  this.edaStats = null;
  this.edaBrushSelection = null;
}

export function calculateToolbarPosition(this: ChumakApp, rect: DOMRect, toolbarWidth: number) {
  const center = rect.left + rect.width / 2;
  const windowWidth = window.innerWidth;
  const margin = 12;
  let x = Math.max(
    toolbarWidth / 2 + margin,
    Math.min(windowWidth - toolbarWidth / 2 - margin, center)
  );
  return { x: x, y: rect.top - 8, arrowOffset: center - x };
}

export function updateToolbarPosition(this: ChumakApp) {
  if (this.selectedColumn) {
    const header = document.querySelector(`.data-table__header[data-col="${this.selectedColumn}"]`);
    if (header) {
      const rect = header.getBoundingClientRect();
      this.columnToolbarPos = (this as any).calculateToolbarPosition(rect, 200);
    }
  }
  if (this.selectedCell) {
    if (this.selectedCell.isEda) return;
    const cell = document.querySelector(
      `.data-table__cell[data-col="${this.selectedCell.col}"][data-row="${this.selectedCell.rowIdx}"]`
    );
    if (cell) {
      const rect = cell.getBoundingClientRect();
      const toolbarWidth = ['number', 'integer', 'float'].includes(this.selectedCell.type)
        ? 220
        : 80;
      this.cellToolbarPos = (this as any).calculateToolbarPosition(rect, toolbarWidth);
    }
  }
}

export function selectCell(this: ChumakApp, col: string, value: any, rowIdx: number) {
  this.selectedColumn = null;
  this.typeMenuOpen = false;
  let type = 'string';
  if (this.activeModel?.schema) {
    const colInfo = this.activeModel.schema.find((c: any) => c.name === col);
    if (colInfo) type = colInfo.type;
  } else if (this.activeSource) {
    const colInfo = this.activeSource.columns.find((c: any) => c.name === col);
    if (colInfo) type = colInfo.type;
  } else {
    type = typeof value === 'number' ? 'number' : 'string';
  }
  this.selectedCell = { col, value, type, rowIdx };
  this.$nextTick(() => this.updateToolbarPosition());
}

export async function applyQuickCellFilter(this: ChumakApp, op: string) {
  if (!this.selectedCell) return;
  const { col, value, type } = this.selectedCell;
  let expr = '';
  const formattedValue = (this as any).formatLiteral(value, type);
  if (op === 'exact') expr = `[${col}] == ${formattedValue}`;
  else if (op === 'not') expr = `[${col}] != ${formattedValue}`;
  else if (op === 'gt') expr = `[${col}] > ${formattedValue}`;
  else if (op === 'gte') expr = `[${col}] >= ${formattedValue}`;
  else if (op === 'lt') expr = `[${col}] < ${formattedValue}`;
  else if (op === 'lte') expr = `[${col}] <= ${formattedValue}`;
  if (expr) {
    this.filterExpression = expr;
    this.filterError = null;
    await (this as any).applyFilterTransform();
  }
  this.selectedCell = null;
}

import { DialogStore } from '../stores/DialogStore';
// ... imports

export async function quickSort(this: ChumakApp, order: 'asc' | 'desc') {
  if (!this.selectedColumn) return;
  DialogStore.sortState.field.value = this.selectedColumn;
  DialogStore.sortState.order.value = order;
  await (this as any).applySortTransform();
  this.selectedColumn = null;
}

export function quickFilter(this: ChumakApp) {
  if (!this.selectedColumn) return;
  this.openDialog('filter');
  this.filterExpression = `${this.selectedColumn} == `;
  this.reSnapshot();
  setTimeout(() => {
    const input = document.querySelector(
      '.modal input[x-model="filterExpression"]'
    ) as HTMLInputElement;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 50);
}

export function quickRename(this: ChumakApp) {
  if (!this.selectedColumn) return;
  const col = this.selectedColumn;
  this.openDialog('rename');
  setTimeout(() => {
    const input = document.querySelector(`.modal input[data-col="${col}"]`) as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }, 50);
}

export async function quickRemove(this: ChumakApp) {
  if (!this.selectedColumn) return;
  const col = this.selectedColumn;
  if (await this.confirm(`Are you sure you want to remove column "${col}"?`)) {
    await this.runTransform('Remove Column', { remove: [col] });
    this.selectedColumn = null;
  }
}

export function quickDate(this: ChumakApp) {
  if (!this.selectedColumn) return;
  this.openDialog('date');
  this.selectedColumn = null;
}

export function quickSplit(this: ChumakApp) {
  if (!this.selectedColumn) return;
  const col = this.selectedColumn;
  this.openDialog('split');
  this.splitDialogState.column = col;
  this.reSnapshot();
  const detected = (this as any).detectDelimiter(col);
  if (detected) {
    this.splitDialogState.delimiter = detected.char;
    this.splitDialogState.isRegex = detected.isRegex;
    this.splitDialogState.autoDetectedDelimiter = detected.name;
  } else {
    this.splitDialogState.autoDetectedDelimiter = null;
  }
  setTimeout(() => {
    (this as any).updateSplitPreview();
  }, 50);
}

export function quickReplace(this: ChumakApp) {
  if (!this.selectedCell) return;
  const { col, value } = this.selectedCell;
  this.openDialog('replace');
  this.replaceDialogState = { column: col, findValue: value, replaceValue: '' };
  this.reSnapshot();
  setTimeout(() => {
    const input = document.querySelector(
      '.slide-panel input[x-model="replaceDialogState.replaceValue"]'
    ) as HTMLInputElement;
    if (input) input.focus();
  }, 50);
}

export function quickDedupe(this: ChumakApp) {
  if (!this.selectedColumn) return;
  const col = this.selectedColumn;
  this.openDialog('dedupe');
  // Pre-select only this column, switch to specific mode
  this.dedupeDialogState.useAllColumns = false;
  this.dedupeDialogState.selectedColumns = this.columns.map((c) => c === col);
  this.reSnapshot();
  (this as any).updateDedupePreview();
}
