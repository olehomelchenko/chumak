import type { SytoApp } from '../../syto-app';
import { DialogStore } from '../stores/DialogStore';
import { GeneratorService, ColumnGenerator } from '../services/GeneratorService';
import { ImportService } from '../services/ImportService';

/**
 * Generate synthetic data based on the configuration in the generate dialog
 */
export async function generateData(this: SytoApp) {
  const { sourceName, rowCount, columnName, type, config, error } = DialogStore.generateState;

  // Validate source name
  if (!sourceName.value || sourceName.value.trim() === '') {
    error.value = 'Please enter a source name';
    return;
  }

  // Validate column name
  if (!columnName.value || columnName.value.trim() === '') {
    error.value = 'Please enter a column name';
    return;
  }

  // Validate row count
  if (rowCount.value <= 0) {
    error.value = 'Row count must be greater than 0';
    return;
  }

  if (rowCount.value > 100000) {
    error.value = 'Row count cannot exceed 100,000 rows';
    return;
  }

  // Create generator object
  const generator: ColumnGenerator = {
    name: columnName.value.trim(),
    type: type.value as any,
    config: config.value,
  };

  // Validate generator
  const validationError = GeneratorService.validateGenerator(generator);
  if (validationError) {
    error.value = validationError;
    return;
  }

  // Clear any previous errors
  error.value = null;

  try {
    // Generate the data
    const { columns, data } = GeneratorService.generate(rowCount.value, [generator]);

    // Create a virtual File object for compatibility with ImportService
    const content = JSON.stringify(data);
    const file = new File([content], `${sourceName.value}.json`, { type: 'application/json' });

    // Use ImportService to create the source and model
    await ImportService.createSource(
      file,
      sourceName.value.trim(),
      columns.map((c) => c.name),
      data,
      'first-row',
      ',',
      null,
      'generated',
      () => this.updatePagination(),
      (force?: boolean) => this.closeDialog(force)
    );
  } catch (err: any) {
    console.error('Generate data error:', err);
    error.value = err.message || 'An error occurred while generating data';
  }
}

let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedUpdateGeneratePreview() {
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
  }
  previewDebounceTimer = setTimeout(() => {
    updateGeneratePreview();
  }, 150);
}

export function updateGeneratePreview() {
  const { rowCount, columnName, type, config } = DialogStore.generateState;

  const generator: ColumnGenerator = {
    name: columnName.value.trim() || 'column',
    type: type.value as any,
    config: config.value,
  };

  const validationError = GeneratorService.validateGenerator(
    generator,
    DialogStore.generateState.isRowAuto.value
  );
  if (validationError || rowCount.value <= 0) {
    DialogStore.previewState.title.value = '';
    DialogStore.previewState.stats.value = '';
    DialogStore.previewState.columns.value = [];
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = [];
    return;
  }

  try {
    const previewCount = Math.min(rowCount.value, 100);
    const { columns, data } = GeneratorService.generate(previewCount, [generator]);

    DialogStore.previewState.title.value = 'Generate Preview';
    DialogStore.previewState.stats.value = `Showing first ${previewCount} generated rows`;
    DialogStore.previewState.columns.value = columns.map((c) => c.name);
    DialogStore.previewState.newColumns.value = columns.map((c) => c.name);
    DialogStore.previewState.rows.value = data;
  } catch (e) {
    DialogStore.previewState.title.value = '';
    DialogStore.previewState.stats.value = '';
    DialogStore.previewState.columns.value = [];
    DialogStore.previewState.newColumns.value = [];
    DialogStore.previewState.rows.value = [];
  }
}
