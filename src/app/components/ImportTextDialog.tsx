import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';

const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';

export function ImportTextDialog() {
  const { t } = useTranslation('ui');
  const { text, isEditMode } = DialogStore.importTextState;

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>
          {isEditMode.value ? t('importText.labelEdit') : t('importText.label')}
        </label>
        <textarea
          class={styles.input}
          value={text.value}
          onInput={(e) => {
            text.value = (e.target as HTMLTextAreaElement).value;
          }}
          placeholder={t('importText.placeholder')}
          autoFocus
          style={{
            minHeight: '300px',
            resize: 'vertical',
            fontFamily: 'var(--font-family-mono, monospace)',
            fontSize: 'var(--font-size-sm)',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
          }}
        />
        <p class={styles.helpText}>{t('importText.helpText')}</p>
        <p class={styles.helpText}>{t('importText.shortcutHint', { mod })}</p>
      </div>
    </div>
  );
}
