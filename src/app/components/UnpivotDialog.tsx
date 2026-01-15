/**
 * UnpivotDialog (Fold) - Preact component for unpivoting (wide to long)
 */

import { Signal, useComputed } from '@preact/signals';
import styles from './TransformDialog.module.css';

export type UnpivotMode = 'keep' | 'fold';

export interface UnpivotDialogProps {
  columns: string[];
  keyName: Signal<string>;
  valueName: Signal<string>;
  mode: Signal<UnpivotMode>;
  selectedColumns: Signal<boolean[]>;
}

export function UnpivotDialog({
  columns,
  keyName,
  valueName,
  mode,
  selectedColumns,
}: UnpivotDialogProps) {
  // Helper to update selection
  const updateSelection = (index: number, value: boolean) => {
    const newSelection = [...selectedColumns.value];
    newSelection[index] = value;
    selectedColumns.value = newSelection;
  };

  const selectAll = () => {
    selectedColumns.value = new Array(columns.length).fill(true);
  };

  const selectNone = () => {
    selectedColumns.value = new Array(columns.length).fill(false);
  };

  const toggleColumn = (index: number) => {
    updateSelection(index, !selectedColumns.value[index]);
  };

  const labelText = useComputed(() =>
    mode.value === 'keep' ? 'Select Columns to Keep:' : 'Select Columns to Fold:'
  );

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        Select columns to collapse into key-value pairs (wide to long format):
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div class={styles.group}>
          <label class={styles.label}>Key Column Name</label>
          <input
            type="text"
            class={styles.input}
            value={keyName.value}
            onInput={(e) => (keyName.value = (e.target as HTMLInputElement).value)}
            placeholder="e.g. Year"
          />
          <p class={styles.helpText} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Contains original headers
          </p>
        </div>

        <div class={styles.group}>
          <label class={styles.label}>Value Column Name</label>
          <input
            type="text"
            class={styles.input}
            value={valueName.value}
            onInput={(e) => (valueName.value = (e.target as HTMLInputElement).value)}
            placeholder="e.g. Sales"
          />
          <p class={styles.helpText} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Contains values
          </p>
        </div>
      </div>

      <div class={styles.group} style={{ marginBottom: '0.75rem' }}>
        <label class={styles.label}>Selection Mode:</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'keep' ? styles.active : ''}`}
            onClick={() => (mode.value = 'keep')}
          >
            Columns to Keep (as index)
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'fold' ? styles.active : ''}`}
            onClick={() => (mode.value = 'fold')}
          >
            Columns to Fold
          </button>
        </div>
        <p class={styles.helpText} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {mode.value === 'keep' ? (
            <span>Select columns to keep as identifiers; all other columns will be folded.</span>
          ) : (
            <span>Select columns to fold into key-value pairs.</span>
          )}
        </p>
      </div>

      <label class={styles.label}>{labelText}</label>

      <div
        class={styles.actions}
        style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}
      >
        <button type="button" class="button button--text button--small" onClick={selectAll}>
          Select All
        </button>
        <button type="button" class="button button--text button--small" onClick={selectNone}>
          Select None
        </button>
      </div>

      <div class={styles.chipGrid}>
        {columns.map((col, index) => (
          <button
            key={col}
            type="button"
            class={`${styles.chip} ${selectedColumns.value[index] ? styles.active : ''}`}
            onClick={() => toggleColumn(index)}
          >
            <span
              class={`iconify ${styles.chipIcon}`}
              data-icon={
                selectedColumns.value[index] ? 'carbon:checkmark-filled' : 'carbon:checkbox'
              }
              style={{
                color: selectedColumns.value[index] ? 'var(--color-green)' : '',
              }}
            />
            <span class={styles.chipText}>{col}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
