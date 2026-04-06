import { describeTransform } from '../../../core/transforms';
import { Model } from '../../types';
import { ColumnSchema, TransformStep } from '../../../core/schema-engine';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService, ComputeResult } from '../../services/StepService';
import * as HelperHandlers from './helper-handlers';
import { showError, showWarning, showSuccess, confirm } from './notification-handlers';
import { getDialogConfig } from '../../dialog-registry';
import i18n from '../../../i18n';

/**
 * Callbacks for step operations.
 * Transform apply handlers are registered in dialog-registry.ts.
 */
export type StepCallbacks = {
  updatePagination: () => void;
  openDialog: (name: string, section?: string) => void;
  closeDialog: (force?: boolean) => void;
  onJoinTargetChange: () => void;
  onAppendTargetChange: () => void;
  // Non-transform operations (import, generate)
  confirmImport: () => void;
  confirmTextEntry: () => void;
  fetchAndImportFromUrl: () => Promise<void>;
  generateData: () => Promise<void>;
};

let callbacks: StepCallbacks | null = null;

/**
 * Set step callbacks for store-based operations
 */
export function setStepCallbacks(cb: StepCallbacks): void {
  callbacks = cb;
}

/**
 * Dispatches transform application based on the active dialog.
 * Looks up the apply handler from the dialog registry.
 */
export async function applyActiveTransform(): Promise<void> {
  const activeDialog = AppStore.activeDialog.value;

  // Non-transform dialogs that require special handling
  switch (activeDialog) {
    case 'import-csv':
      callbacks?.confirmImport();
      return;
    case 'import-url':
      await callbacks?.fetchAndImportFromUrl();
      return;
    case 'import-text':
      callbacks?.confirmTextEntry();
      return;
    case 'generate':
      await callbacks?.generateData();
      return;
  }

  // Registry-driven dispatch for all transform dialogs
  const config = getDialogConfig(activeDialog);
  if (config?.applyHandler) {
    await config.applyHandler(HelperHandlers.createExecutionCallbacks());
  }
}

/**
 * Computes a model's data up to a specific step.
 * Delegates to StepService for the actual computation.
 */
export function computeModelUpToStep(model: Model, stepIndex: number): ComputeResult {
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;

  return StepService.computeModelUpToStep(model, stepIndex, {
    sources,
    models,
  });
}

/**
 * Computes the active model up to a specific step.
 */
export function computeUpToStep(stepIndex: number): ComputeResult {
  const activeModel = AppStore.activeModel.value;

  if (!activeModel) throw new Error('No active model');
  return computeModelUpToStep(activeModel, stepIndex);
}

/**
 * Views the result at a specific step index.
 */
export function viewStep(stepIndex: number): void {
  const activeModel = AppStore.activeModel.value;

  try {
    const result = computeUpToStep(stepIndex);

    AppStore.currentData.value = result.data;
    AppStore.columns.value = result.columns;
    AppStore.viewingSchema.value = result.schema;
    AppStore.activeStepIndex.value = stepIndex;
    if (activeModel) {
      AppStore.viewingIntermediate.value = stepIndex < activeModel.steps.length - 1;
    }

    callbacks?.updatePagination();
  } catch (error: any) {
    console.error('Error computing step:', error);
    showError(
      i18n.t('system.stepViewError', { ns: 'errors' }),
      `Step ${stepIndex + 1}: ${error.message}`,
      {
        stepIndex: error.stepIndex ?? stepIndex,
        stepDescription: error.stepDescription,
      }
    );
  }
}

/**
 * Views the final result of the active model.
 */
export function viewFinalResult(): void {
  const activeModel = AppStore.activeModel.value;

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

  AppStore.currentData.value = data;
  AppStore.columns.value = columns;
  AppStore.activeStepIndex.value = stepIndex;
  AppStore.viewingIntermediate.value = false;
  AppStore.viewingSchema.value = null;

  callbacks?.updatePagination();
}

/**
 * Opens a dialog to edit an existing step.
 */
