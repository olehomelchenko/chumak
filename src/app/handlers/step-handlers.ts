import { describeTransform } from '../../core/transforms';
import { Model } from '../types';
import { ColumnSchema, TransformStep } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { StepService, ComputeResult } from '../services/StepService';
import type { PivotAggregation } from '../components/PivotDialog';
import * as ColumnEditorHandlers from './column-editor-handlers';
import * as DateHandlers from './date-handlers';
import * as TextHandlers from './text-handlers';
import * as HelperHandlers from './helper-handlers';
import * as PatternHandlers from './pattern-handlers';
import { showError, showWarning, confirm } from './notification-handlers';

/**
 * Callbacks for step operations
 */
export type StepCallbacks = {
  updatePagination: () => void;
  openDialog: (name: string, section?: string) => void;
  closeDialog: (force?: boolean) => void;
  onJoinTargetChange: () => void;
  onAppendTargetChange: () => void;
  onPivotConfigChange: () => void;
  updateSplitPreview?: () => void;
  updateDedupePreview?: () => void;
  // Transform application methods
  applyFilterTransform: () => Promise<void>;
  applySortTransform: () => Promise<void>;
  applySliceRowsTransform: () => Promise<void>;
  applySampleTransform: () => Promise<void>;
  applySpreadTransform: () => Promise<void>;
  applyUnrollTransform: () => Promise<void>;
  applyIndexTransform: () => Promise<void>;
  applySplitTransform: () => Promise<void>;
  applyMergeTransform: () => Promise<void>;
  applyDeriveTransform: () => Promise<void>;
  applyRegexpMatchTransform: () => Promise<void>;
  applyRegexpExtractTransform: () => Promise<void>;
  applyFoldTransform: () => Promise<void>;
  applyPivotTransform: () => Promise<void>;
  applyAggregateTransform: () => Promise<void>;
  applyJoinTransform: () => Promise<void>;
  applyAppendTransform: () => Promise<void>;
  applyReplaceTransform: () => Promise<void>;
  applyDedupeTransform: () => Promise<void>;
  applyImputeTransform: () => Promise<void>;
  confirmImport: () => void;
  fetchAndImportFromUrl: () => Promise<void>;
  generateData: () => Promise<void>;
  runTransform: (name: string, config: any, close?: boolean) => Promise<boolean>;
};

let callbacks: StepCallbacks | null = null;

/**
 * Set step callbacks for store-based operations
 */
export function setStepCallbacks(cb: StepCallbacks): void {
  callbacks = cb;
}

/**
 * Legacy SytoApp interface for backward compatibility
 */
interface LegacyApp extends StepCallbacks {
  activeDialog: string | null;
  activeModel: Model | null;
  columns: string[];
  sources: any[];
  models: Model[];
  currentData: any[] | null;
  viewingSchema: ColumnSchema[] | null;
  viewingIntermediate: boolean;
  activeStepIndex: number | null;
  editingStepIndex: number | null;
  stepRemovalModal: any;
  showError: (title: string, message: string, options?: any) => void;
  showWarning: (title: string, message: string) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
}

/**
 * Get callbacks from legacy app or stored callbacks
 */
function getCallbacks(legacyApp?: LegacyApp): StepCallbacks | null {
  if (legacyApp) {
    return legacyApp;
  }
  return callbacks;
}

/**
 * Dispatches transform application based on the active dialog.
 * Each case calls the corresponding method via callbacks.
 */
