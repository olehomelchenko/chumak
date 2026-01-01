/**
 * Chumak Performance Logger
 *
 * Simple performance tracking for data operations
 */

const perfLogger = {
  enabled: true,

  /**
   * Log an operation with timing and data shape
   * @param {string} name - Operation name
   * @param {Object} input - Input data/table
   * @param {Object} output - Output data/table
   * @param {number} duration - Time in ms
   */
  log(name, input, output, duration) {
    if (!this.enabled) return;

    const inputShape = getShape(input);
    const outputShape = getShape(output);
    const icon = duration < 50 ? '⚡' : duration < 200 ? '✓' : duration < 500 ? '⏱️' : '⚠️';

    console.log(
      `${icon} ${name} — ${duration.toFixed(1)}ms`,
      `\n  ${inputShape.rows.toLocaleString()}×${inputShape.cols} → ${outputShape.rows.toLocaleString()}×${outputShape.cols}`
    );
  }
};

/**
 * Get data shape (rows × cols)
 */
function getShape(data) {
  if (!data) return { rows: 0, cols: 0 };

  // Arquero table
  if (data.numRows) {
    return { rows: data.numRows(), cols: data.numCols() };
  }

  // Array
  if (Array.isArray(data)) {
    return {
      rows: data.length,
      cols: data.length > 0 ? Object.keys(data[0]).length : 0
    };
  }

  return { rows: 0, cols: 0 };
}

// Expose globally
window.perfLogger = perfLogger;
