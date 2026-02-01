export function describeFilter(transform: any): string | null {
  if (!transform.filter) return null;
  const expr = transform.filter;
  // Simple truncation for long expressions
  const displayExpr = expr.length > 30 ? expr.substring(0, 27) + '...' : expr;
  return `Filter: ${displayExpr}`;
}

export function describeConditional(transform: any): string | null {
  if (!transform.conditional) return null;
  const { column, conditions } = transform.conditional;
  const count = conditions.length;
  return `Conditional: ${column} (${count} condition${count !== 1 ? 's' : ''})`;
}

export function describeReplace(transform: any): string | null {
  if (!transform.replace) return null;
  const { column, find } = transform.replace;
  const findDisplay = find === null ? '(null)' : String(find).substring(0, 20);
  return `Replace: ${column} = ${findDisplay}`;
}

export const filterDescribers = {
  filter: describeFilter,
  conditional: describeConditional,
  replace: describeReplace,
};
