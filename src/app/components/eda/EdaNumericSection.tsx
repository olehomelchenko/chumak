import { RefObject } from 'preact';
import styles from '../EdaPanel.module.css';

interface EdaNumericSectionProps {
  edaStats: any;
  view: 'boxplot' | 'histogram';
  brushSelection: { min: number; max: number } | null;
  boxPlotRef: RefObject<HTMLDivElement>;
  histogramRef: RefObject<HTMLDivElement>;
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
  onViewChange,
  onApplyBrush,
  onSelectStat,
}: EdaNumericSectionProps) {
  return (
    <div class={styles.edaChartGrid}>
      {/* Container 1: Title/Controls + Chart */}
      <div class={styles.edaChartSection}>
        <div class={styles.edaSection__title}>
          <span>Distribution & Outliers</span>
          <div class={styles.chartSwitcher}>
            <button
              class={`${styles.chartSwitcher__btn} ${view === 'boxplot' ? styles['chartSwitcher__btn--active'] : ''}`}
              onClick={() => onViewChange('boxplot')}
            >
              Box Plot
            </button>
            <button
              class={`${styles.chartSwitcher__btn} ${view === 'histogram' ? styles['chartSwitcher__btn--active'] : ''}`}
              onClick={() => onViewChange('histogram')}
            >
              Histogram
            </button>
          </div>
        </div>
        <div class={styles.chartContainer}>
          {view === 'boxplot' && <div ref={boxPlotRef} class={styles.chart} />}
          {view === 'histogram' && <div ref={histogramRef} class={styles.chart} />}
        </div>
      </div>

      {/* Container 2: Selection Preview + Stats Flow */}
      <div class={styles.edaStatsSection}>
        <div class={styles.selectionPreview}>
          {view === 'histogram' && brushSelection ? (
            <>
              <button class="button button--primary button--small" onClick={onApplyBrush}>
                Keep Only Selection
              </button>
              <span class={styles.brushBounds}>
                [{Number(brushSelection.min).toFixed(3)} - {Number(brushSelection.max).toFixed(3)}]
              </span>
            </>
          ) : (
            <span class={styles.selectionPlaceholder}></span>
          )}
        </div>
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
  return (
    <div class={styles.edaStatsFlow}>
      <div class={styles.edaFlowItem} onClick={(e) => onSelectStat('Min', edaStats.raw.min, e)}>
        <div class={styles.edaFlowItem__label}>Min</div>
        <div class={styles.edaFlowItem__value}>{edaStats.min}</div>
      </div>
      <div class={styles.edaFlowConnector}></div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat('Mean - 3σ', edaStats.raw.meanMinus3Sigma, e)}
      >
        <div class={styles.edaFlowItem__label}>μ-3σ</div>
        <div class={styles.edaFlowItem__value}>{edaStats.meanMinus3Sigma}</div>
      </div>
      <div class={styles.edaFlowConnector}></div>
      <div class={styles.edaFlowItem} onClick={(e) => onSelectStat('P25', edaStats.raw.p25, e)}>
        <div class={styles.edaFlowItem__label}>25%</div>
        <div class={styles.edaFlowItem__value}>{edaStats.p25}</div>
      </div>
      <div class={styles.edaFlowConnector}></div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat('Median', edaStats.raw.median, e)}
      >
        <div class={styles.edaFlowItem__label}>Median</div>
        <div class={`${styles.edaFlowItem__value} ${styles['edaFlowItem__value--highlight']}`}>
          {edaStats.median}
        </div>
      </div>
      <div class={styles.edaFlowConnector}></div>
      <div class={styles.edaFlowItem} onClick={(e) => onSelectStat('P75', edaStats.raw.p75, e)}>
        <div class={styles.edaFlowItem__label}>75%</div>
        <div class={styles.edaFlowItem__value}>{edaStats.p75}</div>
      </div>
      <div class={styles.edaFlowConnector}></div>
      <div
        class={styles.edaFlowItem}
        onClick={(e) => onSelectStat('Mean + 3σ', edaStats.raw.meanPlus3Sigma, e)}
      >
        <div class={styles.edaFlowItem__label}>μ+3σ</div>
        <div class={styles.edaFlowItem__value}>{edaStats.meanPlus3Sigma}</div>
      </div>
      <div class={styles.edaFlowConnector}></div>
      <div class={styles.edaFlowItem} onClick={(e) => onSelectStat('Max', edaStats.raw.max, e)}>
        <div class={styles.edaFlowItem__label}>Max</div>
        <div class={styles.edaFlowItem__value}>{edaStats.max}</div>
      </div>

      <div class={styles.edaFlowDivider}></div>

      <div class={styles.edaFlowItem} onClick={(e) => onSelectStat('Mean', edaStats.raw.mean, e)}>
        <div class={styles.edaFlowItem__label}>Mean</div>
        <div class={styles.edaFlowItem__value}>{edaStats.mean}</div>
      </div>
    </div>
  );
}
