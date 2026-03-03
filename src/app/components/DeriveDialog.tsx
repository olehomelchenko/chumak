import { useSignal, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
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
  const { t } = useTranslation('dialogs');
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
        <label class={styles.label}>{t('derive.columnName')}</label>
        <input
          type="text"
          class={styles.input}
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
