/**
 * Chumak URL State - manages application state in the URL
 *
 * Minimal implementation: #/{sourceId}[/{modelId}]
 */

/**
 * Get state from URL
 * @returns {Object} State object
 */
function getUrlState() {
    const hash = window.location.hash.substring(1); // Remove #
    const state = {};

    if (hash) {
        const parts = hash.split('/').filter(p => p !== '');

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
 * @param {Object} state - Current state to persist
 */
function setUrlState(state) {
    let hashPath = '';

    if (state.sourceId) {
        hashPath += `/${state.sourceId}`;

        if (state.modelId) {
            hashPath += `/${state.modelId}`;
        }
    }

    // Update hash without reloading. 
    // We use replaceState to avoid cluttering history with every minor state change if we had them,
    // but here it's mainly for source/model navigation.
    const url = new URL(window.location.href);
    url.hash = hashPath;
    // Clear any query params as we are dropping them
    url.search = '';

    window.history.replaceState({}, '', url.toString());
}
