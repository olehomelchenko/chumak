import { TRANSFORM_DESCRIBERS } from './describers';
import i18n from '../../i18n';

/**
 * Generate human-readable description for steps list
 */
export function describeTransform(transform: any, rightName: string | null = null): string {
  for (const describer of Object.values(TRANSFORM_DESCRIBERS)) {
    const result = describer(transform, rightName);
    if (result) return result;
  }
  return i18n.t('transforms:unknown');
}
