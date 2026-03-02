/**
 * Syto UX Settings - localStorage-based user preferences
 */

const UX_SETTINGS_KEY = 'syto-ux-settings';

export interface UXSettings {
  pagination: {
    pageSize: number;
  };
  preview: {
    rowLimit: number;
  };
  theme: 'blues' | 'syto';
  analyticsOptOut: boolean;
  language: 'en' | 'uk';
}

// Default settings
const DEFAULT_SETTINGS: UXSettings = {
  pagination: {
    pageSize: 500,
  },
  preview: {
    rowLimit: 100,
  },
  theme: 'syto',
  analyticsOptOut: false, // Analytics enabled by default
  language: 'en',
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
        preview: {
          ...DEFAULT_SETTINGS.preview,
          ...parsed.preview,
        },
        theme: parsed.theme || DEFAULT_SETTINGS.theme,
        analyticsOptOut: parsed.analyticsOptOut ?? DEFAULT_SETTINGS.analyticsOptOut,
        language: parsed.language || DEFAULT_SETTINGS.language,
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
  } catch (error) {
    console.error('Failed to save UX settings:', error);
  }
}

/**
 * Update a specific setting and save
 */
export function updateUXSetting(category: keyof UXSettings, key: string, value: any): UXSettings {
  const settings = loadUXSettings();

  if (key === '') {
    (settings as any)[category] = value;
  } else {
    if (!(settings as any)[category]) {
      (settings as any)[category] = {};
    }
    (settings as any)[category][key] = value;
  }

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
