import { useComputed } from '@preact/signals';
import styles from './TransformDialog.module.css';
import { ColumnSelector } from './column-selector';
import * as FoldHandlers from '../handlers/fold-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

export type UnpivotMode = 'keep' | 'fold';

export function UnpivotDialog() {
  const { keyName, valueName, mode, selectedColumns } = DialogStore.foldState;
  const columns = AppStore.columns.value;
  const labelText = useComputed(() =>
    mode.value === 'keep' ? 'Select Columns to Keep:' : 'Select Columns to Fold:'
  );

  const handleKeyNameInput = (e: any) => {
    keyName.value = e.currentTarget.value;
    FoldHandlers.updateFoldPreview();
  };

  const handleValueNameInput = (e: any) => {
    valueName.value = e.currentTarget.value;
    FoldHandlers.updateFoldPreview();
  };

  const handleModeChange = (newMode: UnpivotMode) => {
    mode.value = newMode;
    FoldHandlers.updateFoldPreview();
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
    FoldHandlers.updateFoldPreview();
  };

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
            onInput={handleKeyNameInput}
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
            onInput={handleValueNameInput}
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
            onClick={() => handleModeChange('keep')}
          >
            Columns to Keep (as index)
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'fold' ? styles.active : ''}`}
            onClick={() => handleModeChange('fold')}
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

      <ColumnSelector
        columns={columns}
        selectedColumns={getSelectedColumnNames()}
        onSelectionChange={handleColumnSelectionChange}
        mode="multi"
        display="chip"
        allowSelectAll={true}
        label={labelText.value}
      />
    </div>
  );
}
