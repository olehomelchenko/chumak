/**
 * Chumak UX Settings - localStorage-based user preferences
 *
 * Stores user preferences for UI/UX settings like pagination page size,
 * theme preferences, etc.
 *
 * NOTE: This architecture is intentionally generic to support expansion.
 * Additional setting categories will be added soon (theme, export format, etc.).
 */

const UX_SETTINGS_KEY = 'chumak-ux-settings';

// Default settings
const DEFAULT_SETTINGS = {
  pagination: {
    pageSize: 500  // Generous default
  }
};

/**
 * Load UX settings from localStorage
 * @returns {Object} Settings object
 */
function loadUXSettings() {
  try {
    const stored = localStorage.getItem(UX_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return {
        pagination: {
          ...DEFAULT_SETTINGS.pagination,
          ...parsed.pagination
        }
      };
    }
  } catch (error) {
    console.error('Failed to load UX settings:', error);
  }

  return { ...DEFAULT_SETTINGS };
}

/**
 * Save UX settings to localStorage
 * @param {Object} settings - Settings object
 */
function saveUXSettings(settings) {
  try {
    localStorage.setItem(UX_SETTINGS_KEY, JSON.stringify(settings));
    console.log('UX settings saved:', settings);
  } catch (error) {
    console.error('Failed to save UX settings:', error);
  }
}

/**
 * Update a specific setting and save
 * @param {string} category - Setting category (e.g., 'pagination')
 * @param {string} key - Setting key (e.g., 'pageSize')
 * @param {*} value - New value
 */
function updateUXSetting(category, key, value) {
  const settings = loadUXSettings();

  if (!settings[category]) {
    settings[category] = {};
  }

  settings[category][key] = value;
  saveUXSettings(settings);

  return settings;
}

/**
 * Reset settings to defaults
 */
function resetUXSettings() {
  saveUXSettings({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}
