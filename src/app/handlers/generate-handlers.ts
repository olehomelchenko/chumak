import type { SytoApp } from '../../syto-app';
import { DialogStore } from '../stores/DialogStore';
import { GeneratorService, ColumnGenerator } from '../services/GeneratorService';
import { ImportService } from '../services/ImportService';

/**
 * Generate synthetic data based on the configuration in the generate dialog
 */
export async function generateData(this: SytoApp) {
  const { sourceName, rowCount, generators, error } = DialogStore.generateState;

  // Validate source name
  if (!sourceName.value || sourceName.value.trim() === '') {
    error.value = 'Please enter a source name';
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

  // Validate generators
  if (generators.value.length === 0) {
    error.value = 'At least one column is required';
    return;
  }

  // Validate each generator
  for (const gen of generators.value) {
    const validationError = GeneratorService.validateGenerator(gen as ColumnGenerator);
    if (validationError) {
      error.value = `Column "${gen.name}": ${validationError}`;
      return;
    }
  }

  // Check for duplicate column names
  const columnNames = generators.value.map((g) => g.name);
  const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    error.value = `Duplicate column name: "${duplicates[0]}"`;
    return;
  }

  // Clear any previous errors
  error.value = null;

  try {
    // Generate the data
    const { columns, data } = GeneratorService.generate(
      rowCount.value,
      generators.value as ColumnGenerator[]
    );

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
