/**
 * Syto Metrics Module
 *
 * Performance metrics collection for transform operations.
 */

// Types
export type {
  TransformMetric,
  MetricShape,
  MetricMetadata,
  MetricInput,
  MetricsConfig,
} from './types';
export { DEFAULT_METRICS_CONFIG } from './types';

// Collector (main API)
export { metricsCollector, getDataShape } from './metrics-collector';

// Storage
export {
  loadMetrics,
  clearMetrics,
  getMetricsCount,
  loadMetricsConfig,
  saveMetricsConfig,
  updateMetricsConfig,
  invalidateMetricsCache,
} from './metrics-storage';
