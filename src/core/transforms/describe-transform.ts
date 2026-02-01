import { TRANSFORM_DESCRIBERS } from './describers';

/**
 * Generate human-readable description for steps list
 */
export function describeTransform(transform: any, rightName: string | null = null): string {
  for (const describer of Object.values(TRANSFORM_DESCRIBERS)) {
    const result = describer(transform, rightName);
    if (result) return result;
  }
  return 'Unknown transform';
}
