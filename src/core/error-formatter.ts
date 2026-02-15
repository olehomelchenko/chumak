/**
 * Syto Error Formatter - User-friendly error messages
 */

export interface FormattableError {
  message?: string;
  position?: number;
  type?: string;
  availableColumns?: string[];
  [key: string]: any;
}

/**
 * Format an error for display to user
 */
export function formatError(error: FormattableError, expression: string): string {
  const message = error.message || 'Unknown error';
  const position = error.position || 0;

  // Create position indicator
  const spaces = ' '.repeat(Math.max(0, position));
  const pointer = '↑';

  // Format as multi-line message
  const formatted = [message, expression, spaces + pointer].join('\n');

  // Add suggestion or available columns for unknown identifiers
  if (error.suggestion) {
    return formatted + `\n\nDid you mean '${error.suggestion}'?`;
  }

  if (error.type === 'unknown-column' && error.availableColumns) {
    return formatted + '\n\nAvailable columns: ' + error.availableColumns.join(', ');
  }

  return formatted;
}
