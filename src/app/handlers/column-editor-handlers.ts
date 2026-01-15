import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService } from '../services/StepService';
import * as NotificationHandlers from './notification-handlers';

export function toggleColumnEditorColumn(index: number) {
  const columns = DialogStore.columnEditorState.columns.value;
  const newCols = [...columns];
  newCols[index] = { ...newCols[index], selected: !newCols[index].selected };
  DialogStore.columnEditorState.columns.value = newCols;
}

export function selectAllColumnEditor() {
  const columns = DialogStore.columnEditorState.columns.value;
  DialogStore.columnEditorState.columns.value = columns.map((c) => ({ ...c, selected: true }));
}

export function selectNoneColumnEditor() {
  const columns = DialogStore.columnEditorState.columns.value;
  DialogStore.columnEditorState.columns.value = columns.map((c) => ({ ...c, selected: false }));
}

export function applyColumnEditorPattern() {
  const { patternText, patternMode, patternMatchType, columns } = DialogStore.columnEditorState;
  const text = patternText.value.trim();
  if (!text) return;

  const pattern = text.toLowerCase();
  const matchFn = (name: string) => {
    const lower = name.toLowerCase();
    switch (patternMatchType.value) {
      case 'prefix':
        return lower.startsWith(pattern);
      case 'suffix':
        return lower.endsWith(pattern);
      case 'exact':
        return lower === pattern;
      default:
        return false;
    }
  };

  const shouldSelect = patternMode.value === 'include';
  const newCols = columns.value.map((c) => {
    if (matchFn(c.original)) {
      return { ...c, selected: shouldSelect };
    }
    return c;
  });
  columns.value = newCols;
}

export function handleColumnEditorDragStart(index: number, event: DragEvent) {
  DialogStore.columnEditorState.draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

export function handleColumnEditorDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

export function handleColumnEditorDrop(dropIndex: number) {
  const dragIndex = DialogStore.columnEditorState.draggedIndex.value;
  if (dragIndex === null || dragIndex === dropIndex) return;

  const columns = [...DialogStore.columnEditorState.columns.value];
  const [draggedItem] = columns.splice(dragIndex, 1);
  columns.splice(dropIndex, 0, draggedItem);
  DialogStore.columnEditorState.columns.value = columns;
  DialogStore.columnEditorState.draggedIndex.value = null;
}

export function handleColumnEditorDragEnd() {
  DialogStore.columnEditorState.draggedIndex.value = null;
}

export function switchColumnEditorToText() {
  const state = DialogStore.columnEditorState;
  // Populate text value based on sub-mode
  if (state.textSubMode.value === 'rename') {
    // Show renamed names for all columns (in current order)
    const lines = state.columns.value.map((c) => c.renamed);
    state.textValue.value = lines.join('\n');
  } else if (state.textSubMode.value === 'reorder') {
    // Show original names of selected columns (in current order)
    const lines = state.columns.value.filter((c) => c.selected).map((c) => c.original);
    state.textValue.value = lines.join('\n');
  } else if (state.textSubMode.value === 'select') {
    // Show original names of selected columns
    const lines = state.columns.value.filter((c) => c.selected).map((c) => c.original);
    state.textValue.value = lines.join('\n');
  }
  state.textError.value = null;
  state.mode.value = 'text';
}

export function validateColumnEditorText(): boolean {
  const state = DialogStore.columnEditorState;
  const lines = state.textValue.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const appColumns = AppStore.columns.value;
  const columnCount = appColumns.length;
  const originalNameSet = new Set(appColumns);

  if (lines.length === 0) {
    state.textError.value = 'Please enter at least one column name';
    return false;
  }

  // Check for duplicates (case-insensitive)
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.toLowerCase())) {
      state.textError.value = `Duplicate column name: "${line}"`;
      return false;
    }
    seen.add(line.toLowerCase());
  }

  if (state.textSubMode.value === 'rename') {
    // Must have exactly N lines for N columns
    if (lines.length !== columnCount) {
      state.textError.value = `Rename requires exactly ${columnCount} lines (one per column), got ${lines.length}`;
      return false;
    }
  } else if (state.textSubMode.value === 'reorder') {
    // All names must exist in original columns
    for (const line of lines) {
      if (!originalNameSet.has(line)) {
        state.textError.value = `Unknown column: "${line}"`;
        return false;
      }
    }
    // Must include all columns (no removal in reorder mode)
    if (lines.length !== columnCount) {
      state.textError.value = `Reorder requires all ${columnCount} columns, got ${lines.length}`;
      return false;
    }
  } else if (state.textSubMode.value === 'select') {
    // All names must exist in original columns
    for (const line of lines) {
      if (!originalNameSet.has(line)) {
        state.textError.value = `Unknown column: "${line}"`;
        return false;
      }
    }
  }

  state.textError.value = null;
  return true;
}

