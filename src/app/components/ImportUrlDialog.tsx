import { DialogStore } from '../stores/DialogStore';
// import { fetchAndImportFromUrl } from '../handlers/import-handlers';

interface ImportUrlDialogProps {
  onImport: () => void;
}

export function ImportUrlDialog({ onImport }: ImportUrlDialogProps) {
  const { url, error, isFetching } = DialogStore.importUrlState;

  return (
    <div class="dialog-content">
      <div class="form-group">
        <label class="form-label">CSV URL:</label>
        <input
          type="url"
          class="form-input"
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
        <p class="form-help">Enter the direct link to a CSV or TSV file.</p>
      </div>

      {error.value && (
        <div class="form-error" style={{ marginTop: '1rem' }}>
          <span class="iconify" data-icon="carbon:warning"></span>
          <span>{error.value}</span>
        </div>
      )}

      {isFetching.value && (
        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-dark-gray)',
          }}
        >
          <span class="iconify spinning" data-icon="carbon:renew"></span>
          <span>Fetching data...</span>
        </div>
      )}
    </div>
  );
}
