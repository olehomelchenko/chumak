import { ExportService } from '../services/ExportService';
import { AppStore } from '../stores/AppStore';
import formStyles from './form-controls.module.css';
import dlStyles from './DownloadDialog.module.css';
const styles = { ...formStyles, ...dlStyles };

export function DownloadDialog() {
  const close = () => {
    AppStore.activeDialog.value = null;
  };

  const showAlert = async (msg: string) => {
    window.alert(msg);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <p class={styles.helpText} style={{ marginBottom: 'var(--space-sm)', fontSize: '1rem' }}>
        Select what you would like to download:
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
          <div>Recent Model (CSV)</div>
          <div>Export current model data as a CSV file</div>
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
          <div>Recent Model (JSON)</div>
          <div>Export current model data as a JSON file</div>
        </div>
      </button>

      <button
        class={`button button--secondary ${styles.downloadOption}`}
        onClick={() => {
          ExportService.exportWorkflowJSON(showAlert);
          close();
        }}
      >
        <span class="iconify" aria-hidden="true" data-icon="carbon:document"></span>
        <div class={styles.downloadInfo}>
          <div>Workflow (JSON)</div>
          <div>Export transformation steps as a JSON workflow</div>
        </div>
      </button>
    </div>
  );
}
