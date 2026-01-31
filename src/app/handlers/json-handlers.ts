import type { SytoApp } from '../../syto-app';

export function getStepsJson(this: SytoApp): string {
  if (!this.activeModel?.steps) return '';
  return JSON.stringify({ transforms: this.activeModel.steps }, null, 2);
}

export function enterJsonEditMode(this: SytoApp) {
  if (!this.activeModel?.steps) return;
  this.jsonEditBackup = JSON.parse(JSON.stringify(this.activeModel.steps));
  this.jsonEditContent = this.getStepsJson();
  this.jsonEditError = null;
  this.jsonEditMode = true;
}

export function cancelJsonEdit(this: SytoApp) {
  if (this.activeModel) {
    this.activeModel.steps = this.jsonEditBackup;
  }
  this.jsonEditMode = false;
  this.jsonEditError = null;
}

export function validateJsonEdit(this: SytoApp) {
  try {
    const parsed = JSON.parse(this.jsonEditContent);
    if (!Array.isArray(parsed.transforms)) {
      throw new Error('JSON must contain a "transforms" array');
    }
    this.jsonEditError = null;
  } catch (error: any) {
    this.jsonEditError = error.message;
  }
}

export async function applyJsonEdit(this: SytoApp) {
  if (!this.activeModel) return;

  try {
    const parsed = JSON.parse(this.jsonEditContent);
    if (!Array.isArray(parsed.transforms)) {
      throw new Error('JSON must contain a "transforms" array');
    }

    this.activeModel.steps = parsed.transforms;
    this.activeStepIndex = this.activeModel.steps.length - 1;
    const result = await this.computeModelUpToStep(this.activeModel, this.activeStepIndex);

    // 1. Update the Model structure (for persistence)
    const { convertDatesForStorage } = await import('../../core/storage');
    this.activeModel.data = JSON.parse(JSON.stringify(convertDatesForStorage(result.data)));
    this.activeModel.schema = result.schema;

    // 2. Update UI Signals (for rendering)
    this.currentData = result.data;
    this.columns = result.columns;
    this.viewingSchema = result.schema;
    this.viewingIntermediate = false;
    this.updatePagination();

    // 3. Trigger Side Effects (Persistence & Dependencies)
    const { PersistenceService } = await import('../services/PersistenceService');
    const { StepService } = await import('../services/StepService');
    await StepService.handleDependencyImpact(this.activeModel.id);
    await PersistenceService.autoSave();

    this.jsonEditMode = false;
    this.jsonEditError = null;
    this.showSuccess('JSON configuration applied successfully');
  } catch (error: any) {
    this.jsonEditError = error.message;
    this.showError('Failed to apply JSON changes', `${error.message}`, {
      duration: 0,
    });
  }
}
