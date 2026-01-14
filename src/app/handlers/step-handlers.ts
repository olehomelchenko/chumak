import type { ChumakApp } from '../../chumak-app';
import * as aq from 'arquero';
import { applyTransform, describeTransform } from '../../core/transforms';
import { TransformResult } from '../../core/transform-result';
import { perfLogger } from '../../core/performance-logger';
import { autoSave } from '../../core/storage';
import { Model } from '../types';
import { ColumnSchema, TransformStep } from '../../core/schema-engine';
import { DialogStore } from '../stores/DialogStore';

export async function applyActiveTransform(this: ChumakApp) {
  switch (this.activeDialog) {
    case 'filter':
      await (this as any).applyFilterTransform();
      break;
    case 'sort':
      await (this as any).applySortTransform();
      break;
    case 'sliceRows':
      await (this as any).applySliceRowsTransform();
      break;
    case 'index':
      await (this as any).applyIndexTransform();
      break;
    case 'split':
      await (this as any).applySplitTransform();
      break;
    case 'derive':
      await (this as any).applyDeriveTransform();
      break;
    case 'regexpMatch':
      await (this as any).applyRegexpMatchTransform();
      break;
    case 'regexpExtract':
      await (this as any).applyRegexpExtractTransform();
      break;
    case 'date':
      await (this as any).applyDateTransform();
      break;
    case 'fold':
      await (this as any).applyFoldTransform();
      break;
    case 'pivot':
      await (this as any).applyPivotTransform();
      break;
    case 'aggregate':
      await (this as any).applyAggregateTransform();
      break;
    case 'join':
      await (this as any).applyJoinTransform();
      break;
    case 'replace':
      await (this as any).applyReplaceTransform();
      break;
    case 'dedupe':
      await (this as any).applyDedupeTransform();
      break;
    case 'column-editor':
      await (this as any).applyColumnEditorTransform();
      break;
    case 'import-csv':
      (this as any).confirmImport();
      break;
    case 'import-url':
      await (this as any).fetchAndImportFromUrl();
      break;
  }
}

export function computeModelUpToStep(this: ChumakApp, model: Model, stepIndex: number) {
  const start = performance.now();
  if (!model) throw new Error('No model provided');

  const source = this.sources.find((s) => s.id === model.sourceId);
  if (!source) throw new Error('Source not found for model');

  let table = aq.from(source.data);
  let schema = JSON.parse(JSON.stringify(source.columns)) as ColumnSchema[];
  let columns = schema.map((c: ColumnSchema) => c.name);

  for (let i = 0; i <= stepIndex; i++) {
    const step = model.steps[i];
    if (step.import) continue;

    try {
      const context = { sources: this.sources, models: this.models };
      table = applyTransform(table, step, columns, context);

      const stepResult = TransformResult.create(table, schema, step);
      schema = stepResult.schema;
      columns = stepResult.columns;
    } catch (error: any) {
      console.error(`Error applying step ${i}:`, error);
      const stepDescription = describeTransform(step);
      const enhancedError = new Error(
        `Step ${i + 1} failed: ${stepDescription}\n\n${error.message}`
      ) as any;
      enhancedError.stepIndex = i;
      enhancedError.stepDescription = stepDescription;
      throw enhancedError;
    }
  }

  const result = {
    data: table.objects() as any[],
    schema: schema,
    columns: columns,
  };

  const validation = TransformResult.validate(result);
  if (!validation.valid) {
    console.warn('computeModelUpToStep: Result validation warnings', validation.errors);
  }

  perfLogger.log(
    `Compute model '${model.name}' to step ${stepIndex + 1}`,
    source.data,
    result.data,
    performance.now() - start
  );
  return result;
}

export function computeUpToStep(this: ChumakApp, stepIndex: number) {
  return (this as any).computeModelUpToStep(this.activeModel, stepIndex);
}

