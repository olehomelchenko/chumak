/**
 * i18n App Configuration - Preact bindings and browser language detection
 *
 * Builds on ./core.ts (portable i18n registry) by adding:
 * - Preact integration (I18nextProvider, useTranslation hooks)
 * - Browser-specific language detection from localStorage
 *
 * App-layer code should import from here. Core-layer code should import from ./core.
 */

import { initReactI18next } from 'preact-i18next';
import { loadUXSettings } from '../app/infrastructure/ux-settings';
import i18n, { resources, namespaces } from './core';

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
 * Re-initialize i18next with Preact bindings and user's language preference.
 *
 * Note: i18next automatically handles Ukrainian plural rules (3 forms).
 */
i18n.use(initReactI18next).init({
  resources,
  lng: uxSettings.language,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...namespaces],
  interpolation: {
    escapeValue: false, // Preact already escapes HTML
  },
  showSupportNotice: false,
});

export default i18n;
