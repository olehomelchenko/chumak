import { RefObject } from 'preact';
import { useTranslation } from 'preact-i18next';
import styles from '../EdaPanel.module.css';

interface EdaNumericSectionProps {
  edaStats: any;
  view: 'boxplot' | 'histogram';
  brushSelection: { min: number; max: number } | null;
  boxPlotRef: RefObject<HTMLDivElement>;
  histogramRef: RefObject<HTMLDivElement>;
  sampleSize?: { sampled: number; total: number } | null;
  onViewChange: (v: 'boxplot' | 'histogram') => void;
  onApplyBrush: () => void;
  onSelectStat: (label: string, value: any, e: MouseEvent) => void;
}

export function EdaNumericSection({
  edaStats,
  view,
  brushSelection,
  boxPlotRef,
  histogramRef,
  sampleSize,
  onViewChange,
  onApplyBrush,
  onSelectStat,
}: EdaNumericSectionProps) {
  const { t } = useTranslation('ui');

  return (
    <div class={styles.edaChartGrid}>
      {/* Container 1: Title/Controls + Chart */}
      <div class={styles.edaChartSection}>
        <div class={styles.edaSection__title}>
          <span>
            {t('eda.numeric.title')}
            {view === 'boxplot' && sampleSize && (
              <span
                class={styles.edaSampleIndicator}
                title={t('eda.numeric.sampledTooltip', {
                  sampled: sampleSize.sampled.toLocaleString(),
                  total: sampleSize.total.toLocaleString(),
                })}
              >
                <span class="iconify" aria-hidden="true" data-icon="carbon:information" />
              </span>
            )}
          </span>
          <div class={styles.chartSwitcher}>
            <button
              class={`${styles.chartSwitcher__btn} ${view === 'boxplot' ? styles['chartSwitcher__btn--active'] : ''}`}
              onClick={() => onViewChange('boxplot')}
            >
              {t('eda.numeric.charts.boxplot')}
            </button>
            <button
              class={`${styles.chartSwitcher__btn} ${view === 'histogram' ? styles['chartSwitcher__btn--active'] : ''}`}
              onClick={() => onViewChange('histogram')}
            >
              {t('eda.numeric.charts.histogram')}
            </button>
          </div>
        </div>
        <div class={styles.chartContainer}>
          {view === 'boxplot' && <div ref={boxPlotRef} class={styles.chart} />}
          {view === 'histogram' && <div ref={histogramRef} class={styles.chart} />}
          {view === 'histogram' && brushSelection && (
            <div class={styles.brushTooltip}>
              <span class={styles.brushBounds}>
                [{Number(brushSelection.min).toFixed(3)} - {Number(brushSelection.max).toFixed(3)}]
              </span>
              <button class="button button--primary button--small" onClick={onApplyBrush}>
                {t('eda.numeric.keepSelection')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Container 2: Stats Flow */}
      <div class={styles.edaStatsSection}>
        <EdaStatsFlow edaStats={edaStats} onSelectStat={onSelectStat} />
      </div>
    </div>
  );
}

interface EdaStatsFlowProps {
  edaStats: any;
  onSelectStat: (label: string, value: any, e: MouseEvent) => void;
}

function EdaStatsFlow({ edaStats, onSelectStat }: EdaStatsFlowProps) {
  const { t } = useTranslation('ui');

  return (
    <div class={styles.edaStatsFlow}>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat(t('eda.numeric.stats.min'), edaStats.raw.min, e)}
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.min')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.min}</div>
      </div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) =>
          onSelectStat(t('eda.numeric.stats.meanMinus3Sigma'), edaStats.raw.meanMinus3Sigma, e)
        }
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.meanMinus3SigmaLabel')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.meanMinus3Sigma}</div>
      </div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat(t('eda.numeric.stats.p25'), edaStats.raw.p25, e)}
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.p25Label')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.p25}</div>
      </div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat(t('eda.numeric.stats.median'), edaStats.raw.median, e)}
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.median')}</div>
        <div class={`${styles.edaFlowItem__value} ${styles['edaFlowItem__value--highlight']}`}>
          {edaStats.median}
        </div>
      </div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat(t('eda.numeric.stats.p75'), edaStats.raw.p75, e)}
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.p75Label')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.p75}</div>
      </div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) =>
          onSelectStat(t('eda.numeric.stats.meanPlus3Sigma'), edaStats.raw.meanPlus3Sigma, e)
        }
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.meanPlus3SigmaLabel')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.meanPlus3Sigma}</div>
      </div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat(t('eda.numeric.stats.max'), edaStats.raw.max, e)}
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.max')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.max}</div>
      </div>

      <div class={styles.edaFlowDivider}></div>

      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat(t('eda.numeric.stats.mean'), edaStats.raw.mean, e)}
      >
        <div class={styles.edaFlowItem__label}>{t('eda.numeric.stats.mean')}</div>
        <div class={styles.edaFlowItem__value}>{edaStats.mean}</div>
      </div>
    </div>
  );
}
