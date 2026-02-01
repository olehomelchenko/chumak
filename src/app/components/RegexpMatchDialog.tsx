import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import {
  validateRegexpMatchExpression,
  debouncedUpdateRegexpMatchPreview,
} from '../handlers/transform/regexp-handlers';
import styles from './TransformDialog.module.css';

export function RegexpMatchDialog() {
  const { sourceColumn, pattern, columnName, error } = DialogStore.regexpMatchState;
  const columns = AppStore.columns.value;

  const handleInput = () => {
    validateRegexpMatchExpression();
    debouncedUpdateRegexpMatchPreview();
  };

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        Creates a boolean column indicating whether the pattern matches.
      </p>

      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={sourceColumn.value}
          onSelectionChange={(col) => {
            sourceColumn.value = col as string;
            debouncedUpdateRegexpMatchPreview();
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
          placeholder="e.g., ^[A-Z]{2}\d+"
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
            debouncedUpdateRegexpMatchPreview();
          }}
          placeholder="e.g., is_valid_code"
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
            <code class={styles.mono}>^[A-Z]{`{2}`}</code>
            {' — starts with 2 uppercase letters'}
          </div>
          <div>
            <code class={styles.mono}>
              \d{`{3}`}-\d{`{4}`}
            </code>
            {' — phone format 123-4567'}
          </div>
          <div>
            <code class={styles.mono}>(?i)error</code>
            {' — case-insensitive "error"'}
          </div>
          <div>
            <code class={styles.mono}>@.+\.com$</code>
            {' — ends with @...com'}
          </div>
        </div>
      </div>
    </div>
  );
}
