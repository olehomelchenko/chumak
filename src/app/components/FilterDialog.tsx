/**
 * FilterDialog - Preact component for filtering rows
 */

import { useSignal, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
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
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

// Re-export for backward compatibility
export type { FilterPreviewMode } from '../../types/modes';

export function FilterDialog() {
  const { t } = useTranslation('dialogs');
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
      <label class={styles.label}>{t('filter.label')}</label>
      <ExpressionEditor
        value={expression.value}
        onChange={(v) => (expression.value = v)}
        placeholder={t('filter.placeholder')}
        columns={AppStore.columns.value}
        schema={getActiveSchema()}
        context="filter"
      />

      {/* Preview mode toggle */}
      <div class={styles.previewToggle}>
        <span class={styles.previewLabel}>{t('common.labels.preview')}</span>
        <button
          type="button"
          class={`button button--small ${previewMode.value === 'all' ? 'button--primary' : 'button--text'}`}
          onClick={() => (previewMode.value = 'all')}
        >
          {t('filter.previewModes.all')}
        </button>
        <button
          type="button"
          class={`button button--small ${previewMode.value === 'matching' ? 'button--primary' : 'button--text'}`}
          onClick={() => (previewMode.value = 'matching')}
        >
          {t('filter.previewModes.matching')}
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
          <span>{t('common.reference.syntax')}</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={() => openRef()}
            style={{ fontWeight: 500, textDecoration: 'underline' }}
          >
            {t('common.buttons.fullReference')}
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
            <span class={styles.exampleDescription}>{t('filter.examples.and')}</span>
          </div>
          <div>
            <code class={styles.exampleCode}>status == "a" || status == "b"</code>
            <span class={styles.exampleDescription}>{t('filter.examples.or')}</span>
          </div>
          <div>
            <code class={styles.exampleCode}>[Total Sales] {'>'} 100</code>
            <span class={styles.exampleDescription}>{t('filter.examples.spacedColumns')}</span>
          </div>
        </div>

        <div class={styles.refLinks}>
          <button type="button" class={styles.refLink} onClick={() => openRef('date')}>
            {t('common.reference.date')}
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('math')}>
            {t('common.reference.math')}
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('text')}>
            {t('common.reference.text')}
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('regex')}>
            {t('common.reference.regex')}
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('json')}>
            {t('common.reference.json')}
          </button>
          <button type="button" class={styles.refLink} onClick={() => openRef('conversion')}>
            {t('common.reference.conversion')}
          </button>
        </div>
      </div>
    </div>
  );
}
