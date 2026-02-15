/**
 * FilterDialog - Preact component for filtering rows
 */

import { useSignal, useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as FilterHandlers from '../handlers/transform/filter-handlers';
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

// Re-export for backward compatibility
export type { FilterPreviewMode } from '../../types/modes';

export function FilterDialog() {
  const { expression, error, previewMode } = DialogStore.filterState;
  const tokens = useSignal<ExpressionTokens>(EMPTY_TOKENS);

  useSignalEffect(() => {
    // Subscribe to changes and validate
    const expr = expression.value;
    void previewMode.value;
    FilterHandlers.validateFilterExpression();
    FilterHandlers.debouncedUpdateFilterPreview();
    tokens.value = computeTokens(expr, AppStore.columns.value);
  });

  const openRef = (section?: string) => {
    openDialog('reference', section);
  };

  return (
    <div>
      <label class={styles.label}>Keep rows where:</label>
      <ExpressionEditor
        value={expression.value}
        onChange={(v) => (expression.value = v)}
        placeholder="e.g., sales > 1000"
        columns={AppStore.columns.value}
      />

      {/* Preview mode toggle */}
      <div class={styles.previewToggle}>
        <span class={styles.previewLabel}>Preview:</span>
        <button
          type="button"
          class={`button button--small ${previewMode.value === 'all' ? 'button--primary' : 'button--text'}`}
          onClick={() => (previewMode.value = 'all')}
        >
          Show All
        </button>
        <button
          type="button"
          class={`button button--small ${previewMode.value === 'matching' ? 'button--primary' : 'button--text'}`}
          onClick={() => (previewMode.value = 'matching')}
        >
          Matching Only
        </button>
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
          <span class={styles.operatorTag}>&gt; &lt; &gt;= &lt;= == !=</span>
          <span class={styles.operatorTag}>&& || !</span>
          <span class={styles.operatorTag}>? : ( )</span>
        </div>

        <div
          class={`${styles.exampleGrid} ${styles.mono}`}
          style={{ display: 'block', marginTop: '0.5rem' }}
        >
          <div>
            <code class={styles.exampleCode}>sales {'>'} 1000 && region == "North"</code>
            <span class={styles.exampleDescription}>— AND</span>
          </div>
          <div>
            <code class={styles.exampleCode}>status == "a" || status == "b"</code>
            <span class={styles.exampleDescription}>— OR</span>
          </div>
          <div>
            <code class={styles.exampleCode}>[Total Sales] {'>'} 100</code>
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
