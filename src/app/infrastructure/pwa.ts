import { signal } from '@preact/signals';
import { registerSW } from 'virtual:pwa-register';

/** True when a new service worker is waiting to activate */
export const updateAvailable = signal(false);

const doUpdate = registerSW({
  onNeedRefresh() {
    updateAvailable.value = true;
  },
});

/** Activate the waiting service worker and reload the page */
export function applyUpdate(): void {
  doUpdate(true);
  window.location.reload();
}
