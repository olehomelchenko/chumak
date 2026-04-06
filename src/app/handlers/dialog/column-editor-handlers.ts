import { Signal } from '@preact/signals';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { matchColumnPattern } from '../../../core/transforms';
import i18n from '../../../i18n';
import type {
  ColumnEditorMode,
  ColumnEditorTextSubMode,
  ColumnEditorPatternMode,
  ColumnEditorPatternMatchType,
  ColumnEditorPatternOperationMode,
} from '../../../types/modes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnEditorColumn {
  original: string;
  renamed: string;
  selected: boolean;
}

/** Shape of the local signal state created by the component's useDialogState factory. */
export interface ColumnEditorState {
  mode: Signal<ColumnEditorMode>;
  textSubMode: Signal<ColumnEditorTextSubMode>;
  columns: Signal<ColumnEditorColumn[]>;
  textValue: Signal<string>;
  textError: Signal<string | null>;
  patternText: Signal<string>;
  patternMode: Signal<ColumnEditorPatternMode>;
  patternMatchType: Signal<ColumnEditorPatternMatchType>;
  draggedIndex: Signal<number | null>;
  patternOperationMode: Signal<ColumnEditorPatternOperationMode>;
  patternFind: Signal<string>;
  patternReplace: Signal<string>;
  patternRegex: Signal<boolean>;
  patternError: Signal<string | null>;
}

// ---------------------------------------------------------------------------
// Section parameter mechanism
// ---------------------------------------------------------------------------

let pendingSection: string | null = null;

export function setColumnEditorSection(section: string): void {
  pendingSection = section;
}

export function consumeColumnEditorSection(): string | null {
  const s = pendingSection;
  pendingSection = null;
  return s;
}

// ---------------------------------------------------------------------------
// Pure functions (accept params, no store reads)
// ---------------------------------------------------------------------------

/**
 * Compute changes relative to appColumns from the dialog's current state values.
 */
export function getColumnEditorChanges(
  mode: ColumnEditorMode,
  textValue: string,
  textSubMode: ColumnEditorTextSubMode,
  columns: ColumnEditorColumn[],
  appColumns: string[]
): {
  hasChanges: boolean;
  removed: string[];
  renamed: { from: string; to: string }[];
  reordered: boolean;
} {
  if (mode === 'text') {
    const lines = textValue
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (textSubMode === 'rename') {
      const renamed: { from: string; to: string }[] = [];
      for (let i = 0; i < lines.length && i < appColumns.length; i++) {
        if (appColumns[i] !== lines[i]) {
          renamed.push({ from: appColumns[i], to: lines[i] });
        }
      }
      return { hasChanges: renamed.length > 0, removed: [], renamed, reordered: false };
    } else if (textSubMode === 'reorder') {
      const reordered = lines.join(',') !== appColumns.join(',');
      return { hasChanges: reordered, removed: [], renamed: [], reordered };
    } else if (textSubMode === 'select') {
      const lineSet = new Set(lines);
      const removed = appColumns.filter((c) => !lineSet.has(c));
      return { hasChanges: removed.length > 0, removed, renamed: [], reordered: false };
    }
  }

  // List mode (or pattern — fallthrough)
  const removed = columns.filter((c) => !c.selected).map((c) => c.original);

  const renamed = columns
    .filter((c) => c.selected && c.original !== c.renamed && c.renamed.trim() !== '')
    .map((c) => ({ from: c.original, to: c.renamed.trim() }));

  const selectedOriginals = columns.filter((c) => c.selected).map((c) => c.original);

  const originalSelectedOrder = appColumns.filter((c) =>
    columns.find((sc) => sc.original === c && sc.selected)
  );

  const reordered = JSON.stringify(selectedOriginals) !== JSON.stringify(originalSelectedOrder);

  const hasChanges = removed.length > 0 || renamed.length > 0 || reordered;

  return { hasChanges, removed, renamed, reordered };
}

/**
 * Find columns matching a pattern (for preview in pattern mode).
 */