export async function applyActiveTransform(this: LegacyApp | void): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const activeDialog = legacyApp?.activeDialog ?? AppStore.activeDialog.value;

  switch (activeDialog) {
    case 'filter':
      await cb?.applyFilterTransform();
      break;
    case 'sort':
      await cb?.applySortTransform();
      break;
    case 'sliceRows':
      await cb?.applySliceRowsTransform();
      break;
    case 'sample':
      await cb?.applySampleTransform();
      break;
    case 'spread':
      await cb?.applySpreadTransform();
      break;
    case 'unroll':
      await cb?.applyUnrollTransform();
      break;
    case 'index':
      await cb?.applyIndexTransform();
      break;
    case 'split':
      await cb?.applySplitTransform();
      break;
    case 'merge':
      await cb?.applyMergeTransform();
      break;
    case 'derive':
      await cb?.applyDeriveTransform();
      break;
    case 'regexpMatch':
      await cb?.applyRegexpMatchTransform();
      break;
    case 'regexpExtract':
      await cb?.applyRegexpExtractTransform();
      break;
    case 'date':
      if (legacyApp) {
        await DateHandlers.applyDateTransform(
          HelperHandlers.createExecutionCallbacks(legacyApp as any),
          legacyApp as any
        );
      } else {
        await DateHandlers.applyDateTransform(HelperHandlers.createExecutionCallbacks());
      }
      break;
    case 'text':
      if (legacyApp) {
        await TextHandlers.applyTextTransform(
          HelperHandlers.createExecutionCallbacks(legacyApp as any),
          legacyApp as any
        );
      } else {
        await TextHandlers.applyTextTransform(HelperHandlers.createExecutionCallbacks());
      }
      break;
    case 'fold':
      await cb?.applyFoldTransform();
      break;
    case 'pivot':
      await cb?.applyPivotTransform();
      break;
    case 'aggregate':
      await cb?.applyAggregateTransform();
      break;
    case 'join':
      await cb?.applyJoinTransform();
      break;
    case 'append':
      await cb?.applyAppendTransform();
      break;
    case 'replace':
      await cb?.applyReplaceTransform();
      break;
    case 'dedupe':
      await cb?.applyDedupeTransform();
      break;
    case 'impute':
      await cb?.applyImputeTransform();
      break;
    case 'selectPattern':
      if (legacyApp) {
        await PatternHandlers.applySelectPatternTransform(
          HelperHandlers.createExecutionCallbacks(legacyApp as any)
        );
      } else {
        await PatternHandlers.applySelectPatternTransform(
          HelperHandlers.createExecutionCallbacks()
        );
      }
      break;
    case 'removePattern':
      if (legacyApp) {
        await PatternHandlers.applyRemovePatternTransform(
          HelperHandlers.createExecutionCallbacks(legacyApp as any)
        );
      } else {
        await PatternHandlers.applyRemovePatternTransform(
          HelperHandlers.createExecutionCallbacks()
        );
      }
      break;
    case 'conditional':
      if (legacyApp) {
        await PatternHandlers.applyConditionalTransform(
          HelperHandlers.createExecutionCallbacks(legacyApp as any)
        );
      } else {
        await PatternHandlers.applyConditionalTransform(HelperHandlers.createExecutionCallbacks());
      }
      break;
    case 'renamePattern':
      if (legacyApp) {
        await PatternHandlers.applyRenamePatternTransform(
          HelperHandlers.createExecutionCallbacks(legacyApp as any)
        );
      } else {
        await PatternHandlers.applyRenamePatternTransform(
          HelperHandlers.createExecutionCallbacks()
        );
      }
      break;
    case 'column-editor':
      await ColumnEditorHandlers.applyColumnEditorTransform({
        onDialogClose: (force: boolean) => cb?.closeDialog(force),
        runTransform: (name: string, config: any) =>
          cb?.runTransform(name, config) ?? Promise.resolve(false),
      });
      break;
    case 'import-csv':
      cb?.confirmImport();
      break;
    case 'import-url':
      await cb?.fetchAndImportFromUrl();
      break;
    case 'generate':
      await cb?.generateData();
      break;
  }
}

/**
 * Computes a model's data up to a specific step.
 * Delegates to StepService for the actual computation.
 */
export function computeModelUpToStep(
  this: LegacyApp | void,
  model: Model,
  stepIndex: number
): ComputeResult {
  const legacyApp = this as LegacyApp | undefined;
  const sources = legacyApp?.sources ?? AppStore.sources.value;
  const models = legacyApp?.models ?? AppStore.models.value;

  return StepService.computeModelUpToStep(model, stepIndex, {
    sources,
    models,
  });
}

