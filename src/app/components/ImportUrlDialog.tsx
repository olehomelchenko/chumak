import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';

interface ImportUrlDialogProps {
  onImport: () => void;
}

export function ImportUrlDialog({ onImport }: ImportUrlDialogProps) {
  const { url, error, isFetching } = DialogStore.importUrlState;

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>CSV URL:</label>
        <input
          type="url"
          class={styles.input}
          value={url.value}
          onInput={(e) => {
            url.value = (e.target as HTMLInputElement).value;
          }}
          placeholder="https://example.com/data.csv"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onImport();
            }
          }}
          autoFocus
        />
        <p class={styles.helpText}>Enter the direct link to a CSV or TSV file.</p>
      </div>

      {error.value && (
        <div class={styles.error} style={{ marginTop: '1rem' }}>
          <span class="iconify" data-icon="carbon:warning"></span>
          <span>{error.value}</span>
        </div>
      )}

      {isFetching.value && (
        <div
          class={styles.helpText}
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span class="iconify spinning" data-icon="carbon:renew"></span>
          <span>Fetching data...</span>
        </div>
      )}
    </div>
  );
}
