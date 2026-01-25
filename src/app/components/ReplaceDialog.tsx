import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

export function ReplaceDialog() {
  const { column, findValue, replaceValue, isRegex } = DialogStore.replaceState;
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
          label="Column:"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Find {isRegex.value ? 'pattern' : 'value'}:</label>
        <input
          type="text"
          class={styles.input}
          value={findValue.value}
          onInput={(e) => (findValue.value = (e.target as HTMLInputElement).value)}
          placeholder={isRegex.value ? 'Regular expression pattern' : 'Value to replace'}
        />
        <div style={{ marginTop: '8px' }}>
          <label class={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isRegex.value}
              onChange={(e) => (isRegex.value = (e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontSize: '13px' }}>
              Use regex pattern (e.g., <code>\d+</code> for numbers, <code>(?i)hello</code> for
              case-insensitive)
            </span>
          </label>
        </div>
        <p class={styles.helpText}>
          {isRegex.value
            ? 'Regular expression pattern to match (automatically applies globally)'
            : 'The exact value to find and replace'}
        </p>
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Replace with:</label>
        <input
          type="text"
          class={styles.input}
          value={replaceValue.value}
          onInput={(e) => (replaceValue.value = (e.target as HTMLInputElement).value)}
          placeholder={
            isRegex.value
              ? 'Replacement (supports $1, $2 for groups)'
              : 'New value (leave empty for null)'
          }
        />
        <p class={styles.helpText}>
          {isRegex.value
            ? 'Replacement string (use $1, $2, etc. for capture groups)'
            : 'New value to use (leave empty to replace with null)'}
        </p>
      </div>
    </div>
  );
}
