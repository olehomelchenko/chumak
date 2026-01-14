import type { ChumakApp } from '../../chumak-app';

export function getStepsJson(this: ChumakApp): string {
  if (!this.activeModel?.steps) return '';
  return JSON.stringify({ transforms: this.activeModel.steps }, null, 2);
}

export function enterJsonEditMode(this: ChumakApp) {
  if (!this.activeModel?.steps) return;
  this.jsonEditBackup = JSON.parse(JSON.stringify(this.activeModel.steps));
  this.jsonEditContent = this.getStepsJson();
  this.jsonEditError = null;
  this.jsonEditMode = true;
}

export function cancelJsonEdit(this: ChumakApp) {
  this.activeModel.steps = this.jsonEditBackup;
  this.jsonEditMode = false;
  this.jsonEditError = null;
}

export async function applyJsonChanges(this: ChumakApp) {
  try {
    const parsed = JSON.parse(this.jsonEditContent);
    if (!Array.isArray(parsed.transforms)) {
      throw new Error('JSON must contain a "transforms" array');
    }

    this.activeModel.steps = parsed.transforms;
    this.activeStepIndex = this.activeModel.steps.length - 1;
    await this.computeModelUpToStep(this.activeModel, this.activeStepIndex);

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