export function viewStep(this: ChumakApp, stepIndex: number) {
  try {
    const result = (this as any).computeUpToStep(stepIndex);
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

export function viewFinalResult(this: ChumakApp) {
  if (!this.activeModel) return;
  this.currentData = this.activeModel.data;
  if (this.activeModel.schema && this.activeModel.schema.length > 0) {
    this.columns = this.activeModel.schema.map((c: any) => c.name);
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

export function editStep(this: ChumakApp, stepIndex: number) {
  if (!this.activeModel) return;
  const step = this.activeModel.steps[stepIndex];
  if (!step || step.import || step.types) return;

  this.editingStepIndex = stepIndex;

  if (step.filter) {
    DialogStore.openDialog('filter', {
      expression: step.filter as string,
    });
    this.openDialog('filter'); // Keep legacy side effects wrapper for now
  } else if (step.derive) {
    const [colName, expr] = Object.entries(step.derive)[0];
    DialogStore.openDialog('derive', {
      columnName: colName,
      expression: expr as string,
    });
    this.openDialog('derive'); // Legacy side effects wrapper
  } else if (step.select) {
    this.openDialog('column-editor');
    const selectedSet = new Set(step.select as string[]);
    this.columnEditorState = {
      mode: 'list',
      textSubMode: 'rename',
      columns: (step.select as string[])
        .map((col: string) => ({
          original: col,
          renamed: col,
          selected: true,
        }))
        .concat(
          this.columns
            .filter((c) => !selectedSet.has(c))
            .map((col) => ({
              original: col,
              renamed: col,
              selected: false,
            }))
        ),
      textValue: '',
      textError: null,
      patternText: '',
      patternMode: 'include',
      patternMatchType: 'prefix',
      draggedIndex: null,
    };
  } else if (step.rename) {
    this.openDialog('column-editor');
    this.columnEditorState = {
      mode: 'list',
      textSubMode: 'rename',
      columns: this.columns.map((col) => ({
        original: col,
        renamed: (step.rename && step.rename[col]) || col,
        selected: true,
      })),
      textValue: '',
      textError: null,
      patternText: '',
      patternMode: 'include',
      patternMatchType: 'prefix',
      draggedIndex: null,
    };
  } else if (step.remove) {
    this.openDialog('column-editor');
    const removedSet = new Set(step.remove as string[]);
    this.columnEditorState = {
      mode: 'list',
      textSubMode: 'rename',
      columns: this.columns.map((col) => ({
        original: col,
        renamed: col,
        selected: !removedSet.has(col),
      })),
      textValue: '',
      textError: null,
      patternText: '',
      patternMode: 'include',
      patternMatchType: 'prefix',
      draggedIndex: null,
    };
  } else if (step.sort) {
    DialogStore.openDialog('sort', {
      field: step.sort.field,
      order: step.sort.order,
    });
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
    this.aggregateDialogState = {
      groupBy: [...step.aggregate.groupby],
      aggregations,
      previewData: null,
      previewError: null,
      isPreviewing: false,
    };
  } else if (step.join) {
    this.openDialog('join');
    // We must manually populate the store for complex dialogs not fully covered by openDialog helper
    DialogStore.joinState.rightModel.value = step.join.right;
    DialogStore.joinState.joinType.value = step.join.how;
    DialogStore.joinState.keyPairs.value = step.join.on;
    DialogStore.joinState.suffixes.value = step.join.suffixes || ['_x', '_y'];
    // Trigger side effects
    this.onJoinTargetChange();
  } else if (step.fold) {
    this.openDialog('fold');
    this.foldDialogState = {
      keyName: step.fold.as[0],
      valueName: step.fold.as[1],
      selectedColumns: this.columns.map((c) => (step.fold ? step.fold.columns.includes(c) : false)),
      mode: 'fold',
    };
  } else if (step.pivot) {
    this.openDialog('pivot');
    this.pivotDialogState = {
      rowColumns: step.pivot.rows || [],
      columnColumn: step.pivot.keys,
      valueColumn: step.pivot.values,
      aggregation: step.pivot.aggregation || 'sum',
      options: {
        sort: step.pivot.options?.sort ?? true,
        limit: step.pivot.options?.limit || null,
      },
      uniqueValueCount: 0,
      previewData: null,
      previewError: null,
      isPreviewing: false,
    };
    this.onPivotConfigChange();
  } else if (step.replace) {
    this.openDialog('replace');
    this.replaceDialogState = {
      column: step.replace.column,
      findValue: step.replace.find,
      replaceValue: step.replace.replace,
    };
  } else if (step.split) {
    this.openDialog('split');
    this.splitDialogState = {
      column: step.split.column,
      delimiter: step.split.delimiter,
      isRegex: !!step.split.isRegex,
      mode: step.split.mode || 'spread',
      maxColumns: step.split.maxColumns || 10,
      keepOriginal: !!step.split.keepOriginal,
      error: null,
      previewData: [],
      previewColumns: [],
      autoDetectedDelimiter: null,
      columnRenames: {},
    };
    (this as any).updateSplitPreview();
  } else if (step.dedupe) {
    this.openDialog('dedupe');
    const dedupeColumns = step.dedupe.columns || [];
    this.dedupeDialogState = {
      useAllColumns: dedupeColumns.length === 0,
      selectedColumns: this.columns.map((c) => dedupeColumns.includes(c)),
      duplicateCount: 0,
      mode: step.dedupe.mode || 'remove',
    };
    (this as any).updateDedupePreview();
  }
}

export function cancelEdit(this: ChumakApp) {
  this.editingStepIndex = null;
  this.closeDialog(true);
}

export async function removeStep(this: ChumakApp, stepIndex: number) {
  if (!this.activeModel) return;
  if (this.activeModel.steps[stepIndex].import) {
    (this as any).showWarning('Cannot remove import step', 'The import step is required.');
    return;
  }

  const step = this.activeModel.steps[stepIndex];
  const isLastStep = stepIndex === this.activeModel.steps.length - 1;

  if (isLastStep) {
    if (!(await this.confirm(`Remove step "${describeTransform(step)}"?`))) return;
    await (this as any).executeStepRemoval(stepIndex, 'single');
  } else {
    const removeMode = await (this as any).showStepRemovalModal(stepIndex);
    if (!removeMode) return;
    await (this as any).executeStepRemoval(stepIndex, removeMode);
  }
}

export function showStepRemovalModal(
  this: ChumakApp,
  stepIndex: number
): Promise<'single' | 'all' | null> {
  if (!this.activeModel) return Promise.resolve(null);
  const step = this.activeModel.steps[stepIndex];
  const affectedSteps = this.activeModel.steps
    .slice(stepIndex + 1)
    .map((s: TransformStep) => describeTransform(s));

  return new Promise((resolve) => {
    (this as any).stepRemovalModal = {
      visible: true,
      stepIndex,
      stepName: describeTransform(step),
      affectedSteps,
      removeMode: 'all',
      resolve,
    };
  });
}

export function closeStepRemovalModal(this: ChumakApp, confirmed: boolean) {
  if (this.stepRemovalModal.resolve) {
    this.stepRemovalModal.resolve(confirmed ? this.stepRemovalModal.removeMode : null);
  }
  this.stepRemovalModal.visible = false;
}

export async function executeStepRemoval(
  this: ChumakApp,
  stepIndex: number,
  mode: 'single' | 'all'
) {
  try {
    if (!this.activeModel) return;
    if (mode === 'all') {
      this.activeModel.steps.splice(stepIndex);
    } else {
      this.activeModel.steps.splice(stepIndex, 1);
    }
    this.activeModel.steps = [...this.activeModel.steps];

    const result = (this as any).computeUpToStep(this.activeModel.steps.length - 1);
    this.activeModel.data = JSON.parse(JSON.stringify(result.data));
    this.activeModel.schema = result.schema;
    this.currentData = this.activeModel.data;
    this.columns = result.columns;

    this.viewFinalResult();
    await autoSave(this.sources, this.models);
  } catch (error: any) {
    (this as any).showError('Error recomputing after removal', error.message);
  }
}

export async function updateStep(this: ChumakApp, stepIndex: number, newTransform: any) {
  if (!this.activeModel) return;
  const backup = {
    steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
    data: JSON.parse(JSON.stringify(this.activeModel.data)),
    schema: JSON.parse(JSON.stringify(this.activeModel.schema)),
  };

  try {
    this.activeModel.steps[stepIndex] = newTransform;
    this.activeModel.steps = [...this.activeModel.steps];

    const result = (this as any).computeUpToStep(this.activeModel.steps.length - 1);
    this.activeModel.data = JSON.parse(JSON.stringify(result.data));
    this.activeModel.schema = result.schema;
    this.currentData = this.activeModel.data;
    this.columns = result.columns;

    this.viewFinalResult();
    await autoSave(this.sources, this.models);
    this.editingStepIndex = null;
  } catch (error: any) {
    this.activeModel.steps = backup.steps;
    this.activeModel.data = backup.data;
    this.activeModel.schema = backup.schema;
    this.currentData = this.activeModel.data;
    this.columns = this.activeModel.schema.map((c: ColumnSchema) => c.name);
    this.editingStepIndex = null;
    (this as any).showError('Error updating step', error.message);
  }
}
