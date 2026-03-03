import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import styles from './TransformDialog.module.css';

/**
 * UnrollDialog component
 * Expands array values into separate rows
 */
export function UnrollDialog() {
  const { t } = useTranslation('dialogs');
  const { column, indices, keepOriginal } = DialogStore.unrollState;
  const columns = AppStore.columns.value;

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
