import { AppStore } from '../stores/AppStore';
import { showSuccess, showError } from './notification-handlers';
import { Model } from '../types';

/**
 * Result from computing model steps
 */
export type ComputeResult = {
  data: any[];
  schema: any[];
  columns: string[];
};

/**
 * Callbacks for JSON edit operations that need model computation
 */
export type JsonEditCallbacks = {
  computeModelUpToStep: (model: Model, stepIndex: number) => ComputeResult;
  updatePagination: () => void;
};

let callbacks: JsonEditCallbacks | null = null;

/**
 * Set JSON edit callbacks for store-based operations
 */
export function setJsonEditCallbacks(cb: JsonEditCallbacks): void {
  callbacks = cb;
}

/**
 * Legacy SytoApp interface for backward compatibility
 */
interface LegacyApp {
  activeModel?: Model | null;
  computeModelUpToStep: (model: Model, stepIndex: number) => ComputeResult;
  updatePagination: () => void;
  showSuccess: (message: string) => void;
  showError: (title: string, message: string, options?: any) => void;
}

/**
 * Get callbacks from legacy app or stored callbacks
 */
function getCallbacks(legacyApp?: LegacyApp): JsonEditCallbacks | null {
  if (legacyApp) {
    return {
      computeModelUpToStep: (model, stepIndex) => legacyApp.computeModelUpToStep(model, stepIndex),
      updatePagination: () => legacyApp.updatePagination(),
    };
  }
  return callbacks;
}

/**
 * Get JSON representation of model steps
 */
export function getStepsJson(this: LegacyApp | void): string {
  const activeModel = this ? (this as LegacyApp).activeModel : AppStore.activeModel.value;
  if (!activeModel?.steps) return '';
  return JSON.stringify({ transforms: activeModel.steps }, null, 2);
}

/**
 * Enter JSON edit mode
 */
export function enterJsonEditMode(this: LegacyApp | void): void {
  const activeModel = this ? (this as LegacyApp).activeModel : AppStore.activeModel.value;
  if (!activeModel?.steps) return;

  // Store backup of current steps
  AppStore.jsonEditBackup.value = JSON.parse(JSON.stringify(activeModel.steps));
  AppStore.jsonEditContent.value = getStepsJson.call(this);
  AppStore.jsonEditError.value = null;
  AppStore.jsonEditMode.value = true;
}

/**
 * Cancel JSON edit and restore backup
 */
export function cancelJsonEdit(this: LegacyApp | void): void {
  const activeModel = this ? (this as LegacyApp).activeModel : AppStore.activeModel.value;
  if (activeModel) {
    activeModel.steps = AppStore.jsonEditBackup.value;
  }
  AppStore.jsonEditMode.value = false;
  AppStore.jsonEditError.value = null;
}

/**
 * Validate JSON content
 */
export function validateJsonEdit(this: LegacyApp | void): void {
  try {
    const content = AppStore.jsonEditContent.value;
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.transforms)) {
      throw new Error('JSON must contain a "transforms" array');
    }
    AppStore.jsonEditError.value = null;
  } catch (error: any) {
    AppStore.jsonEditError.value = error.message;
  }
}

/**
 * Apply JSON edit to model
 */
export async function applyJsonEdit(this: LegacyApp | void): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const activeModel = legacyApp ? legacyApp.activeModel : AppStore.activeModel.value;

  if (!activeModel) return;

  try {
    const content = AppStore.jsonEditContent.value;
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.transforms)) {
      throw new Error('JSON must contain a "transforms" array');
    }

    activeModel.steps = parsed.transforms;
    const stepIndex = activeModel.steps.length - 1;
    AppStore.activeStepIndex.value = stepIndex;

    const result = cb?.computeModelUpToStep(activeModel, stepIndex);
    if (!result) {
      throw new Error('Failed to compute model');
    }

    // 1. Update the Model structure (for persistence)
    const { convertDatesForStorage } = await import('../../core/storage');
    activeModel.data = JSON.parse(JSON.stringify(convertDatesForStorage(result.data)));
    activeModel.schema = result.schema;

    // 2. Update UI Signals (for rendering)
    AppStore.currentData.value = result.data;
    AppStore.columns.value = result.columns;
    AppStore.viewingSchema.value = result.schema;
    AppStore.viewingIntermediate.value = false;
    cb?.updatePagination();

    // 3. Trigger Side Effects (Persistence & Dependencies)
    const { PersistenceService } = await import('../services/PersistenceService');
    const { StepService } = await import('../services/StepService');
    await StepService.handleDependencyImpact(activeModel.id);
    await PersistenceService.autoSave();

    AppStore.jsonEditMode.value = false;
    AppStore.jsonEditError.value = null;

    // Use notification handler or legacy method
    if (legacyApp?.showSuccess) {
      legacyApp.showSuccess('JSON configuration applied successfully');
    } else {
      showSuccess('JSON configuration applied successfully');
    }
  } catch (error: any) {
    AppStore.jsonEditError.value = error.message;

    // Use notification handler or legacy method
    if (legacyApp?.showError) {
      legacyApp.showError('Failed to apply JSON changes', error.message, { duration: 0 });
    } else {
      showError('Failed to apply JSON changes', error.message, { duration: 0 });
    }
  }
}
