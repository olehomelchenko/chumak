import { computed } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

export function IndexDialog() {
  const { t } = useTranslation('dialogs');
  const { columnName, startFrom } = DialogStore.indexState;
  const rowCount = AppStore.currentData.value?.length || 0;
  const endValue = computed(() => (startFrom.value || 0) + rowCount - 1);
  const displayName = computed(() => columnName.value || 'row_index');

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>{t('index.columnNameLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder={t('index.columnNamePlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('index.startFromLabel')}</label>
        <input
          type="number"
          class={styles.input}
          value={startFrom.value}
          onInput={(e) => (startFrom.value = parseInt((e.target as HTMLInputElement).value) || 0)}
          min="0"
          placeholder={t('index.startFromPlaceholder')}
        />
      </div>

      <div class={`${styles.group} ${styles.expressionHelp}`}>
        <span
          style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}
          dangerouslySetInnerHTML={{
            __html: t('index.preview', {
              columnName: displayName.value,
              startFrom: startFrom.value,
              endValue: endValue.value,
            }),
          }}
        />
      </div>
    </div>
  );
}