/**
 * Computes the active model up to a specific step.
 */
export function computeUpToStep(this: LegacyApp | void, stepIndex: number): ComputeResult {
  const legacyApp = this as LegacyApp | undefined;
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  if (!activeModel) throw new Error('No active model');
  return computeModelUpToStep.call(this, activeModel, stepIndex);
}

/**
 * Views the result at a specific step index.
 */
export function viewStep(this: LegacyApp | void, stepIndex: number): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  try {
    const result = computeUpToStep.call(this, stepIndex);

    if (legacyApp) {
      legacyApp.currentData = result.data;
      legacyApp.columns = result.columns;
      legacyApp.viewingSchema = result.schema;
      legacyApp.activeStepIndex = stepIndex;
      if (activeModel) {
        legacyApp.viewingIntermediate = stepIndex < activeModel.steps.length - 1;
      }
    } else {
      AppStore.currentData.value = result.data;
      AppStore.columns.value = result.columns;
      AppStore.viewingSchema.value = result.schema;
      AppStore.activeStepIndex.value = stepIndex;
      if (activeModel) {
        AppStore.viewingIntermediate.value = stepIndex < activeModel.steps.length - 1;
      }
    }

    cb?.updatePagination();
  } catch (error: any) {
    console.error('Error computing step:', error);
    if (legacyApp?.showError) {
      legacyApp.showError('Error viewing step', `Step ${stepIndex + 1}: ${error.message}`, {
        stepIndex: error.stepIndex ?? stepIndex,
        stepDescription: error.stepDescription,
      });
    } else {
      showError('Error viewing step', `Step ${stepIndex + 1}: ${error.message}`, {
        stepIndex: error.stepIndex ?? stepIndex,
        stepDescription: error.stepDescription,
      });
    }
  }
}

/**
 * Views the final result of the active model.
 */
export function viewFinalResult(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  if (!activeModel) return;

  const data = activeModel.data;
  let columns: string[];

  if (activeModel.schema && activeModel.schema.length > 0) {
    columns = activeModel.schema.map((c: ColumnSchema) => c.name);
  } else if (data && data.length > 0) {
    columns = Object.keys(data[0]);
  } else {
    columns = [];
  }

  const stepIndex = activeModel.steps?.length > 0 ? activeModel.steps.length - 1 : null;

  if (legacyApp) {
    legacyApp.currentData = data;
    legacyApp.columns = columns;
    legacyApp.activeStepIndex = stepIndex;
    legacyApp.viewingIntermediate = false;
    legacyApp.viewingSchema = null;
  } else {
    AppStore.currentData.value = data;
    AppStore.columns.value = columns;
    AppStore.activeStepIndex.value = stepIndex;
    AppStore.viewingIntermediate.value = false;
    AppStore.viewingSchema.value = null;
  }

  cb?.updatePagination();
}

/**
 * Opens a dialog to edit an existing step.
 */