export function getColumnEditorChanges(): {
  hasChanges: boolean;
  removed: string[];
  renamed: { from: string; to: string }[];
  reordered: boolean;
} {
  const state = DialogStore.columnEditorState;
  const appColumns = AppStore.columns.value;

  if (state.mode.value === 'text') {
    const lines = state.textValue.value
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (state.textSubMode.value === 'rename') {
      // Compare line by line - same order
      const renamed: { from: string; to: string }[] = [];
      for (let i = 0; i < lines.length && i < appColumns.length; i++) {
        if (appColumns[i] !== lines[i]) {
          renamed.push({ from: appColumns[i], to: lines[i] });
        }
      }
      return { hasChanges: renamed.length > 0, removed: [], renamed, reordered: false };
    } else if (state.textSubMode.value === 'reorder') {
      // Check if order differs
      const reordered = lines.join(',') !== appColumns.join(',');
      return { hasChanges: reordered, removed: [], renamed: [], reordered };
    } else if (state.textSubMode.value === 'select') {
      // Columns not in lines are removed
      const lineSet = new Set(lines);
      const removed = appColumns.filter((c) => !lineSet.has(c));
      return { hasChanges: removed.length > 0, removed, renamed: [], reordered: false };
    }
  }

  // List mode
  const removed = state.columns.value.filter((c) => !c.selected).map((c) => c.original);

  const renamed = state.columns.value
    .filter((c) => c.selected && c.original !== c.renamed && c.renamed.trim() !== '')
    .map((c) => ({ from: c.original, to: c.renamed.trim() }));

  // Check reorder by comparing selected columns order to original
  const selectedOriginals = state.columns.value.filter((c) => c.selected).map((c) => c.original);

  const originalSelectedOrder = appColumns.filter((c) =>
    state.columns.value.find((sc) => sc.original === c && sc.selected)
  );

  const reordered = JSON.stringify(selectedOriginals) !== JSON.stringify(originalSelectedOrder);

  const hasChanges = removed.length > 0 || renamed.length > 0 || reordered;

  return { hasChanges, removed, renamed, reordered };
}

export async function applyColumnEditorTransform(callbacks: any) {
  const state = DialogStore.columnEditorState;
  const appColumns = AppStore.columns.value;

  // Handle text mode
  if (state.mode.value === 'text') {
    if (!validateColumnEditorText()) {
      await NotificationHandlers.alert.call(
        null as any,
        state.textError.value || 'Invalid column names'
      );
      return;
    }

    const lines = state.textValue.value
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (state.textSubMode.value === 'rename') {
      // Apply rename transform - map column[i] -> lines[i]
      const renames: Record<string, string> = {};
      for (let i = 0; i < lines.length && i < appColumns.length; i++) {
        if (appColumns[i] !== lines[i]) {
          renames[appColumns[i]] = lines[i];
        }
      }
      if (Object.keys(renames).length > 0) {
        await StepService.runTransform('Rename', { rename: renames }, callbacks);
      } else {
        callbacks.onDialogClose(true);
      }
    } else if (state.textSubMode.value === 'reorder') {
      // Apply select transform with new order
      if (lines.join(',') !== appColumns.join(',')) {
        await StepService.runTransform('Reorder Columns', { select: lines }, callbacks);
      } else {
        callbacks.onDialogClose(true);
      }
    } else if (state.textSubMode.value === 'select') {
      // Apply select transform to keep only listed columns
      if (lines.length < appColumns.length || lines.join(',') !== appColumns.join(',')) {
        await StepService.runTransform('Select Columns', { select: lines }, callbacks);
      } else {
        callbacks.onDialogClose(true);
      }
    }

    return;
  }

  // List mode
  const changes = getColumnEditorChanges();

  if (!changes.hasChanges) {
    callbacks.onDialogClose(true);
    return;
  }

  // Build select transform from current order of selected columns
  const selectedInOrder = state.columns.value.filter((c) => c.selected).map((c) => c.original);

  // Check if we need select (order changed or columns removed)
  const needsSelect =
    selectedInOrder.length !== appColumns.length ||
    selectedInOrder.join(',') !== appColumns.join(',');

  // Build rename map
  const renames: Record<string, string> = {};
  state.columns.value.forEach((c) => {
    if (c.selected && c.original !== c.renamed && c.renamed.trim() !== '') {
      renames[c.original] = c.renamed.trim();
    }
  });

  const needsRename = Object.keys(renames).length > 0;

  // Apply transforms
  if (needsSelect) {
    await StepService.runTransform('Edit Columns', { select: selectedInOrder }, callbacks);
  }

  if (needsRename) {
    await StepService.runTransform('Rename', { rename: renames }, callbacks);
  }
}
