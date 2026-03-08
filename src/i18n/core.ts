/**
 * i18n Core - Portable translation registry
 *
 * Initializes i18next with translation resources. No Preact, no browser APIs.
 * This module can be used by src/core/ for transform descriptions, error messages, etc.
 *
 * The app layer (src/i18n/index.ts) builds on this by adding Preact bindings
 * and browser-specific language detection.
 */

import i18n from 'i18next';

// Import translation namespaces
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDialogs from './locales/en/dialogs.json';
import enTransforms from './locales/en/transforms.json';
import enErrors from './locales/en/errors.json';
import enUi from './locales/en/ui.json';
import enTools from './locales/en/tools.json';

import ukCommon from './locales/uk/common.json';
import ukSettings from './locales/uk/settings.json';
import ukDialogs from './locales/uk/dialogs.json';
import ukTransforms from './locales/uk/transforms.json';
import ukErrors from './locales/uk/errors.json';
import ukUi from './locales/uk/ui.json';
import ukTools from './locales/uk/tools.json';

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
      transforms: typeof enTransforms;
      errors: typeof enErrors;
      ui: typeof enUi;
      tools: typeof enTools;
    };
  }
}

/** Translation resources for all supported languages */
export const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    dialogs: enDialogs,
    transforms: enTransforms,
    errors: enErrors,
    ui: enUi,
    tools: enTools,
  },
  uk: {
    common: ukCommon,
    settings: ukSettings,
    dialogs: ukDialogs,
    transforms: ukTransforms,
    errors: ukErrors,
    ui: ukUi,
    tools: ukTools,
  },
};

/** All translation namespace names */
export const namespaces = [
  'common',
  'settings',
  'dialogs',
  'transforms',
  'errors',
  'ui',
  'tools',
] as const;

/**
 * Initialize i18next with default settings (English, no Preact bindings).
 * The app layer can re-initialize with Preact bindings and user language preference.
 */
if (!i18n.isInitialized) {
  i18n.init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...namespaces],
    interpolation: {
      escapeValue: false,
    },
    showSupportNotice: false,
  });
}

export default i18n;
