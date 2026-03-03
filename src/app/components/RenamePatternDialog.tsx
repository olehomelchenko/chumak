import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';

export function RenamePatternDialog() {
  const { t } = useTranslation('dialogs');
  const { find, replace: replaceValue, regex, error } = DialogStore.renamePatternState;

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        {t('pattern.rename.help')}
      </p>

      <div class={styles.group}>
        <label class={styles.label}>{t('pattern.rename.findLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={find.value}
          onInput={(e) => (find.value = (e.target as HTMLInputElement).value)}
          placeholder={t('pattern.rename.findPlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('pattern.rename.replaceLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={replaceValue.value}
          onInput={(e) => (replaceValue.value = (e.target as HTMLInputElement).value)}
          placeholder={t('pattern.rename.replacePlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={regex.value}
            onChange={(e) => (regex.value = (e.target as HTMLInputElement).checked)}
          />
          <span>{t('pattern.rename.useRegex')}</span>
        </label>
        <p class={styles.helpText}>
          {regex.value ? t('pattern.rename.regexHelpOn') : t('pattern.rename.regexHelpOff')}
        </p>
      </div>

      {error.value && (
        <div class={styles.error} style={{ marginTop: '1rem' }}>
          {error.value}
        </div>
      )}
    </div>
  );
}
