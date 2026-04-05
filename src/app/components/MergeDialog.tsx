/**
 * MergeDialog - Preact component for merging/concatenating columns
 */

import { signal, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { computeMergePreview } from '../handlers/transform/merge-handlers';
import { ColumnSelector } from './column-selector/ColumnSelector';
import i18n from '../../i18n';
import styles from './form-controls.module.css';

export function MergeDialog() {
  const { t } = useTranslation('dialogs');
  const allColumns = AppStore.columns.value;

  const { state } = useDialogState(
    () => ({
      columns: signal<string[]>([...(AppStore.selectedColumns.value || [])]),
      separator: signal(' '),
      columnName: signal(''),
      removeOriginal: signal(false),
      error: signal<string | null>(null),
    }),
    {
      hasError: (s) =>
        !!s.error.value || s.columns.value.length === 0 || !s.columnName.value?.trim(),
      getError: (s) => s.error.value,
      getState: (s) => ({
        columns: s.columns.value,
        separator: s.separator.value,
        columnName: s.columnName.value,
        removeOriginal: s.removeOriginal.value,
      }),
    }
  );

  const { columns, separator, columnName, removeOriginal, error } = state;

  // Auto-generate column name from selected columns (only if empty)
  useSignalEffect(() => {
    if (!columnName.value.trim() && columns.value.length > 0) {
      const baseName = columns.value.join('_');
      columnName.value = baseName + '_merged';
    }
  });

  useTransformPreview({
    deps: () => {
      columns.value;
      separator.value;
      columnName.value;
    },
    compute: () => {
      error.value = null;
      if (!columns.value.length || !columnName.value) {
        if (columns.value.length > 0 && !columnName.value) {
          error.value = i18n.t('validation.required.outputColumnName', { ns: 'errors' });
        }
        return null;
      }
      return computeMergePreview(columns.value, separator.value, columnName.value, allColumns);
    },
    onError: (err) => {
      error.value = err.message;
    },
  });

  return (
    <div>
      {/* Column Selection */}
      <div class={styles.group}>
        <ColumnSelector
          columns={allColumns}
          selectedColumns={columns.value}
          onSelectionChange={(selected) => {
            if (Array.isArray(selected)) {
              columns.value = selected;
            }
          }}
          mode="multi"
          display="chip"
          label={t('merge.columnsLabel')}
        />
      </div>

      {/* Separator */}
      <div class={styles.group}>
        <label class={styles.label}>{t('merge.separatorLabel')}</label>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {['', ' ', ',', '-', '_', '/', '|'].map((sep) => (
            <button
              key={sep || 'empty'}
              type="button"
              class="button button--secondary"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => (separator.value = sep)}
              title={
                sep === ''
                  ? t('merge.separatorPresets.noSeparator')
                  : t('merge.separatorPresets.separator', { sep })
              }
            >
              {sep === ''
                ? t('merge.separatorPresets.none')
                : sep === ' '
                  ? t('merge.separatorPresets.space')
                  : sep}
            </button>
          ))}
        </div>
        <input
          type="text"
          class={styles.input}
          value={separator.value}
          onInput={(e) => (separator.value = (e.target as HTMLInputElement).value)}
          placeholder={t('merge.separatorPlaceholder')}
        />
      </div>

      {/* Output Column Name */}
      <div class={styles.group}>
        <label class={styles.label}>{t('merge.outputNameLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder={t('merge.outputNamePlaceholder')}
        />
      </div>

      {/* Remove Original Columns */}
      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={removeOriginal.value}
            onChange={(e) => (removeOriginal.value = (e.target as HTMLInputElement).checked)}
          />
          <span>{t('merge.removeOriginal')}</span>
        </label>
      </div>

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
