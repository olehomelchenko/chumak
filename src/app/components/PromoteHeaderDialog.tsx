import { computed } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

export function PromoteHeaderDialog() {
  const { t } = useTranslation('dialogs');
  const { skipRows } = DialogStore.promoteHeaderState;
  const rowCount = AppStore.currentData.value?.length || 0;

  const previewText = computed(() => {
    const n = skipRows.value;
    if (rowCount === 0) return null;
    const headerRowNum = n + 1;
    if (headerRowNum > rowCount) {
      return t('promoteHeader.preview.notEnoughRows');
    }
    return t('promoteHeader.preview.willUse', { row: headerRowNum });
  });

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>{t('promoteHeader.skipRowsLabel')}</label>
        <input
          type="number"
          class={styles.input}
          value={skipRows.value}
          onInput={(e) =>
            (skipRows.value = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0))
          }
          min="0"
          placeholder="0"
        />
        <div class={styles.helpText}>{t('promoteHeader.skipRowsHelp')}</div>
      </div>

      <div class={styles.expressionHelp}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}>
          {previewText.value}
          <span style={{ marginLeft: '0.5rem', color: 'var(--color-medium-gray)' }}>
            {t('sliceRows.totalRows', { count: rowCount })}
          </span>
        </span>
      </div>
    </div>
  );
}
