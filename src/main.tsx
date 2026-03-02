import { render } from 'preact';
import { I18nextProvider } from 'preact-i18next';
import i18n from './i18n';
import { SytoApp } from './syto-app';
import { App } from './app/components/App';
import { setupDebugHelpers } from './app/utils/debug-helpers';

import '../styles/index.css';

// Initialize the SINGLETON instance (for init and callback setup)
const appInstance = new SytoApp();

// Mount the Main App Component
const appRoot = document.getElementById('app-root');
if (appRoot) {
  render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
    appRoot
  );
} else {
  console.error('#app-root not found');
}

// Initialize the app services (sets up callbacks for handlers)
appInstance.init();

// Setup debug helpers for development
setupDebugHelpers();
