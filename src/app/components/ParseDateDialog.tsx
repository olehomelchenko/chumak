/**
 * ParseDateDialog - Parse date strings into date values using a format pattern
 */

import { useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import styles from './TransformDialog.module.css';
import { ColumnSelector } from './column-selector';
import { DialogStore } from '../stores/DialogStore';
import * as ParseDateHandlers from '../handlers/transform/parse-date-handlers';

export function ParseDateDialog() {
  const { t } = useTranslation('dialogs');
  const state = DialogStore.parseDateState;
  const { column, format, error } = state;

  const stringColumns = ParseDateHandlers.getStringColumns();
  const commonFormatsRaw = ParseDateHandlers.getCommonFormats();

  // Map format values to translation keys
  const formatKeyMap: Record<string, string> = {
    'YYYY-MM-DD': 'iso',
    'MM/DD/YYYY': 'us',
    'DD/MM/YYYY': 'eu',
    'MM/DD/YYYY HH:mm': 'usTime',
    'DD/MM/YYYY HH:mm': 'euTime',
    timestamp: 'unix',
  };

  // For formats not in the map, just show the format string as the label
  const commonFormats = commonFormatsRaw.map((fmt) => ({
    ...fmt,
    label: formatKeyMap[fmt.value] ? t(`parseDate.formats.${formatKeyMap[fmt.value]}`) : fmt.value,
  }));

  // Update preview when column or format changes
  useSignalEffect(() => {
    void column.value;
    void format.value;
    if (column.value && format.value) {
      ParseDateHandlers.updateParseDatePreview();
    } else {
      ParseDateHandlers.clearParseDatePreview();
    }
  });

  const sampleValue = column.value ? ParseDateHandlers.getSampleValue() : '';

  return (
    <div>
      {/* Source Column */}
      <div class={styles.group}>
        <ColumnSelector
          columns={stringColumns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          gridColumns={2}
          label={t('parseDate.sourceColumnLabel')}
          helpText={stringColumns.length === 0 ? t('parseDate.noColumnsHelp') : undefined}
        />
      </div>

      {column.value && (
        <>
          {/* Sample value hint */}
          {sampleValue && (
            <div class={styles.group}>
              <div class={styles.expressionHelp} style={{ marginTop: 0 }}>
                <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                  {t('parseDate.sampleValueLabel')}
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-family-mono)',
                    color: 'var(--color-text)',
                  }}
                >
                  {sampleValue}
                </div>
              </div>
            </div>
          )}

          {/* Format presets */}
          <div class={styles.group}>
            <label class={styles.label}>{t('parseDate.formatLabel')}</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.375rem',
                marginBottom: '0.75rem',
              }}
            >
              {commonFormats.map((fmt) => (
                <button
                  key={fmt.value}
                  type="button"
                  class={`${styles.toggleButton} ${format.value === fmt.value ? styles.active : ''}`}
                  style={{ justifyContent: 'center', fontSize: '0.75rem' }}
                  onClick={() => (format.value = fmt.value)}
                  title={`Example: ${fmt.example}`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* Custom format input */}
            <input
              type="text"
              class={styles.input}
              placeholder={t('parseDate.formatPlaceholder')}
              value={format.value}
              onInput={(e) => (format.value = (e.target as HTMLInputElement).value)}
            />
            <div class={styles.helpText}>{t('parseDate.formatHelp')}</div>
          </div>
        </>
      )}

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
