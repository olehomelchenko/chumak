/**
 * FilterDialog - Preact component for filtering rows
 */

import { useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as FilterHandlers from '../handlers/transform/filter-handlers';
import styles from './TransformDialog.module.css';

export type FilterPreviewMode = 'all' | 'matching';

export function FilterDialog() {
  const { expression, error, previewMode } = DialogStore.filterState;

  useSignalEffect(() => {
    // Subscribe to changes and validate
    void expression.value;
    void previewMode.value;
    FilterHandlers.validateFilterExpression();
    FilterHandlers.debouncedUpdateFilterPreview();
  });

  const handleOpenReference = () => {
    AppStore.activeDialog.value = 'expressions';
  };

  return (
    <div>
      <label class={styles.label}>Keep rows where:</label>
      <input
        type="text"
        class={styles.input}
        value={expression.value}
        onInput={(e) => (expression.value = (e.target as HTMLInputElement).value)}
        placeholder="e.g., sales > 1000"
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

      {/* Quick Examples */}
      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>
          <span>Quick Examples</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={handleOpenReference}
            style={{ fontWeight: 500, textDecoration: 'underline' }}
          >
            Full Reference
          </button>
        </div>

        <div class={styles.exampleGrid}>
          <div>
            <code class={styles.exampleCode}>sales {'>'} 1000</code>
          </div>
          <div>
            <code class={styles.exampleCode}>price {'<='} 100</code>
          </div>
          <div>
            <code class={styles.exampleCode}>region == "North"</code>
          </div>
          <div>
            <code class={styles.exampleCode}>status != "cancelled"</code>
          </div>
          <div class={styles.fullSpan}>
            <code class={styles.exampleCode}>sales {'>'} 1000 && region == "North"</code>
            {' — combine with AND'}
          </div>
          <div class={styles.fullSpan}>
            <code class={styles.exampleCode}>status == "pending" || status == "review"</code>
            {' — combine with OR'}
          </div>
          <div class={styles.fullSpan}>
            <code class={styles.exampleCode}>year(order_date) == 2024</code>
            {' — date functions'}
          </div>
          <div class={styles.fullSpan}>
            <code class={styles.exampleCode}>regexp_match(email, "@gmail\\.com$")</code>
            {' — regex patterns'}
          </div>
        </div>
      </div>
    </div>
  );
}
