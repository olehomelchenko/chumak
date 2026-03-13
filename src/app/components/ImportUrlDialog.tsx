import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import styles from './form-controls.module.css';

interface ImportUrlDialogProps {
  onImport: () => void;
}

const POPULAR_DATASETS = [
  'cars.json',
  'movies.json',
  'iris.json',
  'unemployment.json',
  'weather.csv',
  'barley.json',
  'stocks.json',
  'anscombe.json',
  'airports.csv',
  'jobs.json',
  'population.json',
  'sp500.csv',
];

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/npm/vega-datasets@latest/data';

export function ImportUrlDialog({ onImport }: ImportUrlDialogProps) {
  const { t } = useTranslation('dialogs');
  const { url, error, isFetching } = DialogStore.importUrlState;

  const handleDatasetClick = (filename: string, e: Event) => {
    e.preventDefault();
    DialogStore.importUrlState.url.value = `${CDN_BASE_URL}/${filename}`;
    DialogStore.importUrlState.error.value = null;
    onImport();
  };

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>{t('importUrl.urlLabel')}</label>
        <input
          type="url"
          class={styles.input}
          value={url.value}
          onInput={(e) => {
            url.value = (e.target as HTMLInputElement).value;
            DialogStore.importUrlState.error.value = null;
          }}
          placeholder="https://example.com/data.csv"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onImport();
            }
          }}
          autoFocus
        />
        <p class={styles.helpText}>{t('importUrl.helpText')}</p>
      </div>

      <div class={styles.group} style={{ marginTop: '1rem' }}>
        <p class={styles.helpText} style={{ marginBottom: '0.5rem' }}>
          {t('importUrl.sampleDatasets')}
        </p>
        <div>
          {POPULAR_DATASETS.map((filename) => (
            <div key={filename} style={{ marginBottom: '0.25rem' }}>
              <a
                href={`${CDN_BASE_URL}/${filename}`}
                onClick={(e) => handleDatasetClick(filename, e)}
                style={{
                  color: 'var(--color-cyan)',
                  textDecoration: 'none',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.textDecoration = 'none';
                }}
              >
                {filename}
              </a>
            </div>
          ))}
        </div>
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
          <span>{t('importUrl.fetching')}</span>
        </div>
      )}
    </div>
  );
}
