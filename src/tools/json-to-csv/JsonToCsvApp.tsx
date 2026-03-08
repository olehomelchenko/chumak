import { useTranslation } from 'preact-i18next';
import { rawJson, error, isValidArray } from './state';
import { InputPanel } from './components/InputPanel';
import { PathSelector } from './components/PathSelector';
import { OptionsPanel } from './components/OptionsPanel';
import { PreviewTable } from './components/PreviewTable';
import { DownloadButton } from './components/DownloadButton';
import { CtaBanner } from './components/CtaBanner';
import styles from './JsonToCsv.module.css';

export function JsonToCsvApp() {
  const { t } = useTranslation('tools');
  const hasData = rawJson.value !== null;

  return (
    <div class={styles.converter}>
      {/* Left sidebar — path selector + options */}
      <div class={styles.sidebar}>
        {hasData && !error.value && <PathSelector />}
        {hasData && !error.value && isValidArray.value && <OptionsPanel />}
      </div>

      {/* Top panel — textarea input */}
      <InputPanel />

      {/* Bottom panel — preview table + download */}
      <div class={styles.bottomPanel}>
        {error.value && (
          <div class={styles.error}>
            {error.value === 'emptyFile'
              ? t('jsonToCsv.errors.emptyFile')
              : t('jsonToCsv.errors.parseError', { message: error.value })}
          </div>
        )}

        {hasData && !error.value && !isValidArray.value && (
          <div class={styles.error}>{t('jsonToCsv.errors.noArray')}</div>
        )}

        <PreviewTable />
        <DownloadButton />
      </div>

      {/* CTA — full width below grid */}
      <CtaBanner />
    </div>
  );
}
