/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module '*.md' {
  const html: string;
  export { html };
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}
