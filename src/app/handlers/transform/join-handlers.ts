import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { DependencyService } from '../../services/DependencyService';
import { NameService } from '../../services/NameService';
import { prompt } from '../core/notification-handlers';
import { cloneData } from '../../../core/type-converter';
import { ensureSourceData, ensureModelData } from '../../infrastructure/storage';
import i18n from '../../../i18n';
import { TransformStep } from '../../../core/schema-engine';

/**
 * Finds columns with identical names between left and right tables.
 * Returns pairs sorted by position in the left table.
 */
function findMatchingColumns(leftColumns: string[], rightColumns: string[]): [string, string][] {
  const rightSet = new Set(rightColumns);
  return leftColumns.filter((col) => rightSet.has(col)).map((col) => [col, col]);
}

/**
 * Preserves valid key pairs after a table change, then auto-matches remaining columns.
 * Invalid keys (columns no longer present in the changed table) are nulled out;
 * pairs that are entirely empty are dropped; unmatched columns are auto-paired.
 */
function reconcileKeyPairs(
  currentPairs: (string | null)[][],
  leftColumns: string[],
  rightColumns: string[],
  changedSide: 'left' | 'right'
): (string | null)[][] {
  const validCols = new Set(changedSide === 'left' ? leftColumns : rightColumns);

  const preserved = currentPairs
    .map((pair) => {
      const idx = changedSide === 'left' ? 0 : 1;
      const updated = [...pair] as (string | null)[];
      if (!validCols.has(updated[idx]!)) updated[idx] = null;
      return updated;
    })
    .filter((pair) => pair[0] || pair[1]);

  const usedLeft = new Set(preserved.map((p) => p[0]).filter(Boolean));
  const usedRight = new Set(preserved.map((p) => p[1]).filter(Boolean));
  const autoMatched = findMatchingColumns(leftColumns, rightColumns).filter(
    ([l, r]) => !usedLeft.has(l) && !usedRight.has(r)
  );

  const combined = [...preserved, ...autoMatched];
  return combined.length > 0 ? combined : [[null, null]];
}

/**
 * Builds a join/semijoin/antijoin/lookup transform step from dialog state.
 */
function buildJoinTransform(
  joinType: string,
  rightModel: string,
  keyPairs: (string | null)[][],
  suffixes: [string, string],
  selectedRightColumns: string[]
): TransformStep {
  const completePairs = keyPairs.filter((pair) => pair[0] && pair[1]) as [string, string][];
  if (joinType === 'semi') {
    return { semijoin: { right: rightModel, on: completePairs } };
  }
  if (joinType === 'anti') {
    return { antijoin: { right: rightModel, on: completePairs } };
  }
  if (joinType === 'lookup') {
    return { lookup: { right: rightModel, on: completePairs, values: selectedRightColumns } };
  }
  return { join: { right: rightModel, on: completePairs, how: joinType, suffixes } };
}

export function initializeJoinDialog() {
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;
  const activeModel = AppStore.activeModel.value;
  const activeSource = AppStore.activeSource.value;

  const availableTargets: any[] = [];
  models.forEach((model) => {
    if (activeModel && model.id !== activeModel.id) {
      availableTargets.push({
        id: model.id,
        name: model.name,
        type: 'model',
        sourceName: sources.find((s) => s.id === model.sourceId)?.name || 'Unknown',
      });
    }
  });
  sources.forEach((source) => {
    availableTargets.push({
      id: source.id,
      name: source.name,
      type: 'source',
      sourceName: source.name,
    });
  });

  // Reset store state
  const state = DialogStore.joinState;
  const initialRightModel = availableTargets[0]?.id || null;

  // Set left model to current active model or source
  const leftModelId = activeModel?.id || activeSource?.id || null;
  state.leftModel.value = leftModelId;

  // Initialize left columns
  if (leftModelId) {
    state.leftColumns.value = getColumnsForTarget(leftModelId);
    state.selectedLeftColumns.value = [...state.leftColumns.value]; // Select all by default
  } else {
    state.leftColumns.value = [];
    state.selectedLeftColumns.value = [];
  }

  state.targets.value = availableTargets;
  state.rightModel.value = initialRightModel;
  state.joinType.value = 'left';
  state.suffixes.value = ['_x', '_y'];
  state.rightColumns.value = initialRightModel ? getColumnsForTarget(initialRightModel) : [];
  state.selectedRightColumns.value = initialRightModel
    ? [...getColumnsForTarget(initialRightModel)]
    : []; // Select all by default

  // Auto-match columns by identical names
  const autoMatched = findMatchingColumns(state.leftColumns.value, state.rightColumns.value);
  state.keyPairs.value = autoMatched.length > 0 ? autoMatched : [[null, null]];
  state.saveAsNewModel.value = false;
  state.previewData.value = null;
  state.previewError.value = null;
  state.isPreviewing.value = false;
  state.keyPairAnalysis.value = [];
  state.previewTableId.value = null;

  AppStore.activeDialog.value = 'join';

  // Analyze keys if any are set (shouldn't be on init, but just in case)
  setTimeout(() => analyzeJoinKeys(), 0);
}

