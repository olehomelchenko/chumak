import type { SytoApp } from '../../syto-app';
import { AppStore } from '../stores/AppStore';
import { ExportService } from '../services/ExportService';

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
async function handleSave(app: SytoApp, event: KeyboardEvent) {
  event.preventDefault();

  const model = AppStore.activeModel.value;
  if (!model) {
    return;
  }

  try {
    await ExportService.exportWorkflowJSON(async (msg: string) => {
      // Simple alert callback required by ExportService
      await app.alert(msg);
    });
    app.showSuccess(`Workflow downloaded successfully`);
  } catch (error: any) {
    app.showError('Download Failed', error.message || 'Failed to download workflow');
  }
}

/**
 * Handle Delete: Remove selected step
 */
async function handleDelete(app: SytoApp) {
  const model = AppStore.activeModel.value;
  if (!model || !model.steps || model.steps.length === 0) {
    return;
  }

  // For now, remove the last step (most recently added)
  // TODO: Add concept of "selected step" to AppStore for more precise deletion
  const lastStepIndex = model.steps.length - 1;

  try {
    await app.removeStep(lastStepIndex);
  } catch (error: any) {
    console.error('Error removing step:', error);
  }
}

/**
 * Handle Arrow Up: Navigate to previous step
 */
function handleNavigateUp(app: SytoApp, event: KeyboardEvent) {
  event.preventDefault();

  const model = AppStore.activeModel.value;
  if (!model || !model.steps || model.steps.length === 0) {
    return;
  }

  const currentIndex = AppStore.activeStepIndex.value ?? model.steps.length;
  if (currentIndex > 0) {
    app.viewStep(currentIndex - 1);
  }
}

/**
 * Handle Arrow Down: Navigate to next step
 */
function handleNavigateDown(app: SytoApp, event: KeyboardEvent) {
  event.preventDefault();

  const model = AppStore.activeModel.value;
  if (!model || !model.steps || model.steps.length === 0) {
    return;
  }

  const currentIndex = AppStore.activeStepIndex.value ?? -1;
  if (currentIndex < model.steps.length - 1) {
    app.viewStep(currentIndex + 1);
  }
}

/**
 * Main keyboard event handler
 * Attached to window keydown event in SytoApp
 */
export function handleKeyDown(app: SytoApp, event: KeyboardEvent) {
  // Don't handle shortcuts if user is typing
  if (isTypingInField(event)) {
    return;
  }

  // Don't handle most shortcuts if dialog is open
  // (Escape is handled separately in SytoApp)
  if (isDialogOpen()) {
    return;
  }

  // Detect platform (Mac uses metaKey, Windows/Linux use ctrlKey)
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  // Ctrl/Cmd + S: Save workflow
  if (modKey && event.key.toLowerCase() === 's') {
    handleSave(app, event);
    return;
  }

  // Delete: Remove last step
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Only trigger on Delete key, not Backspace (which users might use while typing)
    if (event.key === 'Delete') {
      handleDelete(app);
    }
    return;
  }

  // Arrow Up: Navigate to previous step
  if (event.key === 'ArrowUp' && !modKey && !event.shiftKey) {
    handleNavigateUp(app, event);
    return;
  }

  // Arrow Down: Navigate to next step
  if (event.key === 'ArrowDown' && !modKey && !event.shiftKey) {
    handleNavigateDown(app, event);
    return;
  }
}

/**
 * Setup keyboard shortcuts
 * Call this from SytoApp.init()
 */
export function setupKeyboardShortcuts(app: SytoApp) {
  window.addEventListener('keydown', (event) => handleKeyDown(app, event));
}
