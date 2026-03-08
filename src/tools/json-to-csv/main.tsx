import { render } from 'preact';
import { I18nextProvider, initReactI18next } from 'preact-i18next';
import i18n, { resources, namespaces } from '../../i18n/core';
import { JsonToCsvApp } from './JsonToCsvApp';

// Lightweight language detection — reads the same localStorage key as the main
// app without importing the app infrastructure layer.
function detectLanguage(): string {
  try {
    const raw = localStorage.getItem('syto-ux-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.language === 'uk') return 'uk';
    }
  } catch {
    // ignore
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...namespaces],
  interpolation: { escapeValue: false },
  showSupportNotice: false,
});

const root = document.getElementById('tool-root');
if (root) {
  render(
    <I18nextProvider i18n={i18n}>
      <JsonToCsvApp />
    </I18nextProvider>,
    root
  );
}
