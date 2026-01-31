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
  return (
    <div class={styles.edaOverview}>
      <div class={styles.edaSection__title}>Overview</div>
      <div class={styles.edaStatsList}>
        <div class={styles.edaStat}>
          <div class={styles.edaStat__label}>Total Rows</div>
          <div class={styles.edaStat__value}>{edaStats.totalCount?.toLocaleString()}</div>
        </div>
        <div class={styles.edaStat} title={`${edaStats.nullPercentage}% missing`}>
          <div class={styles.edaStat__label}>Missing</div>
          <div class={styles.edaStat__value}>{edaStats.nullCount?.toLocaleString()}</div>
          <div
            class={styles.edaStat__sub}
            style={{ color: edaStats.nullCount > 0 ? 'var(--color-red)' : 'inherit' }}
          >
            {edaStats.nullPercentage}%
          </div>
        </div>
        <div class={styles.edaStat}>
          <div class={styles.edaStat__label}>Unique Values</div>
          <div class={styles.edaStat__value}>{edaStats.uniqueCount?.toLocaleString()}</div>
          <div class={styles.edaStat__sub}>{edaStats.uniquePercentage}%</div>
        </div>
        <div class={styles.edaStat} title={`${edaStats.errorPercentage}% errors`}>
          <div class={styles.edaStat__label}>Errors</div>
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
