import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type {
  ColumnEditorMode,
  ColumnEditorTextSubMode,
  ColumnEditorPatternMode,
  ColumnEditorPatternMatchType,
  ColumnEditorPatternOperationMode,
} from '../../../../types/modes';

export interface ColumnEditorColumn {
  original: string;
  renamed: string;
  selected: boolean;
}

export const columnEditorState = {
  mode: signal<ColumnEditorMode>('list'),
  textSubMode: signal<ColumnEditorTextSubMode>('rename'),
  columns: signal<ColumnEditorColumn[]>([]),
  textValue: signal(''),
  textError: signal<string | null>(null),
  patternText: signal(''),
  patternMode: signal<ColumnEditorPatternMode>('include'),
  patternMatchType: signal<ColumnEditorPatternMatchType>('prefix'),
  draggedIndex: signal<number | null>(null),
  patternOperationMode: signal<ColumnEditorPatternOperationMode>('select'),
  patternFind: signal(''),
  patternReplace: signal(''),
  patternRegex: signal(false),
  patternError: signal<string | null>(null),
};

export function resetColumnEditorState() {
  columnEditorState.mode.value = 'list';
  columnEditorState.textSubMode.value = 'rename';
  columnEditorState.columns.value = [];
  columnEditorState.textValue.value = '';
  columnEditorState.textError.value = null;
  columnEditorState.patternText.value = '';
  columnEditorState.patternMode.value = 'include';
  columnEditorState.patternMatchType.value = 'prefix';
  columnEditorState.draggedIndex.value = null;
  columnEditorState.patternOperationMode.value = 'select';
  columnEditorState.patternFind.value = '';
  columnEditorState.patternReplace.value = '';
  columnEditorState.patternRegex.value = false;
  columnEditorState.patternError.value = null;
}

registerResetFunction(resetColumnEditorState);
