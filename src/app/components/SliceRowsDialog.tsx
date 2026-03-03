import { computed } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

// Re-export for backward compatibility
export type { SliceMode } from '../../types/modes';

export function SliceRowsDialog() {
  const { t } = useTranslation('dialogs');
  const { count, mode } = DialogStore.sliceRowsState;
  const rowCount = AppStore.currentData.value?.length || 0;
  // Computed values for the preview text
  const previewText = computed(() => {
    const n = count.value || 0;
    const total = rowCount || 0;

    switch (mode.value) {
      case 'first': {
        const end = Math.min(n, total);
        return <>{t('sliceRows.preview.keepFirst', { start: 1, end })}</>;
      }
      case 'last': {
        const start = Math.max(1, total - n + 1);
        return <>{t('sliceRows.preview.keepLast', { start, end: total })}</>;
      }
      case 'removeFirst': {
        const end = Math.min(n, total);
        return <>{t('sliceRows.preview.removeFirst', { start: 1, end })}</>;
      }
      case 'removeLast': {
        const start = Math.max(1, total - n + 1);
        return <>{t('sliceRows.preview.removeLast', { start, end: total })}</>;
      }
      default:
        return null;
    }
  });

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>{t('sliceRows.rowCount')}</label>
        <input
          type="number"
          class={styles.input}
          value={count.value}
          onInput={(e) => (count.value = parseInt((e.target as HTMLInputElement).value) || 0)}
          min="1"
          placeholder="10"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('sliceRows.mode.label')}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'first'}
              onChange={() => (mode.value = 'first')}
            />
            <span>{t('sliceRows.mode.keepFirst')}</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'last'}
              onChange={() => (mode.value = 'last')}
            />
            <span>{t('sliceRows.mode.keepLast')}</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'removeFirst'}
              onChange={() => (mode.value = 'removeFirst')}
            />
            <span>{t('sliceRows.mode.removeFirst')}</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'removeLast'}
              onChange={() => (mode.value = 'removeLast')}
            />
            <span>{t('sliceRows.mode.removeLast')}</span>
          </label>
        </div>
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
