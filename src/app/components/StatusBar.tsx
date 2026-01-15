import { AppStore } from '../stores/AppStore';

export function StatusBar() {
  const isTransforming = AppStore.isTransforming.value;
  const message = AppStore.transformMessage.value;

  if (!isTransforming) return null;

  return (
    <footer class="status-bar">
      <div class="status-bar__content">
        <span class="status-bar__message">{message || 'Processing...'}</span>
        <div class="status-bar__loader">
          <div class="status-bar__loader-bar"></div>
        </div>
      </div>
    </footer>
  );
}
