import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import {
  toggleDedupeAllColumns,
  toggleDedupeColumn,
  selectAllForDedupe,
  selectNoneForDedupe,
  updateDedupePreview,
} from '../transforms/dedupe-transform';
import styles from './TransformDialog.module.css';

export function DedupeDialog() {
  const { mode, useAllColumns, selectedColumns, duplicateCount } = DialogStore.dedupeState;
  const columns = AppStore.columns.value;

  const handleModeChange = (newMode: 'remove' | 'keep') => {
    mode.value = newMode;
    updateDedupePreview();
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div class={styles.group} style={{ marginBottom: '1rem' }}>
        <label class={styles.label} style={{ marginBottom: '0.5rem' }}>
          Action
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            class={`button button--small ${
              mode.value === 'remove' ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => handleModeChange('remove')}
          >
            Remove Duplicates
          </button>
          <button
            type="button"
            class={`button button--small ${
              mode.value === 'keep' ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => handleModeChange('keep')}
          >
            Keep Only Duplicates
          </button>
        </div>
      </div>

      {/* Column Scope Toggle */}
      <div class={styles.group}>
        <label class={styles.label} style={{ marginBottom: '0.5rem' }}>
          Compare By
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            class={`button button--small ${
              useAllColumns.value ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => toggleDedupeAllColumns(true)}
          >
            All Columns
          </button>
          <button
            type="button"
            class={`button button--small ${
              !useAllColumns.value ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => toggleDedupeAllColumns(false)}
          >
            Specific Columns
          </button>
        </div>
      </div>

      {!useAllColumns.value && (
        <div class={styles.group}>
          <p class={styles.helpText} style={{ marginBottom: '0.75rem' }}>
            Select columns to use as composite key:
          </p>

          <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
            <button
              type="button"
              class="button button--text button--small"
              onClick={() => selectAllForDedupe()}
            >
              Select All
            </button>
            <button
              type="button"
              class="button button--text button--small"
              onClick={() => selectNoneForDedupe()}
            >
              Select None
            </button>
          </div>

          <div class={styles.chipGrid}>
            {columns.map((col, index) => {
              const isActive = selectedColumns.value[index];
              return (
                <button
                  key={col}
                  type="button"
                  class={`${styles.chip} ${isActive ? styles.active : ''}`}
                  onClick={() => toggleDedupeColumn(index)}
                >
                  <span
                    class={`iconify ${styles.chipIcon}`}
                    data-icon={isActive ? 'carbon:checkmark-filled' : 'carbon:checkbox'}
                    style={{ color: isActive ? 'var(--color-green)' : '' }}
                  ></span>
                  <span class={styles.chipText}>{col}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {useAllColumns.value && (
        <div class={styles.helpText} style={{ margin: '0.75rem 0' }}>
          <span
            class="iconify"
            data-icon="carbon:information"
            style={{ verticalAlign: 'middle' }}
          ></span>{' '}
          Rows are considered duplicates if <strong>all columns</strong> have identical values.
        </div>
      )}

      <div
        class={styles.warningBox}
        style={{
          background:
            duplicateCount.value > 0 ? 'rgba(255, 193, 7, 0.15)' : 'rgba(76, 175, 80, 0.1)',
          borderColor: duplicateCount.value > 0 ? 'var(--color-yellow)' : 'var(--color-green)',
        }}
      >
        <span
          class="iconify"
          data-icon={duplicateCount.value > 0 ? 'carbon:warning' : 'carbon:checkmark-outline'}
          style={{
            fontSize: '1.25rem',
            color: duplicateCount.value > 0 ? 'var(--color-yellow)' : 'var(--color-green)',
          }}
        ></span>
        <div class={styles.warningText} style={{ color: 'var(--color-text)' }}>
          {duplicateCount.value > 0 ? (
            <span>
              <strong>{duplicateCount.value.toLocaleString()}</strong> duplicate row
              {duplicateCount.value !== 1 ? 's' : ''} found
            </span>
          ) : (
            <span>No duplicates found</span>
          )}
        </div>
      </div>

      <p
        class={styles.helpText}
        style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          display: mode.value === 'remove' ? 'block' : 'none',
        }}
      >
        Removes duplicate rows, keeping only the first occurrence of each.
      </p>
      <p
        class={styles.helpText}
        style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          display: mode.value === 'keep' ? 'block' : 'none',
        }}
      >
        Keeps only rows that have duplicates (all occurrences of duplicated values).
      </p>
    </div>
  );
}
