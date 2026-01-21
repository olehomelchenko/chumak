import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import { toggleDedupeAllColumns, updateDedupePreview } from '../transforms/dedupe-transform';
import styles from './TransformDialog.module.css';

export function DedupeDialog() {
  const { mode, useAllColumns, selectedColumns, duplicateCount } = DialogStore.dedupeState;
  const columns = AppStore.columns.value;

  const handleModeChange = (newMode: 'remove' | 'keep') => {
    mode.value = newMode;
    updateDedupePreview();
  };

  // Convert boolean array to string array for ColumnSelector
  const getSelectedColumnNames = (): string[] => {
    return columns.filter((_, index) => selectedColumns.value[index]);
  };

  // Convert string array from ColumnSelector to boolean array
  const handleColumnSelectionChange = (selected: string[] | string) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    const newSelection = columns.map((col) => selectedArray.includes(col));
    selectedColumns.value = newSelection;
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

          <ColumnSelector
            columns={columns}
            selectedColumns={getSelectedColumnNames()}
            onSelectionChange={handleColumnSelectionChange}
            mode="multi"
            display="chip"
            allowSelectAll={true}
          />
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
