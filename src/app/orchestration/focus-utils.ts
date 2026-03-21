/**
 * Focus utilities — checks whether the user is in an interactive context
 * (input, textarea, select, contenteditable, or CodeMirror editor)
 * where global shortcuts and paste-to-import should be suppressed.
 */

/**
 * Check if the active element is an interactive/editable context
 */
export function isInInteractiveContext(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  if (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    activeElement.getAttribute('contenteditable') === 'true'
  )
    return true;

  // CodeMirror editors render as divs — check for .cm-editor ancestor
  if (activeElement.closest?.('.cm-editor')) return true;

  return false;
}
