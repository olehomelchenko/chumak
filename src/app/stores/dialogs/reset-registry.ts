/**
 * Reset function registry
 *
 * This module provides a central registry for dialog state reset functions.
 * It's separate from the main dialogs/index.ts to avoid circular imports.
 */

const resetFunctions: Array<() => void> = [];

/**
 * Register a reset function for a dialog state.
 * Called by each state module during initialization.
 */
export function registerResetFunction(fn: () => void) {
  resetFunctions.push(fn);
}

/**
 * Resets all dialog states to their initial values.
 */
export function resetAllDialogStates() {
  resetFunctions.forEach((fn) => fn());
}