export function editStep(this: LegacyApp | void, stepIndex: number): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;
  const columns = legacyApp?.columns ?? AppStore.columns.value;

  if (!activeModel) return;
  const step = activeModel.steps[stepIndex];
  if (!step || step.import || step.types) return;

  if (legacyApp) {
    legacyApp.editingStepIndex = stepIndex;
  } else {
    AppStore.editingStepIndex.value = stepIndex;
  }

  if (step.filter) {
    cb?.openDialog('filter');
    DialogStore.filterState.expression.value = step.filter as string;
  } else if (step.derive) {
    const [colName, expr] = Object.entries(step.derive)[0];
    cb?.openDialog('derive');
    DialogStore.deriveState.columnName.value = colName;
    DialogStore.deriveState.expression.value = expr as string;
  } else if (step.select) {
    cb?.openDialog('column-editor');
    const selectedSet = new Set(step.select as string[]);
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';

    // Build union of current columns and selected columns to preserve order but show missing ones
    const allUniqueCols = Array.from(new Set([...(step.select as string[]), ...columns]));

    state.columns.value = allUniqueCols.map((col) => ({
      original: col,
      renamed: col,
      selected: selectedSet.has(col),
    }));
    state.textValue.value = '';
    state.textError.value = null;
    state.patternText.value = '';
    state.patternMode.value = 'include';
    state.patternMatchType.value = 'prefix';
    state.draggedIndex.value = null;
  } else if (step.rename) {
    cb?.openDialog('column-editor');
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';
    const renames = step.rename || {};
    state.columns.value = columns.map((col: string) => ({
      original: col,
      renamed: renames[col] || col,
      selected: true,
    }));
    state.textValue.value = '';
    state.textError.value = null;
    state.patternText.value = '';
    state.patternMode.value = 'include';
    state.patternMatchType.value = 'prefix';
    state.draggedIndex.value = null;
  } else if (step.remove) {
    cb?.openDialog('column-editor');
    const removedSet = new Set(step.remove as string[]);
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';
    state.columns.value = columns.map((col: string) => ({
      original: col,
      renamed: col,
      selected: !removedSet.has(col),
    }));
    state.textValue.value = '';
    state.textError.value = null;
    state.patternText.value = '';
    state.patternMode.value = 'include';
    state.patternMatchType.value = 'prefix';
    state.draggedIndex.value = null;
  } else if (step.sort) {
    cb?.openDialog('sort');
    DialogStore.sortState.field.value = step.sort.field;
    DialogStore.sortState.order.value = step.sort.order;
  } else if (step.sample) {
    cb?.openDialog('sample');
    DialogStore.sampleState.count.value = step.sample.count;
    DialogStore.sampleState.seed.value = step.sample.seed;
  } else if (step.aggregate) {
    cb?.openDialog('aggregate');
    const aggregations = Object.entries(step.aggregate.rollup).map(([output, opStr]) => {
      const match = (opStr as string).match(/op\.(\w+)\('([^']+)'\)/);
      if (match) {
        return { output, func: match[1], col: match[2] };
      }
      if ((opStr as string) === 'op.count()') {
        return { output, func: 'count', col: '' };
      }
      return { output, func: 'custom', col: '' };
    });
    const state = DialogStore.aggregateState;
    state.groupBy.value = [...step.aggregate.groupby];
    state.aggregations.value = aggregations;
    state.isPreviewing.value = false;
  } else if (step.join) {
    cb?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.join.right;
    DialogStore.joinState.joinType.value = step.join.how;
    DialogStore.joinState.keyPairs.value = step.join.on;
    DialogStore.joinState.suffixes.value = step.join.suffixes || ['_x', '_y'];
    cb?.onJoinTargetChange();
  } else if (step.semijoin) {
    cb?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.semijoin.right;
    DialogStore.joinState.joinType.value = 'semi';
    DialogStore.joinState.keyPairs.value = step.semijoin.on;
    cb?.onJoinTargetChange();
  } else if (step.antijoin) {
    cb?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.antijoin.right;
    DialogStore.joinState.joinType.value = 'anti';
    DialogStore.joinState.keyPairs.value = step.antijoin.on;
    cb?.onJoinTargetChange();
  } else if (step.lookup) {
    cb?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.lookup.right;
    DialogStore.joinState.joinType.value = 'lookup';
    DialogStore.joinState.keyPairs.value = step.lookup.on;
    DialogStore.joinState.selectedRightColumns.value = step.lookup.values;
    cb?.onJoinTargetChange();
  } else if (step.fold) {
    cb?.openDialog('fold');
    const state = DialogStore.foldState;
    state.keyName.value = step.fold.as[0];
    state.valueName.value = step.fold.as[1];
    state.selectedColumns.value = columns.map((c: string) =>
      step.fold ? step.fold.columns.includes(c) : false
    );
    state.mode.value = 'fold';
  } else if (step.pivot) {
    cb?.openDialog('pivot');
    const state = DialogStore.pivotState;
    state.rowColumns.value = step.pivot.rows || [];
    state.columnColumn.value = step.pivot.keys;
    state.valueColumn.value = step.pivot.values;
    state.aggregation.value = (step.pivot.aggregation || 'sum') as PivotAggregation;
    state.options.value = {
      sort: step.pivot.options?.sort ?? true,
      limit: step.pivot.options?.limit || null,
    };
    state.uniqueValueCount.value = 0;
    state.isPreviewing.value = false;
    cb?.onPivotConfigChange();
  } else if (step.replace) {
    cb?.openDialog('replace');
    const state = DialogStore.replaceState;
    state.column.value = step.replace.column;
    state.findValue.value = step.replace.find;
    state.replaceValue.value = step.replace.replace;
  } else if (step.split) {
    cb?.openDialog('split');
    const state = DialogStore.splitState;
    state.column.value = step.split.column;
    state.delimiter.value = step.split.delimiter;
    state.isRegex.value = !!step.split.isRegex;
    state.mode.value = step.split.mode || 'spread';
    state.maxColumns.value = step.split.maxColumns || 10;
    state.keepOriginal.value = !!step.split.keepOriginal;
    state.error.value = null;

    cb?.updateSplitPreview?.();
  } else if (step.dedupe) {
    cb?.openDialog('dedupe');
    const dedupeColumns = step.dedupe.columns || [];
    const state = DialogStore.dedupeState;
    state.useAllColumns.value = dedupeColumns.length === 0;
    state.selectedColumns.value = columns.map((c: string) => dedupeColumns.includes(c));
    state.duplicateCount.value = 0;
    state.mode.value = step.dedupe.mode || 'remove';

    cb?.updateDedupePreview?.();
  } else if (step.impute) {
    cb?.openDialog('impute');
    const state = DialogStore.imputeState;
    state.column.value = step.impute.column;
    state.strategy.value = step.impute.strategy;
    state.value.value = step.impute.value || '';
  } else if (step.concat) {
    cb?.openDialog('append');
    DialogStore.appendState.targetModel.value = step.concat.with;
    DialogStore.appendState.removeDuplicates.value = false;
    DialogStore.appendState.selectedLeftColumns.value = step.concat.columns || [];
    DialogStore.appendState.selectedRightColumns.value = step.concat.targetColumns || [];
    cb?.onAppendTargetChange();
  } else if (step.union) {
    cb?.openDialog('append');
    DialogStore.appendState.targetModel.value = step.union.with;
    DialogStore.appendState.removeDuplicates.value = true;
    DialogStore.appendState.selectedLeftColumns.value = step.union.columns || [];
    DialogStore.appendState.selectedRightColumns.value = step.union.targetColumns || [];
    cb?.onAppendTargetChange();
  }
}

