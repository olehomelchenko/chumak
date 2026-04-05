/**
 * Dialog Registry
 *
 * Centralized configuration for all dialogs in Syto.
 * This single source of truth reduces maintenance burden and prevents inconsistencies.
 *
 * When adding a new dialog:
 * 1. Add entry to DIALOG_REGISTRY below (including applyHandler if transform dialog)
 * 2. Create dialog component in src/app/components/
 * 3. Add dialog state to DialogStore (if needed)
 * 4. Implement handler function (if transform dialog)
 */

import type { ComponentType } from 'preact';
import type { DialogName } from './types';
import { StepService, type ExecutionCallbacks } from './services/StepService';
import { DialogStore } from './stores/DialogStore';
import { AppStore } from './stores/AppStore';
import { GeneratorService } from './services/GeneratorService';
import i18n from '../i18n';

// Transform handlers
import { confirm } from './handlers/core/notification-handlers';
import { applySplitTransform } from './handlers/transform/split-handlers';
import * as MergeHandlers from './handlers/transform/merge-handlers';
import { applyDateTransform } from './handlers/transform/date-handlers';
import * as ParseDateHandlers from './handlers/transform/parse-date-handlers';
import * as TextHandlers from './handlers/transform/text-handlers';
import * as FoldHandlers from './handlers/transform/fold-handlers';
import * as PivotHandlers from './handlers/transform/pivot-handlers';
import * as AggregateHandlers from './handlers/transform/aggregate-handlers';
import * as DescribeHandlers from './handlers/transform/describe-handlers';
import * as WindowHandlers from './handlers/transform/window-handlers';
import * as JoinHandlers from './handlers/transform/join-handlers';
import * as AppendHandlers from './handlers/transform/append-handlers';
import { applyDedupeTransform } from './handlers/transform/dedupe-handlers';
import * as ColumnEditorHandlers from './handlers/dialog/column-editor-handlers';

// Dialog type determines rendering location and style
export type DialogType = 'slide-panel' | 'centered-modal' | 'full-page';

// Apply handler function type
export type ApplyHandler = (callbacks: ExecutionCallbacks) => Promise<void>;

// Dialog metadata interface
export interface DialogConfig {
  name: DialogName;
  title: string;
  type: DialogType;
  component?: ComponentType<any>; // Optional: can be lazy-loaded
  buttonText?: string; // Custom button text (defaults to "Apply")
  initState?: (section?: string) => void; // Optional initialization logic
  getState?: () => Record<string, any> | null; // Serializable state for change detection
  hasError?: () => boolean; // Whether Apply button should be disabled
  getError?: () => string | null; // Error message for disabled Apply tooltip
  isUrlNavigable?: boolean; // Whether dialog should update URL hash
  applyHandler?: ApplyHandler; // Handler called when Apply is clicked
}

/**
 * Creates a dialog config that delegates state/error to bridge signals
 * populated by the useDialogState hook. Use this for new-style dialogs
 * that manage their own state locally instead of via DialogStore.
 */
export function bridgedDialogEntry(
  base: Omit<DialogConfig, 'getState' | 'hasError' | 'getError'>
): DialogConfig {
  return {
    ...base,
    getState: () => DialogStore.activeDialogState.value,
    hasError: () => DialogStore.activeDialogHasError.value,
    getError: () => DialogStore.activeDialogError.value,
  };
}

/**
 * Dialog Registry
 *
 * Centralized metadata for all dialogs.
 * Order doesn't matter - this is a lookup table, not execution order.
 */
