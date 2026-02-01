import * as aq from 'arquero';
import { applyTransform } from '../../../core/transforms';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { DependencyService } from '../../services/DependencyService';

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
  state.keyPairs.value = [[null, null]];
  state.suffixes.value = ['_x', '_y'];
  state.rightColumns.value = initialRightModel ? getColumnsForTarget(initialRightModel) : [];
  state.selectedRightColumns.value = initialRightModel
    ? [...getColumnsForTarget(initialRightModel)]
    : []; // Select all by default
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
 * Gets data and columns for a target (model or source) ID
 * @returns Object with data array and columns array
 */
export function getTableDataForTarget(targetId: string): { data: any[]; columns: string[] } {
  if (!targetId) return { data: [], columns: [] };
  const models = AppStore.models.value;
  const sources = AppStore.sources.value;

  const model = models.find((m) => m.id === targetId);
  if (model) {
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
    const data = source.data || [];
    const columns =
      source.columns?.map((c: any) => c.name) || (data.length > 0 ? Object.keys(data[0]) : []);
    return { data, columns };
  }

  return { data: [], columns: [] };
}

/**
 * Gets only columns for a target (model or source) ID
 * @returns Array of column names
 */
export function getColumnsForTarget(targetId: string): string[] {
  return getTableDataForTarget(targetId).columns;
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

  state.keyPairs.value = [[null, null]];
  state.previewData.value = null;
  state.previewError.value = null;
  state.keyPairAnalysis.value = [];

  // Re-analyze key pairs if any are set
  if (state.keyPairs.value.some((pair) => pair[0] || pair[1])) {
    analyzeJoinKeys();
  }
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

  state.keyPairs.value = [[null, null]];
  state.previewData.value = null;
  state.previewError.value = null;
  state.keyPairAnalysis.value = [];

  // Re-analyze key pairs if any are set
  if (state.keyPairs.value.some((pair) => pair[0] || pair[1])) {
    analyzeJoinKeys();
  }
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

export function analyzeJoinKeys() {
  const state = DialogStore.joinState;
  const leftModelId = state.leftModel.value;
  const rightModelId = state.rightModel.value;
  const keyPairs = state.keyPairs.value;

  if (!leftModelId || !rightModelId) {
    state.keyPairAnalysis.value = [];
    return;
  }

  // Get left and right table data
  const { data: leftData } = getTableDataForTarget(leftModelId);
  const { data: rightData } = getTableDataForTarget(rightModelId);

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
    state.previewError.value = 'Please select a left table';
    return;
  }
  if (!rightModel) {
    state.previewError.value = 'Please select a model or source to join with';
    return;
  }
  if (joinType !== 'cross') {
    const hasCompleteKeyPair = keyPairs.some((pair) => pair[0] && pair[1]);
    if (!hasCompleteKeyPair) {
      state.previewError.value = 'Please specify at least one complete key pair';
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
    state.previewError.value = cycleResult.message || 'Circular dependency detected';
    return;
  }

  state.isPreviewing.value = true;
  state.previewError.value = null;
  state.previewData.value = null;

  const getTransform = () => {
    const completePairs = keyPairs.filter((pair: any) => pair[0] && pair[1]) as [string, string][];
    if (joinType === 'semi') {
      return { semijoin: { right: rightModel, on: completePairs } };
    }
    if (joinType === 'anti') {
      return { antijoin: { right: rightModel, on: completePairs } };
    }
    if (joinType === 'lookup') {
      return {
        lookup: {
          right: rightModel,
          on: completePairs,
          values: selectedRightColumns,
        },
      };
    }
    return {
      join: {
        right: rightModel,
        on: completePairs,
        how: joinType,
        suffixes: suffixes,
      },
    };
  };

  try {
    // Get left table data and columns
    const { data: leftData, columns: leftColumns } = getTableDataForTarget(leftModelId);

    // Get right table data (ensure model data is up-to-date for transform)
    const targetModel = models.find((m) => m.id === rightModel);
    if (targetModel && targetModel.steps.length > 0) {
      const result = StepService.computeModelUpToStep(targetModel, targetModel.steps.length - 1, {
        sources,
        models,
      });
      targetModel.data = result.data;
    }

    const transform = getTransform();
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

export async function applyJoinTransform(callbacks: any, app?: any) {
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
    await callbacks.onError?.('Please select a left table');
    return;
  }
  if (!rightModel) {
    await callbacks.onError?.('Please select a model or source to join with');
    return;
  }
  if (joinType !== 'cross') {
    const completePairs = keyPairs.filter((pair) => pair[0] && pair[1]);
    if (completePairs.length === 0) {
      await callbacks.onError?.('Please specify at least one complete key pair');
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
    await callbacks.onError?.(cycleResult.message || 'Circular dependency detected');
    return;
  }

  try {
    // Get left table data and columns
    const { data: leftData, columns: leftColumns } = getTableDataForTarget(leftModelId);
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

    const getTransform = () => {
      const completePairs = keyPairs.filter((pair: any) => pair[0] && pair[1]) as [
        string,
        string,
      ][];
      if (joinType === 'semi') {
        return { semijoin: { right: rightModel, on: completePairs } };
      }
      if (joinType === 'anti') {
        return { antijoin: { right: rightModel, on: completePairs } };
      }
      if (joinType === 'lookup') {
        return {
          lookup: {
            right: rightModel,
            on: completePairs,
            values: selectedRightColumns,
          },
        };
      }
      return {
        join: {
          right: rightModel,
          on: completePairs,
          how: joinType,
          suffixes: suffixes as [string, string],
        },
      };
    };

    const transform = getTransform();

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
      // Create a new model from the join result
      const leftSource = leftModel
        ? sources.find((s) => s.id === leftModel.sourceId)
        : sources.find((s) => s.id === leftModelId);

      if (!leftSource) {
        await callbacks.onError?.('Could not find source for new model');
        return;
      }

      const defaultName = `join_${AppStore.models.value.filter((m) => m.sourceId === leftSource.id).length + 1}`;
      if (!app?.prompt) {
        await callbacks.onError?.('Cannot create new model: app instance not available');
        return;
      }
      const modelName = await app.prompt('Enter name for new model:', defaultName);
      if (!modelName || modelName.trim() === '') return;

      const name = modelName.trim();
      const existingModel = AppStore.models.value.find(
        (m) => m.sourceId === leftSource.id && m.name.toLowerCase() === name.toLowerCase()
      );

      if (existingModel) {
        await callbacks.onError?.('A model with this name already exists for this source.');
        return;
      }

      // Create logical schema from result (models use logical types)
      const { SchemaEngine } = await import('../../../core/schema-engine');
      const schema = SchemaEngine.createLogicalSchema(resultData);

      const newModel: any = {
        id: `mdl_${Date.now()}`,
        name: name,
        sourceId: leftSource.id,
        steps: [
          {
            import: {
              source: leftSource.name,
              fileName: leftSource.fileName,
              delimiter: leftSource.delimiter,
              headerMode: leftSource.headerMode,
            },
          },
          { types: {} },
          transform, // Add the join step
        ],
        schema: schema,
        data: JSON.parse(JSON.stringify(resultData)),
        __v: 1,
      };

      // Add types step
      schema.forEach((col) => {
        newModel.steps[1].types[col.name] = col.type;
      });

      AppStore.models.value = [...AppStore.models.value, newModel];
      if (app?.switchToModel) {
        app.switchToModel(newModel);
      } else {
        // Fallback: use ModelService
        const { ModelService } = await import('../../services/ModelService');
        ModelService.switchToModel(
          newModel,
          () => {},
          () => {},
          'prepare',
          () => {}
        );
      }
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
    await callbacks.onError?.('Error preparing join: ' + error.message);
  }
}