/**
 * Gets data and columns for a target (model or source) ID.
 * Lazily loads data from IndexedDB if not yet in memory.
 * @returns Object with data array and columns array
 */
export async function getTableDataForTarget(
  targetId: string
): Promise<{ data: any[]; columns: string[] }> {
  if (!targetId) return { data: [], columns: [] };
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  const model = models.find((m) => m.id === targetId);
  if (model) {
    // Ensure upstream source data is loaded for computation
    const modelSource = sources.find((s) => s.id === model.sourceId);
    if (modelSource) await ensureSourceData(modelSource);
    await ensureModelData(model);

    if (model.steps.length > 0) {
      try {
        const result = StepService.computeModelUpToStep(model, model.steps.length - 1, {
          sources,
          models,
        });
        return { data: result.data, columns: result.columns };
      } catch (error) {
        console.error('Error computing model:', error);
        const data = model.data || [];
        const columns =
          model.schema?.map((c) => c.name) || (data.length > 0 ? Object.keys(data[0]) : []);
        return { data, columns };
      }
    } else {
      const data = model.data || [];
      const columns =
        model.schema?.map((c) => c.name) || (data.length > 0 ? Object.keys(data[0]) : []);
      return { data, columns };
    }
  }

  const source = sources.find((s) => s.id === targetId);
  if (source) {
    await ensureSourceData(source);
    const data = source.data || [];
    const columns =
      source.columns?.map((c: any) => c.name) || (data.length > 0 ? Object.keys(data[0]) : []);
    return { data, columns };
  }

  return { data: [], columns: [] };
}

/**
 * Gets only columns for a target (model or source) ID.
 * For columns we can use schema/metadata without loading data.
 * @returns Array of column names
 */
export function getColumnsForTarget(targetId: string): string[] {
  if (!targetId) return [];
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  const model = models.find((m) => m.id === targetId);
  if (model) {
    return model.schema?.map((c) => c.name) || [];
  }

  const source = sources.find((s) => s.id === targetId);
  if (source) {
    return source.columns?.map((c: any) => c.name) || [];
  }

  return [];
}

export function onJoinLeftModelChange() {
  const state = DialogStore.joinState;
  const leftModelId = state.leftModel.value;

  if (leftModelId) {
    state.leftColumns.value = getColumnsForTarget(leftModelId);
    state.selectedLeftColumns.value = [...state.leftColumns.value]; // Select all by default
  } else {
    state.leftColumns.value = [];
    state.selectedLeftColumns.value = [];
  }

  state.previewData.value = null;
  state.previewError.value = null;
  state.keyPairAnalysis.value = [];

  state.keyPairs.value = reconcileKeyPairs(
    state.keyPairs.value,
    state.leftColumns.value,
    state.rightColumns.value,
    'left'
  );

  analyzeJoinKeys();
}

export function onJoinTargetChange() {
  const state = DialogStore.joinState;
  const rightModelId = state.rightModel.value;

  if (rightModelId) {
    state.rightColumns.value = getColumnsForTarget(rightModelId);
    state.selectedRightColumns.value = [...state.rightColumns.value]; // Select all by default
  } else {
    state.rightColumns.value = [];
    state.selectedRightColumns.value = [];
  }

  state.previewData.value = null;
  state.previewError.value = null;
  state.keyPairAnalysis.value = [];

  state.keyPairs.value = reconcileKeyPairs(
    state.keyPairs.value,
    state.leftColumns.value,
    state.rightColumns.value,
    'right'
  );

  analyzeJoinKeys();
}

export function addJoinKeyPair() {
  const state = DialogStore.joinState;
  state.keyPairs.value = [...state.keyPairs.value, [null, null]];
  analyzeJoinKeys();
}

export function removeJoinKeyPair(index: number) {
  const state = DialogStore.joinState;
  if (state.keyPairs.value.length > 1) {
    state.keyPairs.value = state.keyPairs.value.filter((_, i) => i !== index);
    analyzeJoinKeys();
  }
}

