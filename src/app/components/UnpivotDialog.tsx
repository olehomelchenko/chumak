import { useComputed } from '@preact/signals';
import styles from './TransformDialog.module.css';
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

      <label class={styles.label}>{labelText}</label>

      <div
        class={styles.actions}
        style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}
      >
        <button
          type="button"
          class="button button--text button--small"
          onClick={FoldHandlers.selectAllForFold}
        >
          Select All
        </button>
        <button
          type="button"
          class="button button--text button--small"
          onClick={FoldHandlers.selectNoneForFold}
        >
          Select None
        </button>
      </div>

      <div class={styles.chipGrid}>
        {columns.map((col, index) => (
          <button
            key={col}
            type="button"
            class={`${styles.chip} ${selectedColumns.value[index] ? styles.active : ''}`}
            onClick={() => FoldHandlers.toggleColumnForFold(index)}
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
