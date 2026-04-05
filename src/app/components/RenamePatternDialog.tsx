import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { useDialogState } from '../hooks/useDialogState';
import { validateRegexPattern } from '../handlers/validation-engine';
import styles from './form-controls.module.css';

export function RenamePatternDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => ({
      find: signal<string>(ctx.editingStep?.renamePattern?.find ?? ''),
      replace: signal<string>(ctx.editingStep?.renamePattern?.replace ?? ''),
      regex: signal<boolean>(ctx.editingStep?.renamePattern?.regex ?? false),
      error: signal<string | null>(null),
    }),
    {
      hasError: (s) => !s.find.value?.trim() || !!s.error.value,
      getError: (s) => s.error.value,
    }
  );

  const { find, replace: replaceValue, regex, error } = state;

  const validatePattern = () => {
    if (regex.value) {
      validateRegexPattern(find.value, { errorSignal: error });
    } else {
      error.value = null;
    }
  };

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
          onInput={(e) => {
            find.value = (e.target as HTMLInputElement).value;
            validatePattern();
          }}
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
            onChange={(e) => {
              regex.value = (e.target as HTMLInputElement).checked;
              validatePattern();
            }}
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
