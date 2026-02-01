/**
 * MergeDialog - Preact component for merging/concatenating columns
 */

import { useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector/ColumnSelector';
import * as MergeHandlers from '../handlers/transform/merge-handlers';
import styles from './TransformDialog.module.css';

export function MergeDialog() {
  const { columns, separator, columnName, removeOriginal, error } = DialogStore.mergeState;
  const allColumns = AppStore.columns.value;

  useSignalEffect(() => {
    // Trigger preview when params change
    void columns.value;
    void separator.value;
    void columnName.value;
    if (columns.value.length > 0) {
      MergeHandlers.debouncedUpdateMergePreview();
    }
  });

  const setPresetSeparator = (val: string) => {
    separator.value = val;
  };

  // Auto-generate column name from selected columns (only if empty)
  useSignalEffect(() => {
    if (!columnName.value.trim() && columns.value.length > 0) {
      const baseName = columns.value.join('_');
      columnName.value = baseName + '_merged';
    }
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
              MergeHandlers.selectMergeColumns(selected);
            }
          }}
          mode="multi"
          display="chip"
          label="Columns to merge:"
        />
      </div>

      {/* Separator */}
      <div class={styles.group}>
        <label class={styles.label}>Separator:</label>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {['', ' ', ',', '-', '_', '/', '|'].map((sep) => (
            <button
              key={sep || 'empty'}
              type="button"
              class="button button--secondary"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => setPresetSeparator(sep)}
              title={sep === '' ? 'No separator' : `Separator: "${sep}"`}
            >
              {sep === '' ? '(none)' : sep === ' ' ? '(space)' : sep}
            </button>
          ))}
        </div>
        <input
          type="text"
          class={styles.input}
          value={separator.value}
          onInput={(e) => (separator.value = (e.target as HTMLInputElement).value)}
          placeholder="Enter separator (e.g., ' ', ', ', '-')"
        />
      </div>

      {/* Output Column Name */}
      <div class={styles.group}>
        <label class={styles.label}>Output column name:</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder="e.g., full_name"
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
          <span>Remove original columns after merging</span>
        </label>
      </div>

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
