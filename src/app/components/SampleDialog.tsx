import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

/**
 * SampleDialog component
 * Allows users to take a random sample of rows with optional seed
 */
export function SampleDialog() {
  const { t } = useTranslation('dialogs');
  const currentData = AppStore.currentData.value;
  const totalRows = currentData ? currentData.length : 0;

  const { state } = useDialogState(
    (ctx) => ({
      count: signal<number>(ctx.editingStep?.sample?.count ?? 100),
      seed: signal<number | undefined>(ctx.editingStep?.sample?.seed),
    }),
    {
      hasError: (s) => !s.count.value || s.count.value <= 0,
    }
  );

  const { count, seed } = state;

  return (
    <div class={styles.formSection}>
      <div class={styles.group}>
        <label class={styles.label} htmlFor="sample-count">
          {t('sample.sampleSize')}
        </label>
        <input
          id="sample-count"
          type="number"
          class={styles.input}
          value={count.value}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            count.value = isNaN(val) ? 0 : val;
          }}
          min="1"
          max={totalRows}
        />
        <div class={styles.helpText}>{t('sample.totalAvailable', { count: totalRows })}</div>
      </div>

      <div class={styles.group}>
        <label class={styles.label} htmlFor="sample-seed">
          {t('sample.seed.label')}
        </label>
        <input
          id="sample-seed"
          type="number"
          class={styles.input}
          value={seed.value ?? ''}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            seed.value = isNaN(val) ? undefined : val;
          }}
          placeholder={t('sample.seed.placeholder')}
        />
        <div class={styles.helpText}>{t('sample.seed.helpText')}</div>
      </div>

      <div class={styles.expressionHelp}>
        <div class={styles.expressionHelpTitle}>{t('sample.howItWorks.title')}</div>
        <div class={styles.helpText} style={{ color: 'var(--color-midnight-blue)' }}>
          {t('sample.howItWorks.description')}
        </div>
      </div>
    </div>
  );
}
