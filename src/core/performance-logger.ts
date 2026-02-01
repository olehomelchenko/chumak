/**
 * Syto Performance Logger
 *
 * @deprecated Use metricsCollector from './metrics' instead.
 * This module is kept for backward compatibility but delegates to the metrics system.
 */

import { metricsCollector, getDataShape } from './metrics';

export interface DataShape {
  rows: number;
  cols: number;
}

/**
 * @deprecated Use metricsCollector.record() instead
 */
export const perfLogger = {
  enabled: true,

  /**
   * Log an operation with timing and data shape
   * @deprecated Use metricsCollector.record() instead
   */
  log(name: string, input: any, output: any, duration: number): void {
    if (!this.enabled) return;

    const inputShape = getDataShape(input);
    const outputShape = getDataShape(output);

    // Delegate to new metrics system
    metricsCollector.record({
      transformType: name,
      durationMs: duration,
      success: true,
      inputRows: inputShape.rows,
      inputCols: inputShape.cols,
      outputRows: outputShape.rows,
      outputCols: outputShape.cols,
    });
  },

  /**
   * Get data shape (rows × cols)
   * @deprecated Use getDataShape from './metrics' instead
   */
  getShape(data: any): DataShape {
    return getDataShape(data);
  },
};
