import { useTranslation } from 'preact-i18next';
import styles from '../EdaPanel.module.css';

interface EdaOverviewProps {
  edaStats: {
    totalCount: number;
    nullCount: number;
    nullPercentage: number;
    uniqueCount: number;
    uniquePercentage: number;
    errorCount: number;
    errorPercentage: number;
  };
}

export function EdaOverview({ edaStats }: EdaOverviewProps) {
  const { t } = useTranslation('ui');
  return (
    <div class={styles.edaOverview}>
      <div class={styles.edaSection__title}>{t('eda.overview.title')}</div>
      <div class={styles.edaStatsList}>
        <div class={styles.edaStat}>
          <div class={styles.edaStat__label}>{t('eda.overview.totalRows')}</div>
          <div class={styles.edaStat__value}>{edaStats.totalCount?.toLocaleString()}</div>
        </div>
        <div
          class={styles.edaStat}
          title={t('eda.overview.missingTooltip', { percent: edaStats.nullPercentage })}
        >
          <div class={styles.edaStat__label}>{t('eda.overview.missing')}</div>
          <div class={styles.edaStat__value}>{edaStats.nullCount?.toLocaleString()}</div>
          <div
            class={styles.edaStat__sub}
            style={{ color: edaStats.nullCount > 0 ? 'var(--color-red)' : 'inherit' }}
          >
            {edaStats.nullPercentage}%
          </div>
        </div>
        <div class={styles.edaStat}>
          <div class={styles.edaStat__label}>{t('eda.overview.uniqueValues')}</div>
          <div class={styles.edaStat__value}>{edaStats.uniqueCount?.toLocaleString()}</div>
          <div class={styles.edaStat__sub}>{edaStats.uniquePercentage}%</div>
        </div>
        <div
          class={styles.edaStat}
          title={t('eda.overview.errorsTooltip', { percent: edaStats.errorPercentage })}
        >
          <div class={styles.edaStat__label}>{t('eda.overview.errors')}</div>
          <div class={styles.edaStat__value}>{edaStats.errorCount?.toLocaleString()}</div>
          <div
            class={styles.edaStat__sub}
            style={{ color: edaStats.errorCount > 0 ? 'var(--color-red)' : 'inherit' }}
          >
            {edaStats.errorPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
}
