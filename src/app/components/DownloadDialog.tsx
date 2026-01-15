import { ExportService } from '../services/ExportService';
import { AppStore } from '../stores/AppStore';

export function DownloadDialog() {
  const close = () => {
    AppStore.activeDialog.value = null;
  };

  const showAlert = async (msg: string) => {
    // Basic alert using window.alert or we could hook into custom alert system
    // For now, let's use window.alert or console since we are inside a dialog context
    // and don't want to trigger another dialog easily without complex state handling.
    // However, AppStore has messageBox logic which can be triggered.
    // Note: triggering alert via AppStore might overlap if not handled carefully activeDialog.
    // But messageBox is separate from activeDialog in theory?
    // Wait, App.tsx renders global-dialogs separately? Yes, CenteredModal vs Alert.

    // Let's rely on standard window.alert for failure, or just log,
    // as successfully export shouldn't alert (it just downloads).
    // ExportService only alerts on error/empty.
    window.alert(msg);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <p
        style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-dark-gray)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        Select what you would like to download:
      </p>

      <button
        class="button button--secondary"
        onClick={() => {
          ExportService.exportCSV(showAlert);
          close();
        }}
        style={{
          justifyContent: 'flex-start',
          gap: 'var(--space-md)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span
          class="iconify"
          data-icon="material-symbols-light:csv-outline-rounded"
          style={{ width: '24px', height: '24px', flexShrink: 0 }}
        ></span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Recent Model (CSV)</div>
          <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
            Export current model data as a CSV file
          </div>
        </div>
      </button>

      <button
        class="button button--secondary"
        onClick={() => {
          ExportService.exportDataJSON(showAlert);
          close();
        }}
        style={{
          justifyContent: 'flex-start',
          gap: 'var(--space-md)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span
          class="iconify"
          data-icon="material-symbols-light:file-json-outline-rounded"
          style={{ width: '24px', height: '24px', flexShrink: 0 }}
        ></span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Recent Model (JSON)</div>
          <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
            Export current model data as a JSON file
          </div>
        </div>
      </button>

      <button
        class="button button--secondary"
        onClick={() => {
          ExportService.exportWorkflowJSON(showAlert);
          close();
        }}
        style={{
          justifyContent: 'flex-start',
          gap: 'var(--space-md)',
          padding: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span
          class="iconify"
          data-icon="carbon:document"
          style={{ width: '24px', height: '24px', flexShrink: 0 }}
        ></span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Workflow (JSON)</div>
          <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
            Export transformation steps as a JSON workflow
          </div>
        </div>
      </button>
    </div>
  );
}
