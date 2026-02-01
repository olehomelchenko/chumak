import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import {
  validateRegexpExtractExpression,
  debouncedUpdateRegexpExtractPreview,
} from '../handlers/regexp-handlers';
import styles from './TransformDialog.module.css';

export function RegexpExtractDialog() {
  const { sourceColumn, pattern, columnName, group, error } = DialogStore.regexpExtractState;
  const columns = AppStore.columns.value;

  const handleInput = () => {
    validateRegexpExtractExpression();
    debouncedUpdateRegexpExtractPreview();
  };

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        Extracts text matching a pattern into a new column.
      </p>

      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={sourceColumn.value}
          onSelectionChange={(col) => {
            sourceColumn.value = col as string;
            debouncedUpdateRegexpExtractPreview();
          }}
          mode="single"
          display="chip"
          label="Source column:"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Pattern (regex):</label>
        <input
          type="text"
          class={styles.input}
          value={pattern.value}
          onInput={(e) => {
            pattern.value = (e.target as HTMLInputElement).value;
            handleInput();
          }}
          placeholder="e.g., @(.+)$ to extract domain"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Capture group (0 = entire match):</label>
        <input
          type="number"
          class={styles.input}
          value={group.value}
          onInput={(e) => {
            group.value = parseInt((e.target as HTMLInputElement).value) || 0;
            debouncedUpdateRegexpExtractPreview();
          }}
          min="0"
          max="9"
          style={{ width: '80px' }}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>New column name:</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => {
            columnName.value = (e.target as HTMLInputElement).value;
            debouncedUpdateRegexpExtractPreview();
          }}
          placeholder="e.g., domain"
        />
      </div>

      {/* Error message */}
      {error.value && (
        <div class={styles.error} style={{ margin: '8px 0', fontFamily: 'var(--font-mono)' }}>
          {error.value}
        </div>
      )}

      {/* Help section */}
      <div class={styles.expressionHelp} style={{ borderStyle: 'solid' }}>
        <div class={styles.helpHeader}>
          <span>Pattern Examples</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={() => (AppStore.activeDialog.value = 'expressions')}
          >
            Full Reference
          </button>
        </div>
        <div class={styles.codeList}>
          <div>
            <code class={styles.mono}>
              (\d{`{4}`})-(\d{`{2}`})-(\d{`{2}`})
            </code>
            {' — date parts (1=year, 2=month, 3=day)'}
          </div>
          <div>
            <code class={styles.mono}>@(.+)$</code>
            {' — domain from email (group 1)'}
          </div>
          <div>
            <code class={styles.mono}>(?i)(error|warning)</code>
            {' — extract level (case-insensitive)'}
          </div>
          <div>
            <code class={styles.mono}>^([A-Z]{`{2}`})</code>
            {' — first 2 uppercase letters'}
          </div>
        </div>
      </div>
    </div>
  );
}
