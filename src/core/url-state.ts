/**
 * Chumak URL State - manages application state in the URL
 */

export interface URLState {
  sourceId?: string;
  modelId?: string;
  page?: string; // 'about', 'reference', 'expressions', 'settings'
  section?: string; // e.g., 'filter' for reference/filter
}

/**
 * Get state from URL
 */
export function getUrlState(): URLState {
  const hash = window.location.hash.substring(1);
  const state: URLState = {};

  if (hash) {
    const parts = hash.split('/').filter((p) => p !== '');

    // Check for special pages first
    if (
      parts[0] === 'about' ||
      parts[0] === 'reference' ||
      parts[0] === 'expressions' ||
      parts[0] === 'settings'
    ) {
      state.page = parts[0];
      if (parts.length >= 2) {
        state.section = parts[1];
      }
    } else if (parts.length >= 1) {
      state.sourceId = parts[0];
      if (parts.length >= 2) {
        state.modelId = parts[1];
      }
    }
  }

  return state;
}

/**
 * Update URL with current state
 */
export function setUrlState(state: URLState): void {
  let hashPath = '';

  if (state.page) {
    hashPath += `/${state.page}`;
    if (state.section) {
      hashPath += `/${state.section}`;
    }
  } else if (state.sourceId) {
    hashPath += `/${state.sourceId}`;
    if (state.modelId) {
      hashPath += `/${state.modelId}`;
    }
  }

  const url = new URL(window.location.href);
  url.hash = hashPath;
  url.search = '';

  window.history.replaceState({}, '', url.toString());
}

/**
 * Clear hash from URL
 */
export function clearUrlHash(): void {
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState({}, '', url.toString());
}
