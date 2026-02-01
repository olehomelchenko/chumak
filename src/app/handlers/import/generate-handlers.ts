import { DialogStore } from '../../stores/DialogStore';
import { GeneratorService, ColumnGenerator } from '../../services/GeneratorService';
import { ImportService } from '../../services/ImportService';
import { createDebouncedPreview, clearPreview, PreviewResult } from '../preview-engine';

/**
 * Callbacks for generate operations
 */
export type GenerateCallbacks = {
  updatePagination: () => void;
  closeDialog: (force?: boolean) => void;
};

let callbacks: GenerateCallbacks | null = null;

/**
 * Set generate callbacks for store-based operations
 */
export function setGenerateCallbacks(cb: GenerateCallbacks): void {
  callbacks = cb;
}

/**
 * Legacy SytoApp interface for backward compatibility
 */
interface LegacyApp {
  updatePagination: () => void;
  closeDialog: (force?: boolean) => void;
}

/**
 * Get callbacks from legacy app or stored callbacks
 */
function getCallbacks(legacyApp?: LegacyApp): GenerateCallbacks | null {
  if (legacyApp) {
    return {
      updatePagination: () => legacyApp.updatePagination(),
      closeDialog: (force) => legacyApp.closeDialog(force),
    };
  }
  return callbacks;
}

/**
 * Generate synthetic data based on the configuration in the generate dialog
 */
export async function generateData(this: LegacyApp | void): Promise<void> {
  const cb = getCallbacks(this as LegacyApp | undefined);
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
      () => cb?.updatePagination(),
      (force?: boolean) => cb?.closeDialog(force)
    );
  } catch (err: any) {
    console.error('Generate data error:', err);
    error.value = err.message || 'An error occurred while generating data';
  }
}

// Preview engine instance for generate operations
const generatePreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
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
      return null;
    }

    const previewCount = Math.min(rowCount.value, 100);
    const { columns, data } = GeneratorService.generate(previewCount, [generator]);

    return {
      title: 'Generate Preview',
      stats: `Showing first ${previewCount} generated rows`,
      columns: columns.map((c) => c.name),
      newColumns: columns.map((c) => c.name),
      rows: data,
    };
  },
});

export function debouncedUpdateGeneratePreview() {
  generatePreview.trigger();
}

export function updateGeneratePreview() {
  generatePreview.compute();
}

export { clearPreview };
