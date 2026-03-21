/**
 * EventRouter - Centralized event handling for keyboard, paste, and click events
 *
 * This module manages global event listeners and routes events to appropriate handlers.
 * Escape and Enter-to-submit are handled here; other shortcuts delegate to KeyboardHandlers.
 */

import { AppStore } from '../stores/AppStore';
import { isSlidePanel } from '../dialog-registry';
import { activeDialogHasError } from './DialogCoordinator';
import { closeDialog } from '../handlers/dialog/dialog-handlers';
import { closeMessageBox } from '../handlers/core/notification-handlers';
import { applyActiveTransform } from '../handlers/core/step-handlers';
import { handlePaste as importHandlePaste } from '../handlers/import/import-handlers';
import { handleBodyClick, clearColumnSelection } from '../handlers/core/interaction-handlers';
import * as KeyboardHandlers from '../handlers/core/keyboard-handlers';

let initialized = false;

/**
 * Initialize event router — adds global keyboard, paste, and click listeners
 */
export function initEventRouter(): void {
  if (initialized) {
    console.warn('EventRouter already initialized');
    return;
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('paste', handlePasteEvent);
  window.addEventListener('click', handleClick);

  initialized = true;
}

/**
 * Clean up event listeners
 */
export function destroyEventRouter(): void {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('paste', handlePasteEvent);
  window.removeEventListener('click', handleClick);

  initialized = false;
}

/**
 * Handle keyboard events with priority routing
 */
function handleKeyDown(e: KeyboardEvent): void {
  // Handle Escape key first (highest priority)
  if (e.key === 'Escape') {
    // 1. Message box (alert/confirm/prompt) - highest priority
    if (AppStore.messageBox.value.visible) {
      closeMessageBox(false);
      return;
    }

    // 2. Active dialog
    if (AppStore.activeDialog.value) {
      closeDialog();
      return;
    }

    // 3. Type menu
    if (AppStore.typeMenuOpen.value) {
      AppStore.typeMenuOpen.value = false;
      return;
    }

    // 4. Column/cell/row selection
    if (
      AppStore.selectedColumn.value ||
      AppStore.selectedCell.value ||
      AppStore.selectedColumns.value.length > 0 ||
      AppStore.selectedRows.value.length > 0
    ) {
      clearColumnSelection();
      return;
    }
  }

  // Handle Enter key for slide panel submit
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const dialog = AppStore.activeDialog.value;
    if (dialog && isSlidePanel(dialog)) {
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase();
      // Skip if in textarea, select, or contenteditable
      if (tag === 'textarea' || tag === 'select') return;
      if (active instanceof HTMLElement && active.isContentEditable) return;
      // Skip if inside a CodeMirror editor
      if (active?.closest('.cm-editor')) return;
      // Skip if Apply button is disabled (dialog has error)
      if (activeDialogHasError()) return;
      e.preventDefault();
      applyActiveTransform();
      return;
    }
  }

  // Delegate other keyboard shortcuts to KeyboardHandlers
  KeyboardHandlers.handleKeyDown(e);
}

/**
 * Handle paste events
 */
function handlePasteEvent(e: ClipboardEvent): void {
  importHandlePaste(e);
}

/**
 * Handle body click events
 */
function handleClick(e: MouseEvent): void {
  handleBodyClick(e);
}

// Re-export focus utilities for backward compatibility
export { isInInteractiveContext } from './focus-utils';

/**
 * Check if a modifier key is pressed
 */
export function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}
