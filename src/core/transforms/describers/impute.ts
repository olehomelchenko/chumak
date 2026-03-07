import i18n from '../../../i18n/core';

export function describeImpute(transform: any): string | null {
  if (!transform.impute) return null;
  const { column, strategy } = transform.impute;
  const strategyLabel = i18n.t(`transforms:impute.strategies.${strategy}`, strategy);
  return i18n.t('transforms:impute.impute', { column, strategy: strategyLabel });
}

export const imputeDescribers = {
  impute: describeImpute,
};
