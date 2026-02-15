import { useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as DeriveHandlers from '../handlers/transform/derive-handlers';
import { ExpressionEditor } from './ExpressionEditor';
import styles from './TransformDialog.module.css';

export function DeriveDialog() {
  const { columnName, expression, error } = DialogStore.deriveState;

  useSignalEffect(() => {
    void columnName.value;
    void expression.value;
    DeriveHandlers.validateDeriveExpression();
    DeriveHandlers.debouncedUpdateDerivePreview();
  });

  const handleOpenReference = () => {
    AppStore.activeDialog.value = 'expressions';
  };

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>New column name:</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder="e.g., profit_margin"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Expression:</label>
        <ExpressionEditor
          value={expression.value}
          onChange={(v) => (expression.value = v)}
          placeholder="e.g., (profit / sales) * 100"
          columns={AppStore.columns.value}
        />
      </div>

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}

      {/* Expression Help Section */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>Expression Syntax Guide</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={handleOpenReference}
            style={{ fontWeight: 500, textDecoration: 'underline' }}
          >
            Full Reference
          </button>
        </div>

        {/* Supported Examples */}
        <div class={styles.group} style={{ marginBottom: '0.75rem' }}>
          <div class={styles.exampleTitle}>Examples:</div>
          <div class={`${styles.exampleGrid} ${styles.mono}`} style={{ display: 'block' }}>
            <div>
              <code class={styles.exampleCode}>revenue - cost</code>
              <span class={styles.exampleDescription}>— subtraction</span>
            </div>
            <div>
              <code class={styles.exampleCode}>price * quantity</code>
              <span class={styles.exampleDescription}>— multiplication</span>
            </div>
            <div>
              <code class={styles.exampleCode}>(profit / sales) * 100</code>
              <span class={styles.exampleDescription}>— percentage</span>
            </div>
            <div>
              <code class={styles.exampleCode}>profit {'>'} 0 ? "Gain" : "Loss"</code>
              <span class={styles.exampleDescription}>— conditional</span>
            </div>
            <div>
              <code class={styles.exampleCode}>discount ?? 0</code>
              <span class={styles.exampleDescription}>— default for null</span>
            </div>
            <div>
              <code class={styles.exampleCode}>[Total Sales] + [Tax]</code>
              <span class={styles.exampleDescription}>— columns with spaces</span>
            </div>
          </div>
        </div>

        {/* Supported Operators */}
        <div class={styles.group} style={{ marginBottom: '0.75rem' }}>
          <div class={styles.exampleTitle}>Supported Operators:</div>
          <div class={styles.operatorList}>
            <span class={styles.operatorTag}>+ − * / %</span>
            <span class={styles.operatorTag}>&gt; &lt; &gt;= &lt;= == !=</span>
            <span class={styles.operatorTag}>&& || ! ??</span>
            <span class={styles.operatorTag}>? : ( )</span>
          </div>
        </div>

        {/* Available Functions */}
        <div class={styles.group} style={{ marginBottom: '0.75rem' }}>
          <div class={styles.exampleTitle}>Date Functions:</div>
          <div class={`${styles.exampleGrid} ${styles.mono}`}>
            <div>
              <code class={styles.exampleCode}>year(d)</code>
              <span class={styles.exampleDescription}>— 2024</span>
            </div>
            <div>
              <code class={styles.exampleCode}>month(d)</code>
              <span class={styles.exampleDescription}>— 1-12</span>
            </div>
            <div>
              <code class={styles.exampleCode}>day(d)</code>
              <span class={styles.exampleDescription}>— 1-31</span>
            </div>
            <div>
              <code class={styles.exampleCode}>weekday(d)</code>
              <span class={styles.exampleDescription}>— 0-6</span>
            </div>
            <div>
              <code class={styles.exampleCode}>quarter(d)</code>
              <span class={styles.exampleDescription}>— 1-4</span>
            </div>
            <div>
              <code class={styles.exampleCode}>week(d)</code>
              <span class={styles.exampleDescription}>— ISO week</span>
            </div>
            <div>
              <code class={styles.exampleCode}>hour(d)</code>
              <span class={styles.exampleDescription}>— 0-23</span>
            </div>
            <div>
              <code class={styles.exampleCode}>minute(d)</code>
              <span class={styles.exampleDescription}>— 0-59</span>
            </div>
            <div>
              <code class={styles.exampleCode}>today()</code>
              <span class={styles.exampleDescription}>— current date</span>
            </div>
            <div>
              <code class={styles.exampleCode}>now()</code>
              <span class={styles.exampleDescription}>— current time</span>
            </div>
            <div class={styles.fullSpan}>
              <code class={styles.exampleCode}>days_between(d1, d2)</code>
              <span class={styles.exampleDescription}>— difference in days</span>
            </div>
            <div class={styles.fullSpan}>
              <code class={styles.exampleCode}>date_add(d, n, "days")</code>
              <span class={styles.exampleDescription}>— add days/months/years</span>
            </div>
            <div class={styles.fullSpan}>
              <code class={styles.exampleCode}>format_date(d, "DD/MM/YYYY")</code>
              <span class={styles.exampleDescription}>— custom format</span>
            </div>
          </div>
        </div>

        {/* Math Functions */}
        <div class={styles.group} style={{ marginBottom: '0.75rem' }}>
          <div class={styles.exampleTitle}>Math Functions:</div>
          <div class={`${styles.exampleGrid} ${styles.mono}`}>
            <div>
              <code class={styles.exampleCode}>round(n, 2)</code>
              <span class={styles.exampleDescription}>— round to 2 decimals</span>
            </div>
            <div>
              <code class={styles.exampleCode}>abs(n)</code>
              <span class={styles.exampleDescription}>— absolute value</span>
            </div>
            <div>
              <code class={styles.exampleCode}>pow(b, e)</code>
              <span class={styles.exampleDescription}>— power</span>
            </div>
            <div>
              <code class={styles.exampleCode}>sqrt(n)</code>
              <span class={styles.exampleDescription}>— square root</span>
            </div>
            <div>
              <code class={styles.exampleCode}>floor(n)</code>
              <span class={styles.exampleDescription}>— round down</span>
            </div>
            <div>
              <code class={styles.exampleCode}>ceil(n)</code>
              <span class={styles.exampleDescription}>— round up</span>
            </div>
            <div>
              <code class={styles.exampleCode}>min(a, b, ...)</code>
              <span class={styles.exampleDescription}>— minimum</span>
            </div>
            <div>
              <code class={styles.exampleCode}>max(a, b, ...)</code>
              <span class={styles.exampleDescription}>— maximum</span>
            </div>
            <div>
              <code class={styles.exampleCode}>pi()</code>
              <span class={styles.exampleDescription}>— 3.14159...</span>
            </div>
            <div>
              <code class={styles.exampleCode}>ln(n)</code>
              <span class={styles.exampleDescription}>— natural log</span>
            </div>
          </div>
        </div>

        {/* Text Functions */}
        <div class={styles.dashedSeparator}>
          <strong style={{ color: 'var(--color-dark-gray)' }}>Text:</strong>{' '}
          <code class={styles.mono}>regexp_match(val, pattern)</code>,{' '}
          <code class={styles.mono}>regexp_extract(val, pattern)</code>
        </div>
      </div>
    </div>
  );
}
