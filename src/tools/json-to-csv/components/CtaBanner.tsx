import { useTranslation } from 'preact-i18next';
import styles from '../JsonToCsv.module.css';

export function CtaBanner() {
  const { t } = useTranslation('tools');

  return (
    <div class={styles.cta}>
      <div class={styles.ctaTitle}>{t('jsonToCsv.cta.title')}</div>
      <div class={styles.ctaDescription}>{t('jsonToCsv.cta.description')}</div>
      <a href="/app/" class={styles.ctaButton}>
        {t('jsonToCsv.cta.button')}
      </a>
    </div>
  );
}
