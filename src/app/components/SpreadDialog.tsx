import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { ColumnSelector } from './column-selector';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

/**
 * SpreadDialog component
 * Converts array column into multiple columns
 */
export function SpreadDialog() {
  const { t } = useTranslation('dialogs');
  const columns = AppStore.columns.value;

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.spread;
      const initialColumn =
        (editing as any)?.column ?? AppStore.selectedColumn.value ?? ctx.columns[0] ?? '';
      return {
        column: signal(initialColumn),
        limit: signal<number | undefined>((editing as any)?.limit ?? undefined),
        keepOriginal: signal(!!(editing as any)?.keepOriginal),
      };
    },
    {
      hasError: (s) => !s.column.value || s.column.value.trim() === '',
      getState: (s) => ({
        column: s.column.value,
        limit: s.limit.value,
        keepOriginal: s.keepOriginal.value,
      }),
    }
  );

  const { column, limit, keepOriginal } = state;

  return (
    <div>
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          label={t('spread.columnLabel')}
          helpText={t('spread.columnHelp')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label} htmlFor="spread-limit">
          {t('spread.limitLabel')}
        </label>
        <input
          id="spread-limit"
          type="number"
          class={styles.input}
          value={limit.value ?? ''}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            limit.value = isNaN(val) || val <= 0 ? undefined : val;
          }}
          min="1"
          placeholder={t('spread.limitPlaceholder')}
        />
        <div class={styles.helpText}>{t('spread.limitHelp')}</div>
      </div>

      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={keepOriginal.value}
            onChange={(e) => (keepOriginal.value = e.currentTarget.checked)}
          />
          <span>{t('spread.keepOriginal')}</span>
        </label>
      </div>

      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>{t('spread.help.title')}</div>
        <div
          class={styles.helpText}
          style={{ color: 'var(--color-midnight-blue)' }}
          dangerouslySetInnerHTML={{ __html: t('spread.help.description') }}
        />
      </div>
    </div>
  );
}
