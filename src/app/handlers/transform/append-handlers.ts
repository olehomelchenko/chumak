import * as aq from 'arquero';
import type { Signal } from '@preact/signals';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { DependencyService } from '../../services/DependencyService';
import { getTableDataForTarget } from './join-handlers';
import i18n from '../../../i18n';

export interface AppendDialogState {
  leftModel: Signal<string | null>;
  targetModel: Signal<string | null>;
  leftColumns: Signal<string[]>;
  rightColumns: Signal<string[]>;
  selectedLeftColumns: Signal<string[]>;
  selectedRightColumns: Signal<string[]>;
  removeDuplicates: Signal<boolean>;
  previewData: Signal<any | null>;
  previewError: Signal<string | null>;
  isPreviewing: Signal<boolean>;
  previewTableId: Signal<string | null>;
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

export async function previewAppend(state: AppendDialogState) {
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
    const leftTableData = await getTableDataForTarget(leftId);
    const targetTableData = await getTableDataForTarget(targetId);

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
  const state = DialogStore.activeDialogState.value;
  if (!state) return;

  const leftId = state.leftModel as string | null;
  const targetId = state.targetModel as string | null;
  const removeDuplicates = state.removeDuplicates as boolean;
  const selectedLeftColumns = state.selectedLeftColumns as string[];
  const selectedRightColumns = state.selectedRightColumns as string[];

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
