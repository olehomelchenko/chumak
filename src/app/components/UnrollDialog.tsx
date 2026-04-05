import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { ColumnSelector } from './column-selector';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

/**
 * UnrollDialog component
 * Expands array values into separate rows
 */
export function UnrollDialog() {
  const { t } = useTranslation('dialogs');
  const columns = AppStore.columns.value;

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.unroll;
      const initialColumn =
        (editing as any)?.column ?? AppStore.selectedColumn.value ?? ctx.columns[0] ?? '';
      return {
        column: signal(initialColumn),
        indices: signal(!!(editing as any)?.indices),
        keepOriginal: signal(!!(editing as any)?.keepOriginal),
      };
    },
    {
      hasError: (s) => !s.column.value || s.column.value.trim() === '',
      getState: (s) => ({
        column: s.column.value,
        indices: s.indices.value,
        keepOriginal: s.keepOriginal.value,
      }),
    }
  );

  const { column, indices, keepOriginal } = state;

  return (
    <div>
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          label={t('unroll.columnLabel')}
          helpText={t('unroll.columnHelp')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={indices.value}
            onChange={(e) => {
              indices.value = e.currentTarget.checked;
            }}
          />
          <span>{t('unroll.addIndex')}</span>
        </label>
        <div
          class={styles.helpText}
          dangerouslySetInnerHTML={{
            __html: t('unroll.indexColumnHelp', { column: column.value || 'column' }),
          }}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={keepOriginal.value}
            onChange={(e) => (keepOriginal.value = e.currentTarget.checked)}
          />
          <span>{t('unroll.keepOriginal')}</span>
        </label>
      </div>

      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>{t('unroll.help.title')}</div>
        <div
          class={styles.helpText}
          style={{ color: 'var(--color-midnight-blue)' }}
          dangerouslySetInnerHTML={{ __html: t('unroll.help.description') }}
        />
      </div>
    </div>
  );
}
