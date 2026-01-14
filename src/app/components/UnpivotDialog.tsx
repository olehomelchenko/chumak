/**
 * UnpivotDialog (Fold) - Preact component for unpivoting (wide to long)
 */

import { Signal, useComputed } from '@preact/signals';

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
    <div class="dialog-content">
      <p class="form-help" style={{ marginBottom: '1rem' }}>
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
        <div class="form-group">
          <label class="form-label">Key Column Name</label>
          <input
            type="text"
            class="form-input"
            value={keyName.value}
            onInput={(e) => (keyName.value = (e.target as HTMLInputElement).value)}
            placeholder="e.g. Year"
          />
          <p class="form-help" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Contains original headers
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Value Column Name</label>
          <input
            type="text"
            class="form-input"
            value={valueName.value}
            onInput={(e) => (valueName.value = (e.target as HTMLInputElement).value)}
            placeholder="e.g. Sales"
          />
          <p class="form-help" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Contains values
          </p>
        </div>
      </div>

      <div class="form-group" style={{ marginBottom: '0.75rem' }}>
        <label class="form-label">Selection Mode:</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            class={`button button--small ${mode.value === 'keep' ? 'button--primary' : 'button--text'}`}
            onClick={() => (mode.value = 'keep')}
          >
            Columns to Keep (as index)
          </button>
          <button
            type="button"
            class={`button button--small ${mode.value === 'fold' ? 'button--primary' : 'button--text'}`}
            onClick={() => (mode.value = 'fold')}
          >
            Columns to Fold
          </button>
        </div>
        <p class="form-help" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {mode.value === 'keep' ? (
            <span>Select columns to keep as identifiers; all other columns will be folded.</span>
          ) : (
            <span>Select columns to fold into key-value pairs.</span>
          )}
        </p>
      </div>

      <label class="form-label">{labelText}</label>

      <div class="form-actions" style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button type="button" class="button button--text button--small" onClick={selectAll}>
          Select All
        </button>
        <button type="button" class="button button--text button--small" onClick={selectNone}>
          Select None
        </button>
      </div>

      <div class="column-chips-multi">
        {columns.map((col, index) => (
          <button
            key={col}
            type="button"
            class={`form-chip ${selectedColumns.value[index] ? 'active' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'start',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
            }}
            onClick={() => toggleColumn(index)}
          >
            <span
              class="iconify"
              data-icon={
                selectedColumns.value[index] ? 'carbon:checkmark-filled' : 'carbon:checkbox'
              }
              style={{
                fontSize: '1rem',
                flexShrink: 0,
                color: selectedColumns.value[index] ? 'var(--color-green)' : '',
              }}
            />
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
        ))}
      </div>
    </div>
  );
}
