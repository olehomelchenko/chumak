export function describeImpute(transform: any): string | null {
  if (!transform.impute) return null;
  const { column, strategy } = transform.impute;
  const strategyLabels: Record<string, string> = {
    constant: 'Constant',
    mean: 'Mean',
    median: 'Median',
    min: 'Min',
    max: 'Max',
    forwardFill: 'Forward Fill',
    backwardFill: 'Backward Fill',
    linearInterpolation: 'Linear Interpolation',
  };
  return `Impute: ${column} (${strategyLabels[strategy] || strategy})`;
}

export const imputeDescribers = {
  impute: describeImpute,
};
