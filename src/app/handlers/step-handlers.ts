import type { ChumakApp } from '../../chumak-app';
import { describeTransform } from '../../core/transforms';
import { Model } from '../types';
import { ColumnSchema, TransformStep } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';
import { StepService, ComputeResult } from '../services/StepService';
import type { PivotAggregation } from '../components/PivotDialog';
import * as ColumnEditorHandlers from './column-editor-handlers';
import * as DateHandlers from './date-handlers';
import * as HelperHandlers from './helper-handlers';
import * as PatternHandlers from './pattern-handlers';

/**
 * Dispatches transform application based on the active dialog.
 * Each case calls the corresponding method on ChumakApp directly.
 */
export async function applyActiveTransform(this: ChumakApp) {
  switch (this.activeDialog) {
    case 'filter':
      await this.applyFilterTransform();
      break;
    case 'sort':
      await this.applySortTransform();
      break;
    case 'sliceRows':
      await this.applySliceRowsTransform();
      break;
    case 'index':
      await this.applyIndexTransform();
      break;
    case 'split':
      await this.applySplitTransform();
      break;
    case 'derive':
      await this.applyDeriveTransform();
      break;
    case 'regexpMatch':
      await this.applyRegexpMatchTransform();
      break;
    case 'regexpExtract':
      await this.applyRegexpExtractTransform();
      break;
    case 'date':
      await DateHandlers.applyDateTransform(HelperHandlers.createExecutionCallbacks(this));
      break;
    case 'fold':
      await this.applyFoldTransform();
      break;
    case 'pivot':
      await this.applyPivotTransform();
      break;
    case 'aggregate':
      await this.applyAggregateTransform();
      break;
    case 'join':
      await this.applyJoinTransform();
      break;
    case 'replace':
      await this.applyReplaceTransform();
      break;
    case 'dedupe':
      await this.applyDedupeTransform();
      break;
    case 'impute':
      await this.applyImputeTransform();
      break;
    case 'selectPattern':
      await PatternHandlers.applySelectPatternTransform(
        HelperHandlers.createExecutionCallbacks(this)
      );
      break;
    case 'removePattern':
      await PatternHandlers.applyRemovePatternTransform(
        HelperHandlers.createExecutionCallbacks(this)
      );
      break;
    case 'conditional':
      await PatternHandlers.applyConditionalTransform(
        HelperHandlers.createExecutionCallbacks(this)
      );
      break;
    case 'renamePattern':
      await PatternHandlers.applyRenamePatternTransform(
        HelperHandlers.createExecutionCallbacks(this)
      );
      break;
    case 'column-editor':
      await ColumnEditorHandlers.applyColumnEditorTransform({
        onDialogClose: (force: boolean) => this.closeDialog(force),
        runTransform: (name: string, config: any, callbacks: any) =>
          this.runTransform(name, config, callbacks),
      });
      break;
    case 'import-csv':
      this.confirmImport();
      break;
    case 'import-url':
      await this.fetchAndImportFromUrl();
      break;
  }
}

/**
 * Computes a model's data up to a specific step.
 * Delegates to StepService for the actual computation.
 */
export function computeModelUpToStep(this: ChumakApp, model: Model, stepIndex: number) {
  return StepService.computeModelUpToStep(model, stepIndex, {
    sources: this.sources,
    models: this.models,
  });
}

/**
 * Computes the active model up to a specific step.
 */
export function computeUpToStep(this: ChumakApp, stepIndex: number) {
  if (!this.activeModel) throw new Error('No active model');
  return this.computeModelUpToStep(this.activeModel, stepIndex);
}

/**
 * Views the result at a specific step index.
 */
export function viewStep(this: ChumakApp, stepIndex: number) {
  try {
    const result = this.computeUpToStep(stepIndex);
    this.currentData = result.data;
    this.columns = result.columns;
    this.viewingSchema = result.schema;
    this.activeStepIndex = stepIndex;
    if (this.activeModel) {
      this.viewingIntermediate = stepIndex < this.activeModel.steps.length - 1;
    }
    this.updatePagination();
  } catch (error: any) {
    console.error('Error computing step:', error);
    this.showError('Error viewing step', `Step ${stepIndex + 1}: ${error.message}`, {
      stepIndex: error.stepIndex ?? stepIndex,
      stepDescription: error.stepDescription,
    });
  }
}

