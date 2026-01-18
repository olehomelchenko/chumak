import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';

export function SelectPatternDialog() {
  const { pattern, matchType, error } = DialogStore.selectPatternState;

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        Select columns matching a pattern. Useful for selecting multiple columns with similar names.
      </p>

      <div class={styles.group}>
        <label class={styles.label}>Pattern:</label>
        <input
          type="text"
          class={styles.input}
          value={pattern.value}
          onInput={(e) => (pattern.value = (e.target as HTMLInputElement).value)}
          placeholder="e.g., sales_"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Match type:</label>
        <select
          class={styles.input}
          value={matchType.value}
          onChange={(e) => (matchType.value = (e.target as HTMLSelectElement).value as any)}
        >
          <option value="prefix">Prefix (starts with)</option>
          <option value="suffix">Suffix (ends with)</option>
          <option value="contains">Contains</option>
          <option value="regex">Regex</option>
        </select>
        <p class={styles.helpText}>
          {matchType.value === 'prefix' && 'Columns that start with the pattern'}
          {matchType.value === 'suffix' && 'Columns that end with the pattern'}
          {matchType.value === 'contains' && 'Columns that contain the pattern'}
          {matchType.value === 'regex' && 'Columns matching the regex pattern'}
        </p>
      </div>

      {error.value && (
        <div class={styles.error} style={{ marginTop: '1rem' }}>
          {error.value}
        </div>
      )}
    </div>
  );
}