export function editStep(stepIndex: number): void {
  const activeModel = AppStore.activeModel.value;

  if (!activeModel) return;
  const step = activeModel.steps[stepIndex];
  if (!step || step.import || step.types) return;

  AppStore.editingStepIndex.value = stepIndex;

  if (step.filter) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('filter');
  } else if (step.derive) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('derive');
  } else if (step.select) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('column-editor');
  } else if (step.rename) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('column-editor');
  } else if (step.remove) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('column-editor');
  } else if (step.sort) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('sort');
  } else if (step.sample) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('sample');
  } else if (step.aggregate) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('aggregate');
  } else if (step.join) {
    callbacks?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.join.right;
    DialogStore.joinState.joinType.value = step.join.how;
    DialogStore.joinState.keyPairs.value = step.join.on;
    DialogStore.joinState.suffixes.value = step.join.suffixes || ['_x', '_y'];
    callbacks?.onJoinTargetChange();
  } else if (step.semijoin) {
    callbacks?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.semijoin.right;
    DialogStore.joinState.joinType.value = 'semi';
    DialogStore.joinState.keyPairs.value = step.semijoin.on;
    callbacks?.onJoinTargetChange();
  } else if (step.antijoin) {
    callbacks?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.antijoin.right;
    DialogStore.joinState.joinType.value = 'anti';
    DialogStore.joinState.keyPairs.value = step.antijoin.on;
    callbacks?.onJoinTargetChange();
  } else if (step.lookup) {
    callbacks?.openDialog('join');
    DialogStore.joinState.rightModel.value = step.lookup.right;
    DialogStore.joinState.joinType.value = 'lookup';
    DialogStore.joinState.keyPairs.value = step.lookup.on;
    DialogStore.joinState.selectedRightColumns.value = step.lookup.values;
    callbacks?.onJoinTargetChange();
  } else if (step.fold) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('fold');
  } else if (step.pivot) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('pivot');
  } else if (step.replace) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('replace');
  } else if (step.split) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('split');
  } else if (step.dedupe) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('dedupe');
  } else if (step.impute) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('impute');
  } else if (step.concat) {
    callbacks?.openDialog('append');
    DialogStore.appendState.targetModel.value = step.concat.with;
    DialogStore.appendState.removeDuplicates.value = false;
    DialogStore.appendState.selectedLeftColumns.value = step.concat.columns || [];
    DialogStore.appendState.selectedRightColumns.value = step.concat.targetColumns || [];
    callbacks?.onAppendTargetChange();
  } else if (step.union) {
    callbacks?.openDialog('append');
    DialogStore.appendState.targetModel.value = step.union.with;
    DialogStore.appendState.removeDuplicates.value = true;
    DialogStore.appendState.selectedLeftColumns.value = step.union.columns || [];
    DialogStore.appendState.selectedRightColumns.value = step.union.targetColumns || [];
    callbacks?.onAppendTargetChange();
  } else if (step.window) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('window');
  } else if (step.sliceRows) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('sliceRows');
  } else if (step.addIndex) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('index');
  } else if (step.promoteHeader) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('promoteHeader');
  } else if (step.spread) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('spread');
  } else if (step.unroll) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('unroll');
  } else if (step.selectPattern) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('selectPattern');
  } else if (step.removePattern) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('removePattern');
  } else if (step.renamePattern) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('renamePattern');
  } else if (step.conditional) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('conditional');
  } else if (step.describe) {
    // State initialized by useDialogState hook via editingStep context
    callbacks?.openDialog('describe');
  }
}

/**
 * Cancels the current edit operation.
 */
export function cancelEdit(): void {
  AppStore.editingStepIndex.value = null;
  callbacks?.closeDialog(true);
}

/**
 * Removes a step from the active model.
 */
export async function removeStep(stepIndex: number): Promise<void> {
  const activeModel = AppStore.activeModel.value;

  if (!activeModel) return;
  if (activeModel.steps[stepIndex].import) {
    showWarning(
      i18n.t('system.cannotRemoveImport', { ns: 'errors' }),
      i18n.t('system.importStepRequired', { ns: 'errors' })
    );
    return;
  }

  const step = activeModel.steps[stepIndex];
  const isLastStep = stepIndex === activeModel.steps.length - 1;

  if (isLastStep) {
    const confirmed = await confirm(
      i18n.t('confirms.removeStep', { ns: 'common', name: describeTransform(step) }),
      undefined,
      i18n.t('buttons.remove', { ns: 'common' })
    );
    if (!confirmed) return;
    await executeStepRemoval(stepIndex, 'single');
  } else {
    const removeMode = await showStepRemovalModal(stepIndex);
    if (!removeMode) return;
    await executeStepRemoval(stepIndex, removeMode);
  }
}

