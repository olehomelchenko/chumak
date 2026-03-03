import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { DependencyService } from '../../services/DependencyService';
import { getColumnsForTarget, getTableDataForTarget } from './join-handlers';
import i18n from '../../../i18n';

export function initializeAppendDialog() {
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;
  const activeModel = AppStore.activeModel.value;
  const activeSource = AppStore.activeSource.value;

  // Reset store state
  const state = DialogStore.appendState;

  // Set left model
  const leftModelId = activeModel?.id || activeSource?.id || null;
  state.leftModel.value = leftModelId;
  if (leftModelId) {
    state.leftColumns.value = getColumnsForTarget(leftModelId);
    state.selectedLeftColumns.value = [...state.leftColumns.value];
  }

  // Set initial right model (first available model or source that is not the active one)
  let initialTargetModel: string | null = null;
  const firstModel = models.find((m) => (activeModel ? m.id !== activeModel.id : true));
  if (firstModel) {
    initialTargetModel = firstModel.id;
  } else if (sources.length > 0) {
    initialTargetModel = sources[0].id;
  }

  state.targetModel.value = initialTargetModel;

  if (initialTargetModel) {
    state.rightColumns.value = getColumnsForTarget(initialTargetModel);
    state.selectedRightColumns.value = [...state.rightColumns.value];
  }

  state.removeDuplicates.value = false; // Default to Concat
  state.previewData.value = null;
  state.previewError.value = null;
  state.isPreviewing.value = false;
  state.previewTableId.value = null;

  AppStore.activeDialog.value = 'append';
}

export function onAppendLeftModelChange() {
  const state = DialogStore.appendState;
  const leftModelId = state.leftModel.value;
  if (leftModelId) {
    state.leftColumns.value = getColumnsForTarget(leftModelId);
    state.selectedLeftColumns.value = [...state.leftColumns.value];
  } else {
    state.leftColumns.value = [];
    state.selectedLeftColumns.value = [];
  }
  onAppendConfigChange();
}

export function onAppendTargetChange() {
  const state = DialogStore.appendState;
  const targetId = state.targetModel.value;
  if (targetId) {
    state.rightColumns.value = getColumnsForTarget(targetId);
    state.selectedRightColumns.value = [...state.rightColumns.value];
  } else {
    state.rightColumns.value = [];
    state.selectedRightColumns.value = [];
  }
  onAppendConfigChange();
}

export function onAppendConfigChange() {
  const state = DialogStore.appendState;
  state.previewData.value = null;
  state.previewError.value = null;
}

/**
 * Checks if adding an append/join reference would create a circular dependency
 */
export function checkCircularDependency(targetId: string): { isCyclic: boolean; message?: string } {
  const activeModel = AppStore.activeModel.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  return DependencyService.checkCircularDependency(
    models,
    sources,
    activeModel?.id || null,
    targetId
  );
}

export async function previewAppend() {
  const state = DialogStore.appendState;
  const leftId = state.leftModel.value;
  const targetId = state.targetModel.value;
  const removeDuplicates = state.removeDuplicates.value;
  const selectedLeftColumns = state.selectedLeftColumns.value;
  const selectedRightColumns = state.selectedRightColumns.value;

  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  if (!leftId) {
    state.previewError.value = i18n.t('validation.selection.leftTable', { ns: 'errors' });
    return;
  }
  if (!targetId) {
    state.previewError.value = i18n.t('validation.selection.rightTable', { ns: 'errors' });
    return;
  }

  // Cycle check
  const cycleResult = checkCircularDependency(targetId);
  if (cycleResult.isCyclic) {
    state.previewError.value =
      cycleResult.message || i18n.t('system.circularDependency', { ns: 'errors' });
    return;
  }

  state.isPreviewing.value = true;
  state.previewError.value = null;
  state.previewData.value = null;

  try {
    const leftTableData = getTableDataForTarget(leftId);
    const targetTableData = getTableDataForTarget(targetId);

    // Ensure target model in context has computed data for applyTransform
    const targetModel = models.find((m) => m.id === targetId);
    if (targetModel) {
      targetModel.data = targetTableData.data;
    }

    const transform = removeDuplicates
      ? {
          union: {
            with: targetId,
            columns: selectedLeftColumns,
            targetColumns: selectedRightColumns,
          },
        }
      : {
          concat: {
            with: targetId,
            columns: selectedLeftColumns,
            targetColumns: selectedRightColumns,
          },
        };

    const table = aq.from(leftTableData.data);
    const context = { sources, models };

    // Result schema estimation for promotion
    const dummyColumns = [...new Set([...selectedLeftColumns, ...selectedRightColumns])];

    const result = applyTransform(table, transform, dummyColumns, context);
    const allData = result.objects();

    state.previewData.value = {
      rows: allData.slice(0, 100),
      totalRows: allData.length,
      columns: result.columnNames(),
    };
  } catch (error: any) {
    console.error('Append preview error:', error);
    state.previewError.value = error.message;
  } finally {
    state.isPreviewing.value = false;
  }
}

export async function applyAppendTransform(callbacks: any) {
  const state = DialogStore.appendState;
  const leftId = state.leftModel.value;
  const targetId = state.targetModel.value;
  const removeDuplicates = state.removeDuplicates.value;
  const selectedLeftColumns = state.selectedLeftColumns.value;
  const selectedRightColumns = state.selectedRightColumns.value;

  if (!leftId) {
    await callbacks.onError?.(i18n.t('validation.selection.leftTable', { ns: 'errors' }));
    return;
  }
  if (!targetId) {
    await callbacks.onError?.(i18n.t('validation.selection.rightTable', { ns: 'errors' }));
    return;
  }

  // Cycle check
  const cycleResult = checkCircularDependency(targetId);
  if (cycleResult.isCyclic) {
    await callbacks.onError?.(
      cycleResult.message || i18n.t('system.circularDependency', { ns: 'errors' })
    );
    return;
  }

  try {
    const transform = removeDuplicates
      ? {
          union: {
            with: targetId,
            columns: selectedLeftColumns,
            targetColumns: selectedRightColumns,
          },
        }
      : {
          concat: {
            with: targetId,
            columns: selectedLeftColumns,
            targetColumns: selectedRightColumns,
          },
        };

    await StepService.runTransform(removeDuplicates ? 'Union' : 'Concat', transform, callbacks);
  } catch (error: any) {
    console.error('Append transform setup error:', error);
    await callbacks.onError?.(
      i18n.t('transform.appendFailed', { ns: 'errors', message: error.message })
    );
  }
}
