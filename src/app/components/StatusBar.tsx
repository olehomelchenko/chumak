import { AppStore } from '../stores/AppStore';
import styles from './StatusBar.module.css';
import { useTranslation } from 'preact-i18next';

export function StatusBar() {
  const { t } = useTranslation('common');
  const isTransforming = AppStore.isTransforming.value;
  const message = AppStore.transformMessage.value;

  if (!isTransforming) return null;

  return (
    <footer class={styles.statusBar}>
      <div class={styles.content}>
        <span class={styles.message}>{message || t('statusBar.processing')}</span>
        <div class={styles.loader}>
          <div class={styles.loaderBar}></div>
        </div>
      </div>
    </footer>
  );
}
