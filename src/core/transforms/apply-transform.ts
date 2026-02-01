import { TRANSFORM_HANDLERS } from './handlers';
import { getUnknownTransformKey } from './utils';
import type { FullTransformStep, TransformContext } from './types';

/**
 * Apply a single transform to an Arquero table
 * Note: We use 'any' for the table type because arquero's ColumnTable type is complex
 * and doesn't play well with TypeScript's structural typing in some cases.
 */
export function applyTransform(
  table: any,
  transform: FullTransformStep,
  schema: string[],
  context: TransformContext | null = null
): any {
  // Future-proofing: Check for unknown transform keys
  const unknownKey = getUnknownTransformKey(transform);
  if (unknownKey) {
    console.warn(
      `Unknown transform key "${unknownKey}" encountered. Skipping this transform. ` +
        `This may be from a newer version of Syto. The workflow will continue with remaining transforms.`
    );
    return table; // Return table unchanged
  }

  // Find the matching handler and execute
  for (const [key, handler] of Object.entries(TRANSFORM_HANDLERS)) {
    if (transform[key as keyof FullTransformStep]) {
      return handler(table, transform, schema, context);
    }
  }

  // If we reach here, the transform object exists but none of the known keys matched
  // This should not happen if getUnknownTransformKey() catches it above, but as a safety fallback:
  const transformKeys = Object.keys(transform).filter((k) => k !== '__v');
  if (transformKeys.length > 0) {
    const key = transformKeys[0];
    console.warn(
      `Transform key "${key}" not recognized. Skipping this transform. ` +
        `This may be from a newer version of Syto. The workflow will continue with remaining transforms.`
    );
    return table; // Return table unchanged
  }

  // Empty transform object - return table unchanged
  return table;
}
