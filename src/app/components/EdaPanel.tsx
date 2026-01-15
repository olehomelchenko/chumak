import { useEffect, useRef } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { ChartsEngine } from '../../core/charts';
import { EDAEngine } from '../../core/eda-engine';
import { SchemaEngine } from '../../core/schema-engine';

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
      // Box Plot
      if (isNumeric && view === 'boxplot' && boxPlotRef.current) {
        await ChartsEngine.renderBoxPlot(boxPlotRef.current, currentData, selectedColumn, theme);
      }

      // Histogram
      if (isNumeric && view === 'histogram' && histogramRef.current) {
        await ChartsEngine.renderHistogram(
          histogramRef.current,
          currentData,
          selectedColumn,
          theme,
          (sel) => (AppStore.edaBrushSelection.value = sel)
        );
      }

      // Temporal Chart
      if (isDate && dateTreatment === 'temporal' && temporalChartRef.current) {
        await ChartsEngine.renderTemporalChart(
          temporalChartRef.current,
          currentData,
          selectedColumn,
          theme
        );
      }

      // Categorical Bar
      if (isCategorical && categoricalBarRef.current && edaStats.topValues) {
        await ChartsEngine.renderCategoricalBar(
          categoricalBarRef.current,
          edaStats.topValues,
          theme
        );
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

    // Must yield to signal update?
    setTimeout(() => {
      AppStore.selectedCell.value = {
        col: selectedColumn,
        value: value,
        type: 'number',
        isEda: true,
        edaLabel: label,
      };

      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const toolbarWidth = 220;
      const windowWidth = window.innerWidth;
      const margin = 12;
      let x = Math.max(
        toolbarWidth / 2 + margin,
        Math.min(windowWidth - toolbarWidth / 2 - margin, center)
      );
      AppStore.cellToolbarPos.value = { x: x, y: rect.top - 8, arrowOffset: center - x };
    }, 0);
  };

  const handlePanelClick = (e: MouseEvent) => {
    // Clear cell selection if clicking background
    if (!(e.target as HTMLElement).closest('.eda-flow-item')) {
      AppStore.selectedCell.value = null;
    }
  };

  return (
    <div class="eda-panel" onClick={handlePanelClick}>
      <div class="eda-panel__header">
        <div class="eda-panel__title">
          <span class="eda-panel__column-name">{selectedColumn}</span>
          <span class={`type-badge type-badge--${edaStats.type}`}>{edaStats.type}</span>
          {isDate && (
            <div class="eda-treatment-toggle">
              <button
                class={`eda-treatment-toggle__btn ${dateTreatment === 'temporal' ? 'eda-treatment-toggle__btn--active' : ''}`}
                onClick={() => setDateTreatment('temporal')}
              >
                Temporal
              </button>
              <button
                class={`eda-treatment-toggle__btn ${dateTreatment === 'categorical' ? 'eda-treatment-toggle__btn--active' : ''}`}
                onClick={() => setDateTreatment('categorical')}
              >
                Categorical
              </button>
            </div>
          )}
        </div>
        <button class="eda-panel__close" onClick={clearSelection}>
          ×
        </button>
      </div>

      <div class="eda-panel__content">
        {/* Common Stats */}
        <div class="eda-section">
          <div class="eda-section__title">Overview</div>
          <div class="eda-grid">
            <div class="eda-stat">
              <div class="eda-stat__label">Total Rows</div>
              <div class="eda-stat__value">{edaStats.totalCount?.toLocaleString()}</div>
            </div>
            <div class="eda-stat" title={`${edaStats.nullPercentage}% missing`}>
              <div class="eda-stat__label">Missing</div>
              <div class="eda-stat__value">{edaStats.nullCount?.toLocaleString()}</div>
              <div
                class="eda-stat__sub"
                style={{ color: edaStats.nullCount > 0 ? 'var(--color-red)' : 'inherit' }}
              >
                {edaStats.nullPercentage}%
              </div>
            </div>
            <div class="eda-stat">
              <div class="eda-stat__label">Unique Values</div>
              <div class="eda-stat__value">{edaStats.uniqueCount?.toLocaleString()}</div>
              <div class="eda-stat__sub">{edaStats.uniquePercentage}%</div>
            </div>
          </div>
        </div>

        {/* Numeric Stats */}
        {isNumeric && (
          <div class="eda-section eda-section--wide">
            <div
              class="eda-section__title"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Distribution & Outliers</span>
              <div class="chart-switcher">
                <button
                  class={`chart-switcher__btn ${view === 'boxplot' ? 'chart-switcher__btn--active' : ''}`}
                  onClick={() => setView('boxplot')}
                >
                  Box Plot
                </button>
                <button
                  class={`chart-switcher__btn ${view === 'histogram' ? 'chart-switcher__btn--active' : ''}`}
                  onClick={() => setView('histogram')}
                >
                  Histogram
                </button>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-lg)',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {view === 'boxplot' && (
                <div ref={boxPlotRef} style={{ flex: 1, minWidth: 0, height: '100px' }} />
              )}
              {view === 'histogram' && (
                <div ref={histogramRef} style={{ flex: 1, minWidth: 0, height: '100px' }} />
              )}

              {/* Brushing Action Button */}
              {view === 'histogram' && brushSelection && (
                <div style={{ position: 'absolute', top: '-10px', right: 0, zIndex: 10 }}>
                  <button class="button button--primary button--small" onClick={applyBrush}>
                    Keep Only Selection
                  </button>
                </div>
              )}

              <div class="eda-stats-flow">
                <div class="eda-flow-item" onClick={(e) => selectStat('Min', edaStats.raw.min, e)}>
                  <div class="eda-flow-item__label">Min</div>
                  <div class="eda-flow-item__value">{edaStats.min}</div>
                </div>
                <div class="eda-flow-connector"></div>
                <div class="eda-flow-item" onClick={(e) => selectStat('P25', edaStats.raw.p25, e)}>
                  <div class="eda-flow-item__label">25%</div>
                  <div class="eda-flow-item__value">{edaStats.p25}</div>
                </div>
                <div class="eda-flow-connector"></div>
                <div
                  class="eda-flow-item"
                  onClick={(e) => selectStat('Median', edaStats.raw.median, e)}
                >
                  <div class="eda-flow-item__label">Median</div>
                  <div
                    class="eda-flow-item__value"
                    style={{ color: 'var(--color-cyan)', fontWeight: 'bold' }}
                  >
                    {edaStats.median}
                  </div>
                </div>
                <div class="eda-flow-connector"></div>
                <div class="eda-flow-item" onClick={(e) => selectStat('P75', edaStats.raw.p75, e)}>
                  <div class="eda-flow-item__label">75%</div>
                  <div class="eda-flow-item__value">{edaStats.p75}</div>
                </div>
                <div class="eda-flow-connector"></div>
                <div class="eda-flow-item" onClick={(e) => selectStat('Max', edaStats.raw.max, e)}>
                  <div class="eda-flow-item__label">Max</div>
                  <div class="eda-flow-item__value">{edaStats.max}</div>
                </div>

                <div
                  style={{
                    width: '1px',
                    background: 'var(--border-color)',
                    margin: '0 var(--space-md)',
                    height: '24px',
                  }}
                ></div>

                <div class="eda-flow-item">
                  <div class="eda-flow-item__label">Mean</div>
                  <div class="eda-flow-item__value">{edaStats.mean}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Temporal Stats */}
        {isDate && dateTreatment === 'temporal' && (
          <div class="eda-section eda-section--wide">
            <div class="eda-section__title">Timeline Distribution</div>
            <div ref={temporalChartRef} style={{ width: '100%', minHeight: '100px' }}></div>
          </div>
        )}

        {/* Categorical Stats */}
        {isCategorical && (
          <div class="eda-section eda-section--wide">
            <div class="eda-section__title">Frequency Distribution</div>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'start' }}>
              <div
                ref={categoricalBarRef}
                style={{ flex: 1, minWidth: 0, minHeight: '80px' }}
              ></div>

              <div class="eda-frequencies" style={{ minWidth: '300px' }}>
                {edaStats.topValues?.map((item: any) => (
                  <div
                    class="eda-freq-item"
                    key={item.value}
                    style={
                      item.isOther
                        ? {
                            marginTop: '4px',
                            borderTop: '1px dashed var(--border-color)',
                            paddingTop: '4px',
                          }
                        : {}
                    }
                  >
                    <div class="eda-freq-item__label" title={item.value}>
                      {item.value || '(empty)'}
                    </div>
                    <div class="eda-freq-item__bar-container">
                      <div
                        class="eda-freq-item__bar"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.isOther
                            ? 'var(--color-medium-gray)'
                            : 'var(--color-cyan)',
                        }}
                      ></div>
                    </div>
                    <div class="eda-freq-item__value">
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