export function getPatternMatchedColumns(
  patternText: string,
  patternMatchType: ColumnEditorPatternMatchType,
  appColumns: string[]
): string[] {
  if (!patternText || patternText.trim() === '') {
    return [];
  }

  try {
    let matchType = patternMatchType;
    if (matchType === 'exact') {
      matchType = 'contains';
    }
    const matched = matchColumnPattern(appColumns, {
      pattern: patternText.trim(),
      matchType: matchType as 'prefix' | 'suffix' | 'contains' | 'regex',
      mode: 'include',
    });
    return matched;
  } catch (_e) {
    return [];
  }
}

/**
 * Preview rename results for pattern mode.
 */
export function getPatternRenamePreview(
  patternFind: string,
  patternReplace: string,
  patternRegex: boolean,
  appColumns: string[]
): Array<{ from: string; to: string }> {
  if (!patternFind || patternFind.trim() === '') {
    return [];
  }

  const preview: Array<{ from: string; to: string }> = [];

  for (const col of appColumns) {
    let newName: string | null = null;

    if (patternRegex) {
      try {
        const regex = new RegExp(patternFind);
        if (regex.test(col)) {
          newName = col.replace(regex, patternReplace);
        }
      } catch (_e) {
        return [];
      }
    } else {
      if (col.includes(patternFind)) {
        newName = col.replace(patternFind, patternReplace);
      }
    }

    if (newName && newName !== col) {
      preview.push({ from: col, to: newName });
    }
  }

  return preview;
}

/**
 * Populate text value from the list state, switching to text mode.
 * Operates on the local signal state object.
 */
export function switchColumnEditorToText(state: ColumnEditorState): void {
  if (state.textSubMode.value === 'rename') {
    const lines = state.columns.value.map((c) => c.renamed);
    state.textValue.value = lines.join('\n');
  } else if (state.textSubMode.value === 'reorder') {
    const lines = state.columns.value.filter((c) => c.selected).map((c) => c.original);
    state.textValue.value = lines.join('\n');
  } else if (state.textSubMode.value === 'select') {
    const lines = state.columns.value.filter((c) => c.selected).map((c) => c.original);
    state.textValue.value = lines.join('\n');
  }
  state.textError.value = null;
  state.mode.value = 'text';
}

/**
 * Validate the text editor content. Pure — returns result without writing to signals.
 */
// TODO: i18n — validation messages below are hardcoded English; should use i18n.t() keys
export function validateColumnEditorText(
  textValue: string,
  textSubMode: ColumnEditorTextSubMode,
  appColumns: string[]
): { valid: boolean; error: string | null } {
  const lines = textValue
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const columnCount = appColumns.length;
  const originalNameSet = new Set(appColumns);

  if (lines.length === 0) {
    return { valid: false, error: 'Enter at least one column name' };
  }

  // Check for duplicates (case-insensitive)
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.toLowerCase())) {
      return { valid: false, error: `Duplicate column name: "${line}"` };
    }
    seen.add(line.toLowerCase());
  }

  if (textSubMode === 'rename') {
    if (lines.length !== columnCount) {
      return {
        valid: false,
        error: `Rename requires exactly ${columnCount} lines (one per column), got ${lines.length}`,
      };
    }
  } else if (textSubMode === 'reorder') {
    for (const line of lines) {
      if (!originalNameSet.has(line)) {
        return { valid: false, error: `Unknown column: "${line}"` };
      }
    }
    if (lines.length !== columnCount) {
      return {
        valid: false,
        error: `Reorder requires all ${columnCount} columns, got ${lines.length}`,
      };
    }
  } else if (textSubMode === 'select') {
    for (const line of lines) {
      if (!originalNameSet.has(line)) {
        return { valid: false, error: `Unknown column: "${line}"` };
      }
    }
  }

  return { valid: true, error: null };
}

// ---------------------------------------------------------------------------
// Apply handler — reads from bridge signal
// ---------------------------------------------------------------------------

