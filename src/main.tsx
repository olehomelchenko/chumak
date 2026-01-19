import { render } from 'preact';
import { SytoApp } from './syto-app';
import { App } from './app/components/App';
import { setupDebugHelpers } from './app/utils/debug-helpers';

import '../styles/index.css';

// Initialize the SINGLETON instance
const appInstance = new SytoApp();

// Mount the Main App Component
const appRoot = document.getElementById('app-root');
if (appRoot) {
  render(<App app={appInstance} />, appRoot);
} else {
  console.error('#app-root not found');
}

// Initialize the app services
appInstance.init();

// Setup debug helpers for development
setupDebugHelpers();
