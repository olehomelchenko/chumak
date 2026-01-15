import { render } from 'preact';
import { ChumakApp } from './chumak-app';
import { App } from './app/components/App';

import '../styles/index.css';

// Initialize the SINGLETON instance
const appInstance = new ChumakApp();

// Mount the Main App Component
const appRoot = document.getElementById('app-root');
if (appRoot) {
  render(<App app={appInstance} />, appRoot);
} else {
  console.error('#app-root not found');
}

// Initialize the app services
// Note: Alpine's x-data="chumakApp()" creates ANOTHER instance and initializes it via x-init usually?
// But index.html body x-data="chumakApp()" doesn't have x-init.
// ChumakApp constructor calls `loadUXSettings`.
// `main.ts` previously called `appInstance.init()`.
// We should call init on our instance to ensure services start (loading initial data etc).
appInstance.init();