/**
 * Views the final result of the active model.
 */
export function viewFinalResult(this: ChumakApp) {
  if (!this.activeModel) return;
  this.currentData = this.activeModel.data;
  if (this.activeModel.schema && this.activeModel.schema.length > 0) {
    this.columns = this.activeModel.schema.map((c: ColumnSchema) => c.name);
  } else if (this.currentData && this.currentData.length > 0) {
    this.columns = Object.keys(this.currentData[0]);
  } else {
    this.columns = [];
  }
  this.activeStepIndex =
    this.activeModel.steps?.length > 0 ? this.activeModel.steps.length - 1 : null;
  this.viewingIntermediate = false;
  this.viewingSchema = null;
  this.updatePagination();
}

/**
 * Opens a dialog to edit an existing step.
 */
export function editStep(this: ChumakApp, stepIndex: number) {
  if (!this.activeModel) return;
  const step = this.activeModel.steps[stepIndex];
  if (!step || step.import || step.types) return;

  this.editingStepIndex = stepIndex;

  if (step.filter) {
    this.openDialog('filter');
    DialogStore.filterState.expression.value = step.filter as string;
  } else if (step.derive) {
    const [colName, expr] = Object.entries(step.derive)[0];
    this.openDialog('derive');
    DialogStore.deriveState.columnName.value = colName;
    DialogStore.deriveState.expression.value = expr as string;
  } else if (step.select) {
    this.openDialog('column-editor');
    const selectedSet = new Set(step.select as string[]);
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';

    // Build union of current columns and selected columns to preserve order but show missing ones
    const currentCols = this.columns;
    const allUniqueCols = Array.from(new Set([...(step.select as string[]), ...currentCols]));

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
    this.openDialog('column-editor');
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';
    const renames = step.rename || {};
    state.columns.value = this.columns.map((col) => ({
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
    this.openDialog('column-editor');
    const removedSet = new Set(step.remove as string[]);
    const state = DialogStore.columnEditorState;
    state.mode.value = 'list';
    state.textSubMode.value = 'rename';
    state.columns.value = this.columns.map((col) => ({
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
    this.openDialog('sort');
    DialogStore.sortState.field.value = step.sort.field;
    DialogStore.sortState.order.value = step.sort.order;
  } else if (step.aggregate) {
    this.openDialog('aggregate');
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
    this.openDialog('join');
    DialogStore.joinState.rightModel.value = step.join.right;
    DialogStore.joinState.joinType.value = step.join.how;
    DialogStore.joinState.keyPairs.value = step.join.on;
    DialogStore.joinState.suffixes.value = step.join.suffixes || ['_x', '_y'];
    this.onJoinTargetChange();
  } else if (step.fold) {
    this.openDialog('fold');
    const state = DialogStore.foldState;
    state.keyName.value = step.fold.as[0];
    state.valueName.value = step.fold.as[1];
    state.selectedColumns.value = this.columns.map((c) =>
      step.fold ? step.fold.columns.includes(c) : false
    );
    state.mode.value = 'fold';
  } else if (step.pivot) {
    this.openDialog('pivot');
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
    this.onPivotConfigChange();
  } else if (step.replace) {
    this.openDialog('replace');
    const state = DialogStore.replaceState;
    state.column.value = step.replace.column;
    state.findValue.value = step.replace.find;
    state.replaceValue.value = step.replace.replace;
  } else if (step.split) {
    this.openDialog('split');
    const state = DialogStore.splitState;
    state.column.value = step.split.column;
    state.delimiter.value = step.split.delimiter;
    state.isRegex.value = !!step.split.isRegex;
    state.mode.value = step.split.mode || 'spread';
    state.maxColumns.value = step.split.maxColumns || 10;
    state.keepOriginal.value = !!step.split.keepOriginal;
    state.error.value = null;

    if (typeof this.updateSplitPreview === 'function') {
      this.updateSplitPreview();
    }
  } else if (step.dedupe) {
    this.openDialog('dedupe');
    const dedupeColumns = step.dedupe.columns || [];
    const state = DialogStore.dedupeState;
    state.useAllColumns.value = dedupeColumns.length === 0;
    state.selectedColumns.value = this.columns.map((c) => dedupeColumns.includes(c));
    state.duplicateCount.value = 0;
    state.mode.value = step.dedupe.mode || 'remove';

    if (typeof this.updateDedupePreview === 'function') {
      this.updateDedupePreview();
    }
  } else if (step.impute) {
    this.openDialog('impute');
    const state = DialogStore.imputeState;
    state.column.value = step.impute.column;
    state.strategy.value = step.impute.strategy;
    state.value.value = step.impute.value || '';
  }
}

/**
 * Cancels the current edit operation.
 */
export function cancelEdit(this: ChumakApp) {
  this.editingStepIndex = null;
  this.closeDialog(true);
}

/**
 * Removes a step from the active model.
 */
export async function removeStep(this: ChumakApp, stepIndex: number) {
  if (!this.activeModel) return;
  if (this.activeModel.steps[stepIndex].import) {
    this.showWarning('Cannot remove import step', 'The import step is required.');
    return;
  }

  const step = this.activeModel.steps[stepIndex];
  const isLastStep = stepIndex === this.activeModel.steps.length - 1;

  if (isLastStep) {
    if (!(await this.confirm(`Remove step "${describeTransform(step)}"?`))) return;
    await this.executeStepRemoval(stepIndex, 'single');
  } else {
    const removeMode = await this.showStepRemovalModal(stepIndex);
    if (!removeMode) return;
    await this.executeStepRemoval(stepIndex, removeMode);
  }
}

/**
 * Shows a modal for choosing how to remove a step (single vs cascade).
 */
export function showStepRemovalModal(
  this: ChumakApp,
  stepIndex: number
): Promise<'single' | 'all' | null> {
  if (!this.activeModel) return Promise.resolve(null);

  const info = StepService.getStepRemovalInfo(this.activeModel, stepIndex);

  return new Promise((resolve) => {
    this.stepRemovalModal = {
      visible: true,
      stepIndex: info.stepIndex,
      stepName: info.stepName,
      affectedSteps: info.affectedSteps,
      removeMode: 'all',
      resolve,
    };
  });
}

/**
 * Closes the step removal modal.
 */
export function closeStepRemovalModal(this: ChumakApp, confirmed: boolean) {
  if (this.stepRemovalModal.resolve) {
    this.stepRemovalModal.resolve(confirmed ? this.stepRemovalModal.removeMode : null);
  }
  this.stepRemovalModal.visible = false;
}

/**
 * Executes the removal of a step from the model.
 */
export async function executeStepRemoval(
  this: ChumakApp,
  stepIndex: number,
  mode: 'single' | 'all'
) {
  if (!this.activeModel) return;

  const self = this;
  await StepService.executeStepRemoval(this.activeModel, stepIndex, mode, {
    onSuccess(result: ComputeResult) {
      self.currentData = self.activeModel!.data;
      self.columns = result.columns;
      self.viewFinalResult();
    },
    onError(error: Error) {
      self.showError('Error recomputing after removal', error.message);
    },
  });
}

/**
 * Updates a step in the model with a new transform.
 */
export async function updateStep(this: ChumakApp, stepIndex: number, newTransform: TransformStep) {
  if (!this.activeModel) return;

  const self = this;
  await StepService.updateStep(this.activeModel, stepIndex, newTransform, {
    onSuccess(result: ComputeResult) {
      self.currentData = self.activeModel!.data;
      self.columns = result.columns;
      self.viewFinalResult();
      self.editingStepIndex = null;
    },
    onError(error: Error, backup) {
      self.activeModel!.steps = backup.steps;
      self.activeModel!.data = backup.data;
      self.activeModel!.schema = backup.schema;
      self.currentData = self.activeModel!.data;
      self.columns = self.activeModel!.schema.map((c: ColumnSchema) => c.name);
      self.editingStepIndex = null;
      self.showError('Error updating step', error.message);
    },
  });
}
