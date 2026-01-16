import { useEffect, useRef } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { ChartsEngine } from '../../core/charts';
import { EDAEngine } from '../../core/eda-engine';
import { SchemaEngine } from '../../core/schema-engine';
import styles from './EdaPanel.module.css';

export function EdaPanel({ onApplyFilter }: { onApplyFilter?: () => void }) {
  const boxPlotRef = useRef<HTMLDivElement>(null);
  const histogramRef = useRef<HTMLDivElement>(null);
  const temporalChartRef = useRef<HTMLDivElement>(null);
  const categoricalBarRef = useRef<HTMLDivElement>(null);

  const selectedColumn = AppStore.selectedColumn.value;
  const currentData = AppStore.currentData.value;
  const edaStats = AppStore.edaStats.value;
  const theme = AppStore.theme.value;
  const view = AppStore.edaChartView.value;
  const dateTreatment = AppStore.edaDateTreatment.value;
  const brushSelection = AppStore.edaBrushSelection.value;

  // Computed helpers
  const isNumeric = edaStats && ['number', 'integer', 'float'].includes(edaStats.type);
  const isDate = edaStats && ['date', 'datetime'].includes(edaStats.type);
  const isCategorical = edaStats && !isNumeric && !(isDate && dateTreatment === 'temporal');

  // Effect to calculate stats when selection changes
  useEffect(() => {
    if (selectedColumn && currentData) {
      let colSchema = null;
      if (AppStore.activeModel.value?.schema) {
        colSchema = AppStore.activeModel.value.schema.find((c) => c.name === selectedColumn);
      } else if (AppStore.activeSource.value?.columns) {
        colSchema = AppStore.activeSource.value.columns.find((c) => c.name === selectedColumn);
      }

      const type = colSchema
        ? colSchema.type
        : SchemaEngine.inferType(currentData.slice(0, 20).map((r) => r[selectedColumn]));

      const stats = EDAEngine.calculateStats(currentData, selectedColumn, type);
      AppStore.edaStats.value = stats;
      AppStore.edaBrushSelection.value = null; // Reset brush
    } else {
      AppStore.edaStats.value = null;
      AppStore.edaBrushSelection.value = null;
    }
  }, [selectedColumn, currentData]);

  // Effect to render charts
  useEffect(() => {
    if (!selectedColumn || !currentData || !edaStats) return;

    const renderCharts = async () => {
      // Small delay to ensure DOM elements are mounted
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Helper to check if element is in DOM
      const isInDOM = (el: HTMLElement | null): el is HTMLElement => {
        return el !== null && document.body.contains(el);
      };

      // Box Plot
      if (isNumeric && view === 'boxplot' && isInDOM(boxPlotRef.current)) {
        try {
          await ChartsEngine.renderBoxPlot(boxPlotRef.current, currentData, selectedColumn, theme);
        } catch (error) {
          console.error('Error rendering box plot:', error);
        }
      }

      // Histogram
      if (isNumeric && view === 'histogram' && isInDOM(histogramRef.current)) {
        try {
          await ChartsEngine.renderHistogram(
            histogramRef.current,
            currentData,
            selectedColumn,
            theme,
            (sel) => (AppStore.edaBrushSelection.value = sel)
          );
        } catch (error) {
          console.error('Error rendering histogram:', error);
        }
      }

      // Temporal Chart
      if (isDate && dateTreatment === 'temporal' && isInDOM(temporalChartRef.current)) {
        try {
          await ChartsEngine.renderTemporalChart(
            temporalChartRef.current,
            currentData,
            selectedColumn,
            theme
          );
        } catch (error) {
          console.error('Error rendering temporal chart:', error);
        }
      }

      // Categorical Bar
      if (isCategorical && isInDOM(categoricalBarRef.current) && edaStats.topValues) {
        try {
          await ChartsEngine.renderCategoricalBar(
            categoricalBarRef.current,
            edaStats.topValues,
            theme
          );
        } catch (error) {
          console.error('Error rendering categorical bar:', error);
        }
      }
    };

    renderCharts();
  }, [
    selectedColumn,
    currentData,
    edaStats,
    view,
    dateTreatment,
    theme,
    isNumeric,
    isDate,
    isCategorical,
  ]);

  if (!selectedColumn || !edaStats) return null;

  const clearSelection = () => {
    AppStore.selectedColumn.value = null;
  };

  const setView = (v: 'boxplot' | 'histogram') => {
    AppStore.edaChartView.value = v;
  };

  const setDateTreatment = (t: 'temporal' | 'categorical') => {
    AppStore.edaDateTreatment.value = t;
  };

  const applyBrush = async () => {
    if (!brushSelection || !selectedColumn) return;
    const { min, max } = brushSelection;
    const fmtMin = Number.isInteger(min) ? min : min.toFixed(4);
    const fmtMax = Number.isInteger(max) ? max : max.toFixed(4);
    const expr = `[${selectedColumn}] >= ${fmtMin} && [${selectedColumn}] <= ${fmtMax}`;

    DialogStore.filterState.expression.value = expr;
    DialogStore.filterState.error.value = null;

    // We need to trigger the transform.
    if (onApplyFilter) {
      onApplyFilter();
    }

    clearSelection();
  };

  const selectStat = (label: string, value: any, e: MouseEvent) => {
    e.stopPropagation();
    AppStore.selectedCell.value = null;

    // Capture element reference before setTimeout (event object gets nullified)
    const el = e.currentTarget as HTMLElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const toolbarWidth = 220;
    const windowWidth = window.innerWidth;
    const margin = 12;
    let x = Math.max(
      toolbarWidth / 2 + margin,
      Math.min(windowWidth - toolbarWidth / 2 - margin, center)
    );
    const toolbarPos = { x: x, y: rect.top - 8, arrowOffset: center - x };

    // Must yield to signal update?
    setTimeout(() => {
      AppStore.selectedCell.value = {
        col: selectedColumn,
        value: value,
        type: 'number',
        isEda: true,
        edaLabel: label,
      };
      AppStore.cellToolbarPos.value = toolbarPos;
    }, 0);
  };

  const handlePanelClick = (e: MouseEvent) => {
    // Clear cell selection if clicking background
    if (!(e.target as HTMLElement).closest(`.${styles.edaFlowItem}`)) {
      AppStore.selectedCell.value = null;
    }
  };

  return (
    <div class={styles.edaPanel} onClick={handlePanelClick}>
      <div class={styles.edaPanel__header}>
        <div class={styles.edaPanel__title}>
          <span class={styles.edaPanel__columnName}>{selectedColumn}</span>
          <span class={`type-badge type-badge--${edaStats.type}`}>{edaStats.type}</span>
          {isDate && (
            <div class={styles.edaTreatmentToggle}>
              <button
                class={`${styles.edaTreatmentToggle__btn} ${dateTreatment === 'temporal' ? styles['edaTreatmentToggle__btn--active'] : ''}`}
                onClick={() => setDateTreatment('temporal')}
              >
                Temporal
              </button>
              <button
                class={`${styles.edaTreatmentToggle__btn} ${dateTreatment === 'categorical' ? styles['edaTreatmentToggle__btn--active'] : ''}`}
                onClick={() => setDateTreatment('categorical')}
              >
                Categorical
              </button>
            </div>
          )}
        </div>
        <button class={styles.edaPanel__close} onClick={clearSelection}>
          ×
        </button>
      </div>

      <div class={styles.edaPanel__content}>
        {/* Common Stats - Left Column */}
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
          </div>
        </div>

        {/* Numeric Stats - Right Column Grid */}
        {isNumeric && (
          <div class={styles.edaChartGrid}>
            {/* Container 1: Title/Controls (ccc) + Chart (CCC) */}
            <div class={styles.edaChartSection}>
              <div class={styles.edaSection__title}>
                <span>Distribution & Outliers</span>
                <div class={styles.chartSwitcher}>
                  <button
                    class={`${styles.chartSwitcher__btn} ${view === 'boxplot' ? styles['chartSwitcher__btn--active'] : ''}`}
                    onClick={() => setView('boxplot')}
                  >
                    Box Plot
                  </button>
                  <button
                    class={`${styles.chartSwitcher__btn} ${view === 'histogram' ? styles['chartSwitcher__btn--active'] : ''}`}
                    onClick={() => setView('histogram')}
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

            {/* Container 2: Selection Preview (jjj) + Stats Flow (ttt) */}
            <div class={styles.edaStatsSection}>
              <div class={styles.selectionPreview}>
                {view === 'histogram' && brushSelection ? (
                  <>
                    <button class="button button--primary button--small" onClick={applyBrush}>
                      Keep Only Selection
                    </button>
                    <span class={styles.brushBounds}>
                      [{Number(brushSelection.min).toFixed(3)} -{' '}
                      {Number(brushSelection.max).toFixed(3)}]
                    </span>
                  </>
                ) : (
                  <span class={styles.selectionPlaceholder}></span>
                )}
              </div>
              <div class={styles.edaStatsFlow}>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('Min', edaStats.raw.min, e)}
                >
                  <div class={styles.edaFlowItem__label}>Min</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.min}</div>
                </div>
                <div class={styles.edaFlowConnector}></div>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('Mean - 3σ', edaStats.raw.meanMinus3Sigma, e)}
                >
                  <div class={styles.edaFlowItem__label}>μ-3σ</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.meanMinus3Sigma}</div>
                </div>
                <div class={styles.edaFlowConnector}></div>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('P25', edaStats.raw.p25, e)}
                >
                  <div class={styles.edaFlowItem__label}>25%</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.p25}</div>
                </div>
                <div class={styles.edaFlowConnector}></div>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('Median', edaStats.raw.median, e)}
                >
                  <div class={styles.edaFlowItem__label}>Median</div>
                  <div
                    class={`${styles.edaFlowItem__value} ${styles['edaFlowItem__value--highlight']}`}
                  >
                    {edaStats.median}
                  </div>
                </div>
                <div class={styles.edaFlowConnector}></div>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('P75', edaStats.raw.p75, e)}
                >
                  <div class={styles.edaFlowItem__label}>75%</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.p75}</div>
                </div>
                <div class={styles.edaFlowConnector}></div>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('Mean + 3σ', edaStats.raw.meanPlus3Sigma, e)}
                >
                  <div class={styles.edaFlowItem__label}>μ+3σ</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.meanPlus3Sigma}</div>
                </div>
                <div class={styles.edaFlowConnector}></div>
                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('Max', edaStats.raw.max, e)}
                >
                  <div class={styles.edaFlowItem__label}>Max</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.max}</div>
                </div>

                <div class={styles.edaFlowDivider}></div>

                <div
                  class={styles.edaFlowItem}
                  onClick={(e) => selectStat('Mean', edaStats.raw.mean, e)}
                >
                  <div class={styles.edaFlowItem__label}>Mean</div>
                  <div class={styles.edaFlowItem__value}>{edaStats.mean}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Temporal Stats */}
        {isDate && dateTreatment === 'temporal' && (
          <div class={`${styles.edaSection} ${styles['edaSection--wide']}`}>
            <div class={styles.edaSection__title}>Timeline Distribution</div>
            <div ref={temporalChartRef} style={{ width: '100%', minHeight: '100px' }}></div>
          </div>
        )}

        {/* Categorical Stats */}
        {isCategorical && (
          <div class={`${styles.edaSection} ${styles['edaSection--wide']}`}>
            <div class={styles.edaSection__title}>Frequency Distribution</div>
            <div class={styles.categoricalLayout}>
              <div
                ref={categoricalBarRef}
                style={{ flex: 1, minWidth: 0, minHeight: '80px' }}
              ></div>

              <div class={styles.edaFrequencies}>
                {edaStats.topValues?.map((item: any) => (
                  <div
                    class={`${styles.edaFreqItem} ${item.isOther ? styles['edaFreqItem--other'] : ''} ${item.isNull ? styles['edaFreqItem--null'] : ''}`}
                    key={item.value}
                  >
                    <div class={styles.edaFreqItem__label} title={item.value}>
                      {item.value || '(empty)'}
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
        )}
      </div>
    </div>
  );
}
