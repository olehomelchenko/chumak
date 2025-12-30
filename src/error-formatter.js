/**
 * Chumak Error Formatter - User-friendly error messages
 *
 * Phase 0: Minimal implementation
 * - Format error with position highlighting
 * - Plain language messages
 * - No suggestions yet (Phase 1: Levenshtein distance for column names)
 */

/**
 * Format an error for display to user
 * @param {Object} error - Error object with message, position, expression
 * @param {string} expression - Original expression string
 * @returns {string} Formatted error message with position indicator
 */
function formatError(error, expression) {
  const message = error.message || 'Unknown error';
  const position = error.position || 0;

  // Create position indicator
  const spaces = ' '.repeat(Math.max(0, position));
  const pointer = '↑';

  // Format as multi-line message
  const formatted = [
    message,
    expression,
    spaces + pointer
  ].join('\n');

  // Add available columns if this is a column error
  if (error.type === 'unknown-column' && error.availableColumns) {
    return formatted + '\n\nAvailable columns: ' + error.availableColumns.join(', ');
  }

  return formatted;
}