export async function analyzeJoinKeys() {
  const state = DialogStore.joinState;
  const leftModelId = state.leftModel.value;
  const rightModelId = state.rightModel.value;
  const keyPairs = state.keyPairs.value;

  if (!leftModelId || !rightModelId) {
    state.keyPairAnalysis.value = [];
    return;
  }

  // Get left and right table data
  const { data: leftData } = await getTableDataForTarget(leftModelId);
  const { data: rightData } = await getTableDataForTarget(rightModelId);

  const analysis = keyPairs.map((pair) => {
    const leftCol = pair[0];
    const rightCol = pair[1];

    if (!leftCol || !rightCol) {
      return {
        leftCol,
        rightCol,
        leftUnique: 0,
        rightUnique: 0,
        leftHasDuplicates: false,
        rightHasDuplicates: false,
        leftOnly: 0,
        rightOnly: 0,
        matches: 0,
        leftTotalRows: 0,
        rightTotalRows: 0,
        leftNonNullRows: 0,
        rightNonNullRows: 0,
        leftMatchPercent: 0,
        rightMatchPercent: 0,
        leftOnlyPercent: 0,
        rightOnlyPercent: 0,
        leftOnlyValues: [],
        rightOnlyValues: [],
      };
    }

    // Extract values from left column
    const leftValues = leftData.map((row) => row[leftCol]);
    const leftNonNullValues = leftValues.filter((v) => v != null);
    const leftValueSet = new Set(leftNonNullValues);
    const leftUnique = leftValueSet.size;
    const leftHasDuplicates = leftNonNullValues.length > leftUnique;
    const leftTotalRows = leftData.length;
    const leftNonNullRows = leftNonNullValues.length;

    // Extract values from right column
    const rightValues = rightData.map((row) => row[rightCol]);
    const rightNonNullValues = rightValues.filter((v) => v != null);
    const rightValueSet = new Set(rightNonNullValues);
    const rightUnique = rightValueSet.size;
    const rightHasDuplicates = rightNonNullValues.length > rightUnique;
    const rightTotalRows = rightData.length;
    const rightNonNullRows = rightNonNullValues.length;

    // Find matches and mismatches (based on unique values)
    const leftOnlySet = new Set(leftNonNullValues.filter((v) => !rightValueSet.has(v)));
    const rightOnlySet = new Set(rightNonNullValues.filter((v) => !leftValueSet.has(v)));
    const matches = new Set(leftNonNullValues.filter((v) => rightValueSet.has(v)));

    // Get actual values (sorted for display)
    const leftOnlyValues = Array.from(leftOnlySet).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    const rightOnlyValues = Array.from(rightOnlySet).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

    // Calculate row-level statistics for percentages
    // Count how many left rows have values that exist in right table
    const leftRowsWithMatch = leftValues.filter((v) => v != null && rightValueSet.has(v)).length;
    const leftRowsWithoutMatch = leftValues.filter(
      (v) => v != null && !rightValueSet.has(v)
    ).length;

    // Count how many right rows have values that exist in left table
    const rightRowsWithMatch = rightValues.filter((v) => v != null && leftValueSet.has(v)).length;
    const rightRowsWithoutMatch = rightValues.filter(
      (v) => v != null && !leftValueSet.has(v)
    ).length;

    // Calculate percentages based on actual rows
    const leftMatchPercent =
      leftNonNullRows > 0 ? Math.round((leftRowsWithMatch / leftNonNullRows) * 100) : 0;
    const rightMatchPercent =
      rightNonNullRows > 0 ? Math.round((rightRowsWithMatch / rightNonNullRows) * 100) : 0;
    const leftOnlyPercent =
      leftNonNullRows > 0 ? Math.round((leftRowsWithoutMatch / leftNonNullRows) * 100) : 0;
    const rightOnlyPercent =
      rightNonNullRows > 0 ? Math.round((rightRowsWithoutMatch / rightNonNullRows) * 100) : 0;

    return {
      leftCol,
      rightCol,
      leftUnique,
      rightUnique,
      leftHasDuplicates,
      rightHasDuplicates,
      leftOnly: leftOnlySet.size,
      rightOnly: rightOnlySet.size,
      matches: matches.size,
      leftOnlyValues,
      rightOnlyValues,
      leftTotalRows,
      rightTotalRows,
      leftNonNullRows,
      rightNonNullRows,
      leftMatchPercent,
      rightMatchPercent,
      leftOnlyPercent,
      rightOnlyPercent,
    };
  });

  state.keyPairAnalysis.value = analysis;
}

