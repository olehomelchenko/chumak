import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

export function ReplaceDialog() {
  const { column, findValue, replaceValue } = DialogStore.replaceState;
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
        <label class={styles.label}>Find value:</label>
        <input
          type="text"
          class={styles.input}
          value={findValue.value}
          onInput={(e) => (findValue.value = (e.target as HTMLInputElement).value)}
          placeholder="Value to replace"
        />
        <p class={styles.helpText}>The exact value to find and replace</p>
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Replace with:</label>
        <input
          type="text"
          class={styles.input}
          value={replaceValue.value}
          onInput={(e) => (replaceValue.value = (e.target as HTMLInputElement).value)}
          placeholder="New value (leave empty for null)"
        />
        <p class={styles.helpText}>New value to use (leave empty to replace with null)</p>
      </div>
    </div>
  );
}
