import { AppStore } from '../../stores/AppStore';
import { showSuccess, showError } from '../core/notification-handlers';
import { Model } from '../../types';
import i18n from '../../../i18n';

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
 * Get JSON representation of model steps
 */
export function getStepsJson(): string {
  const activeModel = AppStore.activeModel.value;
  if (!activeModel?.steps) return '';
  return JSON.stringify({ transforms: activeModel.steps }, null, 2);
}

/**
 * Enter JSON edit mode
 */
export function enterJsonEditMode(): void {
  const activeModel = AppStore.activeModel.value;
  if (!activeModel?.steps) return;

  // Store backup of current steps
  AppStore.jsonEditBackup.value = JSON.parse(JSON.stringify(activeModel.steps));
  AppStore.jsonEditContent.value = getStepsJson();
  AppStore.jsonEditError.value = null;
  AppStore.jsonEditMode.value = true;
}

/**
 * Cancel JSON edit and restore backup
 */
export function cancelJsonEdit(): void {
  const activeModel = AppStore.activeModel.value;
  if (activeModel) {
    activeModel.steps = AppStore.jsonEditBackup.value;
  }
  AppStore.jsonEditMode.value = false;
  AppStore.jsonEditError.value = null;
}

/**
 * Validate JSON content
 */
export function validateJsonEdit(): void {
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
export async function applyJsonEdit(): Promise<void> {
  const activeModel = AppStore.activeModel.value;

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

    const result = callbacks?.computeModelUpToStep(activeModel, stepIndex);
    if (!result) {
      throw new Error('Failed to compute model');
    }

    // 1. Update the Model structure (for persistence)
    activeModel.data = result.data;
    activeModel.schema = result.schema;

    // 2. Update UI Signals (for rendering)
    AppStore.currentData.value = result.data;
    AppStore.columns.value = result.columns;
    AppStore.viewingSchema.value = result.schema;
    AppStore.viewingIntermediate.value = false;
    callbacks?.updatePagination();

    // 3. Trigger Side Effects (Persistence & Dependencies)
    const { PersistenceService } = await import('../../services/PersistenceService');
    const { StepService } = await import('../../services/StepService');
    await StepService.handleDependencyImpact(activeModel.id);
    await PersistenceService.autoSave();

    AppStore.jsonEditMode.value = false;
    AppStore.jsonEditError.value = null;

    showSuccess(i18n.t('notifications.jsonApplied', { ns: 'common' }));
  } catch (error: any) {
    AppStore.jsonEditError.value = error.message;
    showError(i18n.t('transform.jsonApplyFailed', { ns: 'errors' }), error.message, {
      duration: 0,
    });
  }
}
