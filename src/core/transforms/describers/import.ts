import i18n from '../../../i18n/core';

export function describeImport(transform: any): string | null {
  if (!transform.import) return null;
  const config = transform.import;

  // Get header mode description
  let headerDesc = '';
  if (config.headerMode && ['first-row', 'auto-generate', 'manual'].includes(config.headerMode)) {
    headerDesc = i18n.t(`transforms:import.headerModes.${config.headerMode}` as any);
  }

  return i18n.t('transforms:import.import', { source: config.source, headerDesc });
}

export const importDescribers = {
  import: describeImport,
};
