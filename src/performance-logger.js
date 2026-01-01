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
   * @param {Object} meta - Additional context
   */
  log(name, input, output, duration, meta = {}) {
    if (!this.enabled) return;

    const inputShape = getShape(input);
    const outputShape = getShape(output);
    const icon = duration < 50 ? '⚡' : duration < 200 ? '✓' : duration < 500 ? '⏱️' : '⚠️';

    console.log(
      `${icon} ${name} — ${duration.toFixed(1)}ms`,
      `\n  ${inputShape.rows.toLocaleString()}×${inputShape.cols} → ${outputShape.rows.toLocaleString()}×${outputShape.cols}`,
      meta.details ? `\n  ${meta.details}` : ''
    );
  },

  /**
   * Measure a function
   */
  measure(name, fn, meta = {}) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.log(name, meta.input, result, duration, meta);
    return result;
  },

  /**
   * Measure async function
   */
  async measureAsync(name, fn, meta = {}) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.log(name, meta.input, result, duration, meta);
    return result;
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
window.getShape = getShape;
