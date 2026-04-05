/**
 * FilterDialog - Preact component for filtering rows
 */

import { signal, useSignal, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { openDialog } from '../handlers/dialog/dialog-handlers';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { isConversionError } from '../../core/type-converter';
import { validateExpression } from '../handlers/validation-engine';
import { getPreviewRowLimit, getActiveSchema } from '../handlers/core/helper-handlers';
import {
  computeTokens,
  EMPTY_TOKENS,
  type ExpressionTokens,
} from '../../core/expression-token-extractor';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionDocs } from './ExpressionDocs';
import type { FilterPreviewMode } from '../../types/modes';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

export function FilterDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.filter;
      // quickFilter pre-populates via selectedColumn
      const selectedColumn = AppStore.selectedColumn.value;
      const defaultExpr = editing
        ? (editing as string)
        : selectedColumn
          ? `[${selectedColumn}] == `
          : '';
      return {
        expression: signal<string>(defaultExpr),
        error: signal<string | null>(null),
        previewMode: signal<FilterPreviewMode>('all'),
      };
    },
    {
      hasError: (s) => !!s.error.value,
      getError: (s) => s.error.value,
      getState: (s) => ({
        expression: s.expression.value,
        previewMode: s.previewMode.value,
      }),
    }
  );

  const { expression, error, previewMode } = state;
  const tokens = useSignal<ExpressionTokens>(EMPTY_TOKENS);

  useSignalEffect(() => {
    const expr = expression.value;
    void previewMode.value;
    validateExpression(expr, AppStore.columns.value, { errorSignal: error });
    tokens.value = computeTokens(expr, AppStore.columns.value);
  });

  useTransformPreview({
    deps: () => {
      expression.value;
      error.value;
      previewMode.value;
    },
    compute: () => {
      const expr = expression.value.trim();
      const hasError = error.value;
      const mode = previewMode.value;
      const data = AppStore.currentData.value;
      const columns = AppStore.columns.value;

      if (!expr || hasError || !data?.length) return null;

      const ast = parseExpression(expr);
      const previewRows: any[] = [];
      let matchCount = 0;

      const previewLimit = getPreviewRowLimit();
      const sampleData = data.slice(0, previewLimit);

      for (const row of sampleData) {
        try {
          const matches = interpretAST(ast, row);
          if (matches && !isConversionError(matches)) {
            matchCount++;
            if (previewRows.length < 50) previewRows.push(row);
          } else {
            if (mode === 'all' && previewRows.length < 50) {
              previewRows.push({ ...row, _removed: true });
            }
          }
        } catch {
          // Skip rows with evaluation errors
        }
      }

      let totalMatchCount = matchCount;
      if (data.length > previewLimit) {
        totalMatchCount = 0;
        for (const row of data) {
          try {
            const result = interpretAST(ast, row);
            if (result && !isConversionError(result)) totalMatchCount++;
          } catch {
            // Skip
          }
        }
      }

      return {
        title: 'Filter Preview',
        stats: `<strong>${totalMatchCount}</strong> of ${data.length} rows match`,
        columns: columns.slice(0, 8),
        rows: previewRows,
      };
    },
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
