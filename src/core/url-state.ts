/**
 * Chumak URL State - manages application state in the URL
 */

export interface URLState {
  sourceId?: string;
  modelId?: string;
}

/**
 * Get state from URL
 */
export function getUrlState(): URLState {
  const hash = window.location.hash.substring(1);
  const state: URLState = {};

  if (hash) {
    const parts = hash.split('/').filter((p) => p !== '');

    if (parts.length >= 1) {
      state.sourceId = parts[0];
    }

    if (parts.length >= 2) {
      state.modelId = parts[1];
    }
  }

  return state;
}

/**
 * Update URL with current state
 */
export function setUrlState(state: URLState): void {
  let hashPath = '';

  if (state.sourceId) {
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
