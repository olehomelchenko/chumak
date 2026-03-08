import { useTranslation } from 'preact-i18next';
import { flattenEnabled, serializeEnabled } from '../state';
import styles from '../JsonToCsv.module.css';

export function OptionsPanel() {
  const { t } = useTranslation('tools');

  return (
    <div class={styles.sidebarSection}>
      <div class={styles.sidebarLabel}>{t('jsonToCsv.options.label')}</div>

      <div class={styles.optionRow}>
        <input
          type="checkbox"
          id="flatten"
          class={styles.optionCheckbox}
          checked={flattenEnabled.value}
          onChange={(e) => {
            flattenEnabled.value = (e.target as HTMLInputElement).checked;
          }}
        />
        <label for="flatten">
          <div class={styles.optionLabel}>{t('jsonToCsv.options.flatten')}</div>
          <div class={styles.optionHelp}>{t('jsonToCsv.options.flattenHelp')}</div>
        </label>
      </div>

      <div class={styles.optionRow}>
        <input
          type="checkbox"
          id="serialize"
          class={styles.optionCheckbox}
          checked={serializeEnabled.value}
          onChange={(e) => {
            serializeEnabled.value = (e.target as HTMLInputElement).checked;
          }}
        />
        <label for="serialize">
          <div class={styles.optionLabel}>{t('jsonToCsv.options.serialize')}</div>
          <div class={styles.optionHelp}>{t('jsonToCsv.options.serializeHelp')}</div>
        </label>
      </div>
    </div>
  );
}
