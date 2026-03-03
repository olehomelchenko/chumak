import { RefObject } from 'preact';
import { useTranslation } from 'preact-i18next';
import styles from '../EdaPanel.module.css';

interface EdaCategoricalSectionProps {
  edaStats: {
    topValues: Array<{
      value: string;
      count: number;
      percentage: number;
      isOther?: boolean;
      isNull?: boolean;
    }>;
  };
  categoricalBarRef: RefObject<HTMLDivElement>;
}

export function EdaCategoricalSection({ edaStats, categoricalBarRef }: EdaCategoricalSectionProps) {
  const { t } = useTranslation('ui');

  return (
    <div class={`${styles.edaSection} ${styles['edaSection--wide']}`}>
      <div class={styles.edaSection__title}>{t('eda.categorical.title')}</div>
      <div class={styles.categoricalLayout}>
        <div ref={categoricalBarRef} style={{ flex: 1, minWidth: 0, minHeight: '80px' }}></div>

        <div class={styles.edaFrequencies}>
          {edaStats.topValues?.map((item: any) => (
            <div
              class={`${styles.edaFreqItem} ${item.isOther ? styles['edaFreqItem--other'] : ''} ${item.isNull ? styles['edaFreqItem--null'] : ''}`}
              key={item.value}
            >
              <div class={styles.edaFreqItem__label} title={item.value}>
                {item.value || t('eda.categorical.emptyValue')}
              </div>
              <div class={styles.edaFreqItem__barContainer}>
                <div
                  class={styles.edaFreqItem__bar}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.isNull
                      ? '#666666'
                      : item.isOther
                        ? 'var(--color-medium-gray)'
                        : 'var(--color-cyan)',
                  }}
                ></div>
              </div>
              <div class={styles.edaFreqItem__value}>
                {item.count.toLocaleString()} ({item.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
