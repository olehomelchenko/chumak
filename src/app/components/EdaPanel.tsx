import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { ChartsEngine } from '../../core/charts';
import { CategoricalStat } from '../../core/eda-engine';
import { SchemaEngine } from '../../core/schema-engine';
import { computeEdaStats, computeCategoricalOverlay } from '../services/eda-compute';
import { TypeIndicator } from './TypeIndicator';
import { EdaOverview, EdaNumericSection, EdaCategoricalSection } from './eda';
import * as FilterHandlers from '../handlers/transform/filter-handlers';
import * as HelperHandlers from '../handlers/core/helper-handlers';
import styles from './EdaPanel.module.css';

export function EdaPanel() {
  const { t } = useTranslation('ui');
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
  const numericTreatment = AppStore.edaNumericTreatment.value;
  const brushSelection = AppStore.edaBrushSelection.value;

  const categoricalOverlay = useSignal<{ topValues: CategoricalStat[] } | null>(null);
  const statsRequestId = useRef(0);
  const overlayRequestId = useRef(0);

  const isNumeric = edaStats && ['number', 'integer', 'float'].includes(edaStats.type);
  const isDate = edaStats && ['date', 'datetime'].includes(edaStats.type);
  const isCategorical = edaStats && !isNumeric && !(isDate && dateTreatment === 'temporal');
  const showNumericAsCategorical = isNumeric && numericTreatment === 'categorical';

  // Reset state when column selection changes
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

      AppStore.edaBrushSelection.value = null;
      AppStore.edaNumericTreatment.value = 'numeric';
      categoricalOverlay.value = null;

      const requestId = ++statsRequestId.current;
      computeEdaStats(currentData, selectedColumn, type).then((stats) => {
        if (requestId === statsRequestId.current) {
          AppStore.edaStats.value = stats;
        }
      });
    } else {
      AppStore.edaStats.value = null;
      AppStore.edaBrushSelection.value = null;
      AppStore.edaNumericTreatment.value = 'numeric';
      categoricalOverlay.value = null;
    }
  }, [selectedColumn, currentData]);

  useEffect(() => {
    if (showNumericAsCategorical && selectedColumn && currentData) {
      const requestId = ++overlayRequestId.current;
      computeCategoricalOverlay(currentData, selectedColumn).then((overlay) => {
        if (requestId === overlayRequestId.current) {
          categoricalOverlay.value = overlay;
        }
      });
    } else {
      categoricalOverlay.value = null;
    }
  }, [showNumericAsCategorical, selectedColumn, currentData]);

  useEffect(() => {
    if (!selectedColumn || !currentData || !edaStats) return;

    const renderCharts = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const isInDOM = (el: HTMLElement | null): el is HTMLElement => {
        return el !== null && document.body.contains(el);
      };

      if (
        isNumeric &&
        numericTreatment === 'numeric' &&
        view === 'boxplot' &&
        isInDOM(boxPlotRef.current)
      ) {
        try {
          await ChartsEngine.renderBoxPlot(boxPlotRef.current, currentData, selectedColumn, theme);
        } catch (error) {
          console.error('Error rendering box plot:', error);
        }
      }

      if (
        isNumeric &&
        numericTreatment === 'numeric' &&
        view === 'histogram' &&
        isInDOM(histogramRef.current)
      ) {
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

      // Categorical bar: either natural categorical, date-as-categorical, or numeric-as-categorical
      if (isInDOM(categoricalBarRef.current)) {
        const topValues = showNumericAsCategorical
          ? categoricalOverlay.value?.topValues
          : isCategorical && edaStats.topValues
            ? edaStats.topValues
            : null;

        if (topValues) {
          try {
            await ChartsEngine.renderCategoricalBar(categoricalBarRef.current, topValues, theme);
          } catch (error) {
            console.error('Error rendering categorical bar:', error);
          }
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
    numericTreatment,
    theme,
    isNumeric,
    isDate,
    isCategorical,
    showNumericAsCategorical,
    categoricalOverlay.value,
  ]);

  if (!selectedColumn || !edaStats || AppStore.selectedColumns.value.length > 1) return null;

  const clearSelection = () => {
    AppStore.selectedColumn.value = null;
  };

  const setView = (v: 'boxplot' | 'histogram') => {
    AppStore.edaChartView.value = v;
  };

  const setDateTreatment = (t: 'temporal' | 'categorical') => {
    AppStore.edaDateTreatment.value = t;
  };

  const setNumericTreatment = (t: 'numeric' | 'categorical') => {
    AppStore.edaNumericTreatment.value = t;
    if (t === 'numeric') {
      AppStore.edaBrushSelection.value = null;
    }
  };

  const applyBrush = async () => {
    if (!brushSelection || !selectedColumn) return;
    const { min, max } = brushSelection;
    const fmtMin = Number.isInteger(min) ? min : min.toFixed(4);
    const fmtMax = Number.isInteger(max) ? max : max.toFixed(4);
    const expr = `[${selectedColumn}] >= ${fmtMin} && [${selectedColumn}] <= ${fmtMax}`;

    DialogStore.filterState.expression.value = expr;
    DialogStore.filterState.error.value = null;

    FilterHandlers.applyFilterTransform(HelperHandlers.createExecutionCallbacks());

    clearSelection();
  };

  const selectStat = (label: string, value: any, e: MouseEvent) => {
    e.stopPropagation();

    // Null-then-set via setTimeout forces toolbar to remount (see EdaOverview.openToolbar)
    AppStore.selectedCell.value = null;

    // TODO: Duplicated positioning logic — see EdaOverview.openToolbar TODO

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
    e.stopPropagation();
    if (!(e.target as HTMLElement).closest(`.${styles.edaFlowItem}`)) {
      AppStore.selectedCell.value = null;
    }
  };

  return (
    <div class={styles.edaPanel} data-eda-panel="true" onClick={handlePanelClick}>
      <div class={styles.edaPanel__header}>
        <div class={styles.edaPanel__title}>
          <TypeIndicator type={edaStats.type} showLabel={false} size="small" />
          <span class={styles.edaPanel__columnName}>{selectedColumn}</span>
          {isDate && (
            <div class={styles.edaTreatmentToggle}>
              <button
                class={`${styles.edaTreatmentToggle__btn} ${dateTreatment === 'temporal' ? styles['edaTreatmentToggle__btn--active'] : ''}`}
                onClick={() => setDateTreatment('temporal')}
              >
                {t('eda.dateTreatment.temporal')}
              </button>
              <button
                class={`${styles.edaTreatmentToggle__btn} ${dateTreatment === 'categorical' ? styles['edaTreatmentToggle__btn--active'] : ''}`}
                onClick={() => setDateTreatment('categorical')}
              >
                {t('eda.dateTreatment.categorical')}
              </button>
            </div>
          )}
          {isNumeric && (
            <div class={styles.edaTreatmentToggle}>
              <button
                class={`${styles.edaTreatmentToggle__btn} ${numericTreatment === 'numeric' ? styles['edaTreatmentToggle__btn--active'] : ''}`}
                onClick={() => setNumericTreatment('numeric')}
              >
                {t('eda.numericTreatment.numeric')}
              </button>
              <button
                class={`${styles.edaTreatmentToggle__btn} ${numericTreatment === 'categorical' ? styles['edaTreatmentToggle__btn--active'] : ''}`}
                onClick={() => setNumericTreatment('categorical')}
              >
                {t('eda.numericTreatment.categorical')}
              </button>
            </div>
          )}
        </div>
        <button
          class={styles.edaPanel__close}
          onClick={clearSelection}
          aria-label={t('eda.closePanel')}
        >
          ×
        </button>
      </div>

      <div class={styles.edaPanel__content}>
        <EdaOverview edaStats={edaStats} />

        {isNumeric && numericTreatment === 'numeric' && (
          <EdaNumericSection
            edaStats={edaStats}
            view={view}
            brushSelection={brushSelection}
            boxPlotRef={boxPlotRef}
            histogramRef={histogramRef}
            onViewChange={setView}
            onApplyBrush={applyBrush}
            onSelectStat={selectStat}
          />
        )}

        {showNumericAsCategorical && categoricalOverlay.value && (
          <EdaCategoricalSection
            edaStats={categoricalOverlay.value}
            categoricalBarRef={categoricalBarRef}
          />
        )}

        {isDate && dateTreatment === 'temporal' && (
          <div class={`${styles.edaSection} ${styles['edaSection--wide']}`}>
            <div class={styles.edaSection__title}>{t('eda.temporal.title')}</div>
            <div ref={temporalChartRef} style={{ width: '100%', minHeight: '100px' }}></div>
          </div>
        )}

        {isCategorical && (
          <EdaCategoricalSection edaStats={edaStats} categoricalBarRef={categoricalBarRef} />
        )}
      </div>
    </div>
  );
}
