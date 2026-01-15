import type { ChumakApp } from '../../chumak-app';
import { SchemaEngine } from '../../core/schema-engine';
import { EDAEngine } from '../../core/eda-engine';
import { ChartsEngine } from '../../core/charts';
import { DialogStore } from '../stores/DialogStore';

export function selectColumn(this: ChumakApp, col: string) {
  this.selectedCell = null;
  this.typeMenuOpen = false;

  if (this.selectedColumn === col) {
    this.selectedColumn = null;
    return;
  }
  this.selectedColumn = col;
  this.$nextTick(() => this.updateToolbarPosition());
  if (this.selectedColumn && this.currentData) {
    let colSchema = null;
    if (this.activeModel?.schema)
      colSchema = this.activeModel.schema.find((c: any) => c.name === this.selectedColumn);
    else if (this.activeSource?.columns)
      colSchema = this.activeSource.columns.find((c: any) => c.name === this.selectedColumn);
    const type = colSchema
      ? colSchema.type
      : SchemaEngine.inferType(
          this.currentData.slice(0, 20).map((r: any) => r[this.selectedColumn!])
        );
    this.edaStats = EDAEngine.calculateStats(this.currentData, this.selectedColumn, type);
    this.edaBrushSelection = null;
    if (['integer', 'float', 'number'].includes(type)) {
      this.$nextTick(() => {
        if (this.edaChartView === 'boxplot')
          ChartsEngine.renderBoxPlot(
            '#eda-boxplot',
            this.currentData!,
            this.selectedColumn!,
            this.theme
          );
        else
          ChartsEngine.renderHistogram(
            '#eda-histogram',
            this.currentData!,
            this.selectedColumn!,
            this.theme,
            (sel: any) => this.handleBrushSelection(sel)
          );
      });
    } else if (['date', 'datetime'].includes(type) && this.edaDateTreatment === 'temporal') {
      this.$nextTick(() =>
        ChartsEngine.renderTemporalChart(
          '#eda-temporal-chart',
          this.currentData!,
          this.selectedColumn!,
          this.theme
        )
      );
    } else {
      this.$nextTick(() => {
        if (this.edaStats && 'topValues' in this.edaStats) {
          ChartsEngine.renderCategoricalBar(
            '#eda-categorical-bar',
            this.edaStats.topValues,
            this.theme
          );
        }
      });
    }
  } else {
    this.edaStats = null;
    this.edaBrushSelection = null;
  }
}

export function selectEdaStat(this: ChumakApp, label: string, rawValue: any, event: any) {
  const el = event.currentTarget;
  this.selectedCell = null;
  this.selectedCell = {
    col: this.selectedColumn!,
    value: rawValue,
    type: 'number',
    isEda: true,
    edaLabel: label,
  };
  this.$nextTick(() => {
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
    this.cellToolbarPos = { x: x, y: rect.top - 8, arrowOffset: center - x };
  });
}

export function setEdaChartView(this: ChumakApp, view: 'boxplot' | 'histogram') {
  this.edaChartView = view;
  this.edaBrushSelection = null;
  if (this.selectedColumn && this.edaStats) {
    const type = this.edaStats.type;
    if (['integer', 'float', 'number'].includes(type)) {
      this.$nextTick(() => {
        if (view === 'boxplot')
          ChartsEngine.renderBoxPlot(
            '#eda-boxplot',
            this.currentData!,
            this.selectedColumn!,
            this.theme
          );
        else
          ChartsEngine.renderHistogram(
            '#eda-histogram',
            this.currentData!,
            this.selectedColumn!,
            this.theme,
            (sel: any) => this.handleBrushSelection(sel)
          );
      });
    }
  }
}

export function setEdaDateTreatment(this: ChumakApp, treatment: 'temporal' | 'categorical') {
  this.edaDateTreatment = treatment;
  if (this.selectedColumn && this.edaStats && ['date', 'datetime'].includes(this.edaStats.type)) {
    this.$nextTick(() => {
      if (treatment === 'temporal') {
        ChartsEngine.renderTemporalChart(
          '#eda-temporal-chart',
          this.currentData!,
          this.selectedColumn!,
          this.theme
        );
      } else {
        if (this.edaStats && 'topValues' in this.edaStats) {
          ChartsEngine.renderCategoricalBar(
            '#eda-categorical-bar',
            this.edaStats.topValues,
            this.theme
          );
        }
      }
    });
  }
}

export function handleBrushSelection(this: ChumakApp, selection: any) {
  this.edaBrushSelection = selection;
}

export async function applyBrushFilter(this: ChumakApp) {
  if (!this.edaBrushSelection || !this.selectedColumn) return;
  const { min, max } = this.edaBrushSelection;
  const col = this.selectedColumn;
  const fmtMin = Number.isInteger(min) ? min : min.toFixed(4);
  const fmtMax = Number.isInteger(max) ? max : max.toFixed(4);
  const expr = `[${col}] >= ${fmtMin} && [${col}] <= ${fmtMax}`;
  DialogStore.filterState.expression.value = expr;
  DialogStore.filterState.error.value = null;
  await this.applyFilterTransform();
  this.clearColumnSelection();
}