export async function applyColumnEditorTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const appColumns = AppStore.columns.value;

  const mode = state.mode as ColumnEditorMode;
  const textSubMode = state.textSubMode as ColumnEditorTextSubMode;
  const textValue = state.textValue as string;
  const columns = state.columns as ColumnEditorColumn[];
  const patternOperationMode = state.patternOperationMode as ColumnEditorPatternOperationMode;
  const patternText = state.patternText as string;
  const patternMatchType = state.patternMatchType as ColumnEditorPatternMatchType;
  const patternFind = state.patternFind as string;
  const patternReplace = state.patternReplace as string;
  const patternRegex = state.patternRegex as boolean;
  // Handle pattern mode
  if (mode === 'pattern') {
    if (patternOperationMode === 'select') {
      if (!patternText || patternText.trim() === '') {
        await callbacks.onError?.(i18n.t('validation.required.pattern', { ns: 'errors' }));
        return;
      }

      if (patternMatchType === 'regex') {
        try {
          new RegExp(patternText);
        } catch (e: any) {
          // Write error back via bridge — the component will see it
          DialogStore.activeDialogState.value = {
            ...state,
            patternError: `Invalid regex pattern: ${e.message}`,
          };
          return;
        }
      }

      let matchType = patternMatchType;
      if (matchType === 'exact') {
        matchType = 'contains';
      }
      const transform = {
        selectPattern: {
          pattern: patternText.trim(),
          matchType: matchType as 'prefix' | 'suffix' | 'contains' | 'regex',
        },
      };

      DialogStore.activeDialogState.value = { ...state, patternError: null };
      await StepService.runTransform('Select Pattern', transform, callbacks);
      return;
    } else if (patternOperationMode === 'remove') {
      if (!patternText || patternText.trim() === '') {
        await callbacks.onError?.(i18n.t('validation.required.pattern', { ns: 'errors' }));
        return;
      }

      if (patternMatchType === 'regex') {
        try {
          new RegExp(patternText);
        } catch (e: any) {
          DialogStore.activeDialogState.value = {
            ...state,
            patternError: `Invalid regex pattern: ${e.message}`,
          };
          return;
        }
      }

      let matchType = patternMatchType;
      if (matchType === 'exact') {
        matchType = 'contains';
      }
      const transform = {
        removePattern: {
          pattern: patternText.trim(),
          matchType: matchType as 'prefix' | 'suffix' | 'contains' | 'regex',
        },
      };

      DialogStore.activeDialogState.value = { ...state, patternError: null };
      await StepService.runTransform('Remove Pattern', transform, callbacks);
      return;
    } else if (patternOperationMode === 'rename') {
      if (!patternFind || patternFind.trim() === '') {
        await callbacks.onError?.(i18n.t('validation.required.findPattern', { ns: 'errors' }));
        return;
      }

      if (patternRegex) {
        try {
          new RegExp(patternFind);
        } catch (e: any) {
          DialogStore.activeDialogState.value = {
            ...state,
            patternError: `Invalid regex pattern: ${e.message}`,
          };
          return;
        }
      }

      const transform = {
        renamePattern: {
          find: patternFind.trim(),
          replace: (patternReplace || '').trim(),
          regex: patternRegex,
        },
      };

      DialogStore.activeDialogState.value = { ...state, patternError: null };
      await StepService.runTransform('Rename Pattern', transform, callbacks);
      return;
    }
  }

  // Handle text mode
  if (mode === 'text') {
    const validation = validateColumnEditorText(textValue, textSubMode, appColumns);
    if (!validation.valid) {
      await callbacks.onError?.(validation.error || 'Invalid column names');
      return;
    }

    const lines = textValue
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (textSubMode === 'rename') {
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
    } else if (textSubMode === 'reorder') {
      if (lines.join(',') !== appColumns.join(',')) {
        await StepService.runTransform('Reorder Columns', { select: lines }, callbacks);
      } else {
        callbacks.onDialogClose(true);
      }
    } else if (textSubMode === 'select') {
      if (lines.length < appColumns.length || lines.join(',') !== appColumns.join(',')) {
        await StepService.runTransform('Select Columns', { select: lines }, callbacks);
      } else {
        callbacks.onDialogClose(true);
      }
    }

    return;
  }

  // List mode
  const changes = getColumnEditorChanges(mode, textValue, textSubMode, columns, appColumns);

  if (!changes.hasChanges) {
    callbacks.onDialogClose(true);
    return;
  }

  // Build select transform from current order of selected columns
  const selectedInOrder = columns.filter((c) => c.selected).map((c) => c.original);

  // Check if we need select (order changed or columns removed)
  const needsSelect =
    selectedInOrder.length !== appColumns.length ||
    selectedInOrder.join(',') !== appColumns.join(',');

  // Build rename map
  const renames: Record<string, string> = {};
  columns.forEach((c) => {
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