export async function previewJoin() {
  const state = DialogStore.joinState;
  const leftModelId = state.leftModel.value;
  const rightModel = state.rightModel.value;
  const joinType = state.joinType.value;
  const keyPairs = state.keyPairs.value;
  const suffixes = state.suffixes.value;
  const selectedLeftColumns = state.selectedLeftColumns.value;
  const selectedRightColumns = state.selectedRightColumns.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  if (!leftModelId) {
    state.previewError.value = i18n.t('validation.selection.leftTable', { ns: 'errors' });
    return;
  }
  if (!rightModel) {
    state.previewError.value = i18n.t('validation.selection.joinRightTable', { ns: 'errors' });
    return;
  }
  if (joinType !== 'cross') {
    const hasCompleteKeyPair = keyPairs.some((pair) => pair[0] && pair[1]);
    if (!hasCompleteKeyPair) {
      state.previewError.value = i18n.t('validation.required.keyPair', { ns: 'errors' });
      return;
    }
  }

  // Cycle check
  const cycleResult = DependencyService.checkCircularDependency(
    models,
    sources,
    leftModelId,
    rightModel
  );
  if (cycleResult.isCyclic) {
    state.previewError.value =
      cycleResult.message || i18n.t('system.circularDependency', { ns: 'errors' });
    return;
  }

  state.isPreviewing.value = true;
  state.previewError.value = null;
  state.previewData.value = null;

  try {
    // Get left table data and columns
    const { data: leftData, columns: leftColumns } = await getTableDataForTarget(leftModelId);

    // Get right table data (ensure model data is up-to-date for transform)
    const targetModel = models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = StepService.computeModelUpToStep(targetModel, targetModel.steps.length - 1, {
        sources,
        models,
      });
      targetModel.data = result.data;
    }

    const transform = buildJoinTransform(
      joinType,
      rightModel,
      keyPairs,
      suffixes as [string, string],
      selectedRightColumns
    );
    const table = aq.from(leftData);
    const context = { sources, models };
    let result = applyTransform(table, transform, leftColumns, context);

    // Apply column selection if specified
    const allSelectedColumns = [...selectedLeftColumns, ...selectedRightColumns];
    if (allSelectedColumns.length > 0) {
      const availableColumns = result.columnNames();
      const columnsToSelect = allSelectedColumns.filter((col) => availableColumns.includes(col));
      if (columnsToSelect.length > 0) {
        result = result.select(columnsToSelect);
      }
    }

    const allData = result.objects();
    const resultColumns = result.columnNames();
    const previewRows = allData.slice(0, 100);
    const totalRows = allData.length;

    // Store in joinState for backward compatibility
    state.previewData.value = {
      rows: previewRows,
      totalRows: totalRows,
      columns: resultColumns,
    };

    // Also populate the shared previewState for the preview panel
    DialogStore.previewState.title.value = 'Join Preview';
    DialogStore.previewState.stats.value = `${totalRows} rows, ${resultColumns.length} columns (showing first ${previewRows.length} rows)`;
    DialogStore.previewState.columns.value = resultColumns;
    DialogStore.previewState.newColumns.value = []; // No new columns in join
    DialogStore.previewState.rows.value = previewRows;
  } catch (error: any) {
    console.error('Join preview error:', error);
    state.previewError.value = error.message;
    // Clear preview on error
    DialogStore.previewState.title.value = '';
    DialogStore.previewState.stats.value = '';
    DialogStore.previewState.columns.value = [];
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = [];
  } finally {
    state.isPreviewing.value = false;
  }
}

