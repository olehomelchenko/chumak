/**
 * i18n Configuration for Syto
 *
 * Uses i18next with preact-i18next for internationalization support.
 * Currently supports English (en) and Ukrainian (uk).
 */

import i18n from 'i18next';
import { initReactI18next } from 'preact-i18next';
import { loadUXSettings } from '../core/ux-settings';

// Import translation namespaces
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDialogs from './locales/en/dialogs.json';

import ukCommon from './locales/uk/common.json';
import ukSettings from './locales/uk/settings.json';
import ukDialogs from './locales/uk/dialogs.json';

/**
 * Ukrainian Plural Rules (handled automatically by i18next)
 *
 * Ukrainian has 3 plural forms:
 * - Form 0: ends with 1 (but not 11): 1, 21, 31, 41, ...
 * - Form 1: ends with 2-4 (but not 12-14): 2, 3, 4, 22, 23, 24, ...
 * - Form 2: everything else: 0, 5-20, 25-30, ...
 *
 * Examples:
 * - 1 рядок (1 row)
 * - 2 рядки (2 rows)
 * - 5 рядків (5 rows)
 * - 21 рядок (21 rows)
 *
 * i18next handles these automatically when using translation keys with _0, _1, _2 suffixes.
 */

/**
 * TypeScript type augmentation for i18next
 *
 * This provides autocomplete and type-checking for:
 * - Namespace names in useTranslation('namespace')
 * - Translation keys in t('key.path')
 * - Interpolation variables
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      settings: typeof enSettings;
      dialogs: typeof enDialogs;
    };
  }
}

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language display names (in their native language)
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  uk: 'Українська',
};

/**
 * Load user's language preference from localStorage before initialization
 * This prevents the race condition where the app renders in English
 * before switching to the user's preferred language.
 */
const uxSettings = loadUXSettings();

/**
 * Initialize i18next
 *
 * Note: i18next automatically handles Ukrainian plural rules (3 forms).
 */
i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      settings: enSettings,
      dialogs: enDialogs,
    },
    uk: {
      common: ukCommon,
      settings: ukSettings,
      dialogs: ukDialogs,
    },
  },
  lng: uxSettings.language, // Initialize with user's saved preference
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'settings', 'dialogs'],
  interpolation: {
    escapeValue: false, // Preact already escapes HTML
  },
});

export default i18n;
