import { signal, useSignal, useSignalEffect, useComputed } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { openDialog } from '../handlers/dialog/dialog-handlers';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';
import { validateExpression } from '../handlers/validation-engine';
import { getPreviewRowLimit, getActiveSchema } from '../handlers/core/helper-handlers';
import {
  computeTokens,
  EMPTY_TOKENS,
  type ExpressionTokens,
} from '../../core/expression-token-extractor';
import { ExpressionEditor } from './ExpressionEditor';
import { ExpressionDocs } from './ExpressionDocs';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

export function DeriveDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      let editingColName = '';
      let editingExpr = '';
      if (ctx.editingStep?.derive) {
        const [colName, expr] = Object.entries(ctx.editingStep.derive)[0];
        editingColName = colName;
        editingExpr = expr as string;
      }
      return {
        columnName: signal<string>(editingColName),
        expression: signal<string>(editingExpr),
        error: signal<string | null>(null),
      };
    },
    {
      hasError: (s) =>
        !!s.error.value || !s.columnName.value?.trim() || !s.expression.value?.trim(),
      getError: (s) => {
        if (s.error.value) return s.error.value;
        if (!s.expression.value?.trim()) return null;
        if (!s.columnName.value?.trim())
          return t('validation.required.columnName', { ns: 'errors' });
        return null;
      },
      getState: (s) => ({
        columnName: s.columnName.value,
        expression: s.expression.value,
      }),
    }
  );

  const { columnName, expression, error } = state;
  const tokens = useSignal<ExpressionTokens>(EMPTY_TOKENS);

  useSignalEffect(() => {
    void columnName.value;
    const expr = expression.value;
    validateExpression(expr, AppStore.columns.value, { errorSignal: error });
    tokens.value = computeTokens(expr, AppStore.columns.value);
  });

  useTransformPreview({
    deps: () => {
      columnName.value;
      expression.value;
      error.value;
    },
    compute: () => {
      const colName = columnName.value;
      const expr = expression.value;
      const errVal = error.value;
      const data = AppStore.currentData.value;
      const columns = AppStore.columns.value;

      if (!expr || errVal || !data?.length) return null;

      const ast = parseExpression(expr);
      const previewLimit = Math.min(getPreviewRowLimit(), 50);
      const samples = data.slice(0, previewLimit);
      const outputCol = colName || 'new_column';

      const previewRows = samples.map((row: any) => {
        try {
          const result = interpretAST(ast, row);
          return { ...row, [outputCol]: result };
        } catch {
          return { ...row, [outputCol]: '(error)' };
        }
      });

      const { columns: referencedCols } = computeTokens(expr, columns);
      const previewCols = [...referencedCols.filter((c) => c !== outputCol), outputCol];

      return {
        title: `Derive: ${outputCol}`,
        stats: `Showing ${previewRows.length} sample rows`,
        columns: previewCols,
        newColumns: [outputCol],
        rows: previewRows,
      };
    },
  });

  const columnNameMissing = useComputed(
    () => !!expression.value.trim() && !columnName.value.trim()
  );

  const openRef = (section?: string) => {
    openDialog('reference', section);
  };

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>{t('derive.columnName')}</label>
        <input
          type="text"
          class={`${styles.input} ${columnNameMissing.value ? styles.inputError : ''}`}
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder={t('derive.columnNamePlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('derive.expression')}</label>
        <ExpressionEditor
          value={expression.value}
          onChange={(v) => (expression.value = v)}
          placeholder={t('derive.expressionPlaceholder')}
          columns={AppStore.columns.value}
          schema={getActiveSchema()}
          context="derive"
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
            <span class={styles.exampleDescription}>{t('derive.examples.conditional')}</span>
          </div>
          <div>
            <code class={styles.exampleCode}>coalesce(discount, 0)</code>
            <span class={styles.exampleDescription}>{t('derive.examples.firstNonNull')}</span>
          </div>
          <div>
            <code class={styles.exampleCode}>[Total Sales] + [Tax]</code>
            <span class={styles.exampleDescription}>{t('derive.examples.spacedColumns')}</span>
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
