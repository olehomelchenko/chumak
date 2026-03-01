import { useSignal, useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as DeriveHandlers from '../handlers/transform/derive-handlers';
import { openDialog } from '../handlers/dialog/dialog-handlers';
import {
  computeTokens,
  EMPTY_TOKENS,
  type ExpressionTokens,
} from '../../core/expression-token-extractor';
import { getActiveSchema } from '../handlers/core/helper-handlers';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionDocs } from './ExpressionDocs';
import styles from './TransformDialog.module.css';

export function DeriveDialog() {
  const { columnName, expression, error } = DialogStore.deriveState;
  const tokens = useSignal<ExpressionTokens>(EMPTY_TOKENS);

  useSignalEffect(() => {
    void columnName.value;
    const expr = expression.value;
    DeriveHandlers.validateDeriveExpression();
    DeriveHandlers.debouncedUpdateDerivePreview();
    tokens.value = computeTokens(expr, AppStore.columns.value);
  });

  const openRef = (section?: string) => {
    openDialog('reference', section);
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

      {/* Dynamic expression docs */}
      <ExpressionDocs
        functionNames={tokens.value.functions}
        columnNames={tokens.value.columns}
        schema={getActiveSchema()}
      />

      {/* Syntax quick reference */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>Syntax</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={() => openRef()}
            style={{ fontWeight: 500, textDecoration: 'underline' }}
          >
            Full Reference
          </button>
        </div>

        <div class={styles.operatorList}>
          <span class={styles.operatorTag}>+ − * / %</span>
          <span class={styles.operatorTag}>&gt; &lt; &gt;= &lt;= == !=</span>
          <span class={styles.operatorTag}>&& || ! ??</span>
          <span class={styles.operatorTag}>? : ( )</span>
        </div>

        <div
          class={`${styles.exampleGrid} ${styles.mono}`}
          style={{ display: 'block', marginTop: '0.5rem' }}
        >
          <div>
            <code class={styles.exampleCode}>if(profit {'>'} 0, "Gain", "Loss")</code>
            <span class={styles.exampleDescription}>— conditional</span>
          </div>
          <div>
            <code class={styles.exampleCode}>coalesce(discount, 0)</code>
            <span class={styles.exampleDescription}>— first non-null</span>
          </div>
          <div>
            <code class={styles.exampleCode}>[Total Sales] + [Tax]</code>
            <span class={styles.exampleDescription}>— columns with spaces</span>
          </div>
        </div>

        <div class={styles.refLinks}>
          <button type="button" class={styles.refLink} onClick={() => openRef('date')}>
            Date
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('math')}>
            Math
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('text')}>
            Text
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('regex')}>
            Regex
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('json')}>
            JSON
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('conversion')}>
            Conversion
          </button>
        </div>
      </div>
    </div>
  );
}