/**
 * Shows a modal for choosing how to remove a step (single vs cascade).
 */
export function showStepRemovalModal(stepIndex: number): Promise<'single' | 'all' | null> {
  const activeModel = AppStore.activeModel.value;

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

    AppStore.stepRemovalModal.value = modalState;
  });
}

/**
 * Closes the step removal modal.
 */
export function closeStepRemovalModal(confirmed: boolean): void {
  const modal = AppStore.stepRemovalModal.value;

  if (modal.resolve) {
    modal.resolve(confirmed ? modal.removeMode : null);
  }

  AppStore.stepRemovalModal.value = { ...AppStore.stepRemovalModal.value, visible: false };
}

/**
 * Executes the removal of a step from the model.
 */
export async function executeStepRemoval(stepIndex: number, mode: 'single' | 'all'): Promise<void> {
  const activeModel = AppStore.activeModel.value;

  if (!activeModel) return;

  await StepService.executeStepRemoval(activeModel, stepIndex, mode, {
    onSuccess(result: ComputeResult) {
      AppStore.currentData.value = activeModel.data;
      AppStore.columns.value = result.columns;
      viewFinalResult();
    },
    onError(error: Error) {
      showError(i18n.t('system.stepRemoveError', { ns: 'errors' }), error.message);
    },
  });
}

/**
 * Updates a step in the model with a new transform.
 */
export async function updateStep(stepIndex: number, newTransform: TransformStep): Promise<void> {
  const activeModel = AppStore.activeModel.value;

  if (!activeModel) return;

  await StepService.updateStep(activeModel, stepIndex, newTransform, {
    onSuccess(result: ComputeResult) {
      AppStore.currentData.value = activeModel.data;
      AppStore.columns.value = result.columns;
      AppStore.editingStepIndex.value = null;
      viewFinalResult();
    },
    onError(error: Error, backup) {
      activeModel.steps = backup.steps;
      activeModel.data = backup.data;
      activeModel.schema = backup.schema;

      AppStore.currentData.value = activeModel.data;
      AppStore.columns.value = activeModel.schema.map((c: ColumnSchema) => c.name);
      AppStore.editingStepIndex.value = null;
      showError(i18n.t('system.stepUpdateError', { ns: 'errors' }), error.message);
    },
  });
}

/**
 * Undoes the last pipeline operation on the active model.
 */
export async function undo(): Promise<void> {
  const activeModel = AppStore.activeModel.value;
  if (!activeModel) return;
  if (!StepService.canUndo(activeModel.id)) return;

  const description = await StepService.undo(activeModel, {
    onSuccess(result: ComputeResult) {
      AppStore.currentData.value = activeModel.data;
      AppStore.columns.value = result.columns;
      viewFinalResult();
    },
    onError(error: Error) {
      showError(i18n.t('system.undoFailed', { ns: 'errors' }), error.message);
    },
  });

  if (description) {
    showSuccess(i18n.t('notifications.undone', { ns: 'common', description }));
  }
}

/**
 * Redoes the last undone pipeline operation on the active model.
 */
export async function redo(): Promise<void> {
  const activeModel = AppStore.activeModel.value;
  if (!activeModel) return;
  if (!StepService.canRedo(activeModel.id)) return;

  const description = await StepService.redo(activeModel, {
    onSuccess(result: ComputeResult) {
      AppStore.currentData.value = activeModel.data;
      AppStore.columns.value = result.columns;
      viewFinalResult();
    },
    onError(error: Error) {
      showError(i18n.t('system.redoFailed', { ns: 'errors' }), error.message);
    },
  });

  if (description) {
    showSuccess(i18n.t('notifications.redone', { ns: 'common', description }));
  }
}
