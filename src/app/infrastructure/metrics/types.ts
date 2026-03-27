/**
 * Syto Metrics - Type Definitions
 *
 * Performance metrics for transform operations, exposed as a virtual dataset.
 */

/**
 * A single transform metric record.
 * Simplified schema: core fields are top-level, details packed into JSON strings.
 */
export interface TransformMetric {
  /** Unique identifier (UUID) */
  id: string;
  /** ISO timestamp when transform was executed */
  timestamp: string;
  /** Transform type: 'filter', 'derive', 'join', etc. */
  transformType: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether transform completed successfully */
  success: boolean;
  /**
   * JSON string with data shape info:
   * { inputRows, inputCols, outputRows, outputCols, rowDelta, colDelta, rowsPerMs }
   */
  shape: string;
  /**
   * JSON string with transform-specific metadata (nullable):
   * { modelId, stepIndex, joinType, expressionCount, etc. }
   */
  metadata: string | null;
}

/**
 * Shape data embedded in the `shape` JSON field
 */
export interface MetricShape {
  inputRows: number;
  inputCols: number;
  outputRows: number;
  outputCols: number;
  rowDelta: number;
  colDelta: number;
  rowsPerMs: number;
}

/**
 * Metadata embedded in the `metadata` JSON field
 */
export interface MetricMetadata {
  modelId?: string;
  stepIndex?: number;
  // Transform-specific fields
  joinType?: string;
  rightTableRows?: number;
  expressionCount?: number;
  aggregationCount?: number;
  patternType?: string;
  // Error info (when success=false)
  errorMessage?: string;
}

/**
 * Input for recording a metric (before ID/timestamp are generated).
 *
 * Shape fields are optional — omit them for non-tabular operations
 * (e.g. "import", "export:csv", "storage:save", "duckdb:init").
 */
export interface MetricInput {
  transformType: string;
  durationMs: number;
  success: boolean;
  inputRows?: number;
  inputCols?: number;
  outputRows?: number;
  outputCols?: number;
  metadata?: MetricMetadata;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Whether metrics collection is enabled */
  enabled: boolean;
  /** Maximum number of records to retain (FIFO) */
  maxRecords: number;
  /** Whether to log metrics to the browser console */
  consoleLogging: boolean;
}

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  enabled: true,
  maxRecords: 10000,
  consoleLogging: true,
};
