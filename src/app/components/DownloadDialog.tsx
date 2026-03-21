import { useTranslation } from 'preact-i18next';
import { ExportService } from '../services/ExportService';
import { AppStore } from '../stores/AppStore';
import formStyles from './form-controls.module.css';
import dlStyles from './DownloadDialog.module.css';
const styles = { ...formStyles, ...dlStyles };

export function DownloadDialog() {
  const { t } = useTranslation('dialogs');

  const close = () => {
    AppStore.activeDialog.value = null;
  };

  const showAlert = async (msg: string) => {
    window.alert(msg);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <p class={styles.helpText} style={{ marginBottom: 'var(--space-sm)', fontSize: '1rem' }}>
        {t('download.prompt')}
      </p>

      <button
        class={`button button--secondary ${styles.downloadOption}`}
        onClick={() => {
          ExportService.exportCSV(showAlert);
          close();
        }}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="material-symbols-light:csv-outline-rounded"
        ></span>
        <div class={styles.downloadInfo}>
          <div>{t('download.csvTitle')}</div>
          <div>{t('download.csvDesc')}</div>
        </div>
      </button>

      <button
        class={`button button--secondary ${styles.downloadOption}`}
        onClick={() => {
          ExportService.exportDataJSON(showAlert);
          close();
        }}
      >
        <span
          class="iconify"
          aria-hidden="true"
          data-icon="material-symbols-light:file-json-outline-rounded"
        ></span>
        <div class={styles.downloadInfo}>
          <div>{t('download.jsonTitle')}</div>
          <div>{t('download.jsonDesc')}</div>
        </div>
      </button>

      <button
        class={`button button--secondary ${styles.downloadOption}`}
        onClick={() => {
          ExportService.exportWorkflowV2(showAlert);
          close();
        }}
      >
        <span class="iconify" aria-hidden="true" data-icon="carbon:document"></span>
        <div class={styles.downloadInfo}>
          <div>{t('download.workflowTitle')}</div>
          <div>{t('download.workflowDesc')}</div>
        </div>
      </button>
    </div>
  );
}
