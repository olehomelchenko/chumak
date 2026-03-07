/**
 * Syto Metrics - Collector Service
 *
 * Central service for recording transform metrics.
 * Handles metric creation, storage, and optional console logging.
 */

import { TransformMetric, MetricInput, MetricShape, MetricMetadata } from './types';
import { addMetric, enforceRetention, loadMetricsConfig, loadMetrics } from './metrics-storage';

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get data shape from various data formats
 */
export function getDataShape(data: any): { rows: number; cols: number } {
  if (!data) return { rows: 0, cols: 0 };

  // Arquero table
  if (typeof data.numRows === 'function') {
    return { rows: data.numRows(), cols: data.numCols() };
  }

  // Array of objects
  if (Array.isArray(data)) {
    return {
      rows: data.length,
      cols: data.length > 0 ? Object.keys(data[0] || {}).length : 0,
    };
  }

  return { rows: 0, cols: 0 };
}

/**
 * Format duration icon for console logging
 */
function getDurationIcon(ms: number): string {
  if (ms < 50) return '⚡';
  if (ms < 200) return '✓';
  if (ms < 500) return '⏱️';
  return '⚠️';
}

/**
 * Metrics Collector - singleton service
 */
export const metricsCollector = {
  /**
   * Record a transform metric
   */
  async record(input: MetricInput): Promise<void> {
    const config = loadMetricsConfig();

    // Console logging (replaces old perfLogger behavior)
    if (config.consoleLogging) {
      this.logToConsole(input);
    }

    // Skip storage if disabled
    if (!config.enabled) {
      return;
    }

    // Build shape JSON
    const shape: MetricShape = {
      inputRows: input.inputRows,
      inputCols: input.inputCols,
      outputRows: input.outputRows,
      outputCols: input.outputCols,
      rowDelta: input.outputRows - input.inputRows,
      colDelta: input.outputCols - input.inputCols,
      rowsPerMs:
        input.inputRows > 0 && input.durationMs > 0
          ? Math.round((input.inputRows / input.durationMs) * 100) / 100
          : 0,
    };

    // Build metric record
    const metric: TransformMetric = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      transformType: input.transformType,
      durationMs: Math.round(input.durationMs * 100) / 100, // Round to 2 decimals
      success: input.success,
      shape: JSON.stringify(shape),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    };

    try {
      await addMetric(metric);
      // Enforce retention asynchronously (don't block)
      enforceRetention(config.maxRecords).catch((err) => {
        console.warn('Failed to enforce metrics retention:', err);
      });
    } catch (error) {
      console.warn('Failed to record metric:', error);
    }
  },

  /**
   * Log to console (replaces perfLogger.log)
   */
  logToConsole(input: MetricInput): void {
    const icon = getDurationIcon(input.durationMs);
    const shapeStr = `${input.inputRows.toLocaleString()}×${input.inputCols} → ${input.outputRows.toLocaleString()}×${input.outputCols}`;

    if (input.success) {
      console.log(
        `${icon} ${input.transformType} — ${input.durationMs.toFixed(1)}ms`,
        `\n  ${shapeStr}`
      );
    } else {
      const errorMsg = input.metadata?.errorMessage || 'Unknown error';
      console.error(
        `❌ ${input.transformType} — ${input.durationMs.toFixed(1)}ms — FAILED`,
        `\n  ${shapeStr}`,
        `\n  Error: ${errorMsg}`
      );
    }
  },

  /**
   * Convenience method to time and record a transform execution
   */
  async measure<T>(
    transformType: string,
    inputData: any,
    metadata: MetricMetadata | undefined,
    fn: () => T
  ): Promise<T> {
    const inputShape = getDataShape(inputData);
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;
      const outputShape = getDataShape(result);

      await this.record({
        transformType,
        durationMs: duration,
        success: true,
        inputRows: inputShape.rows,
        inputCols: inputShape.cols,
        outputRows: outputShape.rows,
        outputCols: outputShape.cols,
        metadata,
      });

      return result;
    } catch (error: any) {
      const duration = performance.now() - start;

      await this.record({
        transformType,
        durationMs: duration,
        success: false,
        inputRows: inputShape.rows,
        inputCols: inputShape.cols,
        outputRows: 0,
        outputCols: 0,
        metadata: {
          ...metadata,
          errorMessage: error.message,
        },
      });

      throw error;
    }
  },

  /**
   * Get all recorded metrics (for virtual source)
   */
  async getAll(): Promise<TransformMetric[]> {
    return loadMetrics();
  },

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean {
    return loadMetricsConfig().enabled;
  },

  /**
   * Check if console logging is enabled
   */
  isConsoleLoggingEnabled(): boolean {
    return loadMetricsConfig().consoleLogging;
  },
};