/**
 * Cancels the current edit operation.
 */
export function cancelEdit(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);

  if (legacyApp) {
    legacyApp.editingStepIndex = null;
  } else {
    AppStore.editingStepIndex.value = null;
  }

  cb?.closeDialog(true);
}

/**
 * Removes a step from the active model.
 */
export async function removeStep(this: LegacyApp | void, stepIndex: number): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  if (!activeModel) return;
  if (activeModel.steps[stepIndex].import) {
    if (legacyApp?.showWarning) {
      legacyApp.showWarning('Cannot remove import step', 'The import step is required.');
    } else {
      showWarning('Cannot remove import step', 'The import step is required.');
    }
    return;
  }

  const step = activeModel.steps[stepIndex];
  const isLastStep = stepIndex === activeModel.steps.length - 1;

  if (isLastStep) {
    const confirmed = legacyApp?.confirm
      ? await legacyApp.confirm(`Remove step "${describeTransform(step)}"?`)
      : await confirm(`Remove step "${describeTransform(step)}"?`);
    if (!confirmed) return;
    await executeStepRemoval.call(this, stepIndex, 'single');
  } else {
    const removeMode = await showStepRemovalModal.call(this, stepIndex);
    if (!removeMode) return;
    await executeStepRemoval.call(this, stepIndex, removeMode);
  }
}

