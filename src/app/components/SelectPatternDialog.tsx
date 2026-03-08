import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import styles from './form-controls.module.css';

export function SelectPatternDialog() {
  const { t } = useTranslation('dialogs');
  const { pattern, matchType, error } = DialogStore.selectPatternState;

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        {t('pattern.select.help')}
      </p>

      <div class={styles.group}>
        <label class={styles.label}>{t('common.labels.pattern')}</label>
        <input
          type="text"
          class={styles.input}
          value={pattern.value}
          onInput={(e) => (pattern.value = (e.target as HTMLInputElement).value)}
          placeholder={t('pattern.select.placeholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('common.labels.matchType')}</label>
        <select
          class={styles.input}
          value={matchType.value}
          onChange={(e) => (matchType.value = (e.target as HTMLSelectElement).value as any)}
        >
          <option value="prefix">{t('common.matchTypes.prefix')}</option>
          <option value="suffix">{t('common.matchTypes.suffix')}</option>
          <option value="contains">{t('common.matchTypes.contains')}</option>
          <option value="regex">{t('common.matchTypes.regex')}</option>
        </select>
        <p class={styles.helpText}>
          {matchType.value === 'prefix' && t('common.matchTypeHelp.prefix')}
          {matchType.value === 'suffix' && t('common.matchTypeHelp.suffix')}
          {matchType.value === 'contains' && t('common.matchTypeHelp.contains')}
          {matchType.value === 'regex' && t('common.matchTypeHelp.regex')}
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
