import { AppStore } from '../stores/AppStore';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const isTransforming = AppStore.isTransforming.value;
  const message = AppStore.transformMessage.value;

  if (!isTransforming) return null;

  return (
    <footer class={styles.statusBar}>
      <div class={styles.content}>
        <span class={styles.message}>{message || 'Processing...'}</span>
        <div class={styles.loader}>
          <div class={styles.loaderBar}></div>
        </div>
      </div>
    </footer>
  );
}
