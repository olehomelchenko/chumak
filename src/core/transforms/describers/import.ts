export function describeImport(transform: any): string | null {
  if (!transform.import) return null;
  const config = transform.import;
  let desc = `Import: ${config.source}`;

  // Add header mode description
  if (config.headerMode === 'first-row') {
    desc += ' (headers from first row)';
  } else if (config.headerMode === 'auto-generate') {
    desc += ' (auto-generated headers)';
  } else if (config.headerMode === 'manual') {
    desc += ' (custom headers)';
  }

  return desc;
}

export const importDescribers = {
  import: describeImport,
};
