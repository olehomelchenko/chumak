export function describeSelect(transform: any): string | null {
  if (!transform.select) return null;
  const count = transform.select.length;
  return `Select: ${count} column${count !== 1 ? 's' : ''}`;
}

export function describeRemove(transform: any): string | null {
  if (!transform.remove) return null;
  const count = transform.remove.length;
  return `Remove: ${count} column${count !== 1 ? 's' : ''}`;
}

export function describeRename(transform: any): string | null {
  if (!transform.rename) return null;
  const count = Object.keys(transform.rename).length;
  return `Rename: ${count} column${count !== 1 ? 's' : ''}`;
}

export function describeSort(transform: any): string | null {
  if (!transform.sort) return null;
  return `Sort: ${transform.sort.field}`;
}

export function describeRenamePattern(transform: any): string | null {
  if (!transform.renamePattern) return null;
  const { find, replace: replacement, regex } = transform.renamePattern;
  const mode = regex ? 'regex' : 'text';
  return `Rename pattern: ${mode} "${find}" -> "${replacement}"`;
}

export const basicDescribers = {
  select: describeSelect,
  remove: describeRemove,
  rename: describeRename,
  sort: describeSort,
  renamePattern: describeRenamePattern,
};
