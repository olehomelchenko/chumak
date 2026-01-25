import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

/**
 * UnrollDialog component
 * Expands array values into separate rows
 */
export function UnrollDialog() {
  const { column, indices, keepOriginal } = DialogStore.unrollState;
  const columns = AppStore.columns.value;

  return (
    <div>
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          label="Column to unroll:"
          helpText='Select a column containing array values to unroll into separate rows. Works with both native arrays and JSON string arrays (e.g., ["a","b","c"]).'
        />
      </div>

      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={indices.value}
            onChange={(e) => {
              indices.value = e.currentTarget.checked;
            }}
          />
          <span>Add index column</span>
        </label>
        <div class={styles.helpText}>
          Index column will be named <code>{column.value || 'column'}__unroll_index</code>
        </div>
      </div>

      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={keepOriginal.value}
            onChange={(e) => (keepOriginal.value = e.currentTarget.checked)}
          />
          <span>Keep original column</span>
        </label>
      </div>

      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>How it works</div>
        <div class={styles.helpText} style={{ color: 'var(--color-midnight-blue)' }}>
          Unroll expands array values into separate rows. For example, a row with{' '}
          <code>id: 1, items: ['a','b','c']</code> becomes three rows, each with <code>id: 1</code>{' '}
          and one item from the array. All other columns are duplicated across the new rows.
        </div>
      </div>
    </div>
  );
}
