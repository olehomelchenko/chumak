/**
 * EventRouter - Centralized event handling for keyboard, paste, and click events
 *
 * This module manages global event listeners and routes events to appropriate handlers.
 * Components can subscribe to specific events or use the default routing.
 */

import { AppStore } from '../stores/AppStore';

export type EventRouterCallbacks = {
  closeDialog: (force?: boolean) => void;
  closeMessageBox: (result: boolean) => void;
  clearColumnSelection: () => void;
  handlePaste: (event: ClipboardEvent) => void;
  handleBodyClick: (event: MouseEvent) => void;
};

let callbacks: EventRouterCallbacks | null = null;
let initialized = false;

/**
 * Initialize event router with callbacks for actions that need app context
 */
export function initEventRouter(cb: EventRouterCallbacks): void {
  if (initialized) {
    console.warn('EventRouter already initialized');
    return;
  }

  callbacks = cb;

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('paste', handlePaste);
  window.addEventListener('click', handleClick);

  initialized = true;
}

/**
 * Clean up event listeners
 */
export function destroyEventRouter(): void {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('paste', handlePaste);
  window.removeEventListener('click', handleClick);

  callbacks = null;
  initialized = false;
}

/**
 * Handle keyboard events with priority routing
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (!callbacks) return;

  // Handle Escape key first (highest priority)
  if (e.key === 'Escape') {
    // 1. Message box (alert/confirm/prompt) - highest priority
    if (AppStore.messageBox.value.visible) {
      callbacks.closeMessageBox(false);
      return;
    }

    // 2. Active dialog
    if (AppStore.activeDialog.value) {
      callbacks.closeDialog();
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
      callbacks.clearColumnSelection();
      return;
    }
  }

  // Delegate other keyboard shortcuts to KeyboardHandlers
  // Note: KeyboardHandlers.handleKeyDown expects SytoApp instance for legacy compatibility
  // This will be refactored in future to use stores directly
}

/**
 * Handle paste events
 */
function handlePaste(e: ClipboardEvent): void {
  if (!callbacks) return;
  callbacks.handlePaste(e);
}

/**
 * Handle body click events
 */
function handleClick(e: MouseEvent): void {
  if (!callbacks) return;
  callbacks.handleBodyClick(e);
}

/**
 * Check if we're in an interactive context where shortcuts should be suppressed
 */
export function isInInteractiveContext(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isEditable =
    activeElement.getAttribute('contenteditable') === 'true' ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select';

  return isEditable;
}

/**
 * Check if a modifier key is pressed
 */
export function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}
