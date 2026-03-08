import { AppStore } from '../../stores/AppStore';
import { ExportService } from '../../services/ExportService';
import { alert, showSuccess, showError } from './notification-handlers';
import * as StepHandlers from './step-handlers';
import i18n from '../../../i18n';

/**
 * Keyboard Shortcuts Handler
 *
 * Handles global keyboard shortcuts for the application.
 * Shortcuts are only active when no dialog is open and user is not typing in an input field.
 */

/**
 * Check if the user is currently typing in an input/textarea element
 */
function isTypingInField(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  if (!target) return false;

  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;

  return false;
}

/**
 * Check if a dialog or modal is currently open
 */
function isDialogOpen(): boolean {
  return !!(AppStore.activeDialog.value || AppStore.messageBox.value.visible);
}

/**
 * Handle Ctrl/Cmd + S: Save/Download workflow
 */
async function handleSave(event: KeyboardEvent) {
  event.preventDefault();

  const model = AppStore.activeModel.value;
  if (!model) {
    return;
  }

  try {
    await ExportService.exportWorkflowJSON(async (msg: string) => {
      await alert(msg);
    });
    showSuccess(i18n.t('notifications.workflowDownloaded', { ns: 'common' }));
  } catch (error: any) {
    showError(
      i18n.t('system.downloadFailed', { ns: 'errors' }),
      error.message || i18n.t('system.downloadGenericFailed', { ns: 'errors' })
    );
  }
}

/**
 * Handle Delete: Remove selected step
 */
async function handleDelete() {
  const model = AppStore.activeModel.value;
  if (!model || !model.steps || model.steps.length === 0) {
    return;
  }

  // For now, remove the last step (most recently added)
  // TODO: Add concept of "selected step" to AppStore for more precise deletion
  const lastStepIndex = model.steps.length - 1;

  try {
    await StepHandlers.removeStep(lastStepIndex);
  } catch (error: any) {
    console.error('Error removing step:', error);
  }
}

/**
 * Handle Arrow Up: Navigate to previous step
 */
function handleNavigateUp(event: KeyboardEvent) {
  event.preventDefault();

  const model = AppStore.activeModel.value;
  if (!model || !model.steps || model.steps.length === 0) {
    return;
  }

  const currentIndex = AppStore.activeStepIndex.value ?? model.steps.length;
  if (currentIndex > 0) {
    StepHandlers.viewStep(currentIndex - 1);
  }
}

/**
 * Handle Arrow Down: Navigate to next step
 */
function handleNavigateDown(event: KeyboardEvent) {
  event.preventDefault();

  const model = AppStore.activeModel.value;
  if (!model || !model.steps || model.steps.length === 0) {
    return;
  }

  const currentIndex = AppStore.activeStepIndex.value ?? -1;
  if (currentIndex < model.steps.length - 1) {
    StepHandlers.viewStep(currentIndex + 1);
  }
}

/**
 * Main keyboard event handler
 * Called by EventRouter for non-Escape, non-Enter keyboard shortcuts
 */
export function handleKeyDown(event: KeyboardEvent) {
  // Don't handle shortcuts if user is typing
  if (isTypingInField(event)) {
    return;
  }

  // Don't handle most shortcuts if dialog is open
  // (Escape is handled separately in EventRouter)
  if (isDialogOpen()) {
    return;
  }

  // Detect platform (Mac uses metaKey, Windows/Linux use ctrlKey)
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  // Ctrl/Cmd + S: Save workflow
  if (modKey && event.key.toLowerCase() === 's') {
    handleSave(event);
    return;
  }

  // Ctrl/Cmd + Shift + Z: Redo
  if (modKey && event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    StepHandlers.redo();
    return;
  }

  // Ctrl/Cmd + Z: Undo
  if (modKey && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    StepHandlers.undo();
    return;
  }

  // Delete: Remove last step
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Only trigger on Delete key, not Backspace (which users might use while typing)
    if (event.key === 'Delete') {
      handleDelete();
    }
    return;
  }

  // Arrow Up: Navigate to previous step
  if (event.key === 'ArrowUp' && !modKey && !event.shiftKey) {
    handleNavigateUp(event);
    return;
  }

  // Arrow Down: Navigate to next step
  if (event.key === 'ArrowDown' && !modKey && !event.shiftKey) {
    handleNavigateDown(event);
    return;
  }
}
