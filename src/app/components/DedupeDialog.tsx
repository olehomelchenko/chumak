import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import {
  toggleDedupeAllColumns,
  toggleDedupeColumn,
  selectAllForDedupe,
  selectNoneForDedupe,
  updateDedupePreview,
} from '../transforms/dedupe-transform';

export function DedupeDialog() {
  const { mode, useAllColumns, selectedColumns, duplicateCount } = DialogStore.dedupeState;
  const columns = AppStore.columns.value;

  const handleModeChange = (newMode: 'remove' | 'keep') => {
    mode.value = newMode;
    updateDedupePreview();
  };

  return (
    <div class="dialog-content">
      {/* Mode Toggle */}
      <div class="form-group" style={{ marginBottom: '1rem' }}>
        <label class="form-label" style={{ marginBottom: '0.5rem' }}>
          Action
        </label>
        <div class="form-row" style={{ display: 'flex', gap: '0.5rem' }}>
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
      <div class="form-group">
        <label class="form-label" style={{ marginBottom: '0.5rem' }}>
          Compare By
        </label>
        <div class="form-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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
        <div>
          <p class="form-help" style={{ marginBottom: '0.75rem' }}>
            Select columns to use as composite key:
          </p>

          <div
            class="form-actions"
            style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}
          >
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

          <div class="column-chips-multi">
            {columns.map((col, index) => {
              const isActive = selectedColumns.value[index];
              return (
                <button
                  key={col}
                  type="button"
                  class={`form-chip ${isActive ? 'active' : ''}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'start',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  }}
                  onClick={() => toggleDedupeColumn(index)}
                >
                  <span
                    class="iconify"
                    data-icon={isActive ? 'carbon:checkmark-filled' : 'carbon:checkbox'}
                    style={{
                      fontSize: '1rem',
                      flexShrink: 0,
                      color: isActive ? 'var(--color-green)' : '',
                    }}
                  ></span>
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexGrow: 1,
                      textAlign: 'left',
                    }}
                  >
                    {col}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {useAllColumns.value && (
        <div class="form-help" style={{ margin: '0.75rem 0' }}>
          <span
            class="iconify"
            data-icon="carbon:information"
            style={{ verticalAlign: 'middle' }}
          ></span>{' '}
          Rows are considered duplicates if <strong>all columns</strong> have identical values.
        </div>
      )}

      <div
        class="dedupe-stats"
        style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: 'var(--border-radius)',
          background:
            duplicateCount.value > 0
              ? 'rgba(var(--color-yellow-rgb), 0.15)'
              : 'rgba(var(--color-green-rgb), 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            class="iconify"
            data-icon={duplicateCount.value > 0 ? 'carbon:warning' : 'carbon:checkmark-outline'}
            style={{
              fontSize: '1.25rem',
              color: duplicateCount.value > 0 ? 'var(--color-yellow)' : 'var(--color-green)',
            }}
          ></span>
          <span>
            {duplicateCount.value > 0 ? (
              <span>
                <strong>{duplicateCount.value.toLocaleString()}</strong> duplicate row
                {duplicateCount.value !== 1 ? 's' : ''} found
              </span>
            ) : (
              <span>No duplicates found</span>
            )}
          </span>
        </div>
      </div>

      <p
        class="form-help"
        style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--color-dark-gray)',
          display: mode.value === 'remove' ? 'block' : 'none',
        }}
      >
        Removes duplicate rows, keeping only the first occurrence of each.
      </p>
      <p
        class="form-help"
        style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--color-dark-gray)',
          display: mode.value === 'keep' ? 'block' : 'none',
        }}
      >
        Keeps only rows that have duplicates (all occurrences of duplicated values).
      </p>
    </div>
  );
}
