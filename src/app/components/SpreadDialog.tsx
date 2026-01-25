import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

/**
 * SpreadDialog component
 * Converts array column into multiple columns
 */
export function SpreadDialog() {
  const { column, limit, keepOriginal } = DialogStore.spreadState;
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
          label="Column to spread:"
          helpText='Select a column containing array values to spread into separate columns. Works with both native arrays and JSON string arrays (e.g., ["a","b","c"]).'
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label} htmlFor="spread-limit">
          Maximum Columns (Optional)
        </label>
        <input
          id="spread-limit"
          type="number"
          class={styles.input}
          value={limit.value ?? ''}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            limit.value = isNaN(val) || val <= 0 ? undefined : val;
          }}
          min="1"
          placeholder="No limit (spread all array elements)"
        />
        <div class={styles.helpText}>
          Limit the number of columns created. Leave empty to spread all array elements.
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
          Spread converts array values into separate columns. For example,{' '}
          <code>tags: ['a','b','c']</code> becomes three columns: <code>tags_1: 'a'</code>,{' '}
          <code>tags_2: 'b'</code>, <code>tags_3: 'c'</code>. The original column is removed.
        </div>
      </div>
    </div>
  );
}
