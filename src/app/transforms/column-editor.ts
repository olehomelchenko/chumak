import type { ChumakApp } from '../../chumak-app';

export function toggleColumnEditorColumn(this: ChumakApp, index: number) {
  this.columnEditorState.columns[index].selected = !this.columnEditorState.columns[index].selected;
}

export function selectAllColumnEditor(this: ChumakApp) {
  this.columnEditorState.columns.forEach((c: any) => (c.selected = true));
}

export function selectNoneColumnEditor(this: ChumakApp) {
  this.columnEditorState.columns.forEach((c: any) => (c.selected = false));
}

export function applyColumnEditorPattern(this: ChumakApp) {
  const { patternText, patternMode, patternMatchType } = this.columnEditorState;
  if (!patternText.trim()) return;

  const pattern = patternText.trim().toLowerCase();
  const matchFn = (name: string) => {
    const lower = name.toLowerCase();
    switch (patternMatchType) {
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

  const shouldSelect = patternMode === 'include';
  this.columnEditorState.columns.forEach((c: any) => {
    if (matchFn(c.original)) {
      c.selected = shouldSelect;
    }
  });
}

export function handleColumnEditorDragStart(this: ChumakApp, index: number, event: DragEvent) {
  this.columnEditorState.draggedIndex = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

export function handleColumnEditorDragOver(this: ChumakApp, event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

export function handleColumnEditorDrop(this: ChumakApp, dropIndex: number) {
  const dragIndex = this.columnEditorState.draggedIndex;
  if (dragIndex === null || dragIndex === dropIndex) return;

  const columns = this.columnEditorState.columns;
  const [draggedItem] = columns.splice(dragIndex, 1);
  columns.splice(dropIndex, 0, draggedItem);
  this.columnEditorState.draggedIndex = null;
}

export function handleColumnEditorDragEnd(this: ChumakApp) {
  this.columnEditorState.draggedIndex = null;
}

export function switchColumnEditorToText(this: ChumakApp) {
  const state = this.columnEditorState;
  // Populate text value based on sub-mode
  if (state.textSubMode === 'rename') {
    // Show renamed names for all columns (in current order)
    const lines = state.columns.map((c: any) => c.renamed);
    state.textValue = lines.join('\n');
  } else if (state.textSubMode === 'reorder') {
    // Show original names of selected columns (in current order)
    const lines = state.columns.filter((c: any) => c.selected).map((c: any) => c.original);
    state.textValue = lines.join('\n');
  } else if (state.textSubMode === 'select') {
    // Show original names of selected columns
    const lines = state.columns.filter((c: any) => c.selected).map((c: any) => c.original);
    state.textValue = lines.join('\n');
  }
  state.textError = null;
  state.mode = 'text';
}

export function validateColumnEditorText(this: ChumakApp): boolean {
  const state = this.columnEditorState;
  const lines = state.textValue
    .split('\n')
    .map((l: any) => l.trim())
    .filter((l: any) => l.length > 0);

  const columnCount = this.columns.length;
  const originalNameSet = new Set(this.columns);

  if (lines.length === 0) {
    state.textError = 'Please enter at least one column name';
    return false;
  }

  // Check for duplicates (case-insensitive)
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.toLowerCase())) {
      state.textError = `Duplicate column name: "${line}"`;
      return false;
    }
    seen.add(line.toLowerCase());
  }

  if (state.textSubMode === 'rename') {
    // Must have exactly N lines for N columns
    if (lines.length !== columnCount) {
      state.textError = `Rename requires exactly ${columnCount} lines (one per column), got ${lines.length}`;
      return false;
    }
  } else if (state.textSubMode === 'reorder') {
    // All names must exist in original columns
    for (const line of lines) {
      if (!originalNameSet.has(line)) {
        state.textError = `Unknown column: "${line}"`;
        return false;
      }
    }
    // Must include all columns (no removal in reorder mode)
    if (lines.length !== columnCount) {
      state.textError = `Reorder requires all ${columnCount} columns, got ${lines.length}`;
      return false;
    }
  } else if (state.textSubMode === 'select') {
    // All names must exist in original columns
    for (const line of lines) {
      if (!originalNameSet.has(line)) {
        state.textError = `Unknown column: "${line}"`;
        return false;
      }
    }
  }

  state.textError = null;
  return true;
}

export function getColumnEditorChanges(this: ChumakApp): {
  hasChanges: boolean;
  removed: string[];
  renamed: { from: string; to: string }[];
  reordered: boolean;
} {
  const state = this.columnEditorState;

  if (state.mode === 'text') {
    const lines = state.textValue
      .split('\n')
      .map((l: any) => l.trim())
      .filter((l: any) => l.length > 0);

    if (state.textSubMode === 'rename') {
      // Compare line by line - same order
      const renamed: { from: string; to: string }[] = [];
      for (let i = 0; i < lines.length && i < this.columns.length; i++) {
        if (this.columns[i] !== lines[i]) {
          renamed.push({ from: this.columns[i], to: lines[i] });
        }
      }
      return { hasChanges: renamed.length > 0, removed: [], renamed, reordered: false };
    } else if (state.textSubMode === 'reorder') {
      // Check if order differs
      const reordered = lines.join(',') !== this.columns.join(',');
      return { hasChanges: reordered, removed: [], renamed: [], reordered };
    } else if (state.textSubMode === 'select') {
      // Columns not in lines are removed
      const lineSet = new Set(lines);
      const removed = this.columns.filter((c) => !lineSet.has(c));
      return { hasChanges: removed.length > 0, removed, renamed: [], reordered: false };
    }
  }

  // List mode
  const removed = state.columns.filter((c: any) => !c.selected).map((c: any) => c.original);

  const renamed = state.columns
    .filter((c: any) => c.selected && c.original !== c.renamed && c.renamed.trim() !== '')
    .map((c: any) => ({ from: c.original, to: c.renamed.trim() }));

  // Check reorder by comparing selected columns order to original
  const selectedOriginals = state.columns
    .filter((c: any) => c.selected)
    .map((c: any) => c.original);
  const originalSelectedOrder = this.columns.filter((c: any) =>
    state.columns.find((sc: any) => sc.original === c && sc.selected)
  );
  const reordered = JSON.stringify(selectedOriginals) !== JSON.stringify(originalSelectedOrder);

  const hasChanges = removed.length > 0 || renamed.length > 0 || reordered;

  return { hasChanges, removed, renamed, reordered };
}

export async function applyColumnEditorTransform(this: ChumakApp) {
  const state = this.columnEditorState;

  // Handle text mode
  if (state.mode === 'text') {
    if (!this.validateColumnEditorText()) {
      await this.alert(state.textError || 'Invalid column names');
      return;
    }

    const lines = state.textValue
      .split('\n')
      .map((l: any) => l.trim())
      .filter((l: any) => l.length > 0);

    if (state.textSubMode === 'rename') {
      // Apply rename transform - map column[i] -> lines[i]
      const renames: Record<string, string> = {};
      for (let i = 0; i < lines.length && i < this.columns.length; i++) {
        if (this.columns[i] !== lines[i]) {
          renames[this.columns[i]] = lines[i];
        }
      }
      if (Object.keys(renames).length > 0) {
        await this.runTransform('Rename', { rename: renames });
      } else {
        this.closeDialog(true);
      }
    } else if (state.textSubMode === 'reorder') {
      // Apply select transform with new order
      if (lines.join(',') !== this.columns.join(',')) {
        await this.runTransform('Reorder Columns', { select: lines });
      } else {
        this.closeDialog(true);
      }
    } else if (state.textSubMode === 'select') {
      // Apply select transform to keep only listed columns
      if (lines.length < this.columns.length || lines.join(',') !== this.columns.join(',')) {
        await this.runTransform('Select Columns', { select: lines });
      } else {
        this.closeDialog(true);
      }
    }

    return;
  }

  // List mode
  const changes = this.getColumnEditorChanges();

  if (!changes.hasChanges) {
    this.closeDialog(true);
    return;
  }

  // Build select transform from current order of selected columns
  const selectedInOrder = state.columns.filter((c: any) => c.selected).map((c: any) => c.original);

  // Check if we need select (order changed or columns removed)
  const needsSelect =
    selectedInOrder.length !== this.columns.length ||
    selectedInOrder.join(',') !== this.columns.join(',');

  // Build rename map
  const renames: Record<string, string> = {};
  state.columns.forEach((c: any) => {
    if (c.selected && c.original !== c.renamed && c.renamed.trim() !== '') {
      renames[c.original] = c.renamed.trim();
    }
  });

  const needsRename = Object.keys(renames).length > 0;

  // Apply transforms
  if (needsSelect) {
    await this.runTransform('Edit Columns', { select: selectedInOrder });
  }

  if (needsRename) {
    await this.runTransform('Rename', { rename: renames });
  }
}