export async function applyJoinTransform(callbacks: any) {
  const state = DialogStore.joinState;
  const leftModelId = state.leftModel.value;
  const rightModel = state.rightModel.value;
  const joinType = state.joinType.value;
  const keyPairs = state.keyPairs.value;
  const suffixes = state.suffixes.value;
  const selectedLeftColumns = state.selectedLeftColumns.value;
  const selectedRightColumns = state.selectedRightColumns.value;
  const saveAsNewModel = state.saveAsNewModel.value;
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  if (!leftModelId) {
    await callbacks.onError?.(i18n.t('validation.selection.leftTable', { ns: 'errors' }));
    return;
  }
  if (!rightModel) {
    await callbacks.onError?.(i18n.t('validation.selection.joinRightTable', { ns: 'errors' }));
    return;
  }
  if (joinType !== 'cross') {
    const completePairs = keyPairs.filter((pair) => pair[0] && pair[1]);
    if (completePairs.length === 0) {
      await callbacks.onError?.(i18n.t('validation.required.keyPair', { ns: 'errors' }));
      return;
    }
  }

  // Cycle check
  const cycleResult = DependencyService.checkCircularDependency(
    models,
    sources,
    leftModelId,
    rightModel
  );
  if (cycleResult.isCyclic) {
    await callbacks.onError?.(
      cycleResult.message || i18n.t('system.circularDependency', { ns: 'errors' })
    );
    return;
  }

  try {
    // Get left table data and columns
    const { data: leftData, columns: leftColumns } = await getTableDataForTarget(leftModelId);
    const leftModel = models.find((m) => m.id === leftModelId);

    // Get right table data (ensure model data is up-to-date for transform)
    const targetModel = models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = StepService.computeModelUpToStep(targetModel, targetModel.steps.length - 1, {
        sources,
        models,
      });
      targetModel.data = result.data;
    }

    const transform = buildJoinTransform(
      joinType,
      rightModel,
      keyPairs,
      suffixes as [string, string],
      selectedRightColumns
    );

    // Apply join transform
    const table = aq.from(leftData);
    const context = { sources, models };
    let resultTable = applyTransform(table, transform, leftColumns, context);

    // Apply column selection if specified
    const allSelectedColumns = [...selectedLeftColumns, ...selectedRightColumns];
    if (allSelectedColumns.length > 0) {
      const availableColumns = resultTable.columnNames();
      const columnsToSelect = allSelectedColumns.filter((col) => availableColumns.includes(col));
      if (columnsToSelect.length > 0) {
        resultTable = resultTable.select(columnsToSelect);
      }
    }

    const resultData = resultTable.objects();

    if (saveAsNewModel) {
      // Create a new model from the join result — resolve root source for chained models
      const resolveSourceId = leftModel ? leftModel.sourceId : leftModelId;
      let leftSource = sources.find((s) => s.id === resolveSourceId);
      if (!leftSource && leftModel) {
        const rootId = DependencyService.getRootSourceId(models, sources, leftModel.id);
        if (rootId) leftSource = sources.find((s) => s.id === rootId);
      }

      if (!leftSource) {
        await callbacks.onError?.(i18n.t('system.sourceNotFoundForNewModel', { ns: 'errors' }));
        return;
      }

      const defaultName = `join_${AppStore.models.value.filter((m) => m.sourceId === leftSource!.id).length + 1}`;
      const modelName = await prompt(i18n.t('prompts.newModel', { ns: 'common' }), defaultName);
      if (!modelName || modelName.trim() === '') return;

      const name = modelName.trim();
      if (NameService.isModelNameTaken(name, leftSource.id)) {
        await callbacks.onError?.(i18n.t('validation.duplicate.modelExists', { ns: 'errors' }));
        return;
      }

      // Create logical schema from result (models use logical types)
      const { SchemaEngine } = await import('../../../core/schema-engine');
      const schema = SchemaEngine.createLogicalSchema(resultData);

      const { StepService } = await import('../../services/StepService');
      const [importStep, typesStep] = StepService.createInitialSteps(leftSource);

      const newModel: any = {
        id: `mdl_${Date.now()}`,
        name: name,
        sourceId: leftSource.id,
        steps: [importStep, typesStep, transform],
        schema: schema,
        data: cloneData(resultData),
        __v: 1,
      };

      AppStore.models.value = [...AppStore.models.value, newModel];
      const { ModelService } = await import('../../services/ModelService');
      ModelService.switchToModel(
        newModel,
        () => {},
        () => {},
        'rows',
        () => {}
      );
      await callbacks.onDialogClose?.(true);
    } else {
      // Apply to current model (existing behavior)
      // We need to temporarily set the active model to the left model
      const originalModel = AppStore.activeModel.value;
      const originalData = AppStore.currentData.value;
      const originalColumns = AppStore.columns.value;

      // Temporarily switch to left model if different
      if (leftModel && leftModel.id !== originalModel?.id) {
        AppStore.activeModel.value = leftModel;
        AppStore.currentData.value = leftData;
        AppStore.columns.value = leftColumns;
      }

      try {
        await StepService.runTransform('Join', transform, callbacks);
      } finally {
        // Restore original if we switched
        if (leftModel && leftModel.id !== originalModel?.id) {
          AppStore.activeModel.value = originalModel;
          AppStore.currentData.value = originalData;
          AppStore.columns.value = originalColumns;
        }
      }
    }
  } catch (error: any) {
    console.error('Join transform setup error:', error);
    await callbacks.onError?.(
      i18n.t('transform.joinFailed', { ns: 'errors', message: error.message })
    );
  }
}