export const DIALOG_REGISTRY: Record<string, DialogConfig> = {
  // === Transform Dialogs (Slide Panels) ===

  filter: bridgedDialogEntry({
    name: 'filter',
    title: 'Filter Rows',
    type: 'slide-panel',
    buttonText: 'buttons.filter',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const expr = state.expression?.trim();
      if (!expr) {
        await cb.onError?.(i18n.t('validation.required.expression', { ns: 'errors' }));
        return;
      }
      if (DialogStore.activeDialogHasError.value) {
        await cb.onError?.(i18n.t('validation.invalid.expression', { ns: 'errors' }));
        return;
      }
      await StepService.runTransform('Filter', { filter: expr }, cb);
    },
  }),

  derive: bridgedDialogEntry({
    name: 'derive',
    title: 'Derive Column',
    type: 'slide-panel',
    buttonText: 'buttons.addColumn',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const columnName = state.columnName?.trim();
      const expression = state.expression?.trim();
      if (!columnName || !expression) {
        await cb.onError?.(i18n.t('validation.required.columnNameAndExpression', { ns: 'errors' }));
        return;
      }
      if (DialogStore.activeDialogHasError.value) {
        await cb.onError?.(i18n.t('validation.invalid.expression', { ns: 'errors' }));
        return;
      }
      const columns = AppStore.columns.value;
      if (columns.includes(columnName)) {
        const confirmed = await confirm(
          i18n.t('confirms.overwriteColumn', {
            ns: 'common',
            message: i18n.t('validation.duplicate.columnExists', {
              ns: 'errors',
              name: columnName,
            }),
          }),
          undefined,
          i18n.t('buttons.overwrite', { ns: 'common' })
        );
        if (!confirmed) return;
      }
      await StepService.runTransform('Derive', { derive: { [columnName]: expression } }, cb);
    },
  }),

  sort: bridgedDialogEntry({
    name: 'sort',
    title: 'Sort Rows',
    type: 'slide-panel',
    buttonText: 'buttons.sort',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const fields = (state.fields as Array<{ field: string; order: 'asc' | 'desc' }>).filter(
        (f) => f.field !== ''
      );
      if (fields.length === 0) {
        await cb.onError?.(i18n.t('validation.selection.sortColumn', { ns: 'errors' }));
        return;
      }
      const sort = fields.length === 1 ? fields[0] : fields;
      await StepService.runTransform('Sort', { sort }, cb);
    },
  }),

  sliceRows: bridgedDialogEntry({
    name: 'sliceRows',
    title: 'Keep / Remove Rows',
    type: 'slide-panel',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      if (!state.count || state.count <= 0) {
        await cb.onError?.(i18n.t('validation.invalid.rowCount', { ns: 'errors' }));
        return;
      }
      await StepService.runTransform(
        'Slice Rows',
        { sliceRows: { count: state.count, mode: state.mode } },
        cb
      );
    },
  }),

  index: bridgedDialogEntry({
    name: 'index',
    title: 'Add Index Column',
    type: 'slide-panel',
    buttonText: 'buttons.addColumn',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      if (!state.columnName || (state.columnName as string).trim() === '') {
        await cb.onError?.(i18n.t('validation.required.columnName', { ns: 'errors' }));
        return;
      }
      await StepService.runTransform(
        'Add Index',
        {
          addIndex: {
            columnName: (state.columnName as string).trim(),
            startFrom: state.startFrom ?? 1,
          },
        },
        cb
      );
    },
  }),

  sample: bridgedDialogEntry({
    name: 'sample',
    title: 'Sample Rows',
    type: 'slide-panel',
    buttonText: 'buttons.sample',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      if (!state.count || state.count <= 0) {
        await cb.onError?.(i18n.t('validation.invalid.sampleSize', { ns: 'errors' }));
        return;
      }
      const finalSeed =
        state.seed !== undefined && !isNaN(state.seed)
          ? state.seed
          : Math.floor(Math.random() * 1000000);
      await StepService.runTransform(
        'Sample',
        { sample: { count: state.count, seed: finalSeed } },
        cb
      );
    },
  }),

  spread: bridgedDialogEntry({
    name: 'spread',
    title: 'Spread Array Column',
    type: 'slide-panel',
    buttonText: 'buttons.spread',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const column = state.column as string;
      if (!column || column.trim() === '') {
        await cb.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
        return;
      }
      const limit = state.limit as number | undefined;
      if (limit !== undefined && limit <= 0) {
        await cb.onError?.(i18n.t('validation.invalid.spreadLimit', { ns: 'errors' }));
        return;
      }
      const transform: any = { spread: { column, keepOriginal: state.keepOriginal } };
      if (limit !== undefined) transform.spread.limit = limit;
      await StepService.runTransform('Spread', transform, cb);
    },
  }),

  unroll: bridgedDialogEntry({
    name: 'unroll',
    title: 'Unroll Array Column',
    type: 'slide-panel',
    buttonText: 'buttons.unroll',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const column = state.column as string;
      if (!column || column.trim() === '') {
        await cb.onError?.(i18n.t('validation.selection.unrollColumn', { ns: 'errors' }));
        return;
      }
      const transform: any = { unroll: { column, keepOriginal: state.keepOriginal } };
      if (state.indices) transform.unroll.indices = true;
      await StepService.runTransform('Unroll', transform, cb);
    },
  }),

  split: bridgedDialogEntry({
    name: 'split',
    title: 'Split Column',
    type: 'slide-panel',
    buttonText: 'buttons.split',
    applyHandler: (cb) => applySplitTransform(cb),
  }),

  merge: bridgedDialogEntry({
    name: 'merge',
    title: 'Merge Columns',
    type: 'slide-panel',
    buttonText: 'buttons.merge',
    applyHandler: (cb) => MergeHandlers.applyMergeTransform(cb),
  }),

  regexpMatch: bridgedDialogEntry({
    name: 'regexpMatch',
    title: 'Regexp Match',
    type: 'slide-panel',
    buttonText: 'buttons.match',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const colName = state.columnName as string;
      const srcCol = state.sourceColumn as string;
      const pat = state.pattern as string;
      if (!colName || !pat) {
        await cb.onError?.(i18n.t('validation.required.columnNameAndPattern', { ns: 'errors' }));
        return;
      }
      if (state.error) {
        await cb.onError?.(i18n.t('validation.invalid.pattern', { ns: 'errors' }));
        return;
      }
      if (!srcCol) {
        await cb.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
        return;
      }
      const columns = AppStore.columns.value;
      if (columns.includes(colName)) {
        const { confirm } = await import('./handlers/core/notification-handlers');
        const confirmed = await confirm(
          i18n.t('confirms.overwriteColumn', {
            ns: 'common',
            message: i18n.t('validation.duplicate.columnExists', { ns: 'errors', name: colName }),
          }),
          undefined,
          i18n.t('buttons.overwrite', { ns: 'common' })
        );
        if (!confirmed) return;
      }
      const { quoteColumnRef, escapePattern } = await import('./handlers/core/helper-handlers');
      const colRef = quoteColumnRef(srcCol);
      const escapedPattern = escapePattern(pat);
      const expression = `regexp_match(${colRef}, "${escapedPattern}")`;
      await StepService.runTransform('Regexp Match', { derive: { [colName]: expression } }, cb);
    },
  }),

  regexpExtract: bridgedDialogEntry({
    name: 'regexpExtract',
    title: 'Regexp Extract',
    type: 'slide-panel',
    buttonText: 'buttons.extract',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const colName = state.columnName as string;
      const srcCol = state.sourceColumn as string;
      const pat = state.pattern as string;
      const grp = (state.group as number) || 0;
      if (!colName || !pat) {
        await cb.onError?.(i18n.t('validation.required.columnNameAndPattern', { ns: 'errors' }));
        return;
      }
      if (state.error) {
        await cb.onError?.(i18n.t('validation.invalid.pattern', { ns: 'errors' }));
        return;
      }
      if (!srcCol) {
        await cb.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
        return;
      }
      const columns = AppStore.columns.value;
      if (columns.includes(colName)) {
        const { confirm } = await import('./handlers/core/notification-handlers');
        const confirmed = await confirm(
          i18n.t('confirms.overwriteColumn', {
            ns: 'common',
            message: i18n.t('validation.duplicate.columnExists', { ns: 'errors', name: colName }),
          }),
          undefined,
          i18n.t('buttons.overwrite', { ns: 'common' })
        );
        if (!confirmed) return;
      }
      const { quoteColumnRef, escapePattern } = await import('./handlers/core/helper-handlers');
      const colRef = quoteColumnRef(srcCol);
      const escapedPattern = escapePattern(pat);
      const expression = `regexp_extract(${colRef}, "${escapedPattern}", ${grp})`;
      await StepService.runTransform('Regexp Extract', { derive: { [colName]: expression } }, cb);
    },
  }),

  date: bridgedDialogEntry({
    name: 'date',
    title: 'Date Operations',
    type: 'slide-panel',
    buttonText: 'buttons.addColumn',
    applyHandler: (cb) => applyDateTransform(cb),
  }),

  parseDate: bridgedDialogEntry({
    name: 'parseDate',
    title: 'Parse Date',
    type: 'slide-panel',
    buttonText: 'buttons.parse',
    applyHandler: (cb) => ParseDateHandlers.applyParseDateTransform(cb),
  }),

  text: bridgedDialogEntry({
    name: 'text',
    title: 'Text Operations',
    type: 'slide-panel',
    buttonText: 'buttons.addColumn',
    applyHandler: (cb) => TextHandlers.applyTextTransform(cb),
  }),

  dedupe: bridgedDialogEntry({
    name: 'dedupe',
    title: 'Duplicates',
    type: 'slide-panel',
    buttonText: 'buttons.deduplicate',
    applyHandler: (cb) => applyDedupeTransform(cb),
  }),

  fold: bridgedDialogEntry({
    name: 'fold',
    title: 'Unpivot Data (Fold)',
    type: 'slide-panel',
    buttonText: 'buttons.unpivot',
    applyHandler: (cb) => FoldHandlers.applyFoldTransform(cb),
  }),

  pivot: bridgedDialogEntry({
    name: 'pivot',
    title: 'Pivot Data (Wide)',
    type: 'slide-panel',
    buttonText: 'buttons.pivot',
    applyHandler: (cb) => PivotHandlers.applyPivotTransform(cb),
  }),

  aggregate: bridgedDialogEntry({
    name: 'aggregate',
    title: 'Group By',
    type: 'slide-panel',
    buttonText: 'buttons.group',
    applyHandler: (cb) => AggregateHandlers.applyAggregateTransform(cb),
  }),

  describe: bridgedDialogEntry({
    name: 'describe',
    title: 'Summary Statistics',
    type: 'slide-panel',
    buttonText: 'buttons.describe',
    applyHandler: (cb) => DescribeHandlers.applyDescribeTransform(cb),
  }),

  window: {
    name: 'window',
    title: 'Window Functions',
    type: 'slide-panel',
    buttonText: 'buttons.addColumns',
    applyHandler: (cb) => WindowHandlers.applyWindowTransform(cb),
  },

  join: {
    name: 'join',
    title: 'Join Data',
    type: 'slide-panel',
    buttonText: 'buttons.join',
    applyHandler: (cb) => JoinHandlers.applyJoinTransform(cb),
    getState: () => ({
      rightModel: DialogStore.joinState.rightModel.value,
      joinType: DialogStore.joinState.joinType.value,
      keyPairs: DialogStore.joinState.keyPairs.value,
      suffixes: DialogStore.joinState.suffixes.value,
    }),
    hasError: () => {
      const s = DialogStore.joinState;
      const hasRight = !!s.rightModel.value;
      const hasKeys = s.joinType.value === 'cross' || s.keyPairs.value.some((p) => p[0] && p[1]);
      const hasLookupValues =
        s.joinType.value !== 'lookup' || s.selectedRightColumns.value.length > 0;
      return !hasRight || !hasKeys || !hasLookupValues;
    },
  },

  append: {
    name: 'append',
    title: 'Append Data',
    type: 'slide-panel',
    buttonText: 'buttons.append',
    applyHandler: (cb) => AppendHandlers.applyAppendTransform(cb),
    getState: () => ({
      targetModel: DialogStore.appendState.targetModel.value,
      removeDuplicates: DialogStore.appendState.removeDuplicates.value,
    }),
    hasError: () => !DialogStore.appendState.targetModel.value,
  },

  replace: bridgedDialogEntry({
    name: 'replace',
    title: 'Replace Values',
    type: 'slide-panel',
    buttonText: 'buttons.replace',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const column = state.column as string;
      const mode = state.findMode as string;
      const findValue = state.findValue as string;
      const replaceValue = state.replaceValue as string;
      const isRegex = state.isRegex as boolean;
      if (!column) {
        await cb.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
        return;
      }
      if (mode === 'value') {
        // TODO: dead code — findValue is always a string from the signal bridge; was dead in old handler too
        if (!isRegex && (findValue === undefined || findValue === null)) {
          const { confirm } = await import('./handlers/core/notification-handlers');
          const confirmed = await confirm(
            i18n.t('confirms.replaceNulls', { ns: 'common' }),
            undefined,
            i18n.t('buttons.replace', { ns: 'common' })
          );
          if (!confirmed) return;
        }
        if (isRegex && !findValue) {
          await cb.onError?.(i18n.t('validation.required.regexPattern', { ns: 'errors' }));
          return;
        }
      }
      const transform = {
        replace: {
          column,
          find: mode === 'value' ? findValue : null,
          replace: replaceValue === '' ? null : replaceValue,
          isRegex: mode === 'value' ? isRegex : false,
          matchMode: mode !== 'value' ? (mode as 'errors' | 'null') : undefined,
        },
      };
      await StepService.runTransform(isRegex ? 'Replace (Regex)' : 'Replace', transform, cb);
    },
  }),

  'column-editor': {
    name: 'column-editor',
    title: 'Edit Columns',
    type: 'slide-panel',
    applyHandler: (cb) => ColumnEditorHandlers.applyColumnEditorTransform(cb),
    getState: () => DialogStore.columnEditorState.columns.value as any,
  },

  impute: bridgedDialogEntry({
    name: 'impute',
    title: 'Impute Missing Values',
    type: 'slide-panel',
    buttonText: 'buttons.impute',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      if (!state.column) {
        await cb.onError?.(i18n.t('validation.selection.column', { ns: 'errors' }));
        return;
      }
      const transform = {
        impute: {
          column: state.column,
          strategy: state.strategy,
          value: state.strategy === 'constant' ? state.value : undefined,
          includeEmptyString: state.includeEmptyString,
        },
      };
      await StepService.runTransform('Impute', transform, cb);
    },
  }),

  selectPattern: bridgedDialogEntry({
    name: 'selectPattern',
    title: 'Select Pattern',
    type: 'slide-panel',
    buttonText: 'buttons.select',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const pattern = state.pattern as string;
      const matchType = state.matchType as string;
      const include = state.include as string[];
      if (!pattern?.trim()) {
        await cb.onError?.(i18n.t('validation.required.pattern', { ns: 'errors' }));
        return;
      }
      if (matchType === 'regex') {
        const { validateRegexPattern } = await import('./handlers/validation-engine');
        const validation = validateRegexPattern(pattern);
        if (!validation.valid) {
          await cb.onError?.(validation.error!);
          return;
        }
      }
      await StepService.runTransform(
        'Select Pattern',
        {
          selectPattern: {
            pattern: pattern.trim(),
            matchType: matchType as 'prefix' | 'suffix' | 'contains' | 'regex',
            include: include?.length > 0 ? include : undefined,
          },
        },
        cb
      );
    },
  }),

  removePattern: bridgedDialogEntry({
    name: 'removePattern',
    title: 'Remove Pattern',
    type: 'slide-panel',
    buttonText: 'buttons.remove',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const pattern = state.pattern as string;
      const matchType = state.matchType as string;
      if (!pattern?.trim()) {
        await cb.onError?.(i18n.t('validation.required.pattern', { ns: 'errors' }));
        return;
      }
      if (matchType === 'regex') {
        const { validateRegexPattern } = await import('./handlers/validation-engine');
        const validation = validateRegexPattern(pattern);
        if (!validation.valid) {
          await cb.onError?.(validation.error!);
          return;
        }
      }
      await StepService.runTransform(
        'Remove Pattern',
        {
          removePattern: {
            pattern: pattern.trim(),
            matchType: matchType as 'prefix' | 'suffix' | 'contains' | 'regex',
          },
        },
        cb
      );
    },
  }),

  conditional: bridgedDialogEntry({
    name: 'conditional',
    title: 'Conditional Column',
    type: 'slide-panel',
    buttonText: 'buttons.addColumn',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const column = state.column as string;
      const conditions = state.conditions as Array<{ when: string; then: string }>;
      const elseValue = state.else as string;
      if (!column?.trim()) {
        await cb.onError?.(i18n.t('validation.required.columnName', { ns: 'errors' }));
        return;
      }
      const validConditions = conditions.filter((c) => c.when.trim() && c.then.trim());
      if (validConditions.length === 0) {
        await cb.onError?.(i18n.t('validation.required.condition', { ns: 'errors' }));
        return;
      }
      if (!elseValue?.trim()) {
        await cb.onError?.(i18n.t('validation.required.elseValue', { ns: 'errors' }));
        return;
      }
      await StepService.runTransform(
        'Conditional',
        {
          conditional: {
            column: column.trim(),
            conditions: validConditions.map((c) => ({ when: c.when.trim(), then: c.then.trim() })),
            else: elseValue.trim(),
          },
        },
        cb
      );
    },
  }),

  renamePattern: bridgedDialogEntry({
    name: 'renamePattern',
    title: 'Rename Pattern',
    type: 'slide-panel',
    buttonText: 'buttons.rename',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      const find = state.find as string;
      const replace = state.replace as string;
      const regex = state.regex as boolean;
      if (!find?.trim()) {
        await cb.onError?.(i18n.t('validation.required.findPattern', { ns: 'errors' }));
        return;
      }
      if (regex) {
        const { validateRegexPattern } = await import('./handlers/validation-engine');
        const validation = validateRegexPattern(find);
        if (!validation.valid) {
          await cb.onError?.(validation.error!);
          return;
        }
      }
      await StepService.runTransform(
        'Rename Pattern',
        {
          renamePattern: { find: find.trim(), replace: (replace || '').trim(), regex },
        },
        cb
      );
    },
  }),

  promoteHeader: bridgedDialogEntry({
    name: 'promoteHeader',
    title: 'Promote Row to Header',
    type: 'slide-panel',
    buttonText: 'buttons.promote',
    applyHandler: async (cb) => {
      const state = DialogStore.activeDialogState.value;
      if (!state) return;
      await StepService.runTransform(
        'Promote Header',
        { promoteHeader: { skipRows: state.skipRows as number } },
        cb
      );
    },
  }),

  // === Import Dialogs ===

  'import-csv': {
    name: 'import-csv',
    title: 'Import CSV', // Note: title changes dynamically for JSON
    type: 'slide-panel',
    buttonText: 'buttons.import',
    getState: () => ({
      sourceName: DialogStore.importCsvState.sourceName.value,
      headerMode: DialogStore.importCsvState.headerMode.value,
      delimiter: DialogStore.importCsvState.delimiter.value,
      selectedSheetIndex: DialogStore.importCsvState.selectedSheetIndex.value,
    }),
  },

  'import-url': {
    name: 'import-url',
    title: 'Import from URL',
    type: 'slide-panel',
    buttonText: 'buttons.fetchData',
    getState: () => ({ url: DialogStore.importUrlState.url.value }),
    hasError: () =>
      !DialogStore.importUrlState.url.value || DialogStore.importUrlState.isFetching.value,
  },

  'import-text': {
    name: 'import-text',
    title: 'Enter Data',
    type: 'slide-panel',
    buttonText: 'buttons.import',
    getState: () => ({ text: DialogStore.importTextState.text.value }),
    hasError: () => !DialogStore.importTextState.text.value.trim(),
  },

  generate: {
    name: 'generate',
    title: 'Generate Data',
    type: 'slide-panel',
    buttonText: 'buttons.generate',
    getState: () => ({
      sourceName: DialogStore.generateState.sourceName.value,
      rowCount: DialogStore.generateState.rowCount.value,
      columnName: DialogStore.generateState.columnName.value,
      type: DialogStore.generateState.type.value,
      config: DialogStore.generateState.config.value,
    }),
    hasError: () => {
      const g = DialogStore.generateState;
      const generator = {
        name: g.columnName.value,
        type: g.type.value as any,
        config: g.config.value,
      };
      return (
        !g.sourceName.value?.trim() ||
        !g.columnName.value?.trim() ||
        g.rowCount.value <= 0 ||
        !!GeneratorService.validateGenerator(generator, g.isRowAuto.value)
      );
    },
  },

  // === Utility Dialogs (Centered Modals) ===

  settings: {
    name: 'settings',
    title: 'Settings',
    type: 'centered-modal',
    isUrlNavigable: true,
    // No getState — settings are applied immediately, no "unsaved changes" confirmation needed
  },

  download: {
    name: 'download',
    title: 'Download Data',
    type: 'centered-modal',
    buttonText: 'buttons.download',
  },

  'type-conversion': {
    name: 'type-conversion',
    title: 'Type Conversion',
    type: 'centered-modal',
  },

  // === Info Pages (Centered Modals, URL Navigable) ===

  expressions: {
    name: 'expressions',
    title: 'Reference',
    type: 'centered-modal',
    isUrlNavigable: true,
  },

  reference: {
    name: 'reference',
    title: 'Reference',
    type: 'centered-modal',
    isUrlNavigable: true,
    // Workaround: globalThis is used because initState runs before the component mounts,
    // so a prop/signal can't reach FunctionReferenceDialog in time. Cleaned up on mount.
    initState: (section?: string) => {
      if (section) {
        (globalThis as any).__referenceSection = section;
      }
    },
  },

  'dependency-graph': {
    name: 'dependency-graph',
    title: 'Dependency Graph',
    type: 'centered-modal',
    isUrlNavigable: false,
  },

  'workflow-import': {
    name: 'workflow-import',
    title: 'Import Workflow',
    type: 'centered-modal',
    // No getState — file bindings are ephemeral, no meaningful state to snapshot
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

export function getDialogTitle(dialogName: DialogName): string {
  if (!dialogName) return '';

  // Special case: import-csv title changes based on file type
  if (dialogName === 'import-csv' && DialogStore.importCsvState.isJson.value) {
    return i18n.t('dialogs:titles.importJson');
  }
  if (dialogName === 'import-csv' && DialogStore.importCsvState.isExcel.value) {
    return i18n.t('dialogs:titles.importExcel');
  }
  if (dialogName === 'import-csv') {
    return i18n.t('dialogs:titles.importCsv');
  }

  // Map dialog name to translation key (convert kebab-case to camelCase)
  const keyMap: Record<string, string> = {
    'slice-rows': 'sliceRows',
    'regexp-match': 'regexpMatch',
    'regexp-extract': 'regexpExtract',
    'parse-date': 'parseDate',
    'column-editor': 'columnEditor',
    'select-pattern': 'selectPattern',
    'remove-pattern': 'removePattern',
    'rename-pattern': 'renamePattern',
    'import-url': 'importUrl',
    'import-text': 'importText',
    'type-conversion': 'typeConversion',
    'dependency-graph': 'dependencyGraph',
    'workflow-import': 'workflowImport',
  };

  const key = keyMap[dialogName] || dialogName;
  const config = getDialogConfig(dialogName);
  return i18n.t(`dialogs:titles.${key}`, config?.title || '');
}

export function getDialogButtonText(dialogName: DialogName): string {
  if (!dialogName) return i18n.t('common:buttons.apply');

  const config = getDialogConfig(dialogName);
  if (!config?.buttonText) return i18n.t('common:buttons.apply');

  // buttonText stores a translation key like 'buttons.filter'
  // Prefix with 'common:' to specify the namespace
  return i18n.t(`common:${config.buttonText}` as any);
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