/**
 * Shows a modal for choosing how to remove a step (single vs cascade).
 */
export function showStepRemovalModal(
  this: LegacyApp | void,
  stepIndex: number
): Promise<'single' | 'all' | null> {
  const legacyApp = this as LegacyApp | undefined;
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  if (!activeModel) return Promise.resolve(null);

  const info = StepService.getStepRemovalInfo(activeModel, stepIndex);

  return new Promise((resolve) => {
    const modalState = {
      visible: true,
      stepIndex: info.stepIndex,
      stepName: info.stepName,
      affectedSteps: info.affectedSteps,
      removeMode: 'all' as 'single' | 'all',
      resolve,
    };

    if (legacyApp) {
      legacyApp.stepRemovalModal = modalState;
    } else {
      AppStore.stepRemovalModal.value = modalState;
    }
  });
}

/**
 * Closes the step removal modal.
 */
export function closeStepRemovalModal(this: LegacyApp | void, confirmed: boolean): void {
  const legacyApp = this as LegacyApp | undefined;
  const modal = legacyApp?.stepRemovalModal ?? AppStore.stepRemovalModal.value;

  if (modal.resolve) {
    modal.resolve(confirmed ? modal.removeMode : null);
  }

  if (legacyApp) {
    legacyApp.stepRemovalModal.visible = false;
  } else {
    AppStore.stepRemovalModal.value = { ...AppStore.stepRemovalModal.value, visible: false };
  }
}

/**
 * Executes the removal of a step from the model.
 */
export async function executeStepRemoval(
  this: LegacyApp | void,
  stepIndex: number,
  mode: 'single' | 'all'
): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  if (!activeModel) return;

  const self = this;
  await StepService.executeStepRemoval(activeModel, stepIndex, mode, {
    onSuccess(result: ComputeResult) {
      if (legacyApp) {
        legacyApp.currentData = activeModel.data;
        legacyApp.columns = result.columns;
      } else {
        AppStore.currentData.value = activeModel.data;
        AppStore.columns.value = result.columns;
      }
      viewFinalResult.call(self);
    },
    onError(error: Error) {
      if (legacyApp?.showError) {
        legacyApp.showError('Error recomputing after removal', error.message);
      } else {
        showError('Error recomputing after removal', error.message);
      }
    },
  });
}

/**
 * Updates a step in the model with a new transform.
 */
export async function updateStep(
  this: LegacyApp | void,
  stepIndex: number,
  newTransform: TransformStep
): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const activeModel = legacyApp?.activeModel ?? AppStore.activeModel.value;

  if (!activeModel) return;

  const self = this;
  await StepService.updateStep(activeModel, stepIndex, newTransform, {
    onSuccess(result: ComputeResult) {
      if (legacyApp) {
        legacyApp.currentData = activeModel.data;
        legacyApp.columns = result.columns;
        legacyApp.editingStepIndex = null;
      } else {
        AppStore.currentData.value = activeModel.data;
        AppStore.columns.value = result.columns;
        AppStore.editingStepIndex.value = null;
      }
      viewFinalResult.call(self);
    },
    onError(error: Error, backup) {
      activeModel.steps = backup.steps;
      activeModel.data = backup.data;
      activeModel.schema = backup.schema;

      if (legacyApp) {
        legacyApp.currentData = activeModel.data;
        legacyApp.columns = activeModel.schema.map((c: ColumnSchema) => c.name);
        legacyApp.editingStepIndex = null;
        legacyApp.showError('Error updating step', error.message);
      } else {
        AppStore.currentData.value = activeModel.data;
        AppStore.columns.value = activeModel.schema.map((c: ColumnSchema) => c.name);
        AppStore.editingStepIndex.value = null;
        showError('Error updating step', error.message);
      }
    },
  });
}
