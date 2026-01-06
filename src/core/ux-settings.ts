/**
 * Chumak UX Settings - localStorage-based user preferences
 */

const UX_SETTINGS_KEY = 'chumak-ux-settings';

export interface UXSettings {
  pagination: {
    pageSize: number;
  };
}

// Default settings
const DEFAULT_SETTINGS: UXSettings = {
  pagination: {
    pageSize: 500,
  },
};

/**
 * Load UX settings from localStorage
 */
export function loadUXSettings(): UXSettings {
  try {
    const stored = localStorage.getItem(UX_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pagination: {
          ...DEFAULT_SETTINGS.pagination,
          ...parsed.pagination,
        },
      };
    }
  } catch (error) {
    console.error('Failed to load UX settings:', error);
  }

  return { ...DEFAULT_SETTINGS };
}

/**
 * Save UX settings to localStorage
 */
export function saveUXSettings(settings: UXSettings): void {
  try {
    localStorage.setItem(UX_SETTINGS_KEY, JSON.stringify(settings));
    console.log('UX settings saved:', settings);
  } catch (error) {
    console.error('Failed to save UX settings:', error);
  }
}

/**
 * Update a specific setting and save
 */
export function updateUXSetting(category: keyof UXSettings, key: string, value: any): UXSettings {
  const settings = loadUXSettings();

  if (!(settings as any)[category]) {
    (settings as any)[category] = {};
  }

  (settings as any)[category][key] = value;
  saveUXSettings(settings);

  return settings;
}

/**
 * Reset settings to defaults
 */
export function resetUXSettings(): UXSettings {
  saveUXSettings({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}
