/**
 * Syto Transform Engine
 *
 * This module provides the core transform functionality for Syto.
 * All transforms are modularized into handlers/ and describers/ subdirectories.
 */

// Main functions
export { applyTransform } from './apply-transform';
export { describeTransform } from './describe-transform';

// Types and interfaces
export type { MatchOptions, TransformContext, FullTransformStep } from './types';
export { KNOWN_TRANSFORM_KEYS } from './types';

// Utilities (for external use)
export { matchColumnPattern } from './utils';
