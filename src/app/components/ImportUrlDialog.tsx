import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import styles from './form-controls.module.css';

interface ImportUrlDialogProps {
  onImport: () => void;
}

interface SampleDataset {
  filename: string;
  label: string;
  size: string;
  sourceUrl: string;
  license: string;
}

const SAMPLE_DATASETS: SampleDataset[] = [
  {
    filename: 'cars.json',
    label: 'Cars (Auto MPG)',
    size: '406 × 9',
    sourceUrl: 'https://archive.ics.uci.edu/dataset/9/auto-mpg',
    license: 'CC BY 4.0',
  },
  {
    filename: 'iris.json',
    label: 'Iris',
    size: '150 × 5',
    sourceUrl: 'https://archive.ics.uci.edu/dataset/53/iris',
    license: 'CC BY 4.0',
  },
  {
    filename: 'superstore.csv',
    label: 'Superstore',
    size: '10,194 × 21',
    sourceUrl: 'https://public.tableau.com/app/learn/sample-data',
    license: 'Tableau Public',
  },
  {
    filename: 'weather.csv',
    label: 'Weather',
    size: '2,922 × 7',
    sourceUrl: 'https://www.ncdc.noaa.gov/',
    license: 'Public domain',
  },
  {
    filename: 'airports.csv',
    label: 'US Airports',
    size: '3,376 × 7',
    sourceUrl: 'https://www.faa.gov/airports',
    license: 'Public domain',
  },
  {
    filename: 'unemployment-across-industries.json',
    label: 'Unemployment',
    size: '1,708 × 6',
    sourceUrl: 'https://www.bls.gov/',
    license: 'Public domain',
  },
  {
    filename: 'sp500.csv',
    label: 'S&P 500',
    size: '123 × 2',
    sourceUrl: 'https://github.com/datasets/s-and-p-500',
    license: 'PDDL',
  },
  {
    filename: 'stocks.csv',
    label: 'Stock Prices',
    size: '559 × 3',
    sourceUrl: 'https://github.com/vega/vega-datasets',
    license: 'BSD-3',
  },
  {
    filename: 'barley.json',
    label: 'Barley Yields',
    size: '120 × 4',
    sourceUrl: 'https://github.com/vega/vega-datasets',
    license: 'BSD-3',
  },
  {
    filename: 'anscombe.json',
    label: "Anscombe's Quartet",
    size: '44 × 3',
    sourceUrl: 'https://en.wikipedia.org/wiki/Anscombe%27s_quartet',
    license: 'Public domain',
  },
];

export function ImportUrlDialog({ onImport }: ImportUrlDialogProps) {
  const { t } = useTranslation('dialogs');
  const { url, error, isFetching } = DialogStore.importUrlState;

  const handleDatasetClick = (filename: string, e: Event) => {
    e.preventDefault();
    DialogStore.importUrlState.url.value = `${window.location.origin}/datasets/${filename}`;
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
          {SAMPLE_DATASETS.map((dataset) => (
            <div
              key={dataset.filename}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginBottom: '0.25rem',
              }}
            >
              <a
                href={`/datasets/${dataset.filename}`}
                onClick={(e) => handleDatasetClick(dataset.filename, e)}
                class={styles.link}
              >
                {dataset.label}
              </a>
              <span
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-xs)',
                }}
              >
                ({dataset.size})
              </span>
              <a
                href={dataset.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`${dataset.license} — ${dataset.sourceUrl}`}
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-xs)',
                  lineHeight: 1,
                  opacity: 0.6,
                }}
              >
                <span class="iconify" aria-hidden="true" data-icon="carbon:information" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {error.value && (
        <div class={styles.error} style={{ marginTop: '1rem' }}>
          <span class="iconify" aria-hidden="true" data-icon="carbon:warning"></span>
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
