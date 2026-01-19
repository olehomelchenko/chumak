/**
 * Syto Performance Logger
 */

export interface DataShape {
  rows: number;
  cols: number;
}

export const perfLogger = {
  enabled: true,

  /**
   * Log an operation with timing and data shape
   */
  log(name: string, input: any, output: any, duration: number): void {
    if (!this.enabled) return;

    const inputShape = this.getShape(input);
    const outputShape = this.getShape(output);
    const icon = duration < 50 ? '⚡' : duration < 200 ? '✓' : duration < 500 ? '⏱️' : '⚠️';

    console.log(
      `${icon} ${name} — ${duration.toFixed(1)}ms`,
      `\n  ${inputShape.rows.toLocaleString()}×${inputShape.cols} → ${outputShape.rows.toLocaleString()}×${outputShape.cols}`
    );
  },

  /**
   * Get data shape (rows × cols)
   */
  getShape(data: any): DataShape {
    if (!data) return { rows: 0, cols: 0 };

    // Arquero table
    if (typeof data.numRows === 'function') {
      return { rows: data.numRows(), cols: data.numCols() };
    }

    // Array
    if (Array.isArray(data)) {
      return {
        rows: data.length,
        cols: data.length > 0 ? Object.keys(data[0]).length : 0,
      };
    }

    return { rows: 0, cols: 0 };
  },
};
